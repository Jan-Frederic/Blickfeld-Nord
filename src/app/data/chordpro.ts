// Akkordblätter im ChordPro-Format (Text mit Akkorden in eckigen Klammern, z. B. „[G]Einer von [D]80 Millionen“)
// für den Bühnen-Modus: einlesen und in die Tonart der Band transponieren – mit Capo als Griffbild.
// Unterstützt: {title:} {key:} {comment:}/{c:}, Abschnitte {start_of_chorus}/{soc}, {start_of_verse}/{sov},
// {start_of_bridge}/{sob} sowie Kommentarzeilen mit #. Ohne Angular-Abhängigkeiten, damit es in Node testbar ist.
import { BE, KREUZ, quintPosition } from './tonart-uebergang';

export interface Teil {
  akkord?: string;
  text: string;
}
export type Zeile =
  | { art: 'text'; teile: Teil[] }
  | { art: 'abschnitt'; text: string }
  | { art: 'kommentar'; text: string }
  | { art: 'leer' };

export interface Akkordblatt {
  titel?: string;
  /** Tonart, in der das Blatt geschrieben ist ({key: …}) */
  tonart?: string;
  zeilen: Zeile[];
}

const ABSCHNITTE: Record<string, string> = {
  start_of_chorus: 'Refrain', soc: 'Refrain',
  start_of_verse: 'Strophe', sov: 'Strophe',
  start_of_bridge: 'Bridge', sob: 'Bridge',
};

export function chordproLesen(quelle: string): Akkordblatt {
  const blatt: Akkordblatt = { zeilen: [] };
  for (const roh of quelle.replace(/\r/g, '').split('\n')) {
    const zeile = roh.trimEnd();
    if (zeile.trimStart().startsWith('#')) continue;
    const direktive = /^\s*\{\s*([a-z_]+)\s*(?::\s*(.*?))?\s*\}\s*$/i.exec(zeile);
    if (direktive) {
      const [, name, wert = ''] = direktive;
      const n = name.toLowerCase();
      if (n === 'title' || n === 't') blatt.titel = wert;
      else if (n === 'key') blatt.tonart = wert;
      else if (n === 'comment' || n === 'c' || n === 'comment_italic' || n === 'ci') blatt.zeilen.push({ art: 'kommentar', text: wert });
      else if (ABSCHNITTE[n]) blatt.zeilen.push({ art: 'abschnitt', text: wert || ABSCHNITTE[n] });
      continue;
    }
    if (!zeile.trim()) {
      blatt.zeilen.push({ art: 'leer' });
      continue;
    }
    const teile: Teil[] = [];
    const re = /\[([^\]]*)\]/g;
    let rest = 0;
    let akkord: string | undefined;
    for (let m = re.exec(zeile); m; m = re.exec(zeile)) {
      if (m.index > rest || akkord !== undefined) teile.push({ akkord, text: zeile.slice(rest, m.index) });
      akkord = m[1].trim();
      rest = m.index + m[0].length;
    }
    teile.push({ akkord, text: zeile.slice(rest) });
    blatt.zeilen.push({ art: 'text', teile: teile.filter((t) => t.akkord !== undefined || t.text) });
  }
  return blatt;
}

// Grundton als Halbtonzahl (C = 0); „B“ steht in ChordPro-Quellen meist englisch für H
const TON: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, H: 11, B: 11 };
function halbton(name: string): number | undefined {
  const m = /^([A-H])([#b]?)/.exec(name);
  if (!m) return undefined;
  return (TON[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
}

/** einen Akkord (auch mit Bass, z. B. „D/F#“) um `schritte` Halbtöne verschieben; Unbekanntes bleibt, wie es ist */
export function akkordTransponieren(akkord: string, schritte: number, mitBe: boolean): string {
  const namen = mitBe ? BE : KREUZ;
  const eins = (teil: string) => {
    const m = /^([A-H][#b]?)(.*)$/.exec(teil);
    const t = m ? halbton(m[1]) : undefined;
    return m && t !== undefined ? namen[(((t + schritte) % 12) + 12) % 12] + m[2] : teil;
  };
  return akkord.split('/').map(eins).join('/');
}

/** Halbtöne von Tonart a nach b (−5 … +6) – undefined, wenn eine fehlt */
export function halbtoene(a: string | undefined, b: string | undefined): number | undefined {
  const ha = a ? halbton(a) : undefined;
  const hb = b ? halbton(b) : undefined;
  if (ha === undefined || hb === undefined) return undefined;
  const d = (((hb - ha) % 12) + 12) % 12;
  return d > 6 ? d - 12 : d;
}

/** Tonart nach Verschiebung um `schritte` Halbtöne, z. B. („G“, −2) → „F“, („Em“, 2) → „F#m“ */
export function tonartVerschieben(tonart: string, schritte: number): string {
  const ziel = akkordTransponieren(tonart, schritte, false);
  // b-Tonarten (F, Bb, Eb, Ab, Db bzw. ihre parallelen Moll-Tonarten) mit b schreiben
  const pos = quintPosition(ziel);
  return pos !== undefined && pos >= 7 ? akkordTransponieren(tonart, schritte, true) : ziel;
}

/**
 * Griffbild für die Band: Das Blatt steht in `geschrieben` (sonst in der Originaltonart), die Band spielt in `gespielt`
 * mit Capo im Bund `capo`. Ergebnis: um wie viele Halbtöne die Akkorde zu verschieben sind und in welcher Tonart die
 * Griffe dann stehen (z. B. gespielt E mit Capo 2 → Griffe in D).
 */
export function griffbild(geschrieben: string | undefined, gespielt: string | undefined, capo = 0): { schritte: number; griffTonart?: string } {
  if (!geschrieben || !gespielt) return { schritte: 0 };
  const schritte = halbtoene(geschrieben, gespielt);
  if (schritte === undefined) return { schritte: 0 };
  const gesamt = (((schritte - capo + 6) % 12) + 12) % 12 - 6;
  return { schritte: gesamt, griffTonart: tonartVerschieben(geschrieben, gesamt) };
}

/** alle Akkorde eines Blatts verschieben; b- oder Kreuz-Schreibweise nach der Zieltonart */
export function blattTransponieren(blatt: Akkordblatt, schritte: number): Akkordblatt {
  if (!schritte) return blatt;
  const ziel = blatt.tonart ? tonartVerschieben(blatt.tonart, schritte) : undefined;
  const pos = quintPosition(ziel);
  const mitBe = pos !== undefined && pos >= 7;
  return {
    ...blatt,
    tonart: ziel,
    zeilen: blatt.zeilen.map((z) =>
      z.art === 'text' ? { art: 'text', teile: z.teile.map((t) => (t.akkord ? { ...t, akkord: akkordTransponieren(t.akkord, schritte, mitBe) } : t)) } : z,
    ),
  };
}
