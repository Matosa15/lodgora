// Língua da página pública: "/" = inglês, "/fi" = finlandês. Mudar de língua recarrega a página.
export const LANG = /^\/fi(\/|$)/.test(location.pathname) ? 'fi' : 'en';
export const P = LANG === 'fi' ? '/fi' : '/'; // base dos links de secção: `${P}#how`
export const t = (en, fi) => (LANG === 'fi' ? fi : en);
