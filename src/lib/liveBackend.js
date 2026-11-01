// Ligação à base de dados real (Supabase).
// Todos os dados passam por aqui. O resto da aplicação não sabe que existe Supabase.
import { createClient } from '@supabase/supabase-js';

const STAFF_KEY = 'lodgora-staff-session';
const PENDING_KEY = 'lodgora-pending-hotel';

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignora */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignora */ } }
};

// Lança erro legível quando o Supabase devolve erro
function check({ data, error }) {
  if (error) throw new Error(error.message || 'Something went wrong');
  return data;
}

const toRoom = (r) => ({
  id: r.id, kind: r.kind || 'room', number: r.number, floor: r.floor, type: r.type, status: r.status,
  assignedTo: r.assigned_to || null, note: r.note || '',
  cleanSeconds: r.clean_seconds || 0, cleanRunningSince: r.clean_running_since || null
});
const toIssue = (i) => ({
  id: i.id, roomId: i.room_id, roomNumber: i.room?.number || '',
  roomLabel: i.room ? (i.room.kind === 'area' ? i.room.number : `Room ${i.room.number}`) : '',
  roomInline: i.room ? (i.room.kind === 'area' ? i.room.number : `room ${i.room.number}`) : '',
  title: i.title, priority: i.priority, status: i.status, reportedBy: i.reported_by,
  createdAt: i.created_at, resolvedAt: i.resolved_at || null
});
const toCleaning = (c) => ({
  id: c.id, roomId: c.room_id, label: c.label, kind: c.kind, type: c.type, staffId: c.staff_id,
  staffName: c.staff_name || '', startedAt: c.started_at, finishedAt: c.finished_at, seconds: c.seconds,
  approvedAt: c.approved_at, sentBack: !!c.sent_back
});
const toStaff = (s) => ({
  id: s.id, fullName: s.full_name, username: s.username, role: s.role, active: s.active,
  pin: s.pin_display || null
});

