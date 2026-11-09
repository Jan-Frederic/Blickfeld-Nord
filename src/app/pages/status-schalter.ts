import { Component, input, output } from '@angular/core';
import { STATUS, UebeStatus } from '../data/uebe-status';

// Status-Umschalter: die fünf Übe-Status nebeneinander, der aktuelle farbig – überall gleich: Kopfleiste der
// Notenansicht (Übe- und Probe-Modus), Titelanzeige im Übe-Modus, Probe-Leiste. „kopf“: schon unter 1200 px nur die
// Zeichen ○ ✎ ↻ ✓ ✓✓ (Platz in der Kopfleiste), sonst erst auf dem Handy. Styles global (styles.scss).
@Component({
  selector: 'app-status-schalter',
  host: { '[class.kopf]': 'kopf()' },
  template: `
    <span class="schalter" role="group" aria-label="Übe-Status">
      @for (st of liste; track st.id) {
        <button type="button" [class]="'wertung ' + st.id" [class.an]="status() === st.id" [attr.aria-pressed]="status() === st.id" [attr.aria-label]="st.label"
          [title]="st.label + (st.id === 'sitzt' && weiter() ? ' – sitzt er schon, einen Kasten weiter' : '')" [disabled]="gesperrt()" (click)="waehlen(st.id, $event)">
          <span class="z" aria-hidden="true">{{ st.zeichen }}</span><span class="l">{{ st.label }}</span>
        </button>
      }
    </span>
  `,
})
export class StatusSchalter {
  readonly status = input<UebeStatus | null>(null);
  readonly gesperrt = input(false);
  readonly kopf = input(false);
  /** Übe-Modus: „Sitzt“ bei sitzendem Song schiebt weiter (nur für den Tooltip) */
  readonly weiter = input(false);
  readonly gewaehlt = output<UebeStatus>();
  protected readonly liste = STATUS;
  protected waehlen(s: UebeStatus, e: Event): void {
    e.stopPropagation();
    this.gewaehlt.emit(s);
  }
}
