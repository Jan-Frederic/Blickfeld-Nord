import { Component, computed, effect, inject, input } from '@angular/core';
import { PageMetaService } from '../page-meta';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';

@Component({
  selector: 'app-member',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <article class="section member">
      <a class="back" routerLink="/" fragment="band"><mat-icon>arrow_back</mat-icon> Zur Band</a>

      @if (member(); as m) {
        <header>
          @if (m.photo) {
            <img class="avatar photo" [src]="m.photo.avatar" width="88" height="88" alt="" aria-hidden="true" />
          } @else {
            <div class="avatar" aria-hidden="true">{{ m.initials }}</div>
          }
          <div>
            <p class="kicker">{{ m.role }}</p>
            <h2>{{ m.name }}</h2>
            @if (m.tagline) {
              <p class="tagline">{{ m.tagline }}</p>
            }
          </div>
        </header>

        <div class="story" [class.with-photo]="m.photo">
          @if (m.photo) {
            <figure class="portrait">
              <img [src]="m.photo.src" width="1200" height="1320" [alt]="m.photo.alt" />
            </figure>
          }
          @if (m.story?.length) {
            @for (p of m.story; track $index) {
              <p>{{ p }}</p>
            }
          } @else {
            <p>{{ m.bio }}</p>
            <p class="soon">Die ausführliche Bio folgt in Kürze.</p>
          }
        </div>

        @if (m.link) {
          <a mat-flat-button [href]="m.link.url" target="_blank" rel="noopener">
            <mat-icon>open_in_new</mat-icon> {{ m.link.label }}
          </a>
        }

        <nav class="others" aria-label="Weitere Bandmitglieder">
          @for (o of others(); track o.slug) {
            <a [routerLink]="['/band', o.slug]">
              <span class="o-role">{{ o.role }}</span>
              <span class="o-name">{{ o.name }}</span>
            </a>
          }
        </nav>
      } @else {
        <h2>Nicht gefunden</h2>
        <p class="lead">Dieses Bandmitglied gibt es (noch) nicht.</p>
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
    .portrait img { display: block; width: 100%; height: auto; }
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
  readonly slug = input.required<string>();

  protected readonly member = computed(() => this.band.members.find((m) => m.slug === this.slug()));
  protected readonly others = computed(() => this.band.members.filter((m) => m.slug !== this.slug()));

  constructor() {
    const pageMeta = inject(PageMetaService);
    effect(() => {
      const m = this.member();
      pageMeta.set({
        title: m ? `${m.name} – Blickfeld Nord` : 'Blickfeld Nord',
        description: m ? `${m.name} – ${m.role} bei Blickfeld Nord. ${m.bio}` : undefined,
        path: `band/${this.slug()}`,
      });
    });
  }
}
