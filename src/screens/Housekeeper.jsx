// Ecrã da camareira: pensado para o telemóvel. Lista dos seus quartos e um botão grande por quarto.
import { useCallback, useEffect, useRef, useState } from 'react';
import { backend } from '../lib/backend';
import { CleanTag, CleanTimer, Field, Icon, IssueNotes, LangSwitch, LogoMark, Modal, NoteBox, Spinner, StatusBadge, WherePicker, btnGhost, btnPrimary, inputCls, useToast } from '../components/ui';
import { STATUS_STYLE, dayKey, isArea, minutesLabel, spaceInline, spaceName, tidyName, typeLabel } from '../lib/constants';
import { t } from '../lib/i18n';
import { tErr } from '../lib/errors';

const ORDER = { Cleaning: 0, Dirty: 1, 'Awaiting inspection': 2, Ready: 3, Occupied: 4, 'Out of service': 5 };

export default function Housekeeper({ session, signOut }) {
  const toast = useToast();
  const [rooms, setRooms] = useState(null);   // null = a carregar
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [report, setReport] = useState(null); // null | { roomId }
  const alive = useRef(true);
  const planAppliedOn = useRef('');

  const load = useCallback(async () => {
    try {
      // Uma vez por dia, o plano de hoje entra na lista de limpeza
      const today = dayKey(0);
      if (planAppliedOn.current !== today) {
        try { await backend.staff.applyPlan(today); planAppliedOn.current = today; } catch (e) { if (/expired/i.test(e.message)) throw e; }
      }
      const list = await backend.staff.rooms();
      if (!alive.current) return;
      setRooms(list);
      setError('');
    } catch (e) {
      if (!alive.current) return;
      if (/expired/i.test(e.message)) { signOut(); return; }
      setError(tErr(e.message) || t('Could not load your rooms', 'Huoneiden lataus epäonnistui'));
    }
  }, [signOut]);

  useEffect(() => {
    alive.current = true;
    load();
    const timer = setInterval(load, 10000);
    const unsubscribe = backend.mode === 'demo' ? backend.manager.subscribe(load) : () => {};
    return () => { alive.current = false; clearInterval(timer); unsubscribe(); };
  }, [load]);

  const change = async (room, status, message) => {
    setBusyId(room.id);
    try {
      await backend.staff.setStatus(room.id, status);
      toast(message);
      await load();
    } catch (e) { toast(tErr(e.message), 'error'); }
    finally { setBusyId(null); }
  };

  const timer = async (room, action) => {
    setBusyId(room.id);
    try { await backend.staff.timer(room.id, action); await load(); }
    catch (e) { toast(tErr(e.message), 'error'); }
    finally { setBusyId(null); }
  };

  const sorted = (rooms || []).slice().sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.number.localeCompare(b.number, undefined, { numeric: true }));
  const done = sorted.filter((r) => r.status === 'Awaiting inspection' || r.status === 'Ready').length;
  const pct = sorted.length ? Math.round((done / sorted.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <header className="sticky top-0 z-20 bg-white pt-safe">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <LogoMark className="w-8 h-8" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-sm font-bold text-[#0B0B0F] truncate">{tidyName(session.name)}</p>
            <p className="text-xs text-slate-500 truncate">{t('Housekeeping', 'Siivous')} · {tidyName(session.hotel.name)}</p>
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
        {rooms === null && !error && <Spinner label={t('Loading your rooms', 'Ladataan huoneitasi')} />}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-white p-5 text-center" role="alert">
            <p className="font-semibold text-slate-800">{t('We could not load your rooms', 'Huoneiden lataus ei onnistunut')}</p>
            <p className="text-sm text-slate-500 mt-1">{error}</p>
            <button className={`${btnPrimary} mt-4`} onClick={load}>{t('Try again', 'Yritä uudelleen')}</button>
          </div>
        )}

        {rooms !== null && (
          <>
            <section className="bg-white rounded-3xl p-4 shadow-sm">
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-slate-500">{t('Your cleaning today', 'Siivouksesi tänään')}</p>
                <p className="text-2xl font-bold text-[#0B0B0F] tabular-nums">{done}<span className="text-base text-slate-400 font-semibold"> / {sorted.length}</span></p>
              </div>
              <div className="h-2 bg-slate-100 rounded-full mt-3 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-[#19A7A1] rounded-full transition-all" style={{ width: pct + '%' }}></div>
              </div>
            </section>

            {sorted.length === 0 ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-500">
                <Icon name="bed" className="w-7 h-7 mx-auto mb-2" />
                <p className="font-semibold text-slate-800">{t('Nothing assigned yet', 'Ei vielä tehtäviä')}</p>
                <p className="text-sm mt-1">{t('Your manager will assign rooms and areas to you. This page updates by itself.', 'Esimiehesi antaa sinulle huoneita ja tiloja. Tämä sivu päivittyy itsestään.')}</p>
              </div>
            ) : (
              sorted.map((room) => (
                <article key={room.id} className={`bg-white rounded-3xl p-4 shadow-sm`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-2xl font-bold text-[#0B0B0F] leading-none">{spaceName(room)}</h2>
                      <p className="text-sm text-slate-500 mt-1">{isArea(room) ? typeLabel(room.type) : `${typeLabel(room.type)} · ${t('Floor', 'Kerros')} ${room.floor}`}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5"><StatusBadge status={room.status} /><CleanTag room={room} /></div>
                  </div>
                  {room.note && <p className="text-sm text-slate-600 mt-3">{room.note}</p>}
                  {room.sentBack && ['Dirty', 'Cleaning'].includes(room.status) && (
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#0D7C77]">{t('Your manager sent this back', 'Esimiehesi palautti huoneen')}</p>
                  )}
                  <IssueNotes notes={room.notes} />
                  <NoteBox collapsible label={room.notes?.length ? t('Reply to your manager', 'Vastaa esimiehelle') : t('Write a note to your manager', 'Kirjoita viesti esimiehelle')}
                    placeholder={t('e.g. The floor is done, the towels are missing', 'esim. lattia on siivottu, pyyhkeet puuttuvat')}
                    onSend={async (text) => { await backend.staff.addRoomNote(room.id, text); await load(); }} />

                  <div className="mt-4 space-y-2">
                    {room.status === 'Dirty' && (
                      <button className={`${btnPrimary} w-full py-4 text-base`} disabled={busyId === room.id}
                        onClick={() => change(room, 'Cleaning', t(`Started ${spaceInline(room)}`, `Aloitettu: ${spaceInline(room)}`))}>
                        {t('Start cleaning', 'Aloita siivous')}
                      </button>
                    )}
                    {room.status === 'Cleaning' && (
                      <>
                        <div className={`rounded-2xl p-4 text-center ${room.cleanRunningSince ? 'bg-[#F4F5F7] text-[#0B0B0F]' : 'bg-amber-50 text-amber-700'}`}>
                          <p className="text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5">
                            <Icon name="timer" className="w-3.5 h-3.5" />{room.cleanRunningSince ? t('Cleaning time', 'Siivousaika') : t('Paused', 'Tauolla')}
                          </p>
                          <CleanTimer room={room} big className="block mt-1" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {room.cleanRunningSince ? (
                            <button className={`${btnGhost} py-3.5`} disabled={busyId === room.id} onClick={() => timer(room, 'pause')}>
                              <Icon name="pause" className="w-4 h-4" />{t('Pause', 'Tauko')}
                            </button>
                          ) : (
                            <button className={`${btnGhost} py-3.5`} disabled={busyId === room.id} onClick={() => timer(room, 'resume')}>
                              <Icon name="play" className="w-4 h-4" />{t('Resume', 'Jatka')}
                            </button>
                          )}
                          <button className={`${btnPrimary} py-3.5`} disabled={busyId === room.id}
                            onClick={() => change(room, 'Awaiting inspection', t(`Finished ${spaceInline(room)}, sent for inspection`, `Valmis: ${spaceInline(room)}, lähetetty tarkastettavaksi`))}>
                            <Icon name="check" className="w-5 h-5" />{t('Finish', 'Valmis')}
                          </button>
                        </div>
                        <button className="w-full text-sm text-slate-500 py-1 hover:text-slate-800" disabled={busyId === room.id}
                          onClick={() => change(room, 'Dirty', t(`${spaceName(room)} back on your list`, `${spaceName(room)} on takaisin listallasi`))}>
                          {t('I did not start this room', 'En aloittanut tätä huonetta')}
                        </button>
                      </>
                    )}
                    {room.status === 'Awaiting inspection' && (
                      <p className="text-sm text-amber-700 bg-amber-50 rounded-2xl px-3 py-2.5 text-center font-medium">
                        {t('Waiting for the inspector', 'Odottaa tarkastajaa')}{room.cleanSeconds > 0 && <span className="block text-xs font-normal">{t('Cleaned in', 'Siivottu ajassa')} {minutesLabel(room.cleanSeconds)}</span>}
                      </p>
                    )}
                    {room.status === 'Ready' && (
                      <p className="text-sm text-emerald-700 bg-emerald-50 rounded-2xl px-3 py-2.5 text-center font-medium">{t('Approved. Ready for guests', 'Hyväksytty. Valmis vieraille')}</p>
                    )}
                    <button className={`${btnGhost} w-full !bg-white`} onClick={() => setReport({ roomId: room.id })}>
                      <Icon name="wrench" className="w-4 h-4" />{t('Report a problem here', 'Ilmoita vika täällä')}
                    </button>
                  </div>
                </article>
              ))
            )}

            <button className={`${btnGhost} w-full !bg-white`} onClick={() => setReport({ roomId: '' })}>
              <Icon name="plus" className="w-4 h-4" />{t('Report another problem', 'Ilmoita toinen vika')}
            </button>
          </>
        )}
      </main>

      {report && <ReportModal rooms={sorted} initialRoomId={report.roomId} onClose={() => setReport(null)} onDone={() => { setReport(null); toast(t('Problem reported. Maintenance will see it.', 'Vika ilmoitettu. Huolto näkee sen.')); load(); }} />}
    </div>
  );
}

