import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { werbeplan } from '../data/werbeplan';

// Backstage eines öffentlichen Auftritts: Werbeplan mit festen Terminen (4 Wochen vorher bis zum Auftrittstag).
// Der fällige Schritt erscheint zusätzlich unter Aufgaben.
@Component({
  selector: 'app-werbeplan',
  imports: [MatIconModule],
  template: `
    <section class="plan" aria-labelledby="werbeplan-titel">
      <h3 id="werbeplan-titel"><mat-icon>campaign</mat-icon> Werbeplan</h3>
      <ol>
        @for (x of schritte(); track x.schritt.id) {
          <li [class]="x.status" [attr.aria-current]="x.status === 'jetzt' ? 'step' : null">
            <span class="datum">{{ datum(x.datum) }}</span>
            <span class="was"><strong>{{ x.schritt.titel }}</strong> {{ x.schritt.text }}</span>
          </li>
        }
      </ol>
      <p class="foot">Plakat, Story und Instagram-Text oben auf dieser Seite – immer frisch erzeugen, dann zählt die Kampagne mit.</p>
    </section>
  `,
  styles: `
    .plan { margin: 24px 0; padding: 16px 18px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 1rem; }
    h3 mat-icon { color: var(--bn-sunset); }
    ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    li { display: grid; grid-template-columns: 6.5em 1fr; gap: 10px; padding: 8px 10px; border-radius: 8px; font-size: .88rem; }
    .datum { font-variant-numeric: tabular-nums; color: var(--bn-fog); }
    .was strong { display: block; font-weight: 500; }
    .was { color: var(--bn-fog); }
    .was strong, .jetzt .datum { color: var(--bn-ink); }
    .jetzt { background: rgba(232, 164, 106, .12); outline: 1px solid var(--bn-sunset); }
    .jetzt strong { color: var(--bn-sunset); }
    .vorbei { opacity: .55; }
    .foot { margin: 12px 0 0; font-size: .78rem; color: var(--bn-fog); }
  `,
})
export class Werbeplan {
  /** Datum des Auftritts (JJJJ-MM-TT) */
  readonly datumAuftritt = input.required<string>({ alias: 'datum' });
  protected readonly schritte = computed(() => werbeplan(this.datumAuftritt(), new Date().toISOString().slice(0, 10)));
  protected datum(d: string): string {
    const [j, m, t] = d.split('-');
    return `${['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date(`${d}T12:00:00`).getDay()]}, ${t}.${m}.${j.slice(2)}`;
  }
}
