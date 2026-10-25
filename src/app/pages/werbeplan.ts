import { Component, computed, input, linkedSignal, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Show } from '../data/band.service';
import { kampagnenLink } from '../data/goatcounter';
import { erledigteSchritte, schrittText, setzeSchritt, werbeplan } from '../data/werbeplan';

// Backstage eines öffentlichen Auftritts: Werbeplan mit festen Terminen (4 Wochen vorher bis zum Auftrittstag).
// Je Schritt ein fertiger Text zum Kopieren (Link mit Herkunft „text“ und Kampagne) und ein Haken – der fällige,
// noch nicht abgehakte Schritt erscheint zusätzlich unter Aufgaben.
@Component({
  selector: 'app-werbeplan',
  imports: [MatIconModule],
  template: `
    <section class="plan" aria-labelledby="werbeplan-titel">
      <h3 id="werbeplan-titel"><mat-icon>campaign</mat-icon> Werbeplan</h3>
      <ol>
        @for (x of schritte(); track x.schritt.id) {
          <li [class]="x.status" [class.erledigt]="erledigt().includes(x.schritt.id)" [attr.aria-current]="x.status === 'jetzt' ? 'step' : null">
            <input type="checkbox" [id]="'wp-' + x.schritt.id" [checked]="erledigt().includes(x.schritt.id)" (change)="haken(x.schritt.id, $any($event.target).checked)" />
            <label class="datum" [for]="'wp-' + x.schritt.id">{{ datum(x.datum) }}</label>
            <span class="was"><strong>{{ x.schritt.titel }}</strong> {{ x.schritt.text }}</span>
            <button type="button" class="kopieren" (click)="kopieren(x.schritt.id)" [attr.aria-label]="'Text für „' + x.schritt.titel + '“ kopieren'">
              <mat-icon>{{ kopiert() === x.schritt.id ? 'check' : 'content_copy' }}</mat-icon>
            </button>
          </li>
        }
      </ol>
      <p class="foot">Haken setzen, wenn erledigt – dann verschwindet der Schritt aus den Aufgaben. Kopierte Texte enthalten den
        Link mit Kampagne; Plakat und Story-Bild oben auf dieser Seite.</p>
    </section>
  `,
  styles: `
    .plan { margin: 24px 0; padding: 16px 18px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 1rem; }
    h3 mat-icon { color: var(--bn-sunset); }
    ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    li { display: grid; grid-template-columns: auto 6.5em 1fr auto; align-items: start; gap: 10px; padding: 8px 10px; border-radius: 8px; font-size: .88rem; }
    input { margin: 3px 0 0; accent-color: var(--bn-sunset); }
    .datum { font-variant-numeric: tabular-nums; color: var(--bn-fog); cursor: pointer; }
    .was strong { display: block; font-weight: 500; color: var(--bn-ink); }
    .was { color: var(--bn-fog); }
    .jetzt { background: rgba(232, 164, 106, .12); outline: 1px solid var(--bn-sunset); }
    .jetzt strong, .jetzt .datum { color: var(--bn-sunset); }
    .vorbei, .erledigt { opacity: .55; }
    .erledigt strong { text-decoration: line-through; }
    .kopieren { display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid var(--bn-line); border-radius: 50%; background: none; color: var(--bn-ink); cursor: pointer; }
    .kopieren:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .kopieren mat-icon { font-size: 18px; width: 18px; height: 18px; }
    @media (max-width: 520px) {
      li { grid-template-columns: auto 1fr auto; row-gap: 2px; }
      .was { grid-column: 2; grid-row: 2; }
      .kopieren { grid-column: 3; grid-row: 1 / 3; }
    }
    .foot { margin: 12px 0 0; font-size: .78rem; color: var(--bn-fog); }
  `,
})
export class Werbeplan {
  readonly show = input.required<Show>();
  /** Auftritts-ID (Datum, ggf. mit laufender Nummer) */
  readonly id = input.required<string>();
  protected readonly schritte = computed(() => werbeplan(this.show().date, new Date().toISOString().slice(0, 10)));
  protected readonly erledigt = linkedSignal(() => erledigteSchritte(this.id()));
  protected readonly kopiert = signal<string | null>(null);

  protected haken(schritt: string, an: boolean): void {
    this.erledigt.set(setzeSchritt(this.id(), schritt, an));
  }

  protected async kopieren(schritt: string): Promise<void> {
    const text = schrittText(schritt, this.show(), kampagnenLink(this.id(), 'text'));
    try {
      await navigator.clipboard.writeText(text);
      this.kopiert.set(schritt);
      setTimeout(() => this.kopiert.set(null), 2000);
    } catch {
      window.prompt('Text kopieren:', text);
    }
  }

  protected datum(d: string): string {
    const [j, m, t] = d.split('-');
    return `${['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date(`${d}T12:00:00`).getDay()]}, ${t}.${m}.${j.slice(2)}`;
  }
}
