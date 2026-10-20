import { Component, computed, effect, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService, Show } from '../data/band.service';
import { downloadIcs, icsFileName } from '../data/calendar';
import { PageMetaService } from '../page-meta';
import { shareShow } from '../data/share';

// Eigene Seite je öffentlichem Konzert (/konzerte/<datum>): alle Infos, Erinnerung, Teilen und Anfahrt.
// Wird für jedes öffentliche, geklärte Konzert beim Build vorgerendert (app.routes.server.ts).
@Component({
  selector: 'app-konzert',
  // „vorbei“ hängt vom Besuchstag ab, nicht vom Build-Tag – im Browser komplett neu aufbauen
  host: { ngSkipHydration: 'true' },
  imports: [DatePipe, RouterLink, MatIconModule],
  template: `
    <section class="section">
      <a class="back" routerLink="/" fragment="tour"><mat-icon>arrow_back</mat-icon> Alle Konzerte</a>

      @if (show(); as s) {
        <p class="kicker">{{ past() ? 'Rückblick' : 'Live' }}</p>
        <h2>{{ s.venue }}</h2>
        @if (past()) {
          <p class="past"><mat-icon>history</mat-icon> Dieses Konzert ist schon vorbei – danke an alle, die dabei waren!</p>
        }

        <dl class="facts">
          <div>
            <dt><mat-icon>event</mat-icon> Datum</dt>
            <dd>
              {{ s.date | date: 'EEEE, d. MMMM yyyy' : '' : 'de' }}
              @if (s.endDate) { <br />bis {{ s.endDate | date: 'EEEE, d. MMMM yyyy' : '' : 'de' }} }
            </dd>
          </div>
          <div>
            <dt><mat-icon>schedule</mat-icon> Beginn</dt>
            <dd>{{ s.time ? s.time + ' Uhr' : past() ? '–' : 'wird noch bekannt gegeben' }}</dd>
          </div>
          <div>
            <dt><mat-icon>place</mat-icon> Ort</dt>
            <dd>{{ s.venue }}@if (s.city) {<br />{{ s.city }}}</dd>
          </div>
          <div>
            <dt><mat-icon>local_activity</mat-icon> Eintritt</dt>
            <dd>{{ s.price === 0 ? 'frei' : s.price ? s.price + ' €' : past() ? '–' : 'Infos folgen' }}</dd>
          </div>
        </dl>

        <div class="actions">
          @if (!past()) {
            <button type="button" class="btn primary" (click)="remind(s)"><mat-icon>notifications_active</mat-icon> Erinnere mich</button>
          }
          <button type="button" class="btn" (click)="share(s)"><mat-icon>share</mat-icon> Teilen</button>
          @if (s.mapsUrl) {
            <a class="btn" [href]="s.mapsUrl" target="_blank" rel="noopener"><mat-icon>place</mat-icon> Anfahrt</a>
          }
        </div>
        @if (!past()) {
          <p class="hint">„Erinnere mich“ lädt einen Kalendereintrag mit Erinnerung am Vortag herunter.</p>
        }

        <!-- vergangene Konzerte: Rückblick aus der Historie mit Fotos -->
        @if (recap(); as h) {
          <section class="recap" aria-labelledby="recap-title">
            <p class="kicker">Rückblick</p>
            <h3 id="recap-title">{{ h.title }}</h3>
            @for (img of h.images ?? []; track img.src) {
              <figure>
                <img [src]="img.src" [alt]="img.alt" loading="lazy" decoding="async" />
                @if (img.credit) { <figcaption>Foto: {{ img.credit }}</figcaption> }
              </figure>
            }
            <p>{{ h.text[0] }}</p>
            <div class="recap-links">
              <a class="btn" routerLink="/historie" [fragment]="'e-' + s.date"><mat-icon>history_edu</mat-icon> Ganzen Rückblick lesen</a>
              @if (h.reel) {
                <a class="btn" [href]="'https://www.instagram.com/reel/' + h.reel + '/'" target="_blank" rel="noopener"><mat-icon>play_circle</mat-icon> Video auf Instagram</a>
              }
            </div>
          </section>
        }

        <div class="more">
          <p>Ihr wollt uns auch bei euch haben?</p>
          <a class="btn" routerLink="/booking"><mat-icon>event_available</mat-icon> Booking & Anfrage</a>
        </div>
      } @else {
        <h2>Konzert nicht gefunden</h2>
        <p class="lead">Diesen Termin gibt es nicht (mehr). Alle aktuellen Termine findet ihr in der <a routerLink="/" fragment="tour">Konzertliste</a>.</p>
      }
    </section>
  `,
  styles: `
    .back { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 20px; color: var(--bn-fog); text-decoration: none; font-size: .9rem; }
    .back:hover { color: var(--bn-sunset); }
    .back mat-icon, .past mat-icon { font-size: 18px; width: 18px; height: 18px; }
    h2 { overflow-wrap: anywhere; }
    .past { display: flex; align-items: center; gap: 8px; margin: -8px 0 20px; color: var(--bn-fog); }
    .facts {
      display: grid; margin: 0; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      border-radius: 12px; overflow: hidden; border: 1px solid var(--bn-line); background: #1b1e22;
    }
    .facts > div { padding: 16px 18px; box-shadow: 1px 0 0 var(--bn-line), 0 1px 0 var(--bn-line); }
    dt {
      display: flex; align-items: center; gap: 6px; margin-bottom: 6px;
      font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .14em; font-size: .68rem; color: var(--bn-fog);
    }
    dt mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--bn-sunset); }
    dd { margin: 0; line-height: 1.55; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
    .btn {
      display: inline-flex; align-items: center; gap: 10px; padding: 10px 18px; border-radius: 999px; cursor: pointer;
      border: 1px solid var(--bn-line); background: transparent; color: var(--bn-ink); text-decoration: none; font: inherit; font-weight: 500;
    }
    .btn:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .btn.primary { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    .btn.primary:hover { background: #f0b884; color: #2a1708; }
    .btn mat-icon { width: 20px; height: 20px; font-size: 20px; }
    .hint { margin: 12px 0 0; font-size: .82rem; color: var(--bn-fog); }
    .recap { margin-top: 40px; padding: 24px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    .recap h3 { margin: 0 0 16px; font-family: var(--bn-display); font-weight: 400; font-size: 1.1rem; text-transform: uppercase; letter-spacing: .06em; line-height: 1.4; }
    .recap figure { margin: 0 0 16px; }
    .recap img { display: block; width: 100%; max-height: 520px; object-fit: cover; border-radius: 10px; }
    .recap figcaption { margin-top: 6px; font-size: .78rem; color: var(--bn-fog); }
    .recap p:not(.kicker) { margin: 0 0 16px; max-width: 760px; line-height: 1.7; color: rgba(236, 233, 228, .86); }
    .recap-links { display: flex; flex-wrap: wrap; gap: 10px; }
    .more { margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--bn-line); }
    .more p { margin: 0 0 12px; color: rgba(236, 233, 228, .86); }
  `,
})
export class KonzertPage {
  /** Konzert-ID aus der URL (/konzerte/:id), wie in der Backstage: das Datum */
  readonly id = input.required<string>();

