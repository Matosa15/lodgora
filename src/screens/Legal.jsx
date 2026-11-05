// Políticas públicas: privacidade e termos. Rascunhos em inglês, para rever com o contabilista ou um advogado
// antes de cobrares a clientes. Os dados de quem explora o serviço vêm de src/lib/site.js.
import { Header, Footer } from './Site';
import { SITE } from '../lib/site';

const INK = '#172B4D';

function Page({ title, children }) {
  return (
    <div className="bg-white text-slate-700 min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
          <h1 className="font-display font-semibold text-4xl tracking-tight" style={{ color: INK }}>{title}</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: {SITE.legal.updated}</p>
          <div className="mt-8 space-y-9 leading-relaxed">{children}</div>
        </article>
      </main>
      <Footer />
    </div>
  );
}

function S({ title, children }) {
  return (
    <section>
      <h2 className="font-display font-semibold text-xl" style={{ color: INK }}>{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

const List = ({ items }) => <ul className="list-disc pl-5 space-y-1.5">{items.map((t) => <li key={t}>{t}</li>)}</ul>;

// Quem somos: mostra só o que estiver preenchido em site.js
function Operator() {
  const { name, businessId, address } = SITE.legal;
  const lines = [name, businessId && `Business ID: ${businessId}`, address, SITE.contactEmail].filter(Boolean);
  return (
    <p>
      Lodgora is a web service for hotel housekeeping and maintenance.
      {lines.length > 0 ? ' It is operated by:' : ''}
    </p>
  );
}
function OperatorLines() {
  const { name, businessId, address } = SITE.legal;
  const lines = [name, businessId && `Business ID: ${businessId}`, address, SITE.contactEmail].filter(Boolean);
  if (!lines.length) return null;
  return <p className="rounded-lg bg-[#F3F6F8] border border-slate-200 px-4 py-3 text-sm">{lines.map((l) => <span key={l} className="block">{l}</span>)}</p>;
}

export default function Legal({ page }) {
  return page === 'terms' ? <Terms /> : <Privacy />;
}

function Privacy() {
  return (
    <Page title="Privacy policy">
      <S title="1. Who we are">
        <Operator />
        <OperatorLines />
        <p>This policy explains what personal data Lodgora handles, why, and what your rights are.</p>
      </S>

      <S title="2. Two roles">
        <p>
          <strong>For a hotel's own data</strong> (its staff, rooms and cleaning records), the hotel decides what is entered and why. The hotel is the controller
          and Lodgora is the processor: we only handle that data to run the service for the hotel and following its instructions.
        </p>
        <p>
          <strong>For manager accounts, contact requests and visitors to this website</strong>, Lodgora is the controller.
        </p>
      </S>

      <S title="3. What data we handle">
        <List items={[
          'Manager account: name, email address and password. The password is stored only as a secure hash.',
          'Hotel: hotel name and the hotel code that staff use to sign in.',
          'Staff: full name, username and a 4-digit PIN. The PIN is stored as a secure hash. The hotel manager can also see the PIN in the Team page, so they can help staff who forget it.',
          'Hotel operations: room numbers and types, room status, who cleaned which room and when, cleaning times, inspection results, maintenance issues and the activity log.',
          'Security data: failed sign-in attempts (used to lock an account for 15 minutes after five wrong PINs).',
          'Messages and form requests you send us, for example when you ask for a demo or a pilot.'
        ]} />
        <p>We do not ask for guests' names or any guest data. Please do not enter guest information in room notes or issue descriptions.</p>
      </S>

      <S title="4. Why we use it">
        <List items={[
          'To provide the service the hotel has asked for (contract).',
          'To keep the service secure and prevent abuse (legitimate interest).',
          'To keep accounting records and meet legal obligations (legal obligation).',
          'To answer your messages and arrange demos (legitimate interest).'
        ]} />
        <p>We do not sell personal data and we do not use it for advertising.</p>
      </S>

      <S title="5. Where data is stored and who helps us">
        <List items={[
          'Supabase: database, sign-in and emails such as password reset. Our database is in the European Union (Ireland).',
          'Cloudflare: hosts and delivers the website. It processes technical data such as IP addresses to deliver pages and protect the site.',
          'Tally: the "Request a pilot" form on the website is hosted by Tally (tally.so). If you use it, the details you type (name, hotel, email, number of rooms, message) are sent to Tally and to us.',
          'Google Fonts: this website loads its typefaces from Google, which means your browser sends your IP address to Google when a page opens.'
        ]} />
        <p>
          These providers may process data outside the European Economic Area. When they do, it is under the European Commission's standard contractual
          clauses or another legal transfer mechanism.
        </p>
      </S>

      <S title="6. Cookies and similar technologies">
        <p>
          We do not use advertising or analytics cookies. The app stores a sign-in session in your browser's local storage so that you stay signed in.
          This is necessary for the service to work. Signing out removes it.
        </p>
      </S>

      <S title="7. How long we keep data">
        <p>
          Hotel data is kept while the hotel uses Lodgora. When the agreement ends we delete the hotel's data within 90 days, unless the law requires us to keep
          something (for example accounting records about invoices). Hotels can ask us earlier to delete or export their data.
        </p>
      </S>

      <S title="8. Security">
        <List items={[
          'All traffic is encrypted.',
          'Each hotel can only access its own data. This is enforced in the database, not only in the app.',
          'Passwords and PINs are stored as hashes.',
          'Accounts are temporarily locked after repeated wrong PINs.'
        ]} />
        <p>If we ever learn of a data breach affecting your data, we will tell the affected hotels without undue delay.</p>
      </S>

      <S title="9. Your rights">
        <p>
          You can ask to see, correct, delete or export your personal data, to restrict how it is used, and to object to its use. If you are a hotel
          employee, please contact your hotel first, because the hotel is the controller of your staff data. You can also contact us and we will help the hotel
          answer.
        </p>
        <p>
          You have the right to complain to the supervisory authority. In Finland this is the Office of the Data Protection Ombudsman
          (<a className="text-[#0D7C77] underline" href="https://tietosuoja.fi" rel="noopener noreferrer">tietosuoja.fi</a>).
        </p>
      </S>

      <S title="10. Changes">
        <p>If we change this policy in a meaningful way, we will update the date at the top and tell hotel managers by email.</p>
      </S>

      {SITE.contactEmail && (
        <S title="11. Contact">
          <p>Questions about privacy: <a className="text-[#0D7C77] underline" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a></p>
        </S>
      )}
    </Page>
  );
}

function Terms() {
  return (
    <Page title="Terms of service">
      <S title="1. About these terms">
        <Operator />
        <OperatorLines />
        <p>By creating a hotel account or using Lodgora you agree to these terms on behalf of your hotel.</p>
      </S>

      <S title="2. The service">
        <p>
          Lodgora lets a hotel track room and common area status, assign cleaning, record cleaning times and inspections, report maintenance issues and see
          statistics. Housekeepers use it on their phone and managers use it on a computer or phone.
        </p>
      </S>

      <S title="3. Free pilot">
        <p>
          New hotels can try Lodgora free for {SITE.pilotDays} days. No payment is needed. Either side can end the pilot at any time. If the hotel wants to continue
          after the pilot, we agree a plan before we send any invoice.
        </p>
      </S>

      <S title="4. Prices and payment">
        <List items={SITE.plans.map((p) => `${p.name} (${p.rooms.toLowerCase()}): ${p.price} € per month`)} />
        <p>
          Prices are per month and exclude VAT, which is added where it applies. We invoice monthly in advance and the payment term is 14 days. We will tell you
          at least 30 days before a price changes.
        </p>
      </S>

      <S title="5. Term and cancelling">
        <p>
          The agreement runs month to month. The hotel can cancel at any time by email, and it ends at the end of the month in which it is cancelled. We may
          suspend or end an account that is not paid after a reminder, or that is used in a way that breaks these terms.
        </p>
      </S>

      <S title="6. What the hotel agrees to">
        <List items={[
          'Give correct information and keep sign-in details and PINs safe.',
          'Use Lodgora lawfully and only for hotel operations.',
          'Tell its staff that their name, username and work activity (rooms cleaned and cleaning times) are recorded in Lodgora, and follow the labour and privacy rules that apply to it.',
          'Not enter guest personal data, and not try to access other hotels\' data or to disturb the service.'
        ]} />
      </S>

      <S title="7. The hotel's data">
        <p>
          The hotel owns its data. We use it only to run the service. The hotel can ask for an export or deletion at any time. See the{' '}
          <a className="text-[#0D7C77] underline" href="/privacy">privacy policy</a> for details.
        </p>
      </S>

      <S title="8. Availability and support">
        <p>
          We work to keep Lodgora available, but we do not promise uninterrupted service, and we may carry out maintenance. We give support by email during
          normal working days. Features can change over time.
        </p>
      </S>

      <S title="9. Liability">
        <p>
          Lodgora is a tool that helps hotels organise their work. We are not liable for indirect losses such as lost revenue or lost bookings. Our total liability
          for any claim is limited to the fees the hotel paid in the 3 months before the claim. Nothing here limits liability that cannot be limited by law.
        </p>
      </S>

      <S title="10. Changes, law and disputes">
        <p>
          We may update these terms and will tell managers by email at least 30 days before a change that affects them. These terms follow Finnish law.
          Disputes are first handled by talking to each other. If that does not work, they go to the competent court in Finland.
        </p>
      </S>

      {SITE.contactEmail && (
        <S title="11. Contact">
          <p>Questions: <a className="text-[#0D7C77] underline" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a></p>
        </S>
      )}
    </Page>
  );
}
