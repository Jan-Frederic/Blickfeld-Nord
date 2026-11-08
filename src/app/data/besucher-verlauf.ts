// Besucher-Verlauf (Backstage → Zahlen → Besucher): Zeitlinie der Seitenaufrufe je Tag, Woche, Monat oder Jahr mit den
// Ereignissen darauf (Auftritte, Werbemaßnahmen aus dem Werbeplan). Hier nur die Zeiträume und die Zuordnung der
// Ereignisse – die Zahlen holt die Komponente einzeln je Zeitraum vom öffentlichen GoatCounter-Zähler.
// Ohne Angular-Abhängigkeiten, damit es in Node testbar ist.

export type Einheit = 'tag' | 'woche' | 'monat' | 'jahr';

export const EINHEITEN: readonly { key: Einheit; label: string; anzahl: number }[] = [
  { key: 'tag', label: 'Tag', anzahl: 30 },
  { key: 'woche', label: 'Woche', anzahl: 16 },
  { key: 'monat', label: 'Monat', anzahl: 12 },
  { key: 'jahr', label: 'Jahr', anzahl: 4 },
];

export interface Zeitraum {
  /** erster Tag (JJJJ-MM-TT, einschließlich) */
  start: string;
  /** letzter Tag (einschließlich) */
  ende: string;
  /** Beschriftung an der Achse, z. B. „12.11.“, „KW 46“, „Nov 26“, „2026“ */
  label: string;
}

export interface Ereignis {
  datum: string;
  art: 'auftritt' | 'werbung';
  text: string;
  /** Werbemaßnahme abgehakt? */
  erledigt?: boolean;
}

const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const tag = (s: string) => new Date(`${s}T00:00:00Z`);
const plus = (s: string, n: number) => {
  const d = tag(s);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};

/** Kalenderwoche nach ISO 8601 */
export function kalenderwoche(s: string): number {
  const d = tag(s);
  const wt = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - wt + 3);
  const erster = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d.getTime() - erster.getTime()) / 864e5 - 3 + ((erster.getUTCDay() + 6) % 7)) / 7);
}

/** die letzten n Zeiträume bis einschließlich heute, ältester zuerst; der laufende Zeitraum endet heute */
export function zeitraeume(einheit: Einheit, heute: string, anzahl = EINHEITEN.find((e) => e.key === einheit)!.anzahl): Zeitraum[] {
  const out: Zeitraum[] = [];
  for (let i = anzahl - 1; i >= 0; i--) {
    if (einheit === 'tag') {
      const t = plus(heute, -i);
      out.push({ start: t, ende: t, label: `${t.slice(8, 10)}.${t.slice(5, 7)}.` });
    } else if (einheit === 'woche') {
      const montag = plus(heute, -((tag(heute).getUTCDay() + 6) % 7) - 7 * i);
      const sonntag = plus(montag, 6);
      out.push({ start: montag, ende: sonntag < heute ? sonntag : heute, label: `KW ${kalenderwoche(montag)}` });
    } else if (einheit === 'monat') {
      const h = tag(heute);
      const erster = new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth() - i, 1));
      const letzter = iso(new Date(Date.UTC(erster.getUTCFullYear(), erster.getUTCMonth() + 1, 0)));
      out.push({ start: iso(erster), ende: letzter < heute ? letzter : heute, label: `${MONATE[erster.getUTCMonth()]} ${String(erster.getUTCFullYear()).slice(2)}` });
    } else {
      const j = Number(heute.slice(0, 4)) - i;
      const ende = `${j}-12-31`;
      out.push({ start: `${j}-01-01`, ende: ende < heute ? ende : heute, label: String(j) });
    }
  }
  return out;
}

/** Ereignisse je Zeitraum (Index wie zeitraeume); Ereignisse außerhalb fallen weg, sortiert nach Datum */
export function ereignisseJeZeitraum(raeume: Zeitraum[], ereignisse: Ereignis[]): Ereignis[][] {
  const out = raeume.map(() => [] as Ereignis[]);
  for (const e of [...ereignisse].sort((a, b) => a.datum.localeCompare(b.datum))) {
    const i = raeume.findIndex((r) => e.datum >= r.start && e.datum <= r.ende);
    if (i >= 0) out[i].push(e);
  }
  return out;
}
