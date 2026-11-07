import { signal } from '@angular/core';

// Ansicht neu aufbauen, wenn der Abgleich Daten anderer Geräte gebracht hat: Die Seiten lesen ihren Stand beim Öffnen
// aus dem Speicher (Werbeplan, Setlist, Packliste …) – ohne Neuaufbau zeigten sie bis zum nächsten Öffnen den alten
// Stand. Die App blendet dafür die geroutete Seite kurz aus und wieder ein (Scroll-Position bleibt). Klein und ohne
// Abhängigkeiten, weil die App-Schale (auch auf öffentlichen Seiten) es einbindet.
export const ansichtAus = signal(false);

export function neuZeichnen(): void {
  if (typeof window === 'undefined' || ansichtAus()) return;
  const y = window.scrollY;
  ansichtAus.set(true);
  requestAnimationFrame(() => {
    ansichtAus.set(false);
    // nach dem Neuaufbau (Daten laden teils kurz nach) wieder an dieselbe Stelle
    let n = 0;
    const zurueck = () => {
      window.scrollTo(0, y);
      if (Math.abs(window.scrollY - y) > 2 && n++ < 20) setTimeout(zurueck, 50);
    };
    requestAnimationFrame(zurueck);
  });
}

// Seiten, die neue Daten selbst einlesen können (Suche, Filter, Scrollposition bleiben): sie melden sich hier an –
// dann baut der Abgleich die Seite nicht neu auf, sondern ruft nur das Auffrischen auf.
const auffrischer = new Set<() => void>();
export function auffrischenAnmelden(fn: () => void): () => void {
  auffrischer.add(fn);
  return () => auffrischer.delete(fn);
}
/** true, wenn die offene Seite selbst auffrischt (dann kein Neuaufbau nötig) */
export function selbstAuffrischen(): boolean {
  if (!auffrischer.size) return false;
  for (const fn of auffrischer) fn();
  return true;
}

// Wann hat die Person zuletzt etwas getan (tippen, klicken, scrollen)? Während der Arbeit kein Neuaufbau
let zuletztAktiv = 0;
if (typeof window !== 'undefined') {
  for (const art of ['pointerdown', 'keydown', 'wheel', 'touchmove', 'scroll', 'input'])
    window.addEventListener(art, () => (zuletztAktiv = Date.now()), { passive: true, capture: true });
}
export const kuerzlichAktiv = (ms = 60_000) => Date.now() - zuletztAktiv < ms;
