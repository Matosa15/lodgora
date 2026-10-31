// Ecrã para escolher uma password nova, depois de abrir o link do email.
import { useState } from 'react';
import { backend } from '../lib/backend';
import { Field, LogoMark, btnPrimary, inputCls } from '../components/ui';

export default function ResetPassword({ onDone, onCancel }) {
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Use at least 6 characters.'); return; }
    if (password !== again) { setError('The two passwords are not the same.'); return; }
    setBusy(true);
    setError('');
    try { onDone(await backend.auth.updatePassword(password)); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4" noValidate>
        <div className="flex items-center gap-2 mb-6">
          <LogoMark />
          <span className="font-bold text-xl tracking-tight text-[#172B4D]">Lodgora</span>
        </div>
        <h1 className="text-2xl font-bold text-[#172B4D]">Choose a new password</h1>
        <p className="text-sm text-slate-500">Pick a password you have not used before. You will be signed in right after.</p>
        <Field id="np-pass" label="New password">
          <input id="np-pass" type="password" className={inputCls} value={password} autoComplete="new-password" onChange={(e) => { setPassword(e.target.value); setError(''); }} />
        </Field>
        <Field id="np-again" label="Type it again" error={error}>
          <input id="np-again" type="password" className={inputCls} value={again} autoComplete="new-password" onChange={(e) => { setAgain(e.target.value); setError(''); }} />
        </Field>
        <button type="submit" className={`${btnPrimary} w-full py-3`} disabled={busy}>{busy ? 'Saving…' : 'Save password and sign in'}</button>
        <button type="button" onClick={onCancel} className="block mx-auto text-sm font-semibold text-slate-500 hover:underline">Cancel</button>
      </form>
    </main>
  );
}
