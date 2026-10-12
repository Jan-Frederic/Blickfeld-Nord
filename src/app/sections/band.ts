import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { BandService } from '../data/band.service';

@Component({
  selector: 'app-band',
  imports: [MatCardModule],
  template: `
    <section id="band" class="section">
      <p class="kicker">Wer wir sind</p>
      <h2>Die Band</h2>
      <p class="lead">
        Was 2021 als Kombo von David und Matthias begann, ist heute ein echtes Power-Trio: Seit Oktober 2025
        macht Fred am Bass die Runde komplett. Seitdem heißt es: drei Stimmen, ein Ziel – Party.
      </p>
      <p class="lead">
        Wir spielen Musik, die ins Bein geht und zum Mitsingen einlädt. Egal ob Weihnachtsmarkt, Stadtfest
        oder private Feier – wenn Blickfeld Nord auf der Bühne steht, bleibt keiner lange sitzen.
      </p>
      <div class="grid">
        @for (m of band.members; track m.name) {
          <mat-card appearance="outlined">
            <mat-card-header>
              <div mat-card-avatar class="avatar">{{ m.initials }}</div>
              <mat-card-title>{{ m.name }}</mat-card-title>
              <mat-card-subtitle>{{ m.role }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content><p>{{ m.bio }}</p></mat-card-content>
          </mat-card>
        }
      </div>
    </section>
  `,
  styles: `
    .lead:has(+ .lead) { margin-bottom: 12px; }
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
    .avatar {
      display: grid; place-items: center; font-family: var(--bn-display); font-size: .8rem; letter-spacing: .06em;
      background: transparent; color: var(--bn-ink); border: 1px solid var(--bn-fog);
    }
    mat-card-content p { margin-top: 12px; opacity: .85; line-height: 1.6; }
    mat-card-subtitle { font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .14em; font-size: .72rem; }
  `,
})
export class Band {
  protected readonly band = inject(BandService);
}
