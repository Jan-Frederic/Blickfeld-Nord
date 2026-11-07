// Taktart eines Songs (songinfo.ts, Backstage → Songs): bestimmt, wie der Bühnen-Modus einzählt und wo der Klick die
// Eins betont. Ohne Angabe gilt 4/4. Das Tempo (bpm) zählt den Grundschlag: bei x/4 die Viertel, bei den
// zusammengesetzten Takten 6/8, 9/8 und 12/8 die punktierte Viertel (so, wie man sie mitklatscht).
// Ohne Angular-Abhängigkeiten, damit es in Node testbar ist.

export const TAKTARTEN = ['4/4', '3/4', '2/4', '6/8', '12/8', '5/4'] as const;
export const STANDARD_TAKT = '4/4';

/** Grundschläge je Takt: 4/4 → 4, 3/4 → 3, 6/8 → 2, 12/8 → 4, 7/8 → 7 */
export function schlaegeJeTakt(takt?: string): number {
  const m = /^(\d+)\/(\d+)$/.exec(takt?.trim() ?? '');
  if (!m) return 4;
  const zaehler = Number(m[1]);
  const nenner = Number(m[2]);
  if (!zaehler || zaehler > 16) return 4;
  return nenner === 8 && zaehler % 3 === 0 && zaehler > 3 ? zaehler / 3 : zaehler;
}

/**
 * Einzählen: ein Takt, bei kurzen Takten (bis 3 Schläge) zwei – „1-2-3 · 1-2-3“ beim Walzer, „1-2 · 1-2“ bei 2/4 und
 * 6/8. Ergebnis: die Zahlen in Reihenfolge.
 */
export function einzaehlFolge(takt?: string): number[] {
  const n = schlaegeJeTakt(takt);
  const takte = n <= 3 ? 2 : 1;
  return Array.from({ length: n * takte }, (_, i) => (i % n) + 1);
}

/** Beschriftung des Einzähl-Knopfs, z. B. „1-2-3-4“ oder „1-2-3 · 1-2-3“ */
export function einzaehlText(takt?: string): string {
  const n = schlaegeJeTakt(takt);
  const takt1 = Array.from({ length: n }, (_, i) => i + 1).join('-');
  return n <= 3 ? `${takt1} · ${takt1}` : takt1;
}

/** Taktart nur anzeigen, wenn sie vom Standard abweicht */
export const taktHinweis = (takt?: string) => (takt && takt !== STANDARD_TAKT ? takt : '');
