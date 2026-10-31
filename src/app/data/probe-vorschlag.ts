// „Was sollten wir proben?“ (Backstage → Probe): zuerst Songs, die als „wackelt noch“ markiert sind, dann Songs der
// Wunschliste, die schon Noten und Tonart/Tempo haben, aber noch nie geprobt wurden („bereit“), dann Songs mit
// wenig Sternen, lange nicht gespielte und Repertoire-Songs, die noch auf keiner Setlist standen. Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.
import type { Song } from './setlist-data';

export interface ProbeTipp extends Song {
  grund: string;
}

const key = (s: Song) => `${s.title}|${s.artist}`;
const tage = (von: string, bis: string) => Math.round((Date.parse(bis) - Date.parse(von)) / 864e5);

/**
 * @param repertoire alle Songs
 * @param sterne Sterne-Schnitt je Song (nur bewertete)
 * @param zuletzt Datum, an dem ein Song zuletzt auf einer Setlist stand
 * @param wackelt als „wackelt noch“ markierte Songs (Schlüssel „Titel|Interpret“)
 */
export function probeTipps(repertoire: Song[], sterne: Map<string, number>, zuletzt: Map<string, string>, heute: string, je = 4, wackelt = new Set<string>(), bereit: Song[] = []): ProbeTipp[] {
  const unsicher = repertoire.filter((s) => wackelt.has(key(s))).map((s) => ({ ...s, grund: 'wackelt noch' }));
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
  return [...unsicher, ...neu, ...schwach, ...lange, ...nie].filter((t) => !gesehen.has(key(t)) && gesehen.add(key(t)));
}
