import { useCallback, useEffect, useRef, useState } from 'react';
import { dayKey } from './constants';

// Carrega os dados do hotel e atualiza sozinho (tempo real + verificação de 20 em 20 segundos).
export function useHotelData(backend) {
  const [data, setData] = useState({ rooms: [], issues: [], staff: [], activity: [], plan: [] });
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const alive = useRef(true);
  const planAppliedOn = useRef('');

  const reload = useCallback(async () => {
    try {
      const m = backend.manager;
      // Uma vez por dia (e quando a página abre), o plano de hoje passa para a lista de limpeza
      const today = dayKey(0);
      if (planAppliedOn.current !== today) {
        try { await m.plan.apply(today); planAppliedOn.current = today; } catch { /* tenta outra vez na próxima atualização */ }
      }
      const [rooms, issues, staff, activity, plan] = await Promise.all([
        m.rooms.list(), m.issues.list(), m.staff.list(), m.activity.list(), m.plan.list(dayKey(1))
      ]);
      if (!alive.current) return;
      setData({ rooms, issues, staff, activity, plan });
      setStatus('ready');
      setError('');
    } catch (e) {
      if (!alive.current) return;
      setError(e.message || 'Could not load data');
      setStatus((s) => (s === 'ready' ? 'ready' : 'error'));
    }
  }, [backend]);

  useEffect(() => {
    alive.current = true;
    reload();
    const unsubscribe = backend.manager.subscribe(reload);
    const timer = setInterval(reload, 20000);
    return () => { alive.current = false; unsubscribe(); clearInterval(timer); };
  }, [backend, reload]);

  return { ...data, status, error, reload };
}
