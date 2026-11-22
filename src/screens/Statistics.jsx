// Estatísticas para o gerente: limpezas, tempos, qualidade, equipa e manutenção.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { backend } from '../lib/backend';
import { buildStats, durationLabel, MIN_REAL_SECONDS, percentLabel, periodStart, PERIODS } from '../lib/stats';
import { PRIORITY_STYLE, STATUS_STYLE, statusLabel, priorityLabel, typeLabel, areaLabel, cleanTypeLabel } from '../lib/constants';
import { t, LOCALE } from '../lib/i18n';
import { EmptyState, Icon, Panel, Spinner, btnGhost, btnPrimary } from '../components/ui';

const BAR = '#0D7C77'; // uma só cor para magnitudes, a do Lodgora

export default function Statistics({ rooms, issues }) {
  const [period, setPeriod] = useState('7d');
  const [cleanings, setCleanings] = useState(null); // null = a carregar
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setCleanings(await backend.manager.cleanings.list(periodStart(period).toISOString()));
      setError('');
    } catch (e) { setError(e.message || t('Could not load the statistics', 'Tilastoja ei voitu ladata')); }
  }, [period]);

  useEffect(() => {
    setCleanings(null);
    load();
    const timer = setInterval(load, 30000);
    const unsubscribe = backend.mode === 'demo' ? backend.manager.subscribe(load) : () => {};
    return () => { clearInterval(timer); unsubscribe(); };
  }, [load]);

  const stats = useMemo(() => buildStats({ cleanings: cleanings || [], issues, rooms, period }), [cleanings, issues, rooms, period]);
  const PERIOD_FI = { today: 'Tänään', '7d': 'Viim. 7 päivää', '30d': 'Viim. 30 päivää' };
  const PERIOD_IN_FI = { today: 'tänään', '7d': 'viimeisten 7 päivän aikana', '30d': 'viimeisten 30 päivän aikana' };
  const periodName = (p) => t(p.label, PERIOD_FI[p.id]);
  const periodLabel = t(PERIODS.find((p) => p.id === period).label.toLowerCase(), PERIOD_FI[period].toLowerCase());
  const inPeriod = t(`in ${periodLabel}`, PERIOD_IN_FI[period]);

  if (error) {
    return (
      <Panel title={t('We could not load the statistics', 'Tilastoja ei voitu ladata')}>
        <EmptyState icon="alert" title={t('Connection problem', 'Yhteysongelma')} text={error}><button className={btnPrimary} onClick={load}>{t('Try again', 'Yritä uudelleen')}</button></EmptyState>
      </Panel>
    );
  }
  if (cleanings === null) return <Spinner label={t('Loading statistics', 'Ladataan tilastoja')} />;

  const noData = stats.done === 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5" role="group" aria-label={t('Time period', 'Ajanjakso')}>
          {PERIODS.map((p) => (
            <button key={p.id} onClick={() => setPeriod(p.id)} aria-pressed={period === p.id}
              className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors ${period === p.id ? 'bg-[#0B0B0F] text-white' : 'bg-white text-slate-600 hover:bg-[#E4E6EB]'}`}>{periodName(p)}</button>
          ))}
        </div>
        <button className={`${btnGhost} ml-auto`} onClick={load}><Icon name="refresh" className="w-4 h-4" />{t('Refresh', 'Päivitä')}</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <Tile label={t('Cleanings finished', 'Valmiit siivoukset')} value={stats.done} sub={noData ? t('None yet', 'Ei vielä yhtään') : t(`${stats.sentBack} sent back for redoing`, `${stats.sentBack} lähetetty takaisin uusittavaksi`)} />
        <Tile label={t('Average time per room', 'Keskimääräinen aika huonetta kohden')} value={durationLabel(stats.avgRoomSeconds)}
          sub={stats.avgAreaSeconds !== null ? t(`Common areas: ${durationLabel(stats.avgAreaSeconds)}`, `Yleiset tilat: ${durationLabel(stats.avgAreaSeconds)}`) : t('Per finished room cleaning', 'Valmista huonesiivousta kohden')} />
        <Tile label={t('Approved first time', 'Hyväksytty ensimmäisellä kerralla')} value={percentLabel(stats.passRate)}
          sub={stats.reviewedCount ? t(`Of ${stats.reviewedCount} inspected`, `${stats.reviewedCount} tarkastetusta`) : t('Nothing inspected yet', 'Ei vielä tarkastettuja')} />
        <Tile label={t('Total cleaning time', 'Siivousaika yhteensä')} value={durationLabel(stats.totalSeconds)} sub={t(`In ${periodLabel}`, inPeriod.charAt(0).toUpperCase() + inPeriod.slice(1))} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 min-w-0">
          <Panel title={period === 'today' ? t('Cleanings finished by hour', 'Valmiit siivoukset tunneittain') : t('Cleanings finished per day', 'Valmiit siivoukset päivittäin')} subtitle={t('Rooms and common areas together', 'Huoneet ja yleiset tilat yhteensä')}>
            {noData ? <NoData /> : (
              <div className="px-5 sm:px-6 pb-6"><Columns buckets={stats.buckets} /></div>
            )}
          </Panel>
        </div>

        <Panel title={t('Right now', 'Juuri nyt')} subtitle={t('Current status, not limited to the period', 'Nykytilanne, ei rajattu ajanjaksoon')}>
          <div className="px-5 sm:px-6 pb-6 space-y-6">
            <StatusBar title={t('Rooms', 'Huoneet')} data={stats.now.rooms} />
            <StatusBar title={t('Common areas', 'Yleiset tilat')} data={stats.now.areas} />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 min-w-0">
          <Panel title={t('Team', 'Tiimi')} subtitle={t(`Each housekeeper in ${periodLabel}`, `Jokainen siivooja ${inPeriod}`)}>
            {stats.byStaff.length === 0 ? <NoData /> : <TeamTable rows={stats.byStaff} />}
          </Panel>
        </div>

        <Panel title={t('Average time by type', 'Keskimääräinen aika tyypeittäin')} subtitle={t('Longest first', 'Pisin ensin')}>
          {stats.byCleanType.some((c) => c.count > 0) && (
            <div className="px-5 sm:px-6 pb-4 grid grid-cols-2 gap-3">
              {stats.byCleanType.map((c) => (
                <div key={c.type} className="rounded-2xl bg-[#F4F5F7] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{cleanTypeLabel(c.type)}</p>
                  <p className="text-xl font-semibold text-[#0B0B0F] mt-0.5">{durationLabel(c.avgSeconds)}</p>
                  <p className="text-xs text-slate-500">{c.count}×</p>
                </div>
              ))}
            </div>
          )}
          {stats.bySpace.length === 0 ? <NoData small /> : (
            <div className="px-5 sm:px-6 pb-6">
              <HBars rows={stats.bySpace.slice(0, 8).map((r) => ({ name: r.isArea ? areaLabel(r.name) : typeLabel(r.name), tag: r.isArea ? t('Area', 'Tila') : '', value: r.avgSeconds, text: durationLabel(r.avgSeconds), note: `${r.count}×` }))} />
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <Panel title={t('Maintenance', 'Huolto')} subtitle={t(`Issues in ${periodLabel}`, `Viat ${inPeriod}`)}>
          <div className="px-5 sm:px-6 pb-6 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Mini label={t('Reported', 'Ilmoitettu')} value={stats.issues.reported} />
              <Mini label={t('Resolved', 'Korjattu')} value={stats.issues.resolved} />
              <Mini label={t('Open now', 'Avoinna nyt')} value={stats.issues.open} />
              <Mini label={t('Average time to fix', 'Keskimääräinen korjausaika')} value={durationLabel(stats.issues.avgFixSeconds)} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">{t('Open now by priority', 'Avoinna nyt kiireellisyyden mukaan')}</p>
              <ul className="flex flex-wrap gap-2">
                {stats.issues.openByPriority.map((p) => (
                  <li key={p.priority} className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${PRIORITY_STYLE[p.priority]}`}>{priorityLabel(p.priority)} <span className="tabular-nums">{p.count}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>

        <div className="xl:col-span-2 min-w-0">
          <Panel title={t('Latest cleanings', 'Viimeisimmät siivoukset')} subtitle={t('The most recent ones in this period', 'Tämän jakson uusimmat')}>
            {stats.recent.length === 0 ? <NoData /> : <RecentTable rows={stats.recent} sameDay={period === 'today'} />}
          </Panel>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        {t(`A cleaning is counted when the housekeeper presses Finish. Cleanings under ${MIN_REAL_SECONDS} seconds are counted but left out of the average times. “Approved first time” is the share of inspected cleanings that you approved without sending them back.`, `Siivous lasketaan, kun siivooja painaa Valmis. Alle ${MIN_REAL_SECONDS} sekunnin siivoukset lasketaan mukaan, mutta jätetään pois keskiarvoista. ”Hyväksytty ensimmäisellä kerralla” on niiden tarkastettujen siivousten osuus, jotka hyväksyit lähettämättä niitä takaisin.`)}
      </p>
    </>
  );
}

