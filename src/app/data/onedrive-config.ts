// OneDrive im Backstage (Abgleich): App-Registrierung in Microsoft Entra (siehe PFLEGE.md, „OneDrive einrichten“).
// Die Client-ID ist kein Geheimnis – sie steht bei jeder Single-Page-App im Browser. Leer = OneDrive ausgeblendet.
// tenant: 'consumers' = private Microsoft-Konten (Outlook.com, Hotmail, Live – privates OneDrive);
// 'common' wäre zusätzlich Firmen-/Schulkonten, eine Tenant-ID nur ein bestimmtes Firmenkonto.
export const ONEDRIVE = {
  clientId: '',
  tenant: 'consumers',
};
