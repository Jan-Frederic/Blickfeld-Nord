import { Component, computed, effect, inject, input } from '@angular/core';
import { PageMetaService } from '../page-meta';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { I18n, LocPipe, tr } from '../i18n';
import { Content } from '../content';
import { UebersetzungHinweis } from '../sections/uebersetzung-hinweis';

const TEXT = tr(
  {
    back: 'Zur Band',
    soon: 'Die ausführliche Bio folgt in Kürze.',
    others: 'Weitere Bandmitglieder',
    notFound: 'Nicht gefunden',
    notFoundText: 'Dieses Bandmitglied gibt es (noch) nicht.',
    at: 'bei Blickfeld Nord.',
  },
  {
    back: 'Back to the band',
    soon: 'A longer bio is coming soon.',
    others: 'More band members',
    notFound: 'Not found',
    notFoundText: "This band member doesn't exist (yet).",
    at: 'with Blickfeld Nord.',
  },
  {
    back: 'Terug naar de band',
    soon: 'Een uitgebreide bio volgt binnenkort.',
    others: 'Andere bandleden',
    notFound: 'Niet gevonden',
    notFoundText: 'Dit bandlid bestaat (nog) niet.',
    at: 'bij Blickfeld Nord.',
  },
);

@Component({
  selector: 'app-member',
  imports: [RouterLink, MatButtonModule, MatIconModule, LocPipe, UebersetzungHinweis],
  template: `
    <article class="section member">
      <a class="back" [routerLink]="'/' | loc" fragment="band"><mat-icon>arrow_back</mat-icon> {{ t().back }}</a>

      @if (member(); as m) {
        <header>
          @if (m.photo) {
            <img class="avatar photo" [src]="m.photo.avatar" width="88" height="88" alt="" aria-hidden="true" />
          } @else {
            <div class="avatar" aria-hidden="true">{{ m.initials }}</div>
          }
          <div>
            <p class="kicker">{{ content.t(m.role) }}</p>
            <h2>{{ m.name }}</h2>
            @if (m.tagline) {
              <p class="tagline">{{ content.t(m.tagline) }}</p>
            }
          </div>
        </header>

        <div class="story" [class.with-photo]="m.photo">
          @if (m.photo) {
            <figure class="portrait">
              <img [src]="m.photo.src" width="800" height="1000" [alt]="content.t(m.photo.alt)" />
            </figure>
          }
          @if (m.story?.length) {
            @for (p of m.story; track $index) {
              <p>{{ content.t(p) }}</p>
            }
          } @else {
            <p>{{ content.t(m.bio) }}</p>
            <p class="soon">{{ t().soon }}</p>
          }
          <app-uebersetzung-hinweis [status]="content.status(m.role, m.tagline, m.bio, ...(m.story ?? []), m.photo?.alt, m.link?.label)" />
        </div>

        @if (m.link) {
          <a mat-flat-button [href]="m.link.url" target="_blank" rel="noopener">
            <mat-icon>open_in_new</mat-icon> {{ content.t(m.link.label) }}
          </a>
        }

        <nav class="others" [attr.aria-label]="t().others">
          @for (o of others(); track o.slug) {
            <a [routerLink]="['/band', o.slug] | loc">
              <span class="o-role">{{ content.t(o.role) }}</span>
              <span class="o-name">{{ o.name }}</span>
            </a>
          }
        </nav>
      } @else {
        <h2>{{ t().notFound }}</h2>
        <p class="lead">{{ t().notFoundText }}</p>
      }
    </article>
  `,
  styles: `
    .member { max-width: 820px; }
    .back {
      display: inline-flex; align-items: center; gap: 6px; margin-bottom: 32px;
      font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .18em; font-size: .75rem;
      color: var(--bn-fog); text-decoration: none;
    }
    .back:hover { color: var(--bn-sunset); }
    .back mat-icon { font-size: 18px; width: 18px; height: 18px; }
    header { display: flex; gap: 24px; align-items: center; margin-bottom: 32px; }
    header h2 { margin-bottom: 4px; }
    .avatar {
      flex: none; width: 88px; height: 88px; border-radius: 50%; display: grid; place-items: center;
      font-family: var(--bn-display); font-size: 1.4rem; letter-spacing: .06em;
      border: 1px solid var(--bn-fog); color: var(--bn-ink);
    }
    .avatar.photo { object-fit: cover; padding: 0; border-color: var(--bn-sunset); }
    .portrait {
      float: right; width: min(42%, 320px); margin: 4px 0 20px 28px;
      border-radius: 12px; overflow: hidden; border: 1px solid var(--bn-line);
    }
    .portrait img { display: block; width: 100%; height: auto; aspect-ratio: 4 / 5; object-fit: cover; object-position: center top; }
    .story.with-photo::after { content: ''; display: block; clear: both; }
    .tagline { margin: 0; color: var(--bn-sunset); font-family: var(--bn-wide); font-weight: 300; letter-spacing: .12em; }
    .story p { line-height: 1.8; color: rgba(236, 233, 228, .86); margin: 0 0 18px; }
    .story p:first-child { font-size: 1.12rem; color: var(--bn-ink); }
    .soon { color: var(--bn-fog) !important; font-style: italic; }
    [mat-flat-button] { margin: 8px 0 40px; }
    .others {
      display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      border-top: 1px solid var(--bn-line); padding-top: 24px;
    }
    .others a {
      display: flex; flex-direction: column; gap: 4px; padding: 16px; border-radius: 10px;
      border: 1px solid var(--bn-line); color: var(--bn-ink); text-decoration: none;
      transition: border-color .2s;
    }
    .others a:hover { border-color: var(--bn-sunset); }
    .o-role { font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .14em; font-size: .7rem; color: var(--bn-fog); }
    .o-name { font-family: var(--bn-display); font-size: 1rem; }
    @media (max-width: 520px) {
      header { flex-direction: column; align-items: flex-start; gap: 16px; }
      .avatar { width: 64px; height: 64px; font-size: 1rem; }
      .portrait { float: none; width: 100%; margin: 0 0 20px; }
    }
  `,
})
export class MemberPage {
  private readonly band = inject(BandService);
  private readonly i18n = inject(I18n);
  protected readonly content = inject(Content);
  protected readonly t = this.i18n.t(TEXT);
  readonly slug = input.required<string>();

  protected readonly member = computed(() => this.band.members.find((m) => m.slug === this.slug()));
  protected readonly others = computed(() => this.band.members.filter((m) => m.slug !== this.slug()));

  constructor() {
    const pageMeta = inject(PageMetaService);
    effect(() => {
      const m = this.member();
      pageMeta.set({
        title: m ? `${m.name} – Blickfeld Nord` : 'Blickfeld Nord',
        description: m ? `${m.name} – ${this.content.t(m.role)} ${this.t().at} ${this.content.t(m.bio)}` : undefined,
        path: this.i18n.link(`/band/${this.slug()}`).slice(1),
      });
    });
  }
}
