import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { scrollToSection } from '../scroll';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { InstagramReel } from './instagram-reel';

@Component({
  selector: 'app-historie',
  imports: [DatePipe, MatIconModule, InstagramReel],
  template: `
    <section class="section historie">
      <p class="kicker">Rückblick</p>
      <h2>Historie</h2>
      <p class="lead">Unsere Geschichte in Momenten – Auftritte, Orte, Begegnungen und alles, was uns unterwegs passiert.</p>

      <ol class="timeline">
        @for (e of entries; track e.date + e.title) {
          <li class="entry" [id]="'e-' + e.date">
            <span class="dot" aria-hidden="true"></span>
            <time [attr.datetime]="e.date">{{ e.date | date: 'd. MMMM yyyy' : '' : 'de' }}</time>
            <article>
              <h3>
                {{ e.title }}
                @if (e.example) { <span class="example">Beispiel</span> }
              </h3>
              @for (p of e.text; track $index) {
                <p>{{ p }}</p>
              }

              @if (e.images?.length) {
                <div class="images" [class.single]="e.images!.length === 1">
                  @for (img of e.images; track img.src) {
                    <a [href]="img.src" target="_blank" rel="noopener" [attr.aria-label]="'Bild öffnen: ' + img.alt">
                      <img [src]="img.src" [alt]="img.alt" loading="lazy" />
                    </a>
                  }
                </div>
                @for (img of e.images; track img.src) {
                  @if (img.credit) { <p class="credit">Foto: {{ img.credit }}</p> }
                }
              }

              @if (e.reel) {
                <app-instagram-reel [id]="e.reel" />
              }

              @if (e.links?.length) {
                <ul class="links">
                  @for (l of e.links; track l.url) {
                    <li>
                      <a [href]="l.url" target="_blank" rel="noopener">
                        @switch (l.type) {
                          @case ('instagram') {
                            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
                              <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
                              <circle cx="12" cy="12" r="4.3" />
                              <circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" stroke="none" />
                            </svg>
                          }
                          @case ('place') { <mat-icon>place</mat-icon> }
                          @default { <mat-icon>language</mat-icon> }
                        }
                        {{ l.label }}
                      </a>
                    </li>
                  }
                </ul>
              }
            </article>
          </li>
        } @empty {
          <li class="empty">Hier entsteht bald unsere Chronik.</li>
        }
      </ol>
    </section>
  `,
  styles: `
    .historie { max-width: 900px; }
    .timeline { list-style: none; margin: 0; padding: 0 0 0 28px; position: relative; }
    .timeline::before {
      content: ''; position: absolute; left: 6px; top: 8px; bottom: 8px; width: 1px; background: var(--bn-line);
    }
    .entry { position: relative; padding-bottom: 48px; scroll-margin-top: 90px; }
    .dot {
      position: absolute; left: -28px; top: 4px; width: 13px; height: 13px; border-radius: 50%;
      background: var(--bn-night); border: 2px solid var(--bn-sunset);
    }
    time {
      display: block; margin-bottom: 10px;
      font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .2em; font-size: .75rem; color: var(--bn-sunset);
    }
    article {
      border: 1px solid var(--bn-line); border-radius: 12px; padding: 24px; background: rgba(27, 30, 34, .72);
    }
    h3 {
      display: flex; flex-wrap: wrap; align-items: center; gap: 12px;
      font-family: var(--bn-display); font-weight: 400; font-size: 1.15rem; line-height: 1.35; margin: 0 0 12px;
    }
    .example {
      font-family: var(--bn-wide); font-size: .65rem; letter-spacing: .16em; text-transform: uppercase;
      padding: 3px 10px; border-radius: 999px; border: 1px dashed var(--bn-fog); color: var(--bn-fog);
    }
    article p { line-height: 1.75; color: rgba(236, 233, 228, .86); margin: 0 0 12px; }
    .images { display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); margin: 16px 0; }
    .images.single { grid-template-columns: 1fr; }
    .images a { display: block; border-radius: 8px; overflow: hidden; border: 1px solid var(--bn-line); aspect-ratio: 4 / 3; }
    .images.single a { aspect-ratio: 16 / 9; }
    .images img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .4s; }
    .images a:hover img { transform: scale(1.03); }
    .credit { margin: -8px 0 12px !important; font-size: .78rem; color: var(--bn-fog) !important; }
    .links { list-style: none; padding: 0; margin: 12px 0 0; display: flex; flex-wrap: wrap; gap: 8px; }
    .links a {
      display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px;
      border: 1px solid var(--bn-line); color: var(--bn-ink); text-decoration: none; font-size: .88rem;
      transition: border-color .2s, color .2s;
    }
    .links a:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .links svg, .links mat-icon { width: 18px; height: 18px; font-size: 18px; flex: none; }
    .empty { color: var(--bn-fog); }
    @media (max-width: 520px) { article { padding: 18px; } .timeline { padding-left: 22px; } .dot { left: -22px; } }
  `,
})
export class Historie implements OnInit {
  protected readonly entries = [...inject(BandService).history].sort((a, b) => b.date.localeCompare(a.date));
  private readonly route = inject(ActivatedRoute);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  ngOnInit(): void {
    // „Rückblick“-Links aus der Konzertliste (/historie#e-JJJJ-MM-TT) springen zum passenden Eintrag
    const fragment = this.route.snapshot.fragment;
    if (this.isBrowser && fragment) scrollToSection(fragment);
  }
}
