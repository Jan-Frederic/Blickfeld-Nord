import { DestroyRef, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { KAMPAGNE } from './data/goatcounter';

// Reichweitenmessung mit GoatCounter (ohne Cookies, keine IP-Speicherung; Skript in index.html).
// Die Seite wechselt Unterseiten ohne Neuladen – daher wird jeder Seitenwechsel hier selbst gezählt.
// Backstage wird nicht gezählt.
//
// Herkunft: QR-Codes auf Plakat, Story und QR-Karte hängen ?ref=… an (siehe HERKUNFT). GoatCounter zeigt den Wert
// selbst unter „Referrers“; zusätzlich zählt hier ein Ereignis „von-…“, das der Backstage über den öffentlichen
// Zähler abfragen kann. Danach verschwindet der Vermerk aus der Adresse – geteilte Links zählen nicht doppelt.
// Kampagne: Plakat, Story, Beitragstext und „Teilen“ eines Auftritts tragen zusätzlich utm_campaign=konzert-<ID> (GoatCounter:
// „Campaigns“); dazu zählt ein Ereignis „kampagne-konzert-<ID>-<Herkunft>“ für den Backstage des Auftritts.
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
  { ref: 'geteilt', label: 'Geteilter Konzert-Link' },
  { ref: 'text', label: 'Link im Beitragstext' },
] as const;

function herkunft(): string | undefined {
  const ref = new URLSearchParams(location.search).get('ref') ?? '';
  return HERKUNFT.some((h) => h.ref === ref) ? ref : undefined;
}

function kampagne(): string | undefined {
  const k = new URLSearchParams(location.search).get('utm_campaign') ?? '';
  return KAMPAGNE.test(k) ? k : undefined;
}

// Vermerk und Kampagne aus der Adresszeile nehmen (Seite und übrige Parameter bleiben)
function ohneHerkunft(): void {
  const url = new URL(location.href);
  url.searchParams.delete('ref');
  url.searchParams.delete('utm_campaign');
  history.replaceState(history.state, '', url.pathname + url.search + url.hash);
}

let ersterAufruf = true;
const SITZUNG = 'bn-herkunft';

/** GoatCounter-Ereignis zählen (z. B. eine Booking-Anfrage) – still, wenn GoatCounter fehlt (Werbeblocker, Backstage) */
export function zaehleEreignis(path: string, title: string): void {
  window.goatcounter?.count?.({ path, title, event: true });
}

/** Booking-Anfrage zählen – gesamt und nach Herkunft dieses Besuchs (QR-Code, Plakat …, sonst „direkt“) */
export function zaehleAnfrage(art: 'assistent' | 'mail'): void {
  let ref = 'direkt';
  try {
    ref = sessionStorage.getItem(SITZUNG) ?? 'direkt';
  } catch {
    // ohne Speicher eben „direkt“
  }
  zaehleEreignis(`anfrage-${art}`, `Booking-Anfrage (${art})`);
  zaehleEreignis(`anfrage-von-${ref}`, `Booking-Anfrage über ${ref}`);
}

function count(path: string, attempts = 40): void {
  const counter = window.goatcounter?.count;
  if (counter) {
    counter({ path });
    if (ersterAufruf) {
      ersterAufruf = false;
      const ref = herkunft();
      const k = kampagne();
      if (ref) counter({ path: `von-${ref}`, title: `Herkunft: ${ref}`, event: true });
      if (ref) {
        try {
          sessionStorage.setItem(SITZUNG, ref); // für zaehleAnfrage()
        } catch {
          // privater Modus o. Ä.
        }
      }
      if (k) counter({ path: `kampagne-${k}-${ref ?? 'direkt'}`, title: `Kampagne ${k} (${ref ?? 'direkt'})`, event: true });
      const q = new URLSearchParams(location.search);
      if (q.has('ref') || q.has('utm_campaign')) ohneHerkunft();
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
