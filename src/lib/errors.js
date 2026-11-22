// Mensagens de erro do servidor (em inglês) mostradas em finlandês quando a língua é FI.
import { LANG } from './i18n';

const FI = {
  'Wrong hotel code, username or PIN': 'Väärä hotellikoodi, käyttäjätunnus tai PIN-koodi',
  'Too many attempts. Try again in 15 minutes.': 'Liian monta yritystä. Yritä uudelleen 15 minuutin kuluttua.',
  'Session expired. Please sign in again.': 'Istunto on vanhentunut. Kirjaudu sisään uudelleen.',
  'Something went wrong': 'Jokin meni pieleen',
  'This hotel account is paused. Please contact Lodgora.': 'Tämä hotellitili on keskeytetty. Ota yhteyttä Lodgoraan.',
  'This account has no hotel yet. Use "Create hotel account" to set one up.': 'Tällä tilillä ei ole vielä hotellia. Luo hotellitili valinnalla "Luo hotellitili".',
  'That invitation code is not valid or was already used.': 'Kutsukoodi ei kelpaa tai se on jo käytetty.',
  'Your password was changed, but this account has no hotel yet. Sign in and create one.': 'Salasanasi vaihdettiin, mutta tilillä ei ole vielä hotellia. Kirjaudu sisään ja luo hotelli.',
  'Another room or area already has that name.': 'Toisella huoneella tai tilalla on jo tämä nimi.',
  'Write a short note': 'Kirjoita lyhyt viesti',
  'Choose someone from the maintenance team.': 'Valitse joku huoltotiimistä.',
  'Enter the full name': 'Kirjoita koko nimi',
  'Username must have 2 to 20 letters, numbers, dots or dashes': 'Käyttäjätunnuksessa on oltava 2–20 kirjainta, numeroa, pistettä tai viivaa',
  'The PIN must have exactly 4 digits': 'PIN-koodissa on oltava tasan 4 numeroa',
  'That username is already used': 'Tämä käyttäjätunnus on jo käytössä',
  'Staff member not found': 'Työntekijää ei löytynyt',
  'Room not found': 'Huonetta ei löytynyt',
  'That change is not allowed': 'Tämä muutos ei ole sallittu',
  'Issue not found': 'Vikailmoitusta ei löytynyt',
  'Use 500 characters or fewer': 'Käytä enintään 500 merkkiä',
  'Describe the problem': 'Kuvaile vika',
  'Invalid login credentials': 'Väärä sähköposti tai salasana',
  'Email not confirmed': 'Sähköpostia ei ole vahvistettu',
  'User already registered': 'Tällä sähköpostilla on jo tili',
  'Failed to fetch': 'Yhteysvirhe. Tarkista verkkoyhteytesi ja yritä uudelleen.',
  'Load failed': 'Yhteysvirhe. Tarkista verkkoyhteytesi ja yritä uudelleen.',
  'NetworkError when attempting to fetch resource.': 'Yhteysvirhe. Tarkista verkkoyhteytesi ja yritä uudelleen.'
};

export const tErr = (msg) => {
  if (LANG !== 'fi' || !msg) return msg;
  if (FI[msg]) return FI[msg];
  if (/Password should be at least/i.test(msg)) return 'Salasanassa on oltava vähintään 6 merkkiä.';
  if (/rate limit|too many requests/i.test(msg)) return 'Liian monta yritystä. Odota hetki ja yritä uudelleen.';
  if (/network|fetch/i.test(msg)) return 'Yhteysvirhe. Tarkista verkkoyhteytesi ja yritä uudelleen.';
  return msg;
};