/* ---------- peças ---------- */

function Tile({ label, value, sub }) {
  return (
    <div className="bg-white p-5 rounded-3xl">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-[#0B0B0F] tabular-nums mt-1">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-2xl bg-[#F4F5F7] px-3.5 py-2.5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-[#0B0B0F] tabular-nums">{value}</p>
    </div>
  );
}

function NoData({ small }) {
  return (
    <EmptyState icon="chart" title={t('No cleanings in this period yet', 'Ei vielä siivouksia tällä jaksolla')}
      text={small ? t('Appears when your team finishes cleanings.', 'Näkyy, kun tiimisi saa siivouksia valmiiksi.') : t('Cleanings show up here when your housekeepers press Finish.', 'Siivoukset näkyvät tässä, kun siivoojat painavat Valmis.')} />
  );
}

// Colunas: uma por hora ou por dia. Barras finas, valor só no máximo, detalhe ao passar o rato.
function Columns({ buckets }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const every = buckets.length > 16 ? Math.ceil(buckets.length / 8) : 1;
  return (
    <div>
      <div className="flex items-end gap-1 h-44 border-b border-slate-200" role="list" aria-label={t('Cleanings finished', 'Valmiit siivoukset')}>
        {buckets.map((b, i) => (
          <div key={b.key} role="listitem" tabIndex={0} aria-label={t(`${b.label}: ${b.count} ${b.count === 1 ? 'cleaning' : 'cleanings'}, ${durationLabel(b.seconds)} in total`, `${b.label}: ${b.count} ${b.count === 1 ? 'siivous' : 'siivousta'}, yhteensä ${durationLabel(b.seconds)}`)}
            className="group relative flex-1 min-w-0 h-full flex flex-col items-center justify-end outline-none">
            {b.count === max && b.count > 0 && <span className="text-[11px] font-semibold text-[#0B0B0F] mb-1 tabular-nums">{b.count}</span>}
            <div className="w-full max-w-[24px] rounded-t-[4px] transition-opacity group-hover:opacity-80 group-focus:opacity-80"
              style={{ height: b.count ? `${Math.max(3, (b.count / max) * 82)}%` : '0', background: BAR }} />
            <span className={`pointer-events-none absolute bottom-full mb-1 z-10 whitespace-nowrap ${i > buckets.length * 0.6 ? 'right-0' : i < buckets.length * 0.2 ? 'left-0' : 'left-1/2 -translate-x-1/2'} rounded-md bg-[#0B0B0F] text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 group-focus:opacity-100`}>
              {b.label}: {b.count} · {durationLabel(b.seconds)}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1.5" aria-hidden="true">
        {buckets.map((b, i) => (
          <span key={b.key} className="flex-1 min-w-0 text-center text-[10px] text-slate-500 whitespace-nowrap overflow-visible">{i % every === 0 ? b.label : ''}</span>
        ))}
      </div>
    </div>
  );
}

// Barras horizontais ordenadas, uma só cor, valor na ponta
function HBars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.name} title={`${r.name}: ${r.text} (${r.note})`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-slate-700">{r.name}{r.tag && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{r.tag}</span>}</span>
            <span className="font-semibold text-[#0B0B0F] tabular-nums whitespace-nowrap">{r.text} <span className="font-normal text-slate-400 text-xs">{r.note}</span></span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
            <div className="h-full rounded-r-[4px]" style={{ width: `${Math.max(3, (r.value / max) * 100)}%`, background: BAR }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Uma barra fina dividida por estados, com os números ao lado
function StatusBar({ title, data }) {
  const shown = data.byStatus.filter((s) => s.count > 0);
  return (
    <div>
      <div className="flex items-baseline justify-between"><p className="text-sm font-semibold text-[#0B0B0F]">{title}</p><p className="text-xs text-slate-500 tabular-nums">{t(`${data.total} in total`, `${data.total} yhteensä`)}</p></div>
      {data.total === 0 ? <p className="text-xs text-slate-500 mt-2">{t('None added yet.', 'Ei vielä lisättyjä.')}</p> : (
        <>
          <div className="flex gap-0.5 h-3 mt-2" role="img" aria-label={`${title}: ${shown.map((s) => `${s.count} ${statusLabel(s.status)}`).join(', ')}`}>
            {shown.map((s) => <span key={s.status} title={`${statusLabel(s.status)}: ${s.count}`} className={`first:rounded-l-full last:rounded-r-full ${STATUS_STYLE[s.status].dot}`} style={{ flex: s.count }} />)}
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs">
            {data.byStatus.map((s) => (
              <li key={s.status} className="flex items-start gap-2 text-slate-600">
                <span className={`w-2 h-2 rounded-full flex-none mt-1 ${STATUS_STYLE[s.status].dot}`} />
                <span className="flex-1 leading-tight">{statusLabel(s.status)}</span>
                <span className="font-semibold text-[#0B0B0F] tabular-nums">{s.count}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function TeamTable({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="px-5 sm:px-6 pb-5 overflow-x-auto">
      <table className="w-full text-sm min-w-[34rem]">
        <thead>
          <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
            <th className="font-medium py-2 pr-3">{t('Name', 'Nimi')}</th>
            <th className="font-medium py-2 pr-3">{t('Cleanings', 'Siivoukset')}</th>
            <th className="font-medium py-2 pr-3">{t('Average time', 'Keskimääräinen aika')}</th>
            <th className="font-medium py-2 pr-3">{t('Total time', 'Aika yhteensä')}</th>
            <th className="font-medium py-2">{t('Approved first time', 'Hyväksytty ensimmäisellä kerralla')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-slate-100 last:border-0">
              <td className="py-3 pr-3 font-semibold text-[#0B0B0F] whitespace-nowrap">{r.name}</td>
              <td className="py-3 pr-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 tabular-nums font-semibold">{r.count}</span>
                  <span className="hidden sm:block h-2 w-24 bg-slate-100 rounded-full overflow-hidden"><span className="block h-full rounded-r-[4px]" style={{ width: `${(r.count / max) * 100}%`, background: BAR }} /></span>
                </div>
              </td>
              <td className="py-3 pr-3 tabular-nums">{durationLabel(r.avgSeconds)}</td>
              <td className="py-3 pr-3 tabular-nums">{durationLabel(r.totalSeconds)}</td>
              <td className="py-3 tabular-nums">{percentLabel(r.passRate)}{r.sentBack > 0 && <span className="text-xs text-slate-500"> ({t(`${r.sentBack} sent back`, `${r.sentBack} lähetetty takaisin`)})</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const RESULT = {
  approved: { label: t('Approved', 'Hyväksytty'), cls: 'bg-emerald-50 text-emerald-700' },
  sent_back: { label: t('Sent back', 'Lähetetty takaisin'), cls: 'bg-rose-50 text-rose-700' },
  pending: { label: t('Waiting', 'Odottaa'), cls: 'bg-amber-50 text-amber-700' }
};

function RecentTable({ rows, sameDay }) {
  const when = (iso) => new Date(iso).toLocaleString(LOCALE, sameDay ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return (
    <div className="px-5 sm:px-6 pb-5 overflow-x-auto">
      <table className="w-full text-sm min-w-[34rem]">
        <thead>
          <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
            <th className="font-medium py-2 pr-3">{t('Finished', 'Valmistui')}</th>
            <th className="font-medium py-2 pr-3">{t('Where', 'Missä')}</th>
            <th className="font-medium py-2 pr-3">{t('Who', 'Kuka')}</th>
            <th className="font-medium py-2 pr-3">{t('Time', 'Aika')}</th>
            <th className="font-medium py-2">{t('Result', 'Tulos')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const res = RESULT[c.approvedAt && !c.sentBack ? 'approved' : c.sentBack ? 'sent_back' : 'pending'];
            return (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <td className="py-2.5 pr-3 text-slate-500 whitespace-nowrap tabular-nums">{when(c.finishedAt)}</td>
                <td className="py-2.5 pr-3 font-semibold text-[#0B0B0F] whitespace-nowrap">{c.kind === 'area' ? areaLabel(c.label) : t(`Room ${c.label}`, `Huone ${c.label}`)}</td>
                <td className="py-2.5 pr-3 whitespace-nowrap">{c.staffName || '–'}</td>
                <td className="py-2.5 pr-3 tabular-nums whitespace-nowrap">{durationLabel(c.seconds)}</td>
                <td className="py-2.5"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${res.cls}`}>{res.label}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
