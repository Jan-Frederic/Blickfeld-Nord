import { Component, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { downloadIcs, icsFileName } from '../data/calendar';
import { BandService } from '../data/band.service';
import { postText, sharePoster } from '../data/poster';
import { Packliste } from './packliste';
import { Setlist } from './setlist';
import { VorOrt } from './vorort';

const DAY = 24 * 60 * 60 * 1000;

// Backstage-Unterseite pro Auftritt (/backstage/<id>): alle Daten auf einen Blick,
// Plakat + Instagram-Text (nur öffentlich, geklärt und kommend), Vor-Ort-Checkliste, Setlist und Packliste für genau diesen Auftritt.
@Component({
  selector: 'app-backstage-show',
  imports: [DatePipe, RouterLink, MatIconModule, MatButtonModule, Packliste, Setlist, VorOrt],
  template: `
    <section class="section">
      <a class="back" routerLink="/backstage"><mat-icon>arrow_back</mat-icon> Alle Auftritte</a>

      @if (show(); as s) {
        <p class="kicker">Backstage · Auftritt</p>
        <h2>{{ s.venue }}</h2>

        <div class="badges">
          <span class="tag" [class.private]="s.private">{{ s.private ? 'Privat' : 'Öffentlich' }}</span>
          <span class="status" [class.ok]="s.confirmed">
            <mat-icon>{{ s.confirmed ? 'check_circle' : 'schedule' }}</mat-icon>
            {{ s.confirmed ? 'Geklärt' : 'Offen' }}
          </span>
          <span class="when" [class.past]="past()">{{ relative() }}</span>
        </div>

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
            <dd>{{ s.time ? s.time + ' Uhr' : 'noch offen' }}</dd>
          </div>
          <div>
            <dt><mat-icon>place</mat-icon> Ort</dt>
            <dd>
              {{ s.venue }}@if (s.city) {<br />{{ s.city }}}
              @if (s.mapsUrl) {
                <br /><a [href]="s.mapsUrl" target="_blank" rel="noopener">In Google Maps öffnen</a>
              }
            </dd>
          </div>
          <div>
            <dt><mat-icon>local_activity</mat-icon> Eintritt</dt>
            <dd>{{ s.price === 0 ? 'frei' : s.price ? s.price + ' €' : '–' }}</dd>
          </div>
          <div>
            <dt><mat-icon>groups</mat-icon> Veranstalter</dt>
            <dd>{{ s.organizer || 'Blickfeld Nord' }}</dd>
          </div>
          <div class="wide">
            <dt><mat-icon>notes</mat-icon> Kommentar</dt>
            <dd class="comment">{{ s.comment || '–' }}</dd>
          </div>
        </dl>

        <div class="actions">
          <button mat-stroked-button (click)="calendar()"><mat-icon>event_available</mat-icon> In den Kalender</button>
          @if (posterAllowed()) {
            <button mat-stroked-button (click)="poster()"><mat-icon>image</mat-icon> Plakat</button>
            <button mat-stroked-button (click)="copyText()">
              <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
              {{ copied() ? 'Kopiert!' : 'Text kopieren' }}
            </button>
          } @else {
            <p class="hint">
              <mat-icon>info</mat-icon>
              Plakat und Instagram-Text gibt es nur für kommende Auftritte, die öffentlich und geklärt sind.
            </p>
          }
        </div>

        <app-vorort [show]="id()" />

        <app-setlist [show]="id()" [title]="s.venue + ' · ' + (s.date | date: 'dd.MM.yyyy' : '' : 'de')" />

        <app-packliste [show]="id()" />

        <nav class="pager" aria-label="Weitere Auftritte">
          @if (prev(); as p) {
            <a [routerLink]="['/backstage', band.showId(p)]" class="prev">
              <mat-icon>chevron_left</mat-icon>
              <span><small>{{ p.date | date: 'dd.MM.yyyy' : '' : 'de' }}</small>{{ p.venue }}</span>
            </a>
          }
          @if (next(); as n) {
            <a [routerLink]="['/backstage', band.showId(n)]" class="next">
              <span><small>{{ n.date | date: 'dd.MM.yyyy' : '' : 'de' }}</small>{{ n.venue }}</span>
              <mat-icon>chevron_right</mat-icon>
            </a>
          }
        </nav>
      } @else {
        <h2>Auftritt nicht gefunden</h2>
        <p class="lead">Diesen Termin gibt es nicht (mehr). Zurück zur <a routerLink="/backstage">Übersicht</a>.</p>
      }
    </section>
  `,
  styles: `
    .back { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 20px; color: var(--bn-fog); text-decoration: none; font-size: .9rem; }
    .back:hover { color: var(--bn-sunset); }
    .back mat-icon { font-size: 18px; width: 18px; height: 18px; }
    h2 { overflow-wrap: anywhere; }
    .badges { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; margin: -8px 0 24px; }
    .tag {
      display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: .75rem;
      border: 1px solid var(--bn-line); color: var(--bn-fog);
    }
    .tag.private { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .status { display: inline-flex; align-items: center; gap: 6px; color: #e0b25a; font-size: .9rem; }
    .status.ok { color: #7fc29b; }
    .status mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .when { font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .14em; font-size: .72rem; color: var(--bn-sunset); }
    .when.past { color: var(--bn-fog); }
    .facts {
      display: grid; margin: 0; grid-template-columns: 1fr;
      border-radius: 12px; overflow: hidden; border: 1px solid var(--bn-line); background: #1b1e22;
    }
    /* Trennlinien rechts und unten je Feld – leere Rasterzellen bleiben so unsichtbar */
    .facts > div { padding: 16px 18px; box-shadow: 1px 0 0 var(--bn-line), 0 1px 0 var(--bn-line); }
    .facts .wide { grid-column: 1 / -1; }
    @media (min-width: 560px) { .facts { grid-template-columns: repeat(2, 1fr); } }
    /* breit: vier Spalten, Kommentar neben dem Veranstalter über die restlichen drei */
    @media (min-width: 960px) { .facts { grid-template-columns: repeat(4, 1fr); } .facts .wide { grid-column: span 3; } }
    dt {
      display: flex; align-items: center; gap: 6px; margin-bottom: 6px;
      font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .14em; font-size: .68rem; color: var(--bn-fog);
    }
    dt mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--bn-sunset); }
    dd { margin: 0; line-height: 1.55; }
    dd a { color: var(--bn-sunset); }
    .comment { white-space: pre-line; color: rgba(236, 233, 228, .86); }
    .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 20px; }
    .hint { display: flex; align-items: center; gap: 8px; margin: 0; font-size: .85rem; color: var(--bn-fog); }
    .hint mat-icon { font-size: 18px; width: 18px; height: 18px; flex: none; }
    .pager { display: flex; justify-content: space-between; gap: 12px; margin-top: 40px; }
    .pager a {
      display: flex; align-items: center; gap: 8px; max-width: 48%; padding: 10px 14px; border-radius: 10px;
      border: 1px solid var(--bn-line); color: var(--bn-ink); text-decoration: none;
    }
    .pager a:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .pager .next { margin-left: auto; text-align: right; }
    .pager span { display: flex; flex-direction: column; min-width: 0; font-size: .9rem; }
    .pager small { color: var(--bn-fog); font-size: .75rem; }
  `,
})
export class BackstageShow implements OnDestroy {
  /** Auftritts-ID aus der URL (/backstage/:id) */
  readonly id = input.required<string>();

  protected readonly band = inject(BandService);
  private readonly meta = inject(Meta);
  private readonly sorted = [...this.band.shows].sort((a, b) => a.date.localeCompare(b.date));
  private readonly today = new Date().toISOString().slice(0, 10);

  protected readonly show = computed(() => this.band.showById(this.id()));
  private readonly index = computed(() => this.sorted.indexOf(this.show()!));
  protected readonly prev = computed(() => (this.index() > 0 ? this.sorted[this.index() - 1] : undefined));
  protected readonly next = computed(() => (this.index() >= 0 ? this.sorted[this.index() + 1] : undefined));

  protected readonly past = computed(() => (this.show()!.endDate ?? this.show()!.date) < this.today);
  protected readonly posterAllowed = computed(() => {
    const s = this.show()!;
    return !s.private && s.confirmed && !this.past();
  });

  // „in 12 Tagen“, „heute“, „vor 3 Tagen“ – nach Kalendertagen
  protected readonly relative = computed(() => {
    const s = this.show()!;
    const start = Math.round((Date.parse(s.date) - Date.parse(this.today)) / DAY);
    const end = Math.round((Date.parse(s.endDate ?? s.date) - Date.parse(this.today)) / DAY);
    if (start <= 0 && end >= 0) return 'heute';
    if (start === 1) return 'morgen';
    if (start > 1) return `in ${start} Tagen`;
    return end === -1 ? 'gestern' : `vor ${-end} Tagen`;
  });

  constructor() {
    // Suchmaschinen sollen die Seite nicht aufnehmen
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  protected poster(): void {
    sharePoster(this.show()!).catch((err) => console.error(err));
  }

  // Instagram-Text (Datum, Ort, Eintritt, Hashtags) in die Zwischenablage
  protected readonly copied = signal(false);
  protected async copyText(): Promise<void> {
    const text = postText(this.show()!);
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Fallback, falls die Zwischenablage gesperrt ist: Text zum manuellen Kopieren anzeigen
      window.prompt('Text kopieren:', text);
    }
  }

  // Einzeltermin mit Status und Kommentar für den eigenen Kalender
  protected calendar(): void {
    const s = this.show()!;
    downloadIcs([s], icsFileName(s), 'Blickfeld Nord – Backstage', true);
  }

  ngOnDestroy(): void {
    this.meta.removeTag("name='robots'");
  }
}
