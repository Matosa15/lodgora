// Painel do gerente: dashboard, quartos, inspeções, avarias, equipa e definições.
import { useMemo, useState } from 'react';
import { backend } from '../lib/backend';
import { useHotelData } from '../lib/useHotelData';
import {
  AREA_PRESETS, AREA_TYPE, ISSUE_STATUS_LABEL, PRIORITY_STYLE, ROOM_TYPES, STATUSES, STATUS_STYLE, areaLabel, initials, isArea, minutesLabel, priorityLabel, spaceInline, spaceName, statusLabel, timeAgo, timeOfDay, tidyName, tidyTitle, typeLabel
} from '../lib/constants';
import { t, LANG } from '../lib/i18n';
import { tErr } from '../lib/errors';

// roomLabel vem do servidor em inglês ("Room 101")
const roomLabelText = (l) => (LANG === 'fi' && l ? l.replace(/^Room (.+)$/, 'Huone $1') : l);
import {
  CleanTimer, CopyButton, EmptyState, Field, Icon, LogoMark, Modal, Panel, Spinner, StatusBadge, WherePicker, IssueNotes, NoteBox,
  LangSwitch, btnGhost, btnPrimary, btnSmall, inputCls, useToast,
  CleanTag
} from '../components/ui';
import Statistics from './Statistics';
import Planner from './Planner';

const PAGE_LABEL = {
  Dashboard: t('Dashboard', 'Yleisnäkymä'), Rooms: t('Rooms & areas', 'Huoneet ja tilat'), Planner: t('Planner', 'Suunnittelu'),
  Inspections: t('Inspections', 'Tarkastukset'), Maintenance: t('Maintenance', 'Huolto'), Statistics: t('Statistics', 'Tilastot'),
  Team: t('Team', 'Tiimi'), Settings: t('Settings', 'Asetukset')
};
const NAV = [
  { group: t('Main', 'Päävalikko'), items: [
    { name: 'Dashboard', icon: 'dashboard' },
    { name: 'Rooms', label: PAGE_LABEL.Rooms, icon: 'bed', badge: 'rooms' },
    { name: 'Planner', icon: 'calendar' },
    { name: 'Inspections', icon: 'inspect', badge: 'inspection' },
    { name: 'Maintenance', icon: 'wrench', badge: 'issues', alert: true }
  ] },
  { group: t('Management', 'Hallinta'), items: [{ name: 'Statistics', icon: 'chart' }, { name: 'Team', icon: 'users' }] },
  { group: t('Settings', 'Asetukset'), items: [{ name: 'Settings', icon: 'settings' }] }
];

