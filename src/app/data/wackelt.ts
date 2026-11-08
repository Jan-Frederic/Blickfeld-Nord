// „Wackelt noch“: die eigenen Songs, die noch nicht sitzen (Übe-Status „Üben“ oder „Wackelt noch“, data/uebe-status.ts).
// Abgeleitet aus dem Karteikasten – der Probe-Vorschlag nimmt sie zuerst, unter Songs zeigt „Zeigen → wackelt noch“
// die Liste, die Nachbereitung markiert damit. Die alte eigene Liste (bn-wackelt) wird beim Umstellen übernommen.
import { eigeneStatus, statusSetzen, unsicher } from './uebe-status';
import { ladeUeben } from './ueben';
export const WACKELT_KEY = 'bn-wackelt';

/** eigene unsicheren Songs → zuletzt geübt bzw. fällig (Tag) */
export function ladeWackelt(): Record<string, string> {
  if (typeof localStorage === 'undefined') return {};
  const stand = ladeUeben();
  return Object.fromEntries([...eigeneStatus()].filter(([, s]) => unsicher(s)).map(([k]) => [k, stand[k]?.zuletzt ?? stand[k]?.faellig ?? '']));
}

/** markiert (Status „Wackelt noch“) bzw. entfernt (Status „Sitzt“) einen Song und gibt die neue Liste zurück */
export function wackeltSetzen(key: string, an: boolean, heute = new Date().toISOString().slice(0, 10), quelle: 'liste' | 'probe' = 'liste'): Record<string, string> {
  statusSetzen(key, an ? 'wackelt' : 'sitzt', quelle, heute);
  return ladeWackelt();
}
