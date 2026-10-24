import { DestroyRef, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

// Reichweitenmessung mit GoatCounter (ohne Cookies, keine IP-Speicherung; Skript in index.html).
// Die Seite wechselt Unterseiten ohne Neuladen – daher wird jeder Seitenwechsel hier selbst gezählt.
// Backstage wird nicht gezählt.
//
// Herkunft: QR-Codes auf Plakat, Story und QR-Karte hängen ?ref=… an (siehe HERKUNFT). GoatCounter zeigt den Wert
// selbst unter „Referrers“; zusätzlich zählt hier ein Ereignis „von-…“, das der Backstage über den öffentlichen
// Zähler abfragen kann. Danach verschwindet der Vermerk aus der Adresse – geteilte Links zählen nicht doppelt.
declare global {
  interface Window {
    goatcounter?: { count?: (vars: { path: string; title?: string; event?: boolean }) => void };
  }
}

/** erlaubte Herkunftsvermerke (?ref=…) mit Bezeichnung für den Backstage */
export const HERKUNFT = [
  { ref: 'plakat', label: 'Plakat (QR-Code)' },
  { ref: 'story', label: 'Story / Status (QR-Code)' },
  { ref: 'qr-karte', label: 'QR-Karte & Flyer' },
  { ref: 'banner', label: 'Banner' },
] as const;

function herkunft(): string | undefined {
  const ref = new URLSearchParams(location.search).get('ref') ?? '';
  return HERKUNFT.some((h) => h.ref === ref) ? ref : undefined;
}

// Vermerk aus der Adresszeile nehmen (Seite und übrige Parameter bleiben)
function ohneHerkunft(): void {
  const url = new URL(location.href);
  url.searchParams.delete('ref');
  history.replaceState(history.state, '', url.pathname + url.search + url.hash);
}

let ersterAufruf = true;

function count(path: string, attempts = 40): void {
  const counter = window.goatcounter?.count;
  if (counter) {
    counter({ path });
    if (ersterAufruf) {
      ersterAufruf = false;
      const ref = herkunft();
      if (ref) counter({ path: `von-${ref}`, title: `Herkunft: ${ref}`, event: true });
      if (new URLSearchParams(location.search).has('ref')) ohneHerkunft();
    }
  } else if (attempts > 0) {
    // Skript lädt asynchron – kurz warten (max. ~4 s); bei Werbeblockern bleibt es still
    setTimeout(() => count(path, attempts - 1), 100);
  }
}

export function trackPageViews(): void {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
  const sub = inject(Router)
    .events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
    .subscribe((e) => {
      const path = e.urlAfterRedirects.split(/[?#]/)[0] || '/';
      if (!path.startsWith('/backstage')) count(path);
    });
  inject(DestroyRef).onDestroy(() => sub.unsubscribe());
}
