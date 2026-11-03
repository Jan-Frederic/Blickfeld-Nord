// „Was sollten wir proben?“ (Backstage → Probe): zuerst Songs, die bei jemandem wackeln (Fortschritt je Person bzw.
// eigene „Wackelt noch“-Liste) – die mit der geringsten Bühnenreife und den meisten Wackelnden vorn –, dann Songs der
// Wunschliste, die schon Noten und Tonart/Tempo haben, aber noch nie geprobt wurden („bereit“), dann Songs mit
// wenig Sternen, fast bühnenreife (festigen), lange nicht gespielte und Repertoire-Songs, die noch auf keiner Setlist standen. Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.
import type { Song } from './setlist-data';

export interface ProbeTipp extends Song {
  grund: string;
}

/** Bühnenreife eines Songs (data/fortschritt.ts), soweit für den Vorschlag nötig */
export interface ReifeKurz {
  wert: number;
  wackeltBei: string[];
  ampel: 'buehnenreif' | 'fast' | 'baustelle' | 'offen';
}
const pct = (w: number) => `${Math.round(w * 100)} %`;

const key = (s: Song) => `${s.title}|${s.artist}`;
const tage = (von: string, bis: string) => Math.round((Date.parse(bis) - Date.parse(von)) / 864e5);

/**
 * @param repertoire alle Songs
 * @param sterne Sterne-Schnitt je Song (nur bewertete)
 * @param zuletzt Datum, an dem ein Song zuletzt auf einer Setlist stand
 * @param wackelt als „wackelt noch“ markierte Songs (Schlüssel „Titel|Interpret“)
 */
export function probeTipps(
  repertoire: Song[],
  sterne: Map<string, number>,
  zuletzt: Map<string, string>,
  heute: string,
  je = 4,
  wackelt = new Set<string>(),
  bereit: Song[] = [],
  baustellen: { song: Song; notiz: string }[] = [],
  reife = new Map<string, ReifeKurz>(),
): ProbeTipp[] {
  // wackelt bei jemandem: geringste Reife zuerst, bei Gleichstand die mit mehr Wackelnden
  const r = (s: Song) => reife.get(key(s));
  const unsicher = repertoire
    .filter((s) => wackelt.has(key(s)) || r(s)?.wackeltBei.length)
    .sort((a, b) => (r(a)?.wert ?? 0.5) - (r(b)?.wert ?? 0.5) || (r(b)?.wackeltBei.length ?? 0) - (r(a)?.wackeltBei.length ?? 0))
    .map((s) => ({ ...s, grund: r(s)?.wackeltBei.length ? `wackelt bei ${r(s)!.wackeltBei.join(', ')} · Bühnenreife ${pct(r(s)!.wert)}` : 'wackelt noch' }));
  // sitzt bei allen mit Angabe, aber noch nicht überall sicher
  const festigen = repertoire
    .filter((s) => r(s)?.ampel === 'fast')
    .sort((a, b) => r(a)!.wert - r(b)!.wert)
    .slice(0, je)
    .map((s) => ({ ...s, grund: `fast bühnenreif (${pct(r(s)!.wert)}) – festigen` }));
  // Probennotizen wie „Tempo zu schnell“ – gleich nach „wackelt noch“
  const notiert = baustellen.slice(0, je).map((b) => ({ ...b.song, grund: `Probennotiz: ${b.notiz}` }));
  const neu = bereit.slice(0, je).map((s) => ({ ...s, grund: 'Wunschliste: Noten und Tonart da, noch nie geprobt' }));
  const schwach = repertoire
    .filter((s) => (sterne.get(key(s)) ?? 5) < 3)
    .sort((a, b) => sterne.get(key(a))! - sterne.get(key(b))!)
    .slice(0, je)
    .map((s) => ({ ...s, grund: `nur ${sterne.get(key(s))!.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Sterne` }));
  const lange = repertoire
    .filter((s) => zuletzt.has(key(s)) && tage(zuletzt.get(key(s))!, heute) >= 180)
    .sort((a, b) => zuletzt.get(key(a))!.localeCompare(zuletzt.get(key(b))!))
    .slice(0, je)
    .map((s) => ({ ...s, grund: `seit ${Math.floor(tage(zuletzt.get(key(s))!, heute) / 30)} Monaten nicht gespielt` }));
  const nie = repertoire
    .filter((s) => !zuletzt.has(key(s)))
    .slice(0, je)
    .map((s) => ({ ...s, grund: 'noch auf keiner Setlist' }));
  const gesehen = new Set<string>();
  return [...unsicher, ...notiert, ...neu, ...festigen, ...schwach, ...lange, ...nie].filter((t) => !gesehen.has(key(t)) && gesehen.add(key(t)));
}

/**
 * „Für den nächsten Auftritt“ (Probenseite): Songs mit Baustelle aus der letzten Probe und Songs der Setlist des
 * nächsten Auftritts, die noch nie geprobt wurden oder bei jemandem wackeln – ohne die, die schon auf dem Plan stehen.
 */
export function vorAuftritt(baustellen: Song[], setlist: Song[], geprobt: Set<string>, drin: Set<string>, reife = new Map<string, ReifeKurz>()): ProbeTipp[] {
  const out: ProbeTipp[] = [];
  const dazu = (s: Song, grund: string) => {
    if (drin.has(key(s)) || out.some((o) => key(o) === key(s))) return;
    out.push({ title: s.title, artist: s.artist, grund });
  };
  for (const s of baustellen) dazu(s, 'Baustelle aus der letzten Probe');
  for (const s of setlist) {
    const r = reife.get(key(s));
    if (!geprobt.has(key(s))) dazu(s, 'auf der Setlist, noch nie geprobt');
    else if (r?.wackeltBei.length) dazu(s, `auf der Setlist, wackelt bei ${r.wackeltBei.join(', ')}`);
  }
  return out;
}
