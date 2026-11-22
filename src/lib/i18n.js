// Línguas: inglês (en) e finlandês (fi).
// Página pública: "/" = inglês, "/fi" = finlandês. Aplicação: a língua escolhida fica guardada neste telemóvel.
const KEY = 'lodgora-lang';
const q = new URLSearchParams(location.search);
const isSiteRoute = /^\/(fi)?\/?$/.test(location.pathname) && !q.has('demo');
const fromUrl = q.get('lang');
if (fromUrl === 'fi' || fromUrl === 'en') { try { localStorage.setItem(KEY, fromUrl); } catch { /* ignora */ } }
let stored = null;
try { stored = localStorage.getItem(KEY); } catch { /* ignora */ }

export const LANG = isSiteRoute
  ? (/^\/fi(\/|$)/.test(location.pathname) ? 'fi' : 'en')
  : (fromUrl === 'fi' || fromUrl === 'en' ? fromUrl : stored === 'fi' ? 'fi' : 'en');
export const P = LANG === 'fi' ? '/fi' : '/'; // base dos links de secção da página pública: `${P}#how`
export const LOCALE = LANG === 'fi' ? 'fi-FI' : 'en-GB';
export const t = (en, fi) => (LANG === 'fi' ? fi : en);
// Muda a língua da aplicação e recarrega
export const setLang = (l) => { try { localStorage.setItem(KEY, l); } catch { /* ignora */ } location.reload(); };
