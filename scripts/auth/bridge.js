// Antwortseite der Microsoft-Anmeldung (/auth/): gibt das Ergebnis an die Backstage-Seite weiter (Popup bzw.
// unsichtbarer Rahmen beim stillen Anmelden) – siehe src/app/data/onedrive.ts
import { broadcastResponseToMainFrame } from '@azure/msal-browser/redirect-bridge';

broadcastResponseToMainFrame().catch(() => {
  document.body.textContent = 'Anmeldung abgeschlossen – dieses Fenster kann geschlossen werden.';
});