  private readonly band = inject(BandService);
  // nur öffentliche, geklärte Konzerte haben eine eigene Seite
  protected readonly show = computed(() => this.band.publicShows.find((s) => this.band.showId(s) === this.id()));
  private readonly today = new Date().toISOString().slice(0, 10);
  protected readonly past = computed(() => (this.show()!.endDate ?? this.show()!.date) < this.today);
  protected readonly recap = computed(() => this.band.history.find((h) => h.date === this.show()?.date && !h.example));

  constructor() {
    const pageMeta = inject(PageMetaService);
    effect(() => {
      const s = this.show();
      const de = s ? s.date.split('-').reverse().join('.') : '';
      pageMeta.set({
        title: s ? `${s.venue}${s.city ? ', ' + s.city : ''} – ${de} – Blickfeld Nord live` : 'Konzert – Blickfeld Nord',
        description: s
          ? `Blickfeld Nord live am ${de}${s.time ? ' ab ' + s.time + ' Uhr' : ''}: ${s.venue}${s.city ? ' in ' + s.city : ''}${s.price === 0 ? ' – Eintritt frei' : ''}. Partymusik zum Mitsingen und Tanzen.`
          : undefined,
        path: `konzerte/${this.id()}`,
      });
    });
  }

  protected remind(s: Show): void {
    downloadIcs([s], icsFileName(s), 'Blickfeld Nord', false, true);
  }

  protected share(s: Show): void {
    shareShow(s, this.band.showId(s), this.band.publicVenue(s));
  }
}
