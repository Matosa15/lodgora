// Página pública do Lodgora (endereço "/"). A aplicação fica em "/app".
import { useEffect, useState } from 'react';
import { Icon, LogoMark } from '../components/ui';
import { STATUS_STYLE, statusLabel } from '../lib/constants';
import { SITE } from '../lib/site';

const INK = '#172B4D';
const BRASS = '#D9B26F';

const demoHref = '/app?demo';
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

function Header() {
  const links = [['How it works', '#how'], ['Features', '#features'], ['Pricing', '#pricing'], ['Questions', '#faq']];
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

function Hero() {
  const [rooms, setRooms] = useState(START);
  const [event, setEvent] = useState('');
  const ready = rooms.filter(([, s]) => s === 'Ready').length;

  const advance = (n) => {
    const current = rooms.find(([num]) => num === n)[1];
    const next = NEXT[current];
    setRooms(rooms.map(([num, s]) => (num === n ? [num, next] : [num, s])));
    setEvent(WHO[next](n));
  };

  return (
    <section className="mx-auto max-w-6xl px-5 pt-12 pb-16 sm:pt-16 sm:pb-20 grid lg:grid-cols-[1.02fr_1fr] gap-12 lg:gap-16 items-center" aria-labelledby="hero-title">
      <div>
        <h1 id="hero-title" className="font-display font-semibold text-[2.5rem] sm:text-5xl lg:text-[3.4rem] leading-[1.06] tracking-tight" style={{ color: INK }}>
          Know which rooms are ready without picking up the phone.
        </h1>
        <p className="mt-6 text-lg leading-relaxed max-w-[34rem]">
          Lodgora is a simple tool for hotel housekeeping and maintenance. Your team updates rooms from their phones, and you see
          every room, every cleaning time and every problem as it happens.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={demoHref} className={btnPrimary}>Try the live demo</a>
          {SITE.contactEmail && <a href={mailto('Lodgora demo request')} className={btnLight}>Request a demo</a>}
        </div>
        <p className="mt-4 text-sm text-slate-500">The demo opens in your browser with example data. No account needed.</p>
      </div>

      <div>
        <div className="rounded-2xl p-5 sm:p-7" style={{ background: '#E3EAEF' }}>
          <ul className="grid grid-cols-3 gap-3 sm:gap-4">
            {rooms.map(([n, s]) => (
              <li key={n}>
                <button type="button" onClick={() => advance(n)}
                  aria-label={`Room ${n}, ${statusLabel(s)}. Press to move it to the next step.`}
                  className="relative w-full min-h-[7.25rem] rounded-[10px] px-3.5 pt-4 pb-3 text-left active:translate-y-px transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D7C77]"
                  style={{ background: INK, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.1), 0 8px 14px -8px rgba(23,43,77,.55)' }}>
                  {['top-1.5 left-1.5', 'top-1.5 right-1.5', 'bottom-1.5 left-1.5', 'bottom-1.5 right-1.5'].map((pos) => (
                    <span key={pos} aria-hidden="true" className={`absolute ${pos} w-1 h-1 rounded-full bg-white/20`} />
                  ))}
                  <span className="plate-num block text-[2rem] sm:text-[2.5rem] leading-none" style={{ color: BRASS }}>{n}</span>
                  <span className="mt-3 flex items-start gap-2 text-[13px] leading-tight text-white/90">
                    <span className={`mt-[3px] w-2 h-2 rounded-full flex-none ${STATUS_STYLE[s].dot}`} aria-hidden="true" />{statusLabel(s)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4 min-h-[3.5rem]" aria-live="polite">
          <p className="font-display text-2xl font-semibold" style={{ color: INK }}>{ready} of {rooms.length} rooms are ready</p>
          <p className="text-sm text-slate-500 mt-1">{event || 'Tap a room to move it to the next step, like your team would.'}</p>
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
            <li key={title} className="flex gap-4">
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
    <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24 grid md:grid-cols-2 gap-12 md:gap-20 items-center" aria-labelledby="hk-title">
      <div className="order-2 md:order-1 flex justify-center">
        <div className="w-[17.5rem] rounded-[2.2rem] p-2.5" style={{ background: INK }} role="img"
          aria-label="Example of the housekeeper screen on a phone: room 214 is being cleaned, the timer shows 12 minutes 34 seconds, with Pause and Finish buttons.">
          <div className="rounded-[1.7rem] bg-[#F5F7FA] overflow-hidden">
            <div className="bg-white px-4 py-3 flex items-center gap-2.5 border-b border-slate-200">
              <LogoMark className="w-7 h-7" />
              <div className="leading-tight"><p className="text-xs font-bold" style={{ color: INK }}>Ana Silva</p><p className="text-[11px] text-slate-500">Your hotel</p></div>
            </div>
            <div className="p-3 space-y-3">
              <div className="rounded-xl bg-white border border-slate-200 border-t-[3px] border-t-blue-500 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="font-display text-2xl font-bold leading-none" style={{ color: INK }}>Room 214</p><p className="text-xs text-slate-500 mt-1">Double · Floor 2</p></div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full border bg-blue-50 text-blue-700 border-blue-200"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Cleaning</span>
                </div>
                <div className="mt-3 rounded-lg bg-blue-50 border border-blue-100 py-3 text-center">
                  <p className="text-[11px] font-semibold text-slate-500">Cleaning time</p>
                  <p className="font-display text-4xl font-bold tabular-nums" style={{ color: INK }}>12:34</p>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2 text-sm font-semibold">
                  <span className="rounded-lg border border-slate-200 bg-white py-2.5 text-center text-slate-700">Pause</span>
                  <span className="rounded-lg bg-[#0D7C77] py-2.5 text-center text-white">Finish</span>
                </div>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 border-t-[3px] border-t-orange-400 p-3.5">
                <p className="font-display text-xl font-bold leading-none" style={{ color: INK }}>Room 216</p>
                <p className="text-xs text-slate-500 mt-1">Needs cleaning</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="order-1 md:order-2">
        <h2 id="hk-title" className="font-display font-semibold text-3xl sm:text-4xl tracking-tight" style={{ color: INK }}>One screen for each housekeeper</h2>
        <p className="mt-5 leading-relaxed max-w-md">
          Each person sees only their rooms and common areas, with one big button for what to do next. A timer starts when they press Start cleaning.
          They can pause it for a break and press Finish when they are done.
        </p>
        <ul className="mt-6 space-y-3 max-w-md">
          {[
            'Works in the phone browser. Nothing to install.',
            'Sign in with a 4-digit PIN. You can see and change every PIN.',
            'Report a broken lamp or a leaking tap from the same screen.'
          ].map((t) => (
            <li key={t} className="flex gap-3"><Icon name="check" className="w-5 h-5 flex-none mt-0.5 text-[#0D7C77]" /><span>{t}</span></li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- Para gerentes: estatísticas ---------------- */

function ForManagers() {
  const days = [9, 12, 8, 11, 10, 7, 12];
  const names = [['Ana', 94], ['Maria', 88], ['Sofia', 90]];
  return (
    <section className="bg-[#F3F6F8] border-y border-slate-200" aria-labelledby="mg-title">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24 grid md:grid-cols-2 gap-12 md:gap-20 items-center">
        <div>
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
        </div>

        <figure>
          <div className="rounded-xl bg-white border border-slate-200 p-5 sm:p-6" role="img"
            aria-label="Example of the statistics page: cleanings finished per day as bars, and the share of rooms approved first time for three housekeepers.">
            <p className="text-sm font-semibold" style={{ color: INK }}>Cleanings finished per day</p>
            <div className="mt-4 flex items-end gap-2 h-32 border-b border-slate-200">
              {days.map((n, i) => <div key={i} className="flex-1 flex justify-center items-end h-full"><div className="w-full max-w-[24px] rounded-t-[4px] bg-[#0D7C77]" style={{ height: `${(n / 12) * 100}%` }} /></div>)}
            </div>
            <p className="mt-6 text-sm font-semibold" style={{ color: INK }}>Approved first time</p>
            <ul className="mt-3 space-y-3">
              {names.map(([name, pct]) => (
                <li key={name}>
                  <div className="flex justify-between text-sm"><span>{name}</span><span className="font-semibold tabular-nums" style={{ color: INK }}>{pct}%</span></div>
                  <div className="h-2.5 bg-slate-100 rounded-full mt-1 overflow-hidden"><div className="h-full rounded-r-[4px] bg-[#0D7C77]" style={{ width: `${pct}%` }} /></div>
                </li>
              ))}
            </ul>
          </div>
          <figcaption className="mt-2 text-xs text-slate-500">Example data, not from a real hotel.</figcaption>
        </figure>
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
      <ul className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-9">
        {items.map(([icon, title, text]) => (
          <li key={title}>
            <Icon name={icon} className="w-6 h-6 text-[#0D7C77]" />
            <h3 className="mt-3 font-display font-semibold text-lg" style={{ color: INK }}>{title}</h3>
            <p className="mt-1.5 leading-relaxed">{text}</p>
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
        <ul className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-200">
          {SITE.plans.map((p) => (
            <li key={p.name} className="flex items-center justify-between gap-4 px-6 py-6">
              <div>
                <p className="font-display font-semibold text-xl" style={{ color: INK }}>{p.name}</p>
                <p className="text-sm text-slate-500 mt-0.5">{p.rooms}</p>
              </div>
              <p className="text-right"><span className="font-display font-bold text-4xl tabular-nums" style={{ color: INK }}>{p.price} €</span><span className="text-sm text-slate-500"> per month</span></p>
            </li>
          ))}
        </ul>
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
    <section style={{ background: INK }} aria-labelledby="cl-title">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <h2 id="cl-title" className="font-display font-semibold text-3xl sm:text-4xl tracking-tight text-white max-w-xl">See your hotel on one screen</h2>
        <p className="mt-4 text-white/80 max-w-lg leading-relaxed">Open the demo and try it as a manager and as a housekeeper. It takes two minutes.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={demoHref} className={`${btn} bg-white text-[#172B4D] hover:bg-slate-100`}>Try the live demo</a>
          {SITE.contactEmail && <a href={mailto('Lodgora pilot')} className={`${btn} border border-white/40 text-white hover:bg-white/10`}>Ask for a free pilot</a>}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200">
      <div className="mx-auto max-w-6xl px-5 py-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-500">
        <span className="flex items-center gap-2"><LogoMark className="w-6 h-6" /><span className="font-display font-bold" style={{ color: INK }}>Lodgora</span></span>
        <span>Housekeeping and maintenance for independent hotels.</span>
        <span className="sm:ml-auto flex gap-5">
          <a href="/app" className="hover:text-[#172B4D] underline-offset-2 hover:underline">Sign in</a>
          <a href={demoHref} className="hover:text-[#172B4D] underline-offset-2 hover:underline">Demo</a>
          {SITE.contactEmail && <a href={mailto('Lodgora')} className="hover:text-[#172B4D] underline-offset-2 hover:underline">Contact</a>}
        </span>
      </div>
    </footer>
  );
}
