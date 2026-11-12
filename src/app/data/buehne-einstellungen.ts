// Einstellungen für den Bühnen-Modus je Gerät (Backstage → Einstellungen): Tasten fürs Weiter- und Zurückblättern
// (Bluetooth-Fußpedale senden je nach Modell Pfeiltasten, Bild auf/ab, Leertaste oder Buchstaben), für „hoch“ und
// „runter“ (wie Wischen nach oben bzw. unten: Titelanzeige → Notenansicht → volle Notenansicht und zurück) und
// Halbseiten-Blättern bei PDF-Noten (erst die obere Hälfte zeigt den Anfang der nächsten Seite, dann ganz).
const TASTEN_KEY = 'bn-buehne-tasten';
const HALB_KEY = 'bn-buehne-halbseite';

export interface Tasten {
  weiter: string[];
  zurueck: string[];
  /** wie nach oben wischen: Titelanzeige → Notenansicht → volle Notenansicht (Kopfleiste weg) */
  hoch: string[];
  /** wie nach unten wischen: volle Notenansicht → Notenansicht → Titelanzeige */
  runter: string[];
}
export const TASTEN_FELDER: (keyof Tasten)[] = ['weiter', 'zurueck', 'hoch', 'runter'];

export const STANDARD_TASTEN: Tasten = { weiter: ['ArrowRight', ' ', 'PageDown', 'Enter'], zurueck: ['ArrowLeft', 'PageUp'], hoch: ['ArrowUp'], runter: ['ArrowDown'] };

/** gespeicherte Belegung lesen; ältere ohne „hoch“/„runter“ bekommen ↑/↓ dafür (bis dahin blätterten sie) */
export function tastenLesen(t: Partial<Tasten> | null): Tasten {
  if (!t?.weiter?.length && !t?.zurueck?.length && !t?.hoch?.length && !t?.runter?.length) return STANDARD_TASTEN;
  if (t.hoch || t.runter) return { weiter: t.weiter ?? [], zurueck: t.zurueck ?? [], hoch: t.hoch ?? [], runter: t.runter ?? [] };
  const ohne = (l: string[] | undefined) => (l ?? []).filter((k) => k !== 'ArrowUp' && k !== 'ArrowDown');
  return { weiter: ohne(t.weiter), zurueck: ohne(t.zurueck), hoch: ['ArrowUp'], runter: ['ArrowDown'] };
}

export function tasten(): Tasten {
  try {
    return tastenLesen(JSON.parse(localStorage.getItem(TASTEN_KEY) ?? 'null') as Partial<Tasten> | null);
  } catch {
    return STANDARD_TASTEN;
  }
}

export function tastenSetzen(t: Tasten | null): void {
  try {
    if (t) localStorage.setItem(TASTEN_KEY, JSON.stringify(t));
    else localStorage.removeItem(TASTEN_KEY);
  } catch {
    // ohne Speicher gelten die Standardtasten
  }
}

export function halbseite(): boolean {
  try {
    return localStorage.getItem(HALB_KEY) === '1';
  } catch {
    return false;
  }
}

export function halbseiteSetzen(an: boolean): void {
  try {
    localStorage.setItem(HALB_KEY, an ? '1' : '0');
  } catch {
    // egal
  }
}

/** Anzeigename einer Taste: „→“, „Leertaste“, „Bild ↓“ … */
export function tastenName(key: string): string {
  const namen: Record<string, string> = {
    ArrowRight: '→', ArrowLeft: '←', ArrowUp: '↑', ArrowDown: '↓', ' ': 'Leertaste', PageDown: 'Bild ↓', PageUp: 'Bild ↑', Enter: 'Eingabe',
    Backspace: 'Rück', Tab: 'Tab', MediaTrackNext: 'Medien ⏭', MediaTrackPrevious: 'Medien ⏮', MediaPlayPause: 'Medien ⏯', AudioVolumeUp: 'Lauter', AudioVolumeDown: 'Leiser',
  };
  return namen[key] ?? (key.length === 1 ? key.toUpperCase() : key);
}
