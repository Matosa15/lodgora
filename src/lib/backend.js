// Escolhe de onde vêm os dados:
//  - "live": base de dados Supabase (quando as duas variáveis estão definidas)
//  - "demo": dados de exemplo guardados só neste navegador (para mostrar a clientes e para testar)
import { createLiveBackend } from './liveBackend';
import { createDemoBackend } from './demoBackend';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const forceDemo = typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo');

export const backend = url && key && !forceDemo ? createLiveBackend(url, key) : createDemoBackend();
