import { useEffect, useState } from 'react';
import { backend } from '../lib/backend';
import { Icon, LogoMark, LangSwitch } from '../components/ui';
import { SITE } from '../lib/site';
import { statusLabel } from '../lib/constants';
import { t } from '../lib/i18n';
import { tErr } from '../lib/errors';

const INK = '#0B0B0F';
const input = 'w-full h-14 px-5 rounded-2xl border-2 border-transparent bg-[#F4F5F7] text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0B0B0F] transition-colors';
const primary = 'w-full h-14 rounded-full bg-[#0B0B0F] hover:bg-[#2A2B33] text-white text-[15px] font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B0B0F]';
const secondary = 'w-full h-14 rounded-full bg-[#F0F1F4] hover:bg-[#E4E6EB] text-[#0B0B0F] text-[15px] font-semibold inline-flex items-center justify-center gap-2 transition-colors';

// Campo com etiqueta, ajuda e erro
function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold mb-1.5" style={{ color: INK }}>{label}</label>
      {children}
      {hint && !error && <p className="text-[13px] text-slate-500 mt-1.5">{hint}</p>}
      {error && <p className="text-[13px] text-rose-600 mt-1.5" role="alert">{error}</p>}
    </div>
  );
}

const ROLES = [
  { id: 'staff', label: t('Hotel team', 'Hotellin tiimi'), text: t('Housekeepers sign in with a 4-digit PIN', 'Siivoojat kirjautuvat nelinumeroisella PIN-koodilla'), icon: 'sparkles' },
  { id: 'manager', label: t('Manager', 'Esimies'), text: t('Sign in with your email and password', 'Kirjaudu sähköpostilla ja salasanalla'), icon: 'dashboard' }
];

const SHOW_ORDER = ['Dirty', 'Cleaning', 'Awaiting inspection', 'Ready'];
const SHOW_COLOR = { Ready: '#10B981', Dirty: '#F97316', Cleaning: '#3B82F6', 'Awaiting inspection': '#F59E0B' };
const SHOW_START = [['214', 'Ready'], ['216', 'Ready'], ['218', 'Cleaning'], ['220', 'Dirty']];

