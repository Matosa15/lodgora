// Ecrã para escolher uma password nova, depois de abrir o link do email.
import { useState } from 'react';
import { backend } from '../lib/backend';
import { Field, LogoMark, LangSwitch, btnPrimary, inputCls } from '../components/ui';
import { t } from '../lib/i18n';
import { tErr } from '../lib/errors';

export default function ResetPassword({ onDone, onCancel }) {
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError(t('Use at least 6 characters.', 'Käytä vähintään 6 merkkiä.')); return; }
    if (password !== again) { setError(t('The two passwords are not the same.', 'Salasanat eivät täsmää.')); return; }
    setBusy(true);
    setError('');
    try { onDone(await backend.auth.updatePassword(password)); }
    catch (err) { setError(tErr(err.message)); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4" noValidate>
        <div className="flex items-center gap-2 mb-6">
          <LogoMark />
          <span className="font-bold text-xl tracking-tight text-[#0B0B0F]">Lodgora</span>
          <LangSwitch className="ml-auto" />
        </div>
        <h1 className="text-2xl font-bold text-[#0B0B0F]">{t('Choose a new password', 'Valitse uusi salasana')}</h1>
        <p className="text-sm text-slate-500">{t('Pick a password you have not used before. You will be signed in right after.', 'Valitse salasana, jota et ole käyttänyt aiemmin. Kirjaudut sisään heti sen jälkeen.')}</p>
        <Field id="np-pass" label={t('New password', 'Uusi salasana')}>
          <input id="np-pass" type="password" className={inputCls} value={password} autoComplete="new-password" onChange={(e) => { setPassword(e.target.value); setError(''); }} />
        </Field>
        <Field id="np-again" label={t('Type it again', 'Kirjoita se uudelleen')} error={error}>
          <input id="np-again" type="password" className={inputCls} value={again} autoComplete="new-password" onChange={(e) => { setAgain(e.target.value); setError(''); }} />
        </Field>
        <button type="submit" className={`${btnPrimary} w-full py-3`} disabled={busy}>{busy ? t('Saving…', 'Tallennetaan…') : t('Save password and sign in', 'Tallenna salasana ja kirjaudu')}</button>
        <button type="button" onClick={onCancel} className="block mx-auto text-sm font-semibold text-slate-500 hover:underline">{t('Cancel', 'Peruuta')}</button>
      </form>
    </main>
  );
}
