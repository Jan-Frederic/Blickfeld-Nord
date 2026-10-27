// OneDrive im Backstage (Abgleich): App-Registrierung in Microsoft Entra (siehe PFLEGE.md, „OneDrive einrichten“).
// Die Client-ID ist kein Geheimnis – sie steht bei jeder Single-Page-App im Browser. Leer = OneDrive ausgeblendet.
// tenant: 'common' = private Microsoft-Konten und Firmen-/Schulkonten; für nur ein Firmenkonto die Tenant-ID.
export const ONEDRIVE = {
  clientId: '',
  tenant: 'common',
};
