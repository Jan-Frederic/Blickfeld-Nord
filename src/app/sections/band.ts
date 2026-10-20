import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { I18n, LocPipe, tr } from '../i18n';
import { Content } from '../content';
import { UebersetzungHinweis } from './uebersetzung-hinweis';

const TEXT = tr(
  {
    kicker: 'Wer wir sind',
    title: 'Die Band',
    lead1:
      'Was 2019 als Kombo von David und Matthias begann, ist heute ein echtes Power-Trio: Seit Oktober 2025 macht Fred am Bass die Runde komplett. Seitdem heißt es: drei Stimmen, ein Ziel – Party.',
    lead2:
      'Wir spielen Musik, die ins Bein geht und zum Mitsingen einlädt. Egal ob Weihnachtsmarkt, Stadtfest oder private Feier – wenn Blickfeld Nord auf der Bühne steht, bleibt keiner lange sitzen.',
    more: 'Mehr erfahren',
  },
  {
    kicker: 'Who we are',
    title: 'The band',
    lead1:
      'What started in 2019 as a combo of David and Matthias is now a proper power trio: since October 2025, Fred on bass has completed the line-up. Ever since, it has been three voices, one goal – party.',
    lead2:
      'We play music that gets your feet moving and makes you want to sing along. Whether it is a Christmas market, a town festival or a private party – when Blickfeld Nord is on stage, nobody stays seated for long.',
    more: 'Find out more',
  },
  {
    kicker: 'Wie we zijn',
    title: 'De band',
    lead1:
      'Wat in 2019 begon als combo van David en Matthias, is nu een echt powertrio: sinds oktober 2025 maakt Fred op bas het geheel compleet. Sindsdien is het: drie stemmen, één doel – feest.',
    lead2:
      'We spelen muziek die in de benen gaat en uitnodigt om mee te zingen. Of het nu een kerstmarkt, een stadsfeest of een privéfeest is – als Blickfeld Nord op het podium staat, blijft niemand lang zitten.',
    more: 'Meer weten',
  },
);

@Component({
  selector: 'app-band',
  imports: [RouterLink, MatCardModule, MatIconModule, LocPipe, UebersetzungHinweis],
  template: `
    <section id="band" class="section">
      <p class="kicker">{{ t().kicker }}</p>
      <h2>{{ t().title }}</h2>
      <p class="lead">{{ t().lead1 }}</p>
      <p class="lead">{{ t().lead2 }}</p>
      <div class="grid">
        @for (m of band.members; track m.slug) {
          <a class="card-link" [routerLink]="['/band', m.slug] | loc">
          <mat-card appearance="outlined">
            <mat-card-header>
              @if (m.photo) {
                <img mat-card-avatar class="avatar photo" [src]="m.photo.avatar" width="40" height="40" alt="" />
              } @else {
                <div mat-card-avatar class="avatar">{{ m.initials }}</div>
              }
              <mat-card-title>{{ m.name }}</mat-card-title>
              <mat-card-subtitle>{{ content.t(m.role) }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p [attr.lang]="content.langOf(m.bio)">{{ content.t(m.bio) }}</p>
              <span class="more">{{ t().more }} <mat-icon>arrow_forward</mat-icon></span>
            </mat-card-content>
          </mat-card>
          </a>
        }
      </div>
      <app-uebersetzung-hinweis [status]="bioStatus()" />
    </section>
  `,
  styles: `
    .lead:has(+ .lead) { margin-bottom: 12px; }
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
    .avatar {
      display: grid; place-items: center; font-family: var(--bn-display); font-size: .8rem; letter-spacing: .06em;
      background: transparent; color: var(--bn-ink); border: 1px solid var(--bn-fog);
    }
    .avatar.photo { object-fit: cover; border-color: var(--bn-sunset); }
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
  protected readonly content = inject(Content);
  protected readonly t = inject(I18n).t(TEXT);
  protected readonly bioStatus = () => this.content.status(...this.band.members.flatMap((m) => [m.role, m.bio]));
}
