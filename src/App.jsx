import { useEffect, useState } from 'react';
import { backend } from './lib/backend';
import { ToastProvider, Spinner } from './components/ui';
import Login from './screens/Login';
import Manager from './screens/Manager';
import Housekeeper from './screens/Housekeeper';
import Technician from './screens/Technician';
import ResetPassword from './screens/ResetPassword';

export default function App() {
  // undefined = a verificar se já há sessão; null = sem sessão
  const [session, setSession] = useState(undefined);
  // true quando o gerente abriu o link do email "Reset your password"
  const [recovery, setRecovery] = useState(() => backend.auth.recovering());

  useEffect(() => {
    backend.auth.getSession().then(setSession).catch(() => setSession(null));
  }, []);

  useEffect(() => backend.auth.onRecovery(() => setRecovery(true)), []);

  // Link do email expirado ou já usado: o Supabase devolve o erro no endereço
  const linkError = /error_code=otp_expired|error=access_denied/.test(location.hash)
    ? 'That link has expired or was already used. Choose Manager and press "Forgot your password?" to get a new one.' : '';

  const signOut = async () => {
    await backend.auth.signOut();
    setSession(null);
  };

  let screen;
  if (recovery) screen = <ResetPassword onDone={(sess) => { setRecovery(false); setSession(sess); }} onCancel={() => { setRecovery(false); setSession(null); backend.auth.signOut(); }} />;
  else if (session === undefined) screen = <Spinner label="Loading" />;
  else if (!session) screen = <Login onSession={setSession} notice={linkError} />;
  else if (session.kind === 'manager') screen = <Manager session={session} signOut={signOut} />;
  else if (session.role === 'maintenance') screen = <Technician session={session} signOut={signOut} />;
  else screen = <Housekeeper session={session} signOut={signOut} />;

  return <ToastProvider>{screen}</ToastProvider>;
}
