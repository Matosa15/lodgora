// Página pública do Lodgora (endereço "/"). A aplicação fica em "/app".
import { useEffect, useRef, useState } from 'react';
import { Icon, LogoMark } from '../components/ui';
import { STATUS_STYLE, statusLabel } from '../lib/constants';
import { SITE } from '../lib/site';
import { LANG, P, t } from '../lib/i18n';
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
    if (LANG === 'fi') {
      document.documentElement.lang = 'fi';
      document.title = 'Lodgora: siivouksen ja huollon hallinta itsenäisille hotelleille';
      const d = document.querySelector('meta[name="description"]');
      if (d) d.setAttribute('content', 'Lodgora näyttää, mitkä hotellihuoneet ovat valmiita. Siivoojat päivittävät huoneet puhelimella, ja sinä näet siivousajat, tarkastukset ja huoltotyöt reaaliajassa.');
    }
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
  const links = [[t('How it works', 'Näin se toimii'), `${P}#how`], [t('Features', 'Ominaisuudet'), `${P}#features`], [t('Pricing', 'Hinnat'), `${P}#pricing`], [t('Questions', 'Kysymyksiä'), `${P}#faq`]];
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur pt-safe">
      <div className="mx-auto max-w-6xl h-16 px-5 flex items-center gap-6">
        <a href={P} className="flex items-center gap-2.5" aria-label={t('Lodgora home', 'Lodgora etusivu')}>
          <LogoMark />
          <span className="font-geist font-semibold text-xl tracking-[-0.03em]" style={{ color: INK }}>Lodgora</span>
        </a>
        <nav aria-label={t('Sections', 'Osiot')} className="hidden md:flex gap-6 ml-6 text-sm font-medium">
          {links.map(([label, href]) => <a key={href} href={href} className="text-slate-600 hover:text-[#0B0B0F]">{label}</a>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a href={LANG === 'fi' ? '/' : '/fi'} hrefLang={LANG === 'fi' ? 'en' : 'fi'} lang={LANG === 'fi' ? 'en' : 'fi'} className="px-2 py-2 text-sm font-semibold text-slate-500 hover:text-[#0B0B0F]" aria-label={LANG === 'fi' ? 'English' : 'Suomeksi'}>{LANG === 'fi' ? 'EN' : 'FI'}</a>
          <a href="/app" className="px-3 py-2 text-sm font-semibold text-[#172B4D] hover:underline">{t('Sign in', 'Kirjaudu')}</a>
          <a href={demoHref} className={`${btnPrimary} !py-2 !px-5 !text-sm`}>{t('Try the demo', 'Demo')}</a>
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
            {t('Every room ready. No phone calls.', 'Jokainen huone valmis. Ei puheluita.')}
          </h1>
          <p className="mt-6 text-lg sm:text-xl leading-relaxed max-w-[30rem] text-slate-600">
            {t('Housekeeping and maintenance for independent hotels. Your team updates rooms from their phones, and you see everything as it happens.', 'Siivouksen ja huollon hallinta itsenäisille hotelleille. Tiimisi päivittää huoneet puhelimellaan, ja sinä näet kaiken reaaliajassa.')}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            {canAsk ? <a {...request('Lodgora pilot')} className={`${btnPrimary} !px-7 !py-4 !text-base`}>{t(`Ask for a free ${SITE.pilotDays}-day pilot`, `Pyydä maksuton ${SITE.pilotDays} päivän pilotti`)}</a> : <a href={demoHref} className={`${btnPrimary} !px-7 !py-4 !text-base`}>{t('Try the live demo', 'Kokeile live-demoa')}</a>}
            {canAsk && <a href={demoHref} className={`${btnLight} !px-7 !py-4 !text-base`}>{t('Try the live demo', 'Kokeile live-demoa')}</a>}
          </div>
          <p className="mt-6 text-sm text-slate-500 flex flex-wrap gap-x-5 gap-y-1">
            <span>{t('No app to install', 'Ei sovellusta asennettavaksi')}</span><span>{t('PIN login', 'PIN-kirjautuminen')}</span><span>{t('Set up in minutes', 'Käyttöön minuuteissa')}</span>
          </p>
        </div>
        <div className="relative rounded-[2rem] sm:rounded-[2.75rem] overflow-hidden" style={{ background: GREY }}>
          <div className="relative mx-auto w-full max-w-[34rem] aspect-[4/5] sm:aspect-[4/4.7]">
            <img src="/site-iphone-hk-864.webp" srcSet="/site-iphone-hk-432.webp 432w, /site-iphone-hk-648.webp 648w, /site-iphone-hk-864.webp 864w, /site-iphone-hk-1296.webp 1296w, /site-iphone-hk-1728.webp 1728w" sizes="(min-width: 1024px) 300px, 52vw" width="1296" height="2598" alt={t('The housekeeper screen on a phone with a cleaning timer running', 'Siivoojan näkymä puhelimessa, siivousajastin käynnissä')} className="absolute left-[7%] top-[7%] w-[48%] h-auto drop-shadow-[0_36px_40px_rgba(11,11,15,.28)]" />
            <img src="/site-iphone-mt-864.webp" srcSet="/site-iphone-mt-432.webp 432w, /site-iphone-mt-648.webp 648w, /site-iphone-mt-864.webp 864w, /site-iphone-mt-1296.webp 1296w, /site-iphone-mt-1728.webp 1728w" sizes="(min-width: 1024px) 300px, 52vw" width="1296" height="2598" alt={t('The maintenance screen on a phone with a list of open problems', 'Huollon näkymä puhelimessa, lista avoimista vioista')} className="absolute right-[5%] bottom-[5%] w-[37%] h-auto drop-shadow-[0_36px_40px_rgba(11,11,15,.28)]" />
            <div className={`${chip} left-[3%] bottom-[5%]`}><span className="w-2 h-2 rounded-full bg-[#0D7C77]" aria-hidden="true" /><span className="text-[13px] leading-tight"><b className="block font-semibold" style={{ color: INK }}>{t('Room 203 is ready', 'Huone 203 on valmis')}</b><span className="text-slate-500">{t('Approved just now', 'Hyväksytty juuri nyt')}</span></span></div>
            <div className={`${chip} right-[4%] top-[3.5%]`}><span className="w-2 h-2 rounded-full bg-[#F97316]" aria-hidden="true" /><span className="text-[13px] leading-tight"><b className="block font-semibold" style={{ color: INK }}>{t('Leak in room 106', 'Vuoto huoneessa 106')}</b><span className="text-slate-500">{t('Sent to Tom, urgent', 'Lähetetty Tomille, kiireellinen')}</span></span></div>
          </div>
        </div>
      </div>
      <p className="text-center -mt-4 pb-4"><a href="#tour" className="text-sm font-semibold hover:underline" style={{ color: INK }}>{t('Watch the 48-second tour ↓', 'Katso 48 sekunnin esittely ↓')}</a></p>
    </section>
  );
}

