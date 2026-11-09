// „Probe füllen“ (Probenseite): die Probe nach ihrer Dauer automatisch mit den wichtigsten Songs füllen – zuerst
// Baustellen der nächsten Setlist, dann Songs, die bei mehreren noch in Kasten 1 liegen, dann was bei jemandem auf Üben
// oder Wackelt noch steht, zuletzt fast bühnenreife Setlist-Songs zum Festigen. Minuten je Song aus den bisherigen
// Proben (Zeit im Probe-Modus), sonst ein Standardwert. Ohne Angular-Abhängigkeiten, damit es in Node testbar ist.
import { PROBE_PREFIX } from './probe-modus';

export interface Kandidat {
  title: string;
  artist: string;
  grund: string;
  /** kleiner = wichtiger */
  prio: number;
}

/** angenommene Probenzeit je Song, wenn es noch keine Messung gibt (Sekunden) */
export const STANDARD_SEKUNDEN = 8 * 60;
const key = (s: { title: string; artist: string }) => `${s.title}|${s.artist}`;

/** durchschnittliche Zeit je Song aus allen gespeicherten Proben (nur Songs mit gemessener Zeit) */
export function probeZeiten(): Map<string, number> {
  const summe = new Map<string, { s: number; n: number }>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (!/^bn-probe-\d{4}-\d{2}-\d{2}$/.test(k) || !k.startsWith(PROBE_PREFIX)) continue;
      for (const s of (JSON.parse(localStorage.getItem(k) ?? '{}').songs ?? []) as { title: string; artist: string; zeit?: number }[]) {
        if (!s.zeit || s.zeit < 60) continue;
        const alt = summe.get(key(s)) ?? { s: 0, n: 0 };
        summe.set(key(s), { s: alt.s + s.zeit, n: alt.n + 1 });
      }
    }
  } catch {
    // ohne Speicher: Standardwerte
  }
  return new Map([...summe].map(([k, v]) => [k, Math.round(v.s / v.n)]));
}

/**
 * Songs auswählen, bis die Probenzeit voll ist. drin: schon geplante Songs (zählen mit ihrer Zeit);
 * budget: Probendauer in Sekunden. Gibt die neuen Songs (in Reihenfolge der Wichtigkeit) und die geplante Gesamtzeit.
 */
export function probeFuellen(
  kandidaten: Kandidat[],
  drin: { title: string; artist: string }[],
  zeiten: Map<string, number>,
  budget: number,
): { songs: Kandidat[]; gesamt: number } {
  const dauer = (s: { title: string; artist: string }) => zeiten.get(key(s)) ?? STANDARD_SEKUNDEN;
  const schon = new Set(drin.map(key));
  let gesamt = drin.reduce((n, s) => n + dauer(s), 0);
  const songs: Kandidat[] = [];
  const sortiert = kandidaten.map((k, i) => ({ k, i })).sort((a, b) => a.k.prio - b.k.prio || a.i - b.i).map((x) => x.k);
  for (const k of sortiert) {
    if (schon.has(key(k))) continue;
    if (gesamt + dauer(k) > budget) continue;
    schon.add(key(k));
    songs.push(k);
    gesamt += dauer(k);
  }
  return { songs, gesamt };
}
