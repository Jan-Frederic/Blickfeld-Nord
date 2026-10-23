// Setlist-Vorschlag (Backstage): stellt aus dem Repertoire Sets in gewünschter Länge zusammen – die Songs mit den
// meisten Sternen aus dem Bühnen-Modus zuerst, ohne Sterne die am häufigsten gespielten. Jedes Set beginnt mit dem
// zweitbesten und endet mit dem besten Song; zwei langsame Songs oder zweimal dieselbe Tonart hintereinander werden
// nach Möglichkeit vermieden. Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.
import type { Entry, Song } from './setlist-data';

export interface Kandidat extends Song {
  /** Länge in Sekunden (Spotify) */
  dauer?: number;
  /** gedämpfter Sterne-Schnitt aus der Rangliste */
  wert?: number;
  /** wie oft schon auf einer Setlist */
  gespielt?: number;
  bpm?: number;
  tonart?: string;
}

const OHNE_LAENGE = 210; // angenommene Länge in Sekunden für Songs ohne Spotify-Angabe
const LANGSAM = 95; // bpm – darunter gilt ein Song als langsam
const NEUTRAL = 3; // so viel „wert“ hat ein Song ohne Sterne

const laenge = (k: Kandidat) => k.dauer ?? OHNE_LAENGE;
const passtNicht = (a: Kandidat, b: Kandidat) =>
  (a.bpm !== undefined && b.bpm !== undefined && a.bpm < LANGSAM && b.bpm < LANGSAM) || (!!a.tonart && a.tonart === b.tonart);

/** Sets mit je etwa `minuten` Spielzeit, getrennt durch Pausen */
export function vorschlagen(kandidaten: Kandidat[], sets: number, minuten: number): Entry[] {
  const rang = kandidaten
    .map((k, i) => ({ k, i }))
    .sort((a, b) => (b.k.wert ?? NEUTRAL) - (a.k.wert ?? NEUTRAL) || (b.k.gespielt ?? 0) - (a.k.gespielt ?? 0) || a.i - b.i)
    .map((x) => x.k);
  const ziel = minuten * 60;
  const gruppen: Kandidat[][] = Array.from({ length: sets }, () => []);
  const summe = (g: Kandidat[]) => g.reduce((s, k) => s + laenge(k), 0);

  // der Reihe nach ins kürzeste Set, das noch nicht voll ist – so bekommt jedes Set starke Songs ab
  for (const k of rang) {
    const offen = gruppen.filter((g) => summe(g) + laenge(k) / 2 < ziel);
    if (!offen.length) break;
    offen.reduce((a, b) => (summe(b) < summe(a) ? b : a)).push(k);
  }

  return gruppen
    .filter((g) => g.length)
    .map(ordnen)
    .flatMap((g, i) => (i ? [{ pause: true } as Entry, ...g.map(song)] : g.map(song)));
}

const song = (k: Kandidat): Song => ({ title: k.title, artist: k.artist });

// Bester Song ans Ende, zweitbester an den Anfang, dazwischen Konflikte (langsam/langsam, gleiche Tonart) auflösen
function ordnen(g: Kandidat[]): Kandidat[] {
  if (g.length < 3) return [...g].reverse();
  const [best, zweit, ...rest] = g;
  const mitte = [...rest];
  let vorher = zweit;
  for (let i = 0; i < mitte.length; i++) {
    if (passtNicht(vorher, mitte[i])) {
      const j = mitte.findIndex((k, n) => n > i && !passtNicht(vorher, k));
      if (j > 0) [mitte[i], mitte[j]] = [mitte[j], mitte[i]];
    }
    vorher = mitte[i];
  }
  return [zweit, ...mitte, best];
}
