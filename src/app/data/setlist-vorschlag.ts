// Setlist-Vorschlag (Backstage): stellt aus dem Repertoire Sets in gewünschter Länge zusammen – die Songs mit den
// meisten Sternen aus dem Bühnen-Modus zuerst, ohne Sterne die am häufigsten gespielten. Jedes Set beginnt mit dem
// zweitbesten und endet mit dem besten Song; zwei langsame Songs oder zweimal dieselbe Tonart hintereinander werden
// nach Möglichkeit vermieden. Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.
import { isPause, type Entry, type Song } from './setlist-data';
import { quintAbstand } from './tonart-uebergang';
import { adventszeit, istWeihnachtslied } from './weihnachten';

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

const ADVENT = 4.5; // so viel „wert“ bekommen Weihnachtslieder in der Adventszeit mindestens

const laenge = (k: Kandidat) => k.dauer ?? OHNE_LAENGE;

// Weihnachtslieder (am Titel erkannt) passen nur zu Auftritten zwischen 15.11. und 26.12.
export { adventszeit, istWeihnachtslied } from './weihnachten';

const passtNicht = (a: Kandidat, b: Kandidat) =>
  (a.bpm !== undefined && b.bpm !== undefined && a.bpm < LANGSAM && b.bpm < LANGSAM) || (!!a.tonart && a.tonart === b.tonart);

// Kandidaten nach Wert (Sterne, sonst neutral), dann Spielhäufigkeit; mit Datum Weihnachtslieder nur in der Adventszeit
function rangfolge(kandidaten: Kandidat[], datum?: string): Kandidat[] {
  if (datum) {
    const advent = adventszeit(datum);
    kandidaten = kandidaten
      .filter((k) => advent || !istWeihnachtslied(k))
      .map((k) => (advent && istWeihnachtslied(k) ? { ...k, wert: Math.max(k.wert ?? NEUTRAL, ADVENT) } : k));
  }
  return kandidaten
    .map((k, i) => ({ k, i }))
    .sort((a, b) => (b.k.wert ?? NEUTRAL) - (a.k.wert ?? NEUTRAL) || (b.k.gespielt ?? 0) - (a.k.gespielt ?? 0) || a.i - b.i)
    .map((x) => x.k);
}

const AUSWAHL = 4; // beim Auffüllen: unter so vielen der bestplatzierten Songs den mit der passendsten Tonart nehmen

/**
 * Letztes Set auf etwa `minuten` Spielzeit auffüllen: Songs, die noch nicht auf der Setlist stehen, in der Rangfolge
 * des Vorschlags – unter den nächsten AUSWAHL jeweils der mit der nächstgelegenen Tonart zum vorigen Song (Quintenzirkel),
 * damit keine Tonartsprünge entstehen. Die bisherigen Einträge bleiben unverändert.
 */
export function auffuellen(entries: Entry[], kandidaten: Kandidat[], minuten: number, datum?: string): Entry[] {
  const drin = new Set(entries.filter((e) => !isPause(e)).map((e) => `${(e as Song).title}|${(e as Song).artist}`));
  const info = new Map(kandidaten.map((k) => [`${k.title}|${k.artist}`, k]));
  const rest = rangfolge(kandidaten, datum).filter((k) => !drin.has(`${k.title}|${k.artist}`));
  const letzteStart = entries.map((e) => isPause(e)).lastIndexOf(true) + 1;
  const letztes = entries.slice(letzteStart) as Song[];
  let summe = letztes.reduce((s, e) => s + laenge(info.get(`${e.title}|${e.artist}`) ?? e), 0);
  let vorher = letztes.length ? info.get(`${letztes[letztes.length - 1].title}|${letztes[letztes.length - 1].artist}`) : undefined;
  const neu: Song[] = [];
  const ziel = minuten * 60;
  while (rest.length) {
    const auswahl = rest.slice(0, AUSWAHL).filter((k) => summe + laenge(k) / 2 < ziel);
    if (!auswahl.length) break;
    const k = auswahl.reduce((a, b) => ((quintAbstand(vorher?.tonart, b.tonart) ?? 2) < (quintAbstand(vorher?.tonart, a.tonart) ?? 2) ? b : a));
    rest.splice(rest.indexOf(k), 1);
    neu.push(song(k));
    summe += laenge(k);
    vorher = k;
  }
  return [...entries, ...neu];
}

/** Sets mit je etwa `minuten` Spielzeit, getrennt durch Pausen. Mit `datum` (JJJJ-MM-TT) des Auftritts: Weihnachtslieder
 * in der Adventszeit weit vorne, sonst gar nicht. */
export function vorschlagen(kandidaten: Kandidat[], sets: number, minuten: number, datum?: string): Entry[] {
  const rang = rangfolge(kandidaten, datum);
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
