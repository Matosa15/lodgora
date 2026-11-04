// Peças reutilizáveis: ícones, janelas, painéis, avisos, campos de formulário.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { STATUS_STYLE, statusLabel, cleanElapsed, clock } from '../lib/constants';

const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  bed: '<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/>',
  sparkles: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>',
  inspect: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  drop: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
  shuffle: '<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="M4 4l5 5"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  play: '<path d="M6 4l14 8-14 8z"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 16v-4"/><path d="M12 16V8"/><path d="M17 16v-7"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M9.9 4.2A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.2"/><path d="M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6"/><path d="M2 2l20 20"/>'
};

export function Icon({ name, className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" className={className} aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] || '' }} />
  );
}

export function LogoMark({ className = 'w-8 h-8' }) {
  return (
    <span className={`${className} rounded-lg bg-[#172B4D] flex items-center justify-center flex-none`}>
      <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" aria-hidden="true">
        <rect x="4" y="13" width="4" height="7" rx="1.5" fill="#fff" />
        <rect x="10" y="9" width="4" height="11" rx="1.5" fill="#19A7A1" />
        <rect x="16" y="4" width="4" height="16" rx="1.5" fill="#fff" />
      </svg>
    </span>
  );
}

export const inputCls = 'w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#19A7A1] focus:ring-1 focus:ring-[#19A7A1]';
export const btnPrimary = 'inline-flex items-center justify-center gap-2 bg-[#0D7C77] hover:bg-[#0A6A66] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-default';
export const btnGhost = 'inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-default';
export const btnSmall = 'px-2.5 py-1 rounded-lg text-xs font-semibold';

export function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.Occupied;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>{statusLabel(status)}
    </span>
  );
}

export function Field({ id, label, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-rose-600 mt-1" role="alert">{error}</p>}
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children, sheet = false }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
    const key = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onClose]);
  return (
    <div className={`fixed inset-0 bg-slate-900/40 z-50 flex justify-center p-4 overflow-y-auto ${sheet ? 'items-end sm:items-center' : 'items-center'}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 outline-none max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="flex justify-between items-start gap-3 p-5 pb-3 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-[#172B4D]">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close"
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 flex-none">
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Panel({ title, subtitle, right, children }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#172B4D]">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ icon = 'inbox', title, text, children }) {
  return (
    <div className="mx-5 sm:mx-6 mb-6 border border-dashed border-slate-200 rounded-xl py-8 px-4 text-center text-slate-500 flex flex-col items-center gap-2">
      <Icon name={icon} className="w-6 h-6" />
      <p className="font-semibold text-slate-800 text-sm">{title}</p>
      {text && <p className="text-xs max-w-sm">{text}</p>}
      {children}
    </div>
  );
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500" role="status">
      <span className="w-5 h-5 border-2 border-slate-300 border-t-[#19A7A1] rounded-full animate-spin"></span>
      <span className="text-sm">{label}…</span>
    </div>
  );
}

/* ---------- Avisos curtos (toast) ---------- */
const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((message, kind = 'ok') => {
    setToast({ message, kind });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div role="status" className={`fixed left-4 right-4 sm:left-auto sm:right-5 bottom-5 z-[60] px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm text-white sm:max-w-sm ${toast.kind === 'error' ? 'bg-rose-700' : 'bg-[#172B4D]'}`}
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
          <span className={toast.kind === 'error' ? 'text-white' : 'text-[#19A7A1]'}>
            <Icon name={toast.kind === 'error' ? 'alert' : 'check'} className="w-[18px] h-[18px]" />
          </span>
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function CopyButton({ text, label = 'Copy' }) {
  const toast = useToast();
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast('Copied'); }
    catch { toast('Could not copy. Select the text and copy it by hand.', 'error'); }
  };
  return (
    <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D7C77] px-2 py-1 rounded hover:bg-teal-50">
      <Icon name="copy" className="w-3.5 h-3.5" />{label}
    </button>
  );
}

/* ---------- Relógio de limpeza ---------- */
// Mostra o tempo de limpeza de um quarto e, enquanto corre, atualiza a cada segundo
export function CleanTimer({ room, big = false, className = '' }) {
  const running = !!room.cleanRunningSince;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!running) return undefined;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running, room.cleanRunningSince]);
  return (
    <span className={`tabular-nums ${big ? 'text-5xl font-bold' : 'font-semibold'} ${className}`}
      role="timer" aria-label={`Cleaning time ${clock(cleanElapsed(room, now))}${running ? '' : ', paused'}`}>
      {clock(cleanElapsed(room, now))}
    </span>
  );
}
