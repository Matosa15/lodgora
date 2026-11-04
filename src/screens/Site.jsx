// Página pública do Lodgora (endereço "/"). A aplicação fica em "/app".
import { useEffect, useRef, useState } from 'react';
import { Icon, LogoMark } from '../components/ui';
import { STATUS_STYLE, statusLabel } from '../lib/constants';
import { SITE } from '../lib/site';
import { Reveal, TryIt, StatsMock, PlanPicker } from './SiteDemo';

const INK = '#172B4D';

const demoHref = '/app?demo';
const ACCENT = { Ready: '#10B981', Dirty: '#F97316', Cleaning: '#3B82F6', 'Awaiting inspection': '#F59E0B' };
const mailto = (subject) => `mailto:${SITE.contactEmail}?subject=${encodeURIComponent(subject)}`;

const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-[15px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D7C77]';
const btnPrimary = `${btn} bg-[#0D7C77] text-white hover:bg-[#0A6A66]`;
const btnLight = `${btn} bg-white text-[#172B4D] border border-slate-300 hover:bg-slate-50`;

export default function Site() {
  // Quem já entrou como equipa neste telemóvel vai direto para a aplicação
  useEffect(() => {
    try { if (localStorage.getItem('lodgora-staff-session')) location.replace('/app'); } catch { /* ignora */ }
  }, []);

  return (
    <div className="bg-white text-slate-700">
      <Header />
      <main>
        <Hero />
        <Day />
        <ForHousekeepers />
        <ForManagers />
        <Everything />
        <Pricing />
        <Faq />
        <Closing />
      </main>
      <Footer />
    </div>
  );
}

/* ---------------- Cabeçalho ---------------- */

