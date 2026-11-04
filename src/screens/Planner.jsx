// Planeamento: o gerente marca que quartos limpar nos próximos 7 dias e por quem.
// Quando o dia chega, o plano entra sozinho na lista de limpeza (ver apply_plan na base de dados).
import { useMemo, useState } from 'react';
import { dayKey, dayLabel, isArea, spaceName } from '../lib/constants';
import { EmptyState, Icon, Panel, btnGhost, btnSmall, inputCls } from '../components/ui';

const DAYS = 7;
const NOT_PLANNED = '';
const NO_ONE = '_none';

const byName = (a, b) => a.number.localeCompare(b.number, undefined, { numeric: true });

export default function Planner({ rooms, plan, staff, search, onSet, onClear, onAddRooms }) {
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => dayKey(i + 1)), []);
  const [day, setDay] = useState(days[0]);
  const [kind, setKind] = useState('all');

  const housekeepers = staff.filter((s) => s.active && s.role === 'housekeeper');
  const staffById = useMemo(() => Object.fromEntries(staff.map((s) => [s.id, s])), [staff]);
  const planOf = useMemo(() => {
    const map = new Map();
    plan.forEach((p) => map.set(`${p.roomId}|${p.day}`, p));
    return map;
  }, [plan]);
  const countOf = (d) => plan.filter((p) => p.day === d).length;

  const hasAreas = rooms.some(isArea);
  const q = search.trim().toLowerCase();
  const sorted = useMemo(() => rooms.slice().sort(byName), [rooms]);
  const shown = sorted.filter((r) =>
    (kind === 'all' || (kind === 'area') === isArea(r)) &&
    (!q || `${r.number} ${r.type}`.toLowerCase().includes(q)));

  const today = plan.filter((p) => p.day === day);
  const load = housekeepers.map((s) => ({ s, n: today.filter((p) => p.staffId === s.id).length }));
  const unassigned = today.filter((p) => !p.staffId || !housekeepers.some((s) => s.id === p.staffId));
  const dayIdx = days.indexOf(day);
  const prevDay = dayIdx > 0 ? days[dayIdx - 1] : null;
  const label = (d, i) => (i === 0 ? 'Tomorrow' : dayLabel(d));

  const change = (room, value) => {
    if (value === NOT_PLANNED) onClear([{ roomId: room.id, day }], `${spaceName(room)} removed from ${dayLabel(day)}`);
    else onSet([{ roomId: room.id, day, staffId: value === NO_ONE ? null : value }], `${spaceName(room)} planned for ${dayLabel(day)}`);
  };

  const addAll = (wantAreas) => {
    const list = sorted.filter((r) => isArea(r) === wantAreas && !planOf.has(`${r.id}|${day}`));
    if (!list.length) return;
    onSet(list.map((r) => ({ roomId: r.id, day, staffId: null })), `${list.length} ${wantAreas ? 'common area' : 'room'}${list.length > 1 ? 's' : ''} planned for ${dayLabel(day)}`);
  };

  const shareEvenly = () => {
    const todo = today.filter((p) => !p.staffId || !housekeepers.some((s) => s.id === p.staffId));
    if (!todo.length || !housekeepers.length) return;
    const counts = Object.fromEntries(load.map(({ s, n }) => [s.id, n]));
    const out = todo.map((p) => {
      const best = housekeepers.reduce((a, b) => (counts[b.id] < counts[a.id] ? b : a));
      counts[best.id] += 1;
      return { roomId: p.roomId, day, staffId: best.id };
    });
    onSet(out, `${out.length} cleaning${out.length > 1 ? 's' : ''} shared between your team`);
  };

  const copyPrev = () => {
    const src = plan.filter((p) => p.day === prevDay && !planOf.has(`${p.roomId}|${day}`));
    if (!src.length) return;
    onSet(src.map((p) => ({ roomId: p.roomId, day, staffId: p.staffId })), `Copied ${src.length} from ${dayLabel(prevDay)}`);
  };

  const clearDay = () => onClear(today.map((p) => ({ roomId: p.roomId, day })), `${dayLabel(day)} cleared`);

  const small = `${btnSmall} border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-1.5 disabled:opacity-50 disabled:hover:bg-white`;
  const prevCount = prevDay ? plan.filter((p) => p.day === prevDay && !planOf.has(`${p.roomId}|${day}`)).length : 0;

  if (rooms.length === 0) {
    return (
      <Panel title="Planner" subtitle="Plan the next 7 days of cleaning.">
        <EmptyState icon="calendar" title="Add your rooms first" text="Once your rooms are in Lodgora you can plan who cleans what, up to a week ahead.">
          <button className={btnGhost} onClick={onAddRooms}>Add rooms or areas</button>
        </EmptyState>
      </Panel>
    );
  }

  return (
    <Panel title="Plan the week" subtitle="Choose what to clean each day and who does it. Each morning the plan goes onto your team's lists by itself.">
      <div className="px-5 sm:px-6 pb-4 flex gap-2 overflow-x-auto" role="group" aria-label="Choose a day">
        {days.map((d, i) => {
          const n = countOf(d);
          const on = d === day;
          return (
            <button key={d} onClick={() => setDay(d)} aria-pressed={on}
              className={`shrink-0 min-w-[5.5rem] rounded-xl border px-3 py-2 text-left transition-colors ${on ? 'bg-[#172B4D] border-[#172B4D] text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              <span className="block text-xs font-semibold">{label(d, i)}</span>
              <span className={`block text-[11px] ${on ? 'text-white/70' : 'text-slate-500'}`}>{i === 0 ? dayLabel(d) : ''}{i === 0 ? ' · ' : ''}{n === 0 ? 'nothing yet' : `${n} to clean`}</span>
            </button>
          );
        })}
      </div>

      <div className="px-5 sm:px-6 pb-3 flex flex-wrap gap-2">
        <button className={small} onClick={() => addAll(false)}><Icon name="plus" className="w-3.5 h-3.5" />Add all rooms</button>
        {hasAreas && <button className={small} onClick={() => addAll(true)}><Icon name="plus" className="w-3.5 h-3.5" />Add common areas</button>}
        <button className={small} onClick={shareEvenly} disabled={!unassigned.length || !housekeepers.length}><Icon name="shuffle" className="w-3.5 h-3.5" />Share evenly</button>
        {prevDay && <button className={small} onClick={copyPrev} disabled={!prevCount}><Icon name="copy" className="w-3.5 h-3.5" />Copy {dayLabel(prevDay)}</button>}
        <button className={small} onClick={clearDay} disabled={!today.length}><Icon name="x" className="w-3.5 h-3.5" />Clear day</button>
      </div>

      <div className="px-5 sm:px-6 pb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500" aria-label="Workload for this day">
        <span className="font-semibold text-slate-700">{today.length} planned</span>
        {load.map(({ s, n }) => <span key={s.id}>{s.fullName.split(' ')[0]} <span className="font-semibold text-slate-700 tabular-nums">{n}</span></span>)}
        {unassigned.length > 0 && <span className="text-amber-700">No one yet <span className="font-semibold tabular-nums">{unassigned.length}</span></span>}
        {housekeepers.length === 0 && <span>Add housekeepers in Team to give them rooms.</span>}
      </div>

      {hasAreas && (
        <div className="px-5 sm:px-6 pb-3 flex gap-1.5" role="group" aria-label="Show rooms or common areas">
          {[['all', 'Everything'], ['room', 'Rooms'], ['area', 'Common areas']].map(([id, text]) => (
            <button key={id} onClick={() => setKind(id)} aria-pressed={kind === id}
              className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-colors ${kind === id ? 'bg-[#0D7C77] border-[#0D7C77] text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{text}</button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <EmptyState icon="search" title="Nothing found" text={q ? `Nothing matches "${search}".` : 'Nothing in this view.'} />
      ) : (
        <ul className="px-5 sm:px-6 pb-6 divide-y divide-slate-100 border-t border-slate-100">
          {shown.map((r) => {
            const p = planOf.get(`${r.id}|${day}`);
            const value = !p ? NOT_PLANNED : p.staffId ? p.staffId : NO_ONE;
            const who = p?.staffId ? staffById[p.staffId] : null;
            const inactive = who && !who.active;
            return (
              <li key={r.id} className="py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1 basis-40">
                  <p className="font-semibold text-[#172B4D] text-sm">{spaceName(r)}</p>
                  <p className="text-xs text-slate-500">{r.type}{!isArea(r) && r.floor ? ` · floor ${r.floor}` : ''}</p>
                </div>
                <label className="sr-only" htmlFor={`plan-${r.id}`}>{`${spaceName(r)} on ${dayLabel(day)}`}</label>
                <select id={`plan-${r.id}`} value={value} onChange={(e) => change(r, e.target.value)}
                  className={`${inputCls} !w-56 max-w-full ${p ? 'border-[#19A7A1] bg-[#E4F3F2]/60 font-medium text-[#0D7C77]' : 'text-slate-500'}`}>
                  <option value={NOT_PLANNED}>Not planned</option>
                  <option value={NO_ONE}>Clean, no one yet</option>
                  {housekeepers.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                  {inactive && <option value={who.id}>{who.fullName} (not active)</option>}
                </select>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
