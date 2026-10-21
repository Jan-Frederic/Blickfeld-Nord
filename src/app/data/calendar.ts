import { Rehearsal, Show } from './band.service';
import type { Lang } from '../i18n';

// Texte in den Kalendereinträgen – je nach Sprache der Seite, von der der Kalender kommt (Backstage: Deutsch)
const TEXT: Record<Lang, { private: string; open: string; route: string; tomorrow: string; site: string }> = {
  de: { private: 'Privater Termin', open: 'Status: offen', route: 'Anfahrt: ', tomorrow: 'Morgen: Blickfeld Nord live – ', site: 'https://blickfeld-nord.de/' },
  en: { private: 'Private event', open: 'Status: open', route: 'Directions: ', tomorrow: 'Tomorrow: Blickfeld Nord live – ', site: 'https://blickfeld-nord.de/en' },
  nl: { private: 'Privé-optreden', open: 'Status: open', route: 'Route: ', tomorrow: 'Morgen: Blickfeld Nord live – ', site: 'https://blickfeld-nord.de/nl' },
};

// Erzeugt Kalenderdateien (iCalendar/.ics) direkt im Browser – ohne externen Dienst.
// Mit Uhrzeit: Termin in Ortszeit (Europe/Berlin) mit angenommener Dauer; ohne Uhrzeit: ganztägig.

// Auftritte haben kein festes Ende – im Kalender wird diese Dauer angenommen
const DEFAULT_DURATION_HOURS = 3;

// Zeitzonen-Definition für Europe/Berlin (MEZ/MESZ), damit auch Outlook die Uhrzeit korrekt liest
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Berlin',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

const compact = (date: string) => date.replaceAll('-', '');

// Lokale Zeitangabe (ohne Zeitzonenumrechnung) um Stunden verschieben → 'YYYYMMDDTHHMMSS'
function localDateTime(date: string, time: string, plusHours = 0): string {
  const d = new Date(`${date}T${time}:00Z`);
  d.setUTCHours(d.getUTCHours() + plusHours);
  return d.toISOString().slice(0, 19).replace(/[-:]/g, '');
}

function nextDay(date: string): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Sonderzeichen laut RFC 5545 maskieren
const esc = (text: string) =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// Zeilen nach 75 Bytes (UTF-8) umbrechen; Folgezeilen beginnen mit Leerzeichen.
// Iteriert über ganze Zeichen, damit Umlaute und Emojis nie zerschnitten werden.
const encoder = new TextEncoder();
function fold(line: string): string {
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // Folgezeilen: 1 Byte für das führende Leerzeichen
    if (bytes + size > limit) {
      out.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.map((part, i) => (i === 0 ? part : ' ' + part)).join('\r\n');
}

function slug(text: string): string {
  return text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function event(s: Show, stamp: string, withNotes: boolean, reminder: boolean, lang: Lang): string[] {
  const t = TEXT[lang];
  const location = [s.venue, s.city].filter(Boolean).join(', ');
  const description = [
    s.private ? t.private : 'Blickfeld Nord live – ' + t.site.replace(/\/$/, ''),
    withNotes && !s.confirmed ? t.open : '',
    withNotes && s.comment ? s.comment : '',
    s.mapsUrl ? t.route + s.mapsUrl : '',
  ].filter(Boolean);
  return [
    'BEGIN:VEVENT',
    `UID:${s.date}-${slug(s.venue)}@blickfeld-nord.de`,
    `DTSTAMP:${stamp}`,
    ...(s.time
      ? [
          `DTSTART;TZID=Europe/Berlin:${localDateTime(s.date, s.time)}`,
          `DTEND;TZID=Europe/Berlin:${localDateTime(s.endDate ?? s.date, s.time, DEFAULT_DURATION_HOURS)}`,
        ]
      : [`DTSTART;VALUE=DATE:${compact(s.date)}`, `DTEND;VALUE=DATE:${compact(nextDay(s.endDate ?? s.date))}`]),
    `SUMMARY:${esc('Blickfeld Nord: ' + s.venue)}`,
    `LOCATION:${esc(location)}`,
    `DESCRIPTION:${esc(description.join('\n'))}`,
    `URL:${t.site}`,
    `STATUS:${s.confirmed ? 'CONFIRMED' : 'TENTATIVE'}`,
    'TRANSP:TRANSPARENT',
    // „Erinnere mich“: Hinweis am Vortag – 24 h vor Beginn, bei ganztägigen Terminen am Vortag um 12 Uhr
    ...(reminder
      ? ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(t.tomorrow + location)}`, `TRIGGER:${s.time ? '-P1D' : '-PT12H'}`, 'END:VALARM']
      : []),
    'END:VEVENT',
  ];
}

function rehearsalEvent(r: Rehearsal, stamp: string): string[] {
  return [
    'BEGIN:VEVENT',
    `UID:probe-${r.date}${r.time ? '-' + r.time.replace(':', '') : ''}@blickfeld-nord.de`,
    `DTSTAMP:${stamp}`,
    ...(r.time
      ? [
          `DTSTART;TZID=Europe/Berlin:${localDateTime(r.date, r.time)}`,
          `DTEND;TZID=Europe/Berlin:${r.endTime ? localDateTime(r.date, r.endTime) : localDateTime(r.date, r.time, DEFAULT_DURATION_HOURS)}`,
        ]
      : [`DTSTART;VALUE=DATE:${compact(r.date)}`, `DTEND;VALUE=DATE:${compact(nextDay(r.date))}`]),
    `SUMMARY:${esc('Probe Blickfeld Nord')}`,
    ...(r.place ? [`LOCATION:${esc(r.place)}`] : []),
    ...(r.note ? [`DESCRIPTION:${esc(r.note)}`] : []),
    'STATUS:CONFIRMED',
    'END:VEVENT',
  ];
}

export interface IcsExtras {
  /** Probetermine (nur Backstage-Kalender) */
  rehearsals?: Rehearsal[];
  /** zusätzliche Kalender-Kopfzeilen, z. B. für Abos: 'REFRESH-INTERVAL;VALUE=DURATION:PT12H' */
  header?: string[];
  /** Sprache der Einträge (Standard: Deutsch) */
  lang?: Lang;
}

export function buildIcs(shows: Show[], calendarName: string, withNotes = false, reminder = false, extras: IcsExtras = {}): string {
  const rehearsals = extras.rehearsals ?? [];
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Blickfeld Nord//Bandpage//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(calendarName)}`,
    'X-WR-TIMEZONE:Europe/Berlin',
    ...(extras.header ?? []),
    ...(shows.some((s) => s.time) || rehearsals.some((r) => r.time) ? VTIMEZONE : []),
    ...shows.flatMap((s) => event(s, stamp, withNotes, reminder, extras.lang ?? 'de')),
    ...rehearsals.flatMap((r) => rehearsalEvent(r, stamp)),
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadIcs(shows: Show[], fileName: string, calendarName: string, withNotes = false, reminder = false, extras: IcsExtras = {}): void {
  const blob = new Blob([buildIcs(shows, calendarName, withNotes, reminder, extras)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function icsFileName(s: Show): string {
  return `blickfeld-nord-${s.date}-${slug(s.venue)}.ics`;
}
