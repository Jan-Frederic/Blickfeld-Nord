import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { arrivalTime, DEFAULT_BUFFER } from '../data/trip';
import { aufbauPlan, zuKnapp } from '../data/zeitplan';

// Aufbau-Zeitplan unter „Vor Ort“: vom Beginn rückwärts (src/app/data/zeitplan.ts)
@Component({
  selector: 'app-aufbau-zeitplan',
  imports: [MatIconModule],
  template: `
    <div class="plan">
      <h4><mat-icon>schedule</mat-icon> Aufbau-Zeitplan</h4>
      @if (plan().length) {
        <ol>
          @for (s of plan(); track s.was) { <li><time>{{ s.zeit }}</time> {{ s.was }}</li> }
        </ol>
        @if (knapp()) { <p class="warn"><mat-icon>warning</mat-icon> Die vereinbarte Ankunft ({{ ankunft() }} Uhr) lässt weniger als 3 Stunden für den Aufbau.</p> }
        <p class="hint">Richtwerte nach dem Technik-Rider (Aufbau ca. 3 Stunden vor Beginn).</p>
      } @else {
        <p class="hint">Für den Zeitplan fehlt beim Termin die Uhrzeit.</p>
      }
    </div>
  `,
  styles: `
    .plan { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--bn-line); }
    h4 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-family: var(--bn-wide); font-weight: 400; text-transform: uppercase; letter-spacing: .14em; font-size: .78rem; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--bn-sunset); }
    ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
    li { display: flex; gap: 14px; font-size: .92rem; }
    time { min-width: 3.2em; color: var(--bn-sunset); font-variant-numeric: tabular-nums; }
    .warn { display: flex; align-items: center; gap: 8px; margin: 12px 0 0; color: #e0b25a; font-size: .88rem; }
    .warn mat-icon { color: #e0b25a; }
    .hint { margin: 10px 0 0; font-size: .8rem; color: var(--bn-fog); }
  `,
})
export class AufbauZeitplan {
  readonly beginn = input<string>();
  readonly values = input.required<Record<string, string | undefined>>();
  protected readonly ankunft = computed(() => arrivalTime(this.values()));
  protected readonly plan = computed(() => aufbauPlan(this.beginn(), Number(this.values()['fahrzeit']) || undefined, Number(this.values()['puffer'] ?? DEFAULT_BUFFER)));
  protected readonly knapp = computed(() => zuKnapp(this.beginn(), this.ankunft()));
}
