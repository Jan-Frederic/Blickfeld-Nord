import { Component, computed, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import data from '../data/repertoire.json';

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
  imports: [MatIconModule],
  template: `
    @if (total) {
      <div class="repertoire" id="repertoire">
        <div class="head">
          <h3>Unser Repertoire <span class="count">{{ total }} Songs</span></h3>
          <div class="controls">
            <label class="search">
              <mat-icon aria-hidden="true">search</mat-icon>
              <input type="search" placeholder="Song oder Interpret suchen …" aria-label="Repertoire durchsuchen"
                     [value]="query()" (input)="query.set($any($event.target).value)" />
            </label>
            <select aria-label="Sortierung" [value]="sort()" (change)="sort.set($any($event.target).value)">
              <option value="title">Titel A–Z</option>
              <option value="artist">Interpret A–Z</option>
              <option value="year">Neueste zuerst</option>
            </select>
          </div>
        </div>

        @if (query()) {
          <p class="hits" aria-live="polite">{{ list().length }} Treffer</p>
        }
        <ol class="list">
          @for (t of list(); track t.title + t.artist) {
            <li>
              <span class="title">{{ t.title }}</span>
              <span class="artist">{{ t.artist }}@if (t.year) {<span class="year"> · {{ t.year }}</span>}</span>
              @if (t.url) {
                <a [href]="t.url" target="_blank" rel="noopener" [attr.aria-label]="t.title + ' auf Spotify anhören'">
                  <mat-icon>open_in_new</mat-icon>
                </a>
              }
            </li>
          } @empty {
            <li class="none">Nichts gefunden – fragt gern trotzdem, viele Wünsche erfüllen wir auch spontan.</li>
          }
        </ol>
        @if (updated) {
          <p class="updated">Automatisch aus unserer Spotify-Playlist, Stand {{ updated }}</p>
        }
      </div>
    }
  `,
  styles: `
    .repertoire { margin-top: 32px; padding: 24px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
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
    .list { list-style: none; margin: 0; padding: 0; max-height: 440px; overflow-y: auto; border-top: 1px solid var(--bn-line); }
    .list li { display: flex; align-items: baseline; flex-wrap: wrap; gap: 2px 12px; padding: 10px 4px; border-bottom: 1px solid var(--bn-line); }
    .title { font-weight: 500; }
    .artist { color: var(--bn-fog); font-size: .92rem; flex: 1; }
    .year { opacity: .8; }
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
  protected readonly updated = data.updated
    ? new Date(`${data.updated}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;
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
