import type { Show } from './band.service';
import { ortBasis } from './abwechslung';

// Ansprechpartner je Veranstalter/Ort (Backstage): Name, WhatsApp/Telefon, E-Mail. Nur auf den Geräten der Band und
// im OneDrive-Abgleich (bn-kontakte) – nie im Repository (Datenschutz). Gleicher Ort auch bei Varianten wie
// „Café Lotti – Tanz in den Mai“. Pressekit-Link und „Wieder anfragen“ schicken die Nachricht direkt dorthin.
export const KONTAKTE_KEY = 'bn-kontakte';

export interface Kontakt {
  name?: string;
  /** Telefonnummer für WhatsApp, z. B. „0171 1234567“ oder „+49 171 …“ */
  telefon?: string;
  mail?: string;
}

export const ortKey = (s: Pick<Show, 'venue' | 'city'>) => `${s.city ?? ''}|${ortBasis(s.venue)}`;

export function ladeKontakte(): Record<string, Kontakt> {
  try {
    return JSON.parse(localStorage.getItem(KONTAKTE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function kontaktVon(s: Pick<Show, 'venue' | 'city'>): Kontakt | undefined {
  return ladeKontakte()[ortKey(s)];
}

export function kontaktSetzen(s: Pick<Show, 'venue' | 'city'>, k: Kontakt): void {
  const alle = ladeKontakte();
  const sauber: Kontakt = Object.fromEntries(
    Object.entries(k)
      .map(([a, b]) => [a, String(b ?? '').trim()])
      .filter(([, b]) => b),
  );
  if (Object.keys(sauber).length) alle[ortKey(s)] = sauber;
  else delete alle[ortKey(s)];
  try {
    if (Object.keys(alle).length) localStorage.setItem(KONTAKTE_KEY, JSON.stringify(alle));
    else localStorage.removeItem(KONTAKTE_KEY);
  } catch {
    // ohne Speicher wird nichts gemerkt
  }
}

/** Telefonnummer für wa.me: nur Ziffern, deutsche Nummern mit 0 vorne → 49 */
export function waNummer(telefon: string): string {
  const d = telefon.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d.slice(1);
  if (d.startsWith('00')) return d.slice(2);
  if (d.startsWith('0')) return '49' + d.slice(1);
  return d;
}

/** Adresse, über die die Nachricht rausgeht: WhatsApp, sonst E-Mail, sonst keine (dann Teilen/Zwischenablage) */
export function nachrichtLink(k: Kontakt | undefined, betreff: string, text: string): string | null {
  if (k?.telefon) return `https://wa.me/${waNummer(k.telefon)}?text=${encodeURIComponent(text)}`;
  if (k?.mail) return `mailto:${k.mail}?subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(text)}`;
  return null;
}

/** Nachricht schicken: an den hinterlegten Kontakt, sonst Teilen-Menü, sonst Zwischenablage */
export async function nachrichtSenden(k: Kontakt | undefined, betreff: string, text: string): Promise<'whatsapp' | 'mail' | 'geteilt' | 'kopiert' | 'abgebrochen'> {
  const link = nachrichtLink(k, betreff, text);
  if (link) {
    window.open(link, '_blank', 'noopener');
    return link.startsWith('mailto:') ? 'mail' : 'whatsapp';
  }
  if (navigator.share) {
    try {
      await navigator.share({ title: betreff, text });
      return 'geteilt';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'abgebrochen';
    }
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    window.prompt('Text kopieren:', text);
  }
  return 'kopiert';
}

/** Anfrage an einen Veranstalter von vor einem Jahr – mit den freien Monaten der Saisonplanung */
export function anfrageText(s: Pick<Show, 'venue' | 'date'>, kontakt: Kontakt | undefined, freieMonate: string[]): string {
  const datum = s.date.split('-').reverse().join('.');
  const frei = freieMonate.length > 1 ? `${freieMonate.slice(0, -1).join(', ')} und ${freieMonate.at(-1)}` : freieMonate[0];
  return [
    `Hallo${kontakt?.name ? ' ' + kontakt.name : ''},`,
    '',
    `am ${datum} durften wir bei ${s.venue} spielen – das hat uns richtig Spaß gemacht! Hättet ihr Lust, das zu wiederholen?`,
    ...(frei ? ['', `Noch frei sind wir zum Beispiel ${frei}.`] : []),
    '',
    'Alles über uns: https://blickfeld-nord.de/booking/',
    '',
    'Viele Grüße',
    'Blickfeld Nord',
  ].join('\n');
}
