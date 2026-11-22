// Ecrã da manutenção: pensado para o telemóvel. Lista das avarias que o gerente lhe atribuiu.
import { useCallback, useEffect, useRef, useState } from 'react';
import { backend } from '../lib/backend';
import { Icon, IssueNotes, LangSwitch, LogoMark, NoteBox, Spinner, btnGhost, btnPrimary, useToast } from '../components/ui';
import { areaLabel, ISSUE_STATUS_LABEL, PRIORITY_STYLE, priorityLabel, timeAgo, tidyName, tidyTitle } from '../lib/constants';
import { LANG, t } from '../lib/i18n';
import { tErr } from '../lib/errors';
import { ReportModal } from './Housekeeper';

// A etiqueta do local vem do servidor em inglês ("Room 214", "Lobby")
const place = (l) => (LANG === 'fi' ? (l.startsWith('Room ') ? `Huone ${l.slice(5)}` : areaLabel(l)) : l);

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
      setError(tErr(e.message) || t('Could not load your issues', 'Vikojen lataus epäonnistui'));
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
    catch (e) { toast(tErr(e.message), 'error'); }
    finally { setBusyId(null); }
  };

  const addNote = async (issue, text, cannotFix) => {
    await backend.staff.addIssueNote(issue.id, text, cannotFix);
    toast(cannotFix ? t('Your manager has been told you need help', 'Esimiehelle on kerrottu, että tarvitset apua') : t('Note sent to your manager', 'Viesti lähetetty esimiehelle'));
    await load();
  };

  const openReport = async () => {
    try { setRooms(await backend.staff.roomList()); }
    catch (e) { toast(tErr(e.message), 'error'); }
  };

  const open = (issues || []).filter((i) => i.status !== 'resolved');
  const done = (issues || []).filter((i) => i.status === 'resolved');

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <header className="sticky top-0 z-20 bg-white pt-safe">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <LogoMark className="w-8 h-8" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-sm font-bold text-[#0B0B0F] truncate">{tidyName(session.name)}</p>
            <p className="text-xs text-slate-500 truncate">{t('Maintenance', 'Huolto')} · {tidyName(session.hotel.name)}</p>
          </div>
          <button onClick={load} aria-label={t('Refresh', 'Päivitä')} className="w-10 h-10 rounded-full bg-[#F4F5F7] flex items-center justify-center text-slate-600 hover:bg-[#E4E6EB]">
            <Icon name="refresh" className="w-[18px] h-[18px]" />
          </button>
          <LangSwitch className="flex-none" />
          <button onClick={signOut} aria-label={t('Sign out', 'Kirjaudu ulos')} className="w-10 h-10 rounded-full bg-[#F4F5F7] flex items-center justify-center text-slate-600 hover:bg-[#E4E6EB]">
            <Icon name="logout" className="w-[18px] h-[18px]" />
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-5 pb-safe space-y-4">
        {issues === null && !error && <Spinner label={t('Loading your issues', 'Ladataan vikojasi')} />}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-white p-5 text-center" role="alert">
            <p className="font-semibold text-slate-800">{t('We could not load your issues', 'Vikojen lataus ei onnistunut')}</p>
            <p className="text-sm text-slate-500 mt-1">{error}</p>
            <button className={`${btnPrimary} mt-4`} onClick={load}>{t('Try again', 'Yritä uudelleen')}</button>
          </div>
        )}

        {issues !== null && (
          <>
            <section className="bg-white rounded-3xl p-4 shadow-sm flex items-baseline justify-between">
              <p className="text-sm text-slate-500">{t('Your open issues', 'Avoimet vikasi')}</p>
              <p className="text-2xl font-bold text-[#0B0B0F] tabular-nums">{open.length}</p>
            </section>

            {open.length === 0 ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-500">
                <Icon name="wrench" className="w-7 h-7 mx-auto mb-2" />
                <p className="font-semibold text-slate-800">{t('Nothing to fix right now', 'Ei korjattavaa juuri nyt')}</p>
                <p className="text-sm mt-1">{t('Your manager will give you issues here. This page updates by itself.', 'Esimiehesi antaa sinulle viat tänne. Tämä sivu päivittyy itsestään.')}</p>
              </div>
            ) : open.map((i) => <IssueCard key={i.id} issue={i} busy={busyId === i.id} change={change} addNote={addNote} />)}

            {done.length > 0 && (
              <>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 pt-2">{t('Done recently', 'Äskettäin tehdyt')}</h2>
                {done.map((i) => <IssueCard key={i.id} issue={i} busy={busyId === i.id} change={change} addNote={addNote} />)}
              </>
            )}

            <button className={`${btnGhost} w-full !bg-white`} onClick={openReport}>
              <Icon name="plus" className="w-4 h-4" />{t('Report another problem', 'Ilmoita toinen vika')}
            </button>
          </>
        )}
      </main>

      {rooms && <ReportModal rooms={rooms} initialRoomId="" onClose={() => setRooms(null)} onDone={() => { setRooms(null); toast(t('Problem reported. Your manager will see it.', 'Vika ilmoitettu. Esimiehesi näkee sen.')); load(); }} />}
    </div>
  );
}

