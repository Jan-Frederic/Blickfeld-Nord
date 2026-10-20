import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService, friendId } from '../data/band.service';
import { scrollToSection } from '../scroll';
import { I18n, tr } from '../i18n';
import { Content } from '../content';
import { UebersetzungHinweis } from '../sections/uebersetzung-hinweis';

const TEXT = tr(
  {
    kicker: 'Verbunden',
    title: 'Freunde & Partner',
    lead: 'Menschen und Projekte, mit denen wir gern zusammenarbeiten – schaut mal vorbei!',
  },
  {
    kicker: 'Connected',
    title: 'Friends & partners',
    lead: 'People and projects we love working with – go and have a look!',
  },
  {
    kicker: 'Verbonden',
    title: 'Vrienden & partners',
    lead: 'Mensen en projecten waarmee we graag samenwerken – neem gerust een kijkje!',
  },
);

@Component({
  selector: 'app-freunde',
  imports: [MatIconModule, UebersetzungHinweis],
  template: `
    <section class="section friends">
      <p class="kicker">{{ t().kicker }}</p>
      <h2>{{ t().title }}</h2>
      <p class="lead">{{ t().lead }}</p>
      <app-uebersetzung-hinweis class="hint" [status]="status()" />

      <div class="grid">
        @for (f of band.friends; track f.url) {
          <a class="card" [id]="id(f)" [class.flash]="flash() === id(f)" [href]="f.url" target="_blank" rel="noopener">
            <span class="icon" aria-hidden="true">
              @if (f.icon === 'drum') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4.5 3.5 15.5 11M19.5 3.5 8.5 11" stroke-width="1.8" />
                  <circle cx="4.2" cy="3.3" r="1.3" fill="currentColor" stroke="none" />
                  <circle cx="19.8" cy="3.3" r="1.3" fill="currentColor" stroke="none" />
                  <ellipse cx="12" cy="13.5" rx="8.5" ry="2.5" />
                  <path d="M3.5 13.5v5.2c0 1.4 3.8 2.6 8.5 2.6s8.5-1.2 8.5-2.6v-5.2" />
                  <path d="M7.5 15.8v5M12 16v5.3M16.5 15.8v5" stroke-width="1.3" />
                </svg>
              } @else if (f.icon === 'cafe') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 2.5c-.8 1 .8 2-.1 3M11.5 2.5c-.8 1 .8 2-.1 3M15 2.5c-.8 1 .8 2-.1 3" stroke-width="1.5" />
                  <path d="M4 8.5h14v5.5a5.5 5.5 0 0 1-5.5 5.5h-3A5.5 5.5 0 0 1 4 14z" />
                  <path d="M18 10h1.2a2.3 2.3 0 0 1 0 4.6H17.6" />
                  <path d="M2.5 21.5h17" />
                </svg>
              } @else if (f.icon === 'instagram') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
                  <circle cx="12" cy="12" r="4.3" />
                  <circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" stroke="none" />
                </svg>
              } @else if (f.icon === 'choir') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 17.5V5.5l11-2.5v12" />
                  <path d="M9 9l11-2.5" />
                  <ellipse cx="6.2" cy="17.8" rx="2.8" ry="2.2" fill="currentColor" stroke="none" />
                  <ellipse cx="17.2" cy="15.3" rx="2.8" ry="2.2" fill="currentColor" stroke="none" />
                </svg>
              } @else if (f.icon === 'pub') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4.5 7.5c-.9-2.6 1.6-4.6 3.7-3.4 1-1.8 4-1.8 5 0 2.1-1.2 4.6.8 3.6 3.4" />
                  <path d="M5 7.5h11.5v11.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
                  <path d="M16.5 10h1.8a2 2 0 0 1 2 2v3.5a2 2 0 0 1-2 2h-1.8" />
                  <path d="M8.8 11v6.5M12.7 11v6.5" stroke-width="1.5" />
                </svg>
              } @else if (f.icon === 'fire') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2.5c.6 3.2 3 4.9 4.6 7.2a7 7 0 1 1-11.8.6c.9 1.5 2.1 2.3 3.3 2.4-.8-3.8 1.2-7.4 3.9-10.2z" />
                  <path d="M12 21.5a3.2 3.2 0 0 1-3.2-3.2c0-2.1 1.6-3 3.2-5.3 1.6 2.3 3.2 3.2 3.2 5.3a3.2 3.2 0 0 1-3.2 3.2z" stroke-width="1.5" />
                </svg>
              } @else if (f.icon === 'community') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="7" r="3" />
                  <path d="M6.5 20v-1.5a5.5 5.5 0 0 1 11 0V20" />
                  <circle cx="4.8" cy="9.5" r="2.2" stroke-width="1.6" />
                  <path d="M1.5 19v-.8a3.4 3.4 0 0 1 4-3.4" stroke-width="1.6" />
                  <circle cx="19.2" cy="9.5" r="2.2" stroke-width="1.6" />
                  <path d="M22.5 19v-.8a3.4 3.4 0 0 0-4-3.4" stroke-width="1.6" />
                </svg>
              } @else if (f.icon === 'football') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="9.5" />
                  <path d="M12 8.2l3.6 2.6-1.4 4.2H9.8l-1.4-4.2z" fill="currentColor" />
                  <path d="M12 8.2V2.6M15.6 10.8l5.3-1.7M14.2 15l3.3 4.6M9.8 15l-3.3 4.6M8.4 10.8 3.1 9.1" stroke-width="1.6" />
                </svg>
              } @else if (f.icon === 'dj') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
                  <circle cx="10" cy="12" r="5" />
                  <circle cx="10" cy="12" r="1.2" fill="currentColor" stroke="none" />
                  <path d="M18.2 7.5v5.8l-2.6 2.4" stroke-width="1.6" />
                  <circle cx="18.2" cy="7.5" r=".9" fill="currentColor" stroke="none" />
                </svg>
              } @else {
                <mat-icon>link</mat-icon>
              }
            </span>
            <span class="body">
              <span class="name">{{ f.name }}</span>
              <span class="desc">{{ content.t(f.description) }}</span>
              <span class="url">{{ host(f.url) }} <mat-icon>open_in_new</mat-icon></span>
            </span>
          </a>
        }
      </div>
    </section>
  `,
  styles: `
    .hint { display: block; margin: -16px 0 20px; }
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
    .card {
      display: flex; gap: 20px; align-items: flex-start; padding: 24px; border-radius: 12px;
      border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72);
      color: var(--bn-ink); text-decoration: none; transition: border-color .2s, transform .2s;
    }
    .card { scroll-margin-top: 120px; }
    /* Kurzes Aufleuchten, wenn man über eine Location in der Konzertliste hierher kommt */
    .card.flash { animation: flash 1.4s ease-in-out 1; }
    @keyframes flash {
      0%, 100% { border-color: var(--bn-line); box-shadow: none; }
      35%, 55% { border-color: var(--bn-sunset); box-shadow: 0 0 0 3px rgba(232, 164, 106, .35), 0 0 36px rgba(232, 164, 106, .45); background: rgba(232, 164, 106, .12); }
    }
    @media (prefers-reduced-motion: reduce) { .card.flash { animation-duration: .01s; border-color: var(--bn-sunset); } }
    .card:hover, .card:focus-visible { border-color: var(--bn-sunset); transform: translateY(-2px); }
    .card:focus-visible { outline: 2px solid var(--bn-sunset); outline-offset: 2px; }
    .icon {
      flex: none; width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center;
      border: 1px solid var(--bn-fog); color: var(--bn-ink);
    }
    .icon svg { width: 34px; height: 34px; }
    .body { display: flex; flex-direction: column; gap: 6px; }
    .name { font-family: var(--bn-display); font-size: 1.05rem; line-height: 1.3; }
    .desc { line-height: 1.6; color: rgba(236, 233, 228, .82); }
    .url {
      display: inline-flex; align-items: center; gap: 6px; margin-top: 4px;
      font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .14em; font-size: .7rem; color: var(--bn-sunset);
    }
    .url mat-icon { font-size: 14px; width: 14px; height: 14px; }
    @media (max-width: 400px) { .grid { grid-template-columns: 1fr; } .card { padding: 18px; gap: 14px; } }
  `,
})
export class Freunde implements OnInit {
  protected readonly band = inject(BandService);
  protected readonly content = inject(Content);
  protected readonly t = inject(I18n).t(TEXT);
  protected readonly status = computed(() => this.content.status(...this.band.friends.map((f) => f.description)));
  protected readonly id = friendId;
  protected readonly flash = signal<string | null>(null);
  private readonly route = inject(ActivatedRoute);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  ngOnInit(): void {
    // /freunde#cafe-lotti: hinscrollen und die Karte einmal aufleuchten lassen
    const fragment = this.route.snapshot.fragment;
    if (!this.isBrowser || !fragment) return;
    scrollToSection(fragment);
    setTimeout(() => this.flash.set(fragment), 600);
    setTimeout(() => this.flash.set(null), 2200);
  }

  // Anzeige-Adresse: bei Instagram der @-Name, sonst die Domain
  protected host(url: string): string {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const handle = u.pathname.split('/').filter(Boolean)[0];
    return host === 'instagram.com' && handle ? '@' + handle : host;
  }
}
