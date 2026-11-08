// Peças interativas da página pública: revelar ao deslizar, telemóvel + ecrã do gerente, estatísticas, seletor de preço.
import { useEffect, useRef, useState } from 'react';
import { Icon, LogoMark } from '../components/ui';
import { SITE } from '../lib/site';

const INK = '#172B4D';
const TEAL = '#0D7C77';

/* ---------- Revelar quando aparece no ecrã ---------- */
export function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!('IntersectionObserver' in window)) { setShown(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'} ${className}`}>
      {children}
    </div>
  );
}

/* ---------- Telemóvel + ecrã do gerente, ligados ---------- */

const START_ROOMS = [
  { n: '214', type: 'Double', floor: 2, state: 'cleaning', secs: 754, running: true },
  { n: '216', type: 'Twin', floor: 2, state: 'todo' },
  { n: '218', type: 'Suite', floor: 2, state: 'todo' },
  { n: '220', type: 'Double', floor: 2, state: 'todo' }
];
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const took = (s) => (s < 60 ? `${s} sec` : `${Math.round(s / 60)} min`);

function StatusBar() {
  return (
    <div className="relative h-12 bg-white flex items-end justify-between px-7 pb-1.5 text-[12px] font-semibold text-slate-900 flex-none" aria-hidden="true">
      <span className="tabular-nums">9:41</span>
      <span className="absolute left-1/2 top-2.5 -translate-x-1/2 w-[5.5rem] h-[1.5rem] rounded-full bg-[#05080f]" />
      <span className="flex items-center gap-1.5">
        <svg viewBox="0 0 18 12" className="w-[18px] h-3"><rect x="0" y="8" width="3" height="4" rx=".8" fill="currentColor" /><rect x="5" y="5.5" width="3" height="6.5" rx=".8" fill="currentColor" /><rect x="10" y="3" width="3" height="9" rx=".8" fill="currentColor" /><rect x="15" y="0" width="3" height="12" rx=".8" fill="currentColor" /></svg>
        <svg viewBox="0 0 16 12" className="w-4 h-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1.5 4.2a9.5 9.5 0 0 1 13 0" /><path d="M4 7a6 6 0 0 1 8 0" /><circle cx="8" cy="10" r="1" fill="currentColor" stroke="none" /></svg>
        <svg viewBox="0 0 27 12" className="w-[27px] h-3"><rect x=".5" y=".5" width="22" height="11" rx="3.2" fill="none" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="17" height="8" rx="2" fill="currentColor" /><rect x="24" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".4" /></svg>
      </span>
    </div>
  );
}

