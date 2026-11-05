// Modo demonstração: tudo fica guardado só neste navegador (localStorage).
// Serve para mostrar o Lodgora a hotéis sem base de dados e para testar a interface.
// Tem exatamente a mesma "forma" que o liveBackend, por isso os ecrãs funcionam igual.

import { dayKey, spaceInline } from './constants';

const KEY = 'lodgora-demo-v7';
const SESSION_KEY = 'lodgora-demo-session';
const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2));
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();

// 30 dias de limpezas de exemplo. Gerador pseudo-aleatório com semente fixa, para ser sempre igual.
function sampleHistory(rooms, staff) {
  let n = 11;
  const rnd = () => { n = (n * 16807) % 2147483647; return n / 2147483647; };
  const speed = { s1: 22, s2: 28, s3: 25, s4: 36 };      // minutos médios por quarto
  const passRate = { s1: 0.95, s2: 0.88, s3: 0.9, s4: 0.72 };
  const bigTypes = ['Suite', 'Family', 'Studio / Apartment'];
  const realRooms = rooms.filter((r) => r.kind !== 'area');
  const areas = rooms.filter((r) => r.kind === 'area');
  const out = [];
  for (let d = 29; d >= 0; d--) {
    const total = 9 + Math.floor(rnd() * 6);
    for (let i = 0; i < total; i++) {
      const st = staff[Math.floor(rnd() * staff.length)];
      const isArea = areas.length && rnd() < 0.18;
      const sp = isArea ? areas[Math.floor(rnd() * areas.length)] : realRooms[Math.floor(rnd() * realRooms.length)];
      let mins = (isArea ? 15 : speed[st.id]) * (0.7 + rnd() * 0.7);
      if (bigTypes.includes(sp.type)) mins *= 1.35;
      const finished = new Date();
      finished.setDate(finished.getDate() - d);
      finished.setHours(8 + Math.floor(rnd() * 9), Math.floor(rnd() * 60), 0, 0);
      if (finished.getTime() > Date.now() - 15 * 60000) finished.setTime(Date.now() - (15 + Math.floor(rnd() * 240)) * 60000);
      const seconds = Math.round(mins * 60);
      const ok = rnd() < passRate[st.id];
      out.push({
        id: newId(), roomId: sp.id, label: sp.number, kind: sp.kind || 'room', type: sp.type, staffId: st.id, staffName: st.fullName,
        startedAt: new Date(finished.getTime() - seconds * 1000).toISOString(), finishedAt: finished.toISOString(), seconds,
        approvedAt: ok ? new Date(finished.getTime() + 20 * 60000).toISOString() : null, sentBack: !ok
      });
    }
  }
  return out;
}

