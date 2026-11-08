// Página pública do Lodgora (endereço "/"). A aplicação fica em "/app".
import { useEffect, useRef, useState } from 'react';
import { Icon, LogoMark } from '../components/ui';
import { STATUS_STYLE, statusLabel } from '../lib/constants';
import { SITE } from '../lib/site';
import { Reveal, TryIt, StatsMock, PlanPicker } from './SiteDemo';

const INK = '#172B4D';

const demoHref = '/app?demo';
const mailto = (subject) => `mailto:${SITE.contactEmail}?subject=${encodeURIComponent(subject)}`;
// Pedido de demo/piloto: abre o formulário (noutro separador) ou, sem formulário, um email
const request = (subject) => (SITE.requestUrl ? { href: SITE.requestUrl, target: '_blank', rel: 'noopener noreferrer' } : { href: mailto(subject) });

const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-[15px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D7C77]';
const btnPrimary = `${btn} bg-[#0D7C77] text-white hover:bg-[#0A6A66]`;
const btnLight = `${btn} bg-white text-[#172B4D] border border-slate-300 hover:bg-slate-50`;

export default function Site() {
  // Quem já entrou como equipa neste telemóvel vai direto para a aplicação
  useEffect(() => {
    try { if (localStorage.getItem('lodgora-staff-session')) location.replace('/app'); } catch { /* ignora */ }
  }, []);

  return (
    <div className="bg-[#FCFAF6] text-slate-700">
      <Header />
      <main>
        <Hero />
        <Tour />
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
    <header className="sticky top-0 z-30 bg-[#F6F2EA]/95 backdrop-blur border-b border-[#E6DFD0] pt-safe">
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

/* ---------------- Início ---------------- */

function Hero() {
  const canAsk = !!(SITE.requestUrl || SITE.contactEmail);
  return (
    <section className="relative overflow-hidden bg-[#F6F2EA] border-b border-[#E6DFD0]" aria-labelledby="hero-title">
      <div className="relative mx-auto max-w-6xl px-5 pt-14 pb-24 sm:pt-20 sm:pb-28 grid lg:grid-cols-[0.92fr_1.08fr] gap-16 lg:gap-12 items-center">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#8A6A2F]">Housekeeping &amp; maintenance for independent hotels</p>
          <h1 id="hero-title" className="mt-5 font-serif font-medium text-[2.6rem] sm:text-6xl lg:text-[4.2rem] leading-[1.04] tracking-[-0.025em]" style={{ color: INK }}>
            Every room ready, <em className="text-[#0D7C77]">without</em> the phone calls.
          </h1>
          <p className="mt-6 text-lg sm:text-xl leading-relaxed max-w-[32rem] text-slate-600">
            Your team updates rooms from their phones. You see every room, every cleaning time and every problem as it happens.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            {canAsk ? <a {...request('Lodgora pilot')} className={`${btnPrimary} !px-7 !py-4 !text-base !rounded-[10px]`}>Ask for a free {SITE.pilotDays}-day pilot</a> : <a href={demoHref} className={`${btnPrimary} !px-7 !py-4 !text-base !rounded-[10px]`}>Try the live demo</a>}
            {canAsk && <a href={demoHref} className="text-base font-semibold border-b-[1.5px] border-[#172B4D] pb-0.5 hover:text-[#0D7C77] hover:border-[#0D7C77]" style={{ color: INK }}>Try the live demo</a>}
          </div>
          <p className="mt-7 text-sm text-slate-500 flex flex-wrap gap-x-5 gap-y-1">
            <span>No app to install</span><span>PIN login</span><span>Set up in minutes</span>
            <a href="#tour" className="font-semibold text-[#0D7C77] hover:underline">Watch the 48-second tour</a>
          </p>
        </div>
        <div className="relative lg:ml-4">
          <div className="rounded-xl overflow-hidden bg-white lg:w-[122%]" style={{ boxShadow: '0 60px 90px -40px rgba(20,35,63,.45), 0 0 0 1px rgba(20,35,63,.08)' }}>
            <img src="/site-dashboard.jpg" width="1800" height="1125" alt="The Lodgora manager dashboard showing rooms ready, cleaning pending and issues that need attention" className="block w-full h-auto" />
          </div>
          <div className="absolute -bottom-10 -left-2 sm:-left-8 w-[28%] min-w-[7.5rem] max-w-[12.5rem] rounded-[1.7rem] p-[5px] bg-[#14233F]" style={{ boxShadow: '0 40px 60px -24px rgba(20,35,63,.6)' }}>
            <img src="/site-phone.jpg" width="600" height="1299" alt="The housekeeper screen on a phone with a cleaning timer running" className="block w-full h-auto rounded-[1.4rem]" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Vídeo de 1 minuto ---------------- */

function Tour() {
  return (
    <section id="tour" className="mx-auto max-w-6xl px-5 pt-16 sm:pt-24 pb-16 sm:pb-24 scroll-mt-16" aria-labelledby="tour-title">
      <div className="max-w-3xl mx-auto text-center">
        <h2 id="tour-title" className="font-serif font-medium text-3xl sm:text-[2.6rem] leading-[1.1] tracking-[-0.02em]" style={{ color: INK }}>See Lodgora in action</h2>
        <p className="mt-3 text-lg">A short tour, from the housekeeper's phone to the manager's screen. Example data, no sound needed.</p>
      </div>
      <div className="mt-8 mx-auto max-w-4xl rounded-2xl overflow-hidden border border-slate-200 bg-slate-100" style={{ boxShadow: '0 30px 50px -36px rgba(23,43,77,.45)' }}>
        <video className="block w-full h-auto" controls playsInline preload="metadata" poster="/lodgora-promo-v2-poster.jpg" aria-label="Short tour of Lodgora: housekeeper, maintenance and manager screens">
          <source src="/lodgora-promo-v2.mp4" type="video/mp4" />
          Your browser cannot play this video. You can try the live demo above instead.
        </video>
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
    <section id="how" className="bg-[#F6F2EA] border-y border-[#E6DFD0]" aria-labelledby="how-title">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <h2 id="how-title" className="font-serif font-medium text-3xl sm:text-[2.6rem] leading-[1.1] tracking-[-0.02em] max-w-xl" style={{ color: INK }}>How a day works with Lodgora</h2>
        <ol className="mt-10 grid md:grid-cols-3 gap-x-10 gap-y-8">
          {steps.map(([title, text], i) => (
            <li key={title} className="flex gap-4 group/step">
              <span className="font-serif text-5xl leading-none flex-none w-9" style={{ color: '#8A6A2F' }} aria-hidden="true">{i + 1}</span>
              <div>
                <h3 className="font-serif font-medium text-xl leading-snug" style={{ color: INK }}>{title}</h3>
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
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#8A6A2F]">Try it yourself</p>
          <h2 id="hk-title" className="mt-2 font-serif font-medium text-3xl sm:text-[2.6rem] leading-[1.1] tracking-[-0.02em] [text-wrap:balance]" style={{ color: INK }}>One screen for the housekeeper, one for you</h2>
          <p className="mt-4 text-lg leading-relaxed">Press Finish on the phone and watch the manager screen update.</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2.5">
            {['No app to install', 'Sign in with a 4-digit PIN', 'Report a problem from the same screen'].map((t) => (
              <li key={t} className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"><Icon name="check" className="w-4 h-4 text-[#0D7C77]" />{t}</li>
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
    <section className="bg-[#F6F2EA] border-y border-[#E6DFD0]" aria-labelledby="mg-title">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24 grid md:grid-cols-2 gap-12 md:gap-20 items-center">
        <Reveal>
          <h2 id="mg-title" className="font-serif font-medium text-3xl sm:text-[2.6rem] leading-[1.1] tracking-[-0.02em]" style={{ color: INK }}>See how long cleaning really takes</h2>
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
      <h2 id="ft-title" className="font-serif font-medium text-3xl sm:text-[2.6rem] leading-[1.1] tracking-[-0.02em] max-w-xl" style={{ color: INK }}>Everything your housekeeping team needs, and nothing else</h2>
      <ul className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map(([icon, title, text], i) => (
          <li key={title}>
            <Reveal delay={(i % 3) * 90} className="h-full">
              <div className="h-full rounded-xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[#19A7A1] hover:shadow-[0_18px_30px_-22px_rgba(23,43,77,.5)]">
                <span className="w-10 h-10 rounded-lg bg-[#EFE8D8] flex items-center justify-center"><Icon name={icon} className="w-5 h-5 text-[#0D7C77]" /></span>
                <h3 className="mt-4 font-serif font-medium text-lg" style={{ color: INK }}>{title}</h3>
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
    <section id="pricing" className="bg-[#F6F2EA] border-y border-[#E6DFD0]" aria-labelledby="pr-title">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24 grid lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-20">
        <div>
          <h2 id="pr-title" className="font-serif font-medium text-3xl sm:text-[2.6rem] leading-[1.1] tracking-[-0.02em]" style={{ color: INK }}>Pay by the size of your hotel</h2>
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
      <h2 id="fq-title" className="font-serif font-medium text-3xl sm:text-[2.6rem] leading-[1.1] tracking-[-0.02em]" style={{ color: INK }}>Questions hotels ask</h2>
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
  const canAsk = !!(SITE.requestUrl || SITE.contactEmail);
  return (
    <section className="relative overflow-hidden bg-[#14233F]" aria-labelledby="cl-title">
      <div className="relative mx-auto max-w-3xl px-5 py-20 sm:py-28 text-center">
        <h2 id="cl-title" className="font-serif font-medium text-[2.3rem] sm:text-[3.4rem] tracking-[-0.02em] leading-[1.06] text-white [text-wrap:balance]">Start your free {SITE.pilotDays}-day pilot.</h2>
        <p className="mt-5 text-lg leading-relaxed max-w-xl mx-auto text-slate-300">Try Lodgora with your team for {SITE.pilotDays} days. Or open the demo first, with no account needed.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          {canAsk ? <a {...request('Lodgora pilot')} className={`${btn} bg-[#2DD4BF] text-[#14233F] hover:bg-[#5EEAD4] !px-7 !py-4 !text-base !rounded-[10px]`}>Ask for a free pilot</a> : <a href={demoHref} className={`${btn} bg-[#2DD4BF] text-[#14233F] hover:bg-[#5EEAD4] !px-7 !py-4 !text-base !rounded-[10px]`}>Try the live demo</a>}
          {canAsk && <a href={demoHref} className={`${btn} text-white !px-7 !py-4 !text-base !rounded-[10px] border border-white/30 hover:bg-white/10`}>Try the live demo</a>}
        </div>
        <ul className="mt-9 flex flex-wrap justify-center gap-x-7 gap-y-2 text-sm text-slate-300">
          {['Free ' + SITE.pilotDays + '-day pilot', 'No app to install', 'Set up in minutes'].map((t) => (
            <li key={t} className="flex items-center gap-2"><Icon name="check" className="w-4 h-4 text-[#2DD4BF]" />{t}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="bg-[#F6F2EA] border-t border-[#E6DFD0]">
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
