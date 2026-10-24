import { Show } from './band.service';
import { Lang, localize } from '../i18n';
import { kampagnenLink } from './goatcounter';

const TEXT: Record<Lang, { weekdays: string[]; from: (t: string) => string; free: string; entry: string; date: (d: string) => string }> = {
  de: {
    weekdays: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    from: (t) => ` ab ${t} Uhr`,
    free: 'Eintritt frei',
    entry: 'Eintritt',
    date: (d) => d.split('-').reverse().join('.'),
  },
  en: {
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    from: (t) => ` from ${t}`,
    free: 'Free entry',
    entry: 'Entry',
    date: (d) => d.split('-').reverse().join('/'),
  },
  nl: {
    weekdays: ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'],
    from: (t) => ` vanaf ${t} uur`,
    free: 'Gratis entree',
    entry: 'Entree',
    date: (d) => d.split('-').reverse().join('-'),
  },
};

// Konzert teilen: Teilen-Menü des Geräts, sonst WhatsApp – mit Datum, Ort, Eintritt und Link zur Konzertseite
// (Text und Link in der Sprache der Seite)
export function shareShow(s: Show, id: string, venue: string, lang: Lang = 'de'): void {
  const t = TEXT[lang];
  const day = (d: string) => `${t.weekdays[new Date(`${d}T12:00:00`).getDay()]}, ${t.date(d)}`;
  const when = `${day(s.date)}${s.endDate ? ` – ${day(s.endDate)}` : ''}${s.time ? t.from(s.time) : ''}`;
  const where = [venue, s.city].filter(Boolean).join(', ');
  const entry = s.price === 0 ? ` · ${t.free}` : s.price ? ` · ${t.entry} ${s.price} €` : '';
  const text = `Blickfeld Nord live: ${when} – ${where}${entry}`;
  // mit Herkunft „geteilt“ und Kampagne des Auftritts (Backstage zeigt, wie viele darüber kommen)
  const url = kampagnenLink(id, 'geteilt', localize(`/konzerte/${id}/`, lang));
  if (navigator.share) {
    navigator.share({ title: 'Blickfeld Nord live', text, url }).catch(() => undefined);
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener');
  }
}
