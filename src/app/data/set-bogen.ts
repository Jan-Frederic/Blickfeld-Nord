// Spannungsbogen je Set (Setlist im Backstage): Ein Set beginnt mit Schwung, wird nach etwa zwei Dritteln ruhiger
// und endet mit dem schnellsten Song. Die Reihenfolge wird je Set neu gelegt – entlang einer Tempo-Kurve, wobei
// Tonartsprünge (Quintenzirkel) möglichst vermieden werden. Songs ohne Tempo gelten als mittel.
// Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.
import { type Entry, type Song, isPause } from './setlist-data';
import { SPRUNG_AB, quintAbstand } from './tonart-uebergang';

/** Soll-Tempo (0 = langsamster, 1 = schnellster Song des Sets) an Position x (0–1): hoch – Tal bei ~65 % – Höhepunkt */
export function kurve(x: number): number {
  if (x <= 0.65) return 0.85 - (0.75 * x) / 0.65; // 0.85 → 0.1
  return 0.1 + (0.9 * (x - 0.65)) / 0.35; // 0.1 → 1
}

function setOrdnen(set: Song[], bpm: (s: Song) => number | undefined, tonart: (s: Song) => string | undefined): Song[] {
  if (set.length < 3) return set;
  const werte = set.map((s) => bpm(s)).filter((b): b is number => b !== undefined);
  if (werte.length < 2) return set;
  const min = Math.min(...werte);
  const max = Math.max(...werte);
  const mitte = werte.sort((a, b) => a - b)[Math.floor(werte.length / 2)];
  const norm = (s: Song) => (max === min ? 0.5 : ((bpm(s) ?? mitte) - min) / (max - min));
  const rest = [...set];
  // Schluss: der schnellste Song
  const letzter = rest.reduce((a, b) => (norm(b) > norm(a) ? b : a));
  rest.splice(rest.indexOf(letzter), 1);
  const folge: Song[] = [];
  const n = set.length;
  for (let pos = 0; pos < n - 1; pos++) {
    const soll = kurve(pos / (n - 1));
    const vorher = folge.at(-1);
    const naechster = pos === n - 2 ? letzter : undefined;
    const kosten = (s: Song) => {
      let k = Math.abs(norm(s) - soll);
      const sprung = (a?: Song, b?: Song) => a && b && (quintAbstand(tonart(a), tonart(b)) ?? 0) >= SPRUNG_AB;
      if (sprung(vorher, s)) k += 0.35;
      if (sprung(s, naechster)) k += 0.35;
      return k;
    };
    const s = rest.reduce((a, b) => (kosten(b) < kosten(a) ? b : a));
    rest.splice(rest.indexOf(s), 1);
    folge.push(s);
  }
  return [...folge, letzter];
}

/** Jedes Set nach Spannungsbogen ordnen; Pausen und Set-Grenzen bleiben, Songs wandern nicht zwischen Sets */
export function spannungsbogen(entries: Entry[], bpm: (s: Song) => number | undefined, tonart: (s: Song) => string | undefined): Entry[] {
  const out: Entry[] = [];
  let set: Song[] = [];
  const raus = () => {
    out.push(...setOrdnen(set, bpm, tonart));
    set = [];
  };
  for (const e of entries) {
    if (isPause(e)) {
      raus();
      out.push(e);
    } else set.push(e);
  }
  raus();
  return out;
}

/** Wie gut folgt ein Set dem Bogen? 0 = perfekt; Mittelwert der Abweichungen über alle Sets (für „vorher → nachher“) */
export function bogenAbweichung(entries: Entry[], bpm: (s: Song) => number | undefined): number {
  const sets: Song[][] = [[]];
  for (const e of entries) isPause(e) ? sets.push([]) : sets.at(-1)!.push(e);
  const abw: number[] = [];
  for (const set of sets) {
    const werte = set.map(bpm).filter((b): b is number => b !== undefined);
    if (set.length < 3 || werte.length < 2) continue;
    const min = Math.min(...werte);
    const max = Math.max(...werte);
    if (max === min) continue;
    set.forEach((s, i) => {
      const b = bpm(s);
      if (b !== undefined) abw.push(Math.abs((b - min) / (max - min) - kurve(i / (set.length - 1))));
    });
  }
  return abw.length ? abw.reduce((a, b) => a + b, 0) / abw.length : 0;
}
