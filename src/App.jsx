import { useEffect, useState } from 'react';
import { backend } from './lib/backend';
import { ToastProvider, Spinner } from './components/ui';
import Login from './screens/Login';
import Manager from './screens/Manager';
import Housekeeper from './screens/Housekeeper';

export default function App() {
  // undefined = a verificar se já há sessão; null = sem sessão
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    backend.auth.getSession().then(setSession).catch(() => setSession(null));
  }, []);

  const signOut = async () => {
    await backend.auth.signOut();
    setSession(null);
  };

  let screen;
  if (session === undefined) screen = <Spinner label="Loading" />;
  else if (!session) screen = <Login onSession={setSession} />;
  else if (session.kind === 'manager') screen = <Manager session={session} signOut={signOut} />;
  else screen = <Housekeeper session={session} signOut={signOut} />;

  return <ToastProvider>{screen}</ToastProvider>;
}
