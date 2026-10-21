import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService, Show } from '../data/band.service';
import { downloadIcs, icsFileName } from '../data/calendar';
import { PageMetaService } from '../page-meta';
import { shareShow } from '../data/share';
import { I18n, LDatePipe, LocPipe, tr } from '../i18n';
import { Content } from '../content';
import { UebersetzungHinweis } from '../sections/uebersetzung-hinweis';

const TEXT = tr(
  {
    back: 'Alle Konzerte',
    recap: 'Rückblick',
    over: 'Dieses Konzert ist schon vorbei – danke an alle, die dabei waren!',
    date: 'Datum',
    until: 'bis',
    start: 'Beginn',
    time: (t: string) => t + ' Uhr',
    tba: 'wird noch bekannt gegeben',
    place: 'Ort',
    entry: 'Eintritt',
    free: 'frei',
    soon: 'Infos folgen',
    remind: 'Erinnere mich',
    share: 'Teilen',
    route: 'Anfahrt',
    remindHint: '„Erinnere mich“ lädt einen Kalendereintrag mit Erinnerung am Vortag herunter.',
    photo: 'Foto',
    readAll: 'Ganzen Rückblick lesen',
    video: 'Video auf Instagram',
    more: 'Ihr wollt uns auch bei euch haben?',
    booking: 'Booking & Anfrage',
    notFound: 'Konzert nicht gefunden',
    notFoundText: 'Diesen Termin gibt es nicht (mehr). Alle aktuellen Termine findet ihr in der',
    list: 'Konzertliste',
    metaFallback: 'Konzert – Blickfeld Nord',
    metaDate: (d: string) => d.split('-').reverse().join('.'),
    metaDescription: (when: string, time: string | undefined, where: string, free: boolean) =>
      `Blickfeld Nord live am ${when}${time ? ' ab ' + time + ' Uhr' : ''}: ${where}${free ? ' – Eintritt frei' : ''}. Partymusik zum Mitsingen und Tanzen.`,
    in: ' in ',
  },
  {
    back: 'All shows',
    recap: 'Looking back',
    over: 'This show is already over – thanks to everyone who was there!',
    date: 'Date',
    until: 'until',
    start: 'Start',
    time: (t: string) => t,
    tba: 'to be announced',
    place: 'Venue',
    entry: 'Entry',
    free: 'free',
    soon: 'details to follow',
    remind: 'Remind me',
    share: 'Share',
    route: 'Directions',
    remindHint: '“Remind me” downloads a calendar entry with a reminder the day before.',
    photo: 'Photo',
    readAll: 'Read the full story',
    video: 'Video on Instagram',
    more: 'Want us to play for you too?',
    booking: 'Booking & enquiries',
    notFound: 'Show not found',
    notFoundText: "This date doesn't exist (any more). You'll find all current dates in the",
    list: 'list of shows',
    metaFallback: 'Show – Blickfeld Nord',
    metaDate: (d: string) => d.split('-').reverse().join('/'),
    metaDescription: (when: string, time: string | undefined, where: string, free: boolean) =>
      `Blickfeld Nord live on ${when}${time ? ' from ' + time : ''}: ${where}${free ? ' – free entry' : ''}. Party music to sing along and dance to.`,
    in: ' in ',
  },
  {
    back: 'Alle optredens',
    recap: 'Terugblik',
    over: 'Dit optreden is al voorbij – bedankt aan iedereen die erbij was!',
    date: 'Datum',
    until: 'tot',
    start: 'Aanvang',
    time: (t: string) => t + ' uur',
    tba: 'wordt nog bekendgemaakt',
    place: 'Locatie',
    entry: 'Entree',
    free: 'gratis',
    soon: 'info volgt',
    remind: 'Herinner me',
    share: 'Delen',
    route: 'Route',
    remindHint: '„Herinner me” downloadt een agenda-item met een herinnering de dag ervoor.',
    photo: 'Foto',
    readAll: 'Lees de hele terugblik',
    video: 'Video op Instagram',
    more: 'Willen jullie ons ook bij jullie?',
    booking: 'Boeken & aanvraag',
    notFound: 'Optreden niet gevonden',
    notFoundText: 'Deze datum bestaat niet (meer). Alle actuele data vinden jullie in de',
    list: 'lijst met optredens',
    metaFallback: 'Optreden – Blickfeld Nord',
    metaDate: (d: string) => d.split('-').reverse().join('-'),
    metaDescription: (when: string, time: string | undefined, where: string, free: boolean) =>
      `Blickfeld Nord live op ${when}${time ? ' vanaf ' + time + ' uur' : ''}: ${where}${free ? ' – gratis entree' : ''}. Partymuziek om mee te zingen en op te dansen.`,
    in: ' in ',
  },
);

