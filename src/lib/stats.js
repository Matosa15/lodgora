// Cálculo das estatísticas a partir do histórico de limpezas e das avarias.
// Funções puras: recebem dados e devolvem números, sem tocar na interface.

export const PERIODS = [
  { id: 'today', label: 'Today', days: 1 },
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 }
];
// Limpezas com menos de 30 s são toques por engano: contam, mas não entram nas médias de tempo
export const MIN_REAL_SECONDS = 30;

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const periodStart = (periodId, now = new Date()) => {
  const days = PERIODS.find((p) => p.id === periodId)?.days || 7;
  const s = startOfDay(now);
  s.setDate(s.getDate() - (days - 1));
  return s;
};

const avg = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);
const reviewed = (c) => c.approvedAt || c.sentBack;
const passRate = (list) => {
  const r = list.filter(reviewed);
  return r.length ? r.filter((c) => c.approvedAt && !c.sentBack).length / r.length : null;
};
const realSeconds = (list) => list.filter((c) => c.seconds >= MIN_REAL_SECONDS).map((c) => c.seconds);

export function buildStats({ cleanings, issues, rooms, period, now = new Date() }) {
  const since = periodStart(period, now);
  const c = cleanings.filter((x) => new Date(x.finishedAt) >= since);
  const roomClean = c.filter((x) => x.kind !== 'area');
  const areaClean = c.filter((x) => x.kind === 'area');

  // Colunas do gráfico: horas de hoje, ou um dia por coluna
  let buckets;
  if (period === 'today') {
    buckets = Array.from({ length: 17 }, (_, i) => ({ key: i + 6, label: String(i + 6).padStart(2, '0'), count: 0, seconds: 0 }));
    c.forEach((x) => {
      const h = Math.min(22, Math.max(6, new Date(x.finishedAt).getHours()));
      const b = buckets[h - 6]; b.count += 1; b.seconds += x.seconds;
    });
  } else {
    const days = PERIODS.find((p) => p.id === period).days;
    buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(since); d.setDate(d.getDate() + i);
      return { key: d.toDateString(), date: d, label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), count: 0, seconds: 0 };
    });
    const index = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
    c.forEach((x) => {
      const i = index[new Date(x.finishedAt).toDateString()];
      if (i !== undefined) { buckets[i].count += 1; buckets[i].seconds += x.seconds; }
    });
  }

  const group = (list, keyFn) => {
    const map = new Map();
    list.forEach((x) => { const k = keyFn(x); if (!map.has(k)) map.set(k, []); map.get(k).push(x); });
    return [...map.entries()];
  };

  const byStaff = group(c, (x) => x.staffName || 'Unknown').map(([name, list]) => ({
    name, count: list.length, avgSeconds: avg(realSeconds(list)),
    totalSeconds: list.reduce((a, b) => a + b.seconds, 0), passRate: passRate(list),
    sentBack: list.filter((x) => x.sentBack).length
  })).sort((a, b) => b.count - a.count);

  const bySpace = group(c, (x) => (x.kind === 'area' ? x.label : x.type || 'Unknown')).map(([name, list]) => ({
    name, isArea: list[0].kind === 'area', count: list.length, avgSeconds: avg(realSeconds(list))
  })).filter((x) => x.avgSeconds !== null).sort((a, b) => b.avgSeconds - a.avgSeconds);

  const reported = issues.filter((i) => new Date(i.createdAt) >= since);
  const resolved = issues.filter((i) => i.resolvedAt && new Date(i.resolvedAt) >= since);
  const fixTimes = resolved.map((i) => (new Date(i.resolvedAt) - new Date(i.createdAt)) / 1000).filter((n) => n >= 0);
  const open = issues.filter((i) => i.status !== 'resolved');

  const count = (list, status) => list.filter((r) => r.status === status).length;
  const onlyRooms = rooms.filter((r) => r.kind !== 'area');
  const onlyAreas = rooms.filter((r) => r.kind === 'area');

  return {
    since,
    done: c.length,
    avgRoomSeconds: avg(realSeconds(roomClean)),
    avgAreaSeconds: avg(realSeconds(areaClean)),
    totalSeconds: c.reduce((a, b) => a + b.seconds, 0),
    passRate: passRate(c),
    reviewedCount: c.filter(reviewed).length,
    sentBack: c.filter((x) => x.sentBack).length,
    buckets, byStaff, bySpace,
    recent: c.slice().sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt)).slice(0, 12),
    issues: {
      reported: reported.length, resolved: resolved.length, open: open.length,
      avgFixSeconds: avg(fixTimes),
      openByPriority: ['urgent', 'high', 'normal', 'low'].map((p) => ({ priority: p, count: open.filter((i) => i.priority === p).length }))
    },
    now: {
      rooms: { total: onlyRooms.length, byStatus: ['Ready', 'Dirty', 'Cleaning', 'Awaiting inspection', 'Occupied', 'Out of service'].map((s) => ({ status: s, count: count(onlyRooms, s) })) },
      areas: { total: onlyAreas.length, byStatus: ['Ready', 'Dirty', 'Cleaning', 'Awaiting inspection', 'Out of service'].map((s) => ({ status: s, count: count(onlyAreas, s) })) }
    }
  };
}

export const durationLabel = (s) => {
  if (s === null || s === undefined) return '–';
  if (s < 60) return `${Math.round(s)} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h >= 24) return `${Math.floor(h / 24)} d ${h % 24} h`;
  return `${h} h ${String(m % 60).padStart(2, '0')} min`;
};
export const percentLabel = (r) => (r === null || r === undefined ? '–' : `${Math.round(r * 100)}%`);
