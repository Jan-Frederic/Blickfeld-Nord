import { signal } from '@angular/core';

// Progressive Web App: Service Worker (scripts/build-sw.mjs) für Offline-Nutzung und Installation auf dem Homescreen.
// Seiten kommen immer zuerst aus dem Netz (aktuell), ohne Netz aus dem Speicher.
export const offlineReady = signal(false);
// Chrome/Edge/Android: Installationsdialog, den wir per Button auslösen
export const installable = signal(false);
// iPhone/iPad: Safari hat keinen Installationsdialog – dort Hinweis „Teilen → Zum Home-Bildschirm“
export const iosHint = signal(false);
// während der Nutzung ist eine neue Version angekommen → Hinweis „Neu laden“
export const updateReady = signal(false);

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
let deferred: InstallPrompt | null = null;

export function enableOffline(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || location.hostname === 'localhost') return;
  // Gab es beim Start schon einen Service Worker, ist ein späterer Wechsel ein Update (beim allerersten Besuch nicht)
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) updateReady.set(true);
  });
  navigator.serviceWorker
    .register('/sw.js')
    .then((reg) => {
      // installierte Apps bleiben oft tagelang im Hintergrund offen: beim Zurückholen nach Updates fragen
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => undefined);
      });
      return navigator.serviceWorker.ready;
    })
    .then(() => offlineReady.set(true))
    .catch(() => undefined);
}

// Fehlende Programmdatei (alte Version läuft noch, Server hat schon die neue): Zielseite einmal komplett neu laden.
// Höchstens einmal pro Minute, damit ein echter Fehler (z. B. offline) nicht in einer Endlosschleife endet.
export function reloadOnMissingChunk(error: unknown, url: string): void {
  const message = String((error as Error)?.message ?? error);
  if (!/dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(message)) return;
  const KEY = 'bn-chunk-reload';
  try {
    if (Date.now() - Number(sessionStorage.getItem(KEY) ?? 0) < 60_000) return;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // ohne sessionStorage trotzdem einmal neu laden
  }
  location.assign(url);
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