// Eigene Seite je öffentlichem Konzert (/konzerte/<datum>): alle Infos, Erinnerung, Teilen und Anfahrt.
// Wird für jedes öffentliche, geklärte Konzert beim Build vorgerendert (app.routes.server.ts).
@Component({
  selector: 'app-konzert',
  // „vorbei“ hängt vom Besuchstag ab, nicht vom Build-Tag – im Browser komplett neu aufbauen
  host: { ngSkipHydration: 'true' },
  imports: [RouterLink, MatIconModule, LDatePipe, LocPipe, UebersetzungHinweis],
  template: `
    <section class="section">
      <a class="back" [routerLink]="'/' | loc" fragment="tour"><mat-icon>arrow_back</mat-icon> {{ t().back }}</a>

      @if (show(); as s) {
        <p class="kicker">{{ past() ? t().recap : 'Live' }}</p>
        <h2>{{ s.venue }}</h2>
        @if (past()) {
          <p class="past"><mat-icon>history</mat-icon> {{ t().over }}</p>
        }

        <dl class="facts">
          <div>
            <dt><mat-icon>event</mat-icon> {{ t().date }}</dt>
            <dd>
              {{ s.date | ldate: 'full' }}
              @if (s.endDate) { <br />{{ t().until }} {{ s.endDate | ldate: 'full' }} }
            </dd>
          </div>
          <div>
            <dt><mat-icon>schedule</mat-icon> {{ t().start }}</dt>
            <dd>{{ s.time ? t().time(s.time) : past() ? '–' : t().tba }}</dd>
          </div>
          <div>
            <dt><mat-icon>place</mat-icon> {{ t().place }}</dt>
            <dd>{{ s.venue }}@if (s.city) {<br />{{ s.city }}}</dd>
          </div>
          <div>
            <dt><mat-icon>local_activity</mat-icon> {{ t().entry }}</dt>
            <dd>{{ s.price === 0 ? t().free : s.price ? s.price + ' €' : past() ? '–' : t().soon }}</dd>
          </div>
        </dl>

        <div class="actions">
          @if (!past()) {
            <button type="button" class="btn primary" (click)="remind(s)"><mat-icon>notifications_active</mat-icon> {{ t().remind }}</button>
          }
          <button type="button" class="btn" (click)="share(s)"><mat-icon>share</mat-icon> {{ t().share }}</button>
          @if (s.mapsUrl) {
            <a class="btn" [href]="s.mapsUrl" target="_blank" rel="noopener"><mat-icon>place</mat-icon> {{ t().route }}</a>
          }
        </div>
        @if (!past()) {
          <p class="hint">{{ t().remindHint }}</p>
        }

        <!-- vergangene Konzerte: Rückblick aus der Historie mit Fotos -->
        @if (recap(); as h) {
          <section class="recap" aria-labelledby="recap-title">
            <p class="kicker">{{ t().recap }}</p>
            <h3 id="recap-title">{{ content.t(h.title) }}</h3>
            @for (img of h.images ?? []; track img.src) {
              <figure>
                <img [src]="img.src" [alt]="content.t(img.alt)" loading="lazy" decoding="async" />
                @if (img.credit) { <figcaption>{{ t().photo }}: {{ img.credit }}</figcaption> }
              </figure>
            }
            <p>{{ content.t(h.text[0]) }}</p>
            <app-uebersetzung-hinweis [status]="content.status(h.title, h.text[0])" />
            <div class="recap-links">
              <a class="btn" [routerLink]="'/historie' | loc" [fragment]="'e-' + s.date"><mat-icon>history_edu</mat-icon> {{ t().readAll }}</a>
              @if (h.reel) {
                <a class="btn" [href]="'https://www.instagram.com/reel/' + h.reel + '/'" target="_blank" rel="noopener"><mat-icon>play_circle</mat-icon> {{ t().video }}</a>
              }
            </div>
          </section>
        }

        <div class="more">
          <p>{{ t().more }}</p>
          <a class="btn" [routerLink]="'/booking' | loc"><mat-icon>event_available</mat-icon> {{ t().booking }}</a>
        </div>
      } @else {
        <h2>{{ t().notFound }}</h2>
        <p class="lead">{{ t().notFoundText }} <a [routerLink]="'/' | loc" fragment="tour">{{ t().list }}</a>.</p>
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
  private readonly i18n = inject(I18n);
  protected readonly content = inject(Content);
  protected readonly t = this.i18n.t(TEXT);
  // nur öffentliche, geklärte Konzerte haben eine eigene Seite
  protected readonly show = computed(() => this.band.publicShows.find((s) => this.band.showId(s) === this.id()));
  private readonly today = new Date().toISOString().slice(0, 10);
  protected readonly past = computed(() => (this.show()!.endDate ?? this.show()!.date) < this.today);
  protected readonly recap = computed(() => this.band.history.find((h) => h.date === this.show()?.date && !h.example));

  constructor() {
    const pageMeta = inject(PageMetaService);
    effect(() => {
      const s = this.show();
      const t = this.t();
      const when = s ? t.metaDate(s.date) : '';
      pageMeta.set({
        title: s ? `${s.venue}${s.city ? ', ' + s.city : ''} – ${when} – Blickfeld Nord live` : t.metaFallback,
        description: s ? t.metaDescription(when, s.time, `${s.venue}${s.city ? t.in + s.city : ''}`, s.price === 0) : undefined,
        path: this.i18n.link(`/konzerte/${this.id()}`).slice(1),
      });
    });
  }

  protected remind(s: Show): void {
    downloadIcs([s], icsFileName(s), 'Blickfeld Nord', false, true, { lang: this.i18n.lang() });
  }

  protected share(s: Show): void {
    shareShow(s, this.band.showId(s), this.content.t(this.band.publicVenue(s)), this.i18n.lang());
  }
}
