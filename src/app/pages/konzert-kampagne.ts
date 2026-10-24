import { Component, effect, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { GC, kampagne, zaehler } from '../data/goatcounter';

// Backstage eines öffentlichen Auftritts: Wie viele sind über Plakat, Story oder einen geteilten Link zur Konzertseite
// gekommen? Ereignisse „kampagne-konzert-<ID>-<Herkunft>“ aus analytics.ts, dazu die Aufrufe der Konzertseite.
const WEGE = [
  { ref: 'plakat', label: 'Plakat (QR-Code)' },
  { ref: 'story', label: 'Story / Status (QR-Code)' },
  { ref: 'text', label: 'Link im Beitragstext' },
  { ref: 'geteilt', label: 'Geteilter Link' },
];

type State = 'loading' | 'ok' | 'aus';

@Component({
  selector: 'app-konzert-kampagne',
  imports: [DecimalPipe, MatIconModule],
  template: `
    <section class="kampagne" aria-labelledby="kampagne-titel">
      <h3 id="kampagne-titel"><mat-icon>campaign</mat-icon> Kampagne „{{ name() }}“</h3>
      @switch (state()) {
        @case ('loading') { <p class="note">Zahlen werden geladen …</p> }
        @case ('aus') { <p class="note">Keine Zahlen – offline, Werbeblocker oder öffentlicher Zähler in GoatCounter nicht freigeschaltet (siehe Besucher).</p> }
        @default {
          <ul>
            <li><span class="wert">{{ seite() | number: '1.0-0' }}</span><span class="was">Aufrufe der Konzertseite (DE/EN/NL)</span></li>
            @for (w of wege(); track w.ref) {
              <li><span class="wert">{{ w.count | number: '1.0-0' }}</span><span class="was">über {{ w.label }}</span></li>
            }
          </ul>
        }
      }
      <p class="foot">
        Plakat, Story, kopierter Beitragstext und „Teilen“ auf der Konzertseite tragen die Kampagne im Link · 12 Monate, aktualisiert alle paar
        Stunden · <a [href]="gc + '/campaigns'" target="_blank" rel="noopener">alle Kampagnen in GoatCounter</a>
      </p>
    </section>
  `,
  styles: `
    .kampagne { margin: 24px 0; padding: 16px 18px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 1rem; }
    h3 mat-icon { color: var(--bn-sunset); }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
    li { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 10px; background: rgba(255, 255, 255, .04); }
    .wert { font: 600 1.3rem/1.2 Inter, sans-serif; }
    .was, .note, .foot { font-size: .8rem; color: var(--bn-fog); }
    .note { margin: 0; }
    .foot { margin: 12px 0 0; }
    a { color: var(--bn-sunset); }
  `,
})
export class KonzertKampagne {
  /** Auftritts-ID (Datum, ggf. mit laufender Nummer) */
  readonly id = input.required<string>();
  protected readonly gc = GC;
  protected readonly name = () => kampagne(this.id());
  protected readonly state = signal<State>('loading');
  protected readonly seite = signal(0);
  protected readonly wege = signal<{ ref: string; label: string; count: number }[]>([]);

  constructor() {
    effect(() => {
      const id = this.id();
      this.state.set('loading');
      Promise.all([
        Promise.all(['', '/en', '/nl'].map((l) => zaehler(`${l}/konzerte/${id}`, 'year'))).then((z) => z.reduce((a, b) => a + b, 0)),
        Promise.all(WEGE.map(async (w) => ({ ...w, count: await zaehler(`kampagne-${kampagne(id)}-${w.ref}`, 'year') }))),
      ])
        .then(([seite, wege]) => {
          this.seite.set(seite);
          this.wege.set(wege);
          this.state.set('ok');
        })
        .catch(() => this.state.set('aus'));
    });
  }
}
