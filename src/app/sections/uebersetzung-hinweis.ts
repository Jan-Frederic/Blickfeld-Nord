import { Component, inject, input } from '@angular/core';
import { I18n, tr } from '../i18n';
import { Uebersetzungsstand } from '../content';

const TEXT = tr(
  { ungeprueft: '', fehlt: '' },
  {
    ungeprueft: 'Translated from German – not yet proofread by the band.',
    fehlt: 'This text is only available in German.',
  },
  {
    ungeprueft: 'Vertaald uit het Duits – nog niet nagelezen door de band.',
    fehlt: 'Deze tekst is alleen in het Duits beschikbaar.',
  },
);

// Kleiner Hinweis unter übersetzten Inhalten: noch nicht gegengelesen bzw. nur auf Deutsch vorhanden
@Component({
  selector: 'app-uebersetzung-hinweis',
  template: `
    @if (status() === 'ungeprueft' || status() === 'fehlt') {
      <p class="hint"><span class="material-icons" aria-hidden="true">translate</span> {{ t()[status() === 'fehlt' ? 'fehlt' : 'ungeprueft'] }}</p>
    }
  `,
  styles: `
    .hint { display: flex; align-items: center; gap: 6px; margin: 8px 0 0; font-size: .8rem; color: var(--bn-fog); }
    .material-icons { font-size: 16px; }
  `,
})
export class UebersetzungHinweis {
  readonly status = input.required<Uebersetzungsstand>();
  protected readonly t = inject(I18n).t(TEXT);
}
