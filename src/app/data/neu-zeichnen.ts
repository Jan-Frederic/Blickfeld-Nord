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
