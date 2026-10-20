import { signal } from '@angular/core';

// Progressive Web App: Service Worker (scripts/build-sw.mjs) für Offline-Nutzung und Installation auf dem Homescreen.
// Seiten kommen immer zuerst aus dem Netz (aktuell), ohne Netz aus dem Speicher.
export const offlineReady = signal(false);
// Chrome/Edge/Android: Installationsdialog, den wir per Button auslösen
export const installable = signal(false);
// iPhone/iPad: Safari hat keinen Installationsdialog – dort Hinweis „Teilen → Zum Home-Bildschirm“
export const iosHint = signal(false);

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
let deferred: InstallPrompt | null = null;

export function enableOffline(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || location.hostname === 'localhost') return;
  navigator.serviceWorker
    .register('/sw.js')
    .then(() => navigator.serviceWorker.ready)
    .then(() => offlineReady.set(true))
    .catch(() => undefined);
}

export function setupPwa(): void {
  if (typeof window === 'undefined') return;
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  if (standalone) return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPrompt;
    installable.set(true);
  });
  window.addEventListener('appinstalled', () => installable.set(false));
  iosHint.set(/iphone|ipad|ipod/i.test(navigator.userAgent));
}

export async function install(): Promise<void> {
  if (!deferred) return;
  await deferred.prompt();
  await deferred.userChoice;
  deferred = null;
  installable.set(false);
}
