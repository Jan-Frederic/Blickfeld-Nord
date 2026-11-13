// Einrichtungsassistent (pages/backstage-einrichtung.ts): einmal je Gerät nach der ersten Anmeldung im Backstage –
// wer bin ich, wie heißt das Gerät, Synchronisation (OneDrive-Ordner selbst wählen), Spotify (Standard:
// im Browser abspielen) und die geklärten Standards. Ohne Angular-Abhängigkeiten.

export const EINRICHTUNG_KEY = 'bn-einrichtung';

/** wurde die Einrichtung auf diesem Gerät abgeschlossen (oder übersprungen)? */
export function einrichtungFertig(): boolean {
  try {
    return !!localStorage.getItem(EINRICHTUNG_KEY);
  } catch {
    return true;
  }
}

export function einrichtungMerken(wie: 'fertig' | 'uebersprungen', jetzt = new Date()): void {
  try {
    localStorage.setItem(EINRICHTUNG_KEY, JSON.stringify({ wie, zeit: jetzt.toISOString() }));
  } catch {
    // ohne Speicher fragt der Assistent beim nächsten Mal eben wieder
  }
}

/** Ziel nach der Anmeldung: beim ersten Mal erst die Einrichtung, die danach dorthin weiterführt */
export const nachAnmeldung = (ziel: string, fertig = einrichtungFertig()) => (fertig ? ziel : `/backstage/einrichtung?ziel=${encodeURIComponent(ziel)}`);

/** Vorschlag für den Gerätenamen: „Freds iPhone“, „Jens’ Mac“ */
export function geraetVorschlag(rufname: string, geraet: string): string {
  if (!rufname) return geraet;
  return `${rufname}${/[sxzß]$/i.test(rufname) ? '’' : 's'} ${geraet}`;
}
