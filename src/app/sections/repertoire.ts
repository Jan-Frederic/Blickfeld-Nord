import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import data from '../data/repertoire.json';
import { I18n, LDatePipe, tr } from '../i18n';

const TEXT = tr(
  {
    title: 'Unser Repertoire',
    songs: 'Songs',
    placeholder: 'Song oder Interpret suchen …',
    search: 'Repertoire durchsuchen',
    sort: 'Sortierung',
    byTitle: 'Titel A–Z',
    byArtist: 'Interpret A–Z',
    byYear: 'Neueste zuerst',
    hits: 'Treffer',
    listen: ' auf Spotify anhören',
    none: 'Nichts gefunden – fragt gern trotzdem, viele Wünsche erfüllen wir auch spontan.',
    updated: 'Automatisch aus unserer Spotify-Playlist, Stand',
  },
  {
    title: 'Our repertoire',
    songs: 'songs',
    placeholder: 'Search song or artist …',
    search: 'Search the repertoire',
    sort: 'Sort order',
    byTitle: 'Title A–Z',
    byArtist: 'Artist A–Z',
    byYear: 'Newest first',
    hits: 'results',
    listen: ' – listen on Spotify',
    none: 'Nothing found – feel free to ask anyway, we often fulfil requests on the spot.',
    updated: 'Automatically taken from our Spotify playlist, as of',
  },
  {
    title: 'Ons repertoire',
    songs: 'nummers',
    placeholder: 'Zoek nummer of artiest …',
    search: 'Repertoire doorzoeken',
    sort: 'Sortering',
    byTitle: 'Titel A–Z',
    byArtist: 'Artiest A–Z',
    byYear: 'Nieuwste eerst',
    hits: 'resultaten',
    listen: ' beluisteren op Spotify',
    none: 'Niets gevonden – vraag het gerust toch, veel verzoeken vervullen we ook spontaan.',
    updated: 'Automatisch uit onze Spotify-playlist, stand',
  },
);

interface Track {
  title: string;
  artist: string;
  year?: number;
  url?: string;
}

type Sort = 'title' | 'artist' | 'year';

const tracks = data.tracks as Track[];

// für die Suche: Groß/klein und Akzente egal („Café“ findet „cafe“)
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Durchsuchbares Repertoire – Daten kommen automatisch aus der Spotify-Playlist (scripts/sync-repertoire.mjs)
@Component({
  selector: 'app-repertoire',
  imports: [MatIconModule, LDatePipe],
  template: `
    @if (total) {
      <div class="repertoire" id="repertoire">
        <div class="head">
          <h3>{{ t().title }} <span class="count">{{ total }} {{ t().songs }}</span></h3>
          <div class="controls">
            <label class="search">
              <mat-icon aria-hidden="true">search</mat-icon>
              <input type="search" [placeholder]="t().placeholder" [attr.aria-label]="t().search"
                     [value]="query()" (input)="query.set($any($event.target).value)" />
            </label>
            <select [attr.aria-label]="t().sort" [value]="sort()" (change)="sort.set($any($event.target).value)">
              <option value="title">{{ t().byTitle }}</option>
              <option value="artist">{{ t().byArtist }}</option>
              <option value="year">{{ t().byYear }}</option>
            </select>
          </div>
        </div>

        @if (query()) {
          <p class="hits" aria-live="polite">{{ list().length }} {{ t().hits }}</p>
        }
        <ol class="list">
          @for (s of list(); track s.title + s.artist) {
            <li>
              <span class="title">{{ s.title }}</span>
              <span class="artist">{{ s.artist }}@if (s.year) {<span class="year"> · {{ s.year }}</span>}</span>
              @if (s.url) {
                <a [href]="s.url" target="_blank" rel="noopener" [attr.aria-label]="s.title + t().listen">
                  <mat-icon>open_in_new</mat-icon>
                </a>
              }
            </li>
          } @empty {
            <li class="none">{{ t().none }}</li>
          }
        </ol>
        @if (updated) {
          <p class="updated">{{ t().updated }} {{ updated | ldate: 'short' }}</p>
        }
      </div>
    }
  `,
  styles: `
    .repertoire { margin-top: 32px; scroll-margin-top: 80px; padding: 24px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    .head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 20px; margin-bottom: 14px; }
    h3 {
      font-family: var(--bn-display); font-weight: 400; font-size: 1.1rem; text-transform: uppercase;
      letter-spacing: .08em; margin: 0; display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap;
    }
    .count { font-family: var(--bn-wide); font-size: .72rem; letter-spacing: .16em; color: var(--bn-sunset); }
    .controls { display: flex; flex-wrap: wrap; gap: 8px; }
    .search {
      display: flex; align-items: center; gap: 6px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--bn-line);
    }
    .search:focus-within { border-color: var(--bn-sunset); }
    .search mat-icon { color: var(--bn-fog); font-size: 20px; width: 20px; height: 20px; }
    .search input { border: 0; background: transparent; color: var(--bn-ink); font: inherit; padding: 9px 0; width: 220px; max-width: 52vw; outline: none; }
    select {
      padding: 9px 12px; border-radius: 999px; border: 1px solid var(--bn-line); background: #1b1e22;
      color: var(--bn-ink); font: inherit; font-size: .9rem;
    }
    .hits { margin: 0 0 8px; font-size: .85rem; color: var(--bn-fog); }
    .list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--bn-line); }
    .list li { display: flex; align-items: baseline; flex-wrap: wrap; gap: 2px 12px; padding: 10px 4px; border-bottom: 1px solid var(--bn-line); }
    .title { font-weight: 500; }
    .artist { color: var(--bn-fog); font-size: .92rem; flex: 1; }
    /* fog ohne Abdunkeln – sonst zu wenig Kontrast (WCAG AA) */
    .year { opacity: 1; }
    .list a { color: var(--bn-fog); display: inline-flex; }
    .list a:hover { color: var(--bn-sunset); }
    .list a mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .none { color: var(--bn-fog); }
    .updated { margin: 12px 0 0; font-size: .78rem; color: var(--bn-fog); }
    @media (max-width: 520px) { .repertoire { padding: 16px; } }
  `,
})
export class Repertoire {
  protected readonly total = tracks.length;
  protected readonly t = inject(I18n).t(TEXT);
  protected readonly updated = data.updated ? `${data.updated}T12:00:00` : null;
  protected readonly query = signal('');
  protected readonly sort = signal<Sort>('title');

  protected readonly list = computed(() => {
    const q = norm(this.query().trim());
    const found = q ? tracks.filter((t) => norm(`${t.title} ${t.artist}`).includes(q)) : tracks;
    const by = this.sort();
    return [...found].sort((a, b) =>
      by === 'year'
        ? (b.year ?? 0) - (a.year ?? 0)
        : (by === 'artist' ? a.artist : a.title).localeCompare(by === 'artist' ? b.artist : b.title, 'de'),
    );
  });
}
