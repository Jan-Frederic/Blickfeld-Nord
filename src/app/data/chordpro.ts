// Akkordblätter im ChordPro-Format (Text mit Akkorden in eckigen Klammern, z. B. „[G]Einer von [D]80 Millionen“)
// für den Bühnen-Modus: einlesen und in die Tonart der Band transponieren – mit Capo als Griffbild.
// Unterstützt: {title:}/{t:} {artist:}/{subtitle:}/{st:} {key:} {capo:} {comment:}/{c:}, Abschnitte
// {start_of_chorus}/{soc}, {start_of_verse}/{sov}, {start_of_bridge}/{sob} sowie Kommentarzeilen mit #.
// .pro-Dateien (auch .cho, .chopro, .chordpro, .crd) lassen sich direkt einlesen – siehe dateiText() und songZuordnen().
// Ohne Angular-Abhängigkeiten, damit es in Node testbar ist.
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
  /** Interpret ({artist: …}, ersatzweise {subtitle: …}) */
  interpret?: string;
  /** Tonart, in der das Blatt geschrieben ist ({key: …}) */
  tonart?: string;
  /** Capo laut Datei ({capo: …}) – die Akkorde sind dann Griffe, es klingt um so viele Halbtöne höher */
  capo?: number;
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
      else if (n === 'artist' || n === 'a') blatt.interpret = wert;
      else if ((n === 'subtitle' || n === 'st' || n === 'su') && !blatt.interpret) blatt.interpret = wert;
      else if (n === 'key' || n === 'k') blatt.tonart = wert;
      else if (n === 'capo') blatt.capo = Number(wert) > 0 && Number(wert) < 12 ? Math.round(Number(wert)) : undefined;
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

// ---- .pro-Dateien einlesen ---------------------------------------------------------------------------------

/** Dateiendungen von ChordPro-Dateien */
export const CHORDPRO_ENDUNGEN = '.pro,.cho,.chopro,.chordpro,.crd,.txt';

/** Dateiinhalt als Text – UTF-8, ältere Dateien aus Windows-Programmen (Umlaute) als Windows-1252 */
export function dateiText(daten: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(daten).replace(/^\uFEFF/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(daten);
  }
}

// für den Vergleich: klein, ohne Akzente, ohne Zusätze wie „ - Remastered 2009“ oder „(Live)“, nur Buchstaben/Ziffern
const vergleich = (s: string) =>
  s
    .toLocaleLowerCase('de')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const kern = (titel: string) => vergleich(titel.split(' - ')[0].replace(/\([^)]*\)/g, ''));

/**
 * Zu welchem Song im Repertoire gehört eine ChordPro-Datei? Erst über {title:} (und {artist:}, wenn mehrere Songs
 * gleich heißen), sonst über den Dateinamen – auch in der Form „Interpret - Titel.pro“ oder „Titel - Interpret.pro“.
 */
export function songZuordnen<T extends { title: string; artist: string }>(dateiname: string, blatt: Akkordblatt, songs: T[]): T | undefined {
  const passend = (titel: string, interpret?: string) => {
    const k = kern(titel);
    if (!k) return undefined;
    const treffer = songs.filter((s) => kern(s.title) === k || vergleich(s.title) === vergleich(titel));
    if (treffer.length <= 1 || !interpret) return treffer[0];
    return treffer.find((s) => vergleich(s.artist).includes(vergleich(interpret)) || vergleich(interpret).includes(vergleich(s.artist))) ?? treffer[0];
  };
  if (blatt.titel) {
    const s = passend(blatt.titel, blatt.interpret);
    if (s) return s;
  }
  const ausName = dateinameZuordnen(dateiname, songs);
  if (ausName) return ausName.song;
  const name = dateiname.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
  const teile = name.split(/\s+-\s+/);
  return passend(name) ?? (teile.length === 2 ? (passend(teile[1], teile[0]) ?? passend(teile[0], teile[1])) : undefined);
}

// Dateiname in Wörter zerlegen (Trenner: Leerzeichen, _ - / Klammern …), jedes Wort klein und ohne Sonderzeichen
const WORTTRENNER = /[\s_\-–—/()[\]{},.+]+/;
const woerter = (s: string) => s.split(WORTTRENNER).filter(Boolean);
const wort = (w: string) => vergleich(w).replace(/ /g, '');

/**
 * Song aus einem Dateinamen, in dem Titel und Interpret stecken – in beliebiger Reihenfolge und mit Zusätzen wie
 * „Iris - Goo Goo Dolls - Bass v2.pdf“ oder „GooGooDolls_Iris_(Gitarre).pdf“. Was übrig bleibt, ist die Fassung
 * („Bass v2“, „Gitarre“). Bei mehreren passenden Titeln gewinnt der mit Interpret, dann der längste.
 */
export function dateinameZuordnen<T extends { title: string; artist: string }>(dateiname: string, songs: T[]): { song: T; fassung: string } | undefined {
  const basis = dateiname.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');
  const roh = woerter(basis);
  const w = roh.map(wort);
  // Wortfolge im Dateinamen finden – auch zusammengeschrieben („GooGooDolls“); gibt die Positionen zurück
  const finden = (folge: string[], belegt: Set<number>): number[] | undefined => {
    if (!folge.length) return undefined;
    for (let i = 0; i < w.length; i++) {
      if (belegt.has(i)) continue;
      if (folge.every((f, j) => w[i + j] === f && !belegt.has(i + j))) return folge.map((_, j) => i + j);
      if (folge.length > 1 && w[i] === folge.join('')) return [i];
    }
    return undefined;
  };
  let best: { song: T; punkte: number; weg: Set<number> } | undefined;
  let gleichauf = false;
  for (const song of songs) {
    const titel = woerter(song.title.split(' - ')[0].replace(/\([^)]*\)/g, '')).map(wort).filter(Boolean);
    const t = finden(titel, new Set());
    if (!t) continue;
    const weg = new Set(t);
    const artist = woerter(song.artist).map(wort).filter(Boolean);
    // Interpret auch ohne Artikel („Goo Goo Dolls“ für „The Goo Goo Dolls“)
    const a = finden(artist, weg) ?? (['the', 'die', 'der', 'das'].includes(artist[0]) ? finden(artist.slice(1), weg) : undefined);
    a?.forEach((i) => weg.add(i));
    const punkte = (a ? 1000 : 0) + titel.length;
    if (best && punkte === best.punkte) gleichauf = true;
    if (!best || punkte > best.punkte) {
      best = { song, punkte, weg };
      gleichauf = false;
    }
  }
  if (!best || gleichauf) return undefined;
  const fassung = roh.filter((_, i) => !best!.weg.has(i)).join(' ');
  return { song: best.song, fassung };
}
