// Einstellungen und Backstage-Daten mit OneDrive spiegeln: jeder Eintrag aus localStorage („bn-…“) wird eine eigene
// Datei im Sync-Ordner – so ändern zwei Leute selten dieselbe Datei. Band-Daten (Setlists, Packlisten, Vor Ort, Proben,
// Sterne, Werbeplan, Nachbereitung, Songs-Entwurf, Prüf-Häkchen) liegen unter „Daten/“, persönliche Einstellungen
// (Bühnen-Modus, Noten-Ansicht und -Fassung, Transposition, Wackelt-Liste, Aufgaben-Häkchen, Filter, Sprache) je Person
// unter „Einstellungen/<Name>/“. Vor dem Abgleich wird Geändertes in den lokalen Sync-Ordner geschrieben, danach
// Geändertes aus dem Ordner in localStorage übernommen. Der Stand je Datei (Inhalts-Hash, Version) steht im Spiegel-
// Zustand. Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.
import type { SyncDatei } from './sync';

export type SpiegelArt = 'band' | 'person';

const BAND = ['bn-setlist-', 'bn-packliste-', 'bn-vorort-', 'bn-probe-', 'bn-bewertung-', 'bn-werbeplan-', 'bn-songinfo-entwurf', 'bn-nachbereitung-', 'bn-ui-geprueft', 'bn-uebersetzung-pruefung'];
const PERSON = ['bn-buehne-', 'bn-noten-wahl', 'bn-noten-breite', 'bn-noten-scrolltempo', 'bn-noten-transpose', 'bn-noten-zuordnungen', 'bn-noten-ansicht', 'bn-wackelt', 'bn-aufgaben', 'bn-backstage-filter', 'bn-sprache'];

/** wird der Eintrag gespiegelt – für alle (band) oder je Person? null = bleibt auf dem Gerät (Sync, Anmeldung …) */
export function spiegelArt(key: string): SpiegelArt | null {
  if (BAND.some((p) => key.startsWith(p))) return 'band';
  if (PERSON.some((p) => key.startsWith(p))) return 'person';
  return null;
}

/** Ordnername der Person: aus dem Namen bzw. der Adresse des Microsoft-Kontos, ohne Zeichen, die Dateisysteme stören */
export function personOrdner(name: string): string {
  return (name.split('@')[0] || 'Ich').replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 60) || 'Ich';
}

export function spiegelPfad(key: string, person: string): string | null {
  const art = spiegelArt(key);
  return art === 'band' ? `Daten/${key}.json` : art === 'person' ? `Einstellungen/${person}/${key}.json` : null;
}

/** Schlüssel zu einer Datei – nur eigene Dateien (keine anderer Personen, keine Konfliktkopien) */
export function keyAusPfad(pfad: string, person: string): string | null {
  const m = /^(?:Daten|Einstellungen\/([^/]+))\/(bn-[^/]+)\.json$/.exec(pfad);
  if (!m || m[2].includes('(Konflikt')) return null;
  if (m[1] !== undefined && m[1] !== person) return null;
  return spiegelPfad(m[2], person) === pfad ? m[2] : null;
}

/** kurzer Inhalts-Hash (FNV-1a), um Änderungen zu erkennen */
export function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Stand je gespiegelter Datei: Hash des Inhalts und Version der lokalen Datei beim letzten Spiegeln */
export type SpiegelZustand = Record<string, { hash: string; version: string; key?: string }>;

/** was vor dem Abgleich in den lokalen Sync-Ordner muss: geänderte Einträge schreiben, gelöschte entfernen */
export function planVorher(werte: Record<string, string>, zustand: SpiegelZustand, person: string): { schreiben: { pfad: string; text: string; hash: string }[]; loeschen: string[] } {
  const schreiben: { pfad: string; text: string; hash: string }[] = [];
  const da = new Set<string>();
  for (const [key, text] of Object.entries(werte)) {
    const pfad = spiegelPfad(key, person);
    if (!pfad) continue;
    da.add(pfad);
    const h = hash(text);
    if (zustand[pfad]?.hash !== h) schreiben.push({ pfad, text, hash: h });
  }
  const loeschen = Object.keys(zustand).filter((p) => !da.has(p) && keyAusPfad(p, person));
  return { schreiben, loeschen };
}

/** was nach dem Abgleich in localStorage muss: neue/geänderte Dateien lesen, verschwundene Einträge entfernen */
export function planNachher(dateien: SyncDatei[], zustand: SpiegelZustand, person: string): { lesen: { pfad: string; key: string; version: string }[]; entfernen: { pfad: string; key: string }[] } {
  const lesen: { pfad: string; key: string; version: string }[] = [];
  const da = new Set<string>();
  for (const d of dateien) {
    const key = keyAusPfad(d.pfad, person);
    if (!key) continue;
    da.add(d.pfad);
    if (zustand[d.pfad]?.version !== d.version) lesen.push({ pfad: d.pfad, key, version: d.version });
  }
  const entfernen = Object.keys(zustand)
    .filter((p) => !da.has(p))
    .map((pfad) => ({ pfad, key: keyAusPfad(pfad, person)! }))
    .filter((x) => x.key);
  return { lesen, entfernen };
}

export type SyncStatus = 'synchron' | 'wartet' | 'lokal';

/** Status eines Eintrags für die Anzeige im Abgleich */
export function syncStatusVon(key: string, wert: string | null, zustand: SpiegelZustand, person: string): SyncStatus {
  const pfad = spiegelPfad(key, person);
  if (!pfad) return 'lokal';
  return wert !== null && zustand[pfad]?.hash === hash(wert) ? 'synchron' : 'wartet';
}

/** Konfliktkopie („Name (Konflikt Gerät 2026-10-30).json“) → Pfad des Originals und Seite/Datum; sonst null */
export function konfliktVon(pfad: string): { original: string; seite: string; datum: string } | null {
  const m = /^(.*) \(Konflikt (\S+) (\d{4}-\d{2}-\d{2})\)(\.[^./]*)?$/.exec(pfad);
  return m ? { original: m[1] + (m[4] ?? ''), seite: m[2], datum: m[3] } : null;
}
