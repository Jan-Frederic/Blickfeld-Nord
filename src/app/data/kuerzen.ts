// „Set zu lang“ im Bühnen-Modus: Läuft das Set über die geplante Länge hinaus, schlägt der Bühnen-Modus Songs zum
// Streichen vor – aus dem Rest des Sets die mit den wenigsten Sternen (ohne Publikumswünsche), bis die Zeit passt.
// Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.
export interface RestSong {
  index: number;
  title: string;
  dauer: number;
  /** Sterne-Schnitt, ohne Bewertung 3 */
  sterne: number;
  wunsch?: boolean;
}

/** Sekunden über der geplanten Setlänge, wenn der Rest wie geplant gespielt wird */
export const ueberzug = (laeuft: number, rest: number, geplant: number) => laeuft + rest - geplant;

/** Songs zum Streichen (Index in der Setlist), bis mindestens `ueber` Sekunden frei sind; leer, wenn es nicht reicht */
export function streichVorschlag(rest: RestSong[], ueber: number): RestSong[] {
  if (ueber <= 60) return [];
  const kandidaten = rest.filter((s) => !s.wunsch && s.dauer > 0).sort((a, b) => a.sterne - b.sterne || b.dauer - a.dauer);
  const out: RestSong[] = [];
  let frei = 0;
  for (const s of kandidaten) {
    if (frei >= ueber) break;
    out.push(s);
    frei += s.dauer;
  }
  return frei >= ueber - 30 ? out.sort((a, b) => a.index - b.index) : [];
}