function Phone({ rooms, onStart, onToggle, onFinish, toast, hint }) {
  const active = rooms.find((r) => r.state === 'cleaning');
  const done = rooms.filter((r) => r.state === 'review' || r.state === 'ready').length;
  return (
    <div className="relative mx-auto w-[19.5rem] flex-none">
      {/* botões laterais */}
      <span aria-hidden="true" className="absolute -left-[3px] top-28 h-7 w-[3px] rounded-l bg-[#1b2740]" />
      <span aria-hidden="true" className="absolute -left-[3px] top-40 h-12 w-[3px] rounded-l bg-[#1b2740]" />
      <span aria-hidden="true" className="absolute -left-[3px] top-56 h-12 w-[3px] rounded-l bg-[#1b2740]" />
      <span aria-hidden="true" className="absolute -right-[3px] top-44 h-16 w-[3px] rounded-r bg-[#1b2740]" />
      <div className="rounded-[3.1rem] p-[11px]"
        style={{ background: 'linear-gradient(160deg,#3a4c70 0%,#14203a 40%,#0a1224 100%)', boxShadow: '0 40px 70px -28px rgba(23,43,77,.6), 0 18px 30px -18px rgba(23,43,77,.5), inset 0 0 0 1px rgba(255,255,255,.12)' }}>
        <div className="relative rounded-[2.4rem] bg-[#F3F6F9] overflow-hidden h-[37.5rem] flex flex-col" role="group" aria-label="Interactive example of the housekeeper screen">
          <StatusBar />
          <div className="bg-white px-4 pb-3 flex items-center gap-2.5 border-b border-slate-200 flex-none">
            <LogoMark className="w-7 h-7" />
            <div className="leading-tight min-w-0">
              <p className="text-[13px] font-bold truncate" style={{ color: INK }}>Northbridge Hotel</p>
              <p className="text-[11px] text-slate-500">Housekeeping</p>
            </div>
            <span className="ml-auto w-8 h-8 rounded-full bg-[#E4F3F2] text-[#0D7C77] text-[11px] font-bold flex items-center justify-center" aria-hidden="true">EC</span>
          </div>

          <div className="flex-1 overflow-y-auto px-3.5 pt-4 pb-8 space-y-2.5">
            <div className="px-0.5 pb-1">
              <p className="font-display text-[1.3rem] font-bold leading-tight" style={{ color: INK }}>Good morning, Emma</p>
              <div className="mt-2 flex items-center gap-2.5">
                <div className="h-1.5 flex-1 rounded-full bg-slate-200 overflow-hidden" aria-hidden="true">
                  <div className="h-full rounded-full bg-[#0D7C77] transition-[width] duration-500" style={{ width: `${(done / rooms.length) * 100}%` }} />
                </div>
                <span className="text-[11px] font-semibold text-slate-500 tabular-nums">{done} of {rooms.length} done</span>
              </div>
            </div>

            {rooms.map((r) => {
              if (r.state === 'cleaning') {
                return (
                  <div key={r.n} className="rounded-2xl bg-white border border-slate-200 border-t-[3px] border-t-blue-500 p-3.5 shadow-[0_6px_16px_-10px_rgba(23,43,77,.35)]">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-[1.65rem] font-bold leading-none" style={{ color: INK }}>Room {r.n}</p>
                        <p className="text-xs text-slate-500 mt-1.5">{r.type} · Floor {r.floor}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full border ${r.running ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${r.running ? 'bg-blue-500' : 'bg-amber-500'}`} />{r.running ? 'Cleaning' : 'Paused'}
                      </span>
                    </div>
                    <div className={`mt-3 rounded-xl border py-3 text-center ${r.running ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100'}`}>
                      <p className="text-[11px] font-semibold text-slate-500">{r.running ? 'Cleaning time' : 'Timer paused'}</p>
                      <p className="font-display text-[2.6rem] leading-[1.1] font-bold tabular-nums" style={{ color: INK }}>{clock(r.secs)}</p>
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-2 text-sm font-semibold">
                      <button type="button" onClick={() => onToggle(r.n)} className="h-11 rounded-xl border border-slate-200 bg-white text-slate-700 active:bg-slate-50 inline-flex items-center justify-center gap-1.5">
                        <Icon name={r.running ? 'pause' : 'play'} className="w-4 h-4" />{r.running ? 'Pause' : 'Resume'}
                      </button>
                      <button type="button" onClick={() => onFinish(r.n)} aria-label={`Finish room ${r.n}`}
                        className={`h-11 rounded-xl bg-[#0D7C77] text-white active:bg-[#0A6A66] inline-flex items-center justify-center gap-1.5 ${hint === 'finish' ? 'pulse-teal' : ''}`}>
                        <Icon name="check" className="w-4 h-4" />Finish
                      </button>
                    </div>
                  </div>
                );
              }
              const stripe = r.state === 'ready' ? 'border-t-emerald-500' : r.state === 'review' ? 'border-t-amber-500' : 'border-t-orange-400';
              return (
                <div key={r.n} className={`rounded-2xl bg-white border border-slate-200 border-t-[3px] ${stripe} px-3.5 py-3 flex items-center gap-3`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-bold leading-none" style={{ color: INK }}>Room {r.n}</p>
                    <p className="text-[11px] mt-1.5 text-slate-500 truncate">
                      {r.state === 'todo' && (r.sentBack ? 'Sent back by the manager' : `${r.type} · needs cleaning`)}
                      {r.state === 'review' && `Cleaned in ${took(r.secs)} · waiting for inspection`}
                      {r.state === 'ready' && `Approved · cleaned in ${took(r.secs)}`}
                    </p>
                  </div>
                  {r.state === 'todo' && (active
                    ? <span className="text-[11px] font-medium text-slate-400">Up next</span>
                    : <button type="button" onClick={() => onStart(r.n)} aria-label={`Start cleaning room ${r.n}`}
                        className={`h-9 px-3.5 rounded-lg bg-[#0D7C77] text-white text-[13px] font-semibold active:bg-[#0A6A66] ${hint === 'start' ? 'pulse-teal' : ''}`}>Start</button>)}
                  {r.state === 'review' && <Icon name="inspect" className="w-5 h-5 text-amber-500" />}
                  {r.state === 'ready' && <Icon name="check" className="w-5 h-5 text-emerald-500" />}
                </div>
              );
            })}
          </div>

          <div aria-live="polite" className={`absolute left-4 right-4 bottom-7 rounded-xl bg-[#172B4D] text-white text-[13px] font-medium px-3.5 py-2.5 shadow-lg transition-all duration-300 ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>{toast}</div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#F3F6F9] via-[#F3F6F9]/90 to-transparent" />
          <span aria-hidden="true" className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 rounded-full bg-slate-900/85" />
        </div>
      </div>
    </div>
  );
}

const ACCENT = { todo: '#F97316', cleaning: '#3B82F6', review: '#F59E0B', ready: '#10B981' };
const DOT = { todo: 'bg-orange-500', cleaning: 'bg-blue-500', review: 'bg-amber-500', ready: 'bg-emerald-500' };
const WORD = { todo: 'Dirty', cleaning: 'Cleaning', review: 'Awaiting inspection', ready: 'Ready' };

function ManagerPanel({ rooms, feed, onApprove, onBack, hint }) {
  const review = rooms.filter((r) => r.state === 'review');
  const ready = rooms.filter((r) => r.state === 'ready').length;
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-[0_30px_60px_-36px_rgba(23,43,77,.45)] overflow-hidden w-full max-w-md flex flex-col">
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2.5 bg-[#FAFBFC]">
        <LogoMark className="w-6 h-6" />
        <p className="text-sm font-bold" style={{ color: INK }}>Manager screen</p>
        <span className="ml-auto text-xs font-semibold text-slate-500 tabular-nums" aria-live="polite">{ready} of {rooms.length} ready</span>
      </div>

      <div className="px-5 pt-4">
        <ul className="grid grid-cols-4 gap-2" aria-label="Room status">
          {rooms.map((r) => (
            <li key={r.n} className="rounded-lg px-2.5 pt-2 pb-2.5 bg-white border border-slate-200 transition-shadow" style={{ boxShadow: `inset 0 -3px 0 ${ACCENT[r.state]}` }}>
              <p className="text-xl font-semibold tabular-nums tracking-tight leading-none" style={{ color: INK }}>{r.n}</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[10px] leading-tight text-slate-600">
                <span className={`w-1.5 h-1.5 rounded-full flex-none transition-colors ${DOT[r.state]}`} />{WORD[r.state]}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-5 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Waiting for your inspection</p>
        {review.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 rounded-lg border border-dashed border-slate-300 px-4 py-5 text-center">Nothing to inspect yet. Press <strong className="text-slate-700">Finish</strong> on the phone.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {review.map((r) => (
              <li key={r.n} className="feed-in rounded-xl border border-amber-200 bg-amber-50/60 px-3.5 py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold" style={{ color: INK }}>Room {r.n}</p>
                  <p className="text-xs text-slate-500">Cleaned in {took(r.secs)} by Emma Clarke</p>
                </div>
                <button type="button" onClick={() => onBack(r.n)} className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50">Send back</button>
                <button type="button" onClick={() => onApprove(r.n)} aria-label={`Approve room ${r.n}`}
                  className={`h-9 px-3 rounded-lg bg-[#0D7C77] text-white text-xs font-semibold hover:bg-[#0A6A66] ${hint === 'approve' ? 'pulse-teal' : ''}`}>Approve</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="px-5 pt-5 pb-5 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Activity</p>
        <ul className="mt-2 space-y-1.5 min-h-[4.5rem]">
          {feed.slice(0, 3).map((f) => (
            <li key={f.id} className="feed-in flex gap-2 text-sm text-slate-600"><span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#19A7A1] flex-none" />{f.text}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const HINTS = {
  finish: ['1', 'Press Finish on the phone, like a housekeeper would when the room is done.'],
  approve: ['2', 'The room just arrived on the manager screen. Approve it.'],
  start: ['3', 'Now start the next room on the phone. The timer begins on its own.'],
  free: ['', 'Keep playing. Pause the timer, start another room, or send one back.']
};

export function TryIt() {
  const [rooms, setRooms] = useState(START_ROOMS);
  const [feed, setFeed] = useState([{ id: 0, text: 'Emma started cleaning room 214.' }]);
  const [toast, setToast] = useState('');
  const [steps, setSteps] = useState({ finish: false, approve: false, start: false });
  const nextId = useRef(1);
  const toastTimer = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setRooms((rs) => (rs.some((r) => r.state === 'cleaning' && r.running)
      ? rs.map((r) => (r.state === 'cleaning' && r.running ? { ...r, secs: r.secs + 1 } : r)) : rs)), 1000);
    return () => { clearInterval(t); clearTimeout(toastTimer.current); };
  }, []);

  const log = (text) => setFeed((f) => [{ id: nextId.current++, text }, ...f].slice(0, 6));
  const say = (text) => { setToast(text); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 2600); };
  const patch = (n, fn) => setRooms((rs) => rs.map((r) => (r.n === n ? { ...r, ...fn(r) } : r)));

  const start = (n) => { patch(n, () => ({ state: 'cleaning', secs: 0, running: true, sentBack: false })); log(`Emma started cleaning room ${n}.`); say(`Timer started for room ${n}`); setSteps((s) => ({ ...s, start: true })); };
  const toggle = (n) => { const r = rooms.find((x) => x.n === n); patch(n, (x) => ({ running: !x.running })); log(`Emma ${r.running ? 'paused' : 'resumed'} the timer in room ${n}.`); };
  const finish = (n) => { patch(n, () => ({ state: 'review', running: false })); const r = rooms.find((x) => x.n === n); log(`Emma finished room ${n} in ${took(r.secs)}.`); say('Sent to your manager for inspection'); setSteps((s) => ({ ...s, finish: true })); };
  const approve = (n) => { patch(n, () => ({ state: 'ready' })); log(`You approved room ${n}. It is ready for the next guest.`); setSteps((s) => ({ ...s, approve: true })); };
  const back = (n) => { patch(n, () => ({ state: 'todo', sentBack: true, secs: 0 })); log(`You sent room ${n} back to Emma.`); say(`Room ${n} was sent back`); };
  const reset = () => { setRooms(START_ROOMS); setFeed([{ id: nextId.current++, text: 'Emma started cleaning room 214.' }]); setSteps({ finish: false, approve: false, start: false }); setToast(''); };

  const hintKey = !steps.finish ? 'finish' : !steps.approve ? 'approve' : !steps.start ? 'start' : 'free';
  const [num, text] = HINTS[hintKey];
  const showHint = hintKey === 'free' ? '' : hintKey;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white border border-slate-200 px-4 py-3 max-w-4xl mx-auto shadow-sm">
        {num && <span className="flex-none w-7 h-7 rounded-full bg-[#0D7C77] text-white text-sm font-semibold flex items-center justify-center">{num}</span>}
        <p className="text-sm font-medium flex-1 min-w-[12rem]" style={{ color: INK }} aria-live="polite">{text}</p>
        <button type="button" onClick={reset} className="text-sm font-semibold text-[#0D7C77] hover:underline inline-flex items-center gap-1.5"><Icon name="refresh" className="w-4 h-4" />Start over</button>
      </div>
      <div className="mt-8 flex flex-col md:flex-row items-center md:items-stretch justify-center gap-8 lg:gap-12">
        <Phone rooms={rooms} onStart={start} onToggle={toggle} onFinish={finish} toast={toast} hint={showHint} />
        <div aria-hidden="true" className="hidden md:flex items-center text-[#0D7C77]"><svg viewBox="0 0 40 16" className="w-10 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8h34M29 2l7 6-7 6" /></svg></div>
        <ManagerPanel rooms={rooms} feed={feed} onApprove={approve} onBack={back} hint={showHint} />
      </div>
    </div>
  );
}

/* ---------- Estatísticas de exemplo, com períodos e informação ao passar o rato ---------- */

const PERIODS = {
  today: { label: 'Today', unit: 'cleanings', bars: [['8:00', 2], ['9:00', 5], ['10:00', 8], ['11:00', 6], ['12:00', 4], ['13:00', 3], ['14:00', 5], ['15:00', 4]], avg: '22 min', pass: '89%', names: [['Emma', 92], ['Olivia', 85], ['Grace', 90]] },
  week: { label: 'Last 7 days', unit: 'cleanings', bars: [['Mon', 9], ['Tue', 12], ['Wed', 8], ['Thu', 11], ['Fri', 10], ['Sat', 7], ['Sun', 12]], avg: '24 min', pass: '91%', names: [['Emma', 94], ['Olivia', 88], ['Grace', 90]] },
  month: { label: 'Last 30 days', unit: 'cleanings', bars: [['Week 1', 58], ['Week 2', 71], ['Week 3', 66], ['Week 4', 74]], avg: '25 min', pass: '90%', names: [['Emma', 93], ['Olivia', 86], ['Grace', 91]] }
};

export function StatsMock() {
  const [period, setPeriod] = useState('week');
  const [hover, setHover] = useState(null);
  const [grown, setGrown] = useState(false);
  const d = PERIODS[period];
  const max = Math.max(...d.bars.map(([, v]) => v));
  const total = d.bars.reduce((a, [, v]) => a + v, 0);

  useEffect(() => { setGrown(false); setHover(null); const t = setTimeout(() => setGrown(true), 40); return () => clearTimeout(t); }, [period]);

  return (
    <figure>
      <div className="rounded-xl bg-white border border-slate-200 p-5 sm:p-6 shadow-[0_18px_40px_-28px_rgba(23,43,77,.4)]">
        <div role="group" aria-label="Choose a period" className="inline-flex rounded-lg bg-slate-100 p-1 text-sm font-semibold">
          {Object.entries(PERIODS).map(([k, v]) => (
            <button key={k} type="button" aria-pressed={period === k} onClick={() => setPeriod(k)}
              className={`px-3 py-1.5 rounded-md transition-colors ${period === k ? 'bg-white text-[#172B4D] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{v.label}</button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-[#F6F2EA] px-4 py-3"><p className="text-xs text-slate-500">Average time per room</p><p className="font-display text-2xl font-bold tabular-nums" style={{ color: INK }}>{d.avg}</p></div>
          <div className="rounded-lg bg-[#F6F2EA] px-4 py-3"><p className="text-xs text-slate-500">Approved first time</p><p className="font-display text-2xl font-bold tabular-nums" style={{ color: INK }}>{d.pass}</p></div>
        </div>

        <p className="mt-5 text-sm font-semibold min-h-[1.25rem]" style={{ color: INK }} aria-live="polite">
          {hover === null ? `Cleanings finished: ${total}` : `${d.bars[hover][0]}: ${d.bars[hover][1]} cleanings`}
        </p>
        <div className="mt-3 flex items-end gap-2 h-32 border-b border-slate-200" onMouseLeave={() => setHover(null)}>
          {d.bars.map(([label, v], i) => (
            <button key={period + label} type="button" aria-label={`${label}: ${v} cleanings`}
              onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              className="flex-1 h-full flex justify-center items-end focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0D7C77] rounded">
              <span className={`block w-full max-w-[24px] rounded-t-[4px] transition-[height,background-color] duration-500 ${hover === i ? 'bg-[#0A6A66]' : 'bg-[#0D7C77]'}`} style={{ height: grown ? `${(v / max) * 100}%` : '0%' }} />
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-1.5" aria-hidden="true">
          {d.bars.map(([label]) => <span key={label} className="flex-1 text-center text-[10px] text-slate-500 truncate">{label}</span>)}
        </div>

        <p className="mt-5 text-sm font-semibold" style={{ color: INK }}>Approved first time, by person</p>
        <ul className="mt-3 space-y-3">
          {d.names.map(([name, pct]) => (
            <li key={name}>
              <div className="flex justify-between text-sm"><span>{name}</span><span className="font-semibold tabular-nums" style={{ color: INK }}>{pct}%</span></div>
              <div className="h-2.5 bg-slate-100 rounded-full mt-1 overflow-hidden"><div className="h-full rounded-r-[4px] bg-[#0D7C77] transition-[width] duration-500" style={{ width: grown ? `${pct}%` : '0%' }} /></div>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="mt-2 text-xs text-slate-500">Example data, not from a real hotel. Try the buttons and hover over the bars.</figcaption>
    </figure>
  );
}

/* ---------- Seletor de preço ---------- */

export function PlanPicker() {
  const [rooms, setRooms] = useState(30);
  const plan = SITE.plans.find((p) => rooms <= p.max);
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 pt-6 pb-5 border-b border-slate-200">
        <label htmlFor="rooms-range" className="flex items-baseline justify-between gap-4 text-sm font-semibold" style={{ color: INK }}>
          How many rooms does your hotel have?
          <span className="font-display text-3xl font-bold tabular-nums">{rooms > 100 ? '100+' : rooms}</span>
        </label>
        <input id="rooms-range" type="range" min="5" max="110" step="1" value={rooms} onChange={(e) => setRooms(Number(e.target.value))}
          className="mt-4 w-full accent-[#0D7C77]" aria-valuetext={`${rooms > 100 ? 'More than 100' : rooms} rooms`} />
        <div className="mt-1 flex justify-between text-xs text-slate-500"><span>5</span><span>100+</span></div>
      </div>
      <ul className="divide-y divide-slate-200">
        {SITE.plans.map((p) => {
          const on = plan && plan.name === p.name;
          return (
            <li key={p.name} className={`flex items-center justify-between gap-4 px-6 py-5 transition-colors ${on ? 'bg-[#F6F2EA]' : ''}`}>
              <div>
                <p className="font-display font-semibold text-xl flex items-center gap-2" style={{ color: INK }}>{p.name}{on && <span className="text-[11px] font-semibold rounded-full bg-[#0D7C77] text-white px-2 py-0.5">Your plan</span>}</p>
                <p className="text-sm text-slate-500 mt-0.5">{p.rooms}</p>
              </div>
              <p className="text-right"><span className={`font-display font-bold text-4xl tabular-nums transition-colors ${on ? '' : 'text-slate-400'}`} style={on ? { color: INK } : undefined}>{p.price} €</span><span className="text-sm text-slate-500"> per month</span></p>
            </li>
          );
        })}
      </ul>
      {!plan && <p className="px-6 py-4 text-sm bg-[#FFF8E8] text-slate-700 border-t border-slate-200">More than 100 rooms? Get in touch and we will agree a price for your hotel.</p>}
    </div>
  );
}