// Pequena amostra animada: os quartos vão passando de sujo a pronto
function Showcase() {
  const [rooms, setRooms] = useState(SHOW_START);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let i = 0;
    const timer = setInterval(() => {
      const idx = [2, 3, 0, 1][i++ % 4];
      setRooms((rs) => rs.map(([n, st], k) => (k === idx ? [n, SHOW_ORDER[(SHOW_ORDER.indexOf(st) + 1) % 4]] : [n, st])));
    }, 2000);
    return () => clearInterval(timer);
  }, []);
  const ready = rooms.filter(([, st]) => st === 'Ready').length;
  return (
    <div className="mt-10 max-w-sm rounded-3xl bg-white p-4" aria-hidden="true">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500"><span>{t('Today', 'Tänään')}</span><span className="tabular-nums">{t(`${ready} of 4 ready`, `${ready}/4 valmiina`)}</span></div>
      <ul className="mt-3 grid grid-cols-4 gap-2">
        {rooms.map(([n, st]) => (
          <li key={n} className="rounded-2xl bg-[#F4F5F7] px-2 py-2.5 text-center">
            <span className="block text-lg font-semibold tabular-nums tracking-tight leading-none" style={{ color: INK }}>{n}</span>
            <span className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-slate-500"><i className="w-1.5 h-1.5 rounded-full flex-none transition-colors duration-500" style={{ background: SHOW_COLOR[st] }} /><span className="truncate">{st === 'Awaiting inspection' ? t('Inspect', 'Tarkista') : statusLabel(st)}</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Login({ onSession, notice }) {
  const isDemo = backend.mode === 'demo';
  const [tab, setTab] = useState(isDemo ? 'manager' : 'staff'); // quem abre a demo é, quase sempre, um gerente

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] bg-white font-geist">
      {/* Painel de marca (só em ecrãs grandes) */}
      <aside className="hidden lg:flex flex-col justify-between p-12 xl:p-16 relative overflow-hidden bg-[#F4F5F7] m-3 rounded-[2.5rem]">
        <a href="/" className="flex items-center gap-3 w-fit" aria-label={t('Lodgora website', 'Lodgoran verkkosivu')}>
          <LogoMark className="w-10 h-10" />
          <span className="font-semibold text-2xl tracking-[-0.03em]" style={{ color: INK }}>Lodgora</span>
        </a>

        <div>
          <h1 className="font-semibold text-5xl xl:text-[4rem] leading-[1] tracking-[-0.05em]" style={{ color: INK }}>
            {t(<>Every room ready.<br />No phone calls.</>, <>Jokainen huone valmis.<br />Ei puheluita.</>)}
          </h1>
          <ul className="mt-8 space-y-3.5 text-slate-700">
            {[t('See which rooms are ready, in real time.', 'Näet reaaliajassa, mitkä huoneet ovat valmiita.'), t('Housekeepers use a simple screen on their phone.', 'Siivoojat käyttävät yksinkertaista näkymää puhelimellaan.'), t('Maintenance issues reported once, never lost.', 'Viat ilmoitetaan kerran, eikä niitä hukata.')].map((line) => (
              <li key={line} className="flex gap-3"><span className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-none shadow-sm"><Icon name="check" className="w-3.5 h-3.5 text-[#0B0B0F]" /></span>{line}</li>
            ))}
          </ul>

          <Showcase />
        </div>

        <p className="text-sm text-slate-500">{t('Built for independent and mid-sized hotels.', 'Tehty itsenäisille ja keskikokoisille hotelleille.')}</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10 sm:p-10 min-h-screen lg:min-h-0 bg-white">
        <div className="w-full max-w-[26rem]">
          <a href="/" className="flex items-center gap-2.5 mb-8 lg:hidden w-fit" aria-label={t('Lodgora website', 'Lodgoran verkkosivu')}>
            <LogoMark />
            <span className="font-semibold text-xl tracking-[-0.03em]" style={{ color: INK }}>Lodgora</span>
          </a>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-4xl tracking-[-0.045em]" style={{ color: INK }}>{t('Sign in', 'Kirjaudu')}</h2>
              <p className="text-slate-500 mt-1.5">{t('Choose how you use Lodgora.', 'Valitse, miten käytät Lodgoraa.')}</p>
            </div>
            <LangSwitch className="flex-none mt-1" />
          </div>

          {notice && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm px-4 py-3" role="alert">{notice}</div>
          )}

          {isDemo && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm px-4 py-3 flex gap-2.5">
              <Icon name="alert" className="w-4 h-4 mt-0.5 flex-none text-amber-600" />
              <span><b>{t('Demo mode.', 'Demotila.')}</b> {t('Data stays in this browser. Nothing is sent anywhere.', 'Tiedot pysyvät tässä selaimessa. Mitään ei lähetetä minnekään.')}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-6" role="tablist" aria-label={t('Who is signing in', 'Kuka kirjautuu')}>
            {ROLES.map((r) => {
              const on = tab === r.id;
              return (
                <button key={r.id} role="tab" aria-selected={on} onClick={() => setTab(r.id)}
                  className={`text-left rounded-3xl border-2 p-4 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B0B0F] ${on ? 'border-[#0B0B0F] bg-white' : 'border-transparent bg-[#F4F5F7] hover:bg-[#ECEDF1]'}`}>
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center ${on ? 'bg-[#0B0B0F] text-white' : 'bg-white text-slate-500'}`}><Icon name={r.icon} className="w-[18px] h-[18px]" /></span>
                  <span className="block mt-2.5 font-semibold text-[15px]" style={{ color: INK }}>{r.label}</span>
                  <span className="block mt-0.5 text-xs leading-snug text-slate-500">{r.text}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-7">
            {tab === 'staff' ? <StaffForm onSession={onSession} isDemo={isDemo} /> : <ManagerForm onSession={onSession} isDemo={isDemo} />}
          </div>
          <p className="mt-8 text-sm text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
            <span>{t('New to Lodgora?', 'Uusi Lodgoran käyttäjä?')} <a href={t('/', '/fi')} className="font-semibold text-[#0B0B0F] hover:underline">{t('See what it does', 'Katso, mitä se tekee')}</a></span>
          </p>
        </div>
      </main>
    </div>
  );
}

function StaffForm({ onSession, isDemo }) {
  const [hotelCode, setHotelCode] = useState(isDemo ? 'DEMO01' : '');
  const [username, setUsername] = useState(isDemo ? 'emma' : '');
  const [pin, setPin] = useState(isDemo ? '1234' : '');
  const [focus, setFocus] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!hotelCode.trim() || !username.trim() || pin.length !== 4) {
      setError(t('Enter the hotel code, your username and your 4-digit PIN.', 'Syötä hotellikoodi, käyttäjätunnus ja nelinumeroinen PIN-koodi.'));
      return;
    }
    setBusy(true);
    try { onSession(await backend.auth.signInStaff({ hotelCode, username, pin })); }
    catch (err) { setError(tErr(err.message)); setPin(''); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Field id="l-code" label={t('Hotel code', 'Hotellikoodi')} hint={t('Your manager gives you this code.', 'Esimiehesi antaa sinulle tämän koodin.')}>
        <input id="l-code" className={`${input} tracking-wider ${hotelCode ? 'uppercase' : ''}`} value={hotelCode} autoCapitalize="characters" autoComplete="off"
          onChange={(e) => setHotelCode(e.target.value.toUpperCase())} placeholder={t('e.g. 4F9A2C', 'esim. 4F9A2C')} />
      </Field>
      <Field id="l-user" label={t('Username', 'Käyttäjätunnus')}>
        <input id="l-user" className={input} value={username} autoCapitalize="none" autoCorrect="off" autoComplete="username"
          onChange={(e) => setUsername(e.target.value)} placeholder={t('e.g. emma', 'esim. emma')} />
      </Field>
      <Field id="l-pin" label={t('PIN', 'PIN-koodi')}>
        <div className="relative">
          <div className="grid grid-cols-4 gap-3" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`h-16 rounded-2xl border-2 flex items-center justify-center text-2xl text-[#0B0B0F] transition-colors ${focus && pin.length === i ? 'border-[#0B0B0F] bg-white' : 'border-transparent bg-[#F4F5F7]'}`}>{pin[i] ? '●' : ''}</div>
            ))}
          </div>
          <input id="l-pin" className="absolute inset-0 w-full h-full opacity-0 cursor-text" value={pin} type="password"
            inputMode="numeric" pattern="[0-9]*" maxLength={4} autoComplete="current-password" aria-label={t('PIN, 4 digits', 'PIN-koodi, 4 numeroa')}
            onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
        </div>
      </Field>
      {error && <p className="text-sm text-rose-600 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2" role="alert">{error}</p>}
      <button type="submit" className={primary} disabled={busy}>
        <Icon name="lock" className="w-4 h-4" />{busy ? t('Signing in…', 'Kirjaudutaan…') : t('Sign in', 'Kirjaudu')}
      </button>
      {isDemo && <p className="text-xs text-slate-500 text-center">{t('Demo login is pre-filled. Other demo users: olivia, grace, jack (PIN 1234).', 'Demokirjautuminen on esitäytetty. Muut demokäyttäjät: olivia, grace, jack (PIN 1234).')}</p>}
    </form>
  );
}

function ManagerForm({ onSession, isDemo }) {
  const [mode, setMode] = useState('signin'); // signin | signup | forgot
  const [f, setF] = useState({ email: '', password: '', fullName: '', hotelName: '', inviteCode: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const set = (k, v) => setF({ ...f, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (mode === 'forgot') {
      if (!/^\S+@\S+\.\S+$/.test(f.email)) { setErrors({ email: t('Enter the email you used to sign up.', 'Syötä sähköposti, jolla rekisteröidyit.') }); return; }
      setBusy(true);
      try { await backend.auth.sendPasswordReset(f.email.trim()); setNotice(t(`If ${f.email.trim()} has an account, we just sent it a link to choose a new password. It can take a minute. Check your spam folder too.`, `Jos osoitteella ${f.email.trim()} on tili, lähetimme sinne linkin uuden salasanan valitsemiseen. Se voi kestää minuutin. Tarkista myös roskapostikansio.`)); }
      catch (err) { setErrors({ form: tErr(err.message) }); }
      finally { setBusy(false); }
      return;
    }
    if (!isDemo) {
      if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = t('Enter a valid email.', 'Syötä kelvollinen sähköposti.');
      if (f.password.length < 6) er.password = t('Use at least 6 characters.', 'Käytä vähintään 6 merkkiä.');
    }
    if (mode === 'signup') {
      if (f.fullName.trim().length < 2) er.fullName = t('Enter your name.', 'Syötä nimesi.');
      if (f.hotelName.trim().length < 2) er.hotelName = t('Enter the hotel name.', 'Syötä hotellin nimi.');
      if (f.inviteCode.replace(/[^A-Za-z0-9]/g, '').length < 6) er.inviteCode = t('Enter the invitation code you received.', 'Syötä saamasi kutsukoodi.');
    }
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      if (mode === 'signin') onSession(await backend.auth.signInManager(f.email, f.password));
      else {
        const res = await backend.auth.signUpManager(f);
        if (res?.needsConfirmation) setNotice(t('Check your email and click the confirmation link. Then come back here and sign in. Your hotel is created on your first sign in.', 'Tarkista sähköpostisi ja klikkaa vahvistuslinkkiä. Palaa sitten tänne ja kirjaudu sisään. Hotellisi luodaan ensimmäisellä kirjautumiskerralla.'));
        else onSession(res);
      }
    } catch (err) { setErrors({ form: tErr(err.message) }); }
    finally { setBusy(false); }
  };

  if (notice) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-sm leading-relaxed p-5" role="status">
        {notice}
        <button className="block mt-4 font-semibold text-[#0B0B0F] hover:underline" onClick={() => { setNotice(''); setMode('signin'); }}>{t('Back to sign in', 'Takaisin kirjautumiseen')}</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {isDemo && (
        <button type="button" className={primary} onClick={() => backend.auth.signInManager().then(onSession)}>
          {t('Open the manager demo', 'Avaa esimiehen demo')}<Icon name="arrow" className="w-4 h-4" />
        </button>
      )}
      {isDemo && <p className="text-xs text-slate-500 text-center">{t('In demo mode no account is needed.', 'Demotilassa tiliä ei tarvita.')}</p>}
      {!isDemo && (
        <>
          {mode === 'signup' && (
            <>
              <Field id="m-name" label={t('Your name', 'Nimesi')} error={errors.fullName}>
                <input id="m-name" className={input} value={f.fullName} onChange={(e) => set('fullName', e.target.value)} autoComplete="name" />
              </Field>
              <Field id="m-invite" label={t('Invitation code', 'Kutsukoodi')} error={errors.inviteCode}
                hint={SITE.contactEmail || SITE.requestUrl ? <>{t('No code yet?', 'Ei vielä koodia?')} <a className="font-semibold text-[#0B0B0F] hover:underline" {...(SITE.requestUrl ? { href: SITE.requestUrl, target: '_blank', rel: 'noopener noreferrer' } : { href: `mailto:${SITE.contactEmail}?subject=${encodeURIComponent(t('Lodgora invitation', 'Lodgora-kutsu'))}` })}>{t('Ask for one', 'Pyydä sellainen')}</a>.</> : t('Lodgora gives you this code when your hotel joins.', 'Lodgora antaa tämän koodin, kun hotellisi liittyy.')}>
                <input id="m-invite" className={`${input} uppercase tracking-wider`} value={f.inviteCode} autoComplete="off" autoCapitalize="characters" placeholder="A1B2C-D3E4F"
                  onChange={(e) => set('inviteCode', e.target.value)} />
              </Field>
              <Field id="m-hotel" label={t('Hotel name', 'Hotellin nimi')} error={errors.hotelName}>
                <input id="m-hotel" className={input} value={f.hotelName} onChange={(e) => set('hotelName', e.target.value)} />
              </Field>
            </>
          )}
          <Field id="m-email" label={t('Email', 'Sähköposti')} error={errors.email}>
            <input id="m-email" type="email" className={input} value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
          </Field>
          {mode !== 'forgot' && <Field id="m-pass" label={t('Password', 'Salasana')} error={errors.password}>
            <input id="m-pass" type="password" className={input} value={f.password} onChange={(e) => set('password', e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
          </Field>}
          {mode === 'signin' && (
            <button type="button" className="block text-sm font-semibold text-[#0B0B0F] hover:underline -mt-1" onClick={() => { setMode('forgot'); setErrors({}); }}>{t('Forgot your password?', 'Unohditko salasanasi?')}</button>
          )}
          {mode === 'forgot' && <p className="text-sm text-slate-500">{t('We will email you a link to choose a new password.', 'Lähetämme sinulle sähköpostilla linkin uuden salasanan valitsemiseen.')}</p>}
          {errors.form && <p className="text-sm text-rose-600 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2" role="alert">{errors.form}</p>}
          <button type="submit" className={primary} disabled={busy}>
            {busy ? t('Please wait…', 'Odota hetki…') : mode === 'signin' ? t('Sign in', 'Kirjaudu') : mode === 'forgot' ? t('Send reset link', 'Lähetä palautuslinkki') : t('Create hotel account', 'Luo hotellitili')}
          </button>
          <button type="button" className={secondary} onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErrors({}); }}>
            {mode === 'signin' ? t('Create hotel account', 'Luo hotellitili') : mode === 'forgot' ? t('Back to sign in', 'Takaisin kirjautumiseen') : t('I already have an account', 'Minulla on jo tili')}
          </button>
        </>
      )}
    </form>
  );
}
