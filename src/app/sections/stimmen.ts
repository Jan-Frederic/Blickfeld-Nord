import { Component, inject } from '@angular/core';
import { STIMMEN } from '../data/stimmen';
import { I18n, tr } from '../i18n';

// „Das sagen Veranstalter“ (Booking und Pressekit) – freigegebene Zitate aus data/stimmen.ts; ohne Einträge unsichtbar
const TEXT = tr(
  { kicker: 'Stimmen', title: 'Das sagen Veranstalter' },
  { kicker: 'Feedback', title: 'What hosts say' },
  { kicker: 'Reacties', title: 'Wat organisatoren zeggen' },
);

@Component({
  selector: 'app-stimmen',
  template: `
    @if (stimmen.length) {
      <section class="stimmen" aria-labelledby="stimmen-title">
        <p class="kicker">{{ t().kicker }}</p>
        <h3 id="stimmen-title">{{ t().title }}</h3>
        <div class="liste">
          @for (s of stimmen; track s.zitat) {
            <figure>
              <blockquote lang="de">„{{ s.zitat }}“</blockquote>
              <figcaption>{{ s.wer }}@if (s.anlass) { <span> · {{ s.anlass }}</span> }</figcaption>
            </figure>
          }
        </div>
      </section>
    }
  `,
  styles: `
    .stimmen { margin-top: 40px; }
    .kicker { margin-bottom: 4px; }
    h3 { font-family: var(--bn-display); font-weight: 400; font-size: 1.1rem; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 14px; }
    .liste { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); }
    figure { margin: 0; padding: 18px 20px; border-left: 3px solid var(--bn-sunset); border-radius: 0 10px 10px 0; background: rgba(255, 255, 255, .03); }
    blockquote { margin: 0 0 10px; font-size: 1.02rem; line-height: 1.55; }
    figcaption { font-size: .85rem; color: var(--bn-fog); }
  `,
})
export class Stimmen {
  protected readonly t = inject(I18n).t(TEXT);
  protected readonly stimmen = STIMMEN;
}
