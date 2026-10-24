import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
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
  imports: [RouterLink, LocPipe, UebersetzungHinweis],
  template: `
    <section id="band" class="section">
      <p class="kicker">{{ t().kicker }}</p>
      <h2>{{ t().title }}</h2>
      <p class="lead">{{ t().lead1 }}</p>
      <p class="lead">{{ t().lead2 }}</p>
      <div class="grid">
        @for (m of band.members; track m.slug) {
          <!-- Karte ohne Angular Material (mat-card): der Abschnitt wird auf dem Handy gleich beim Laden aktiviert -->
          <a class="card-link" [routerLink]="['/band', m.slug] | loc">
          <article class="card">
            <div class="head">
              @if (m.photo) {
                <img class="avatar photo" [src]="m.photo.avatar" width="40" height="40" alt="" loading="lazy" decoding="async" />
              } @else {
                <div class="avatar">{{ m.initials }}</div>
              }
              <div>
                <h3 class="name">{{ m.name }}</h3>
                <p class="role">{{ content.t(m.role) }}</p>
              </div>
            </div>
            <div class="body">
              <p [attr.lang]="content.langOf(m.bio)">{{ content.t(m.bio) }}</p>
              <span class="more">{{ t().more }} <span class="material-icons" aria-hidden="true">arrow_forward</span></span>
            </div>
          </article>
          </a>
        }
      </div>
      <app-uebersetzung-hinweis [status]="bioStatus()" />
    </section>
  `,
  styles: `
    .lead:has(+ .lead) { margin-bottom: 12px; }
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
    .card {
      display: flex; flex-direction: column; box-sizing: border-box; height: 100%; border-radius: 12px;
      border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); transition: border-color .2s, transform .2s;
    }
    .head { display: flex; padding: 16px 16px 0; }
    .name { margin: 0; padding: 0 16px; font: 400 22px var(--bn-display); letter-spacing: normal; text-transform: none; }
    .role { margin: 0; padding: 0 16px; font: 500 .72rem var(--bn-wide); text-transform: uppercase; letter-spacing: .14em; }
    .body { display: flex; flex-direction: column; flex: 1; padding: 0 16px 16px; }
    .body p { margin: 12px 0 16px; opacity: .85; line-height: 1.6; }
    .avatar {
      flex: none; width: 40px; height: 40px; margin: 0 0 16px; border-radius: 50%;
      display: grid; place-items: center; font-family: var(--bn-display); font-size: .8rem; letter-spacing: .06em;
      background: transparent; color: var(--bn-ink); border: 1px solid var(--bn-fog);
    }
    .avatar.photo { object-fit: cover; border-color: var(--bn-sunset); }
    .card-link { display: block; color: inherit; text-decoration: none; border-radius: 12px; }
    .card-link:hover .card, .card-link:focus-visible .card { border-color: var(--bn-sunset); transform: translateY(-2px); }
    .card-link:focus-visible { outline: 2px solid var(--bn-sunset); outline-offset: 2px; }
    .more {
      margin-top: auto; padding-top: 8px; display: inline-flex; align-items: center; gap: 6px;
      font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .16em; font-size: .7rem; color: var(--bn-sunset);
    }
    .more .material-icons { font-size: 16px; transition: transform .2s; }
    .card-link:hover .more .material-icons { transform: translateX(4px); }
  `,
})
export class Band {
  protected readonly band = inject(BandService);
  protected readonly content = inject(Content);
  protected readonly t = inject(I18n).t(TEXT);
  protected readonly bioStatus = () => this.content.status(...this.band.members.flatMap((m) => [m.role, m.bio]));
}
