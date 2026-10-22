import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BackstageStats } from './backstage-stats';
import { BACKSTAGE_BEREICHE, BackstageNav } from './backstage-nav';
import { BandService } from '../data/band.service';

// Versteckter Bereich für die Band, erreichbar per Easter Egg: fünfmal schnell auf das Logo oben links klicken.
// Die Übersicht zeigt Kennzahlen und die nächsten Termine; die Themen liegen auf eigenen Unterseiten
// (Termine, Zahlen, Übersetzungen, Material, Abgleich – siehe BACKSTAGE_BEREICHE).
@Component({
  selector: 'app-backstage',
  imports: [DatePipe, RouterLink, MatIconModule, BackstageStats, BackstageNav],
  template: `
    <section class="section">
      <app-backstage-nav />
      <p class="kicker">Nur für die Band</p>
      <h2>Backstage</h2>
      <p class="lead">Alles für Planung und Auftritte an einem Ort. Die Themen findet ihr oben in der Leiste oder unten als Kacheln.</p>

      <app-backstage-stats [shows]="shows" [rehearsals]="rehearsals" />

      <h3>Als Nächstes</h3>
      @if (next.length) {
        <ol class="next">
          @for (n of next; track n.date + n.label) {
            <li>
              <a [routerLink]="n.link">
                <span class="date">{{ n.date | date: 'EEE, dd.MM.' : '' : 'de' }}@if (n.time) { · {{ n.time }}}</span>
                <span class="what"><mat-icon>{{ n.icon }}</mat-icon> {{ n.label }}</span>
                @if (n.status) { <span class="status" [class.ok]="n.status === 'Geklärt'">{{ n.status }}</span> }
              </a>
            </li>
          }
        </ol>
      } @else {
        <p class="empty">Keine kommenden Termine eingetragen.</p>
      }

      <ul class="tiles">
        @for (b of bereiche; track b.path) {
          <li>
            <a [routerLink]="b.path">
              <mat-icon>{{ b.icon }}</mat-icon>
              <span class="title">{{ b.label }}</span>
              <span class="text">{{ b.text }}</span>
            </a>
          </li>
        }
      </ul>
    </section>
  `,
  styles: `
    h3 { margin: 32px 0 12px; font-family: var(--bn-wide); font-weight: 400; text-transform: uppercase; letter-spacing: .14em; font-size: .85rem; }
    .next { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    .next a {
      display: grid; grid-template-columns: 9em 1fr auto; align-items: center; gap: 12px; padding: 12px 16px;
      border-radius: 10px; border: 1px solid var(--bn-line); color: var(--bn-ink); text-decoration: none;
    }
    .next a:hover { border-color: var(--bn-sunset); }
    .date { font-variant-numeric: tabular-nums; color: var(--bn-sunset); font-size: .9rem; }
    .what { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .what mat-icon, .tiles mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--bn-fog); }
    .status { font-size: .8rem; color: #e0b25a; }
    .status.ok { color: #5fb88a; }
    .empty { padding: 16px; border: 1px dashed var(--bn-line); border-radius: 12px; color: var(--bn-fog); }
    .tiles { list-style: none; margin: 32px 0 0; padding: 0; display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); }
    .tiles a {
      display: grid; align-content: start; gap: 6px; height: 100%; box-sizing: border-box; padding: 18px; border-radius: 12px;
      border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); color: var(--bn-ink); text-decoration: none;
    }
    .tiles a:hover { border-color: var(--bn-sunset); }
    .tiles mat-icon { color: var(--bn-sunset); }
    .title { font-weight: 600; }
    .text { font-size: .85rem; line-height: 1.5; color: var(--bn-fog); }
    @media (max-width: 560px) {
      .next a { grid-template-columns: 1fr auto; }
      .what { grid-column: 1 / -1; grid-row: 2; }
    }
  `,
})
export class Backstage {
  private readonly router = inject(Router);
  protected readonly band = inject(BandService);
  protected readonly shows = [...this.band.shows].sort((a, b) => a.date.localeCompare(b.date));
  protected readonly rehearsals = [...this.band.rehearsals].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
  protected readonly bereiche = BACKSTAGE_BEREICHE.slice(1);

  // die nächsten vier Termine – Auftritte und Proben gemischt
  private readonly today = new Date().toISOString().slice(0, 10);
  protected readonly next = [
    ...this.shows
      .filter((s) => (s.endDate ?? s.date) >= this.today)
      .map((s) => ({
        date: s.date,
        time: s.time,
        label: s.venue + (s.city ? ', ' + s.city : ''),
        icon: s.private ? 'lock' : 'celebration',
        status: s.confirmed ? 'Geklärt' : 'Offen',
        link: ['/backstage', this.band.showId(s)],
      })),
    ...this.rehearsals
      .filter((r) => r.date >= this.today)
      .map((r) => ({ date: r.date, time: r.time, label: 'Probe' + (r.place ? ', ' + r.place : ''), icon: 'music_note', status: '', link: ['/backstage/probe', r.date] })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
    .slice(0, 4);

  constructor() {
    // Direktaufruf einer Unterseite: GitHub Pages leitet /backstage/<id>[/<teil>] über die Fehlerseite
    // nach /backstage/?auftritt=<id>[&teil=<teil>] um – von hier geht es zur eigentlichen Unterseite weiter.
    const query = inject(ActivatedRoute).snapshot.queryParamMap;
    const id = query.get('auftritt');
    const teil = query.get('teil');
    if (id) this.router.navigate(['/backstage', id, ...(teil ? [teil] : [])], { replaceUrl: true });
  }
}
