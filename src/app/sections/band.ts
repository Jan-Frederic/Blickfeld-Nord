import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';

@Component({
  selector: 'app-band',
  imports: [RouterLink, MatCardModule, MatIconModule],
  template: `
    <section id="band" class="section">
      <p class="kicker">Wer wir sind</p>
      <h2>Die Band</h2>
      <p class="lead">
        Was 2019 als Kombo von David und Matthias begann, ist heute ein echtes Power-Trio: Seit Oktober 2025
        macht Fred am Bass die Runde komplett. Seitdem heißt es: drei Stimmen, ein Ziel – Party.
      </p>
      <p class="lead">
        Wir spielen Musik, die ins Bein geht und zum Mitsingen einlädt. Egal ob Weihnachtsmarkt, Stadtfest
        oder private Feier – wenn Blickfeld Nord auf der Bühne steht, bleibt keiner lange sitzen.
      </p>
      <div class="grid">
        @for (m of band.members; track m.slug) {
          <a class="card-link" [routerLink]="['/band', m.slug]" [attr.aria-label]="'Mehr über ' + m.name">
          <mat-card appearance="outlined">
            <mat-card-header>
              <div mat-card-avatar class="avatar">{{ m.initials }}</div>
              <mat-card-title>{{ m.name }}</mat-card-title>
              <mat-card-subtitle>{{ m.role }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>{{ m.bio }}</p>
              <span class="more">Mehr erfahren <mat-icon>arrow_forward</mat-icon></span>
            </mat-card-content>
          </mat-card>
          </a>
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
    .card-link { display: block; color: inherit; text-decoration: none; border-radius: 12px; }
    .card-link mat-card { height: 100%; transition: border-color .2s, transform .2s; }
    .card-link:hover mat-card, .card-link:focus-visible mat-card { border-color: var(--bn-sunset) !important; transform: translateY(-2px); }
    .card-link:focus-visible { outline: 2px solid var(--bn-sunset); outline-offset: 2px; }
    mat-card-content { display: flex; flex-direction: column; height: calc(100% - 72px); }
    .more {
      margin-top: auto; padding-top: 8px; display: inline-flex; align-items: center; gap: 6px;
      font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .16em; font-size: .7rem; color: var(--bn-sunset);
    }
    .more mat-icon { font-size: 16px; width: 16px; height: 16px; transition: transform .2s; }
    .card-link:hover .more mat-icon { transform: translateX(4px); }
    mat-card-content p { margin-top: 12px; opacity: .85; line-height: 1.6; }
    mat-card-subtitle { font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .14em; font-size: .72rem; }
  `,
})
export class Band {
  protected readonly band = inject(BandService);
}
