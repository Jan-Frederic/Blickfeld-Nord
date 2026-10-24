import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Faq } from '../sections/faq';
import { FAQ } from '../data/faq';
import { I18n, LocPipe, tr } from '../i18n';

// Eigene Unterseite /faq: häufige Fragen von Veranstaltern (Inhalte: src/app/data/faq.ts), danach der Weg zur Anfrage
const TEXT = tr(
  { kicker: 'Für Veranstalter', lead: 'Antworten auf die Fragen, die uns am häufigsten gestellt werden.', more: 'Eure Frage ist nicht dabei? Schreibt uns – oder schaut direkt nach freien Terminen.', booking: 'Zum Booking' },
  { kicker: 'For organisers', lead: 'Answers to the questions we are asked most often.', more: "Your question isn't here? Write to us – or check our free dates right away.", booking: 'Go to booking' },
  { kicker: 'Voor organisatoren', lead: 'Antwoorden op de vragen die ons het vaakst worden gesteld.', more: 'Staat jullie vraag er niet bij? Schrijf ons – of bekijk meteen onze vrije data.', booking: 'Naar boeken' },
);

@Component({
  selector: 'app-faq-page',
  imports: [RouterLink, MatIconModule, LocPipe, Faq],
  template: `
    <section class="section faq-page">
      <p class="kicker">{{ t().kicker }}</p>
      <h2>{{ titel() }}</h2>
      <p class="lead">{{ t().lead }}</p>
      <app-faq [titel]="false" />
      <div class="more">
        <p>{{ t().more }}</p>
        <a class="btn" [routerLink]="'/booking' | loc"><mat-icon>event_available</mat-icon> {{ t().booking }}</a>
      </div>
    </section>
  `,
  styles: `
    .faq-page { max-width: 900px; }
    .more { margin-top: 40px; }
    .more p { margin: 0 0 12px; color: rgba(236, 233, 228, .86); }
    .btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 999px;
      background: var(--bn-sunset); color: #2a1708; text-decoration: none; font-weight: 600;
    }
    .btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `,
})
export class FaqPage {
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t(TEXT);
  protected readonly titel = computed(() => FAQ[this.i18n.lang()].title);
}