/* ---------------- Vídeo de 1 minuto ---------------- */

function Tour() {
  return (
    <section id="tour" className="mx-auto max-w-6xl px-5 pt-8 sm:pt-12 pb-16 sm:pb-24 scroll-mt-16" aria-labelledby="tour-title">
      <div className="max-w-3xl mx-auto text-center">
        <h2 id="tour-title" className={`${H2}`} style={{ color: INK }}>{t('See Lodgora in action', 'Katso Lodgora toiminnassa')}</h2>
        <p className="mt-3 text-lg">{t('A short tour, from the housekeeper\'s phone to the manager\'s screen. Example data, no sound needed.', 'Lyhyt esittely siivoojan puhelimesta esimiehen näkymään. Esimerkkitietoja, ääntä ei tarvita.')}</p>
      </div>
      <div className="mt-8 mx-auto max-w-4xl rounded-[1.5rem] sm:rounded-[2.25rem] overflow-hidden bg-[#0B0B0F]">
        <video className="block w-full h-auto" controls playsInline preload="metadata" poster="/lodgora-promo-v4-poster.jpg" aria-label={t('Short tour of Lodgora: housekeeper, maintenance and manager screens', 'Lyhyt esittely Lodgorasta: siivooja-, huolto- ja esimiesnäkymät')}>
          <source src="/lodgora-promo-v4.mp4" type="video/mp4" />
          {t('Your browser cannot play this video. You can try the live demo above instead.', 'Selaimesi ei pysty toistamaan tätä videota. Voit kokeilla live-demoa ylhäällä.')}
        </video>
      </div>
    </section>
  );
}

