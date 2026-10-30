// Modo demonstração: tudo fica guardado só neste navegador (localStorage).
// Serve para mostrar o Lodgora a hotéis sem base de dados e para testar a interface.
// Tem exatamente a mesma "forma" que o liveBackend, por isso os ecrãs funcionam igual.

const KEY = 'lodgora-demo-v2';
const SESSION_KEY = 'lodgora-demo-session';
// Mesmas regras do relógio que a base de dados real aplica
function applyStatus(r, status) {
  const prev = r.status;
  if (status === 'Cleaning' && prev !== 'Cleaning') { r.cleanSeconds = 0; r.cleanRunningSince = new Date().toISOString(); }
  else if (prev === 'Cleaning' && status !== 'Cleaning') {
    if (r.cleanRunningSince) r.cleanSeconds = (r.cleanSeconds || 0) + Math.floor((Date.now() - Date.parse(r.cleanRunningSince)) / 1000);
    r.cleanRunningSince = null;
  }
  if (status === 'Dirty' && prev !== 'Dirty') { r.cleanSeconds = 0; r.cleanRunningSince = null; }
  r.status = status;
}
const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2));
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();

function seed() {
  const staff = [
    { id: 's1', fullName: 'Ana Silva', username: 'ana', role: 'housekeeper', active: true, pin: '1234' },
    { id: 's2', fullName: 'Maria Rodrigues', username: 'maria', role: 'housekeeper', active: true, pin: '1234' },
    { id: 's3', fullName: 'Sofia Lopes', username: 'sofia', role: 'housekeeper', active: true, pin: '1234' },
    { id: 's4', fullName: 'Rui Almeida', username: 'rui', role: 'housekeeper', active: true, pin: '1234' }
  ];
  const room = (number, floor, type, status, assignedTo = null, note = '') =>
    ({ id: newId(), number, floor, type, status, assignedTo, note, cleanSeconds: 0, cleanRunningSince: null });
  const rooms = [
    room('101', 1, 'Deluxe Queen', 'Ready'),
    room('102', 1, 'Standard Twin', 'Cleaning', 's2'),
    room('103', 1, 'Executive Suite', 'Occupied'),
    room('104', 1, 'Deluxe King', 'Awaiting inspection', 's1'),
    room('105', 1, 'Standard Single', 'Ready'),
    room('106', 1, 'Accessible Suite', 'Out of service'),
    room('108', 1, 'Standard Twin', 'Dirty', 's2'),
    room('118', 1, 'Deluxe Queen', 'Occupied'),
    room('201', 2, 'Executive Suite', 'Dirty', 's1'),
    room('202', 2, 'Deluxe King', 'Ready'),
    room('203', 2, 'Standard Twin', 'Occupied'),
    room('204', 2, 'Deluxe Queen', 'Awaiting inspection', 's3'),
    room('205', 2, 'Standard Double', 'Dirty')
  ];
  const byNumber = (n) => rooms.find((r) => r.number === n);
  const running = byNumber('102'); running.cleanRunningSince = ago(8);
  const done = byNumber('104'); done.cleanSeconds = 26 * 60;
  byNumber('204').cleanSeconds = 31 * 60;
  const issues = [
    { id: newId(), roomId: byNumber('106').id, roomNumber: '106', title: 'Bathroom leak', priority: 'urgent', status: 'open', reportedBy: 'Front desk', createdAt: ago(34) },
    { id: newId(), roomId: byNumber('118').id, roomNumber: '118', title: 'Air conditioning does not cool', priority: 'high', status: 'in_progress', reportedBy: 'Front desk', createdAt: ago(120) },
    { id: newId(), roomId: byNumber('105').id, roomNumber: '105', title: 'Bedside lamp is not working', priority: 'low', status: 'open', reportedBy: 'Ana Silva', createdAt: ago(300) }
  ];
  const activity = [
    { id: newId(), text: 'Cleaning started in room 102', actor: 'Maria Rodrigues', createdAt: ago(10) },
    { id: newId(), text: 'Room 204 cleaned, waiting for inspection', actor: 'Sofia Lopes', createdAt: ago(25) },
    { id: newId(), text: 'Issue reported in room 106: Bathroom leak', actor: 'Front desk', createdAt: ago(34) },
    { id: newId(), text: 'Room 101 marked ready', actor: 'Ana Silva', createdAt: ago(60) },
    { id: newId(), text: 'Daily task list generated', actor: 'Lodgora', createdAt: ago(100) }
  ];
  return { hotel: { id: 'demo', name: 'Northbridge Hotel', code: 'DEMO01' }, managerName: 'Sofia Ferreira', staff, rooms, issues, activity };
}

