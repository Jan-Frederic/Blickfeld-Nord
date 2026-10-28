// Einstellungen für den Bühnen-Modus je Gerät (Backstage → Einstellungen): Tasten fürs Weiter- und Zurückblättern
// (Bluetooth-Fußpedale senden je nach Modell Pfeiltasten, Bild auf/ab, Leertaste oder Buchstaben) und
// Halbseiten-Blättern bei PDF-Noten (erst die obere Hälfte zeigt den Anfang der nächsten Seite, dann ganz).
const TASTEN_KEY = 'bn-buehne-tasten';
const HALB_KEY = 'bn-buehne-halbseite';

export interface Tasten {
  weiter: string[];
  zurueck: string[];
}

export const STANDARD_TASTEN: Tasten = { weiter: ['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'], zurueck: ['ArrowLeft', 'ArrowUp', 'PageUp'] };

export function tasten(): Tasten {
  try {
    const t = JSON.parse(localStorage.getItem(TASTEN_KEY) ?? 'null') as Tasten | null;
    return t?.weiter?.length || t?.zurueck?.length ? { weiter: t.weiter ?? [], zurueck: t.zurueck ?? [] } : STANDARD_TASTEN;
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
