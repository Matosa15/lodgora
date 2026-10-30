// Estados dos quartos. "Dirty" aparece ao utilizador como "Needs cleaning".
export const STATUSES = ['Ready', 'Dirty', 'Cleaning', 'Awaiting inspection', 'Occupied', 'Out of service'];

const LABELS = { Dirty: 'Needs cleaning' };
export const statusLabel = (s) => LABELS[s] || s;

export const STATUS_STYLE = {
  'Ready':               { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'border-t-emerald-500', dot: 'bg-emerald-500' },
  'Dirty':               { badge: 'bg-orange-50 text-orange-700 border-orange-200',    bar: 'border-t-orange-400',  dot: 'bg-orange-500' },
  'Cleaning':            { badge: 'bg-blue-50 text-blue-700 border-blue-200',          bar: 'border-t-blue-500',    dot: 'bg-blue-500' },
  'Awaiting inspection': { badge: 'bg-amber-50 text-amber-700 border-amber-200',       bar: 'border-t-amber-500',   dot: 'bg-amber-500' },
  'Occupied':            { badge: 'bg-slate-100 text-slate-700 border-slate-200',      bar: 'border-t-slate-400',   dot: 'bg-slate-400' },
  'Out of service':      { badge: 'bg-rose-50 text-rose-700 border-rose-200',          bar: 'border-t-rose-500',    dot: 'bg-rose-500' }
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

/* ---------- Tipos de quarto ---------- */
export const ROOM_TYPE_GROUPS = [
  { label: 'Standard', types: ['Standard Single', 'Standard Double', 'Standard Twin', 'Standard Triple', 'Standard Quadruple'] },
  { label: 'Superior and Deluxe', types: ['Superior Single', 'Superior Double', 'Superior Twin', 'Deluxe Double', 'Deluxe Twin', 'Deluxe Queen', 'Deluxe King'] },
  { label: 'Family and groups', types: ['Family Room', 'Family Room (2 bedrooms)', 'Connecting Rooms', 'Dormitory Bed', 'Private Room (hostel)'] },
  { label: 'Suites', types: ['Junior Suite', 'Suite', 'Executive Suite', 'Family Suite', 'Honeymoon Suite', 'Presidential Suite', 'Penthouse'] },
  { label: 'Apartments and villas', types: ['Studio', 'Apartment (1 bedroom)', 'Apartment (2 bedrooms)', 'Bungalow', 'Villa', 'Cabin or Chalet'] },
  { label: 'Accessibility and other', types: ['Accessible Room', 'Accessible Suite', 'Smoking Room', 'Pet-friendly Room', 'Sea View Room', 'Garden View Room'] }
];
export const ROOM_TYPES = ROOM_TYPE_GROUPS.flatMap((g) => g.types);

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
