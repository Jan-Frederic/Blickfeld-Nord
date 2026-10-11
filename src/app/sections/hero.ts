import { Component, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-hero',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <section class="hero" id="home">
      <div class="waves" aria-hidden="true"></div>
      <div class="hero-content">
        <p class="eyebrow">Indie-Rock von der Küste</p>
        <h1>Blickfeld Nord</h1>
        <p class="claim">Neues Album <strong>„Gegenwind“</strong> – jetzt überall erhältlich.</p>
        <div class="actions">
          <button mat-flat-button (click)="navigate.emit('musik')">
            <mat-icon>play_arrow</mat-icon> Jetzt reinhören
          </button>
          <button mat-stroked-button (click)="navigate.emit('tour')">
            <mat-icon>event</mat-icon> Tourdaten
          </button>
        </div>
      </div>
    </section>
  `,
  styles: `
    .hero {
      position: relative; min-height: 88vh; display: grid; place-items: center; text-align: center;
      overflow: hidden; padding: 96px 16px 64px;
      background:
        radial-gradient(ellipse at 50% 120%, rgba(58,124,165,.55), transparent 60%),
        radial-gradient(ellipse at 80% -10%, rgba(95,165,138,.35), transparent 55%),
        linear-gradient(180deg, #071521 0%, #0b2233 100%);
    }
    .waves {
      position: absolute; inset: auto 0 0 0; height: 160px; opacity: .35;
      background: repeating-radial-gradient(ellipse at 50% 140%, transparent 0 18px, rgba(255,255,255,.18) 19px 20px);
    }
    .hero-content { position: relative; max-width: 760px; }
    .eyebrow { letter-spacing: .3em; text-transform: uppercase; font-size: .85rem; opacity: .75; margin: 0; }
    h1 {
      font-family: 'Bebas Neue', sans-serif; font-weight: 400; margin: 8px 0 12px;
      font-size: clamp(3.5rem, 13vw, 8.5rem); line-height: .95; letter-spacing: .04em;
    }
    .claim { font-size: 1.2rem; opacity: .9; margin: 0 0 32px; }
    .actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  `,
})
export class Hero {
  readonly navigate = output<string>();
}
