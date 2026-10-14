import { Show } from './band.service';

// Erzeugt Kalenderdateien (iCalendar/.ics) direkt im Browser – ohne externen Dienst.
// Auftritte haben keine Uhrzeit, daher als ganztägige Termine.

const compact = (date: string) => date.replaceAll('-', '');

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

function event(s: Show, stamp: string, withNotes: boolean): string[] {
  const location = [s.venue, s.city].filter(Boolean).join(', ');
  const description = [
    s.private ? 'Privater Termin' : 'Blickfeld Nord live – https://blickfeld-nord.de',
    withNotes && !s.confirmed ? 'Status: offen' : '',
    withNotes && s.comment ? s.comment : '',
    s.mapsUrl ? 'Anfahrt: ' + s.mapsUrl : '',
  ].filter(Boolean);
  return [
    'BEGIN:VEVENT',
    `UID:${s.date}-${slug(s.venue)}@blickfeld-nord.de`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compact(s.date)}`,
    `DTEND;VALUE=DATE:${compact(nextDay(s.endDate ?? s.date))}`,
    `SUMMARY:${esc('Blickfeld Nord: ' + s.venue)}`,
    `LOCATION:${esc(location)}`,
    `DESCRIPTION:${esc(description.join('\n'))}`,
    'URL:https://blickfeld-nord.de/',
    `STATUS:${s.confirmed ? 'CONFIRMED' : 'TENTATIVE'}`,
    'TRANSP:TRANSPARENT',
    'END:VEVENT',
  ];
}

export function buildIcs(shows: Show[], calendarName: string, withNotes = false): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Blickfeld Nord//Bandpage//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(calendarName)}`,
    'X-WR-TIMEZONE:Europe/Berlin',
    ...shows.flatMap((s) => event(s, stamp, withNotes)),
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadIcs(shows: Show[], fileName: string, calendarName: string, withNotes = false): void {
  const blob = new Blob([buildIcs(shows, calendarName, withNotes)], { type: 'text/calendar;charset=utf-8' });
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
