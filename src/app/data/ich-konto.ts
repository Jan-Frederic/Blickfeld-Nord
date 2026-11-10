import { Mitglied, ichAusKonto } from './band-ich';
import { neuZeichnen } from './neu-zeichnen';
import { oneDriveEingerichtet, oneDriveKonto } from './onedrive';
import { statusMigrieren } from './uebe-status';

// „Ich bin …“ automatisch aus dem Microsoft-Konto (Name bzw. Teil vor dem @, siehe band-ich.ts mitgliedZuKonto).
// Aufgerufen nach der Anmeldung (Zugangsseite, Einstellungen → Synchronisation) und einmal je Seitenaufruf aus dem
// Backstage-Wächter – lazy, damit MSAL nicht im Haupt-Bundle landet. Eine Wahl von Hand bleibt immer.
export async function ichAusMicrosoft(mitglieder: Mitglied[], konto?: { name?: string; username?: string } | null): Promise<void> {
  if (!oneDriveEingerichtet()) return;
  const k = konto === undefined ? await oneDriveKonto() : konto;
  if (!ichAusKonto(mitglieder, k)) return;
  // neue Person: einmalig vom alten Stand umstellen, offene Seite mit der neuen Person neu aufbauen
  statusMigrieren();
  neuZeichnen();
}
