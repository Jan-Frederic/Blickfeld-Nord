import { datumText } from './datum';
import { Show } from './band.service';
import { Lang, localize } from '../i18n';
import { kampagnenLink } from './goatcounter';

const TEXT: Record<Lang, { weekdays: string[]; from: (t: string) => string; free: string; entry: string; date: (d: string) => string; presse: string }> = {
  de: {
    weekdays: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    from: (t) => ` ab ${t} Uhr`,
    free: 'Eintritt frei',
    entry: 'Eintritt',
    date: (d) => datumText(d),
    presse: 'Pressekit Blickfeld Nord – Plakat, Story, fertige Texte und Songliste',
  },
  en: {
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    from: (t) => ` from ${t}`,
    free: 'Free entry',
    entry: 'Entry',
    date: (d) => datumText(d, '/'),
    presse: 'Blickfeld Nord press kit – poster, story, ready-made texts and song list',
  },
  nl: {
    weekdays: ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'],
    from: (t) => ` vanaf ${t} uur`,
    free: 'Gratis entree',
    entry: 'Entree',
    date: (d) => datumText(d, '-'),
    presse: 'Perskit Blickfeld Nord – affiche, story, kant-en-klare teksten en nummerlijst',
  },
};

/** Teilen-Menü des Geräts, sonst WhatsApp */
function teilen(title: string, text: string, url: string): void {
  if (navigator.share) {
    navigator.share({ title, text, url }).catch(() => undefined);
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener');
  }
}

/** „Fr, 04.12.2026 ab 18:00 Uhr – Weihnachtsmarkt, Rhede · Eintritt frei“ in der Sprache der Seite */
function eckdaten(s: Show, venue: string, lang: Lang): string {
  const t = TEXT[lang];
  const day = (d: string) => `${t.weekdays[new Date(`${d}T12:00:00`).getDay()]}, ${t.date(d)}`;
  const when = `${day(s.date)}${s.endDate ? ` – ${day(s.endDate)}` : ''}${s.time ? t.from(s.time) : ''}`;
  const where = [venue, s.city].filter(Boolean).join(', ');
  const entry = s.price === 0 ? ` · ${t.free}` : s.price ? ` · ${t.entry} ${s.price} €` : '';
  return `${when} – ${where}${entry}`;
}

// Konzert teilen: Teilen-Menü des Geräts, sonst WhatsApp – mit Datum, Ort, Eintritt und Link zur Konzertseite
// (Text und Link in der Sprache der Seite)
export function shareShow(s: Show, id: string, venue: string, lang: Lang = 'de'): void {
  // mit Herkunft „geteilt“ und Kampagne des Auftritts (Backstage zeigt, wie viele darüber kommen)
  teilen('Blickfeld Nord live', `Blickfeld Nord live: ${eckdaten(s, venue, lang)}`, kampagnenLink(id, 'geteilt', localize(`/konzerte/${id}/`, lang)));
}

// Pressekit eines Auftritts teilen (z. B. an Veranstalter, Lokalzeitung, Gastro) – Link zur Pressekit-Seite
export function sharePresse(s: Show, id: string, venue: string, lang: Lang = 'de'): void {
  teilen('Blickfeld Nord – Pressekit', `${TEXT[lang].presse}: ${eckdaten(s, venue, lang)}`, kampagnenLink(id, 'presse-geteilt', localize(`/presse/${id}/`, lang)));
}