export function createDemoBackend() {
  let state;
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch { state = null; }
  if (!state || !state.rooms) state = seed();

  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => fn());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignora */ } emit(); };
  // Outro separador do mesmo navegador mudou os dados
  window.addEventListener('storage', (e) => {
    if (e.key === KEY && e.newValue) { try { state = JSON.parse(e.newValue); emit(); } catch { /* ignora */ } }
  });

  const attempts = {};   // bloqueio por 5 PINs errados
  const session = {
    get() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; } },
    set(v) { try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(v)); } catch { /* ignora */ } },
    del() { try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignora */ } }
  };
  const log = (text, actor) => { state.activity.unshift({ id: newId(), text, actor, createdAt: new Date().toISOString() }); state.activity = state.activity.slice(0, 50); };
  const me = () => state.staff.find((s) => s.id === session.get()?.staffId && s.active);
  const needMe = () => { const s = me(); if (!s) throw new Error('Session expired. Please sign in again.'); return s; };
  const managerSession = () => ({ kind: 'manager', name: state.managerName, hotel: state.hotel });

  return {
    mode: 'demo',

    auth: {
      async getSession() {
        const s = session.get();
        if (!s) return null;
        if (s.kind === 'manager') return managerSession();
        const st = me();
        return st ? { kind: 'staff', name: st.fullName, hotel: { name: state.hotel.name }, staffId: st.id } : null;
      },
      async signInManager() { session.set({ kind: 'manager' }); return managerSession(); },
      async signUpManager() { session.set({ kind: 'manager' }); return managerSession(); },
      async signInStaff({ hotelCode, username, pin }) {
        const key = `${String(hotelCode).trim().toUpperCase()}:${String(username).trim().toLowerCase()}`;
        const a = attempts[key] || { failures: 0, lockedUntil: 0 };
        if (a.lockedUntil > Date.now()) throw new Error('Too many attempts. Try again in 15 minutes.');
        const st = state.staff.find((s) => s.active && s.username === String(username).trim().toLowerCase());
        if (String(hotelCode).trim().toUpperCase() !== state.hotel.code || !st || st.pin !== pin) {
          a.failures += 1;
          if (a.failures >= 5) { a.lockedUntil = Date.now() + 15 * 60000; a.failures = 0; }
          attempts[key] = a;
          throw new Error('Wrong hotel code, username or PIN');
        }
        delete attempts[key];
        session.set({ kind: 'staff', staffId: st.id });
        return { kind: 'staff', name: st.fullName, hotel: { name: state.hotel.name }, staffId: st.id };
      },
      async signOut() { session.del(); }
    },

    manager: {
      rooms: {
        async list() { return state.rooms.map((r) => ({ ...r })); },
        async update(id, patch) {
          const r = state.rooms.find((x) => x.id === id);
          if (r) {
            const { status, ...rest } = patch;
            Object.assign(r, rest);
            if (status && status !== r.status) applyStatus(r, status);
          }
          save();
        },
        async create(list) {
          list.forEach((n) => {
            if (!state.rooms.some((r) => r.number === n.number)) {
              state.rooms.push({ id: newId(), number: n.number, floor: n.floor, type: n.type, status: n.status || 'Ready', assignedTo: null, note: '', cleanSeconds: 0, cleanRunningSince: null });
            }
          });
          state.rooms.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
          save();
        }
      },
      issues: {
        async list() { return state.issues.map((i) => ({ ...i })); },
        async create({ roomId, title, priority }) {
          const room = state.rooms.find((r) => r.id === roomId);
          state.issues.unshift({ id: newId(), roomId: roomId || null, roomNumber: room?.number || '', title, priority, status: 'open', reportedBy: state.managerName, createdAt: new Date().toISOString() });
          save();
        },
        async setStatus(id, status) {
          const i = state.issues.find((x) => x.id === id);
          if (i) i.status = status;
          save();
        }
      },
      staff: {
        async list() { return state.staff.map((s) => ({ ...s })); },
        async create({ fullName, username, pin }) {
          const u = String(username).trim().toLowerCase();
          if (fullName.trim().length < 2) throw new Error('Enter the full name');
          if (!/^[a-z0-9._-]{2,20}$/.test(u)) throw new Error('Username must have 2 to 20 letters, numbers, dots or dashes');
          if (!/^[0-9]{4}$/.test(pin)) throw new Error('The PIN must have exactly 4 digits');
          if (state.staff.some((s) => s.username === u)) throw new Error('That username is already used');
          state.staff.push({ id: newId(), fullName: fullName.trim(), username: u, role: 'housekeeper', active: true, pin });
          save();
        },
        async setPin(id, pin) {
          if (!/^[0-9]{4}$/.test(pin)) throw new Error('The PIN must have exactly 4 digits');
          const s = state.staff.find((x) => x.id === id);
          if (!s) throw new Error('Staff member not found');
          s.pin = pin;
          Object.keys(attempts).forEach((k) => delete attempts[k]);
          save();
        },
        async setActive(id, active) {
          const s = state.staff.find((x) => x.id === id);
          if (!s) throw new Error('Staff member not found');
          s.active = active;
          if (!active) state.rooms.forEach((r) => { if (r.assignedTo === id) r.assignedTo = null; });
          save();
        }
      },
      activity: {
        async list() { return state.activity.slice(0, 30).map((a) => ({ ...a })); },
        async add(text) { log(text, state.managerName); save(); }
      },
      subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb); }
    },

    staff: {
      async rooms() {
        const s = needMe();
        return state.rooms.filter((r) => r.assignedTo === s.id).map(({ id, number, floor, type, status, note, cleanSeconds, cleanRunningSince }) => ({ id, number, floor, type, status, note, cleanSeconds: cleanSeconds || 0, cleanRunningSince: cleanRunningSince || null }));
      },
      async setStatus(roomId, status) {
        const s = needMe();
        const r = state.rooms.find((x) => x.id === roomId && x.assignedTo === s.id);
        if (!r) throw new Error('Room not found');
        const allowed = (r.status === 'Dirty' && status === 'Cleaning') || (r.status === 'Cleaning' && (status === 'Awaiting inspection' || status === 'Dirty'));
        if (!allowed) throw new Error('That change is not allowed');
        applyStatus(r, status);
        const took = r.cleanSeconds < 60 ? 'under 1 min' : `${Math.round(r.cleanSeconds / 60)} min`;
        log(status === 'Cleaning' ? `Cleaning started in room ${r.number}`
          : status === 'Awaiting inspection' ? `Room ${r.number} cleaned in ${took}, waiting for inspection`
          : `Room ${r.number} put back on the cleaning list`, s.fullName);
        save();
      },
      async timer(roomId, action) {
        const s = needMe();
        const r = state.rooms.find((x) => x.id === roomId && x.assignedTo === s.id);
        if (!r) throw new Error('Room not found');
        if (r.status !== 'Cleaning') throw new Error('That change is not allowed');
        if (action === 'pause' && r.cleanRunningSince) {
          r.cleanSeconds = (r.cleanSeconds || 0) + Math.floor((Date.now() - Date.parse(r.cleanRunningSince)) / 1000);
          r.cleanRunningSince = null;
        } else if (action === 'resume' && !r.cleanRunningSince) {
          r.cleanRunningSince = new Date().toISOString();
        }
        save();
      },
      async reportIssue(roomId, title, priority) {
        const s = needMe();
        if (title.trim().length < 3) throw new Error('Describe the problem');
        const r = state.rooms.find((x) => x.id === roomId);
        state.issues.unshift({ id: newId(), roomId: r?.id || null, roomNumber: r?.number || '', title: title.trim(), priority, status: 'open', reportedBy: s.fullName, createdAt: new Date().toISOString() });
        log(`Issue reported${r ? ' in room ' + r.number : ''}: ${title.trim()}`, s.fullName);
        save();
      }
    }
  };
}