export function Header() {
  const links = [['How it works', '/#how'], ['Features', '/#features'], ['Pricing', '/#pricing'], ['Questions', '/#faq']];
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 pt-safe">
      <div className="mx-auto max-w-6xl h-16 px-5 flex items-center gap-6">
        <a href="/" className="flex items-center gap-2.5" aria-label="Lodgora home">
          <LogoMark />
          <span className="font-display font-bold text-xl tracking-tight" style={{ color: INK }}>Lodgora</span>
        </a>
        <nav aria-label="Sections" className="hidden md:flex gap-6 ml-6 text-sm font-medium">
          {links.map(([label, href]) => <a key={href} href={href} className="text-slate-600 hover:text-[#172B4D]">{label}</a>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a href="/app" className="px-3 py-2 text-sm font-semibold text-[#172B4D] hover:underline">Sign in</a>
          <a href={demoHref} className={`${btnPrimary} !py-2 !px-4 !text-sm`}>Try the demo</a>
        </div>
      </div>
    </header>
  );
}

/* ---------------- Início: o corredor de placas de porta ---------------- */

const START = [
  ['201', 'Ready'], ['202', 'Dirty'], ['203', 'Cleaning'],
  ['204', 'Awaiting inspection'], ['205', 'Dirty'], ['206', 'Ready'],
  ['207', 'Cleaning'], ['208', 'Dirty'], ['209', 'Ready']
];
const NEXT = { Dirty: 'Cleaning', Cleaning: 'Awaiting inspection', 'Awaiting inspection': 'Ready', Ready: 'Dirty' };
const WHO = {
  Cleaning: (n) => `A housekeeper pressed Start cleaning in room ${n}.`,
  'Awaiting inspection': (n) => `A housekeeper pressed Finish in room ${n}. It now waits for your inspection.`,
  Ready: (n) => `You approved room ${n}. It is ready for the next guest.`,
  Dirty: (n) => `A guest checked out of room ${n}. It needs cleaning.`
};

const AUTO_ORDER = ['202', '205', '208', '203', '207', '204', '202', '205'];
const prefersReduced = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Hero() {
  const [rooms, setRooms] = useState(START);
  const [feed, setFeed] = useState([]);
  const [playing, setPlaying] = useState(() => !prefersReduced());
  const roomsRef = useRef(START);
  const idRef = useRef(0);
  const stepRef = useRef(0);
  const ready = rooms.filter(([, s]) => s === 'Ready').length;

  const advance = (n) => {
    const current = roomsRef.current.find(([num]) => num === n)[1];
    const next = NEXT[current];
    const updated = roomsRef.current.map(([num, s]) => (num === n ? [num, next] : [num, s]));
    roomsRef.current = updated;
    setRooms(updated);
    setFeed((f) => [{ id: ++idRef.current, text: WHO[next](n) }, ...f].slice(0, 3));
  };

  // Uma manhã de exemplo vai-se desenrolando sozinha, até alguém tocar numa placa ou carregar em Pause
  useEffect(() => {
    if (!playing) return undefined;
    const t = setInterval(() => advance(AUTO_ORDER[stepRef.current++ % AUTO_ORDER.length]), 2400);
    return () => clearInterval(t);
  }, [playing]);

  const tap = (n) => { setPlaying(false); advance(n); };

  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-title">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(60rem 28rem at 85% -5%, #DFF1F0 0%, rgba(223,241,240,0) 60%), radial-gradient(40rem 22rem at -5% 100%, #F3EBDD 0%, rgba(243,235,221,0) 60%)' }} />
      <div className="relative mx-auto max-w-6xl px-5 pt-12 pb-16 sm:pt-16 sm:pb-20 grid lg:grid-cols-[1.02fr_1fr] gap-12 lg:gap-16 items-center">
        <div>
          <h1 id="hero-title" className="font-display font-semibold text-[2.5rem] sm:text-5xl lg:text-[3.4rem] leading-[1.06] tracking-tight" style={{ color: INK }}>
            Know which rooms are{' '}
            <span className="relative inline-block whitespace-nowrap"><span className="relative">ready</span><span aria-hidden="true" className="absolute left-0 right-0 bottom-[0.06em] h-[0.2em] rounded-full bg-[#19A7A1]/35 -z-0" /></span>{' '}
            without picking up the phone.
          </h1>
          <p className="mt-6 text-lg leading-relaxed max-w-[34rem]">
            Lodgora is a simple tool for hotel housekeeping and maintenance. Your team updates rooms from their phones, and you see
            every room, every cleaning time and every problem as it happens.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={demoHref} className={btnPrimary}>Try the live demo</a>
            <a href="#try" className={btnLight}>Play with it below</a>
            {SITE.contactEmail && <a href={mailto('Lodgora demo request')} className={btnLight}>Request a demo</a>}
          </div>
          <p className="mt-4 text-sm text-slate-500">The demo opens in your browser with example data. No account needed.</p>
        </div>

        <div>
          <div className="rounded-2xl p-5 sm:p-7 border border-[#D5E8E6]" style={{ background: '#EAF4F3', boxShadow: '0 30px 50px -36px rgba(23,43,77,.4)' }}>
            <ul className="grid grid-cols-3 gap-3 sm:gap-4">
              {rooms.map(([n, s]) => (
                <li key={n}>
                  <button type="button" onClick={() => tap(n)}
                    aria-label={`Room ${n}, ${statusLabel(s)}. Press to move it to the next step.`}
                    className="relative w-full min-h-[7.25rem] rounded-xl px-3.5 pt-4 pb-4 text-left active:translate-y-px hover:-translate-y-0.5 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D7C77]"
                    style={{ background: '#fff', border: '1px solid #DCE5EA', boxShadow: `inset 0 -4px 0 ${ACCENT[s]}, 0 10px 18px -12px rgba(23,43,77,.35)`, transition: 'box-shadow .3s' }}>
                    {['top-1.5 left-1.5', 'top-1.5 right-1.5', 'bottom-1.5 left-1.5', 'bottom-1.5 right-1.5'].map((pos) => (
                      <span key={pos} aria-hidden="true" className={`absolute ${pos} w-1 h-1 rounded-full bg-slate-200`} />
                    ))}
                    <span className="plate-num block text-[2rem] sm:text-[2.5rem] leading-none" style={{ color: INK }}>{n}</span>
                    <span className="mt-3 flex items-start gap-2 text-[13px] leading-tight text-slate-600">
                      <span key={s} className={`mt-[3px] w-2 h-2 rounded-full flex-none dot-pop ${STATUS_STYLE[s].dot}`} aria-hidden="true" />{statusLabel(s)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-5">
            <div className="flex items-end justify-between gap-4">
              <p className="font-display text-2xl font-semibold" style={{ color: INK }} aria-live="polite">{ready} of {rooms.length} rooms are ready</p>
              <button type="button" onClick={() => setPlaying((p) => !p)} className="text-sm font-semibold text-[#0D7C77] hover:underline inline-flex items-center gap-1.5 flex-none">
                <Icon name={playing ? 'pause' : 'play'} className="w-4 h-4" />{playing ? 'Pause the example' : 'Play a sample morning'}
              </button>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden" aria-hidden="true"><div className="h-full rounded-r-[4px] bg-[#0D7C77] transition-[width] duration-500" style={{ width: `${(ready / rooms.length) * 100}%` }} /></div>
            <ul className="mt-3 min-h-[4.75rem] space-y-1.5" aria-label="What just happened">
              {feed.length === 0 && <li className="text-sm text-slate-500">Tap a room to move it to the next step, like your team would.</li>}
              {feed.map((f) => (
                <li key={f.id} className="feed-in flex gap-2 text-sm text-slate-600"><span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#19A7A1] flex-none" />{f.text}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Como funciona (é mesmo uma sequência) ---------------- */

function Day() {
  const steps = [
    ['Add your rooms and your team', 'Enter your room numbers and give each housekeeper a 4-digit PIN. Thirty rooms take about a minute.'],
    ['Your team cleans from their phones', 'They sign in with your hotel code, their username and their PIN. No app to install. They press Start, and Finish when the room is done.'],
    ['You approve and keep track', 'Finished rooms wait for your inspection. You approve them or send them back, and see times and problems on one screen.']
  ];
  return (
    <section id="how" className="bg-[#F3F6F8] border-y border-slate-200" aria-labelledby="how-title">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <h2 id="how-title" className="font-display font-semibold text-3xl sm:text-4xl tracking-tight max-w-xl" style={{ color: INK }}>How a day works with Lodgora</h2>
        <ol className="mt-10 grid md:grid-cols-3 gap-x-10 gap-y-8">
          {steps.map(([title, text], i) => (
            <li key={title} className="flex gap-4 group/step">
              <span className="plate-num text-5xl leading-none flex-none w-9" style={{ color: '#0D7C77' }} aria-hidden="true">{i + 1}</span>
              <div>
                <h3 className="font-display font-semibold text-xl leading-snug" style={{ color: INK }}>{title}</h3>
                <p className="mt-2 leading-relaxed">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------- Para camareiras: telemóvel ---------------- */

function ForHousekeepers() {
  return (
    <section id="try" className="mx-auto max-w-6xl px-5 py-16 sm:py-24 scroll-mt-16" aria-labelledby="hk-title">
      <Reveal>
        <div className="grid md:grid-cols-2 gap-8 md:gap-20 items-end">
          <div>
            <p className="text-sm font-semibold text-[#0D7C77]">Try it yourself</p>
            <h2 id="hk-title" className="mt-2 font-display font-semibold text-3xl sm:text-4xl tracking-tight" style={{ color: INK }}>One screen for the housekeeper, one for you</h2>
            <p className="mt-5 leading-relaxed max-w-md">
              The housekeeper sees only their rooms and common areas, with one big button for what to do next. A timer starts when they press Start.
              They can pause it for a break and press Finish when they are done. You see it on your screen straight away.
            </p>
          </div>
          <ul className="space-y-3 max-w-md">
            {[
              'Works in the phone browser. Nothing to install.',
              'Sign in with a 4-digit PIN. You can see and change every PIN.',
              'Report a broken lamp or a leaking tap from the same screen.'
            ].map((t) => (
              <li key={t} className="flex gap-3"><Icon name="check" className="w-5 h-5 flex-none mt-0.5 text-[#0D7C77]" /><span>{t}</span></li>
            ))}
          </ul>
        </div>
      </Reveal>
      <Reveal className="mt-12" delay={100}><TryIt /></Reveal>
    </section>
  );
}

/* ---------------- Para gerentes: estatísticas ---------------- */

function ForManagers() {
  return (
    <section className="bg-[#F3F6F8] border-y border-slate-200" aria-labelledby="mg-title">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24 grid md:grid-cols-2 gap-12 md:gap-20 items-center">
        <Reveal>
          <h2 id="mg-title" className="font-display font-semibold text-3xl sm:text-4xl tracking-tight" style={{ color: INK }}>See how long cleaning really takes</h2>
          <p className="mt-5 leading-relaxed max-w-md">
            Lodgora keeps a record of every finished cleaning. You see the average time for each room type and for each person, how many rooms you
            approved first time, and how fast maintenance problems get fixed.
          </p>
          <ul className="mt-6 space-y-3 max-w-md">
            {[
              'Choose today, the last 7 days or the last 30 days.',
              'Plan the day with real times instead of guesses.',
              'See the latest cleanings and whether you approved them.'
            ].map((t) => (
              <li key={t} className="flex gap-3"><Icon name="check" className="w-5 h-5 flex-none mt-0.5 text-[#0D7C77]" /><span>{t}</span></li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={120}><StatsMock /></Reveal>
      </div>
    </section>
  );
}

/* ---------------- O resto das funcionalidades ---------------- */

function Everything() {
  const items = [
    ['bed', 'Rooms and common areas', 'Track the lobby, the breakfast room and the gym the same way as your rooms. Ask for all common areas to be cleaned with one button.'],
    ['inspect', 'Inspections', 'A cleaned room waits for you. Approve it, or send it back and the housekeeper sees it on their list again.'],
    ['wrench', 'Maintenance issues', 'Anyone on your team can report a problem with a priority. You see what is open and what is fixed.'],
    ['sparkles', 'Assign cleaning', 'Share the rooms that need cleaning between your housekeepers with one click, or choose who cleans what.'],
    ['users', 'Your team, your PINs', 'Add a person in seconds. You can see their PIN, change it, or stop their access when they leave.'],
    ['refresh', 'Live updates', 'When a housekeeper finishes a room, your screen changes without you refreshing anything.']
  ];
  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-16 sm:py-24" aria-labelledby="ft-title">
      <h2 id="ft-title" className="font-display font-semibold text-3xl sm:text-4xl tracking-tight max-w-xl" style={{ color: INK }}>Everything your housekeeping team needs, and nothing else</h2>
      <ul className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map(([icon, title, text], i) => (
          <li key={title}>
            <Reveal delay={(i % 3) * 90} className="h-full">
              <div className="h-full rounded-xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[#19A7A1] hover:shadow-[0_18px_30px_-22px_rgba(23,43,77,.5)]">
                <span className="w-10 h-10 rounded-lg bg-[#E4F3F2] flex items-center justify-center"><Icon name={icon} className="w-5 h-5 text-[#0D7C77]" /></span>
                <h3 className="mt-4 font-display font-semibold text-lg" style={{ color: INK }}>{title}</h3>
                <p className="mt-1.5 leading-relaxed">{text}</p>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------- Preços ---------------- */

function Pricing() {
  return (
    <section id="pricing" className="bg-[#F3F6F8] border-y border-slate-200" aria-labelledby="pr-title">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24 grid lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-20">
        <div>
          <h2 id="pr-title" className="font-display font-semibold text-3xl sm:text-4xl tracking-tight" style={{ color: INK }}>Pay by the size of your hotel</h2>
          <p className="mt-5 leading-relaxed max-w-md">
            Every plan includes everything on this page. The only difference is how many rooms you have. Start with a free {SITE.pilotDays}-day pilot
            with your own rooms and your own team.
          </p>
          <p className="mt-4 text-sm text-slate-500">Prices are per month and exclude VAT. Have more than 100 rooms? Get in touch.</p>
        </div>
        <PlanPicker />
      </div>
    </section>
  );
}

/* ---------------- Perguntas ---------------- */

function Faq() {
  const qa = [
    ['Do my housekeepers have to install an app?', 'No. They open the Lodgora website on their phone and sign in with your hotel code, their username and a 4-digit PIN.'],
    ['What do I need to get started?', 'A list of your room numbers and the names of your housekeepers. You can add a whole floor of rooms at once.'],
    ['What if someone forgets their PIN?', 'You can see every PIN on the Team page and change it any time. After five wrong tries, that person is locked out for 15 minutes.'],
    ['Where is our data stored?', 'On servers in the European Union (Ireland). Each hotel can only see its own data.'],
    ['Does it connect to my booking system?', 'Not yet. Today your team updates rooms in Lodgora. If a connection to your booking system would help, tell us which one you use.'],
    ['Which languages does it support?', 'English for now.']
  ];
  return (
    <section id="faq" className="mx-auto max-w-6xl px-5 py-16 sm:py-24" aria-labelledby="fq-title">
      <h2 id="fq-title" className="font-display font-semibold text-3xl sm:text-4xl tracking-tight" style={{ color: INK }}>Questions hotels ask</h2>
      <div className="mt-8 max-w-3xl divide-y divide-slate-200 border-y border-slate-200">
        {qa.map(([q, a]) => (
          <details key={q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-[#172B4D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0D7C77] rounded">
              {q}
              <span className="text-xl leading-none text-slate-400 group-open:rotate-45 transition-transform" aria-hidden="true">+</span>
            </summary>
            <p className="mt-3 leading-relaxed max-w-prose">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Fecho e rodapé ---------------- */

function Closing() {
  return (
    <section className="relative overflow-hidden bg-[#E4F3F2] border-y border-[#CBE6E4]" aria-labelledby="cl-title">
      <div className="relative mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <div>
          <h2 id="cl-title" className="font-display font-semibold text-3xl sm:text-5xl tracking-tight max-w-xl leading-[1.08]" style={{ color: INK }}>Imagine opening one screen and seeing every room ready.</h2>
          <p className="mt-5 max-w-lg leading-relaxed">Open the demo and try it as a manager and as a housekeeper. It takes two minutes, with no account.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={demoHref} className={btnPrimary}>Try the live demo</a>
            {SITE.contactEmail && <a href={mailto('Lodgora pilot')} className={btnLight}>Ask for a free pilot</a>}
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
            {['Free ' + SITE.pilotDays + '-day pilot', 'No app to install', 'Set up in minutes'].map((t) => (
              <li key={t} className="flex items-center gap-2"><Icon name="check" className="w-4 h-4 text-[#0D7C77]" />{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200">
      <div className="mx-auto max-w-6xl px-5 py-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-500">
        <span className="flex items-center gap-2"><LogoMark className="w-6 h-6" /><span className="font-display font-bold" style={{ color: INK }}>Lodgora</span></span>
        <span>Housekeeping and maintenance for independent hotels.</span>
        <span className="text-slate-400">© 2026 Lodgora</span>
        <span className="sm:ml-auto flex gap-5">
          <a href="/app" className="hover:text-[#172B4D] underline-offset-2 hover:underline">Sign in</a>
          <a href={demoHref} className="hover:text-[#172B4D] underline-offset-2 hover:underline">Demo</a>
          <a href="/privacy" className="hover:text-[#172B4D] underline-offset-2 hover:underline">Privacy</a>
          <a href="/terms" className="hover:text-[#172B4D] underline-offset-2 hover:underline">Terms</a>
          {SITE.contactEmail && <a href={mailto('Lodgora')} className="hover:text-[#172B4D] underline-offset-2 hover:underline">Contact</a>}
        </span>
      </div>
    </footer>
  );
}
