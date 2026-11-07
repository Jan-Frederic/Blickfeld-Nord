import type { Entry, Song } from './setlist-data';

// Pausen neu setzen: Wunsch-Länge je Set (z. B. 45 Minuten) – die Pausen werden so zwischen die Songs gelegt, dass
// jedes Set möglichst nah an dieser Länge liegt (so viele Sets, wie am besten passen, alle etwa gleich lang). Die Reihenfolge der Songs bleibt; vorhandene Pausen fallen weg.
// Gerechnet wird mit der Spotify-Länge, ohne Angabe mit „ohne“ Sekunden (Standard 4 Minuten).
// Ohne Angular-Abhängigkeiten, damit es in Node testbar ist.

export function pausenSetzen(entries: Entry[], zielSekunden: number, dauer: (s: Song) => number | undefined, ohne = 240): Entry[] {
  const songs = entries.filter((e): e is Song => !('pause' in e));
  if (!songs.length || zielSekunden <= 0) return songs;
  const laenge = songs.map((s) => dauer(s) || ohne);
  const gesamt = laenge.reduce((a, b) => a + b, 0);
  // Anzahl Sets: die mit der geringsten Abweichung von der Wunsch-Länge (mindestens 1)
  const anzahl = Math.max(1, Math.round(gesamt / zielSekunden));
  const out: Entry[] = [];
  let set = 0;
  let fertig = 0;
  let sets = 1;
  for (let i = 0; i < songs.length; i++) {
    out.push(songs[i]);
    set += laenge[i];
    fertig += laenge[i];
    const rest = songs.length - i - 1;
    if (!rest || sets >= anzahl) continue;
    // Pause nach diesem Song, wenn das Set mit dem nächsten Song weiter von der Wunsch-Länge weg wäre –
    // höchstens so viele Sets wie geplant, die übrigen Songs füllen das letzte
    const mitNaechstem = set + laenge[i + 1];
    // Ziel für dieses Set: der Rest gleichmäßig auf die verbleibenden Sets verteilt (so werden alle etwa gleich lang)
    const ziel = (gesamt - (fertig - set)) / (anzahl - sets + 1);
    if (Math.abs(mitNaechstem - ziel) > Math.abs(set - ziel)) {
      out.push({ pause: true });
      set = 0;
      sets++;
    }
  }
  return out;
}
