// Ecrã da camareira: pensado para o telemóvel. Lista dos seus quartos e um botão grande por quarto.
import { useCallback, useEffect, useRef, useState } from 'react';
import { backend } from '../lib/backend';
import { CleanTimer, Field, Icon, LogoMark, Modal, Spinner, StatusBadge, btnGhost, btnPrimary, inputCls, useToast } from '../components/ui';
import { STATUS_STYLE, dayKey, isArea, minutesLabel, spaceInline, spaceName } from '../lib/constants';

const ORDER = { Cleaning: 0, Dirty: 1, 'Awaiting inspection': 2, Ready: 3, Occupied: 4, 'Out of service': 5 };

export default function Housekeeper({ session, signOut }) {
  const toast = useToast();
  const [rooms, setRooms] = useState(null);   // null = a carregar
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [report, setReport] = useState(null); // null | { roomId }
  const alive = useRef(true);
  const planAppliedOn = useRef('');

  const load = useCallback(async () => {
    try {
      // Uma vez por dia, o plano de hoje entra na lista de limpeza
      const today = dayKey(0);
      if (planAppliedOn.current !== today) {
        try { await backend.staff.applyPlan(today); planAppliedOn.current = today; } catch (e) { if (/expired/i.test(e.message)) throw e; }
      }
      const list = await backend.staff.rooms();
      if (!alive.current) return;
      setRooms(list);
      setError('');
    } catch (e) {
      if (!alive.current) return;
      if (/expired/i.test(e.message)) { signOut(); return; }
      setError(e.message || 'Could not load your rooms');
    }
  }, [signOut]);

  useEffect(() => {
    alive.current = true;
    load();
    const timer = setInterval(load, 10000);
    const unsubscribe = backend.mode === 'demo' ? backend.manager.subscribe(load) : () => {};
    return () => { alive.current = false; clearInterval(timer); unsubscribe(); };
  }, [load]);

  const change = async (room, status, message) => {
    setBusyId(room.id);
    try {
      await backend.staff.setStatus(room.id, status);
      toast(message);
      await load();
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusyId(null); }
  };

  const timer = async (room, action) => {
    setBusyId(room.id);
    try { await backend.staff.timer(room.id, action); await load(); }
    catch (e) { toast(e.message, 'error'); }
    finally { setBusyId(null); }
  };

  const sorted = (rooms || []).slice().sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.number.localeCompare(b.number, undefined, { numeric: true }));
  const done = sorted.filter((r) => r.status === 'Awaiting inspection' || r.status === 'Ready').length;
  const pct = sorted.length ? Math.round((done / sorted.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 pt-safe">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <LogoMark className="w-8 h-8" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-sm font-bold text-[#172B4D] truncate">{session.name}</p>
            <p className="text-xs text-slate-500 truncate">{session.hotel.name}</p>
          </div>
          <button onClick={load} aria-label="Refresh" className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
            <Icon name="refresh" className="w-[18px] h-[18px]" />
          </button>
          <button onClick={signOut} aria-label="Sign out" className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
            <Icon name="logout" className="w-[18px] h-[18px]" />
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-5 pb-safe space-y-4">
        {rooms === null && !error && <Spinner label="Loading your rooms" />}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-white p-5 text-center" role="alert">
            <p className="font-semibold text-slate-800">We could not load your rooms</p>
            <p className="text-sm text-slate-500 mt-1">{error}</p>
            <button className={`${btnPrimary} mt-4`} onClick={load}>Try again</button>
          </div>
        )}

        {rooms !== null && (
          <>
            <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-slate-500">Your cleaning today</p>
                <p className="text-2xl font-bold text-[#172B4D] tabular-nums">{done}<span className="text-base text-slate-400 font-semibold"> / {sorted.length}</span></p>
              </div>
              <div className="h-2 bg-slate-100 rounded-full mt-3 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-[#19A7A1] rounded-full transition-all" style={{ width: pct + '%' }}></div>
              </div>
            </section>

            {sorted.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                <Icon name="bed" className="w-7 h-7 mx-auto mb-2" />
                <p className="font-semibold text-slate-800">Nothing assigned yet</p>
                <p className="text-sm mt-1">Your manager will assign rooms and areas to you. This page updates by itself.</p>
              </div>
            ) : (
              sorted.map((room) => (
                <article key={room.id} className={`bg-white rounded-xl border border-slate-200 border-t-[3px] ${STATUS_STYLE[room.status]?.bar || ''} p-4 shadow-sm`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-2xl font-bold text-[#172B4D] leading-none">{spaceName(room)}</h2>
                      <p className="text-sm text-slate-500 mt-1">{isArea(room) ? room.type : `${room.type} · Floor ${room.floor}`}</p>
                    </div>
                    <StatusBadge status={room.status} />
                  </div>
                  {room.note && <p className="text-sm text-slate-600 mt-3">{room.note}</p>}

                  <div className="mt-4 space-y-2">
                    {room.status === 'Dirty' && (
                      <button className={`${btnPrimary} w-full py-4 text-base`} disabled={busyId === room.id}
                        onClick={() => change(room, 'Cleaning', `Started ${spaceInline(room)}`)}>
                        Start cleaning
                      </button>
                    )}
                    {room.status === 'Cleaning' && (
                      <>
                        <div className={`rounded-xl border p-4 text-center ${room.cleanRunningSince ? 'bg-blue-50 border-blue-100 text-[#172B4D]' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                          <p className="text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5">
                            <Icon name="timer" className="w-3.5 h-3.5" />{room.cleanRunningSince ? 'Cleaning time' : 'Paused'}
                          </p>
                          <CleanTimer room={room} big className="block mt-1" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {room.cleanRunningSince ? (
                            <button className={`${btnGhost} py-3.5`} disabled={busyId === room.id} onClick={() => timer(room, 'pause')}>
                              <Icon name="pause" className="w-4 h-4" />Pause
                            </button>
                          ) : (
                            <button className={`${btnGhost} py-3.5`} disabled={busyId === room.id} onClick={() => timer(room, 'resume')}>
                              <Icon name="play" className="w-4 h-4" />Resume
                            </button>
                          )}
                          <button className={`${btnPrimary} py-3.5`} disabled={busyId === room.id}
                            onClick={() => change(room, 'Awaiting inspection', `Finished ${spaceInline(room)}, sent for inspection`)}>
                            <Icon name="check" className="w-5 h-5" />Finish
                          </button>
                        </div>
                        <button className="w-full text-sm text-slate-500 py-1 hover:text-slate-800" disabled={busyId === room.id}
                          onClick={() => change(room, 'Dirty', `${spaceName(room)} back on your list`)}>
                          I did not start this room
                        </button>
                      </>
                    )}
                    {room.status === 'Awaiting inspection' && (
                      <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2.5 text-center font-medium">
                        Waiting for the inspector{room.cleanSeconds > 0 && <span className="block text-xs font-normal">Cleaned in {minutesLabel(room.cleanSeconds)}</span>}
                      </p>
                    )}
                    {room.status === 'Ready' && (
                      <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2.5 text-center font-medium">Approved. Ready for guests</p>
                    )}
                    <button className={`${btnGhost} w-full`} onClick={() => setReport({ roomId: room.id })}>
                      <Icon name="wrench" className="w-4 h-4" />Report a problem here
                    </button>
                  </div>
                </article>
              ))
            )}

            <button className={`${btnGhost} w-full`} onClick={() => setReport({ roomId: '' })}>
              <Icon name="plus" className="w-4 h-4" />Report another problem
            </button>
          </>
        )}
      </main>

      {report && <ReportModal rooms={sorted} initialRoomId={report.roomId} onClose={() => setReport(null)} onDone={() => { setReport(null); toast('Problem reported. Maintenance will see it.'); load(); }} />}
    </div>
  );
}

function ReportModal({ rooms, initialRoomId, onClose, onDone }) {
  const [roomId, setRoomId] = useState(initialRoomId);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('normal');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (title.trim().length < 3) { setError('Describe the problem in a few words.'); return; }
    setBusy(true);
    try { await backend.staff.reportIssue(roomId || null, title.trim(), priority); onDone(); }
    catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <Modal title="Report a problem" subtitle="Maintenance and your manager will see this right away." onClose={onClose} sheet>
      <form onSubmit={submit} noValidate className="p-5 space-y-4">
        <Field id="r-room" label="Where">
          <select id="r-room" className={inputCls} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            <option value="">Not about one place</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{spaceName(r)}</option>)}
          </select>
        </Field>
        <Field id="r-title" label="What is wrong?" error={error}>
          <input id="r-title" className={inputCls} value={title} onChange={(e) => { setTitle(e.target.value); setError(''); }} placeholder="e.g. Shower is leaking" />
        </Field>
        <Field id="r-prio" label="How urgent is it?">
          <select id="r-prio" className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="urgent">Urgent: the room cannot be used</option>
            <option value="high">High: fix today</option>
            <option value="normal">Normal</option>
            <option value="low">Low: when possible</option>
          </select>
        </Field>
        <div className="flex gap-3 pt-1">
          <button type="button" className={`${btnGhost} flex-1`} onClick={onClose}>Cancel</button>
          <button type="submit" className={`${btnPrimary} flex-1`} disabled={busy}>{busy ? 'Sending…' : 'Send'}</button>
        </div>
      </form>
    </Modal>
  );
}
