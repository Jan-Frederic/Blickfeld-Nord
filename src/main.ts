import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { startZiel } from './app/data/app-start';
import { ladeZugang } from './app/data/zugang';
import { ONEDRIVE } from './app/data/onedrive-config';

// Installierte App: Bandmitglieder starten im Backstage (data/app-start.ts) – vor Angular, damit die vorgerenderte
// Backstage-Seite direkt lädt; sonst nur ?app=1 aus der Adresse nehmen.
function startOrt(): string | null {
  try {
    return startZiel({
      pfad: location.pathname,
      suche: location.search,
      imAppFenster: matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true,
      band: ONEDRIVE.bandOrdner,
      zugang: ladeZugang(),
      konto: !!localStorage.getItem('bn-onedrive-konto'),
      jetzt: Date.now(),
      online: navigator.onLine,
    });
  } catch {
    return null;
  }
}

const ziel = startOrt();
if (ziel?.startsWith('/backstage')) location.replace(ziel + location.hash);
else {
  if (ziel) history.replaceState(history.state, '', ziel + location.hash);
  bootstrapApplication(App, appConfig)
    .catch((err) => console.error(err));
}
