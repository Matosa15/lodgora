// Painel do gerente: dashboard, quartos, inspeções, avarias, equipa e definições.
import { useMemo, useState } from 'react';
import { backend } from '../lib/backend';
import { useHotelData } from '../lib/useHotelData';
import {
  AREA_PRESETS, AREA_TYPE, ISSUE_STATUS_LABEL, PRIORITY_STYLE, ROOM_TYPES, STATUSES, STATUS_STYLE, initials, isArea, minutesLabel, spaceInline, spaceName, statusLabel, timeAgo, timeOfDay
} from '../lib/constants';
import {
  CleanTimer, CopyButton, EmptyState, Field, Icon, LogoMark, Modal, Panel, Spinner, StatusBadge,
  btnGhost, btnPrimary, btnSmall, inputCls, useToast
} from '../components/ui';
import Statistics from './Statistics';

const NAV = [
  { group: 'Main', items: [
    { name: 'Dashboard', icon: 'dashboard' },
    { name: 'Rooms', label: 'Rooms & areas', icon: 'bed', badge: 'rooms' },
    { name: 'Inspections', icon: 'inspect', badge: 'inspection' },
    { name: 'Maintenance', icon: 'wrench', badge: 'issues', alert: true }
  ] },
  { group: 'Management', items: [{ name: 'Statistics', icon: 'chart' }, { name: 'Team', icon: 'users' }] },
  { group: 'Settings', items: [{ name: 'Settings', icon: 'settings' }] }
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
  const openIssues = d.issues.filter((i) => i.status !== 'resolved');
  const count = (s) => rooms.filter((r) => r.status === s).length;
  const onlyRooms = rooms.filter((r) => !isArea(r));
  const hasAreas = rooms.some(isArea);
  const stats = {
    total: onlyRooms.length,
    spaces: rooms.length,
    ready: onlyRooms.filter((r) => r.status === 'Ready').length,
    cleaning: count('Dirty') + count('Cleaning'),
    inspection: count('Awaiting inspection'),
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
    catch (e) { toast(e.message || 'Something went wrong', 'error'); return false; }
  };

  const actions = {
    setStatus: (room, status, msg) => act(async () => {
      await m.rooms.update(room.id, { status });
      await m.activity.add(msg || `${spaceName(room)} marked ${statusLabel(status).toLowerCase()}`);
    }, `${spaceName(room)}: ${statusLabel(status)}`),
    approve: (room) => actions.setStatus(room, 'Ready', `${spaceName(room)} approved`),
    sendBack: (room) => actions.setStatus(room, 'Dirty', `${spaceName(room)} sent back for cleaning`),
    setDetails: (room, patch) => act(() => m.rooms.update(room.id, patch), `${spaceName(room)} updated`),
    assign: (room, staffId) => act(async () => {
      await m.rooms.update(room.id, { assignedTo: staffId || null });
      await m.activity.add(staffId ? `${spaceName(room)} assigned to ${staffById[staffId].fullName}` : `${spaceName(room)} unassigned`);
    }, staffId ? `${spaceName(room)} assigned to ${staffById[staffId].fullName}` : `${spaceName(room)} unassigned`),
    // Rotina diária das partes comuns: põe-nas todas na lista de limpeza
    requestAreaCleaning: async () => {
      const todo = rooms.filter((r) => isArea(r) && r.status === 'Ready');
      if (!todo.length) { toast('No common area is ready to be cleaned again.'); return; }
      await act(async () => {
        for (const r of todo) await m.rooms.update(r.id, { status: 'Dirty' });
        await m.activity.add(`${todo.length} common area${todo.length > 1 ? 's' : ''} put on the cleaning list`);
      }, `${todo.length} common area${todo.length > 1 ? 's' : ''} need cleaning`);
    },
    distribute: async () => {
      if (!housekeepers.length) { toast('Add housekeepers in Team first.', 'error'); return; }
      const todo = rooms.filter((r) => r.status === 'Dirty' && !r.assignedTo);
      if (!todo.length) { toast('Everything that needs cleaning already has someone assigned.'); return; }
      const load = Object.fromEntries(housekeepers.map((s) => [s.id,
        rooms.filter((r) => r.assignedTo === s.id && (r.status === 'Dirty' || r.status === 'Cleaning')).length]));
      await act(async () => {
        for (const r of todo) {
          const best = housekeepers.reduce((a, b) => (load[b.id] < load[a.id] ? b : a));
          await m.rooms.update(r.id, { assignedTo: best.id });
          load[best.id] += 1;
        }
        await m.activity.add(`${todo.length} cleaning task${todo.length > 1 ? 's' : ''} assigned automatically`);
      }, `${todo.length} task${todo.length > 1 ? 's' : ''} assigned`);
    },
    addRooms: (list) => {
      const noun = isArea(list[0]) ? 'common area' : 'room';
      const text = `${list.length} ${noun}${list.length > 1 ? 's' : ''} added`;
      return act(async () => { await m.rooms.create(list); await m.activity.add(text); }, text);
    },
    createIssue: (issue) => act(async () => {
      await m.issues.create(issue);
      const room = rooms.find((r) => r.id === issue.roomId);
      await m.activity.add(`Issue reported${room ? ' in ' + spaceInline(room) : ''}: ${issue.title}`);
    }, 'Issue reported'),
    setIssueStatus: (issue, status) => act(async () => {
      await m.issues.setStatus(issue.id, status);
      if (status === 'resolved') await m.activity.add(`Issue resolved${issue.roomInline ? ' in ' + issue.roomInline : ''}: ${issue.title}`);
    }, status === 'resolved' ? 'Issue resolved' : 'Issue updated'),
    createStaff: async (s) => { try { await m.staff.create(s); await d.reload(); return null; } catch (e) { return e.message; } },
    setPin: async (id, pin) => { try { await m.staff.setPin(id, pin); toast('PIN changed'); return null; } catch (e) { return e.message; } },
    setActive: (s, active) => act(() => m.staff.setActive(s.id, active), active ? `${s.fullName} can sign in again` : `${s.fullName} can no longer sign in`)
  };

  const pageTitle = page === 'Rooms' ? 'Rooms & areas' : page;
  const go = (p) => { setPage(p); setMenuOpen(false); window.scrollTo(0, 0); };
  const roomModal = modal?.type === 'room' ? rooms.find((r) => r.id === modal.id) : null;

  let body;
  if (d.status === 'loading') body = <Spinner label="Loading your hotel" />;
  else if (d.status === 'error') {
    body = (
      <Panel title="We could not load your hotel">
        <EmptyState icon="alert" title="Connection problem" text={d.error}>
          <button className={btnPrimary} onClick={d.reload}>Try again</button>
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
      <ReadinessPanel title="Rooms and common areas" subtitle={`${stats.total} room${stats.total === 1 ? '' : 's'}${hasAreas ? ` and ${stats.spaces - stats.total} common area${stats.spaces - stats.total === 1 ? '' : 's'}` : ''}`} rooms={fRooms} search={search}
        hasAreas={hasAreas} kindFilter={kindFilter} setKindFilter={setKindFilter} onRequestAreas={actions.requestAreaCleaning}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter} openRoom={(id) => setModal({ type: 'room', id })}
        onAdd={() => setModal({ type: 'addRooms' })} onDistribute={actions.distribute} showAddWhenEmpty />
    );
  } else if (page === 'Inspections') {
    body = <Inspections rooms={fRooms.filter((r) => r.status === 'Awaiting inspection')} actions={actions} />;
  } else if (page === 'Maintenance') {
    body = <Maintenance issues={fIssues} onReport={() => setModal({ type: 'issue' })} actions={actions} />;
  } else if (page === 'Statistics') {
    body = <Statistics rooms={rooms} issues={d.issues} />;
  } else if (page === 'Team') {
    body = <Team staff={fStaff} rooms={rooms} hotel={session.hotel} setModal={setModal} actions={actions} />;
  } else {
    body = <SettingsPage session={session} signOut={signOut} />;
  }

  const subtitle = {
    Dashboard: "Here is your hotel's operational overview for today.",
    Rooms: 'Every room and common area, and who is cleaning it.',
    Statistics: 'How your team is doing: cleaning times, quality and maintenance.',
    Inspections: 'Rooms and areas that were cleaned and need your approval.',
    Maintenance: 'Problems reported by your team.',
    Team: 'Your housekeepers and how they sign in.',
    Settings: 'Your hotel and your account.'
  }[page];

  return (
    <div className="min-h-screen">
      {/* Barra lateral */}
      <aside className={`fixed inset-y-0 left-0 w-60 bg-white border-r border-slate-200 flex flex-col z-40 transition-transform lg:translate-x-0 ${menuOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'}`} aria-label="Main navigation">
        <div className="h-16 flex items-center gap-2 px-6 border-b border-slate-100 pt-safe">
          <LogoMark />
          <span className="font-bold text-xl tracking-tight text-[#172B4D]">Lodgora</span>
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
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-[#172B4D] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                      <span className="flex items-center gap-3"><Icon name={it.icon} className={`w-[18px] h-[18px] ${active ? 'text-[#19A7A1]' : ''}`} />{it.label || it.name}</span>
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
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <p className="text-xs font-semibold text-[#172B4D] truncate">{session.hotel.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">Hotel code <span className="font-mono font-semibold">{session.hotel.code}</span></p>
            {backend.mode === 'demo' && <p className="text-[11px] text-amber-700 mt-1">Demo data</p>}
          </div>
        </div>
      </aside>
      {menuOpen && <div className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden" onClick={() => setMenuOpen(false)}></div>}

      <div className="lg:ml-60 min-w-0">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 pt-safe">
          <div className="h-16 flex items-center gap-3 px-4 sm:px-8">
            <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="lg:hidden w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600">
              <Icon name="menu" />
            </button>
            <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-3 whitespace-nowrap text-sm">
              <span className="font-medium text-slate-400">{session.hotel.name}</span><span className="text-slate-300">/</span>
              <span className="font-semibold text-[#172B4D]">{pageTitle}</span>
            </nav>
            <div className="flex items-center gap-3 ml-auto min-w-0">
              <div className="relative min-w-0">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Icon name="search" className="w-4 h-4" /></span>
                <label htmlFor="search" className="sr-only">Search rooms, issues and team</label>
                <input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search rooms, staff…"
                  className="w-full sm:w-64 pl-9 pr-8 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-[#19A7A1]" />
                {search && (
                  <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                    <Icon name="x" className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button className={`${btnPrimary} hidden sm:inline-flex`} onClick={() => setModal({ type: 'issue' })}><Icon name="plus" className="w-4 h-4" />Report issue</button>
              <div className="hidden md:flex items-center gap-3 pl-3 border-l border-slate-200">
                <span className="w-9 h-9 rounded-full bg-[#172B4D] text-white text-sm font-medium flex items-center justify-center" aria-hidden="true">{initials(session.name)}</span>
                <div className="leading-tight"><p className="text-xs font-semibold">{session.name}</p><p className="text-[11px] text-slate-500">Manager</p></div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-8 max-w-[1400px] space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#172B4D]">{page === 'Dashboard' ? `Good ${greeting()}, ${session.name.split(' ')[0]}` : pageTitle}</h1>
              <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
            </div>
            <button className={`${btnPrimary} sm:hidden`} onClick={() => setModal({ type: 'issue' })}><Icon name="plus" className="w-4 h-4" />Report issue</button>
          </div>
          {body}
        </main>
      </div>

      {roomModal && <RoomModal room={roomModal} staff={housekeepers} issues={d.issues.filter((i) => i.roomId === roomModal.id && i.status !== 'resolved')}
        actions={actions} onClose={() => setModal(null)} onReport={() => setModal({ type: 'issue', roomId: roomModal.id })} />}
      {modal?.type === 'addRooms' && <AddSpacesModal onClose={() => setModal(null)} onSubmit={async (list) => { if (await actions.addRooms(list)) setModal(null); }} />}
      {modal?.type === 'issue' && <IssueModal rooms={rooms} initialRoomId={modal.roomId || ''} onClose={() => setModal(null)} onSubmit={async (i) => { if (await actions.createIssue(i)) setModal(null); }} />}
      {modal?.type === 'staff' && <StaffModal hotelCode={session.hotel.code} onClose={() => setModal(null)} onCreate={actions.createStaff} />}
      {modal?.type === 'pin' && <PinModal staff={d.staff.find((s) => s.id === modal.id)} onClose={() => setModal(null)} onSave={actions.setPin} />}
    </div>
  );
}

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; };

/* ---------------- Dashboard ---------------- */

function Dashboard({ stats, rooms, allRooms, hasAreas, kindFilter, setKindFilter, staff, issues, activity, search, statusFilter, setStatusFilter, go, hotel, openRoom, actions, setModal }) {
  const attention = [
    ...issues.filter((i) => i.priority === 'urgent').map((i) => ({ key: 'u' + i.id, kind: 'issue', issue: i, priority: 'urgent' })),
    ...issues.filter((i) => i.priority === 'high').map((i) => ({ key: 'h' + i.id, kind: 'issue', issue: i, priority: 'high' })),
    ...allRooms.filter((r) => r.status === 'Awaiting inspection').map((r) => ({ key: 'r' + r.id, kind: 'inspection', room: r, priority: 'high' }))
  ];
  const setupDone = [allRooms.length > 0, staff.length > 0];
  const showSetup = !setupDone[0] || !setupDone[1];

  const cards = [
    { label: 'Rooms ready', value: stats.ready, caption: `/ ${stats.total}`, icon: 'check', tone: 'bg-emerald-50 text-emerald-600', onClick: () => { setStatusFilter('Ready'); } },
    { label: 'Cleaning pending', value: stats.cleaning, caption: 'to clean', icon: 'sparkles', tone: 'bg-blue-50 text-blue-600', onClick: () => { setStatusFilter('Dirty'); } },
    { label: 'Awaiting inspection', value: stats.inspection, caption: 'to check', icon: 'inspect', tone: 'bg-amber-50 text-amber-600', onClick: () => go('Inspections') },
    { label: 'Open maintenance', value: stats.issues, caption: 'issues', icon: 'wrench', tone: 'bg-rose-50 text-rose-600', onClick: () => go('Maintenance') }
  ];

  return (
    <>
      {showSetup && (
        <section className="rounded-xl border border-[#19A7A1]/40 bg-teal-50/60 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[#172B4D]">Let's set up your hotel</h2>
          <p className="text-sm text-slate-600 mt-1">Two quick steps and your team can start using Lodgora.</p>
          <ol className="mt-4 space-y-3">
            <li className="flex flex-wrap items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${setupDone[0] ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-300 text-slate-500'}`}>{setupDone[0] ? <Icon name="check" className="w-3.5 h-3.5" /> : '1'}</span>
              <span className="text-sm font-medium flex-1 min-w-[12rem]">Add your rooms</span>
              {!setupDone[0] && <button className={btnPrimary} onClick={() => setModal({ type: 'addRooms' })}>Add rooms</button>}
            </li>
            <li className="flex flex-wrap items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${setupDone[1] ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-300 text-slate-500'}`}>{setupDone[1] ? <Icon name="check" className="w-3.5 h-3.5" /> : '2'}</span>
              <span className="text-sm font-medium flex-1 min-w-[12rem]">Add your housekeepers and give each one a PIN</span>
              {!setupDone[1] && <button className={btnPrimary} onClick={() => setModal({ type: 'staff' })}>Add housekeeper</button>}
            </li>
          </ol>
          <p className="text-xs text-slate-500 mt-4">Your team signs in with the hotel code <span className="font-mono font-semibold">{hotel.code}</span>, their username and PIN.</p>
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c) => (
          <button key={c.label} onClick={c.onClick} className="text-left bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 shadow-sm flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{c.label}</p>
              <p className="flex items-baseline gap-2 mt-1"><span className="text-2xl font-bold text-[#172B4D] tabular-nums">{c.value}</span><span className="text-xs text-slate-400">{c.caption}</span></p>
            </div>
            <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-none ${c.tone}`}><Icon name={c.icon} /></span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 min-w-0">
          <ReadinessPanel title="Rooms and areas" subtitle="Live status of every room and common area" rooms={rooms} search={search}
            hasAreas={hasAreas} kindFilter={kindFilter} setKindFilter={setKindFilter} onRequestAreas={actions.requestAreaCleaning}
            statusFilter={statusFilter} setStatusFilter={setStatusFilter} openRoom={openRoom}
            onAdd={() => setModal({ type: 'addRooms' })} onDistribute={actions.distribute} />
        </div>

        <Panel title="Needs attention" subtitle={`${attention.length} item${attention.length === 1 ? '' : 's'}`}>
          {attention.length === 0 ? (
            <EmptyState icon="check" title="Nothing needs attention" text="No urgent issues and no rooms waiting for inspection." />
          ) : (
            <ul className="px-5 sm:px-6 pb-4">
              {attention.map((it) => (
                <li key={it.key} className="flex gap-3 py-3 border-t border-slate-100 first:border-0">
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-none ${it.kind === 'issue' ? (it.priority === 'urgent' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700') : 'bg-amber-50 text-amber-700'}`}>
                    <Icon name={it.kind === 'issue' ? 'wrench' : 'inspect'} className="w-[18px] h-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{it.kind === 'issue' ? it.issue.title : `${spaceName(it.room)} needs inspection`}</p>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${PRIORITY_STYLE[it.priority]}`}>{it.priority}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {it.kind === 'issue'
                        ? `${it.issue.roomLabel ? it.issue.roomLabel + ' · ' : ''}${it.issue.reportedBy} · ${timeAgo(it.issue.createdAt)}`
                        : `Cleaned by ${it.room.assignee || 'unknown'}${it.room.cleanSeconds > 0 ? ' in ' + minutesLabel(it.room.cleanSeconds) : ''}`}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {it.kind === 'inspection'
                        ? <button className={`${btnSmall} bg-[#0D7C77] text-white hover:bg-[#0A6A66]`} onClick={() => actions.approve(it.room)}>Approve</button>
                        : <button className={`${btnSmall} bg-[#0D7C77] text-white hover:bg-[#0A6A66]`} onClick={() => actions.setIssueStatus(it.issue, 'resolved')}>Mark resolved</button>}
                      {(it.kind === 'inspection' || it.issue.roomId) && (
                        <button className={`${btnSmall} border border-slate-200 hover:bg-slate-50`} onClick={() => openRoom(it.kind === 'inspection' ? it.room.id : it.issue.roomId)}>Open</button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="xl:col-span-2 min-w-0">
          <Panel title="Today's activity" subtitle="Latest updates across the hotel">
            {activity.length === 0 ? (
              <EmptyState title="No activity yet" text={search ? `Nothing matches "${search}".` : 'Updates from your team will show up here.'} />
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

        <Panel title="Team overview" subtitle={`${staff.filter((s) => s.active).length} active housekeeper${staff.filter((s) => s.active).length === 1 ? '' : 's'}`}
          right={<button className={`${btnSmall} border border-slate-200 hover:bg-slate-50`} onClick={() => go('Team')}>Manage</button>}>
          {staff.length === 0 ? (
            <EmptyState icon="users" title="No team yet" text="Add your housekeepers so you can assign rooms.">
              <button className={btnPrimary} onClick={() => setModal({ type: 'staff' })}>Add housekeeper</button>
            </EmptyState>
          ) : (
            <ul className="px-5 sm:px-6 pb-4">
              {staff.filter((s) => s.active).map((s) => {
                const mine = allRooms.filter((r) => r.assignedTo === s.id);
                const todo = mine.filter((r) => r.status === 'Dirty' || r.status === 'Cleaning').length;
                return (
                  <li key={s.id} className="flex items-center gap-3 py-2">
                    <span className="w-9 h-9 rounded-full bg-[#172B4D] text-white text-xs font-semibold flex items-center justify-center flex-none" aria-hidden="true">{initials(s.fullName)}</span>
                    <div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate">{s.fullName}</p><p className="text-xs text-slate-500">Housekeeper</p></div>
                    <p className="text-xs text-slate-500 text-right tabular-nums">{todo} to clean<br />{mine.length} assigned</p>
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
  const small = `${btnSmall} border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-1.5`;
  return (
    <Panel title={title} subtitle={subtitle}
      right={
        <div className="flex flex-wrap gap-2">
          {hasAreas && <button className={small} onClick={onRequestAreas}><Icon name="sparkles" className="w-3.5 h-3.5" />Request area cleaning</button>}
          <button className={small} onClick={onDistribute}><Icon name="shuffle" className="w-3.5 h-3.5" />Assign cleaning</button>
          <button className={small} onClick={onAdd}><Icon name="plus" className="w-3.5 h-3.5" />Add rooms or areas</button>
        </div>
      }>
      {hasAreas && (
        <div className="px-5 sm:px-6 pb-3 flex gap-1.5" role="group" aria-label="Show rooms or common areas">
          {[['all', 'Everything'], ['room', 'Rooms'], ['area', 'Common areas']].map(([id, label]) => (
            <button key={id} onClick={() => setKindFilter(id)} aria-pressed={kindFilter === id}
              className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-colors ${kindFilter === id ? 'bg-[#0D7C77] border-[#0D7C77] text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{label}</button>
          ))}
        </div>
      )}
      <div className="px-5 sm:px-6 pb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
        {filters.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} aria-pressed={statusFilter === s}
            className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${statusFilter === s ? 'bg-[#172B4D] border-[#172B4D] text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {s === 'All' ? 'All' : statusLabel(s)} <span className="ml-1 font-semibold tabular-nums">{s === 'All' ? rooms.length : rooms.filter((r) => r.status === s).length}</span>
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <EmptyState icon="bed" title={rooms.length === 0 && !search ? 'Nothing here yet' : 'Nothing found'}
          text={search ? `Nothing matches "${search}".` : rooms.length === 0 ? 'Add your rooms and common areas to start tracking them.' : 'Nothing with this status.'}>
          {rooms.length === 0 && !search && <button className={btnPrimary} onClick={onAdd}>Add rooms or areas</button>}
          {(statusFilter !== 'All') && <button className={btnGhost} onClick={() => setStatusFilter('All')}>Show everything</button>}
        </EmptyState>
      ) : (
        <div className="px-5 sm:px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
          {shown.map((r) => (
            <button key={r.id} onClick={() => openRoom(r.id)} aria-label={`${spaceName(r)}, ${r.type}, ${statusLabel(r.status)}`}
              className={`text-left bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 border-t-[3px] ${STATUS_STYLE[r.status].bar} rounded-xl p-4 transition-colors flex flex-col gap-3 min-w-0`}>
              <div><span className="text-base font-bold text-[#172B4D]">{spaceName(r)}</span><p className="text-xs text-slate-500">{r.type}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={r.status} />
                {r.status === 'Cleaning' && (
                  <span className={`inline-flex items-center gap-1 text-xs ${r.cleanRunningSince ? 'text-blue-700' : 'text-slate-500'}`}>
                    <Icon name="timer" className="w-3.5 h-3.5" /><CleanTimer room={r} />{!r.cleanRunningSince && <span>paused</span>}
                  </span>
                )}
              </div>
              <p className="pt-3 border-t border-slate-200/70 text-xs text-slate-500 truncate">{r.assignee ? `Staff: ${r.assignee}` : 'Not assigned'}</p>
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ---------------- Inspeções ---------------- */

function Inspections({ rooms, actions }) {
  return (
    <Panel title="Awaiting inspection" subtitle={`${rooms.length} item${rooms.length === 1 ? '' : 's'}`}>
      {rooms.length === 0 ? (
        <EmptyState icon="check" title="Nothing to inspect" text="Rooms and areas appear here when a housekeeper finishes cleaning them." />
      ) : (
        <ul className="px-5 sm:px-6 pb-4 divide-y divide-slate-100">
          {rooms.map((r) => (
            <li key={r.id} className="py-4 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1 basis-48"><p className="font-bold text-[#172B4D]">{spaceName(r)}</p><p className="text-xs text-slate-500">{r.type} · cleaned by {r.assignee || 'unknown'}{r.cleanSeconds > 0 && ` in ${minutesLabel(r.cleanSeconds)}`}</p></div>
              <div className="flex gap-2">
                <button className={btnGhost} onClick={() => actions.sendBack(r)}>Send back</button>
                <button className={btnPrimary} onClick={() => actions.approve(r)}><Icon name="check" className="w-4 h-4" />Approve</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------------- Manutenção ---------------- */

function Maintenance({ issues, onReport, actions }) {
  const [filter, setFilter] = useState('open');
  const list = issues.filter((i) => filter === 'all' || i.status !== 'resolved');
  const order = { urgent: 0, high: 1, normal: 2, low: 3 };
  list.sort((a, b) => (a.status === 'resolved') - (b.status === 'resolved') || order[a.priority] - order[b.priority]);
  return (
    <Panel title="Issues" subtitle="Reported by your team" right={<button className={btnPrimary} onClick={onReport}><Icon name="plus" className="w-4 h-4" />Report issue</button>}>
      <div className="px-5 sm:px-6 pb-4 flex gap-1.5">
        {[['open', 'Open'], ['all', 'All']].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} aria-pressed={filter === id}
            className={`px-3 py-1 rounded-full border text-xs font-medium ${filter === id ? 'bg-[#172B4D] border-[#172B4D] text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{label}</button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState icon="check" title="No issues" text="Problems reported by your team will appear here." />
      ) : (
        <ul className="px-5 sm:px-6 pb-4 divide-y divide-slate-100">
          {list.map((i) => (
            <li key={i.id} className={`py-4 flex flex-wrap items-start gap-3 ${i.status === 'resolved' ? 'opacity-60' : ''}`}>
              <div className="min-w-0 flex-1 basis-56">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-sm">{i.title}</p>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${PRIORITY_STYLE[i.priority]}`}>{i.priority}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{i.roomLabel ? `${i.roomLabel} · ` : ''}{i.reportedBy} · {timeAgo(i.createdAt)} · {ISSUE_STATUS_LABEL[i.status]}</p>
              </div>
              <div className="flex gap-2">
                {i.status === 'open' && <button className={`${btnSmall} border border-slate-200 hover:bg-slate-50`} onClick={() => actions.setIssueStatus(i, 'in_progress')}>Start work</button>}
                {i.status !== 'resolved' && <button className={`${btnSmall} bg-[#0D7C77] text-white hover:bg-[#0A6A66]`} onClick={() => actions.setIssueStatus(i, 'resolved')}>Resolve</button>}
                {i.status === 'resolved' && <button className={`${btnSmall} border border-slate-200 hover:bg-slate-50`} onClick={() => actions.setIssueStatus(i, 'open')}>Reopen</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------------- Equipa ---------------- */

function Team({ staff, rooms, hotel, setModal, actions }) {
  return (
    <>
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 basis-64">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hotel code</p>
          <p className="text-3xl font-bold font-mono tracking-widest text-[#172B4D] mt-1">{hotel.code}</p>
          <p className="text-sm text-slate-500 mt-1">Your team opens <span className="font-semibold text-slate-700">{location.origin}/app</span> on their phone and signs in with this code, their username and PIN.</p>
        </div>
        <CopyButton text={hotel.code} label="Copy code" />
        <CopyButton text={`${location.origin}/app`} label="Copy website address" />
      </section>

      <Panel title="Housekeepers" subtitle={`${staff.length} ${staff.length === 1 ? 'person' : 'people'}`}
        right={<button className={btnPrimary} onClick={() => setModal({ type: 'staff' })}><Icon name="plus" className="w-4 h-4" />Add housekeeper</button>}>
        {staff.length === 0 ? (
          <EmptyState icon="users" title="No housekeepers yet" text="Add each person and give them a 4-digit PIN." />
        ) : (
          <ul className="px-5 sm:px-6 pb-4 divide-y divide-slate-100">
            {staff.map((s) => <StaffRow key={s.id} s={s} hotel={hotel} assigned={rooms.filter((r) => r.assignedTo === s.id).length} setModal={setModal} actions={actions} />)}
          </ul>
        )}
      </Panel>
    </>
  );
}

function StaffRow({ s, hotel, assigned, setModal, actions }) {
  const [show, setShow] = useState(false);
  const details = `Lodgora sign in\nWebsite: ${location.origin}/app\nHotel code: ${hotel.code}\nUsername: ${s.username}\nPIN: ${s.pin}`;
  return (
    <li className={`py-3 flex flex-wrap items-center gap-3 ${s.active ? '' : 'opacity-60'}`}>
      <span className="w-10 h-10 rounded-full bg-[#172B4D] text-white text-sm font-semibold flex items-center justify-center flex-none" aria-hidden="true">{initials(s.fullName)}</span>
      <div className="min-w-0 flex-1 basis-40">
        <p className="font-semibold text-sm truncate">{s.fullName}{!s.active && <span className="ml-2 text-xs font-medium text-slate-500">(inactive)</span>}</p>
        <p className="text-xs text-slate-500">Username <span className="font-mono">{s.username}</span> · {assigned} {assigned === 1 ? 'room' : 'rooms'} assigned</p>
        <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2">
          {s.pin ? (
            <>
              <span>PIN</span>
              <span className="font-mono font-semibold tracking-widest text-[#172B4D] text-sm" data-testid={`pin-${s.username}`}>{show ? s.pin : '••••'}</span>
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? `Hide PIN of ${s.fullName}` : `Show PIN of ${s.fullName}`}
                className="inline-flex items-center gap-1 font-semibold text-[#0D7C77] hover:underline"><Icon name={show ? 'eyeoff' : 'eye'} className="w-3.5 h-3.5" />{show ? 'Hide' : 'Show'}</button>
              <CopyButton text={details} label="Copy login details" />
            </>
          ) : (
            <span>PIN was set before PINs could be shown. Use "Change PIN" once to see it here.</span>
          )}
        </p>
      </div>
      <div className="flex gap-2">
        <button className={`${btnSmall} border border-slate-200 hover:bg-slate-50`} onClick={() => setModal({ type: 'pin', id: s.id })}>Change PIN</button>
        <button className={`${btnSmall} border border-slate-200 hover:bg-slate-50`} onClick={() => actions.setActive(s, !s.active)}>{s.active ? 'Deactivate' : 'Activate'}</button>
      </div>
    </li>
  );
}

function SettingsPage({ session, signOut }) {
  return (
    <Panel title="Your hotel">
      <dl className="px-5 sm:px-6 pb-6 grid grid-cols-[8rem_minmax(0,1fr)] gap-y-3 gap-x-4 text-sm">
        <dt className="text-slate-500">Hotel</dt><dd className="font-medium">{session.hotel.name}</dd>
        <dt className="text-slate-500">Hotel code</dt><dd className="font-mono font-semibold">{session.hotel.code}</dd>
        <dt className="text-slate-500">Signed in as</dt><dd>{session.name}</dd>
        <dt className="text-slate-500">Data</dt><dd>{backend.mode === 'demo' ? 'Demo data stored only in this browser' : 'Live database'}</dd>
      </dl>
      <div className="px-5 sm:px-6 pb-6"><button className={btnGhost} onClick={signOut}><Icon name="logout" className="w-4 h-4" />Sign out</button></div>
    </Panel>
  );
}

/* ---------------- Janelas ---------------- */

function RoomModal({ room, staff, issues, actions, onClose, onReport }) {
  return (
    <Modal title={spaceName(room)} subtitle={isArea(room) ? 'Common area' : `${room.type} · Floor ${room.floor}`} onClose={onClose}>
      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between"><span className="text-xs text-slate-500">Current status</span><StatusBadge status={room.status} /></div>
        {room.status === 'Cleaning' && (
          <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5">
            <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5"><Icon name="timer" className="w-4 h-4" />{room.cleanRunningSince ? 'Cleaning time' : 'Paused at'}</span>
            <CleanTimer room={room} className="text-lg text-[#172B4D]" />
          </div>
        )}
        {room.status === 'Awaiting inspection' && room.cleanSeconds > 0 && (
          <p className="text-xs text-slate-500">Cleaned in {minutesLabel(room.cleanSeconds)}.</p>
        )}
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-2" id="rm-status">Change status</p>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="rm-status">
            {STATUSES.filter((s) => !(isArea(room) && s === 'Occupied')).map((s) => (
              <button key={s} aria-pressed={room.status === s} onClick={() => actions.setStatus(room, s)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${room.status === s ? 'bg-[#172B4D] text-white border-[#172B4D]' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>{statusLabel(s)}</button>
            ))}
          </div>
        </div>
        {!isArea(room) && <RoomDetails room={room} onSave={(patch) => actions.setDetails(room, patch)} />}
        <Field id="rm-staff" label="Assigned to">
          <select id="rm-staff" className={inputCls} value={room.assignedTo || ''} onChange={(e) => actions.assign(room, e.target.value)}>
            <option value="">Not assigned</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
          </select>
        </Field>
        {issues.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Open issues</p>
            <ul className="space-y-1.5">{issues.map((i) => <li key={i.id} className="text-sm flex items-center gap-2"><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${PRIORITY_STYLE[i.priority]}`}>{i.priority}</span>{i.title}</li>)}</ul>
          </div>
        )}
        <div className="flex gap-3 pt-1">
          <button className={`${btnGhost} flex-1`} onClick={onReport}><Icon name="wrench" className="w-4 h-4" />Report issue</button>
          <button className={`${btnPrimary} flex-1`} onClick={onClose}>Done</button>
        </div>
      </div>
    </Modal>
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
        {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        <option value="__custom">Other (type your own)…</option>
      </select>
      {custom && <input aria-label="Custom room type" className={inputCls} value={value} placeholder="e.g. Loft with terrace" onChange={(e) => onChange(e.target.value)} />}
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
        <Field id="rm-type" label="Room type"><RoomTypeSelect id="rm-type" value={type} onChange={setType} /></Field>
        <Field id="rm-floor" label="Floor"><input id="rm-floor" inputMode="numeric" className={inputCls} value={floor} onChange={(e) => setFloor(e.target.value)} /></Field>
      </div>
      {changed && <button className={`${btnGhost} w-full`} onClick={() => onSave({ type: type.trim(), floor: floorNum })}>Save type and floor</button>}
    </div>
  );
}

function AddSpacesModal({ onClose, onSubmit }) {
  const [tab, setTab] = useState('room');
  return (
    <Modal title="Add rooms or common areas" subtitle="Rooms and areas that already exist are skipped." onClose={onClose}>
      <div className="px-5 pt-4">
        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg" role="tablist">
          {[['room', 'Rooms'], ['area', 'Common areas']].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`py-1.5 rounded-md text-sm font-semibold transition-colors ${tab === id ? 'bg-white text-[#172B4D] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>
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
    if (!total) { setError('"To" must be a number equal to or higher than "From".'); return; }
    if (total > 200) { setError('Add up to 200 rooms at a time.'); return; }
    if (!f.type.trim()) { setError('Enter the room type.'); return; }
    setBusy(true);
    const list = Array.from({ length: total }, (_, i) => ({ number: String(from + i), floor: parseInt(f.floor, 10) || 1, type: f.type.trim(), status: 'Ready', kind: 'room' }));
    await onSubmit(list);
    setBusy(false);
  };

  return (
    <form onSubmit={submit} noValidate className="p-5 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Field id="ar-floor" label="Floor"><input id="ar-floor" inputMode="numeric" className={inputCls} value={f.floor} onChange={(e) => set('floor', e.target.value)} /></Field>
        <Field id="ar-from" label="From room"><input id="ar-from" inputMode="numeric" className={inputCls} value={f.from} onChange={(e) => set('from', e.target.value)} /></Field>
        <Field id="ar-to" label="To room"><input id="ar-to" inputMode="numeric" className={inputCls} value={f.to} onChange={(e) => set('to', e.target.value)} /></Field>
      </div>
      <Field id="ar-type" label="Room type" error={error}>
        <RoomTypeSelect id="ar-type" value={f.type} onChange={(v) => set('type', v)} />
      </Field>
      <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">{total ? `This creates ${total} room${total > 1 ? 's' : ''}: ${from} to ${to}.` : 'Enter a valid range.'}</p>
      <div className="flex gap-3"><button type="button" className={`${btnGhost} flex-1`} onClick={onClose}>Cancel</button><button type="submit" className={`${btnPrimary} flex-1`} disabled={busy}>{busy ? 'Adding…' : 'Add rooms'}</button></div>
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
    if (name.length > 40) { setError('Keep the name under 40 characters.'); return; }
    setPicked((p) => (p.some((x) => x.toLowerCase() === name.toLowerCase()) ? p : [...p, name]));
    setCustom(''); setError('');
  };
  const extra = picked.filter((n) => !AREA_PRESETS.includes(n));

  const submit = async (e) => {
    e.preventDefault();
    if (!picked.length) { setError('Pick at least one area.'); return; }
    setBusy(true);
    await onSubmit(picked.map((name) => ({ number: name, floor: 0, type: AREA_TYPE, status: 'Ready', kind: 'area' })));
    setBusy(false);
  };

  return (
    <form onSubmit={submit} noValidate className="p-5 space-y-4">
      <div>
        <p className="text-xs font-semibold text-slate-700 mb-2" id="aa-label">Which areas does your hotel have?</p>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="aa-label">
          {[...AREA_PRESETS, ...extra].map((name) => (
            <button key={name} type="button" onClick={() => toggle(name)} aria-pressed={picked.includes(name)}
              className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${picked.includes(name) ? 'bg-[#0D7C77] border-[#0D7C77] text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{name}</button>
          ))}
        </div>
      </div>
      <Field id="aa-custom" label="Something else?" error={error}>
        <div className="flex gap-2">
          <input id="aa-custom" className={inputCls} value={custom} placeholder="e.g. Rooftop bar" onChange={(e) => { setCustom(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} />
          <button type="button" className={btnGhost} onClick={addCustom}>Add</button>
        </div>
      </Field>
      <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">{picked.length ? `This adds ${picked.length} common area${picked.length > 1 ? 's' : ''}.` : 'Pick the areas your team cleans.'}</p>
      <div className="flex gap-3"><button type="button" className={`${btnGhost} flex-1`} onClick={onClose}>Cancel</button><button type="submit" className={`${btnPrimary} flex-1`} disabled={busy}>{busy ? 'Adding…' : 'Add areas'}</button></div>
    </form>
  );
}

function IssueModal({ rooms, initialRoomId, onClose, onSubmit }) {
  const [f, setF] = useState({ roomId: initialRoomId, title: '', priority: 'normal' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (f.title.trim().length < 3) { setError('Describe the problem in a few words.'); return; }
    setBusy(true);
    await onSubmit({ roomId: f.roomId || null, title: f.title.trim(), priority: f.priority });
    setBusy(false);
  };
  return (
    <Modal title="Report an issue" onClose={onClose}>
      <form onSubmit={submit} noValidate className="p-5 space-y-4">
        <Field id="is-room" label="Where"><select id="is-room" className={inputCls} value={f.roomId} onChange={(e) => setF({ ...f, roomId: e.target.value })}>
          <option value="">Not about one place</option>{rooms.map((r) => <option key={r.id} value={r.id}>{spaceName(r)}</option>)}</select></Field>
        <Field id="is-title" label="What is wrong?" error={error}><input id="is-title" className={inputCls} value={f.title} onChange={(e) => { setF({ ...f, title: e.target.value }); setError(''); }} placeholder="e.g. Shower is leaking" /></Field>
        <Field id="is-prio" label="Priority"><select id="is-prio" className={inputCls} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
          <option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></Field>
        <div className="flex gap-3"><button type="button" className={`${btnGhost} flex-1`} onClick={onClose}>Cancel</button><button type="submit" className={`${btnPrimary} flex-1`} disabled={busy}>{busy ? 'Saving…' : 'Report issue'}</button></div>
      </form>
    </Modal>
  );
}

const randomPin = () => String(Math.floor(1000 + Math.random() * 9000));

function StaffModal({ hotelCode, onClose, onCreate }) {
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
    if (f.fullName.trim().length < 2) { setError('Enter the full name.'); return; }
    if (!/^[a-z0-9._-]{2,20}$/.test(f.username.trim().toLowerCase())) { setError('Username: 2 to 20 letters or numbers.'); return; }
    if (!/^[0-9]{4}$/.test(f.pin)) { setError('The PIN must have exactly 4 digits.'); return; }
    setBusy(true);
    const err = await onCreate({ fullName: f.fullName, username: f.username, pin: f.pin });
    setBusy(false);
    if (err) setError(err); else setCreated({ ...f, username: f.username.trim().toLowerCase() });
  };

  if (created) {
    const text = `Lodgora sign in\nWebsite: ${location.origin}/app\nHotel code: ${hotelCode}\nUsername: ${created.username}\nPIN: ${created.pin}`;
    return (
      <Modal title={`${created.fullName} was added`} subtitle="Give these details to your colleague. You can see the PIN again any time in Team." onClose={onClose}>
        <div className="p-5 space-y-4">
          <dl className="bg-slate-50 rounded-xl border border-slate-200 p-4 grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
            <dt className="text-slate-500">Hotel code</dt><dd className="font-mono font-semibold">{hotelCode}</dd>
            <dt className="text-slate-500">Username</dt><dd className="font-mono font-semibold">{created.username}</dd>
            <dt className="text-slate-500">PIN</dt><dd className="font-mono font-semibold tracking-widest">{created.pin}</dd>
          </dl>
          <div className="flex gap-3 items-center"><CopyButton text={text} label="Copy all" /><span className="flex-1"></span><button className={btnPrimary} onClick={onClose}>Done</button></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Add housekeeper" subtitle="They sign in on their phone with the hotel code, username and PIN." onClose={onClose}>
      <form onSubmit={submit} noValidate className="p-5 space-y-4">
        <Field id="st-name" label="Full name"><input id="st-name" className={inputCls} value={f.fullName} onChange={(e) => setName(e.target.value)} autoComplete="off" /></Field>
        <Field id="st-user" label="Username" hint="Lowercase letters or numbers. Filled in for you.">
          <input id="st-user" className={`${inputCls} font-mono`} value={f.username} autoCapitalize="none" onChange={(e) => { setTouched(true); setF({ ...f, username: e.target.value }); setError(''); }} />
        </Field>
        <Field id="st-pin" label="4-digit PIN" error={error}>
          <div className="flex gap-2">
            <input id="st-pin" className={`${inputCls} font-mono text-lg tracking-[0.4em]`} inputMode="numeric" maxLength={4} value={f.pin} onChange={(e) => { setF({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }); setError(''); }} />
            <button type="button" className={btnGhost} onClick={() => setF({ ...f, pin: randomPin() })} aria-label="Generate a new PIN"><Icon name="shuffle" className="w-4 h-4" /></button>
          </div>
        </Field>
        <div className="flex gap-3"><button type="button" className={`${btnGhost} flex-1`} onClick={onClose}>Cancel</button><button type="submit" className={`${btnPrimary} flex-1`} disabled={busy}>{busy ? 'Adding…' : 'Add housekeeper'}</button></div>
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
    if (!/^[0-9]{4}$/.test(pin)) { setError('The PIN must have exactly 4 digits.'); return; }
    setBusy(true);
    const err = await onSave(staff.id, pin);
    setBusy(false);
    if (err) setError(err); else onClose();
  };
  return (
    <Modal title={`New PIN for ${staff.fullName}`} subtitle="They will be signed out and must use the new PIN." onClose={onClose}>
      <form onSubmit={submit} noValidate className="p-5 space-y-4">
        <Field id="pn-pin" label="4-digit PIN" error={error}>
          <div className="flex gap-2">
            <input id="pn-pin" className={`${inputCls} font-mono text-lg tracking-[0.4em]`} inputMode="numeric" maxLength={4} value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }} />
            <button type="button" className={btnGhost} onClick={() => setPin(randomPin())} aria-label="Generate a new PIN"><Icon name="shuffle" className="w-4 h-4" /></button>
          </div>
        </Field>
        <div className="flex gap-3"><button type="button" className={`${btnGhost} flex-1`} onClick={onClose}>Cancel</button><button type="submit" className={`${btnPrimary} flex-1`} disabled={busy}>{busy ? 'Saving…' : 'Save PIN'}</button></div>
      </form>
    </Modal>
  );
}
