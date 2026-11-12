// Üben der Band (Backstage → Zahlen, pages/uebe-wochen.ts): wie viele Karten jede Person je Kalenderwoche geübt hat
// (Übe-Modus, je Song und Tag einmal) und welche Songs diese Woche bei allen „sitzen“ (Sitzt oder Eingenordet – bei
// mindestens einer Person in den letzten 7 Tagen dort angekommen). Grundlage ist der Übe-Verlauf je Person (data/fortschritt.ts), der mit
// der Band gespiegelt wird. Ohne Angular-Abhängigkeiten, damit es in Node testbar ist.
import { Mitglied, rufname } from './band-ich';
import { Fortschritt, FortschrittEintrag } from './fortschritt';

export interface Rueckblick {
  /** je Person (Reihenfolge der Band): Name bzw. „du“ und Zahl der geübten Karten */
  personen: { slug: string; name: string; karten: number }[];
  /** Songtitel, die jetzt bei allen sitzen und diese Woche dort angekommen sind */
  gefestigt: string[];
}

const SITZT = new Set(['sitzt', 'eingenordet']);

/** JJJJ-MM-TT, n Tage vor dem Tag */
export function tageVorher(tag: string, n: number): string {
  const d = new Date(`${tag}T12:00:00`);
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString('sv-SE');
}

/** Tag, an dem der Song (zuletzt) bei „sitzt“ angekommen ist – null, wenn er gerade nicht sitzt */
function angekommen(verlauf: FortschrittEintrag[]): string | null {
  if (!verlauf.length || !SITZT.has(verlauf[verlauf.length - 1].stand)) return null;
  let i = verlauf.length - 1;
  while (i > 0 && SITZT.has(verlauf[i - 1].stand)) i--;
  return verlauf[i].tag;
}

export function wochenRueckblick(mitglieder: Mitglied[], verlaeufe: Map<string, Fortschritt>, ich: string, heute: string): Rueckblick {
  const seit = tageVorher(heute, 6);
  const personen = mitglieder.map((m) => {
    const f = verlaeufe.get(m.slug) ?? {};
    const karten = Object.values(f).reduce((n, v) => n + v.filter((e) => e.quelle === 'ueben' && e.tag >= seit && e.tag <= heute).length, 0);
    return { slug: m.slug, name: m.slug === ich ? 'du' : rufname(m), karten };
  });
  const keys = new Set(mitglieder.flatMap((m) => Object.keys(verlaeufe.get(m.slug) ?? {})));
  const gefestigt: string[] = [];
  for (const key of keys) {
    const tage = mitglieder.map((m) => angekommen(verlaeufe.get(m.slug)?.[key] ?? []));
    if (tage.some((t) => t === null)) continue;
    if (tage.some((t) => t! >= seit)) gefestigt.push(key.split('|')[0]);
  }
  return { personen, gefestigt: gefestigt.sort((a, b) => a.localeCompare(b, 'de')) };
}

/** eine Zeile: „du 12 Karten · Fred 9 · David 4“ (wer nicht geübt hat, steht hinten mit 0) */
export function rueckblickText(r: Rueckblick): string {
  const sortiert = [...r.personen].sort((a, b) => b.karten - a.karten);
  return sortiert.map((p, i) => (i === 0 ? `${p.name} ${p.karten} ${p.karten === 1 ? 'Karte' : 'Karten'}` : `${p.name} ${p.karten}`)).join(' · ');
}

/** Montag der Kalenderwoche (JJJJ-MM-TT) */
export function wochenAnfang(tag: string): string {
  const d = new Date(`${tag}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toLocaleDateString('sv-SE');
}

/** Kalenderwoche nach ISO 8601 */
export function kalenderwoche(tag: string): number {
  const d = new Date(`${tag}T12:00:00`);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const erste = new Date(d.getFullYear(), 0, 4, 12);
  return 1 + Math.round(((d.getTime() - erste.getTime()) / 86_400_000 - 3 + ((erste.getDay() + 6) % 7)) / 7);
}

export interface Woche {
  /** Montag */
  ab: string;
  /** Sonntag (bzw. heute bei der laufenden Woche) */
  bis: string;
  kw: number;
  /** geübte Karten je Person (slug) */
  karten: Record<string, number>;
}

/** geübte Karten je Person in den letzten n Kalenderwochen (älteste zuerst, die laufende zuletzt) */
export function wochenVerlauf(mitglieder: Mitglied[], verlaeufe: Map<string, Fortschritt>, heute: string, n = 8): Woche[] {
  const jetzt = wochenAnfang(heute);
  const wochen: Woche[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const ab = tageVorher(jetzt, 7 * i);
    const sonntag = tageVorher(ab, -6);
    wochen.push({ ab, bis: sonntag > heute ? heute : sonntag, kw: kalenderwoche(ab), karten: Object.fromEntries(mitglieder.map((m) => [m.slug, 0])) });
  }
  for (const m of mitglieder) {
    for (const verlauf of Object.values(verlaeufe.get(m.slug) ?? {})) {
      for (const e of verlauf) {
        if (e.quelle !== 'ueben' || e.tag > heute) continue;
        const w = wochen.find((x) => e.tag >= x.ab && e.tag <= tageVorher(x.ab, -6));
        if (w) w.karten[m.slug]++;
      }
    }
  }
  return wochen;
}