export function ReportModal({ rooms, initialRoomId, onClose, onDone }) {
  const [roomId, setRoomId] = useState(initialRoomId);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('normal');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (title.trim().length < 3) { setError(t('Describe the problem in a few words.', 'Kuvaile vika muutamalla sanalla.')); return; }
    setBusy(true);
    try { await backend.staff.reportIssue(roomId || null, title.trim(), priority); onDone(); }
    catch (err) { setError(tErr(err.message)); setBusy(false); }
  };

  return (
    <Modal title={t('Report a problem', 'Ilmoita vika')} subtitle={t('Maintenance and your manager will see this right away.', 'Huolto ja esimiehesi näkevät tämän heti.')} onClose={onClose} sheet>
      <form onSubmit={submit} noValidate className="p-5 space-y-4">
        <Field id="r-room" label={t('Where', 'Missä')}>
          <WherePicker id="r-room" rooms={rooms} value={roomId} onChange={setRoomId} />
        </Field>
        <Field id="r-title" label={t('What is wrong?', 'Mikä on vialla?')} error={error}>
          <input id="r-title" className={inputCls} value={title} onChange={(e) => { setTitle(e.target.value); setError(''); }} placeholder={t('e.g. Shower is leaking', 'esim. Suihku vuotaa')} />
        </Field>
        <Field id="r-prio" label={t('How urgent is it?', 'Kuinka kiireellinen se on?')}>
          <select id="r-prio" className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="urgent">{t('Urgent: the room cannot be used', 'Kiireellinen: huonetta ei voi käyttää')}</option>
            <option value="high">{t('High: fix today', 'Korkea: korjataan tänään')}</option>
            <option value="normal">{t('Normal', 'Normaali')}</option>
            <option value="low">{t('Low: when possible', 'Matala: kun ehditään')}</option>
          </select>
        </Field>
        <div className="flex gap-3 pt-1">
          <button type="button" className={`${btnGhost} flex-1`} onClick={onClose}>{t('Cancel', 'Peruuta')}</button>
          <button type="submit" className={`${btnPrimary} flex-1`} disabled={busy}>{busy ? t('Sending…', 'Lähetetään…') : t('Send', 'Lähetä')}</button>
        </div>
      </form>
    </Modal>
  );
}
