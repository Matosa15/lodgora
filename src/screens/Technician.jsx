// Ecrã da manutenção: pensado para o telemóvel. Lista das avarias que o gerente lhe atribuiu.
import { useCallback, useEffect, useRef, useState } from 'react';
import { backend } from '../lib/backend';
import { Icon, IssueNotes, LogoMark, NoteBox, Spinner, btnGhost, btnPrimary, useToast } from '../components/ui';
import { ISSUE_STATUS_LABEL, PRIORITY_STYLE, timeAgo } from '../lib/constants';
import { ReportModal } from './Housekeeper';

const BAR = { urgent: 'border-t-rose-500', high: 'border-t-amber-500', normal: 'border-t-slate-300', low: 'border-t-slate-200' };

export default function Technician({ session, signOut }) {
  const toast = useToast();
  const [issues, setIssues] = useState(null);   // null = a carregar
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [rooms, setRooms] = useState(null);     // null = o formulário ainda não está aberto
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const list = await backend.staff.issues();
      if (!alive.current) return;
      setIssues(list);
      setError('');
    } catch (e) {
      if (!alive.current) return;
      if (/expired/i.test(e.message)) { signOut(); return; }
      setError(e.message || 'Could not load your issues');
    }
  }, [signOut]);

  useEffect(() => {
    alive.current = true;
    load();
    const timer = setInterval(load, 10000);
    const unsubscribe = backend.mode === 'demo' ? backend.manager.subscribe(load) : () => {};
    return () => { alive.current = false; clearInterval(timer); unsubscribe(); };
  }, [load]);

  const change = async (issue, status, message) => {
    setBusyId(issue.id);
    try { await backend.staff.setIssueStatus(issue.id, status); toast(message); await load(); }
    catch (e) { toast(e.message, 'error'); }
    finally { setBusyId(null); }
  };

  const addNote = async (issue, text, cannotFix) => {
    await backend.staff.addIssueNote(issue.id, text, cannotFix);
    toast(cannotFix ? 'Your manager has been told you need help' : 'Note sent to your manager');
    await load();
  };

  const openReport = async () => {
    try { setRooms(await backend.staff.roomList()); }
    catch (e) { toast(e.message, 'error'); }
  };

  const open = (issues || []).filter((i) => i.status !== 'resolved');
  const done = (issues || []).filter((i) => i.status === 'resolved');

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 pt-safe">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <LogoMark className="w-8 h-8" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-sm font-bold text-[#172B4D] truncate">{session.name}</p>
            <p className="text-xs text-slate-500 truncate">{session.hotel.name} · Maintenance</p>
          </div>
          <button onClick={load} aria-label="Refresh" className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
            <Icon name="refresh" className="w-[18px] h-[18px]" />
          </button>
          <button onClick={signOut} aria-label="Sign out" className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
            <Icon name="logout" className="w-[18px] h-[18px]" />
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-5 pb-safe space-y-4">
        {issues === null && !error && <Spinner label="Loading your issues" />}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-white p-5 text-center" role="alert">
            <p className="font-semibold text-slate-800">We could not load your issues</p>
            <p className="text-sm text-slate-500 mt-1">{error}</p>
            <button className={`${btnPrimary} mt-4`} onClick={load}>Try again</button>
          </div>
        )}

        {issues !== null && (
          <>
            <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-baseline justify-between">
              <p className="text-sm text-slate-500">Your open issues</p>
              <p className="text-2xl font-bold text-[#172B4D] tabular-nums">{open.length}</p>
            </section>

            {open.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                <Icon name="wrench" className="w-7 h-7 mx-auto mb-2" />
                <p className="font-semibold text-slate-800">Nothing to fix right now</p>
                <p className="text-sm mt-1">Your manager will give you issues here. This page updates by itself.</p>
              </div>
            ) : open.map((i) => <IssueCard key={i.id} issue={i} busy={busyId === i.id} change={change} addNote={addNote} />)}

            {done.length > 0 && (
              <>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 pt-2">Done recently</h2>
                {done.map((i) => <IssueCard key={i.id} issue={i} busy={busyId === i.id} change={change} addNote={addNote} />)}
              </>
            )}

            <button className={`${btnGhost} w-full`} onClick={openReport}>
              <Icon name="plus" className="w-4 h-4" />Report another problem
            </button>
          </>
        )}
      </main>

      {rooms && <ReportModal rooms={rooms} initialRoomId="" onClose={() => setRooms(null)} onDone={() => { setRooms(null); toast('Problem reported. Your manager will see it.'); load(); }} />}
    </div>
  );
}

function IssueCard({ issue, busy, change, addNote }) {
  const resolved = issue.status === 'resolved';
  return (
    <article className={`bg-white rounded-xl border border-slate-200 border-t-[3px] ${resolved ? 'border-t-emerald-400 opacity-75' : BAR[issue.priority]} p-4 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[#172B4D] leading-snug">{issue.title}</h2>
          <p className="text-sm text-slate-500 mt-1">{issue.roomLabel ? `${issue.roomLabel} · ` : ''}{issue.reportedBy} · {timeAgo(issue.createdAt)}</p>
        </div>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize flex-none ${PRIORITY_STYLE[issue.priority]}`}>{issue.priority}</span>
      </div>
      {issue.needsHelp && !resolved && <p className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 font-medium">Your manager knows you need help with this.</p>}
      <IssueNotes notes={issue.notes} />
      {!resolved && <NoteBox cannotFix collapsible label="Write a note to your manager" placeholder="e.g. I need a new part, or: the guest is still in the room" onSend={(t, blocked) => addNote(issue, t, blocked)} />}
      <div className="mt-4 space-y-2">
        {issue.status === 'open' && (
          <button className={`${btnPrimary} w-full py-4 text-base`} disabled={busy} onClick={() => change(issue, 'in_progress', 'Work started')}>Start work</button>
        )}
        {issue.status === 'in_progress' && (
          <>
            <p className="text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2.5 text-center font-medium">{ISSUE_STATUS_LABEL.in_progress}</p>
            <button className={`${btnPrimary} w-full py-4 text-base`} disabled={busy} onClick={() => change(issue, 'resolved', 'Marked as fixed')}>
              <Icon name="check" className="w-5 h-5" />Mark as fixed
            </button>
          </>
        )}
        {resolved && (
          <>
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2.5 text-center font-medium">Fixed</p>
            <button className="w-full text-sm text-slate-500 py-1 hover:text-slate-800" disabled={busy} onClick={() => change(issue, 'open', 'Issue reopened')}>It is not fixed yet</button>
          </>
        )}
      </div>
    </article>
  );
}
