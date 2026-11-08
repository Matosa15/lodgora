// Estados dos quartos. "Dirty" aparece ao utilizador como "Needs cleaning".
export const STATUSES = ['Ready', 'Dirty', 'Cleaning', 'Awaiting inspection', 'Occupied', 'Out of service'];

const LABELS = { Dirty: 'Needs cleaning' };
export const statusLabel = (s) => LABELS[s] || s;

export const STATUS_STYLE = {
  'Ready':               { badge: 'bg-emerald-50 text-emerald-700', bar: 'border-t-emerald-500', dot: 'bg-emerald-500' },
  'Dirty':               { badge: 'bg-orange-50 text-orange-700',    bar: 'border-t-orange-400',  dot: 'bg-orange-500' },
  'Cleaning':            { badge: 'bg-blue-50 text-blue-700',          bar: 'border-t-blue-500',    dot: 'bg-blue-500' },
  'Awaiting inspection': { badge: 'bg-amber-50 text-amber-700',       bar: 'border-t-amber-500',   dot: 'bg-amber-500' },
  'Occupied':            { badge: 'bg-slate-100 text-slate-700',      bar: 'border-t-slate-400',   dot: 'bg-slate-400' },
  'Out of service':      { badge: 'bg-rose-50 text-rose-700',          bar: 'border-t-rose-500',    dot: 'bg-rose-500' }
};

export const PRIORITIES = ['urgent', 'high', 'normal', 'low'];
export const PRIORITY_STYLE = {
  urgent: 'bg-rose-50 text-rose-700',
  high: 'bg-amber-50 text-amber-700',
  normal: 'bg-slate-100 text-slate-600',
  low: 'bg-slate-100 text-slate-500'
};
export const ISSUE_STATUS_LABEL = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved' };

export function timeAgo(iso) {
  const min = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
export const timeOfDay = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
export const initials = (name) => name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

/* ---------- Tipos de quarto e partes comuns ---------- */
export const ROOM_TYPES = ['Single', 'Double', 'Twin', 'Triple', 'Family', 'Suite', 'Studio / Apartment', 'Accessible'];
export const AREA_PRESETS = [
  'Lobby', 'Reception', 'Corridors', 'Stairs', 'Elevators', 'Breakfast room', 'Restaurant', 'Bar',
  'Gym', 'Spa', 'Pool area', 'Public toilets', 'Laundry', 'Meeting room', 'Terrace', 'Garden'
];
export const AREA_TYPE = 'Common area';

export const isArea = (r) => r?.kind === 'area';
// "Room 101" ou "Lobby" (para títulos) e "room 101" ou "Lobby" (dentro de frases)
export const spaceName = (r) => (isArea(r) ? r.number : `Room ${r.number}`);
export const spaceInline = (r) => (isArea(r) ? r.number : `room ${r.number}`);

/* ---------- Relógio de limpeza ---------- */
// Segundos de limpeza até agora: o que já estava guardado + o troço em que o relógio está a correr
export const cleanElapsed = (room, now = Date.now()) =>
  (room.cleanSeconds || 0) +
  (room.cleanRunningSince ? Math.max(0, Math.floor((now - Date.parse(room.cleanRunningSince)) / 1000)) : 0);

export function clock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const two = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`;
}
export const minutesLabel = (s) => (s < 60 ? 'under 1 min' : `${Math.round(s / 60)} min`);

/* ---------- Dias (planeamento) ---------- */
// Dia como 'AAAA-MM-DD' no fuso do navegador, daqui a n dias
export function dayKey(n = 0) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// "Wed 4 Nov" para um dia 'AAAA-MM-DD'
export const dayLabel = (key) => new Date(key + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

// Só para mostrar: "jonh status" -> "Jonh Status", "shower" -> "Shower". Não altera o que está guardado.
export const tidyName = (s) => String(s || '').trim().replace(/(^|[\s\-'])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
export const tidyTitle = (s) => { const t = String(s || '').trim(); return t.charAt(0).toUpperCase() + t.slice(1); };
