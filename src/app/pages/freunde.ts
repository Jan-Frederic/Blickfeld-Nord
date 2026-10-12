import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';

@Component({
  selector: 'app-freunde',
  imports: [MatIconModule],
  template: `
    <section class="section friends">
      <p class="kicker">Verbunden</p>
      <h2>Freunde &amp; Partner</h2>
      <p class="lead">Menschen und Projekte, mit denen wir gern zusammenarbeiten – schaut mal vorbei!</p>

      <div class="grid">
        @for (f of band.friends; track f.url) {
          <a class="card" [href]="f.url" target="_blank" rel="noopener">
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
              } @else {
                <mat-icon>link</mat-icon>
              }
            </span>
            <span class="body">
              <span class="name">{{ f.name }}</span>
              <span class="desc">{{ f.description }}</span>
              <span class="url">{{ host(f.url) }} <mat-icon>open_in_new</mat-icon></span>
            </span>
          </a>
        }
      </div>
    </section>
  `,
  styles: `
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
    .card {
      display: flex; gap: 20px; align-items: flex-start; padding: 24px; border-radius: 12px;
      border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72);
      color: var(--bn-ink); text-decoration: none; transition: border-color .2s, transform .2s;
    }
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
export class Freunde {
  protected readonly band = inject(BandService);

  // Anzeige-Adresse: bei Instagram der @-Name, sonst die Domain
  protected host(url: string): string {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const handle = u.pathname.split('/').filter(Boolean)[0];
    return host === 'instagram.com' && handle ? '@' + handle : host;
  }
}