export function createLiveBackend(url, key) {
  const supabase = createClient(url, key);
  // O link do email de recuperação abre /app com "type=recovery". Nesse caso pedimos uma nova password antes de entrar.
  let recovering = typeof location !== 'undefined' && /(^|[#&?])type=recovery/.test(location.hash + location.search);
  const recoveryListeners = new Set();
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') { recovering = true; recoveryListeners.forEach((fn) => fn()); }
  });
  let hotelId = null;
  let managerName = '';

  async function loadManager() {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return null;
    const { data: row, error } = await supabase
      .from('managers')
      .select('full_name, hotel:hotels(id, name, code)')
      .eq('user_id', uid)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    hotelId = row.hotel.id;
    managerName = row.full_name;
    return { kind: 'manager', name: row.full_name, hotel: row.hotel };
  }

  // Cria o hotel guardado durante o registo (necessário quando o Supabase pede confirmação por email)
  async function completePending() {
    const pending = store.get(PENDING_KEY);
    if (!pending) return null;
    check(await supabase.rpc('create_hotel', { p_hotel_name: pending.hotelName, p_full_name: pending.fullName }));
    store.del(PENDING_KEY);
    return loadManager();
  }

  const token = () => store.get(STAFF_KEY)?.token;

  return {
    mode: 'live',

    auth: {
      async getSession() {
        const m = await loadManager();
        if (m) return m;
        const st = store.get(STAFF_KEY);
        if (st?.token) {
          const { data, error } = await supabase.rpc('staff_me', { p_token: st.token });
          if (!error && data) {
            return { kind: 'staff', name: data.full_name, hotel: { name: data.hotel_name }, staffId: data.staff_id };
          }
          store.del(STAFF_KEY);
        }
        return null;
      },

      async signInManager(email, password) {
        check(await supabase.auth.signInWithPassword({ email, password }));
        const session = (await loadManager()) || (await completePending());
        if (!session) throw new Error('This account has no hotel yet. Use "Create hotel account" to set one up.');
        return session;
      },

      async signUpManager({ email, password, hotelName, fullName }) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw new Error(error.message);
        store.set(PENDING_KEY, { hotelName, fullName });
        if (!data.session) return { needsConfirmation: true };
        return completePending();
      },

      async signInStaff({ hotelCode, username, pin }) {
        const data = check(await supabase.rpc('staff_login', { p_hotel_code: hotelCode, p_username: username, p_pin: pin }));
        if (data.error) throw new Error(data.error);
        store.set(STAFF_KEY, { token: data.token });
        return { kind: 'staff', name: data.full_name, hotel: { name: data.hotel_name }, staffId: data.staff_id };
      },

      async sendPasswordReset(email) {
        check(await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/app` }));
      },
      recovering() { return recovering; },
      onRecovery(fn) { recoveryListeners.add(fn); return () => recoveryListeners.delete(fn); },
      async updatePassword(password) {
        check(await supabase.auth.updateUser({ password }));
        recovering = false;
        try { history.replaceState(null, '', '/app'); } catch { /* ignora */ }
        const session = await loadManager();
        if (!session) throw new Error('Your password was changed, but this account has no hotel yet. Sign in and create one.');
        return session;
      },

      async signOut() {
        store.del(STAFF_KEY);
        hotelId = null;
        await supabase.auth.signOut();
      }
    },

    manager: {
      rooms: {
        async list() {
          const rows = check(await supabase.from('rooms')
            .select('id, kind, number, floor, type, status, assigned_to, note, clean_seconds, clean_running_since').order('number'));
          return rows.map(toRoom);
        },
        async update(id, patch) {
          const dbPatch = {};
          if ('status' in patch) dbPatch.status = patch.status;
          if ('assignedTo' in patch) dbPatch.assigned_to = patch.assignedTo;
          if ('note' in patch) dbPatch.note = patch.note;
          if ('type' in patch) dbPatch.type = patch.type;
          if ('floor' in patch) dbPatch.floor = patch.floor;
          if ('number' in patch) dbPatch.number = patch.number;
          const { error } = await supabase.from('rooms').update(dbPatch).eq('id', id);
          if (error) throw new Error(error.code === '23505' ? 'Another room or area already has that name.' : error.message);
        },
        async remove(id) {
          check(await supabase.from('rooms').delete().eq('id', id));
        },
        async create(list) {
          const rows = list.map((r) => ({ hotel_id: hotelId, number: r.number, floor: r.floor, type: r.type, kind: r.kind || 'room', status: r.status || 'Ready' }));
          // Salta números que já existem
          check(await supabase.from('rooms').upsert(rows, { onConflict: 'hotel_id,number', ignoreDuplicates: true }));
        }
      },

      issues: {
        async list() {
          const rows = check(await supabase.from('issues')
            .select('id, room_id, title, priority, status, reported_by, created_at, resolved_at, room:rooms(number, kind)')
            .order('created_at', { ascending: false }).limit(200));
          return rows.map(toIssue);
        },
        async create({ roomId, title, priority }) {
          check(await supabase.from('issues').insert({
            hotel_id: hotelId, room_id: roomId || null, title, priority, reported_by: managerName
          }));
        },
        async setStatus(id, status) {
          check(await supabase.from('issues').update({ status }).eq('id', id));
        }
      },

      // Histórico de limpezas terminadas (alimenta as estatísticas)
      cleanings: {
        async list(sinceISO) {
          const rows = check(await supabase.from('cleaning_log')
            .select('id, room_id, label, kind, type, staff_id, staff_name, started_at, finished_at, seconds, approved_at, sent_back')
            .gte('finished_at', sinceISO).order('finished_at', { ascending: false }).limit(5000));
          return rows.map(toCleaning);
        }
      },

      staff: {
        async list() {
          const rows = check(await supabase.from('staff')
            .select('id, full_name, username, role, active, pin_display').order('full_name'));
          return rows.map(toStaff);
        },
        async create({ fullName, username, pin }) {
          check(await supabase.rpc('manager_create_staff', {
            p_full_name: fullName, p_username: username, p_pin: pin, p_role: 'housekeeper'
          }));
        },
        async setPin(id, pin) { check(await supabase.rpc('manager_set_staff_pin', { p_staff_id: id, p_pin: pin })); },
        async setActive(id, active) { check(await supabase.rpc('manager_set_staff_active', { p_staff_id: id, p_active: active })); }
      },

      activity: {
        async list() {
          const rows = check(await supabase.from('activity')
            .select('id, text, actor, created_at').order('created_at', { ascending: false }).limit(30));
          return rows.map((a) => ({ id: a.id, text: a.text, actor: a.actor, createdAt: a.created_at }));
        },
        async add(text) {
          check(await supabase.from('activity').insert({ hotel_id: hotelId, text, actor: managerName }));
        }
      },

      // Avisa quando algo muda (tempo real). Devolve uma função para parar de ouvir.
      subscribe(callback) {
        const channel = supabase.channel('hotel-' + Math.random().toString(36).slice(2));
        ['rooms', 'issues', 'activity'].forEach((table) =>
          channel.on('postgres_changes', { event: '*', schema: 'public', table }, callback));
        channel.subscribe();
        return () => { supabase.removeChannel(channel); };
      }
    },

    staff: {
      async rooms() {
        return check(await supabase.rpc('staff_rooms', { p_token: token() }));
      },
      async setStatus(roomId, status) {
        check(await supabase.rpc('staff_set_room_status', { p_token: token(), p_room_id: roomId, p_status: status }));
      },
      async timer(roomId, action) {
        check(await supabase.rpc('staff_clean_timer', { p_token: token(), p_room_id: roomId, p_action: action }));
      },
      async reportIssue(roomId, title, priority) {
        check(await supabase.rpc('staff_report_issue', { p_token: token(), p_room_id: roomId || null, p_title: title, p_priority: priority }));
      }
    }
  };
}
