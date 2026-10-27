import { Component, computed, input } from '@angular/core';

/** Stand eines längeren Ablaufs; ohne gesamt läuft der Balken unbestimmt (z. B. beim Durchsuchen) */
export interface Stand {
  text: string;
  fertig?: number;
  gesamt?: number;
}

// Fortschrittsanzeige für längere Abläufe (Abgleich: Ordner/OneDrive durchsuchen, einlesen, sichern): Balken,
// „x von y“ und der aktuelle Schritt. Für Screenreader als Statusmeldung.
@Component({
  selector: 'app-fortschritt',
  template: `
    <div class="fortschritt" role="status" aria-live="polite">
      @if (stand().gesamt) {
        <progress [value]="stand().fertig ?? 0" [max]="stand().gesamt!" [attr.aria-label]="stand().text"></progress>
      } @else {
        <progress [attr.aria-label]="stand().text"></progress>
      }
      <span class="text">{{ stand().text }}@if (stand().gesamt) { <b>{{ stand().fertig ?? 0 }} / {{ stand().gesamt }} · {{ prozent() }} %</b> }</span>
    </div>
  `,
  styles: `
    .fortschritt { display: grid; gap: 4px; width: 100%; max-width: 520px; margin: 12px 0 0; }
    progress { width: 100%; height: 8px; border: 0; border-radius: 4px; background: rgba(255, 255, 255, .08); accent-color: var(--bn-sunset); overflow: hidden; }
    progress::-webkit-progress-bar { background: rgba(255, 255, 255, .08); }
    progress::-webkit-progress-value { background: var(--bn-sunset); border-radius: 4px; }
    progress::-moz-progress-bar { background: var(--bn-sunset); }
    .text { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2px 10px; font-size: .8rem; color: var(--bn-fog); overflow-wrap: anywhere; }
    b { font-weight: 500; color: var(--bn-ink); font-variant-numeric: tabular-nums; }
  `,
})
export class Fortschritt {
  readonly stand = input.required<Stand>();
  protected readonly prozent = computed(() => {
    const s = this.stand();
    return s.gesamt ? Math.round(((s.fertig ?? 0) / s.gesamt) * 100) : 0;
  });
}
