import data from './repertoire.json';
import { Akkordblatt, besteTreffer, chordproLesen, dateiText, songZuordnen, songsImText } from './chordpro';
import { pdfKopf } from './pdf';

// Welcher Song ist das? Für Noten-Dateien beim Einlesen (Abgleich): Titel und Interpret aus – in dieser Reihenfolge –
// dem Dateinamen, dem Ordnerpfad, bei .pro den Angaben {title}/{artist} in der Datei, bei PDFs den Eigenschaften und
// dem Kopf der ersten Seite; zuletzt mit Toleranz für Tippfehler. Bei Gleichstand (z. B. „Hallelujah“ von zwei
// Interpreten ohne Namen in der Datei) gibt es Kandidaten zur Auswahl. Der Rest des Dateinamens ist die Fassung.

export type Song = { title: string; artist: string };
export const songKey = (s: Song) => `${s.title}|${s.artist}`;
const SONGS: Song[] = data.tracks;

export interface Erkennung {
  /** „Titel|Interpret“ des erkannten Songs */
  key?: string;
  /** Kandidaten bei Gleichstand (Schlüssel) */
  kandidaten: string[];
  fassung: string;
  quelle?: 'Dateiname' | 'Ordner' | 'Akkordblatt' | 'PDF-Eigenschaften' | 'Notenblatt' | 'ungefähr';
}

const ohneEndung = (n: string) => n.replace(/\.[^.]+$/, '');

/** Erkennung aus einem Text; Fassung = übrige Wörter des Dateinamens */
function ausText(text: string, name: string, quelle: Erkennung['quelle'], unscharf = false, songs = SONGS): Erkennung | undefined {
  let { treffer, woerter } = songsImText(text, songs, unscharf);
  // Titel genau, Interpret nicht gefunden → mit Toleranz nachsehen („Iris - Goo Goo Dools“), damit der verschriebene
  // Interpret nicht als Fassung übrig bleibt
  if (!unscharf && treffer.length && !treffer[0].mitInterpret) {
    const ungefaehr = songsImText(text, songs, true);
    if (ungefaehr.treffer[0]?.mitInterpret) ({ treffer, woerter } = ungefaehr);
  }
  const beste = besteTreffer(treffer);
  if (!beste.length) return undefined;
  // Fassung: was im Dateinamen nicht Titel/Interpret ist
  const fassung = text === ohneEndung(name) && beste.length === 1 ? woerter.filter((_, i) => !beste[0].weg.has(i)).join(' ') : namensRest(name, beste[0].song);
  if (beste.length === 1) return { key: songKey(beste[0].song), kandidaten: [], fassung, quelle };
  return { kandidaten: beste.map((t) => songKey(t.song)), fassung, quelle };
}

/** Fassung, wenn der Song anderswo erkannt wurde: der Dateiname ohne die Wörter von Titel und Interpret */
function namensRest(name: string, song: Song): string {
  const { treffer, woerter } = songsImText(ohneEndung(name), [song], true);
  const weg = treffer[0]?.weg ?? new Set<number>();
  return woerter.filter((_, i) => !weg.has(i)).join(' ');
}

/** Erkennung für eine Noten-Datei; laden wird nur gerufen, wenn der Inhalt gebraucht wird */
export async function erkennen(name: string, pfad: string, laden: () => Promise<ArrayBuffer>, songs: Song[] = SONGS): Promise<Erkennung> {
  const pdf = name.toLowerCase().endsWith('.pdf');
  const ordner = pfad.split('/').slice(0, -1).join(' ');
  let kandidaten: Erkennung | undefined;
  const merken = (e: Erkennung | undefined) => {
    if (e?.key) return e;
    if (e?.kandidaten.length && !kandidaten) kandidaten = e;
    return undefined;
  };
  // 1. Dateiname, 2. mit Ordnerpfad („Goo Goo Dolls/Iris - Bass.pdf“)
  const treffer = merken(ausText(ohneEndung(name), name, 'Dateiname', false, songs)) ?? (ordner ? merken(ausText(`${ordner} ${ohneEndung(name)}`, name, 'Ordner', false, songs)) : undefined);
  if (treffer) return treffer;
  // 3. Inhalt
  try {
    if (pdf) {
      const kopf = await pdfKopf(await laden());
      const t = (kopf.eigenschaften && merken(ausText(kopf.eigenschaften, name, 'PDF-Eigenschaften', false, songs))) || (kopf.kopf && merken(ausText(kopf.kopf, name, 'Notenblatt', false, songs)));
      if (t) return t;
    } else {
      const blatt: Akkordblatt = chordproLesen(dateiText(await laden()));
      if (blatt.titel) {
        const s = songZuordnen('', blatt, songs);
        if (s) return { key: songKey(s), kandidaten: [], fassung: namensRest(name, s), quelle: 'Akkordblatt' };
      }
    }
  } catch {
    // Inhalt nicht lesbar – weiter mit dem Namen
  }
  // 4. ungefähr (Tippfehler) im Namen samt Ordner
  const ungefaehr = merken(ausText(`${ordner} ${ohneEndung(name)}`.trim(), name, 'ungefähr', true, songs));
  return ungefaehr ?? kandidaten ?? { kandidaten: [], fassung: ohneEndung(name) };
}