function IssueCard({ issue, busy, change, addNote }) {
  const resolved = issue.status === 'resolved';
  return (
    <article className={`bg-white rounded-3xl ${resolved ? 'opacity-75' : ''} p-4 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[#0B0B0F] leading-snug">{tidyTitle(issue.title)}</h2>
          <p className="text-sm text-slate-500 mt-1">{issue.roomLabel ? `${place(issue.roomLabel)} · ` : ''}{tidyName(issue.reportedBy)} · {timeAgo(issue.createdAt)}</p>
        </div>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-none ${PRIORITY_STYLE[issue.priority]}`}>{priorityLabel(issue.priority)}</span>
      </div>
      {issue.needsHelp && !resolved && <p className="mt-3 text-sm text-rose-700 bg-rose-50 rounded-2xl px-3 py-2 font-medium">{t('Your manager knows you need help with this.', 'Esimiehesi tietää, että tarvitset apua tässä.')}</p>}
      <IssueNotes notes={issue.notes} />
      {!resolved && <NoteBox cannotFix collapsible label={t('Write a note to your manager', 'Kirjoita viesti esimiehelle')} placeholder={t('e.g. I need a new part, or: the guest is still in the room', 'esim. Tarvitsen uuden osan tai: vieras on vielä huoneessa')} onSend={(text, blocked) => addNote(issue, text, blocked)} />}
      <div className="mt-4 space-y-2">
        {issue.status === 'open' && (
          <button className={`${btnPrimary} w-full py-4 text-base`} disabled={busy} onClick={() => change(issue, 'in_progress', t('Work started', 'Työ aloitettu'))}>{t('Start work', 'Aloita työ')}</button>
        )}
        {issue.status === 'in_progress' && (
          <>
            <p className="text-sm text-slate-700 bg-[#F4F5F7] rounded-2xl px-3 py-2.5 text-center font-medium">{ISSUE_STATUS_LABEL.in_progress}</p>
            <button className={`${btnPrimary} w-full py-4 text-base`} disabled={busy} onClick={() => change(issue, 'resolved', t('Marked as fixed', 'Merkitty korjatuksi'))}>
              <Icon name="check" className="w-5 h-5" />{t('Mark as fixed', 'Merkitse korjatuksi')}
            </button>
          </>
        )}
        {resolved && (
          <>
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-2xl px-3 py-2.5 text-center font-medium">{t('Fixed', 'Korjattu')}</p>
            <button className="w-full text-sm text-slate-500 py-1 hover:text-slate-800" disabled={busy} onClick={() => change(issue, 'open', t('Issue reopened', 'Vika avattu uudelleen'))}>{t('It is not fixed yet', 'Sitä ei ole vielä korjattu')}</button>
          </>
        )}
      </div>
    </article>
  );
}
