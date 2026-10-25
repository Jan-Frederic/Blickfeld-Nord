// Antwortvorlagen für Booking-Anfragen (Backstage → Material), auf Deutsch, Englisch und Niederländisch. Nur
// Angaben, die auch auf der Website bzw. im Technik-Rider stehen (Spielfläche, Strom, Aufbau, Spielzeit) – Gage und
// Adressen kommen erst beim Verschicken von Hand dazu und gehören nicht ins öffentliche Repository.
// EN/NL folgen den Formulierungen des übersetzten Riders (scripts/pdf_texte.py) – vor dem ersten Einsatz gegenlesen.

export type Vorlage = 'zusage' | 'rueckfrage' | 'absage';
export type Sprache = 'de' | 'en' | 'nl';

export const VORLAGEN: { id: Vorlage; label: string; text: string }[] = [
  { id: 'zusage', label: 'Termin frei – Zusage', text: 'Termin ist frei, Rückfragen zum Ablauf, Links zu Technik und Pressekit' },
  { id: 'rueckfrage', label: 'Rückfrage', text: 'Termin noch offen – erst ein paar Eckdaten klären' },
  { id: 'absage', label: 'Termin belegt – Absage', text: 'Freundlich absagen, auf freie Termine im Booking verweisen' },
];

export interface AntwortDaten {
  name?: string;
  anlass?: string;
  /** JJJJ-MM-TT */
  datum?: string;
  absender?: string;
}

const SITE = 'https://blickfeld-nord.de';
const TAGE: Record<Sprache, string[]> = {
  de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  nl: ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'],
};

interface Texte {
  hallo: (n: string) => string;
  am: (tag: string, d: string) => string;
  fuer: (a: string) => string;
  name: string;
  gruss: string;
  von: (n: string) => string;
  eckdaten: string[];
  technik: string[];
  anlage: string;
  links: (pfad: string) => string[];
  zusage: (w: string) => string;
  planen: string;
  brauchen: string;
  rueckfrage: (w: string) => string;
  melden: string;
  absage: (w: string) => string;
  frei: (pfad: string) => string;
  andermal: string;
}

