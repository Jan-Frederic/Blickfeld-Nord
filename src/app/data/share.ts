import { Show } from './band.service';

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

// Konzert teilen: Teilen-Menü des Geräts, sonst WhatsApp – mit Datum, Ort, Eintritt und Link zur Konzertseite
export function shareShow(s: Show, id: string, venue: string): void {
  const day = (d: string) => `${WEEKDAYS[new Date(`${d}T12:00:00`).getDay()]}, ${d.split('-').reverse().join('.')}`;
  const when = `${day(s.date)}${s.endDate ? ` – ${day(s.endDate)}` : ''}${s.time ? ` ab ${s.time} Uhr` : ''}`;
  const where = [venue, s.city].filter(Boolean).join(', ');
  const entry = s.price === 0 ? ' · Eintritt frei' : s.price ? ` · Eintritt ${s.price} €` : '';
  const text = `Blickfeld Nord live: ${when} – ${where}${entry}`;
  const url = `https://blickfeld-nord.de/konzerte/${id}`;
  if (navigator.share) {
    navigator.share({ title: 'Blickfeld Nord live', text, url }).catch(() => undefined);
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener');
  }
}
