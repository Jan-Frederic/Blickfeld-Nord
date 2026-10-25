import { Component, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { I18n, LocPipe, tr } from '../i18n';
import { zaehleEreignis } from '../analytics';

const TEXT = tr(
  {
    kicker: 'Fehler 404',
    title: 'Vom Kurs abgekommen',
    lead: 'Diese Seite gibt es leider nicht – vielleicht ist der Link veraltet oder hat einen Tippfehler. Kein Problem: Der Kompass zeigt dich zurück auf die Bühne.',
    home: 'Zur Startseite',
    concerts: 'Konzerte',
    history: 'Historie',
  },
  {
    kicker: 'Error 404',
    title: 'Off course',
    lead: "Sorry, this page doesn't exist – maybe the link is out of date or has a typo. No problem: the compass will point you back to the stage.",
    home: 'To the home page',
    concerts: 'Shows',
    history: 'History',
  },
  {
    kicker: 'Fout 404',
    title: 'Uit koers geraakt',
    lead: 'Deze pagina bestaat helaas niet – misschien is de link verouderd of zit er een typfout in. Geen probleem: het kompas wijst je de weg terug naar het podium.',
    home: 'Naar de startpagina',
    concerts: 'Optredens',
    history: 'Geschiedenis',
  },
);

// Eigene Fehlerseite für falsche oder veraltete Links (GitHub Pages liefert sie als 404.html aus)
@Component({
  selector: 'app-not-found',
  imports: [RouterLink, LocPipe, MatButtonModule, MatIconModule],
  template: `
    <section class="section not-found">
      <img src="kompass-440.webp" width="220" height="220" alt="" aria-hidden="true" class="compass" />
      <p class="kicker">{{ t().kicker }}</p>
      <h2>{{ t().title }}</h2>
      <p class="lead">{{ t().lead }}</p>
      <div class="actions">
        <a mat-flat-button [routerLink]="'/' | loc"><mat-icon>explore</mat-icon> {{ t().home }}</a>
        <a mat-stroked-button [routerLink]="'/' | loc" fragment="tour"><mat-icon>event</mat-icon> {{ t().concerts }}</a>
        <a mat-stroked-button [routerLink]="'/historie' | loc"><mat-icon>schedule</mat-icon> {{ t().history }}</a>
      </div>
    </section>
  `,
  styles: `
    .not-found { text-align: center; max-width: 640px; min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .compass {
      width: 180px; height: 180px; border-radius: 50%; object-fit: cover; margin-bottom: 24px;
      border: 1px solid var(--bn-line); box-shadow: 0 0 60px rgba(232, 164, 106, .18);
      animation: drift 6s ease-in-out infinite;
    }
    @keyframes drift { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }
    @media (prefers-reduced-motion: reduce) { .compass { animation: none; } }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-top: 8px; }
  `,
})
export class NotFound {
  protected readonly t = inject(I18n).t(TEXT);

  constructor() {
    // Aufrufe der Fehlerseite zählen: „fehlerseite“ (Summe, Backstage → Besucher) und „404:<Adresse>“ (im
    // GoatCounter-Dashboard unter Ereignisse) – so fallen alte oder falsche Links auf, z. B. auf gedruckten Plakaten
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    zaehleEreignis('fehlerseite', 'Fehlerseite (404)');
    zaehleEreignis(`404:${location.pathname}`, `404: ${location.pathname}`);
  }
}
