import { useState } from 'react';
import { backend } from '../lib/backend';
import { Field, Icon, LogoMark, btnPrimary, btnGhost, inputCls } from '../components/ui';

export default function Login({ onSession }) {
  const isDemo = backend.mode === 'demo';
  const [tab, setTab] = useState(isDemo ? 'manager' : 'staff'); // quem abre a demo é, quase sempre, um gerente

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Painel de marca (só em ecrãs grandes) */}
      <aside className="hidden lg:flex flex-col justify-between bg-[#172B4D] text-white p-12">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
              <rect x="4" y="13" width="4" height="7" rx="1.5" fill="#fff" />
              <rect x="10" y="9" width="4" height="11" rx="1.5" fill="#19A7A1" />
              <rect x="16" y="4" width="4" height="16" rx="1.5" fill="#fff" />
            </svg>
          </span>
          <span className="text-2xl font-bold tracking-tight">Lodgora</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight">Hotel operations,<br />made <span className="text-[#19A7A1]">simpler.</span></h1>
          <ul className="mt-8 space-y-3 text-slate-300 text-sm">
            <li className="flex gap-3"><Icon name="check" className="w-5 h-5 text-[#19A7A1] flex-none" />See which rooms are ready, in real time.</li>
            <li className="flex gap-3"><Icon name="check" className="w-5 h-5 text-[#19A7A1] flex-none" />Housekeepers use a simple screen on their phone.</li>
            <li className="flex gap-3"><Icon name="check" className="w-5 h-5 text-[#19A7A1] flex-none" />Maintenance issues reported once, never lost.</li>
          </ul>
        </div>
        <p className="text-xs text-slate-400">Built for independent and mid-sized hotels.</p>
      </aside>

      <main className="flex items-center justify-center p-4 sm:p-8 min-h-screen lg:min-h-0">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <LogoMark />
            <span className="font-bold text-xl tracking-tight text-[#172B4D]">Lodgora</span>
          </div>

          <h2 className="text-2xl font-bold text-[#172B4D]">Sign in</h2>
          <p className="text-sm text-slate-500 mt-1">Choose how you use Lodgora.</p>

          {isDemo && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs px-3 py-2.5">
              <b>Demo mode.</b> Data stays in this browser. Nothing is sent anywhere.
            </div>
          )}

          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg mt-6" role="tablist">
            {[['staff', 'Hotel team'], ['manager', 'Manager']].map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`py-2 rounded-md text-sm font-semibold transition-colors ${tab === id ? 'bg-white text-[#172B4D] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {tab === 'staff' ? <StaffForm onSession={onSession} isDemo={isDemo} /> : <ManagerForm onSession={onSession} isDemo={isDemo} />}
          </div>
          <p className="mt-8 text-sm text-slate-500">New to Lodgora? <a href="/" className="font-semibold text-[#0D7C77] hover:underline">See what it does</a></p>
        </div>
      </main>
    </div>
  );
}

function StaffForm({ onSession, isDemo }) {
  const [hotelCode, setHotelCode] = useState(isDemo ? 'DEMO01' : '');
  const [username, setUsername] = useState(isDemo ? 'emma' : '');
  const [pin, setPin] = useState(isDemo ? '1234' : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!hotelCode.trim() || !username.trim() || pin.length !== 4) {
      setError('Enter the hotel code, your username and your 4-digit PIN.');
      return;
    }
    setBusy(true);
    try { onSession(await backend.auth.signInStaff({ hotelCode, username, pin })); }
    catch (err) { setError(err.message); setPin(''); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field id="l-code" label="Hotel code" hint="Your manager gives you this code.">
        <input id="l-code" className={`${inputCls} uppercase tracking-wider`} value={hotelCode} autoCapitalize="characters" autoComplete="off"
          onChange={(e) => setHotelCode(e.target.value.toUpperCase())} placeholder="e.g. 4F9A2C" />
      </Field>
      <Field id="l-user" label="Username">
        <input id="l-user" className={inputCls} value={username} autoCapitalize="none" autoCorrect="off" autoComplete="username"
          onChange={(e) => setUsername(e.target.value)} placeholder="e.g. emma" />
      </Field>
      <Field id="l-pin" label="PIN">
        <input id="l-pin" className={`${inputCls} text-center text-2xl tracking-[0.6em] font-semibold`} value={pin} type="password"
          inputMode="numeric" pattern="[0-9]*" maxLength={4} autoComplete="current-password"
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" />
      </Field>
      {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}
      <button type="submit" className={`${btnPrimary} w-full py-3`} disabled={busy}>
        <Icon name="lock" className="w-4 h-4" />{busy ? 'Signing in…' : 'Sign in'}
      </button>
      {isDemo && <p className="text-xs text-slate-500 text-center">Demo login is pre-filled. Other demo users: olivia, grace, jack (PIN 1234).</p>}
    </form>
  );
}

function ManagerForm({ onSession, isDemo }) {
  const [mode, setMode] = useState('signin'); // signin | signup | forgot
  const [f, setF] = useState({ email: '', password: '', fullName: '', hotelName: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const set = (k, v) => setF({ ...f, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (mode === 'forgot') {
      if (!/^\S+@\S+\.\S+$/.test(f.email)) { setErrors({ email: 'Enter the email you used to sign up.' }); return; }
      setBusy(true);
      try { await backend.auth.sendPasswordReset(f.email.trim()); setNotice(`If ${f.email.trim()} has an account, we just sent it a link to choose a new password. It can take a minute. Check your spam folder too.`); }
      catch (err) { setErrors({ form: err.message }); }
      finally { setBusy(false); }
      return;
    }
    if (!isDemo) {
      if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'Enter a valid email.';
      if (f.password.length < 6) er.password = 'Use at least 6 characters.';
    }
    if (mode === 'signup') {
      if (f.fullName.trim().length < 2) er.fullName = 'Enter your name.';
      if (f.hotelName.trim().length < 2) er.hotelName = 'Enter the hotel name.';
    }
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      if (mode === 'signin') onSession(await backend.auth.signInManager(f.email, f.password));
      else {
        const res = await backend.auth.signUpManager(f);
        if (res?.needsConfirmation) setNotice('Check your email and click the confirmation link. Then come back here and sign in. Your hotel is created on your first sign in.');
        else onSession(res);
      }
    } catch (err) { setErrors({ form: err.message }); }
    finally { setBusy(false); }
  };

  if (notice) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm p-4" role="status">
        {notice}
        <button className="block mt-3 font-semibold underline" onClick={() => { setNotice(''); setMode('signin'); }}>Back to sign in</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {isDemo && (
        <button type="button" className={`${btnPrimary} w-full py-3`} onClick={() => backend.auth.signInManager().then(onSession)}>
          Open the manager demo
        </button>
      )}
      {isDemo && <p className="text-xs text-slate-500 text-center">In demo mode no account is needed.</p>}
      {!isDemo && (
        <>
          {mode === 'signup' && (
            <>
              <Field id="m-name" label="Your name" error={errors.fullName}>
                <input id="m-name" className={inputCls} value={f.fullName} onChange={(e) => set('fullName', e.target.value)} autoComplete="name" />
              </Field>
              <Field id="m-hotel" label="Hotel name" error={errors.hotelName}>
                <input id="m-hotel" className={inputCls} value={f.hotelName} onChange={(e) => set('hotelName', e.target.value)} />
              </Field>
            </>
          )}
          <Field id="m-email" label="Email" error={errors.email}>
            <input id="m-email" type="email" className={inputCls} value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
          </Field>
          {mode !== 'forgot' && <Field id="m-pass" label="Password" error={errors.password}>
            <input id="m-pass" type="password" className={inputCls} value={f.password} onChange={(e) => set('password', e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
          </Field>}
          {mode === 'signin' && (
            <button type="button" className="block text-sm font-semibold text-[#0D7C77] hover:underline -mt-1" onClick={() => { setMode('forgot'); setErrors({}); }}>Forgot your password?</button>
          )}
          {mode === 'forgot' && <p className="text-sm text-slate-500">We will email you a link to choose a new password.</p>}
          {errors.form && <p className="text-sm text-rose-600" role="alert">{errors.form}</p>}
          <button type="submit" className={`${btnPrimary} w-full py-3`} disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'forgot' ? 'Send reset link' : 'Create hotel account'}
          </button>
          <button type="button" className={`${btnGhost} w-full`} onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErrors({}); }}>
            {mode === 'signin' ? 'Create hotel account' : mode === 'forgot' ? 'Back to sign in' : 'I already have an account'}
          </button>
        </>
      )}
    </form>
  );
}
