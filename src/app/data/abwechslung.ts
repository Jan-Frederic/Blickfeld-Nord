// „Hier schon gespielt“: Spielt die Band wieder am selben Ort, zeigt die Setlist, welche Songs dort beim letzten Mal
// liefen, und tauscht sie auf Wunsch gegen Songs, die dort noch nicht liefen (ähnliches Tempo, sonst der Reihe nach).
// Gleicher Ort auch bei Varianten wie „Café Lotti – Tanz in den Mai“. Ohne Angular-Abhängigkeiten (Node-Tests).
import type { Show } from './band.service';
import type { Entry, Song } from './setlist-data';

export const ortBasis = (v: string) => v.toLocaleLowerCase('de').split(/\s+[–—-]\s+|\s+mit\s+|,|\(/)[0].trim();
export const gleicherOrt = (a: Show, b: Show) =>
  (a.city ?? '') === (b.city ?? '') && (ortBasis(a.venue).startsWith(ortBasis(b.venue)) || ortBasis(b.venue).startsWith(ortBasis(a.venue)));
const key = (s: { title: string; artist: string }) => `${s.title}|${s.artist}`;

/** Songs, die bei früheren Auftritten am selben Ort liefen: Schlüssel → letztes Datum */
export function hierGespielt(show: Show, shows: Show[], setlistVon: (s: Show) => Entry[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const s of shows) {
    if (s === show || s.date >= show.date || !gleicherOrt(s, show)) continue;
    for (const e of setlistVon(s)) {
      if ('pause' in e) continue;
      if ((out.get(key(e)) ?? '') < s.date) out.set(key(e), s.date);
    }
  }
  return out;
}

/** gespielte Songs gegen andere tauschen (nicht in der Setlist, dort noch nicht gespielt; ähnliches Tempo bevorzugt) */
export function abwechslung(entries: Entry[], gespielt: Map<string, string>, repertoire: Song[], bpm: (s: Song) => number | undefined): { entries: Entry[]; getauscht: number } {
  const vergeben = new Set(entries.filter((e) => !('pause' in e)).map((e) => key(e as Song)));
  let getauscht = 0;
  const neu = entries.map((e): Entry => {
    if ('pause' in e || !gespielt.has(key(e))) return e;
    const b = bpm(e);
    const frei = repertoire.filter((r) => !vergeben.has(key(r)) && !gespielt.has(key(r)));
    if (!frei.length) return e;
    const wahl = b ? [...frei].sort((x, y) => Math.abs((bpm(x) ?? 999) - b) - Math.abs((bpm(y) ?? 999) - b))[0] : frei[0];
    vergeben.add(key(wahl));
    getauscht++;
    return { title: wahl.title, artist: wahl.artist };
  });
  return { entries: neu, getauscht };
}
