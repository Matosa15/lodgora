// Página pública do Lodgora (endereço "/"). A aplicação fica em "/app".
import { useEffect, useRef, useState } from 'react';
import { Icon, LogoMark } from '../components/ui';
import { STATUS_STYLE, statusLabel } from '../lib/constants';
import { SITE } from '../lib/site';
import { Reveal, TryIt, StatsMock, PlanPicker } from './SiteDemo';

const INK = '#0B0B0F';
const GREY = '#F4F5F7';
const H2 = 'font-geist font-semibold text-[2rem] sm:text-[3.1rem] leading-[1.04] tracking-[-0.04em]';

const demoHref = '/app?demo';
const mailto = (subject) => `mailto:${SITE.contactEmail}?subject=${encodeURIComponent(subject)}`;
// Pedido de demo/piloto: abre o formulário (noutro separador) ou, sem formulário, um email
const request = (subject) => (SITE.requestUrl ? { href: SITE.requestUrl, target: '_blank', rel: 'noopener noreferrer' } : { href: mailto(subject) });

const btn = 'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D7C77]';
const btnPrimary = `${btn} bg-[#0B0B0F] text-white hover:bg-[#2A2B33]`;
const btnLight = `${btn} bg-[#F0F1F4] text-[#0B0B0F] hover:bg-[#E4E6EB]`;

