// Wochenrückblick der Band (Backstage → Übersicht): wer in den letzten 7 Tagen wie viele Karten geübt hat (Übe-Modus,
// je Song und Tag einmal) und welche Songs diese Woche bei allen „sitzen“ (Sitzt oder Eingenordet – bei mindestens
// einer Person in dieser Woche dort angekommen). Grundlage ist der Übe-Verlauf je Person (data/fortschritt.ts), der mit
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
