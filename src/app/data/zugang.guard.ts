import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { BandService } from './band.service';
import { ichQuelle, ladeIch } from './band-ich';
import { ONEDRIVE } from './onedrive-config';
import { ladeZugang, zielAusUrl, zugangMerken, zugangStand } from './zugang';

// Wächter für alle Backstage-Seiten (außer /backstage/zugang): siehe data/zugang.ts.
let pruefLaeuft = false;
/** „Ich bin …“ aus dem Microsoft-Konto – einmal je Seitenaufruf, solange niemand von Hand gewählt ist */
let ichGeprueft = false;
function ichPruefen(): void {
  if (ichGeprueft || (ichQuelle() === 'hand' && ladeIch())) return;
  ichGeprueft = true;
  const mitglieder = inject(BandService).members;
  import('./ich-konto').then((m) => m.ichAusMicrosoft(mitglieder)).catch(() => undefined);
}

export const backstageZugang: CanActivateFn = (_route, state) => {
  if (typeof window === 'undefined') return true;
  const router = inject(Router);
  const band = ONEDRIVE.bandOrdner;
  const stand = zugangStand(band, ladeZugang(), Date.now(), navigator.onLine);
  if (stand !== 'anmelden') ichPruefen();
  if (stand === 'frei' || stand === 'ok') return true;
  if (stand === 'ok-pruefen') {
    // im Hintergrund – nur ein klares „nein“ schließt; ohne Anmeldung oder Netz bleibt das Gerät offen
    if (!pruefLaeuft && band) {
      pruefLaeuft = true;
      import('./onedrive')
        .then(async (o) => {
          if (!(await o.oneDriveKonto())) return;
          const r = await o.ordnerSichtbar(band.drive, band.item, true);
          if (r === 'ja') zugangMerken(band);
          if (r === 'nein') {
            zugangMerken(null);
            void router.navigate(['/backstage/zugang'], { queryParams: { ziel: router.url } });
          }
        })
        .catch(() => undefined)
        .finally(() => (pruefLaeuft = false));
    }
    return true;
  }
  const ziel = zielAusUrl(state.url);
  // die Anmeldeseite selbst (kommt beim ersten Aufruf über /backstage?auftritt=zugang)
  if (ziel.startsWith('/backstage/zugang')) return router.createUrlTree(['/backstage/zugang']);
  return router.createUrlTree(['/backstage/zugang'], { queryParams: { ziel } });
};
