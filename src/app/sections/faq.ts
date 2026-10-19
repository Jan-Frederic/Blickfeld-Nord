import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FAQ } from '../data/faq';

// Häufige Fragen von Veranstaltern auf Deutsch, Englisch und Niederländisch (Inhalte: src/app/data/faq.ts)
@Component({
  selector: 'app-faq',
  imports: [RouterLink, MatIconModule],
  template: `
    <h3>{{ faq().title }}</h3>
    @for (f of faq().items; track f.q) {
      <details>
        <summary>{{ f.q }}</summary>
        <p>
          {{ f.a }}
          @if (f.link) { <a class="faq-link" [routerLink]="f.link.to">{{ f.link.label }} <mat-icon>arrow_forward</mat-icon></a> }
        </p>
      </details>
    }
  `,
  styles: `
    :host { display: block; }
    h3 {
      font-family: var(--bn-display); font-weight: 400; font-size: 1.1rem; text-transform: uppercase;
      letter-spacing: .08em; margin: 0 0 12px;
    }
    details { border-top: 1px solid var(--bn-line); }
    details:last-child { border-bottom: 1px solid var(--bn-line); }
    summary { cursor: pointer; list-style: none; padding: 16px 32px 16px 0; position: relative; font-weight: 500; }
    summary::-webkit-details-marker { display: none; }
    summary::after {
      content: '+'; position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
      color: var(--bn-sunset); font-size: 1.4rem; font-weight: 300; transition: transform .2s;
    }
    details[open] summary::after { transform: translateY(-50%) rotate(45deg); }
    summary:hover { color: var(--bn-sunset); }
    details p { margin: 0 0 16px; line-height: 1.65; color: rgba(236, 233, 228, .84); }
    .faq-link { display: inline-flex; align-items: center; gap: 4px; margin-left: 4px; color: var(--bn-sunset); white-space: nowrap; }
    .faq-link mat-icon { font-size: 16px; width: 16px; height: 16px; }
  `,
})
export class Faq {
  /** Sprache der Seite */
  readonly lang = input<'de' | 'en' | 'nl'>('de');
  protected readonly faq = computed(() => FAQ[this.lang()]);
}
