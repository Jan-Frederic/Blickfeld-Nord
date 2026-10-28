// OneDrive im Backstage (Abgleich): App-Registrierung in Microsoft Entra (siehe PFLEGE.md, „OneDrive einrichten“).
// Die Client-ID ist kein Geheimnis – sie steht bei jeder Single-Page-App im Browser. Leer = auf dem Gerät eintragen.
// tenant: 'consumers' = private Microsoft-Konten (Outlook.com, Hotmail, Live – privates OneDrive);
// 'common' wäre zusätzlich Firmen-/Schulkonten, eine Tenant-ID nur ein bestimmtes Firmenkonto.
export const ONEDRIVE = {
  clientId: 'fdaed256-3673-4744-ab09-57e06b8d2a1e',
  tenant: 'consumers',
};

const GERAET_KEY = 'bn-onedrive-client';

/** Client-ID: aus dem Code, sonst die auf diesem Gerät eingetragene (Backstage → Einstellungen) */
export function clientId(): string {
  if (ONEDRIVE.clientId) return ONEDRIVE.clientId;
  try {
    return localStorage.getItem(GERAET_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
}

export function clientIdSetzen(id: string): void {
  try {
    if (id.trim()) localStorage.setItem(GERAET_KEY, id.trim());
    else localStorage.removeItem(GERAET_KEY);
  } catch {
    // ohne Speicher keine Einstellung
  }
}
