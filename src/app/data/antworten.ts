// Antwortvorlagen für Booking-Anfragen (Backstage → Material). Nur Angaben, die auch auf der Website bzw. im
// Technik-Rider stehen (Spielfläche, Strom, Aufbau, Spielzeit) – Gage und Adressen kommen erst beim Verschicken von
// Hand dazu und gehören nicht ins öffentliche Repository.

export type Vorlage = 'zusage' | 'rueckfrage' | 'absage';

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

const TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const amDatum = (d?: string) => (d ? ` am ${TAGE[new Date(`${d}T12:00:00`).getDay()]}, ${d.split('-').reverse().join('.')}` : '');

const ECKDATEN = [
  '– Ort bzw. Adresse und ob drinnen oder draußen',
  '– gewünschter Beginn und Spielzeit (bei uns 3 bis 4 Stunden, in Sets à 1 Stunde)',
  '– ungefähre Zahl der Gäste und der Anlass',
];
const TECHNIK = [
  '– eine Spielfläche von ca. 4 × 3 m',
  '– 2 Steckdosen in der Nähe der Spielfläche',
  '– ca. 3 Stunden vor Beginn Zeit für den Aufbau',
];

/** fertiger Antworttext; Platzhalter in eckigen Klammern, wo Angaben fehlen */
export function antwort(vorlage: Vorlage, d: AntwortDaten): string {
  const hallo = `Hallo ${d.name?.trim() || '[Name]'},`;
  const wofuer = `${d.anlass?.trim() ? 'für ' + d.anlass.trim() : ''}${amDatum(d.datum)}`.trim();
  const gruss = ['', 'Viele Grüße', `${d.absender?.trim() || '[Name]'} von Blickfeld Nord`, 'https://blickfeld-nord.de'];
  const texte: Record<Vorlage, string[]> = {
    zusage: [
      hallo,
      '',
      `vielen Dank für eure Anfrage${wofuer ? ' ' + wofuer : ''}! Der Termin ist bei uns frei und wir haben richtig Lust, bei euch zu spielen.`,
      '',
      'Damit wir alles gut planen können, bräuchten wir noch ein paar Infos:',
      ...ECKDATEN,
      '',
      'Von euch bräuchten wir:',
      ...TECHNIK,
      'Unsere Anlage und das Licht bringen wir selbst mit.',
      '',
      'Technik-Rider und Bühnenplan: https://blickfeld-nord.de/technik',
      'Fotos, Pressetext und Logos: https://blickfeld-nord.de/presse',
      ...gruss,
    ],
    rueckfrage: [
      hallo,
      '',
      `danke für eure Nachricht${wofuer ? ' ' + wofuer : ''}! Bevor wir zusagen, hätten wir noch ein paar Fragen:`,
      ...ECKDATEN,
      '',
      'Sobald wir das wissen, melden wir uns mit einer verbindlichen Antwort.',
      ...gruss,
    ],
    absage: [
      hallo,
      '',
      `vielen Dank für eure Anfrage${wofuer ? ' ' + wofuer : ''}! Leider sind wir an diesem Termin schon gebucht.`,
      '',
      'Unsere freien Termine seht ihr hier – vielleicht passt ja ein anderer Tag: https://blickfeld-nord.de/booking#verfuegbarkeit',
      'Wir würden uns freuen, wenn es ein anderes Mal klappt!',
      ...gruss,
    ],
  };
  return texte[vorlage].join('\n');
}
