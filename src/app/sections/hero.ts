import { Component, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-hero',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <section class="hero" id="home">
      <h1 class="visually-hidden">Blickfeld Nord</h1>
      <picture>
        <source media="(max-width: 1200px)" srcset="hero-1200.webp" />
        <img src="hero.webp" alt="Logo von Blickfeld Nord mit Kompass über einem nebligen See bei Sonnenuntergang" />
      </picture>
      <div class="hero-content">
        <p class="claim">Neues Album <strong>„Gegenwind“</strong> – jetzt überall erhältlich</p>
        <div class="actions">
          <button mat-flat-button (click)="navigate.emit('musik')">
            <mat-icon>play_arrow</mat-icon> Jetzt reinhören
          </button>
          <button mat-stroked-button (click)="navigate.emit('tour')">
            <mat-icon>explore</mat-icon> Konzerte
          </button>
        </div>
      </div>
    </section>
  `,
  styles: `
    .hero { position: relative; padding-top: 64px; }
    @media (max-width: 599px) { .hero { padding-top: 56px; } }
    img {
      display: block; width: 100%; height: auto; max-height: calc(100svh - 64px);
      object-fit: cover; object-position: center 30%;
    }
    .hero-content {
      position: absolute; inset: auto 0 0 0; padding: 0 16px clamp(24px, 6vw, 72px);
      text-align: center;
    }
    .claim {
      font-family: 'Montserrat', sans-serif; font-weight: 300; text-transform: uppercase;
      letter-spacing: .28em; font-size: clamp(.75rem, 1.6vw, 1rem);
      margin: 0 0 20px; text-shadow: 0 2px 12px rgba(0, 0, 0, .8);
    }
    .claim strong { font-weight: 400; color: var(--bn-sunset); }
    .actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .actions button { letter-spacing: .12em; text-transform: uppercase; }
    [mat-stroked-button] { background: rgba(20, 22, 25, .45); backdrop-filter: blur(4px); }
    .visually-hidden {
      position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;
    }
    /* Auf schmalen Screens bleibt das Logo vollständig sichtbar, der Inhalt folgt darunter */
    @media (max-width: 720px) {
      .hero-content { position: static; padding: 24px 16px 8px; }
    }
  `,
})
export class Hero {
  readonly navigate = output<string>();
}
