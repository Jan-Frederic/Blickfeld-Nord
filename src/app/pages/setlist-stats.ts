import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import data from '../data/repertoire.json';

// Backstage: Welche Songs stehen wie oft auf unseren Setlists? Ausgewertet werden alle Setlists, die in diesem
// Browser gespeichert sind (localStorage „bn-setlist-<Auftritt>“) – dazu, was aus dem Repertoire noch nie dran war.

type Song = { title: string; artist: string };
type Stat = Song & { count: number; last: { id: string; date: string; venue: string } };

const PREFIX = 'bn-setlist-';
const TOP = 15;

@Component({
  selector: 'app-setlist-stats',
  imports: [RouterLink, MatIconModule],
  template: `
    <section class="stats" aria-labelledby="stats-title">
      <p class="kicker">Auswertung</p>
      <h3 id="stats-title">Setlist-Statistik</h3>

      @if (setlists().length) {
        <p class="summary">
          <span><strong>{{ setlists().length }}</strong> {{ setlists().length === 1 ? 'Setlist' : 'Setlists' }}</span>
          <span><strong>{{ stats().length }}</strong> verschiedene Songs</span>
          <span><strong>{{ unplayed().length }}</strong> noch nie gespielt</span>
        </p>

        <ol class="top">
          @for (s of shown(); track s.title + s.artist) {
            <li>
              <span class="song"><strong>{{ s.title }}</strong> {{ s.artist }}</span>
              <span class="bar"><span [style.width.%]="(s.count / max()) * 100"></span></span>
              <span class="count">{{ s.count }}×</span>
              <a class="last" [routerLink]="['/backstage', s.last.id]" title="Zuletzt auf dieser Setlist">{{ de(s.last.date) }}</a>
            </li>
          }
        </ol>
        @if (stats().length > top) {
          <button type="button" class="more" (click)="all.set(!all())">
            <mat-icon>{{ all() ? 'expand_less' : 'expand_more' }}</mat-icon> {{ all() ? 'Nur die Top ' + top : 'Alle ' + stats().length + ' Songs' }}
          </button>
        }

        @if (unplayed().length) {
          <details>
            <summary>Noch auf keiner Setlist ({{ unplayed().length }})</summary>
            <p class="unplayed">
              @for (t of unplayed(); track t.title + t.artist) { <span>{{ t.title }} <small>{{ t.artist }}</small></span> }
            </p>
          </details>
        }
      } @else {
        <p class="empty">Noch keine Setlists auf diesem Gerät – einen Auftritt öffnen und dort die Setlist zusammenstellen.</p>
      }
      <p class="hint">Gezählt werden nur Setlists, die in diesem Browser auf diesem Gerät gespeichert sind.</p>
    </section>
  `,
  styles: `
    .stats { margin-top: 40px; padding: 24px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    .kicker { margin-bottom: 4px; }
    h3 { font-family: var(--bn-display); font-weight: 400; font-size: 1.3rem; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 14px; }
    .summary { display: flex; flex-wrap: wrap; gap: 8px 24px; margin: 0 0 16px; color: var(--bn-fog); }
    .summary strong { color: var(--bn-sunset); font-size: 1.2rem; margin-right: 4px; }
    .top { list-style: none; margin: 0; padding: 0; counter-reset: n; }
    .top li {
      counter-increment: n; display: grid; grid-template-columns: 2em minmax(0, 1fr) minmax(60px, 160px) 2.5em 5.5em;
      align-items: center; gap: 12px; padding: 8px 0; border-top: 1px solid var(--bn-line);
    }
    .top li::before { content: counter(n) '.'; color: var(--bn-fog); font-variant-numeric: tabular-nums; }
    .song { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--bn-fog); font-size: .9rem; }
    .song strong { color: var(--bn-ink); font-weight: 500; margin-right: 6px; }
    .bar { height: 6px; border-radius: 3px; background: var(--bn-line); overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--bn-sunset); }
    .count { text-align: right; font-variant-numeric: tabular-nums; }
    .last { font-size: .8rem; color: var(--bn-fog); font-variant-numeric: tabular-nums; }
    .last:hover { color: var(--bn-sunset); }
    .more {
      display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; padding: 6px 14px; border-radius: 999px; cursor: pointer;
      border: 1px solid var(--bn-line); background: transparent; color: var(--bn-ink); font: inherit; font-size: .85rem;
    }
    .more:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    details { margin-top: 18px; }
    summary { cursor: pointer; color: var(--bn-fog); font-size: .9rem; }
    summary:hover { color: var(--bn-sunset); }
    .unplayed { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 0; }
    .unplayed span { padding: 3px 10px; border-radius: 999px; border: 1px solid var(--bn-line); font-size: .82rem; }
    .unplayed small { color: var(--bn-fog); }
    .empty { margin: 0; color: var(--bn-fog); }
    .hint { margin: 16px 0 0; font-size: .8rem; color: var(--bn-fog); }
    @media (max-width: 600px) {
      .stats { padding: 16px; }
      .top li { grid-template-columns: 1.6em minmax(0, 1fr) 2.5em; }
      .bar, .last { display: none; }
    }
  `,
})
export class SetlistStats {
  private readonly band = inject(BandService);
  protected readonly top = TOP;
  protected readonly all = signal(false);

  // Alle gespeicherten Setlists mit Auftritt (Setlists gelöschter Termine bleiben außen vor)
  protected readonly setlists = signal(this.read());

  protected readonly stats = computed<Stat[]>(() => {
    const map = new Map<string, Stat>();
    for (const { id, date, venue, songs } of this.setlists()) {
      for (const s of new Map(songs.map((x) => [`${x.title}|${x.artist}`, x])).values()) {
        const key = `${s.title}|${s.artist}`;
        const hit = map.get(key);
        if (!hit) map.set(key, { ...s, count: 1, last: { id, date, venue } });
        else {
          hit.count++;
          if (date > hit.last.date) hit.last = { id, date, venue };
        }
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count || b.last.date.localeCompare(a.last.date) || a.title.localeCompare(b.title));
  });

  protected readonly shown = computed(() => (this.all() ? this.stats() : this.stats().slice(0, TOP)));
  protected readonly max = computed(() => this.stats()[0]?.count ?? 1);
  protected readonly unplayed = computed(() => {
    const played = new Set(this.stats().map((s) => `${s.title}|${s.artist}`));
    return data.tracks.filter((t) => !played.has(`${t.title}|${t.artist}`));
  });

  protected de(date: string): string {
    return date.split('-').reverse().join('.');
  }

  private read(): { id: string; date: string; venue: string; songs: Song[] }[] {
    const lists = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(PREFIX)) continue;
        const id = key.slice(PREFIX.length);
        const show = this.band.showById(id);
        if (!show) continue;
        const entries = JSON.parse(localStorage.getItem(key) ?? '[]') as (Song | { pause: true })[];
        const songs = entries.filter((e): e is Song => 'title' in e);
        if (songs.length) lists.push({ id, date: show.date, venue: show.venue, songs });
      }
    } catch {
      // kein Zugriff auf localStorage (z. B. privater Modus) – dann eben keine Statistik
    }
    return lists;
  }
}