const T: Record<Sprache, Texte> = {
  de: {
    hallo: (n) => `Hallo ${n},`,
    am: (tag, d) => `am ${tag}, ${d.split('-').reverse().join('.')}`,
    fuer: (a) => `für ${a}`,
    name: '[Name]',
    gruss: 'Viele Grüße',
    von: (n) => `${n} von Blickfeld Nord`,
    eckdaten: [
      '– Ort bzw. Adresse und ob drinnen oder draußen',
      '– gewünschter Beginn und Spielzeit (bei uns 3 bis 4 Stunden, in Sets à 1 Stunde)',
      '– ungefähre Zahl der Gäste und der Anlass',
    ],
    technik: ['– eine Spielfläche von ca. 4 × 3 m', '– 2 Steckdosen in der Nähe der Spielfläche', '– ca. 3 Stunden vor Beginn Zeit für den Aufbau'],
    anlage: 'Unsere Anlage und das Licht bringen wir selbst mit.',
    links: (p) => [`Technik-Rider und Bühnenplan: ${SITE}${p}/technik`, `Fotos, Pressetext und Logos: ${SITE}${p}/presse`],
    zusage: (w) => `vielen Dank für eure Anfrage${w}! Der Termin ist bei uns frei und wir haben richtig Lust, bei euch zu spielen.`,
    planen: 'Damit wir alles gut planen können, bräuchten wir noch ein paar Infos:',
    brauchen: 'Von euch bräuchten wir:',
    rueckfrage: (w) => `danke für eure Nachricht${w}! Bevor wir zusagen, hätten wir noch ein paar Fragen:`,
    melden: 'Sobald wir das wissen, melden wir uns mit einer verbindlichen Antwort.',
    absage: (w) => `vielen Dank für eure Anfrage${w}! Leider sind wir an diesem Termin schon gebucht.`,
    frei: (p) => `Unsere freien Termine seht ihr hier – vielleicht passt ja ein anderer Tag: ${SITE}${p}/booking#verfuegbarkeit`,
    andermal: 'Wir würden uns freuen, wenn es ein anderes Mal klappt!',
  },
  en: {
    hallo: (n) => `Hi ${n},`,
    am: (tag, d) => `on ${tag}, ${d.split('-').reverse().join('/')}`,
    fuer: (a) => `for ${a}`,
    name: '[name]',
    gruss: 'Best wishes',
    von: (n) => `${n} from Blickfeld Nord`,
    eckdaten: [
      '– the venue or address, and whether it is indoors or outdoors',
      '– preferred start time and playing time (we play 3 to 4 hours, in sets of 1 hour)',
      '– roughly how many guests and what the occasion is',
    ],
    technik: ['– a stage area of approx. 4 × 3 m', '– 2 power sockets near the stage area', '– approx. 3 hours before the start for setting up'],
    anlage: 'We bring our own PA and lights.',
    links: (p) => [`Tech rider and stage plan: ${SITE}${p}/technik`, `Photos, press text and logos: ${SITE}${p}/presse`],
    zusage: (w) => `thank you very much for your request${w}! We are free on that date and would love to play for you.`,
    planen: 'To plan everything properly, we would need a few more details:',
    brauchen: 'What we need from you:',
    rueckfrage: (w) => `thanks for your message${w}! Before we confirm, we have a few questions:`,
    melden: 'As soon as we know, we will get back to you with a firm answer.',
    absage: (w) => `thank you very much for your request${w}! Unfortunately, we are already booked on that date.`,
    frei: (p) => `You can see our available dates here – maybe another day works: ${SITE}${p}/booking#verfuegbarkeit`,
    andermal: 'We would be happy if it works out another time!',
  },
  nl: {
    hallo: (n) => `Hallo ${n},`,
    am: (tag, d) => `op ${tag} ${d.split('-').reverse().join('-')}`,
    fuer: (a) => `voor ${a}`,
    name: '[naam]',
    gruss: 'Met vriendelijke groet',
    von: (n) => `${n} van Blickfeld Nord`,
    eckdaten: [
      '– de locatie of het adres, en of het binnen of buiten is',
      '– gewenste aanvangstijd en speelduur (wij spelen 3 tot 4 uur, in sets van 1 uur)',
      '– ongeveer het aantal gasten en de gelegenheid',
    ],
    technik: ['– een speelvlak van ca. 4 × 3 m', '– 2 stopcontacten in de buurt van het speelvlak', '– ca. 3 uur voor aanvang tijd voor de opbouw'],
    anlage: 'Geluid (PA) en licht nemen we zelf mee.',
    links: (p) => [`Techniek-rider en podiumplan: ${SITE}${p}/technik`, `Foto's, perstekst en logo's: ${SITE}${p}/presse`],
    zusage: (w) => `hartelijk dank voor jullie aanvraag${w}! De datum is bij ons nog vrij en we hebben veel zin om bij jullie te spelen.`,
    planen: 'Om alles goed te kunnen plannen, hebben we nog een paar gegevens nodig:',
    brauchen: 'Wat we van jullie nodig hebben:',
    rueckfrage: (w) => `bedankt voor jullie bericht${w}! Voordat we toezeggen, hebben we nog een paar vragen:`,
    melden: 'Zodra we dat weten, laten we jullie definitief iets weten.',
    absage: (w) => `hartelijk dank voor jullie aanvraag${w}! Helaas zijn we op die datum al geboekt.`,
    frei: (p) => `Onze vrije data zien jullie hier – misschien past een andere dag: ${SITE}${p}/booking#verfuegbarkeit`,
    andermal: 'We zouden het leuk vinden als het een andere keer lukt!',
  },
};

/** fertiger Antworttext; Platzhalter in eckigen Klammern, wo Angaben fehlen */
export function antwort(vorlage: Vorlage, d: AntwortDaten, sprache: Sprache = 'de'): string {
  const t = T[sprache];
  const pfad = sprache === 'de' ? '' : `/${sprache}`;
  const datum = d.datum ? t.am(TAGE[sprache][new Date(`${d.datum}T12:00:00`).getDay()], d.datum) : '';
  const wofuer = [d.anlass?.trim() ? t.fuer(d.anlass.trim()) : '', datum].filter(Boolean).join(' ');
  const w = wofuer ? ' ' + wofuer : '';
  const hallo = t.hallo(d.name?.trim() || t.name);
  const gruss = ['', t.gruss, t.von(d.absender?.trim() || t.name), SITE];
  const texte: Record<Vorlage, string[]> = {
    zusage: [hallo, '', t.zusage(w), '', t.planen, ...t.eckdaten, '', t.brauchen, ...t.technik, t.anlage, '', ...t.links(pfad), ...gruss],
    rueckfrage: [hallo, '', t.rueckfrage(w), ...t.eckdaten, '', t.melden, ...gruss],
    absage: [hallo, '', t.absage(w), '', t.frei(pfad), t.andermal, ...gruss],
  };
  return texte[vorlage].join('\n');
}
