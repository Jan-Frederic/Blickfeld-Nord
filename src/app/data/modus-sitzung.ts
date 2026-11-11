// Offener Übe- bzw. Probe-Modus, gemerkt für diese Browser-Sitzung (sessionStorage): Lädt die Seite neu – das Handy
// hat sie im Hintergrund verworfen (z. B. nach einem Wechsel in die Spotify-App) oder ein Update wurde geladen –,
// öffnet sich der Modus wieder, statt dass man auf der Üben- bzw. Probenseite landet. Beim Beenden des Modus und beim
// Verlassen der Seite innerhalb der App wird die Merkung gelöscht. Ohne Angular-Abhängigkeiten.
const KEY = 'bn-modus-sitzung';
/** länger zurück gilt die Merkung nicht mehr (z. B. Tab vom Vortag) */
const MAX_MS = 3 * 3600_000;

export interface ModusSitzung {
  art: 'ueben' | 'probe';
  /** Probe: Datum der Probe */
  id?: string;
  zeit: number;
  /** Übe-Modus: bisheriges Ergebnis (Anzahl je Status) */
  zaehler?: Record<string, number>;
}

export function sitzungMerken(s: Omit<ModusSitzung, 'zeit'>, jetzt = Date.now()): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...s, zeit: jetzt }));
  } catch {
    // ohne Speicher eben ohne Wiederaufnahme
  }
}

export function sitzungLesen(art: ModusSitzung['art'], id?: string, jetzt = Date.now()): ModusSitzung | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as ModusSitzung | null;
    return s && s.art === art && (id === undefined || s.id === id) && jetzt - s.zeit < MAX_MS ? s : null;
  } catch {
    return null;
  }
}

export function sitzungVergessen(art: ModusSitzung['art']): void {
  try {
    if ((JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as ModusSitzung | null)?.art === art) sessionStorage.removeItem(KEY);
  } catch {
    // nichts zu vergessen
  }
}
