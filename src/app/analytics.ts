import { DestroyRef, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

// Reichweitenmessung mit GoatCounter (ohne Cookies, keine IP-Speicherung; Skript in index.html).
// Die Seite wechselt Unterseiten ohne Neuladen – daher wird jeder Seitenwechsel hier selbst gezählt.
// Backstage wird nicht gezählt.
declare global {
  interface Window {
    goatcounter?: { count?: (vars: { path: string }) => void };
  }
}

function count(path: string, attempts = 40): void {
  const counter = window.goatcounter?.count;
  if (counter) {
    counter({ path });
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
