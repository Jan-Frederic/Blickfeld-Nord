// „Für alle gelöscht“: Wer den Band-Ordner besitzt, kann ein Notenblatt auch aus OneDrive löschen. Damit es auf den
// Geräten der anderen wirklich verschwindet – auch die eingelesene Kopie im Noten-Speicher und auch dann, wenn dort
// „Löschungen übertragen“ aus ist –, merkt sich die Band die gelöschten Dateien (Name, Größe, Zeitpunkt) in
// bn-noten-geloescht (gespiegelt unter Daten/). Jedes Gerät löscht beim Abgleich, was dazu passt und älter ist als
// die Löschung; später neu hinzugefügte Dateien gleichen Namens bleiben. Einträge verfallen nach 120 Tagen.
// Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.
export const GELOESCHT_KEY = 'bn-noten-geloescht';
const HALTEN_TAGE = 120;

export interface Geloescht {
  name: string;
  groesse: number;
  /** ISO-Zeitpunkt der Löschung */
  zeit: string;
}

export function ladeGeloescht(jetzt = Date.now()): Geloescht[] {
  try {
    const l = JSON.parse(localStorage.getItem(GELOESCHT_KEY) ?? '[]') as Geloescht[];
    return Array.isArray(l) ? l.filter((g) => typeof g.name === 'string' && typeof g.groesse === 'number' && jetzt - Date.parse(g.zeit) < HALTEN_TAGE * 864e5) : [];
  } catch {
    return [];
  }
}

export function geloeschtMerken(dateien: { name: string; groesse: number }[], jetzt = new Date()): void {
  const zeit = jetzt.toISOString();
  const neu = new Map(ladeGeloescht(jetzt.getTime()).map((g) => [`${g.name.toLowerCase()}|${g.groesse}`, g]));
  for (const d of dateien) neu.set(`${d.name.toLowerCase()}|${d.groesse}`, { name: d.name, groesse: d.groesse, zeit });
  try {
    localStorage.setItem(GELOESCHT_KEY, JSON.stringify([...neu.values()]));
  } catch {
    // ohne Speicher wirkt die Löschung nur auf diesem Gerät
  }
}

/** gilt die Löschung für diese Datei? Gleicher Name (ohne Ordner), gleiche Größe, vor der Löschung entstanden */
export function giltLoeschung(liste: Geloescht[], d: { name: string; groesse: number; zeit?: string }): boolean {
  const name = d.name.split('/').at(-1)!.toLowerCase();
  return liste.some((g) => g.name.toLowerCase() === name && g.groesse === d.groesse && (!d.zeit || d.zeit < g.zeit));
}
