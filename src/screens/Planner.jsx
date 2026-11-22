// Planeamento: o gerente marca que quartos limpar nos próximos 7 dias e por quem.
// Quando o dia chega, o plano entra sozinho na lista de limpeza (ver apply_plan na base de dados).
import { useMemo, useState } from 'react';
import { dayKey, dayLabel, isArea, spaceName, typeLabel } from '../lib/constants';
import { t } from '../lib/i18n';
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
  const label = (d, i) => (i === 0 ? t('Tomorrow', 'Huomenna') : dayLabel(d));

  const change = (room, value) => {
    if (value === NOT_PLANNED) onClear([{ roomId: room.id, day }], t(`${spaceName(room)} removed from ${dayLabel(day)}`, `${spaceName(room)} poistettu päivältä ${dayLabel(day)}`));
    else onSet([{ roomId: room.id, day, staffId: value === NO_ONE ? null : value }], t(`${spaceName(room)} planned for ${dayLabel(day)}`, `${spaceName(room)} suunniteltu päivälle ${dayLabel(day)}`));
  };

  const addAll = (wantAreas) => {
    const list = sorted.filter((r) => isArea(r) === wantAreas && !planOf.has(`${r.id}|${day}`));
    if (!list.length) return;
    onSet(list.map((r) => ({ roomId: r.id, day, staffId: null })), t(`${list.length} ${wantAreas ? 'common area' : 'room'}${list.length > 1 ? 's' : ''} planned for ${dayLabel(day)}`, `${list.length} ${wantAreas ? (list.length > 1 ? 'yleistä tilaa' : 'yleinen tila') : (list.length > 1 ? 'huonetta' : 'huone')} suunniteltu päivälle ${dayLabel(day)}`));
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
    onSet(out, t(`${out.length} cleaning${out.length > 1 ? 's' : ''} shared between your team`, `${out.length} ${out.length > 1 ? 'siivousta' : 'siivous'} jaettu tiimin kesken`));
  };

  const copyPrev = () => {
    const src = plan.filter((p) => p.day === prevDay && !planOf.has(`${p.roomId}|${day}`));
    if (!src.length) return;
    onSet(src.map((p) => ({ roomId: p.roomId, day, staffId: p.staffId })), t(`Copied ${src.length} from ${dayLabel(prevDay)}`, `Kopioitu ${src.length} päivältä ${dayLabel(prevDay)}`));
  };

  const clearDay = () => onClear(today.map((p) => ({ roomId: p.roomId, day })), t(`${dayLabel(day)} cleared`, `${dayLabel(day)} tyhjennetty`));

  const small = `${btnSmall} bg-[#F0F1F4] hover:bg-[#E4E6EB] inline-flex items-center gap-1.5 disabled:opacity-50 disabled:hover:bg-white`;
  const prevCount = prevDay ? plan.filter((p) => p.day === prevDay && !planOf.has(`${p.roomId}|${day}`)).length : 0;

  if (rooms.length === 0) {
    return (
      <Panel title={t('Planner', 'Suunnittelu')} subtitle={t('Plan the next 7 days of cleaning.', 'Suunnittele seuraavat 7 päivää siivouksen osalta.')}>
        <EmptyState icon="calendar" title={t('Add your rooms first', 'Lisää ensin huoneesi')} text={t('Once your rooms are in Lodgora you can plan who cleans what, up to a week ahead.', 'Kun huoneesi ovat Lodgorassa, voit suunnitella, kuka siivoaa minkäkin, jopa viikon eteenpäin.')}>
          <button className={btnGhost} onClick={onAddRooms}>{t('Add rooms or areas', 'Lisää huoneita tai tiloja')}</button>
        </EmptyState>
      </Panel>
    );
  }

  return (
    <Panel title={t('Plan the week', 'Suunnittele viikko')} subtitle={t('Choose what to clean each day and who does it. Each morning the plan goes onto your team\'s lists by itself.', 'Valitse, mitä siivotaan kunakin päivänä ja kuka siivoaa. Joka aamu suunnitelma siirtyy itsestään tiimisi listoille.')}>
      <div className="px-5 sm:px-6 pb-4 flex gap-2 overflow-x-auto" role="group" aria-label={t('Choose a day', 'Valitse päivä')}>
        {days.map((d, i) => {
          const n = countOf(d);
          const on = d === day;
          return (
            <button key={d} onClick={() => setDay(d)} aria-pressed={on}
              className={`shrink-0 min-w-[5.5rem] rounded-2xl px-3.5 py-2.5 text-left transition-colors ${on ? 'bg-[#0B0B0F] text-white' : 'bg-[#F4F5F7] text-slate-700 hover:bg-[#E4E6EB]'}`}>
              <span className="block text-xs font-semibold">{label(d, i)}</span>
              <span className={`block text-[11px] ${on ? 'text-white/70' : 'text-slate-500'}`}>{i === 0 ? dayLabel(d) : ''}{i === 0 ? ' · ' : ''}{n === 0 ? t('nothing yet', 'ei vielä mitään') : t(`${n} to clean`, `${n} siivottavaa`)}</span>
            </button>
          );
        })}
      </div>

      <div className="px-5 sm:px-6 pb-3 flex flex-wrap gap-2">
        <button className={small} onClick={() => addAll(false)}><Icon name="plus" className="w-3.5 h-3.5" />{t('Add all rooms', 'Lisää kaikki huoneet')}</button>
        {hasAreas && <button className={small} onClick={() => addAll(true)}><Icon name="plus" className="w-3.5 h-3.5" />{t('Add common areas', 'Lisää yleiset tilat')}</button>}
        <button className={small} onClick={shareEvenly} disabled={!unassigned.length || !housekeepers.length}><Icon name="shuffle" className="w-3.5 h-3.5" />{t('Share evenly', 'Jaa tasan')}</button>
        {prevDay && <button className={small} onClick={copyPrev} disabled={!prevCount}><Icon name="copy" className="w-3.5 h-3.5" />{t('Copy', 'Kopioi')} {dayLabel(prevDay)}</button>}
        <button className={small} onClick={clearDay} disabled={!today.length}><Icon name="x" className="w-3.5 h-3.5" />{t('Clear day', 'Tyhjennä päivä')}</button>
      </div>

      <div className="px-5 sm:px-6 pb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500" aria-label={t('Workload for this day', 'Päivän työmäärä')}>
        <span className="font-semibold text-slate-700">{t(`${today.length} planned`, `${today.length} suunniteltu`)}</span>
        {load.map(({ s, n }) => <span key={s.id}>{s.fullName.split(' ')[0]} <span className="font-semibold text-slate-700 tabular-nums">{n}</span></span>)}
        {unassigned.length > 0 && <span className="text-amber-700">{t('No one yet', 'Ei vielä tekijää')} <span className="font-semibold tabular-nums">{unassigned.length}</span></span>}
        {housekeepers.length === 0 && <span>{t('Add housekeepers in Team to give them rooms.', 'Lisää siivoojat Tiimi-sivulla, niin voit antaa heille huoneita.')}</span>}
      </div>

      {hasAreas && (
        <div className="px-5 sm:px-6 pb-3 flex gap-1.5" role="group" aria-label={t('Show rooms or common areas', 'Näytä huoneet tai yleiset tilat')}>
          {[['all', t('Everything', 'Kaikki')], ['room', t('Rooms', 'Huoneet')], ['area', t('Common areas', 'Yleiset tilat')]].map(([id, text]) => (
            <button key={id} onClick={() => setKind(id)} aria-pressed={kind === id}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${kind === id ? 'bg-[#0B0B0F] text-white' : 'bg-[#F4F5F7] text-slate-600 hover:bg-[#E4E6EB]'}`}>{text}</button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <EmptyState icon="search" title={t('Nothing found', 'Ei tuloksia')} text={q ? t(`Nothing matches "${search}".`, `Haulla "${search}" ei löytynyt mitään.`) : t('Nothing in this view.', 'Tässä näkymässä ei ole mitään.')} />
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
                  <p className="font-semibold text-[#0B0B0F] text-sm">{spaceName(r)}</p>
                  <p className="text-xs text-slate-500">{typeLabel(r.type)}{!isArea(r) && r.floor ? ` · ${t('floor', 'kerros')} ${r.floor}` : ''}</p>
                </div>
                <label className="sr-only" htmlFor={`plan-${r.id}`}>{t(`${spaceName(r)} on ${dayLabel(day)}`, `${spaceName(r)} päivänä ${dayLabel(day)}`)}</label>
                <select id={`plan-${r.id}`} value={value} onChange={(e) => change(r, e.target.value)}
                  className={`${inputCls} !w-56 max-w-full ${p ? 'bg-[#E4F3F2] font-medium text-[#0D7C77]' : 'text-slate-500'}`}>
                  <option value={NOT_PLANNED}>{t('Not planned', 'Ei suunniteltu')}</option>
                  <option value={NO_ONE}>{t('Clean, no one yet', 'Siivottava, ei vielä tekijää')}</option>
                  {housekeepers.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                  {inactive && <option value={who.id}>{who.fullName} {t('(not active)', '(ei aktiivinen)')}</option>}
                </select>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
