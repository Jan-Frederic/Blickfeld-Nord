import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// Eigene Fehlerseite für falsche oder veraltete Links (GitHub Pages liefert sie als 404.html aus)
@Component({
  selector: 'app-not-found',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <section class="section not-found">
      <img src="kompass-440.webp" width="220" height="220" alt="" aria-hidden="true" class="compass" />
      <p class="kicker">Fehler 404</p>
      <h2>Vom Kurs abgekommen</h2>
      <p class="lead">
        Diese Seite gibt es leider nicht – vielleicht ist der Link veraltet oder hat einen Tippfehler.
        Kein Problem: Der Kompass zeigt dich zurück auf die Bühne.
      </p>
      <div class="actions">
        <a mat-flat-button routerLink="/"><mat-icon>explore</mat-icon> Zur Startseite</a>
        <a mat-stroked-button routerLink="/" fragment="tour"><mat-icon>event</mat-icon> Konzerte</a>
        <a mat-stroked-button routerLink="/historie"><mat-icon>schedule</mat-icon> Historie</a>
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
export class NotFound {}