function seed() {
  const staff = [
    { id: 's1', fullName: 'Emma Clarke', username: 'emma', role: 'housekeeper', active: true, pin: '1234' },
    { id: 's2', fullName: 'Olivia Hughes', username: 'olivia', role: 'housekeeper', active: true, pin: '1234' },
    { id: 's3', fullName: 'Grace Turner', username: 'grace', role: 'housekeeper', active: true, pin: '1234' },
    { id: 's4', fullName: 'Jack Wilson', username: 'jack', role: 'housekeeper', active: true, pin: '1234' },
    { id: 's5', fullName: 'Tom Baker', username: 'tom', role: 'maintenance', active: true, pin: '1234' },
    { id: 's6', fullName: 'Noah Davies', username: 'noah', role: 'maintenance', active: true, pin: '1234' }
  ];
  const room = (number, floor, type, status, assignedTo = null, note = '', kind = 'room') =>
    ({ id: newId(), kind, number, floor, type, status, assignedTo, note, cleanSeconds: 0, cleanRunningSince: null });
  const area = (name, status, assignedTo = null) => room(name, 0, 'Common area', status, assignedTo, '', 'area');
  const rooms = [
    room('101', 1, 'Double', 'Ready'),
    room('102', 1, 'Twin', 'Cleaning', 's2'),
    room('103', 1, 'Suite', 'Occupied'),
    room('104', 1, 'Double', 'Awaiting inspection', 's1'),
    room('105', 1, 'Single', 'Ready'),
    room('106', 1, 'Accessible', 'Out of service'),
    room('108', 1, 'Twin', 'Dirty', 's2'),
    room('118', 1, 'Double', 'Occupied'),
    room('201', 2, 'Suite', 'Dirty', 's1'),
    room('202', 2, 'Double', 'Ready'),
    room('203', 2, 'Twin', 'Occupied'),
    room('204', 2, 'Double', 'Awaiting inspection', 's3'),
    room('205', 2, 'Double', 'Dirty'),
    area('Lobby', 'Ready'),
    area('Breakfast room', 'Dirty'),
    area('Gym', 'Ready'),
    area('Public toilets', 'Cleaning', 's3')
  ];
  const byNumber = (n) => rooms.find((r) => r.number === n);
  const running = byNumber('102'); running.cleanRunningSince = ago(8);
  const done = byNumber('104'); done.cleanSeconds = 26 * 60;
  byNumber('204').cleanSeconds = 31 * 60;
  const issues = [
    { id: newId(), roomId: byNumber('106').id, roomNumber: '106', title: 'Bathroom leak', priority: 'urgent', status: 'open', reportedBy: 'Front desk', createdAt: ago(34), assignedTo: 's5' },
    { id: newId(), roomId: byNumber('118').id, roomNumber: '118', title: 'Air conditioning does not cool', priority: 'high', status: 'in_progress', reportedBy: 'Front desk', createdAt: ago(120), assignedTo: 's5', needsHelp: true,
      notes: [{ id: newId(), author: 'Tom Baker', byStaff: true, body: 'The compressor needs a new part. I cannot fix it today.', createdAt: ago(40) }] },
    { id: newId(), roomId: byNumber('105').id, roomNumber: '105', title: 'Bedside lamp is not working', priority: 'low', status: 'open', reportedBy: 'Emma Clarke', createdAt: ago(300) },
    ...[['201', 'Leaking tap', 'high', 26, 21], ['202', 'TV remote missing', 'low', 20, 19], ['203', 'Door lock jammed', 'urgent', 14, 13], ['104', 'Broken curtain rail', 'normal', 9, 6], ['108', 'Hair dryer not working', 'normal', 5, 4]]
      .map(([num, title, priority, dc, dr]) => ({ id: newId(), roomId: byNumber(num).id, roomNumber: num, title, priority, status: 'resolved', reportedBy: 'Olivia Hughes', createdAt: ago(dc * 1440), resolvedAt: ago(dr * 1440 + 180) }))
  ];
  const activity = [
    { id: newId(), text: 'Cleaning started in room 102', actor: 'Olivia Hughes', createdAt: ago(10) },
    { id: newId(), text: 'Room 204 cleaned, waiting for inspection', actor: 'Grace Turner', createdAt: ago(25) },
    { id: newId(), text: 'Issue reported in room 106: Bathroom leak', actor: 'Front desk', createdAt: ago(34) },
    { id: newId(), text: 'Room 101 marked ready', actor: 'Emma Clarke', createdAt: ago(60) },
    { id: newId(), text: 'Daily task list generated', actor: 'Lodgora', createdAt: ago(100) }
  ];
  // Plano de exemplo: amanhã e depois de amanhã
  const plan = [];
  const put = (n, day, staffId) => plan.push({ id: newId(), roomId: byNumber(n).id, day: dayKey(day), staffId });
  [['101', 's1'], ['103', 's1'], ['105', 's2'], ['202', 's2'], ['203', 's3'], ['Lobby', 's4'], ['Breakfast room', 's4']].forEach(([n, st]) => put(n, 1, st));
  [['101', 's3'], ['118', 's1'], ['204', null], ['Gym', null]].forEach(([n, st]) => put(n, 2, st));
  return { hotel: { id: 'demo', name: 'Northbridge Hotel', code: 'DEMO01' }, managerName: 'Sarah Mitchell', staff, rooms, issues, activity, plan, cleanings: sampleHistory(rooms, staff.filter((s) => s.role === 'housekeeper')) };
}

