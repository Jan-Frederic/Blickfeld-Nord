import { Component, input, output, signal } from '@angular/core';
import { STATUS, UebeStatus } from '../data/uebe-status';

/** so lange leuchtet der gewählte Status auf (und so lange wartet der Übe-Modus, bevor er zur nächsten Karte wechselt) */
export const AUFLEUCHTEN_MS = 450;

// Status-Umschalter: die fünf Übe-Status nebeneinander, der aktuelle farbig – überall gleich: Kopfleiste der
// Notenansicht (Übe- und Probe-Modus), Titelanzeige im Übe-Modus, Probe-Leiste. „kopf“: schon unter 1200 px nur die
// Zeichen ○ ✎ ↻ ✓ ✓✓ (Platz in der Kopfleiste), sonst erst auf dem Handy. Ein Klick meldet den Status sofort (er gilt
// für den Song, der gerade zu sehen ist) und lässt ihn kurz aufleuchten (CSS-Animation, AUFLEUCHTEN_MS). Der Song
// bleibt danach stehen – auch im Übe-Modus (weiter per Wischen, Tippen, Pedal; setlist-buehne.ts). Styles global
// (styles.scss); die Animation läuft auch bei „weniger Bewegung“ (dann ohne sichtbares Pulsieren) und beendet das
// Aufleuchten.
@Component({
  selector: 'app-status-schalter',
  host: { '[class.kopf]': 'kopf()' },
  template: `
    <span class="schalter" role="group" aria-label="Übe-Status" [class.blitzt]="blitz() !== null">
      @for (st of liste; track st.id) {
        <button type="button" [class]="'wertung ' + st.id" [class.an]="(blitz() ?? status()) === st.id" [class.blitz]="blitz() === st.id" (animationend)="blitz.set(null)" [attr.aria-pressed]="(blitz() ?? status()) === st.id" [attr.aria-label]="st.label"
          [title]="titel(st.id, st.label)" [disabled]="gesperrt() || sperren().includes(st.id)" (click)="waehlen(st.id, $event)">
          <span class="z" aria-hidden="true">{{ st.zeichen }}</span><span class="l">{{ st.label }}</span>
        </button>
      }
    </span>
  `,
})
export class StatusSchalter {
  readonly status = input<UebeStatus | null>(null);
  readonly gesperrt = input(false);
  /** einzelne Status gesperrt (z. B. „Sitzt“ beim Tempo-Training unter 100 %) */
  readonly sperren = input<UebeStatus[]>([]);
  readonly kopf = input(false);
  /** Übe-Modus: gleicher Status noch einmal schiebt einen Kasten weiter (nur für den Tooltip) */
  readonly weiter = input(false);
  readonly gewaehlt = output<UebeStatus>();
  protected readonly liste = STATUS;
  /** gerade gewählter Status, der noch aufleuchtet */
  protected readonly blitz = signal<UebeStatus | null>(null);

  protected titel(id: UebeStatus, label: string): string {
    if (this.sperren().includes(id)) return label + ' – erst bei 100 % Tempo';
    if (!this.weiter()) return label;
    if (id === 'wackelt') return label + ' – wackelt er schon in Kasten 2, weiter nach 3';
    if (id === 'sitzt') return label + ' – sitzt er schon in Kasten 4, weiter nach 5';
    return label;
  }

  protected waehlen(s: UebeStatus, e: Event): void {
    e.stopPropagation();
    this.blitz.set(s);
    this.gewaehlt.emit(s);
  }
}