export default function Manager({ session, signOut }) {
  const toast = useToast();
  const d = useHotelData(backend);
  const m = backend.manager;

  const [page, setPage] = useState('Dashboard');
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [kindFilter, setKindFilter] = useState('all'); // all | room | area

  const staffById = useMemo(() => Object.fromEntries(d.staff.map((s) => [s.id, s])), [d.staff]);
  const rooms = useMemo(() => d.rooms.map((r) => ({ ...r, assignee: staffById[r.assignedTo]?.fullName || '' })), [d.rooms, staffById]);
  const housekeepers = d.staff.filter((s) => s.active && s.role === 'housekeeper');
  const technicians = d.staff.filter((s) => s.active && s.role === 'maintenance').sort((a, b) => a.fullName.localeCompare(b.fullName));
  const openIssues = d.issues.filter((i) => i.status !== 'resolved');
  const count = (s) => rooms.filter((r) => r.status === s).length;
  const onlyRooms = rooms.filter((r) => !isArea(r));
  const hasAreas = rooms.some(isArea);
  const stats = {
    total: onlyRooms.length,
    spaces: rooms.length,
    ready: onlyRooms.filter((r) => r.status === 'Ready').length,
    cleaning: count('Dirty') + count('Cleaning'),
    inspection: count('Awaiting inspection') + rooms.filter((r) => r.sentBack && ['Dirty', 'Cleaning'].includes(r.status)).length,
    issues: openIssues.length
  };
  const badges = { rooms: stats.spaces, inspection: stats.inspection, issues: stats.issues };

  const q = search.trim().toLowerCase();
  const has = (...parts) => !q || parts.join(' ').toLowerCase().includes(q);
  const fRooms = rooms.filter((r) => (kindFilter === 'all' || (kindFilter === 'area') === isArea(r)) && has(r.number, r.type, statusLabel(r.status), r.assignee));
  const fIssues = d.issues.filter((i) => has(i.title, i.roomNumber, i.roomLabel, i.reportedBy));
  const fStaff = d.staff.filter((s) => has(s.fullName, s.username));
  const fActivity = d.activity.filter((a) => has(a.text, a.actor));

  // Executa uma ação, atualiza os dados e mostra o resultado
  const act = async (fn, okMessage) => {
    try { await fn(); await d.reload(); if (okMessage) toast(okMessage); return true; }
    catch (e) { toast(tErr(e.message) || t('Something went wrong', 'Jokin meni pieleen'), 'error'); return false; }
  };

  const actions = {
    setStatus: (room, status, msg) => act(async () => {
      await m.rooms.update(room.id, { status });
      await m.activity.add(msg || t(`${spaceName(room)} marked ${statusLabel(status).toLowerCase()}`, `${spaceName(room)}: tilaksi merkitty ${statusLabel(status).toLowerCase()}`));
    }, `${spaceName(room)}: ${statusLabel(status)}`),
    approve: (room) => actions.setStatus(room, 'Ready', t(`${spaceName(room)} approved`, `${spaceName(room)} hyväksytty`)),
    // Palauttaa huoneen siivottavaksi; jos esimies kirjoitti viestin, se näkyy siivoojalle
    sendBack: (room, note) => act(async () => {
      if (note && note.trim()) await m.rooms.addNote(room.id, note.trim());
      await m.rooms.update(room.id, { status: 'Dirty' });
      await m.activity.add(t(`${spaceName(room)} sent back for cleaning`, `${spaceName(room)} palautettu siivottavaksi`));
    }, `${spaceName(room)}: ${statusLabel('Dirty')}`),
    addRoomNote: async (room, text) => { await m.rooms.addNote(room.id, text); await d.reload(); },
    rename: async (room, name) => {
      const number = name.trim().replace(/\s+/g, ' ');
      if (!number) return t('Enter a name.', 'Anna nimi.');
      if (number.length > 40) return t('Use 40 characters or fewer.', 'Käytä enintään 40 merkkiä.');
      if (number === room.number) return null;
      if (rooms.some((r) => r.id !== room.id && r.number.toLowerCase() === number.toLowerCase())) return t('Another room or area already has that name.', 'Toisella huoneella tai tilalla on jo tämä nimi.');
      const before = spaceName(room);
      try {
        await m.rooms.update(room.id, { number });
        await m.activity.add(t(`${before} renamed to ${isArea(room) ? number : 'Room ' + number}`, `${before} nimetty uudelleen: ${isArea(room) ? number : 'Huone ' + number}`));
        await d.reload();
        toast(t('Name changed', 'Nimi vaihdettu'));
        return null;
      } catch (e) { return tErr(e.message); }
    },
    remove: async (room) => {
      const ok = await act(async () => {
        await m.rooms.remove(room.id);
        await m.activity.add(t(`${spaceName(room)} deleted`, `${spaceName(room)} poistettu`));
      }, t(`${spaceName(room)} deleted`, `${spaceName(room)} poistettu`));
      if (ok) setModal(null);
    },
    setDetails: (room, patch) => act(() => m.rooms.update(room.id, patch), t(`${spaceName(room)} updated`, `${spaceName(room)} päivitetty`)),
    assign: (room, staffId) => act(async () => {
      await m.rooms.update(room.id, { assignedTo: staffId || null });
      await m.activity.add(staffId ? t(`${spaceName(room)} assigned to ${staffById[staffId].fullName}`, `${spaceName(room)} annettu henkilölle ${staffById[staffId].fullName}`) : t(`${spaceName(room)} unassigned`, `${spaceName(room)}: tekijä poistettu`));
    }, staffId ? t(`${spaceName(room)} assigned to ${staffById[staffId].fullName}`, `${spaceName(room)} annettu henkilölle ${staffById[staffId].fullName}`) : t(`${spaceName(room)} unassigned`, `${spaceName(room)}: tekijä poistettu`)),
    // Rotina diária das partes comuns: põe-nas todas na lista de limpeza
    requestAreaCleaning: async () => {
      const todo = rooms.filter((r) => isArea(r) && r.status === 'Ready');
      if (!todo.length) { toast(t('No common area is ready to be cleaned again.', 'Mikään yleinen tila ei ole valmis uuteen siivoukseen.')); return; }
      await act(async () => {
        for (const r of todo) await m.rooms.update(r.id, { status: 'Dirty' });
        await m.activity.add(t(`${todo.length} common area${todo.length > 1 ? 's' : ''} put on the cleaning list`, `${todo.length} yleistä tilaa lisätty siivouslistalle`));
      }, t(`${todo.length} common area${todo.length > 1 ? 's' : ''} need cleaning`, `${todo.length} yleistä tilaa odottaa siivousta`));
    },
    distribute: async () => {
      if (!housekeepers.length) { toast(t('Add housekeepers in Team first.', 'Lisää ensin siivoojat Tiimi-sivulla.'), 'error'); return; }
      const todo = rooms.filter((r) => r.status === 'Dirty' && !r.assignedTo);
      if (!todo.length) { toast(t('Everything that needs cleaning already has someone assigned.', 'Kaikilla siivottavilla kohteilla on jo tekijä.')); return; }
      const load = Object.fromEntries(housekeepers.map((s) => [s.id,
        rooms.filter((r) => r.assignedTo === s.id && (r.status === 'Dirty' || r.status === 'Cleaning')).length]));
      await act(async () => {
        for (const r of todo) {
          const best = housekeepers.reduce((a, b) => (load[b.id] < load[a.id] ? b : a));
          await m.rooms.update(r.id, { assignedTo: best.id });
          load[best.id] += 1;
        }
        await m.activity.add(t(`${todo.length} cleaning task${todo.length > 1 ? 's' : ''} assigned automatically`, `${todo.length} siivoustehtävää jaettu automaattisesti`));
      }, t(`${todo.length} task${todo.length > 1 ? 's' : ''} assigned`, `${todo.length} tehtävää jaettu`));
    },
    // Planeamento (não enche a atividade com ruído: só se regista quando o plano entra na lista)
    planSet: (list, msg) => act(() => m.plan.set(list), msg),
    planClear: (list, msg) => act(() => m.plan.clear(list), msg),
    addRooms: (list) => {
      const text = isArea(list[0])
        ? t(`${list.length} common area${list.length > 1 ? 's' : ''} added`, `${list.length} yleistä tilaa lisätty`)
        : t(`${list.length} room${list.length > 1 ? 's' : ''} added`, `${list.length} ${list.length > 1 ? 'huonetta' : 'huone'} lisätty`);
      return act(async () => { await m.rooms.create(list); await m.activity.add(text); }, text);
    },
    createIssue: (issue) => act(async () => {
      await m.issues.create(issue);
      const room = rooms.find((r) => r.id === issue.roomId);
      await m.activity.add(t(`Issue reported${room ? ' in ' + spaceInline(room) : ''}: ${issue.title}`, `Vika ilmoitettu${room ? ': ' + spaceInline(room) : ''}: ${issue.title}`));
    }, t('Issue reported', 'Vika ilmoitettu')),
    setIssueStatus: (issue, status) => act(async () => {
      await m.issues.setStatus(issue.id, status);
      if (status === 'resolved') await m.activity.add(t(`Issue resolved${issue.roomInline ? ' in ' + issue.roomInline : ''}: ${issue.title}`, `Vika korjattu${issue.roomInline ? ': ' + issue.roomInline : ''}: ${issue.title}`));
    }, status === 'resolved' ? t('Issue resolved', 'Vika korjattu') : t('Issue updated', 'Vika päivitetty')),
    assignIssue: (issue, staffId) => act(async () => {
      await m.issues.assign(issue.id, staffId || null);
      await m.activity.add(staffId ? t(`"${issue.title}" assigned to ${staffById[staffId].fullName}`, `"${issue.title}" annettu henkilölle ${staffById[staffId].fullName}`) : t(`"${issue.title}" unassigned`, `"${issue.title}": tekijä poistettu`));
    }, staffId ? t(`Assigned to ${staffById[staffId].fullName}`, `Annettu henkilölle ${staffById[staffId].fullName}`) : t('Unassigned', 'Tekijä poistettu')),
    addIssueNote: async (issue, text) => { await m.issues.addNote(issue.id, text); await d.reload(); toast(t('Note sent', 'Viesti lähetetty')); },
    createStaff: async (s) => { try { await m.staff.create(s); await d.reload(); return null; } catch (e) { return tErr(e.message); } },
    setPin: async (id, pin) => { try { await m.staff.setPin(id, pin); toast(t('PIN changed', 'PIN-koodi vaihdettu')); return null; } catch (e) { return tErr(e.message); } },
    setActive: (s, active) => act(() => m.staff.setActive(s.id, active), active ? t(`${s.fullName} can sign in again`, `${s.fullName} voi taas kirjautua`) : t(`${s.fullName} can no longer sign in`, `${s.fullName} ei voi enää kirjautua`))
  };

  const pageTitle = PAGE_LABEL[page] || page;
  const go = (p) => { setPage(p); setMenuOpen(false); window.scrollTo(0, 0); };
  const roomModal = modal?.type === 'room' ? rooms.find((r) => r.id === modal.id) : null;

  let body;
  if (d.status === 'loading') body = <Spinner label={t('Loading your hotel', 'Ladataan hotellia')} />;
  else if (d.status === 'error') {
    body = (
      <Panel title={t('We could not load your hotel', 'Hotellin lataus epäonnistui')}>
        <EmptyState icon="alert" title={t('Connection problem', 'Yhteysongelma')} text={tErr(d.error)}>
          <button className={btnPrimary} onClick={d.reload}>{t('Try again', 'Yritä uudelleen')}</button>
        </EmptyState>
      </Panel>
    );
  } else if (page === 'Dashboard') {
    body = (
      <Dashboard stats={stats} rooms={fRooms} allRooms={rooms} hasAreas={hasAreas} kindFilter={kindFilter} setKindFilter={setKindFilter} staff={d.staff} issues={openIssues} activity={fActivity}
        search={search} statusFilter={statusFilter} setStatusFilter={setStatusFilter} go={go} hotel={session.hotel}
        openRoom={(id) => setModal({ type: 'room', id })} actions={actions} setModal={setModal} />
    );
  } else if (page === 'Rooms') {
    body = (
      <ReadinessPanel title={t('Rooms and common areas', 'Huoneet ja yleiset tilat')} subtitle={t(`${stats.total} room${stats.total === 1 ? '' : 's'}${hasAreas ? ` and ${stats.spaces - stats.total} common area${stats.spaces - stats.total === 1 ? '' : 's'}` : ''}`, `${stats.total} ${stats.total === 1 ? 'huone' : 'huonetta'}${hasAreas ? ` ja ${stats.spaces - stats.total} yleistä tilaa` : ''}`)} rooms={fRooms} search={search}
        hasAreas={hasAreas} kindFilter={kindFilter} setKindFilter={setKindFilter} onRequestAreas={actions.requestAreaCleaning}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter} openRoom={(id) => setModal({ type: 'room', id })}
        onAdd={() => setModal({ type: 'addRooms' })} onDistribute={actions.distribute} showAddWhenEmpty />
    );
  } else if (page === 'Planner') {
    body = <Planner rooms={rooms} plan={d.plan} staff={d.staff} search={search} onSet={actions.planSet} onClear={actions.planClear} onAddRooms={() => setModal({ type: 'addRooms' })} />;
  } else if (page === 'Inspections') {
    body = <Inspections rooms={fRooms.filter((r) => r.status === 'Awaiting inspection' || (r.sentBack && ['Dirty', 'Cleaning'].includes(r.status)))} actions={actions} />;
  } else if (page === 'Maintenance') {
    body = <Maintenance issues={fIssues} technicians={technicians} staffById={staffById} onReport={() => setModal({ type: 'issue' })} onAddTech={() => setModal({ type: 'staff', role: 'maintenance' })} actions={actions} />;
  } else if (page === 'Statistics') {
    body = <Statistics rooms={rooms} issues={d.issues} />;
  } else if (page === 'Team') {
    body = <Team staff={fStaff} rooms={rooms} issues={d.issues} hotel={session.hotel} setModal={setModal} actions={actions} />;
  } else {
    body = <SettingsPage session={session} signOut={signOut} />;
  }

  const subtitle = {
    Dashboard: t("Here is your hotel's operational overview for today.", 'Tässä hotellisi päivän tilanne.'),
    Rooms: t('Every room and common area, and who is cleaning it.', 'Kaikki huoneet ja yleiset tilat sekä se, kuka niitä siivoaa.'),
    Planner: t('Plan the next 7 days of cleaning.', 'Suunnittele seuraavien 7 päivän siivous.'),
    Statistics: t('How your team is doing: cleaning times, quality and maintenance.', 'Miten tiimisi pärjää: siivousajat, laatu ja huolto.'),
    Inspections: t('Rooms and areas that were cleaned and need your approval.', 'Siivotut huoneet ja tilat, jotka odottavat hyväksyntääsi.'),
    Maintenance: t('Problems reported by your team, and who is fixing them.', 'Tiimisi ilmoittamat viat ja se, kuka niitä korjaa.'),
    Team: t('Your housekeepers, your maintenance team and how they sign in.', 'Siivoojasi, huoltotiimisi ja heidän kirjautumisensa.'),
    Settings: t('Your hotel and your account.', 'Hotellisi ja tilisi.')
  }[page];

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      {/* Barra lateral */}
      <aside className={`fixed inset-y-0 left-0 w-60 bg-white flex flex-col z-40 transition-transform lg:translate-x-0 ${menuOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'}`} aria-label={t('Main navigation', 'Päävalikko')}>
        <div className="h-16 flex items-center gap-2.5 px-6 pt-safe">
          <LogoMark />
          <span className="font-bold text-xl tracking-tight text-[#0B0B0F]">Lodgora</span>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {NAV.map((g) => (
            <div key={g.group}>
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">{g.group}</p>
              <nav className="space-y-1">
                {g.items.map((it) => {
                  const active = page === it.name;
                  const n = it.badge ? badges[it.badge] : null;
                  return (
                    <button key={it.name} onClick={() => go(it.name)} aria-current={active ? 'page' : undefined}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-sm font-medium transition-colors ${active ? 'bg-[#0B0B0F] text-white' : 'text-slate-600 hover:bg-[#F4F5F7]'}`}>
                      <span className="flex items-center gap-3"><Icon name={it.icon} className={`w-[18px] h-[18px] ${active ? 'text-[#19A7A1]' : ''}`} />{it.label || PAGE_LABEL[it.name]}</span>
                      {n !== null && n > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full tabular-nums ${active ? 'bg-white/20 text-white' : it.alert ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>{n}</span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-100">
          <div className="bg-[#F4F5F7] p-3 rounded-2xl">
            <p className="text-xs font-semibold text-[#0B0B0F] truncate">{session.hotel.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t('Hotel code', 'Hotellin koodi')} <span className="font-mono font-semibold">{session.hotel.code}</span></p>
            {backend.mode === 'demo' && <p className="text-[11px] text-amber-700 mt-1">{t('Demo data', 'Demotiedot')}</p>}
          </div>
        </div>
      </aside>
      {menuOpen && <div className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden" onClick={() => setMenuOpen(false)}></div>}

      <div className="lg:ml-60 min-w-0">
        <header className="sticky top-0 z-20 bg-white pt-safe">
          <div className="h-16 flex items-center gap-3 px-4 sm:px-8">
            <button onClick={() => setMenuOpen(true)} aria-label={t('Open menu', 'Avaa valikko')} className="lg:hidden w-9 h-9 rounded-full bg-[#F4F5F7] flex items-center justify-center text-slate-600">
              <Icon name="menu" />
            </button>
            <nav aria-label={t('Breadcrumb', 'Polku')} className="hidden md:flex items-center gap-3 whitespace-nowrap text-sm">
              <span className="font-medium text-slate-400">{session.hotel.name}</span><span className="text-slate-300">/</span>
              <span className="font-semibold text-[#0B0B0F]">{pageTitle}</span>
            </nav>
            <div className="flex items-center gap-3 ml-auto min-w-0">
              <div className="relative min-w-0">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Icon name="search" className="w-4 h-4" /></span>
                <label htmlFor="search" className="sr-only">{t('Search rooms, issues and team', 'Hae huoneita, vikoja ja tiimiä')}</label>
                <input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Search rooms, staff…', 'Hae huoneita, henkilöitä…')}
                  className="w-full sm:w-64 pl-9 pr-8 py-2 bg-[#F4F5F7] border-2 border-transparent rounded-full text-sm focus:outline-none focus:bg-white focus:border-[#0B0B0F]" />
                {search && (
                  <button onClick={() => setSearch('')} aria-label={t('Clear search', 'Tyhjennä haku')} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                    <Icon name="x" className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button className={`${btnPrimary} hidden sm:inline-flex`} onClick={() => setModal({ type: 'issue' })}><Icon name="plus" className="w-4 h-4" />{t('Report issue', 'Ilmoita vika')}</button>
              <div className="hidden md:flex items-center gap-3 pl-3 border-l border-slate-200">
                <span className="w-9 h-9 rounded-full bg-[#0B0B0F] text-white text-sm font-medium flex items-center justify-center" aria-hidden="true">{initials(session.name)}</span>
                <div className="leading-tight"><p className="text-xs font-semibold">{session.name}</p><p className="text-[11px] text-slate-500">{t('Manager', 'Esimies')}</p></div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-8 max-w-[1400px] space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#0B0B0F]">{page === 'Dashboard' ? t(`Good ${greeting()}, ${session.name.split(' ')[0]}`, `${greetingFi()}, ${session.name.split(' ')[0]}`) : pageTitle}</h1>
              <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
            </div>
            <button className={`${btnPrimary} sm:hidden`} onClick={() => setModal({ type: 'issue' })}><Icon name="plus" className="w-4 h-4" />{t('Report issue', 'Ilmoita vika')}</button>
          </div>
          {body}
        </main>
      </div>

      {roomModal && <RoomModal room={roomModal} staff={housekeepers} issues={d.issues.filter((i) => i.roomId === roomModal.id && i.status !== 'resolved')}
        actions={actions} onClose={() => setModal(null)} onReport={() => setModal({ type: 'issue', roomId: roomModal.id })} />}
      {modal?.type === 'addRooms' && <AddSpacesModal onClose={() => setModal(null)} onSubmit={async (list) => { if (await actions.addRooms(list)) setModal(null); }} />}
      {modal?.type === 'issue' && <IssueModal rooms={rooms} initialRoomId={modal.roomId || ''} onClose={() => setModal(null)} onSubmit={async (i) => { if (await actions.createIssue(i)) setModal(null); }} />}
      {modal?.type === 'staff' && <StaffModal role={modal.role || 'housekeeper'} hotelCode={session.hotel.code} onClose={() => setModal(null)} onCreate={actions.createStaff} />}
      {modal?.type === 'pin' && <PinModal staff={d.staff.find((s) => s.id === modal.id)} onClose={() => setModal(null)} onSave={actions.setPin} />}
    </div>
  );
}

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; };
const greetingFi = () => { const h = new Date().getHours(); return h < 12 ? 'Hyvää huomenta' : h < 18 ? 'Hyvää päivää' : 'Hyvää iltaa'; };

/* ---------------- Dashboard ---------------- */

function Dashboard({ stats, rooms, allRooms, hasAreas, kindFilter, setKindFilter, staff, issues, activity, search, statusFilter, setStatusFilter, go, hotel, openRoom, actions, setModal }) {
  const attention = [
    ...issues.filter((i) => i.needsHelp).map((i) => ({ key: 'n' + i.id, kind: 'issue', issue: i, priority: i.priority })),
    ...issues.filter((i) => i.priority === 'urgent' && !i.needsHelp).map((i) => ({ key: 'u' + i.id, kind: 'issue', issue: i, priority: 'urgent' })),
    ...issues.filter((i) => i.priority === 'high' && !i.needsHelp).map((i) => ({ key: 'h' + i.id, kind: 'issue', issue: i, priority: 'high' })),
    ...allRooms.filter((r) => r.status === 'Awaiting inspection').map((r) => ({ key: 'r' + r.id, kind: 'inspection', room: r, priority: 'high' }))
  ];
  const setupDone = [allRooms.length > 0, staff.length > 0];
  const showSetup = !setupDone[0] || !setupDone[1];

  const cards = [
    { label: t('Rooms ready', 'Huoneet valmiina'), value: stats.ready, caption: `/ ${stats.total}`, icon: 'check', tone: 'bg-emerald-50 text-emerald-600', onClick: () => { setStatusFilter('Ready'); } },
    { label: t('Cleaning pending', 'Siivous kesken'), value: stats.cleaning, caption: t('to clean', 'siivottavana'), icon: 'sparkles', tone: 'bg-blue-50 text-blue-600', onClick: () => { setStatusFilter('Dirty'); } },
    { label: t('Awaiting inspection', 'Odottaa tarkastusta'), value: stats.inspection, caption: t('to check', 'tarkastettavana'), icon: 'inspect', tone: 'bg-amber-50 text-amber-600', onClick: () => go('Inspections') },
    { label: t('Open maintenance', 'Avoimet huoltotyöt'), value: stats.issues, caption: t('issues', 'vikaa'), icon: 'wrench', tone: 'bg-rose-50 text-rose-600', onClick: () => go('Maintenance') }
  ];

  return (
    <>
      {showSetup && (
        <section className="rounded-3xl bg-[#E4F3F2] p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[#0B0B0F]">{t("Let's set up your hotel", 'Otetaan hotellisi käyttöön')}</h2>
          <p className="text-sm text-slate-600 mt-1">{t('Two quick steps and your team can start using Lodgora.', 'Kaksi nopeaa vaihetta, ja tiimisi voi aloittaa Lodgoran käytön.')}</p>
          <ol className="mt-4 space-y-3">
            <li className="flex flex-wrap items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${setupDone[0] ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-300 text-slate-500'}`}>{setupDone[0] ? <Icon name="check" className="w-3.5 h-3.5" /> : '1'}</span>
              <span className="text-sm font-medium flex-1 min-w-[12rem]">{t('Add your rooms', 'Lisää huoneesi')}</span>
              {!setupDone[0] && <button className={btnPrimary} onClick={() => setModal({ type: 'addRooms' })}>{t('Add rooms', 'Lisää huoneita')}</button>}
            </li>
            <li className="flex flex-wrap items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${setupDone[1] ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-300 text-slate-500'}`}>{setupDone[1] ? <Icon name="check" className="w-3.5 h-3.5" /> : '2'}</span>
              <span className="text-sm font-medium flex-1 min-w-[12rem]">{t('Add your housekeepers and give each one a PIN', 'Lisää siivoojasi ja anna jokaiselle PIN-koodi')}</span>
              {!setupDone[1] && <button className={btnPrimary} onClick={() => setModal({ type: 'staff' })}>{t('Add housekeeper', 'Lisää siivooja')}</button>}
            </li>
          </ol>
          <p className="text-xs text-slate-500 mt-4">{t(<>Your team signs in with the hotel code <span className="font-mono font-semibold">{hotel.code}</span>, their username and PIN.</>, <>Tiimisi kirjautuu hotellin koodilla <span className="font-mono font-semibold">{hotel.code}</span>, käyttäjätunnuksella ja PIN-koodilla.</>)}</p>
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c) => (
          <button key={c.label} onClick={c.onClick} className="text-left bg-white p-5 rounded-3xl hover:bg-white/70 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{c.label}</p>
              <p className="flex items-baseline gap-2 mt-1"><span className="text-2xl font-bold text-[#0B0B0F] tabular-nums">{c.value}</span><span className="text-xs text-slate-400">{c.caption}</span></p>
            </div>
            <span className={`w-11 h-11 rounded-full flex items-center justify-center flex-none ${c.tone}`}><Icon name={c.icon} /></span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 min-w-0">
          <ReadinessPanel title={t('Rooms and areas', 'Huoneet ja tilat')} subtitle={t('Live status of every room and common area', 'Jokaisen huoneen ja yleisen tilan tilanne reaaliajassa')} rooms={rooms} search={search}
            hasAreas={hasAreas} kindFilter={kindFilter} setKindFilter={setKindFilter} onRequestAreas={actions.requestAreaCleaning}
            statusFilter={statusFilter} setStatusFilter={setStatusFilter} openRoom={openRoom}
            onAdd={() => setModal({ type: 'addRooms' })} onDistribute={actions.distribute} />
        </div>

        <Panel title={t('Needs attention', 'Vaatii huomiota')} subtitle={t(`${attention.length} item${attention.length === 1 ? '' : 's'}`, `${attention.length} ${attention.length === 1 ? 'kohde' : 'kohdetta'}`)}>
          {attention.length === 0 ? (
            <EmptyState icon="check" title={t('Nothing needs attention', 'Mikään ei vaadi huomiota')} text={t('No urgent issues and no rooms waiting for inspection.', 'Ei kiireellisiä vikoja eikä tarkastusta odottavia huoneita.')} />
          ) : (
            <ul className="px-5 sm:px-6 pb-4">
              {attention.map((it) => (
                <li key={it.key} className="flex gap-3 py-3 border-t border-slate-100 first:border-0">
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-none ${it.kind === 'issue' ? (it.priority === 'urgent' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700') : 'bg-amber-50 text-amber-700'}`}>
                    <Icon name={it.kind === 'issue' ? 'wrench' : 'inspect'} className="w-[18px] h-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{it.kind === 'issue' ? tidyTitle(it.issue.title) : t(`${spaceName(it.room)} needs inspection`, `${spaceName(it.room)} odottaa tarkastusta`)}</p>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${PRIORITY_STYLE[it.priority]}`}>{priorityLabel(it.priority)}</span>
                      {it.kind === 'issue' && it.issue.needsHelp && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-600 text-white">{t('Needs help', 'Tarvitsee apua')}</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {it.kind === 'issue'
                        ? `${it.issue.roomLabel ? roomLabelText(it.issue.roomLabel) + ' · ' : ''}${tidyName(it.issue.reportedBy)} · ${timeAgo(it.issue.createdAt)}${it.issue.assignedTo ? ' · ' + t((staff.find((x) => x.id === it.issue.assignedTo)?.fullName || 'someone') + ' is on it', (staff.find((x) => x.id === it.issue.assignedTo)?.fullName || 'joku') + ' hoitaa asian') : ''}`
                        : t(`Cleaned by ${it.room.assignee || 'unknown'}${it.room.cleanSeconds > 0 ? ' in ' + minutesLabel(it.room.cleanSeconds) : ''}`, `Siivonnut ${it.room.assignee || 'tuntematon'}${it.room.cleanSeconds > 0 ? ', ' + minutesLabel(it.room.cleanSeconds) : ''}`)}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {it.kind === 'inspection'
                        ? <button className={`${btnSmall} bg-[#0B0B0F] text-white hover:bg-[#2A2B33]`} onClick={() => actions.approve(it.room)}>{t('Approve', 'Hyväksy')}</button>
                        : <button className={`${btnSmall} bg-[#0B0B0F] text-white hover:bg-[#2A2B33]`} onClick={() => actions.setIssueStatus(it.issue, 'resolved')}>{t('Mark resolved', 'Merkitse korjatuksi')}</button>}
                      {(it.kind === 'inspection' || it.issue.roomId) && (
                        <button className={`${btnSmall} bg-[#F0F1F4] hover:bg-[#E4E6EB]`} onClick={() => openRoom(it.kind === 'inspection' ? it.room.id : it.issue.roomId)}>{t('Open', 'Avaa')}</button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="xl:col-span-2 min-w-0">
          <Panel title={t("Today's activity", 'Päivän tapahtumat')} subtitle={t('Latest updates across the hotel', 'Viimeisimmät päivitykset hotellissa')}>
            {activity.length === 0 ? (
              <EmptyState title={t('No activity yet', 'Ei vielä tapahtumia')} text={search ? t(`Nothing matches "${search}".`, `Haulla "${search}" ei löytynyt mitään.`) : t('Updates from your team will show up here.', 'Tiimisi päivitykset näkyvät tässä.')} />
            ) : (
              <ol className="px-5 sm:px-6 pb-4">
                {activity.slice(0, 10).map((a, i, arr) => (
                  <li key={a.id} className="grid grid-cols-[3rem_0.75rem_1fr] gap-3 pb-4 relative">
                    <time className="text-xs text-slate-400 pt-0.5 tabular-nums">{timeOfDay(a.createdAt)}</time>
                    <span className="w-3 h-3 rounded-full mt-1 ring-2 ring-white bg-[#19A7A1]"></span>
                    {i < arr.length - 1 && <span className="absolute left-[3.9rem] top-4 bottom-0 w-px bg-slate-200"></span>}
                    <div className="min-w-0"><p className="text-sm text-slate-800">{a.text}</p><p className="text-xs text-slate-500">{a.actor}</p></div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <Panel title={t('Team overview', 'Tiimin yleiskuva')} subtitle={t(`${staff.filter((s) => s.active).length} active ${staff.filter((s) => s.active).length === 1 ? 'person' : 'people'}`, `${staff.filter((s) => s.active).length} aktiivista ${staff.filter((s) => s.active).length === 1 ? 'henkilöä' : 'henkilöä'}`)}
          right={<button className={`${btnSmall} bg-[#F0F1F4] hover:bg-[#E4E6EB]`} onClick={() => go('Team')}>{t('Manage', 'Hallinnoi')}</button>}>
          {staff.length === 0 ? (
            <EmptyState icon="users" title={t('No team yet', 'Ei vielä tiimiä')} text={t('Add your housekeepers and maintenance team so you can assign rooms and issues.', 'Lisää siivoojat ja huoltotiimi, niin voit antaa heille huoneita ja vikoja.')}>
              <button className={btnPrimary} onClick={() => setModal({ type: 'staff' })}>{t('Add housekeeper', 'Lisää siivooja')}</button>
            </EmptyState>
          ) : (
            <ul className="px-5 sm:px-6 pb-4">
              {staff.filter((s) => s.active).map((s) => {
                const tech = s.role === 'maintenance';
                const mine = tech ? issues.filter((i) => i.assignedTo === s.id) : allRooms.filter((r) => r.assignedTo === s.id);
                const todo = tech ? mine.length : mine.filter((r) => r.status === 'Dirty' || r.status === 'Cleaning').length;
                return (
                  <li key={s.id} className="flex items-center gap-3 py-2">
                    <span className="w-9 h-9 rounded-full bg-[#0B0B0F] text-white text-xs font-semibold flex items-center justify-center flex-none" aria-hidden="true">{initials(s.fullName)}</span>
                    <div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate">{s.fullName}</p><p className="text-xs text-slate-500">{tech ? t('Maintenance', 'Huolto') : t('Housekeeper', 'Siivooja')}</p></div>
                    <p className="text-xs text-slate-500 text-right tabular-nums">{tech ? t(<>{todo} open {todo === 1 ? 'issue' : 'issues'}</>, <>{todo} avointa {todo === 1 ? 'vikaa' : 'vikaa'}</>) : t(<>{todo} to clean<br />{mine.length} assigned</>, <>{todo} siivottavana<br />{mine.length} annettu</>)}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function ReadinessPanel({ title, subtitle, rooms, search, statusFilter, setStatusFilter, openRoom, onAdd, onDistribute, hasAreas, kindFilter, setKindFilter, onRequestAreas }) {
  const filters = ['All', ...STATUSES];
  const shown = rooms.filter((r) => statusFilter === 'All' || r.status === statusFilter);
  const small = `${btnSmall} bg-[#F0F1F4] hover:bg-[#E4E6EB] inline-flex items-center gap-1.5`;
  return (
    <Panel title={title} subtitle={subtitle}
      right={
        <div className="flex flex-wrap gap-2">
          {hasAreas && <button className={small} onClick={onRequestAreas}><Icon name="sparkles" className="w-3.5 h-3.5" />{t('Request area cleaning', 'Pyydä tilojen siivous')}</button>}
          <button className={small} onClick={onDistribute}><Icon name="shuffle" className="w-3.5 h-3.5" />{t('Assign cleaning', 'Jaa siivoukset')}</button>
          <button className={small} onClick={onAdd}><Icon name="plus" className="w-3.5 h-3.5" />{t('Add rooms or areas', 'Lisää huoneita tai tiloja')}</button>
        </div>
      }>
      {hasAreas && (
        <div className="px-5 sm:px-6 pb-3 flex gap-1.5" role="group" aria-label={t('Show rooms or common areas', 'Näytä huoneet tai yleiset tilat')}>
          {[['all', t('Everything', 'Kaikki')], ['room', t('Rooms', 'Huoneet')], ['area', t('Common areas', 'Yleiset tilat')]].map(([id, label]) => (
            <button key={id} onClick={() => setKindFilter(id)} aria-pressed={kindFilter === id}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${kindFilter === id ? 'bg-[#0B0B0F] text-white' : 'bg-[#F4F5F7] text-slate-600 hover:bg-[#E4E6EB]'}`}>{label}</button>
          ))}
        </div>
      )}
      <div className="px-5 sm:px-6 pb-4 flex flex-wrap gap-1.5" role="group" aria-label={t('Filter by status', 'Suodata tilan mukaan')}>
        {filters.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} aria-pressed={statusFilter === s}
            className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${statusFilter === s ? 'bg-[#0B0B0F] border-[#172B4D] text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {s === 'All' ? t('All', 'Kaikki') : statusLabel(s)} <span className="ml-1 font-semibold tabular-nums">{s === 'All' ? rooms.length : rooms.filter((r) => r.status === s).length}</span>
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <EmptyState icon="bed" title={rooms.length === 0 && !search ? t('Nothing here yet', 'Täällä ei ole vielä mitään') : t('Nothing found', 'Mitään ei löytynyt')}
          text={search ? t(`Nothing matches "${search}".`, `Haulla "${search}" ei löytynyt mitään.`) : rooms.length === 0 ? t('Add your rooms and common areas to start tracking them.', 'Lisää huoneesi ja yleiset tilasi aloittaaksesi seurannan.') : t('Nothing with this status.', 'Ei kohteita tällä tilalla.')}>
          {rooms.length === 0 && !search && <button className={btnPrimary} onClick={onAdd}>{t('Add rooms or areas', 'Lisää huoneita tai tiloja')}</button>}
          {(statusFilter !== 'All') && <button className={btnGhost} onClick={() => setStatusFilter('All')}>{t('Show everything', 'Näytä kaikki')}</button>}
        </EmptyState>
      ) : (
        <div className="px-5 sm:px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
          {shown.map((r) => (
            <button key={r.id} onClick={() => openRoom(r.id)} aria-label={`${spaceName(r)}, ${typeLabel(r.type)}, ${statusLabel(r.status)}`}
              className={`text-left bg-[#F4F5F7] hover:bg-[#ECEDF1] rounded-3xl p-4 transition-colors flex flex-col gap-3 min-w-0`}>
              <div><span className="text-base font-bold text-[#0B0B0F]">{spaceName(r)}</span><p className="text-xs text-slate-500">{typeLabel(r.type)}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={r.status} />
                <CleanTag room={r} />
                {r.status === 'Cleaning' && (
                  <span className={`inline-flex items-center gap-1 text-xs ${r.cleanRunningSince ? 'text-blue-700' : 'text-slate-500'}`}>
                    <Icon name="timer" className="w-3.5 h-3.5" /><CleanTimer room={r} />{!r.cleanRunningSince && <span>{t('paused', 'tauolla')}</span>}
                  </span>
                )}
              </div>
              <p className="pt-3 border-t border-slate-200/70 text-xs text-slate-500 truncate">{r.assignee ? t(`Staff: ${r.assignee}`, `Tekijä: ${r.assignee}`) : t('Not assigned', 'Ei tekijää')}</p>
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ---------------- Inspeções ---------------- */

function Inspections({ rooms, actions }) {
  const waiting = rooms.filter((r) => r.status === 'Awaiting inspection');
  const back = rooms.filter((r) => r.status !== 'Awaiting inspection');
  const list = (items) => (
    <ul className="px-5 sm:px-6 pb-4 divide-y divide-slate-100">
      {items.map((r) => <InspectionItem key={r.id} r={r} actions={actions} />)}
    </ul>
  );
  return (
    <div className="space-y-6">
      <Panel title={t('Awaiting inspection', 'Odottaa tarkastusta')} subtitle={t(`${waiting.length} item${waiting.length === 1 ? '' : 's'}`, `${waiting.length} ${waiting.length === 1 ? 'kohde' : 'kohdetta'}`)}>
        {waiting.length === 0 ? (
          <EmptyState icon="check" title={t('Nothing to inspect', 'Ei tarkastettavaa')} text={t('Rooms and areas appear here when a housekeeper finishes cleaning them.', 'Huoneet ja tilat ilmestyvät tähän, kun siivooja on saanut ne valmiiksi.')} />
        ) : list(waiting)}
      </Panel>
      {back.length > 0 && (
        <Panel title={t('Sent back', 'Palautettu')} subtitle={t(`${back.length} waiting for the housekeeper. They stay here until you approve them.`, `${back.length} odottaa siivoojaa. Ne pysyvät tässä, kunnes hyväksyt ne.`)}>
          {list(back)}
        </Panel>
      )}
    </div>
  );
}

// Um quarto à espera de inspeção: aprovar, ou devolver com uma nota do que corrigir (a equipa pode responder)
function InspectionItem({ r, actions }) {
  const sentBack = r.status !== 'Awaiting inspection';
  const [backing, setBacking] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const sendBack = async () => { setBusy(true); await actions.sendBack(r, note); setBusy(false); setBacking(false); setNote(''); };
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1 basis-48"><p className="font-bold text-[#0B0B0F]">{spaceName(r)}</p><p className="text-xs text-slate-500">{typeLabel(r.type)} · {sentBack ? t(`waiting for ${r.assignee || 'a housekeeper'}`, `odottaa: ${r.assignee || 'siivooja'}`) : t(`cleaned by ${r.assignee || 'unknown'}`, `siivonnut ${r.assignee || 'tuntematon'}`)}{!sentBack && r.cleanSeconds > 0 && `, ${minutesLabel(r.cleanSeconds)}`}</p></div>
              {sentBack ? (
                <div className="flex items-center gap-2"><StatusBadge status={r.status} /><CleanTag room={r} /></div>
              ) : (
              <div className="flex gap-2">
                <button className={btnGhost} aria-expanded={backing} onClick={() => setBacking((v) => !v)}>{t('Send back', 'Palauta')}</button>
                <button className={btnPrimary} onClick={() => actions.approve(r)}><Icon name="check" className="w-4 h-4" />{t('Approve', 'Hyväksy')}</button>
              </div>
              )}
      </div>
      <IssueNotes notes={r.notes} />
      {backing ? (
        <div className="mt-3 rounded-2xl bg-[#F4F5F7] p-4">
          <label htmlFor={`back-${r.id}`} className="text-sm font-semibold text-[#0B0B0F]">{t('What needs to be fixed?', 'Mitä pitää korjata?')}</label>
          <textarea id={`back-${r.id}`} rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} autoFocus
            placeholder={t('e.g. Floor under the bed, one towel missing…', 'esim. lattia sängyn alta, yksi pyyhe puuttuu…')}
            className="mt-2 w-full px-4 py-3 border-2 border-transparent rounded-2xl text-sm bg-white focus:outline-none focus:border-[#0B0B0F] resize-none" />
          <p className="text-xs text-slate-500 mt-1">{t('The housekeeper sees this note and can reply. You can also send the room back without a note.', 'Siivooja näkee viestin ja voi vastata. Voit palauttaa huoneen myös ilman viestiä.')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={btnPrimary} disabled={busy} onClick={sendBack}>{note.trim() ? t('Send back with note', 'Palauta viestin kanssa') : t('Send back', 'Palauta')}</button>
            <button className={btnGhost} onClick={() => { setBacking(false); setNote(''); }}>{t('Cancel', 'Peruuta')}</button>
          </div>
        </div>
      ) : (
        <NoteBox collapsible label={r.notes?.length ? t('Reply', 'Vastaa') : t('Add a note', 'Lisää viesti')} onSend={(text) => actions.addRoomNote(r, text)} />
      )}
    </li>
  );
}

/* ---------------- Manutenção ---------------- */

function Maintenance({ issues, technicians, staffById, onReport, onAddTech, actions }) {
  const [filter, setFilter] = useState('open');
  const list = issues.filter((i) => filter === 'all' || i.status !== 'resolved');
  const order = { urgent: 0, high: 1, normal: 2, low: 3 };
  list.sort((a, b) => (a.status === 'resolved') - (b.status === 'resolved') || order[a.priority] - order[b.priority]);
  const unassigned = issues.filter((i) => i.status !== 'resolved' && !i.assignedTo).length;
  return (
    <Panel title={t('Issues', 'Viat')} subtitle={technicians.length === 0 ? t('Reported by your team', 'Tiimisi ilmoittamat') : t(`Reported by your team${unassigned ? ` · ${unassigned} without anyone assigned` : ''}`, `Tiimisi ilmoittamat${unassigned ? ` · ${unassigned} ilman tekijää` : ''}`)}
      right={<button className={btnPrimary} onClick={onReport}><Icon name="plus" className="w-4 h-4" />{t('Report issue', 'Ilmoita vika')}</button>}>
      {technicians.length === 0 && (
        <div className="mx-5 sm:mx-6 mb-4 rounded-2xl bg-[#F4F5F7] px-4 py-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span className="flex-1 basis-56">{t('Add your maintenance people to give each issue to someone. They sign in with a PIN, like housekeepers, and only see their own issues.', 'Lisää huoltohenkilöt, niin voit antaa jokaisen vian jollekin. He kirjautuvat PIN-koodilla siivoojien tapaan ja näkevät vain omat vikansa.')}</span>
          <button className={`${btnSmall} bg-[#F0F1F4] hover:bg-[#E4E6EB]`} onClick={onAddTech}>{t('Add maintenance person', 'Lisää huoltohenkilö')}</button>
        </div>
      )}
      <div className="px-5 sm:px-6 pb-4 flex gap-1.5">
        {[['open', t('Open', 'Avoimet')], ['all', t('All', 'Kaikki')]].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} aria-pressed={filter === id}
            className={`px-3 py-1 rounded-full border text-xs font-medium ${filter === id ? 'bg-[#0B0B0F] border-[#172B4D] text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{label}</button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState icon="check" title={t('No issues', 'Ei vikoja')} text={t('Problems reported by your team will appear here.', 'Tiimisi ilmoittamat viat näkyvät tässä.')} />
      ) : (
        <ul className="px-5 sm:px-6 pb-4 divide-y divide-slate-100">
          {list.map((i) => {
            const who = staffById[i.assignedTo];
            return (
              <li key={i.id} className={`py-4 flex flex-wrap items-start gap-3 ${i.status === 'resolved' ? 'opacity-60' : ''}`}>
                <div className="min-w-0 flex-1 basis-56">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-sm">{tidyTitle(i.title)}</p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${PRIORITY_STYLE[i.priority]}`}>{priorityLabel(i.priority)}</span>
                    {i.needsHelp && i.status !== 'resolved' && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-600 text-white">{t('Needs help', 'Tarvitsee apua')}</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{i.roomLabel ? `${roomLabelText(i.roomLabel)} · ` : ''}{tidyName(i.reportedBy)} · {timeAgo(i.createdAt)} · {ISSUE_STATUS_LABEL[i.status]}</p>
                  {i.status !== 'resolved' && technicians.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <label htmlFor={`as-${i.id}`} className="text-xs text-slate-500">{t('Assigned to', 'Tekijä')}</label>
                      <select id={`as-${i.id}`} value={i.assignedTo || ''} onChange={(e) => actions.assignIssue(i, e.target.value)}
                        className={`px-2 py-1 border rounded-lg text-xs bg-white focus:outline-none focus:border-[#19A7A1] ${i.assignedTo ? 'border-[#19A7A1] text-[#0D7C77] font-medium' : 'border-slate-200 text-slate-500'}`}>
                        <option value="">{t('No one yet', 'Ei vielä ketään')}</option>
                        {technicians.map((tech) => <option key={tech.id} value={tech.id}>{tech.fullName}</option>)}
                      </select>
                    </div>
                  )}
                  {i.status !== 'resolved' && technicians.length === 0 && who && <p className="text-xs text-slate-500 mt-1">{t(`Assigned to ${who.fullName}`, `Tekijä: ${who.fullName}`)}</p>}
                  {i.status === 'resolved' && who && <p className="text-xs text-slate-500 mt-1">{t(`Fixed by ${who.fullName}`, `Korjannut ${who.fullName}`)}</p>}
                  <IssueNotes notes={i.notes} />
                  {i.status !== 'resolved' && <NoteBox collapsible label={i.notes?.length ? t('Reply', 'Vastaa') : t('Add a note', 'Lisää viesti')} placeholder={t('Write a note for your team…', 'Kirjoita viesti tiimillesi…')} onSend={(txt) => actions.addIssueNote(i, txt)} />}
                </div>
                <div className="flex gap-2">
                  {i.status === 'open' && <button className={`${btnSmall} bg-[#F0F1F4] hover:bg-[#E4E6EB]`} onClick={() => actions.setIssueStatus(i, 'in_progress')}>{t('Start work', 'Aloita työ')}</button>}
                  {i.status !== 'resolved' && <button className={`${btnSmall} bg-[#0B0B0F] text-white hover:bg-[#2A2B33]`} onClick={() => actions.setIssueStatus(i, 'resolved')}>{t('Resolve', 'Merkitse korjatuksi')}</button>}
                  {i.status === 'resolved' && <button className={`${btnSmall} bg-[#F0F1F4] hover:bg-[#E4E6EB]`} onClick={() => actions.setIssueStatus(i, 'open')}>{t('Reopen', 'Avaa uudelleen')}</button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ---------------- Equipa ---------------- */

function Team({ staff, rooms, issues, hotel, setModal, actions }) {
  const groups = [
    { role: 'housekeeper', title: t('Housekeepers', 'Siivoojat'), one: t('housekeeper', 'siivooja'), add: t('Add housekeeper', 'Lisää siivooja'), empty: t('No housekeepers yet', 'Ei vielä siivoojia'), text: t('Add each person and give them a 4-digit PIN. You give them rooms to clean.', 'Lisää jokainen henkilö ja anna hänelle nelinumeroinen PIN-koodi. Sinä annat heille siivottavat huoneet.') },
    { role: 'maintenance', title: t('Maintenance team', 'Huoltotiimi'), one: t('maintenance person', 'huoltohenkilö'), add: t('Add maintenance person', 'Lisää huoltohenkilö'), empty: t('No maintenance team yet', 'Ei vielä huoltotiimiä'), text: t('Add the people who fix things. You give each issue to one of them, and they see only their own.', 'Lisää korjaavat henkilöt. Annat jokaisen vian jollekin heistä, ja he näkevät vain omat vikansa.') }
  ];
  return (
    <>
      <section className="bg-white rounded-3xl p-5 sm:p-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 basis-64">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('Hotel code', 'Hotellin koodi')}</p>
          <p className="text-3xl font-bold font-mono tracking-widest text-[#0B0B0F] mt-1">{hotel.code}</p>
          <p className="text-sm text-slate-500 mt-1">{t(<>Your team opens <span className="font-semibold text-slate-700">{location.origin}/app</span> on their phone and signs in with this code, their username and PIN.</>, <>Tiimisi avaa puhelimellaan osoitteen <span className="font-semibold text-slate-700">{location.origin}/app</span> ja kirjautuu tällä koodilla, käyttäjätunnuksellaan ja PIN-koodillaan.</>)}</p>
        </div>
        <CopyButton text={hotel.code} label={t('Copy code', 'Kopioi koodi')} />
        <CopyButton text={`${location.origin}/app`} label={t('Copy website address', 'Kopioi verkko-osoite')} />
      </section>

      {groups.map((g) => {
        const list = staff.filter((s) => s.role === g.role);
        return (
          <Panel key={g.role} title={g.title} subtitle={t(`${list.length} ${list.length === 1 ? 'person' : 'people'}`, `${list.length} ${list.length === 1 ? 'henkilö' : 'henkilöä'}`)}
            right={<button className={btnPrimary} onClick={() => setModal({ type: 'staff', role: g.role })}><Icon name="plus" className="w-4 h-4" />{g.add}</button>}>
            {list.length === 0 ? (
              <EmptyState icon="users" title={g.empty} text={g.text} />
            ) : (
              <ul className="px-5 sm:px-6 pb-4 divide-y divide-slate-100">
                {list.map((s) => <StaffRow key={s.id} s={s} hotel={hotel}
                  count={g.role === 'maintenance' ? issues.filter((i) => i.assignedTo === s.id && i.status !== 'resolved').length : rooms.filter((r) => r.assignedTo === s.id).length}
                  setModal={setModal} actions={actions} />)}
              </ul>
            )}
          </Panel>
        );
      })}
    </>
  );
}

function StaffRow({ s, hotel, count, setModal, actions }) {
  const [show, setShow] = useState(false);
  const details = t(`Lodgora sign in\nWebsite: ${location.origin}/app\nHotel code: ${hotel.code}\nUsername: ${s.username}\nPIN: ${s.pin}`, `Lodgora-kirjautuminen\nVerkkosivu: ${location.origin}/app\nHotellin koodi: ${hotel.code}\nKäyttäjätunnus: ${s.username}\nPIN-koodi: ${s.pin}`);
  return (
    <li className={`py-3 flex flex-wrap items-center gap-3 ${s.active ? '' : 'opacity-60'}`}>
      <span className="w-10 h-10 rounded-full bg-[#0B0B0F] text-white text-sm font-semibold flex items-center justify-center flex-none" aria-hidden="true">{initials(s.fullName)}</span>
      <div className="min-w-0 flex-1 basis-40">
        <p className="font-semibold text-sm truncate">{s.fullName}{!s.active && <span className="ml-2 text-xs font-medium text-slate-500">{t('(inactive)', '(ei aktiivinen)')}</span>}</p>
        <p className="text-xs text-slate-500">{t('Username', 'Käyttäjätunnus')} <span className="font-mono">{s.username}</span> · {s.role === 'maintenance' ? t(`${count} open ${count === 1 ? 'issue' : 'issues'}`, `${count} avointa vikaa`) : t(`${count} ${count === 1 ? 'room' : 'rooms'} assigned`, `${count} ${count === 1 ? 'huone' : 'huonetta'} annettu`)}</p>
        <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2">
          {s.pin ? (
            <>
              <span>{t('PIN', 'PIN-koodi')}</span>
              <span className="font-mono font-semibold tracking-widest text-[#0B0B0F] text-sm" data-testid={`pin-${s.username}`}>{show ? s.pin : '••••'}</span>
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? t(`Hide PIN of ${s.fullName}`, `Piilota henkilön ${s.fullName} PIN-koodi`) : t(`Show PIN of ${s.fullName}`, `Näytä henkilön ${s.fullName} PIN-koodi`)}
                className="inline-flex items-center gap-1 font-semibold text-[#0D7C77] hover:underline"><Icon name={show ? 'eyeoff' : 'eye'} className="w-3.5 h-3.5" />{show ? t('Hide', 'Piilota') : t('Show', 'Näytä')}</button>
              <CopyButton text={details} label={t('Copy login details', 'Kopioi kirjautumistiedot')} />
            </>
          ) : (
            <span>{t('PIN was set before PINs could be shown. Use "Change PIN" once to see it here.', 'PIN-koodi asetettiin ennen kuin koodit voitiin näyttää. Käytä kerran "Vaihda PIN-koodi", niin näet sen tässä.')}</span>
          )}
        </p>
      </div>
      <div className="flex gap-2">
        <button className={`${btnSmall} bg-[#F0F1F4] hover:bg-[#E4E6EB]`} onClick={() => setModal({ type: 'pin', id: s.id })}>{t('Change PIN', 'Vaihda PIN-koodi')}</button>
        <button className={`${btnSmall} bg-[#F0F1F4] hover:bg-[#E4E6EB]`} onClick={() => actions.setActive(s, !s.active)}>{s.active ? t('Deactivate', 'Poista käytöstä') : t('Activate', 'Ota käyttöön')}</button>
      </div>
    </li>
  );
}

function SettingsPage({ session, signOut }) {
  return (
    <Panel title={t('Your hotel', 'Hotellisi')}>
      <dl className="px-5 sm:px-6 pb-6 grid grid-cols-[8rem_minmax(0,1fr)] gap-y-3 gap-x-4 text-sm">
        <dt className="text-slate-500">{t('Hotel', 'Hotelli')}</dt><dd className="font-medium">{session.hotel.name}</dd>
        <dt className="text-slate-500">{t('Hotel code', 'Hotellin koodi')}</dt><dd className="font-mono font-semibold">{session.hotel.code}</dd>
        <dt className="text-slate-500">{t('Signed in as', 'Kirjautunut')}</dt><dd>{session.name}</dd>
        <dt className="text-slate-500">{t('Data', 'Tiedot')}</dt><dd>{backend.mode === 'demo' ? t('Demo data stored only in this browser', 'Demotiedot tallennettu vain tähän selaimeen') : t('Live database', 'Oikea tietokanta')}</dd>
        <dt className="text-slate-500">Language / Kieli</dt><dd><LangSwitch /></dd>
      </dl>
      <div className="px-5 sm:px-6 pb-6"><button className={btnGhost} onClick={signOut}><Icon name="logout" className="w-4 h-4" />{t('Sign out', 'Kirjaudu ulos')}</button></div>
    </Panel>
  );
}

/* ---------------- Janelas ---------------- */

function RoomModal({ room, staff, issues, actions, onClose, onReport }) {
  return (
    <Modal title={spaceName(room)} subtitle={isArea(room) ? t('Common area', 'Yleinen tila') : `${typeLabel(room.type)} · ${t('Floor', 'Kerros')} ${room.floor}`} onClose={onClose}>
      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between"><span className="text-xs text-slate-500">{t('Current status', 'Nykyinen tila')}</span><StatusBadge status={room.status} /></div>
        {room.status === 'Cleaning' && (
          <div className="flex items-center justify-between rounded-2xl bg-[#F4F5F7] px-3 py-2.5">
            <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5"><Icon name="timer" className="w-4 h-4" />{room.cleanRunningSince ? t('Cleaning time', 'Siivousaika') : t('Paused at', 'Tauolla kohdassa')}</span>
            <CleanTimer room={room} className="text-lg text-[#0B0B0F]" />
          </div>
        )}
        {room.status === 'Awaiting inspection' && room.cleanSeconds > 0 && (
          <p className="text-xs text-slate-500">{t(`Cleaned in ${minutesLabel(room.cleanSeconds)}.`, `Siivottu ajassa ${minutesLabel(room.cleanSeconds)}.`)}</p>
        )}
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-2" id="rm-status">{t('Change status', 'Vaihda tilaa')}</p>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="rm-status">
            {STATUSES.filter((s) => !(isArea(room) && s === 'Occupied')).map((s) => (
              <button key={s} aria-pressed={room.status === s} onClick={() => actions.setStatus(room, s)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${room.status === s ? 'bg-[#0B0B0F] text-white border-[#172B4D]' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>{statusLabel(s)}</button>
            ))}
          </div>
        </div>
        <RoomName room={room} onSave={(name) => actions.rename(room, name)} />
        {!isArea(room) && <RoomDetails room={room} onSave={(patch) => actions.setDetails(room, patch)} />}
        <Field id="rm-staff" label={t('Assigned to', 'Tekijä')}>
          <select id="rm-staff" className={inputCls} value={room.assignedTo || ''} onChange={(e) => actions.assign(room, e.target.value)}>
            <option value="">{t('Not assigned', 'Ei tekijää')}</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
          </select>
        </Field>
        {issues.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">{t('Open issues', 'Avoimet viat')}</p>
            <ul className="space-y-1.5">{issues.map((i) => <li key={i.id} className="text-sm flex items-center gap-2"><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${PRIORITY_STYLE[i.priority]}`}>{priorityLabel(i.priority)}</span>{tidyTitle(i.title)}</li>)}</ul>
          </div>
        )}
        <DeleteSpace room={room} onDelete={() => actions.remove(room)} />
        <div className="flex gap-3 pt-1">
          <button className={`${btnGhost} flex-1`} onClick={onReport}><Icon name="wrench" className="w-4 h-4" />{t('Report issue', 'Ilmoita vika')}</button>
          <button className={`${btnPrimary} flex-1`} onClick={onClose}>{t('Done', 'Valmis')}</button>
        </div>
      </div>
    </Modal>
  );
}

function RoomName({ room, onSave }) {
  const [name, setName] = useState(room.number);
  const [error, setError] = useState('');
  const changed = name.trim() !== room.number;
  const label = isArea(room) ? t('Area name', 'Tilan nimi') : t('Room number', 'Huoneen numero');
  const save = async () => { const err = await onSave(name); setError(err || ''); };
  return (
    <div>
      <Field id="rm-name" label={label} error={error}>
        <div className="flex gap-2">
          <input id="rm-name" className={inputCls} value={name} maxLength={40} onChange={(e) => { setName(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && changed) save(); }} />
          {changed && <button type="button" className={`${btnPrimary} flex-none`} onClick={save}>{t('Save', 'Tallenna')}</button>}
        </div>
      </Field>
    </div>
  );
}

function DeleteSpace({ room, onDelete }) {
  const [sure, setSure] = useState(false);
  const noun = isArea(room) ? t('area', 'tila') : t('room', 'huone');
  if (!sure) {
    return <button type="button" className="text-xs font-semibold text-rose-600 hover:underline" onClick={() => setSure(true)}>{isArea(room) ? t('Delete this area…', 'Poista tämä tila…') : t('Delete this room…', 'Poista tämä huone…')}</button>;
  }
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3.5" role="alertdialog" aria-label={t(`Delete ${spaceName(room)}`, `Poista ${spaceName(room)}`)}>
      <p className="text-sm font-semibold text-rose-800">{t(`Delete ${spaceName(room)}?`, `Poistetaanko ${spaceName(room)}?`)}</p>
      <p className="text-xs text-rose-700 mt-1">{t("It disappears from your lists and from your housekeepers' phones. Past cleaning times stay in your statistics. This cannot be undone.", 'Se poistuu listoistasi ja siivoojien puhelimista. Aiemmat siivousajat säilyvät tilastoissasi. Tätä ei voi perua.')}{room.status === 'Cleaning' ? t(' A cleaning is in progress right now.', ' Siivous on parhaillaan käynnissä.') : ''}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className={`${btnGhost} flex-1 !py-2`} onClick={() => setSure(false)}>{t('Keep it', 'Säilytä')}</button>
        <button type="button" className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold py-2" onClick={onDelete}>{t('Yes, delete', 'Kyllä, poista')}</button>
      </div>
    </div>
  );
}

// Lista curta de tipos de quarto, com opção para escrever um tipo próprio
function RoomTypeSelect({ id, value, onChange }) {
  const [custom, setCustom] = useState(value !== '' && !ROOM_TYPES.includes(value));
  return (
    <div className="space-y-2">
      <select id={id} className={inputCls} value={custom ? '__custom' : value}
        onChange={(e) => {
          if (e.target.value === '__custom') { setCustom(true); onChange(''); }
          else { setCustom(false); onChange(e.target.value); }
        }}>
        {ROOM_TYPES.map((ty) => <option key={ty} value={ty}>{typeLabel(ty)}</option>)}
        <option value="__custom">{t('Other (type your own)…', 'Muu (kirjoita oma)…')}</option>
      </select>
      {custom && <input aria-label={t('Custom room type', 'Oma huonetyyppi')} className={inputCls} value={value} placeholder={t('e.g. Loft with terrace', 'esim. Parvihuone terassilla')} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}

function RoomDetails({ room, onSave }) {
  const [type, setType] = useState(room.type);
  const [floor, setFloor] = useState(String(room.floor));
  const floorNum = parseInt(floor, 10);
  const changed = (type.trim() !== room.type || floorNum !== room.floor) && type.trim() && Number.isFinite(floorNum);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-3">
        <Field id="rm-type" label={t('Room type', 'Huonetyyppi')}><RoomTypeSelect id="rm-type" value={type} onChange={setType} /></Field>
        <Field id="rm-floor" label={t('Floor', 'Kerros')}><input id="rm-floor" inputMode="numeric" className={inputCls} value={floor} onChange={(e) => setFloor(e.target.value)} /></Field>
      </div>
      {changed && <button className={`${btnGhost} w-full`} onClick={() => onSave({ type: type.trim(), floor: floorNum })}>{t('Save type and floor', 'Tallenna tyyppi ja kerros')}</button>}
    </div>
  );
}

function AddSpacesModal({ onClose, onSubmit }) {
  const [tab, setTab] = useState('room');
  return (
    <Modal title={t('Add rooms or common areas', 'Lisää huoneita tai yleisiä tiloja')} subtitle={t('Rooms and areas that already exist are skipped.', 'Jo olemassa olevat huoneet ja tilat ohitetaan.')} onClose={onClose}>
      <div className="px-5 pt-4">
        <div className="grid grid-cols-2 gap-1 bg-[#F4F5F7] p-1 rounded-full" role="tablist">
          {[['room', t('Rooms', 'Huoneet')], ['area', t('Common areas', 'Yleiset tilat')]].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`py-1.5 rounded-md text-sm font-semibold transition-colors ${tab === id ? 'bg-white text-[#0B0B0F] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>
          ))}
        </div>
      </div>
      {tab === 'room' ? <AddRoomsForm onClose={onClose} onSubmit={onSubmit} /> : <AddAreasForm onClose={onClose} onSubmit={onSubmit} />}
    </Modal>
  );
}

function AddRoomsForm({ onClose, onSubmit }) {
  const [f, setF] = useState({ floor: '1', from: '101', to: '110', type: 'Double' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const from = parseInt(f.from, 10), to = parseInt(f.to, 10);
  const total = Number.isFinite(from) && Number.isFinite(to) && to >= from ? to - from + 1 : 0;
  const set = (k, v) => { setF({ ...f, [k]: v }); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    if (!total) { setError(t('"To" must be a number equal to or higher than "From".', 'Loppunumeron on oltava vähintään alkunumeron suuruinen luku.')); return; }
    if (total > 200) { setError(t('Add up to 200 rooms at a time.', 'Lisää enintään 200 huonetta kerrallaan.')); return; }
    if (!f.type.trim()) { setError(t('Enter the room type.', 'Anna huonetyyppi.')); return; }
    setBusy(true);
    const list = Array.from({ length: total }, (_, i) => ({ number: String(from + i), floor: parseInt(f.floor, 10) || 1, type: f.type.trim(), status: 'Ready', kind: 'room' }));
    await onSubmit(list);
    setBusy(false);
  };

  return (
    <form onSubmit={submit} noValidate className="p-5 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Field id="ar-floor" label={t('Floor', 'Kerros')}><input id="ar-floor" inputMode="numeric" className={inputCls} value={f.floor} onChange={(e) => set('floor', e.target.value)} /></Field>
        <Field id="ar-from" label={t('From room', 'Huoneesta')}><input id="ar-from" inputMode="numeric" className={inputCls} value={f.from} onChange={(e) => set('from', e.target.value)} /></Field>
        <Field id="ar-to" label={t('To room', 'Huoneeseen')}><input id="ar-to" inputMode="numeric" className={inputCls} value={f.to} onChange={(e) => set('to', e.target.value)} /></Field>
      </div>
      <Field id="ar-type" label={t('Room type', 'Huonetyyppi')} error={error}>
        <RoomTypeSelect id="ar-type" value={f.type} onChange={(v) => set('type', v)} />
      </Field>
      <p className="text-sm text-slate-600 bg-[#F4F5F7] rounded-2xl px-3.5 py-2.5">{total ? t(`This creates ${total} room${total > 1 ? 's' : ''}: ${from} to ${to}.`, `Tämä luo ${total} ${total > 1 ? 'huonetta' : 'huoneen'}: ${from}–${to}.`) : t('Enter a valid range.', 'Anna kelvollinen numeroväli.')}</p>
      <div className="flex gap-3"><button type="button" className={`${btnGhost} flex-1`} onClick={onClose}>{t('Cancel', 'Peruuta')}</button><button type="submit" className={`${btnPrimary} flex-1`} disabled={busy}>{busy ? t('Adding…', 'Lisätään…') : t('Add rooms', 'Lisää huoneet')}</button></div>
    </form>
  );
}

function AddAreasForm({ onClose, onSubmit }) {
  const [picked, setPicked] = useState([]);
  const [custom, setCustom] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toggle = (name) => { setPicked((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name])); setError(''); };
  const addCustom = () => {
    const name = custom.trim();
    if (!name) return;
    if (name.length > 40) { setError(t('Keep the name under 40 characters.', 'Pidä nimi alle 40 merkin pituisena.')); return; }
    setPicked((p) => (p.some((x) => x.toLowerCase() === name.toLowerCase()) ? p : [...p, name]));
    setCustom(''); setError('');
  };
  const extra = picked.filter((n) => !AREA_PRESETS.includes(n));

  const submit = async (e) => {
    e.preventDefault();
    if (!picked.length) { setError(t('Pick at least one area.', 'Valitse vähintään yksi tila.')); return; }
    setBusy(true);
    await onSubmit(picked.map((name) => ({ number: name, floor: 0, type: AREA_TYPE, status: 'Ready', kind: 'area' })));
    setBusy(false);
  };

  return (
    <form onSubmit={submit} noValidate className="p-5 space-y-4">
      <div>
        <p className="text-xs font-semibold text-slate-700 mb-2" id="aa-label">{t('Which areas does your hotel have?', 'Mitä yleisiä tiloja hotellissasi on?')}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="aa-label">
          {[...AREA_PRESETS, ...extra].map((name) => (
            <button key={name} type="button" onClick={() => toggle(name)} aria-pressed={picked.includes(name)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${picked.includes(name) ? 'bg-[#0B0B0F] text-white' : 'bg-[#F4F5F7] text-slate-700 hover:bg-[#E4E6EB]'}`}>{areaLabel(name)}</button>
          ))}
        </div>
      </div>
      <Field id="aa-custom" label={t('Something else?', 'Jotain muuta?')} error={error}>
        <div className="flex gap-2">
          <input id="aa-custom" className={inputCls} value={custom} placeholder={t('e.g. Rooftop bar', 'esim. Kattobaari')} onChange={(e) => { setCustom(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} />
          <button type="button" className={btnGhost} onClick={addCustom}>{t('Add', 'Lisää')}</button>
        </div>
      </Field>
      <p className="text-sm text-slate-600 bg-[#F4F5F7] rounded-2xl px-3.5 py-2.5">{picked.length ? t(`This adds ${picked.length} common area${picked.length > 1 ? 's' : ''}.`, `Tämä lisää ${picked.length} yleistä tilaa.`) : t('Pick the areas your team cleans.', 'Valitse tilat, joita tiimisi siivoaa.')}</p>
      <div className="flex gap-3"><button type="button" className={`${btnGhost} flex-1`} onClick={onClose}>{t('Cancel', 'Peruuta')}</button><button type="submit" className={`${btnPrimary} flex-1`} disabled={busy}>{busy ? t('Adding…', 'Lisätään…') : t('Add areas', 'Lisää tilat')}</button></div>
    </form>
  );
}

function IssueModal({ rooms, initialRoomId, onClose, onSubmit }) {
  const [f, setF] = useState({ roomId: initialRoomId, title: '', priority: 'normal' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (f.title.trim().length < 3) { setError(t('Describe the problem in a few words.', 'Kuvaa vika muutamalla sanalla.')); return; }
    setBusy(true);
    await onSubmit({ roomId: f.roomId || null, title: f.title.trim(), priority: f.priority });
    setBusy(false);
  };
  return (
    <Modal title={t('Report an issue', 'Ilmoita vika')} onClose={onClose}>
      <form onSubmit={submit} noValidate className="p-5 space-y-4">
        <Field id="is-room" label={t('Where', 'Missä')}><WherePicker id="is-room" rooms={rooms} value={f.roomId} onChange={(v) => setF({ ...f, roomId: v })} /></Field>
        <Field id="is-title" label={t('What is wrong?', 'Mikä on vialla?')} error={error}><input id="is-title" className={inputCls} value={f.title} onChange={(e) => { setF({ ...f, title: e.target.value }); setError(''); }} placeholder={t('e.g. Shower is leaking', 'esim. Suihku vuotaa')} /></Field>
        <Field id="is-prio" label={t('Priority', 'Kiireellisyys')}><select id="is-prio" className={inputCls} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
          <option value="urgent">{priorityLabel('urgent')}</option><option value="high">{priorityLabel('high')}</option><option value="normal">{priorityLabel('normal')}</option><option value="low">{priorityLabel('low')}</option></select></Field>
        <div className="flex gap-3"><button type="button" className={`${btnGhost} flex-1`} onClick={onClose}>{t('Cancel', 'Peruuta')}</button><button type="submit" className={`${btnPrimary} flex-1`} disabled={busy}>{busy ? t('Saving…', 'Tallennetaan…') : t('Report issue', 'Ilmoita vika')}</button></div>
      </form>
    </Modal>
  );
}

const randomPin = () => String(Math.floor(1000 + Math.random() * 9000));

function StaffModal({ role = 'housekeeper', hotelCode, onClose, onCreate }) {
  const noun = role === 'maintenance' ? t('maintenance person', 'huoltohenkilö') : t('housekeeper', 'siivooja');
  const [f, setF] = useState({ fullName: '', username: '', pin: randomPin() });
  const [touched, setTouched] = useState(false); // se a pessoa já editou o username à mão
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);

  const setName = (v) => {
    const auto = v.trim().split(/\s+/)[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
    setF({ ...f, fullName: v, username: touched ? f.username : auto });
    setError('');
  };
  const submit = async (e) => {
    e.preventDefault();
    if (f.fullName.trim().length < 2) { setError(t('Enter the full name.', 'Anna koko nimi.')); return; }
    if (!/^[a-z0-9._-]{2,20}$/.test(f.username.trim().toLowerCase())) { setError(t('Username: 2 to 20 letters or numbers.', 'Käyttäjätunnus: 2–20 kirjainta tai numeroa.')); return; }
    if (!/^[0-9]{4}$/.test(f.pin)) { setError(t('The PIN must have exactly 4 digits.', 'PIN-koodissa on oltava tasan 4 numeroa.')); return; }
    setBusy(true);
    const err = await onCreate({ fullName: f.fullName, username: f.username, pin: f.pin, role });
    setBusy(false);
    if (err) setError(err); else setCreated({ ...f, username: f.username.trim().toLowerCase() });
  };

  if (created) {
    const text = t(`Lodgora sign in\nWebsite: ${location.origin}/app\nHotel code: ${hotelCode}\nUsername: ${created.username}\nPIN: ${created.pin}`, `Lodgora-kirjautuminen\nVerkkosivu: ${location.origin}/app\nHotellin koodi: ${hotelCode}\nKäyttäjätunnus: ${created.username}\nPIN-koodi: ${created.pin}`);
    return (
      <Modal title={t(`${created.fullName} was added`, `${created.fullName} lisättiin`)} subtitle={t('Give these details to your colleague. You can see the PIN again any time in Team.', 'Anna nämä tiedot työkaverillesi. Näet PIN-koodin milloin tahansa Tiimi-sivulla.')} onClose={onClose}>
        <div className="p-5 space-y-4">
          <dl className="bg-[#F4F5F7] rounded-2xl p-4 grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
            <dt className="text-slate-500">{t('Hotel code', 'Hotellin koodi')}</dt><dd className="font-mono font-semibold">{hotelCode}</dd>
            <dt className="text-slate-500">{t('Username', 'Käyttäjätunnus')}</dt><dd className="font-mono font-semibold">{created.username}</dd>
            <dt className="text-slate-500">{t('PIN', 'PIN-koodi')}</dt><dd className="font-mono font-semibold tracking-widest">{created.pin}</dd>
          </dl>
          <div className="flex gap-3 items-center"><CopyButton text={text} label={t('Copy all', 'Kopioi kaikki')} /><span className="flex-1"></span><button className={btnPrimary} onClick={onClose}>{t('Done', 'Valmis')}</button></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={role === 'maintenance' ? t('Add maintenance person', 'Lisää huoltohenkilö') : t('Add housekeeper', 'Lisää siivooja')} subtitle={t('They sign in on their phone with the hotel code, username and PIN.', 'He kirjautuvat puhelimellaan hotellin koodilla, käyttäjätunnuksella ja PIN-koodilla.')} onClose={onClose}>
      <form onSubmit={submit} noValidate className="p-5 space-y-4">
        <Field id="st-name" label={t('Full name', 'Koko nimi')}><input id="st-name" className={inputCls} value={f.fullName} onChange={(e) => setName(e.target.value)} autoComplete="off" /></Field>
        <Field id="st-user" label={t('Username', 'Käyttäjätunnus')} hint={t('Lowercase letters or numbers. Filled in for you.', 'Pieniä kirjaimia tai numeroita. Täytetty puolestasi.')}>
          <input id="st-user" className={`${inputCls} font-mono`} value={f.username} autoCapitalize="none" onChange={(e) => { setTouched(true); setF({ ...f, username: e.target.value }); setError(''); }} />
        </Field>
        <Field id="st-pin" label={t('4-digit PIN', 'Nelinumeroinen PIN-koodi')} error={error}>
          <div className="flex gap-2">
            <input id="st-pin" className={`${inputCls} font-mono text-lg tracking-[0.4em]`} inputMode="numeric" maxLength={4} value={f.pin} onChange={(e) => { setF({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }); setError(''); }} />
            <button type="button" className={btnGhost} onClick={() => setF({ ...f, pin: randomPin() })} aria-label={t('Generate a new PIN', 'Luo uusi PIN-koodi')}><Icon name="shuffle" className="w-4 h-4" /></button>
          </div>
        </Field>
        <div className="flex gap-3"><button type="button" className={`${btnGhost} flex-1`} onClick={onClose}>{t('Cancel', 'Peruuta')}</button><button type="submit" className={`${btnPrimary} flex-1`} disabled={busy}>{busy ? t('Adding…', 'Lisätään…') : (role === 'maintenance' ? t('Add maintenance person', 'Lisää huoltohenkilö') : t('Add housekeeper', 'Lisää siivooja'))}</button></div>
      </form>
    </Modal>
  );
}

function PinModal({ staff, onClose, onSave }) {
  const [pin, setPin] = useState(randomPin());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!staff) return null;
  const submit = async (e) => {
    e.preventDefault();
    if (!/^[0-9]{4}$/.test(pin)) { setError(t('The PIN must have exactly 4 digits.', 'PIN-koodissa on oltava tasan 4 numeroa.')); return; }
    setBusy(true);
    const err = await onSave(staff.id, pin);
    setBusy(false);
    if (err) setError(err); else onClose();
  };
  return (
    <Modal title={t(`New PIN for ${staff.fullName}`, `Uusi PIN-koodi henkilölle ${staff.fullName}`)} subtitle={t('They will be signed out and must use the new PIN.', 'Heidät kirjataan ulos, ja heidän on käytettävä uutta PIN-koodia.')} onClose={onClose}>
      <form onSubmit={submit} noValidate className="p-5 space-y-4">
        <Field id="pn-pin" label={t('4-digit PIN', 'Nelinumeroinen PIN-koodi')} error={error}>
          <div className="flex gap-2">
            <input id="pn-pin" className={`${inputCls} font-mono text-lg tracking-[0.4em]`} inputMode="numeric" maxLength={4} value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }} />
            <button type="button" className={btnGhost} onClick={() => setPin(randomPin())} aria-label={t('Generate a new PIN', 'Luo uusi PIN-koodi')}><Icon name="shuffle" className="w-4 h-4" /></button>
          </div>
        </Field>
        <div className="flex gap-3"><button type="button" className={`${btnGhost} flex-1`} onClick={onClose}>{t('Cancel', 'Peruuta')}</button><button type="submit" className={`${btnPrimary} flex-1`} disabled={busy}>{busy ? t('Saving…', 'Tallennetaan…') : t('Save PIN', 'Tallenna PIN-koodi')}</button></div>
      </form>
    </Modal>
  );
}
