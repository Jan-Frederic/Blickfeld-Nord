// Antwortseite der Microsoft-Anmeldung (/auth/): gibt das Ergebnis an die Backstage-Seite weiter (Popup bzw.
// unsichtbarer Rahmen beim stillen Anmelden) – siehe src/app/data/onedrive.ts
import { broadcastResponseToMainFrame } from '@azure/msal-browser/redirect-bridge';

// „Antwort ist da“ für die Seite, die das Fenster geöffnet hat (bn-auth-antwort, data/onedrive.ts): Geht das Fenster
// danach zu, war die Anmeldung kein Abbruch – die Seite wartet dann, bis der Zugang abgeholt ist
try {
  localStorage.setItem('bn-auth-antwort', String(Date.now()));
} catch {
  // ohne Speicher wartet die Seite eben bis zur Zeitgrenze
}

broadcastResponseToMainFrame().catch(() => {
  document.body.textContent = 'Die Anmeldung ließ sich nicht an die App übergeben. Dieses Fenster schließen und in der App „Ohne Pop-up anmelden“ wählen.';
});