export default function Site() {
  // Quem já entrou como equipa neste telemóvel vai direto para a aplicação
  useEffect(() => {
    try { if (localStorage.getItem('lodgora-staff-session')) location.replace('/app'); } catch { /* ignora */ }
  }, []);

  return (
    <div className="font-geist bg-white text-slate-600">
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
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur pt-safe">
      <div className="mx-auto max-w-6xl h-16 px-5 flex items-center gap-6">
        <a href="/" className="flex items-center gap-2.5" aria-label="Lodgora home">
          <LogoMark />
          <span className="font-geist font-semibold text-xl tracking-[-0.03em]" style={{ color: INK }}>Lodgora</span>
        </a>
        <nav aria-label="Sections" className="hidden md:flex gap-6 ml-6 text-sm font-medium">
          {links.map(([label, href]) => <a key={href} href={href} className="text-slate-600 hover:text-[#0B0B0F]">{label}</a>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a href="/app" className="px-3 py-2 text-sm font-semibold text-[#172B4D] hover:underline">Sign in</a>
          <a href={demoHref} className={`${btnPrimary} !py-2 !px-5 !text-sm`}>Try the demo</a>
        </div>
      </div>
    </header>
  );
}

/* ---------------- Início ---------------- */

function Hero() {
  const canAsk = !!(SITE.requestUrl || SITE.contactEmail);
  const chip = 'absolute z-10 flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-[0_14px_30px_-12px_rgba(11,11,15,.3)]';
  return (
    <section className="bg-white" aria-labelledby="hero-title">
      <div className="mx-auto max-w-6xl px-5 pt-10 pb-16 sm:pt-16 sm:pb-24 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-8 items-center">
        <div>
          <h1 id="hero-title" className="font-geist font-semibold text-[2.9rem] sm:text-[5rem] lg:text-[5.4rem] leading-[0.98] tracking-[-0.05em] [text-wrap:balance]" style={{ color: INK }}>
            Every room ready. No phone calls.
          </h1>
          <p className="mt-6 text-lg sm:text-xl leading-relaxed max-w-[30rem] text-slate-600">
            Housekeeping and maintenance for independent hotels. Your team updates rooms from their phones, and you see everything as it happens.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            {canAsk ? <a {...request('Lodgora pilot')} className={`${btnPrimary} !px-7 !py-4 !text-base`}>Ask for a free {SITE.pilotDays}-day pilot</a> : <a href={demoHref} className={`${btnPrimary} !px-7 !py-4 !text-base`}>Try the live demo</a>}
            {canAsk && <a href={demoHref} className={`${btnLight} !px-7 !py-4 !text-base`}>Try the live demo</a>}
          </div>
          <p className="mt-6 text-sm text-slate-500 flex flex-wrap gap-x-5 gap-y-1">
            <span>No app to install</span><span>PIN login</span><span>Set up in minutes</span>
          </p>
        </div>
        <div className="relative rounded-[2rem] sm:rounded-[2.75rem] overflow-hidden" style={{ background: GREY }}>
          <div className="relative mx-auto w-full max-w-[34rem] aspect-[4/5] sm:aspect-[4/4.7]">
            <div className="absolute left-[8%] top-[8%] w-[48%] rounded-[2rem] p-[5px] bg-[#0B0B0F]" style={{ boxShadow: '0 40px 60px -28px rgba(11,11,15,.55)' }}>
              <img src="/site-phone.jpg" width="600" height="1299" alt="The housekeeper screen on a phone with a cleaning timer running" className="block w-full h-auto rounded-[1.65rem]" />
            </div>
            <div className="absolute right-[6%] bottom-[6%] w-[36%] rounded-[1.7rem] p-[4px] bg-[#0B0B0F]" style={{ boxShadow: '0 40px 60px -28px rgba(11,11,15,.55)' }}>
              <img src="/site-phone2.jpg" width="600" height="1298" alt="The maintenance screen on a phone with a list of open problems" className="block w-full h-auto rounded-[1.4rem]" />
            </div>
            <div className={`${chip} left-[3%] bottom-[16%]`}><span className="w-2 h-2 rounded-full bg-[#0D7C77]" aria-hidden="true" /><span className="text-[13px] leading-tight"><b className="block font-semibold" style={{ color: INK }}>Room 203 is ready</b><span className="text-slate-500">Approved just now</span></span></div>
            <div className={`${chip} right-[4%] top-[3.5%]`}><span className="w-2 h-2 rounded-full bg-[#F97316]" aria-hidden="true" /><span className="text-[13px] leading-tight"><b className="block font-semibold" style={{ color: INK }}>Leak in room 106</b><span className="text-slate-500">Sent to Tom, urgent</span></span></div>
          </div>
        </div>
      </div>
      <p className="text-center -mt-4 pb-4"><a href="#tour" className="text-sm font-semibold hover:underline" style={{ color: INK }}>Watch the 48-second tour ↓</a></p>
    </section>
  );
}

/* ---------------- Vídeo de 1 minuto ---------------- */

function Tour() {
  return (
    <section id="tour" className="mx-auto max-w-6xl px-5 pt-8 sm:pt-12 pb-16 sm:pb-24 scroll-mt-16" aria-labelledby="tour-title">
      <div className="max-w-3xl mx-auto text-center">
        <h2 id="tour-title" className={`${H2}`} style={{ color: INK }}>See Lodgora in action</h2>
        <p className="mt-3 text-lg">A short tour, from the housekeeper's phone to the manager's screen. Example data, no sound needed.</p>
      </div>
      <div className="mt-8 mx-auto max-w-4xl rounded-[1.5rem] sm:rounded-[2.25rem] overflow-hidden bg-[#0B0B0F]">
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
    <section id="how" style={{ background: GREY }} aria-labelledby="how-title">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <h2 id="how-title" className={`${H2} max-w-xl`} style={{ color: INK }}>How a day works with Lodgora</h2>
        <ol className="mt-10 grid md:grid-cols-3 gap-x-10 gap-y-8">
          {steps.map(([title, text], i) => (
            <li key={title} className="flex gap-4 group/step">
              <span className="font-geist font-semibold text-5xl leading-none tracking-[-0.04em] flex-none w-9" style={{ color: INK }} aria-hidden="true">{i + 1}</span>
              <div>
                <h3 className="font-geist font-semibold text-xl leading-snug tracking-[-0.02em]" style={{ color: INK }}>{title}</h3>
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
          <p className="text-sm font-semibold text-[#0D7C77]">Try it yourself</p>
          <h2 id="hk-title" className={`mt-2 ${H2} [text-wrap:balance]`} style={{ color: INK }}>One screen for the housekeeper, one for you</h2>
          <p className="mt-4 text-lg leading-relaxed">Press Finish on the phone and watch the manager screen update.</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2.5">
            {['No app to install', 'Sign in with a 4-digit PIN', 'Report a problem from the same screen'].map((t) => (
              <li key={t} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-700 bg-[#F4F5F7]"><Icon name="check" className="w-4 h-4 text-[#0D7C77]" />{t}</li>
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
    <section style={{ background: GREY }} aria-labelledby="mg-title">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24 grid md:grid-cols-2 gap-12 md:gap-20 items-center">
        <Reveal>
          <h2 id="mg-title" className={`${H2}`} style={{ color: INK }}>See how long cleaning really takes</h2>
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
      <h2 id="ft-title" className={`${H2} max-w-xl`} style={{ color: INK }}>Everything your housekeeping team needs, and nothing else</h2>
      <ul className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map(([icon, title, text], i) => (
          <li key={title}>
            <Reveal delay={(i % 3) * 90} className="h-full">
              <div className="h-full rounded-3xl bg-[#F4F5F7] p-7 transition-colors duration-200 hover:bg-[#ECEDF1]">
                <span className="w-11 h-11 rounded-full bg-white flex items-center justify-center"><Icon name={icon} className="w-5 h-5 text-[#0D7C77]" /></span>
                <h3 className="mt-5 font-geist font-semibold text-lg tracking-[-0.02em]" style={{ color: INK }}>{title}</h3>
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
    <section id="pricing" style={{ background: GREY }} aria-labelledby="pr-title">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24 grid lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-20">
        <div>
          <h2 id="pr-title" className={`${H2}`} style={{ color: INK }}>Pay by the size of your hotel</h2>
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
      <h2 id="fq-title" className={`${H2}`} style={{ color: INK }}>Questions hotels ask</h2>
      <div className="mt-8 max-w-3xl divide-y divide-slate-200 border-t border-slate-200">
        {qa.map(([q, a]) => (
          <details key={q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-[#0B0B0F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0D7C77] rounded">
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
    <section className="bg-white px-3 sm:px-5 pb-3 sm:pb-5" aria-labelledby="cl-title">
      <div className="mx-auto max-w-6xl rounded-[2rem] sm:rounded-[2.75rem] bg-[#0B0B0F] px-5 py-20 sm:py-28 text-center">
        <h2 id="cl-title" className="font-geist font-semibold text-[2.4rem] sm:text-[4.2rem] tracking-[-0.045em] leading-[1] text-white [text-wrap:balance]">Start your free {SITE.pilotDays}-day pilot.</h2>
        <p className="mt-5 text-lg leading-relaxed max-w-xl mx-auto text-slate-400">Try Lodgora with your team for {SITE.pilotDays} days. Or open the demo first, with no account needed.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          {canAsk ? <a {...request('Lodgora pilot')} className={`${btn} bg-white text-[#0B0B0F] hover:bg-slate-200 !px-7 !py-4 !text-base`}>Ask for a free pilot</a> : <a href={demoHref} className={`${btn} bg-white text-[#0B0B0F] hover:bg-slate-200 !px-7 !py-4 !text-base`}>Try the live demo</a>}
          {canAsk && <a href={demoHref} className={`${btn} bg-white/10 text-white hover:bg-white/20 !px-7 !py-4 !text-base`}>Try the live demo</a>}
        </div>
        <ul className="mt-9 flex flex-wrap justify-center gap-x-7 gap-y-2 text-sm text-slate-400">
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
    <footer className="bg-white">
      <div className="mx-auto max-w-6xl px-5 py-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-500">
        <span className="flex items-center gap-2"><LogoMark className="w-6 h-6" /><span className="font-geist font-semibold" style={{ color: INK }}>Lodgora</span></span>
        <span>Housekeeping and maintenance for independent hotels.</span>
        <span className="text-slate-400">© 2026 Lodgora</span>
        <span className="sm:ml-auto flex gap-5">
          <a href="/app" className="hover:text-[#0B0B0F] underline-offset-2 hover:underline">Sign in</a>
          <a href={demoHref} className="hover:text-[#0B0B0F] underline-offset-2 hover:underline">Demo</a>
          <a href="/privacy" className="hover:text-[#0B0B0F] underline-offset-2 hover:underline">Privacy</a>
          <a href="/terms" className="hover:text-[#0B0B0F] underline-offset-2 hover:underline">Terms</a>
          {SITE.contactEmail && <a href={mailto('Lodgora')} className="hover:text-[#0B0B0F] underline-offset-2 hover:underline">Contact</a>}
        </span>
      </div>
    </footer>
  );
}
