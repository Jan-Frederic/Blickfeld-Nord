import { NotenPdf, SongNoten } from './noten';

// Gewählte Fassung im Bühnen-Modus (ein PDF wie „Bass“ oder das Akkordblatt): je Song gemerkt, dazu die zuletzt
// gewählte Art und Fassung als Vorliebe für Songs ohne eigene Wahl – bleibt beim Blättern (auch zurück) und auf dem
// Gerät erhalten. Gemeinsam für die Notenanzeige und „Auftritt vorbereiten“.
const WAHL_KEY = 'bn-noten-wahl';
const ANSICHT_ALT_KEY = 'bn-noten-ansicht';

export interface Wahl {
  songs: Record<string, string>;
  art: 'pdf' | 'akkorde';
  name?: string;
}

export const pdfId = (p: NotenPdf) => `pdf:${p.datei}:${p.von ?? ''}`;
const namensVergleich = (s?: string) => (s ?? '').trim().toLocaleLowerCase('de');

export function ladeWahl(): Wahl {
  try {
    const w = JSON.parse(localStorage.getItem(WAHL_KEY) ?? 'null') as Wahl | null;
    if (w?.songs) return w;
    return { songs: {}, art: localStorage.getItem(ANSICHT_ALT_KEY) === 'akkorde' ? 'akkorde' : 'pdf' };
  } catch {
    return { songs: {}, art: 'pdf' };
  }
}

export function wahlSpeichern(w: Wahl): void {
  try {
    localStorage.setItem(WAHL_KEY, JSON.stringify(w));
  } catch {
    // ohne Speicher gilt die Wahl bis zum Schließen
  }
}

/** Fassung für einen Song: eigene Wahl → zuletzt Akkorde gewählt → PDF mit dem zuletzt gewählten Namen („Bass“) → erstes PDF */
export function fassungWaehlen(n: SongNoten, key: string, w: Wahl): string {
  const ids = [...(n.pdfs ?? []).map(pdfId), ...(n.chordpro ? ['akkorde'] : [])];
  const eigen = w.songs[key];
  if (eigen && ids.includes(eigen)) return eigen;
  if (w.art === 'akkorde' && n.chordpro) return 'akkorde';
  const pdfs = n.pdfs ?? [];
  const name = namensVergleich(w.name);
  const p = (name && (pdfs.find((x) => namensVergleich(x.name) === name) ?? pdfs.find((x) => namensVergleich(x.name).includes(name)))) || pdfs[0];
  return p ? pdfId(p) : n.chordpro ? 'akkorde' : '';
}

/** hat der Song die bevorzugte Fassung (z. B. „Bass“)? undefined = keine Vorliebe */
export function hatBevorzugte(n: SongNoten, w: Wahl): boolean | undefined {
  if (w.art === 'akkorde') return !!n.chordpro;
  const name = namensVergleich(w.name);
  if (!name) return undefined;
  return (n.pdfs ?? []).some((p) => namensVergleich(p.name).includes(name));
}