/* ---------------- Como funciona (é mesmo uma sequência) ---------------- */

function Day() {
  const steps = [
    [t('Add your rooms and your team', 'Lisää huoneesi ja tiimisi'), t('Enter your room numbers and give each housekeeper a 4-digit PIN. Thirty rooms take about a minute.', 'Syötä huoneiden numerot ja anna jokaiselle siivoojalle nelinumeroinen PIN-koodi. Kolmenkymmenen huoneen lisääminen vie noin minuutin.')],
    [t('Your team cleans from their phones', 'Tiimisi siivoaa puhelimen avulla'), t('They sign in with your hotel code, their username and their PIN. No app to install. They press Start, and Finish when the room is done.', 'He kirjautuvat hotellisi koodilla, käyttäjätunnuksella ja PIN-koodilla. Sovellusta ei tarvitse asentaa. He painavat Aloita ja Valmis, kun huone on siivottu.')],
    [t('You approve and keep track', 'Sinä hyväksyt ja seuraat'), t('Finished rooms wait for your inspection. You approve them or send them back, and see times and problems on one screen.', 'Valmiit huoneet odottavat tarkastustasi. Hyväksyt ne tai lähetät takaisin, ja näet ajat ja ongelmat yhdeltä näytöltä.')]
  ];
  return (
    <section id="how" style={{ background: GREY }} aria-labelledby="how-title">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <h2 id="how-title" className={`${H2} max-w-xl`} style={{ color: INK }}>{t('How a day works with Lodgora', 'Näin päivä sujuu Lodgoralla')}</h2>
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
          <p className="text-sm font-semibold text-[#0D7C77]">{t('Try it yourself', 'Kokeile itse')}</p>
          <h2 id="hk-title" className={`mt-2 ${H2} [text-wrap:balance]`} style={{ color: INK }}>{t('One screen for the housekeeper, one for you', 'Yksi näkymä siivoojalle, yksi sinulle')}</h2>
          <p className="mt-4 text-lg leading-relaxed">{t('Press Finish on the phone and watch the manager screen update.', 'Paina puhelimessa Valmis ja katso, miten esimiehen näkymä päivittyy.')}</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2.5">
            {[t('No app to install', 'Ei sovellusta asennettavaksi'), t('Sign in with a 4-digit PIN', 'Kirjaudu nelinumeroisella PIN-koodilla'), t('Report a problem from the same screen', 'Ilmoita vika samasta näkymästä')].map((t) => (
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
          <h2 id="mg-title" className={`${H2}`} style={{ color: INK }}>{t('See how long cleaning really takes', 'Näe, kuinka kauan siivous oikeasti kestää')}</h2>
          <p className="mt-5 leading-relaxed max-w-md">
            {t('Lodgora keeps a record of every finished cleaning. You see the average time for each room type and for each person, how many rooms you approved first time, and how fast maintenance problems get fixed.', 'Lodgora tallentaa jokaisen valmiin siivouksen. Näet keskimääräisen ajan huonetyypeittäin ja henkilöittäin, kuinka moni huone hyväksyttiin ensimmäisellä kerralla ja kuinka nopeasti viat korjataan.')}
          </p>
          <ul className="mt-6 space-y-3 max-w-md">
            {[
              t('Choose today, the last 7 days or the last 30 days.', 'Valitse tämä päivä, viimeiset 7 päivää tai viimeiset 30 päivää.'),
              t('Plan the day with real times instead of guesses.', 'Suunnittele päivä oikeilla ajoilla arvausten sijaan.'),
              t('See the latest cleanings and whether you approved them.', 'Näe viimeisimmät siivoukset ja se, oletko hyväksynyt ne.')
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
    ['bed', t('Rooms and common areas', 'Huoneet ja yleiset tilat'), t('Track the lobby, the breakfast room and the gym the same way as your rooms. Ask for all common areas to be cleaned with one button.', 'Seuraa aulaa, aamiaishuonetta ja kuntosalia samalla tavalla kuin huoneita. Pyydä kaikkien yleisten tilojen siivous yhdellä painikkeella.')],
    ['inspect', t('Inspections', 'Tarkastukset'), t('A cleaned room waits for you. Approve it, or send it back and the housekeeper sees it on their list again.', 'Siivottu huone odottaa sinua. Hyväksy se tai lähetä takaisin, jolloin siivooja näkee sen taas listallaan.')],
    ['wrench', t('Maintenance issues', 'Huoltotyöt'), t('Anyone on your team can report a problem with a priority. You see what is open and what is fixed.', 'Kuka tahansa tiimistäsi voi ilmoittaa viasta ja valita kiireellisyyden. Näet, mikä on auki ja mikä korjattu.')],
    ['sparkles', t('Assign cleaning', 'Siivousten jako'), t('Share the rooms that need cleaning between your housekeepers with one click, or choose who cleans what.', 'Jaa siivottavat huoneet siivoojien kesken yhdellä klikkauksella tai valitse itse, kuka siivoaa minkäkin.')],
    ['users', t('Your team, your PINs', 'Tiimisi, PIN-koodisi'), t('Add a person in seconds. You can see their PIN, change it, or stop their access when they leave.', 'Lisää henkilö sekunneissa. Näet hänen PIN-koodinsa, voit vaihtaa sen tai poistaa pääsyn, kun hän lähtee.')],
    ['refresh', t('Live updates', 'Reaaliaikaiset päivitykset'), t('When a housekeeper finishes a room, your screen changes without you refreshing anything.', 'Kun siivooja saa huoneen valmiiksi, näkymäsi päivittyy itsestään.')]
  ];
  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-16 sm:py-24" aria-labelledby="ft-title">
      <h2 id="ft-title" className={`${H2} max-w-xl`} style={{ color: INK }}>{t('Everything your housekeeping team needs, and nothing else', 'Kaikki, mitä siivoustiimisi tarvitsee, eikä mitään ylimääräistä')}</h2>
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
          <h2 id="pr-title" className={`${H2}`} style={{ color: INK }}>{t('Pay by the size of your hotel', 'Maksa hotellisi koon mukaan')}</h2>
          <p className="mt-5 leading-relaxed max-w-md">
            {t(`Every plan includes everything on this page. The only difference is how many rooms you have. Start with a free ${SITE.pilotDays}-day pilot with your own rooms and your own team.`, `Jokainen hinnoittelutaso sisältää kaiken tällä sivulla esitetyn. Ainoa ero on huoneiden määrä. Aloita maksuttomalla ${SITE.pilotDays} päivän pilotilla omilla huoneillasi ja omalla tiimilläsi.`)}
          </p>
          <p className="mt-4 text-sm text-slate-500">{t('Prices are per month and exclude VAT. Have more than 100 rooms? Get in touch.', 'Hinnat ovat kuukaudessa ja ne eivät sisällä arvonlisäveroa. Yli 100 huonetta? Ota yhteyttä.')}</p>
        </div>
        <PlanPicker />
      </div>
    </section>
  );
}

/* ---------------- Perguntas ---------------- */

function Faq() {
  const qa = [
    [t('Do my housekeepers have to install an app?', 'Täytyykö siivoojieni asentaa sovellus?'), t('No. They open the Lodgora website on their phone and sign in with your hotel code, their username and a 4-digit PIN.', 'Ei. He avaavat Lodgoran verkkosivun puhelimellaan ja kirjautuvat hotellisi koodilla, käyttäjätunnuksella ja nelinumeroisella PIN-koodilla.')],
    [t('What do I need to get started?', 'Mitä tarvitsen aloittamiseen?'), t('A list of your room numbers and the names of your housekeepers. You can add a whole floor of rooms at once.', 'Luettelon huoneiden numeroista ja siivoojiesi nimet. Voit lisätä kokonaisen kerroksen huoneet kerralla.')],
    [t('What if someone forgets their PIN?', 'Entä jos joku unohtaa PIN-koodinsa?'), t('You can see every PIN on the Team page and change it any time. After five wrong tries, that person is locked out for 15 minutes.', 'Näet kaikki PIN-koodit Tiimi-sivulla ja voit vaihtaa ne milloin tahansa. Viiden väärän yrityksen jälkeen henkilö lukitaan ulos 15 minuutiksi.')],
    [t('Where is our data stored?', 'Missä tietomme säilytetään?'), t('On servers in the European Union (Ireland). Each hotel can only see its own data.', 'Palvelimilla Euroopan unionissa (Irlannissa). Jokainen hotelli näkee vain omat tietonsa.')],
    [t('Does it connect to my booking system?', 'Yhdistyykö se varausjärjestelmääni?'), t('Not yet. Today your team updates rooms in Lodgora. If a connection to your booking system would help, tell us which one you use.', 'Ei vielä. Nykyisin tiimisi päivittää huoneet Lodgoraan. Jos yhteys varausjärjestelmääsi olisi hyödyllinen, kerro meille, mitä käytät.')],
    [t('Which languages does it support?', 'Mitä kieliä se tukee?'), t('English for now. This website is also available in Finnish.', 'Toistaiseksi englantia. Tämä verkkosivu on saatavilla myös suomeksi.')]
  ];
  return (
    <section id="faq" className="mx-auto max-w-6xl px-5 py-16 sm:py-24" aria-labelledby="fq-title">
      <h2 id="fq-title" className={`${H2}`} style={{ color: INK }}>{t('Questions hotels ask', 'Hotellien usein kysymät kysymykset')}</h2>
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
        <h2 id="cl-title" className="font-geist font-semibold text-[2.4rem] sm:text-[4.2rem] tracking-[-0.045em] leading-[1] text-white [text-wrap:balance]">{t(`Start your free ${SITE.pilotDays}-day pilot.`, `Aloita maksuton ${SITE.pilotDays} päivän pilotti.`)}</h2>
        <p className="mt-5 text-lg leading-relaxed max-w-xl mx-auto text-slate-400">{t(`Try Lodgora with your team for ${SITE.pilotDays} days. Or open the demo first, with no account needed.`, `Kokeile Lodgoraa tiimisi kanssa ${SITE.pilotDays} päivän ajan. Tai avaa ensin demo, tiliä ei tarvita.`)}</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          {canAsk ? <a {...request('Lodgora pilot')} className={`${btn} bg-white text-[#0B0B0F] hover:bg-slate-200 !px-7 !py-4 !text-base`}>{t('Ask for a free pilot', 'Pyydä maksuton pilotti')}</a> : <a href={demoHref} className={`${btn} bg-white text-[#0B0B0F] hover:bg-slate-200 !px-7 !py-4 !text-base`}>{t('Try the live demo', 'Kokeile live-demoa')}</a>}
          {canAsk && <a href={demoHref} className={`${btn} bg-white/10 text-white hover:bg-white/20 !px-7 !py-4 !text-base`}>{t('Try the live demo', 'Kokeile live-demoa')}</a>}
        </div>
        <ul className="mt-9 flex flex-wrap justify-center gap-x-7 gap-y-2 text-sm text-slate-400">
          {[t('Free ' + SITE.pilotDays + '-day pilot', 'Maksuton ' + SITE.pilotDays + ' päivän pilotti'), t('No app to install', 'Ei sovellusta asennettavaksi'), t('Set up in minutes', 'Käyttöön minuuteissa')].map((t) => (
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
        <span>{t('Housekeeping and maintenance for independent hotels.', 'Siivouksen ja huollon hallinta itsenäisille hotelleille.')}</span>
        <span className="text-slate-400">© 2026 Lodgora</span>
        <span className="sm:ml-auto flex flex-wrap gap-x-5 gap-y-2">
          <a href="/app" className="hover:text-[#0B0B0F] underline-offset-2 hover:underline">{t('Sign in', 'Kirjaudu')}</a>
          <a href={demoHref} className="hover:text-[#0B0B0F] underline-offset-2 hover:underline">{t('Demo', 'Demo')}</a>
          <a href="/privacy" className="hover:text-[#0B0B0F] underline-offset-2 hover:underline">{t('Privacy', 'Tietosuoja')}</a>
          <a href="/terms" className="hover:text-[#0B0B0F] underline-offset-2 hover:underline">{t('Terms', 'Käyttöehdot')}</a>
          <a href="/dpa" className="hover:text-[#0B0B0F] underline-offset-2 hover:underline">{t('Data processing', 'Tietojenkäsittely')}</a>
          {SITE.contactEmail && <a href={mailto('Lodgora')} className="hover:text-[#0B0B0F] underline-offset-2 hover:underline">{t('Contact', 'Yhteystiedot')}</a>}
        </span>
      </div>
    </footer>
  );
}
