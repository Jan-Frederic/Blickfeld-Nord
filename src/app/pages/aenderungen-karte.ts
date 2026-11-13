import { Component, computed, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AENDERUNGEN, GESEHEN_KEY } from '../data/aenderungen';

// Einstellungen → „Was ist neu“: der Change-Log (data/aenderungen.ts). Die letzten drei Tage offen, ältere auf Wunsch;
// was seit dem letzten Besuch dazukam, ist als „neu“ markiert (bn-aenderungen-gesehen, nur dieses Gerät).
@Component({
  selector: 'app-aenderungen-karte',
  imports: [MatIconModule],
  template: `
    <div class="box" id="neu">
      <h3><mat-icon>new_releases</mat-icon> Was ist neu</h3>
      @for (a of sichtbar(); track a.datum) {
        <section>
          <h4>{{ datum(a.datum) }}@if (a.datum > gesehen) { <span class="neu">neu</span> }</h4>
          <ul>@for (p of a.punkte; track p) { <li>{{ p }}</li> }</ul>
        </section>
      }
      @if (!alle() && aenderungen.length > 3) {
        <button type="button" (click)="alle.set(true)"><mat-icon>expand_more</mat-icon> Ältere Änderungen</button>
      }
    </div>
  `,
})
export class AenderungenKarte {
  protected readonly aenderungen = AENDERUNGEN;
  protected readonly alle = signal(false);
  protected readonly sichtbar = computed(() => (this.alle() ? AENDERUNGEN : AENDERUNGEN.slice(0, 3)));
  /** zuletzt gesehener Stand – davor gilt nichts als neu; danach gilt der neueste als gesehen */
  protected readonly gesehen = (() => {
    let g = '';
    try {
      g = localStorage.getItem(GESEHEN_KEY) ?? '';
      if (AENDERUNGEN[0]) localStorage.setItem(GESEHEN_KEY, AENDERUNGEN[0].datum);
    } catch {
      // ohne Speicher ist eben nichts markiert
    }
    // erster Besuch: nichts als neu markieren (sonst wäre alles neu)
    return g || '9999';
  })();
  protected datum(d: string): string {
    return new Date(`${d}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
