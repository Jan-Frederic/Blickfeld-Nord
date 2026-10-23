import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { alleBewertungen, rangliste } from '../data/bewertung';

// Backstage → Zahlen: Top 100 aus den Sternen im Bühnen-Modus (localStorage „bn-bewertung-<Auftritt>“).
// Bewertungen anderer Geräte kommen über „Datei importieren“ dazu und werden dabei zusammengeführt.
const ANFANG = 20;

@Component({
  selector: 'app-song-rangliste',
  imports: [MatIconModule],
  template: `
    <section class="stats" aria-labelledby="rang-title">
      <p class="kicker">Bühnen-Modus</p>
      <h3 id="rang-title">Top 100 unserer Songs</h3>

      @if (plaetze().length) {
        <p class="summary">
          <span><strong>{{ plaetze().length }}</strong> {{ plaetze().length === 1 ? 'Song' : 'Songs' }} bewertet</span>
          <span><strong>{{ auftritte() }}</strong> {{ auftritte() === 1 ? 'Auftritt' : 'Auftritte' }}</span>
        </p>
        <ol class="top">
          @for (p of gezeigt(); track p.title + p.artist) {
            <li>
              <span class="song"><strong>{{ p.title }}</strong> {{ p.artist }}</span>
              <span class="sterne" [attr.aria-label]="'Schnitt ' + komma(p.schnitt) + ' Sterne'">
                @for (n of [1, 2, 3, 4, 5]; track n) { <mat-icon aria-hidden="true">{{ n <= p.schnitt + 0.25 ? 'star' : n - 0.75 <= p.schnitt ? 'star_half' : 'star_border' }}</mat-icon> }
              </span>
              <span class="count">{{ komma(p.schnitt) }}</span>
              <span class="anzahl">{{ p.anzahl }}×</span>
            </li>
          }
        </ol>
        @if (plaetze().length > anfang) {
          <button type="button" class="more" (click)="alle.set(!alle())">
            <mat-icon>{{ alle() ? 'expand_less' : 'expand_more' }}</mat-icon> {{ alle() ? 'Nur die Top ' + anfang : 'Alle ' + plaetze().length + ' Plätze' }}
          </button>
        }
      } @else {
        <p class="empty">Noch keine Sterne vergeben – im Bühnen-Modus einer Setlist unter jedem Song 1 bis 5 Sterne antippen.</p>
      }
      <p class="hint">
        Reihenfolge nach Sterne-Schnitt; Songs mit nur einer Bewertung rücken etwas zur Mitte, bis sie öfter bewertet sind.
        Sterne von anderen Handys kommen über „Datei importieren“ dazu.
      </p>
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
      counter-increment: n; display: grid; grid-template-columns: 2.2em minmax(0, 1fr) auto 2.2em 2.5em;
      align-items: center; gap: 10px; padding: 8px 0; border-top: 1px solid var(--bn-line);
    }
    .top li::before { content: counter(n) '.'; color: var(--bn-fog); font-variant-numeric: tabular-nums; }
    .song { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--bn-fog); font-size: .9rem; }
    .song strong { color: var(--bn-ink); font-weight: 500; margin-right: 6px; }
    .sterne { display: inline-flex; color: var(--bn-sunset); }
    .sterne mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .count, .anzahl { text-align: right; font-variant-numeric: tabular-nums; }
    .anzahl { color: var(--bn-fog); font-size: .85rem; }
    .more {
      display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; padding: 6px 14px; border-radius: 999px; cursor: pointer;
      border: 1px solid var(--bn-line); background: transparent; color: var(--bn-ink); font: inherit; font-size: .85rem;
    }
    .more:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .empty { margin: 0; color: var(--bn-fog); }
    .hint { margin: 16px 0 0; font-size: .8rem; color: var(--bn-fog); }
    @media (max-width: 600px) {
      .stats { padding: 16px; }
      .top li { grid-template-columns: 1.8em minmax(0, 1fr) 2.2em 2.5em; }
      .sterne { display: none; }
    }
  `,
})
export class SongRangliste {
  private readonly band = inject(BandService);
  protected readonly anfang = ANFANG;
  protected readonly alle = signal(false);
  // nur Bewertungen zu Auftritten, die es (noch) gibt
  private readonly je = signal(alleBewertungen((show) => !!this.band.showById(show)));
  protected readonly auftritte = computed(() => this.je().filter((b) => Object.keys(b).length).length);
  protected readonly plaetze = computed(() => rangliste(this.je()));
  protected readonly gezeigt = computed(() => (this.alle() ? this.plaetze() : this.plaetze().slice(0, ANFANG)));

  protected komma(n: number): string {
    return n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
}