export function createDemoBackend() {
  let state;
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch { state = null; }
  if (!state || !state.rooms) state = seed();
  if (!state.cleanings) state.cleanings = [];
  if (!state.plan) state.plan = [];

  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => fn());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignora */ } emit(); };
  // Outro separador do mesmo navegador mudou os dados
  window.addEventListener('storage', (e) => {
    if (e.key === KEY && e.newValue) { try { state = JSON.parse(e.newValue); emit(); } catch { /* ignora */ } }
  });

  // Mesmas regras que a base de dados real aplica ao mudar o estado de um quarto
  function applyStatus(r, status) {
    const prev = r.status;
    const nowISO = new Date().toISOString();
    if (status === 'Cleaning' && prev !== 'Cleaning') { r.cleanSeconds = 0; r.cleanRunningSince = nowISO; r.cleanStartedAt = nowISO; }
    else if (prev === 'Cleaning' && status !== 'Cleaning') {
      if (r.cleanRunningSince) r.cleanSeconds = (r.cleanSeconds || 0) + Math.floor((Date.now() - Date.parse(r.cleanRunningSince)) / 1000);
      r.cleanRunningSince = null;
    }
    if (status === 'Dirty' && prev !== 'Dirty') { r.cleanSeconds = 0; r.cleanRunningSince = null; r.cleanStartedAt = null; }
    const open = () => state.cleanings.find((c) => c.roomId === r.id && !c.approvedAt && !c.sentBack);
    if (prev === 'Cleaning' && status === 'Awaiting inspection') {
      const st = state.staff.find((x) => x.id === r.assignedTo);
      state.cleanings.unshift({ id: newId(), roomId: r.id, label: r.number, kind: r.kind || 'room', type: r.type, staffId: r.assignedTo, staffName: st?.fullName || '',
        startedAt: r.cleanStartedAt || nowISO, finishedAt: nowISO, seconds: r.cleanSeconds, approvedAt: null, sentBack: false });
    } else if (prev === 'Awaiting inspection' && status === 'Ready') { const c = open(); if (c) c.approvedAt = nowISO; }
    else if (prev === 'Awaiting inspection' && status === 'Dirty') { const c = open(); if (c) c.sentBack = true; }
    r.status = status;
  }

  // Mesmas regras da base de dados: o plano até hoje passa para a lista de limpeza
  function applyPlan(today) {
    const due = state.plan.filter((p) => p.day <= today).sort((a, b) => (a.day < b.day ? 1 : -1));
    if (!due.length) return 0;
    let n = 0;
    state.rooms.forEach((r) => {
      const mine = due.filter((p) => p.roomId === r.id);
      if (!mine.length || !['Ready', 'Occupied', 'Dirty'].includes(r.status)) return;
      const who = mine.map((p) => state.staff.find((s) => s.id === p.staffId && s.active)).find(Boolean);
      applyStatus(r, 'Dirty');
      if (who) r.assignedTo = who.id;
      n += 1;
    });
    state.plan = state.plan.filter((p) => p.day > today);
    if (n) log(`${n} planned cleaning${n > 1 ? 's' : ''} added to today's list`, 'Lodgora');
    save();
    return n;
  }
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
        return st ? { kind: 'staff', name: st.fullName, hotel: { name: state.hotel.name }, staffId: st.id, role: st.role } : null;
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
        return { kind: 'staff', name: st.fullName, hotel: { name: state.hotel.name }, staffId: st.id, role: st.role };
      },
      async sendPasswordReset() { /* na demonstração não há emails */ },
      recovering() { return typeof location !== 'undefined' && new URLSearchParams(location.search).has('recover'); },
      onRecovery() { return () => {}; },
      async updatePassword() { session.set({ kind: 'manager' }); return managerSession(); },
      async signOut() { session.del(); }
    },

    manager: {
      rooms: {
        async list() { return state.rooms.map((r) => ({ ...r })); },
        async update(id, patch) {
          const r = state.rooms.find((x) => x.id === id);
          if (r) {
            const { status, ...rest } = patch;
            if ('number' in rest && state.rooms.some((x) => x.id !== id && x.number === rest.number)) throw new Error('Another room or area already has that name.');
            if ('number' in rest) state.issues.forEach((i) => { if (i.roomId === id) i.roomNumber = rest.number; });
            Object.assign(r, rest);
            if (status && status !== r.status) applyStatus(r, status);
          }
          save();
        },
        async remove(id) {
          state.rooms = state.rooms.filter((r) => r.id !== id);
          state.plan = state.plan.filter((p) => p.roomId !== id);
          state.issues.forEach((i) => { if (i.roomId === id) i.roomId = null; });
          save();
        },
        async create(list) {
          list.forEach((n) => {
            if (!state.rooms.some((r) => r.number === n.number)) {
              state.rooms.push({ id: newId(), kind: n.kind || 'room', number: n.number, floor: n.floor, type: n.type, status: n.status || 'Ready', assignedTo: null, note: '', cleanSeconds: 0, cleanRunningSince: null });
            }
          });
          state.rooms.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
          save();
        }
      },
      issues: {
        async list() {
          return state.issues.map((i) => {
            const room = state.rooms.find((r) => r.id === i.roomId);
            return { ...i, notes: (i.notes || []).map((n) => ({ ...n })), needsHelp: !!i.needsHelp, resolvedAt: i.resolvedAt || null, roomLabel: room ? (room.kind === 'area' ? room.number : `Room ${room.number}`) : '', roomInline: room ? spaceInline(room) : '' };
          });
        },
        async create({ roomId, title, priority }) {
          const room = state.rooms.find((r) => r.id === roomId);
          state.issues.unshift({ id: newId(), roomId: roomId || null, roomNumber: room?.number || '', title, priority, status: 'open', reportedBy: state.managerName, createdAt: new Date().toISOString() });
          save();
        },
        async setStatus(id, status) {
          const i = state.issues.find((x) => x.id === id);
          if (i) { i.status = status; i.resolvedAt = status === 'resolved' ? new Date().toISOString() : null; if (status === 'resolved') i.needsHelp = false; }
          save();
        },
        async addNote(id, text) {
          const i = state.issues.find((x) => x.id === id);
          if (!i) return;
          const body = String(text).trim();
          if (!body) throw new Error('Write a short note');
          (i.notes = i.notes || []).push({ id: newId(), author: state.managerName, byStaff: false, body: body.slice(0, 500), createdAt: new Date().toISOString() });
          i.needsHelp = false;
          save();
        },
        async assign(id, staffId) {
          const i = state.issues.find((x) => x.id === id);
          if (!i) return;
          if (staffId && !state.staff.some((s) => s.id === staffId && s.role === 'maintenance')) throw new Error('Choose someone from the maintenance team.');
          i.assignedTo = staffId || null;
          i.needsHelp = false;
          save();
        }
      },
      staff: {
        async list() { return state.staff.map((s) => ({ ...s })); },
        async create({ fullName, username, pin, role = 'housekeeper' }) {
          const u = String(username).trim().toLowerCase();
          if (fullName.trim().length < 2) throw new Error('Enter the full name');
          if (!/^[a-z0-9._-]{2,20}$/.test(u)) throw new Error('Username must have 2 to 20 letters, numbers, dots or dashes');
          if (!/^[0-9]{4}$/.test(pin)) throw new Error('The PIN must have exactly 4 digits');
          if (state.staff.some((s) => s.username === u)) throw new Error('That username is already used');
          state.staff.push({ id: newId(), fullName: fullName.trim(), username: u, role: role === 'maintenance' ? 'maintenance' : 'housekeeper', active: true, pin });
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
          if (!active) {
            state.rooms.forEach((r) => { if (r.assignedTo === id) r.assignedTo = null; });
            state.issues.forEach((i) => { if (i.assignedTo === id && i.status !== 'resolved') i.assignedTo = null; });
          }
          save();
        }
      },
      plan: {
        async list(fromDay) { return state.plan.filter((p) => p.day >= fromDay).map((p) => ({ ...p })); },
        async set(list) {
          list.forEach((n) => {
            const old = state.plan.find((p) => p.roomId === n.roomId && p.day === n.day);
            if (old) old.staffId = n.staffId || null;
            else state.plan.push({ id: newId(), roomId: n.roomId, day: n.day, staffId: n.staffId || null });
          });
          save();
        },
        async clear(list) {
          state.plan = state.plan.filter((p) => !list.some((n) => n.roomId === p.roomId && n.day === p.day));
          save();
        },
        async apply(today) { return applyPlan(today); }
      },
      activity: {
        async list() { return state.activity.slice(0, 30).map((a) => ({ ...a })); },
        async add(text) { log(text, state.managerName); save(); }
      },
      cleanings: {
        async list(sinceISO) { return state.cleanings.filter((c) => c.finishedAt >= sinceISO).map((c) => ({ ...c })); }
      },
      subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb); }
    },

    staff: {
      async rooms() {
        const s = needMe();
        return state.rooms.filter((r) => r.assignedTo === s.id).map(({ id, kind, number, floor, type, status, note, cleanSeconds, cleanRunningSince }) => ({ id, kind: kind || 'room', number, floor, type, status, note, cleanSeconds: cleanSeconds || 0, cleanRunningSince: cleanRunningSince || null }));
      },
      async setStatus(roomId, status) {
        const s = needMe();
        const r = state.rooms.find((x) => x.id === roomId && x.assignedTo === s.id);
        if (!r) throw new Error('Room not found');
        const allowed = (r.status === 'Dirty' && status === 'Cleaning') || (r.status === 'Cleaning' && (status === 'Awaiting inspection' || status === 'Dirty'));
        if (!allowed) throw new Error('That change is not allowed');
        applyStatus(r, status);
        const took = r.cleanSeconds < 60 ? 'under 1 min' : `${Math.round(r.cleanSeconds / 60)} min`;
        const name = spaceInline(r);
        const cap = name.charAt(0).toUpperCase() + name.slice(1);
        log(status === 'Cleaning' ? `Cleaning started in ${name}`
          : status === 'Awaiting inspection' ? `${cap} cleaned in ${took}, waiting for inspection`
          : `${cap} put back on the cleaning list`, s.fullName);
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
      async issues() {
        const s = needMe();
        const limit = Date.now() - 3 * 86400000;
        const order = { urgent: 0, high: 1, normal: 2, low: 3 };
        return state.issues
          .filter((i) => i.assignedTo === s.id && (i.status !== 'resolved' || Date.parse(i.resolvedAt) > limit))
          .map((i) => { const r = state.rooms.find((x) => x.id === i.roomId); return { id: i.id, title: i.title, priority: i.priority, status: i.status, reportedBy: i.reportedBy, createdAt: i.createdAt, resolvedAt: i.resolvedAt || null, roomId: i.roomId, needsHelp: !!i.needsHelp, notes: (i.notes || []).slice(-20).map((n) => ({ ...n })), roomLabel: r ? (r.kind === 'area' ? r.number : `Room ${r.number}`) : '' }; })
          .sort((a, b) => (a.status === 'resolved') - (b.status === 'resolved') || order[a.priority] - order[b.priority] || a.createdAt.localeCompare(b.createdAt));
      },
      async setIssueStatus(issueId, status) {
        const s = needMe();
        const i = state.issues.find((x) => x.id === issueId && x.assignedTo === s.id);
        if (!i) throw new Error('Issue not found');
        if (!['open', 'in_progress', 'resolved'].includes(status)) throw new Error('That change is not allowed');
        i.status = status;
        i.resolvedAt = status === 'resolved' ? new Date().toISOString() : null;
        if (status === 'resolved') i.needsHelp = false;
        const r = state.rooms.find((x) => x.id === i.roomId);
        log(`${status === 'resolved' ? 'Issue resolved' : status === 'in_progress' ? 'Work started' : 'Issue reopened'}${r ? ' in ' + spaceInline(r) : ''}: ${i.title}`, s.fullName);
        save();
      },
      async addIssueNote(issueId, text, cannotFix = false) {
        const s = needMe();
        const i = state.issues.find((x) => x.id === issueId && x.assignedTo === s.id);
        if (!i) throw new Error('Issue not found');
        const body = String(text || '').trim();
        if (!body) throw new Error('Write a short note');
        if (body.length > 500) throw new Error('Use 500 characters or fewer');
        (i.notes = i.notes || []).push({ id: newId(), author: s.fullName, byStaff: true, body, createdAt: new Date().toISOString() });
        if (cannotFix && i.status !== 'resolved') i.needsHelp = true;
        const r = state.rooms.find((x) => x.id === i.roomId);
        log(`${cannotFix ? 'Needs help' : 'Note added'}${r ? ' in ' + spaceInline(r) : ''}: ${i.title}`, s.fullName);
        save();
      },
      async roomList() { needMe(); return state.rooms.map((r) => ({ id: r.id, kind: r.kind || 'room', number: r.number })); },
      async applyPlan(today) { needMe(); return applyPlan(today); },
      async reportIssue(roomId, title, priority) {
        const s = needMe();
        if (title.trim().length < 3) throw new Error('Describe the problem');
        const r = state.rooms.find((x) => x.id === roomId);
        state.issues.unshift({ id: newId(), roomId: r?.id || null, roomNumber: r?.number || '', title: title.trim(), priority, status: 'open', reportedBy: s.fullName, createdAt: new Date().toISOString() });
        log(`Issue reported${r ? ' in ' + spaceInline(r) : ''}: ${title.trim()}`, s.fullName);
        save();
      }
    }
  };
}
