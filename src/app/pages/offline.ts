import { signal } from '@angular/core';

// Offline-Backstage: Service Worker (scripts/build-sw.mjs) nur für Bandmitglieder registrieren,
// also erst beim Öffnen des Backstage-Bereichs – normale Besucher bleiben unberührt.
export const offlineReady = signal(false);

export function enableOffline(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || location.hostname === 'localhost') return;
  navigator.serviceWorker
    .register('/sw.js')
    .then(() => navigator.serviceWorker.ready)
    .then(() => offlineReady.set(true))
    .catch(() => undefined);
}
