import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { downloadIcs } from '../data/calendar';
import { SetlistStats } from './setlist-stats';
import { AboButton } from '../sections/abo-button';
import { BandService, Show } from '../data/band.service';

// Versteckte Übersicht aller Auftritte (auch private), erreichbar per Easter Egg:
// fünfmal schnell auf das Logo oben links klicken. Jede Zeile führt zur Unterseite des Auftritts.
@Component({
  selector: 'app-backstage',
  imports: [DatePipe, MatTableModule, MatIconModule, SetlistStats, AboButton],
  template: `
    <section class="section">
      <p class="kicker">Nur für die Band</p>
      <h2>Backstage</h2>
      <p class="lead">Alle Auftritte – öffentlich und privat – mit Status und Notizen, dazu die Probetermine. Für Details, Plakat, Setlist und Packliste einfach einen Auftritt antippen.</p>

      <div class="summary">
        <span><strong>{{ shows.length }}</strong> Auftritte</span>
        <span><strong>{{ confirmed }}</strong> geklärt</span>
        <span><strong>{{ open }}</strong> offen</span>
        <span><strong>{{ privateCount }}</strong> privat</span>
        <app-abo-button class="export" path="backstage/kalender.ics" (download)="exportAll()" />
      </div>

      <div class="filters" role="group" aria-label="Termine filtern">
        @for (f of filters; track f.key) {
          <button type="button" [class.on]="filter() === f.key" [attr.aria-pressed]="filter() === f.key" (click)="filter.set(f.key)">
            <mat-icon>{{ f.icon }}</mat-icon> {{ f.label }} <span class="count">{{ counts()[f.key] }}</span>
          </button>
        }
      </div>

      @if (filter() === 'proben') {
        @if (rehearsals.length) {
          <div class="table-wrap">
            <table class="proben">
              <thead><tr><th>Datum</th><th>Zeit</th><th>Ort</th><th>Notiz</th></tr></thead>
              <tbody>
                @for (r of rehearsals; track r.date + r.time) {
                  <tr [class.past]="r.date < today">
                    <td class="date">{{ r.date | date: 'EEE, dd.MM.yyyy' : '' : 'de' }}</td>
                    <td>{{ r.time ? r.time + (r.endTime ? '–' + r.endTime : '') + ' Uhr' : '–' }}</td>
                    <td>{{ r.place || '–' }}</td>
                    <td class="comment">{{ r.note || '–' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="empty">Noch keine Probetermine eingetragen (src/app/data/band.service.ts → rehearsals).</p>
        }
      } @else if (!visible().length) {
        <p class="empty">{{ filter() === 'kommend' ? 'Keine ausstehenden Auftritte.' : 'Noch keine vergangenen Auftritte.' }}</p>
      } @else {
      <div class="table-wrap">
        <table mat-table [dataSource]="visible()">
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Datum</th>
            <td mat-cell *matCellDef="let s" class="date" [class.past]="(s.endDate ?? s.date) < today">{{ s.date | date: 'EEE, dd.MM.yyyy' : '' : 'de' }}@if (s.time) {<span class="time">{{ s.time }} Uhr</span>}@if (s.endDate) {<br />– {{ s.endDate | date: 'EEE, dd.MM.yyyy' : '' : 'de' }}}</td>
          </ng-container>
          <ng-container matColumnDef="venue">
            <th mat-header-cell *matHeaderCellDef>Auftritt</th>
            <td mat-cell *matCellDef="let s">
              <strong>{{ s.venue }}</strong>
              @if (s.city) { <span class="sub">{{ s.city }}</span> }
            </td>
          </ng-container>
          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef>Art</th>
            <td mat-cell *matCellDef="let s">
              <span class="tag" [class.private]="s.private">{{ s.private ? 'Privat' : 'Öffentlich' }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let s">
              <span class="status" [class.ok]="s.confirmed">
                <mat-icon>{{ s.confirmed ? 'check_circle' : 'schedule' }}</mat-icon>
                {{ s.confirmed ? 'Geklärt' : 'Offen' }}
              </span>
            </td>
          </ng-container>
          <ng-container matColumnDef="comment">
            <th mat-header-cell *matHeaderCellDef>Kommentar</th>
            <td mat-cell *matCellDef="let s" class="comment">{{ s.comment || '–' }}</td>
          </ng-container>
          <ng-container matColumnDef="open">
            <th mat-header-cell *matHeaderCellDef><span class="sr-only">Öffnen</span></th>
            <td mat-cell *matCellDef="let s" class="open"><mat-icon>chevron_right</mat-icon></td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns" class="link" tabindex="0" role="link"
              [attr.aria-label]="row.venue + ', ' + (row.date | date: 'd. MMMM yyyy' : '' : 'de') + ' – Details öffnen'"
              (click)="openShow(row)" (keydown.enter)="openShow(row)"></tr>
        </table>
      </div>
      }

      <app-setlist-stats />
    </section>
  `,
  styles: `
    .summary {
      display: flex; flex-wrap: wrap; gap: 24px; margin-bottom: 20px;
      font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .16em; font-size: .72rem; color: var(--bn-fog);
    }
    .summary { align-items: center; }
    .export { margin-left: auto; text-transform: none; letter-spacing: normal; }
    .summary strong { color: var(--bn-ink); font-size: 1rem; margin-right: 4px; }
    .filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .filters button {
      display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; cursor: pointer;
      border: 1px solid var(--bn-line); background: transparent; color: var(--bn-ink); font: inherit; font-size: .9rem;
    }
    .filters button:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .filters button.on { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    .filters mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .count { font-size: .78rem; opacity: .75; font-variant-numeric: tabular-nums; }
    .empty { padding: 20px; border: 1px dashed var(--bn-line); border-radius: 12px; color: var(--bn-fog); }
    .proben { border-collapse: collapse; }
    .proben th, .proben td { text-align: left; padding: 14px 16px; border-bottom: 1px solid var(--bn-line); }
    .proben th { font-weight: 500; font-size: .85rem; color: var(--bn-fog); }
    .table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--mat-sys-outline-variant); }
    table { width: 100%; min-width: 820px; background: transparent; }
    .date { white-space: nowrap; font-variant-numeric: tabular-nums; }
    .past { opacity: .45; }
    .time { display: block; font-size: .82rem; color: var(--bn-sunset); }
    .sub { display: block; font-size: .85rem; opacity: .7; }
    .tag {
      display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: .75rem;
      border: 1px solid var(--bn-line); color: var(--bn-fog);
    }
    .tag.private { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .status { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; color: #e0b25a; }
    .status.ok { color: #7fc29b; }
    .status mat-icon { font-size: 18px; width: 18px; height: 18px; }
    tr.link { cursor: pointer; transition: background .15s; }
    tr.link:hover, tr.link:focus-visible { background: rgba(232, 164, 106, .07); outline: none; }
    tr.link:focus-visible { box-shadow: inset 3px 0 0 var(--bn-sunset); }
    .open { width: 32px; color: var(--bn-fog); }
    tr.link:hover .open { color: var(--bn-sunset); }
    .comment { max-width: 320px; white-space: pre-line; color: rgba(236, 233, 228, .82); }
  `,
})
export class Backstage implements OnDestroy {
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  private readonly band = inject(BandService);
  protected readonly shows = [...this.band.shows].sort((a, b) => a.date.localeCompare(b.date));
  protected readonly columns = ['date', 'venue', 'type', 'status', 'comment', 'open'];
  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly rehearsals = [...this.band.rehearsals].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));

  // Filter über der Tabelle: ausstehende Auftritte (Standard), Probetermine, vergangene Auftritte (neueste zuerst)
  protected readonly filters = [
    { key: 'kommend', label: 'Ausstehende Auftritte', icon: 'upcoming' },
    { key: 'proben', label: 'Probetermine', icon: 'music_note' },
    { key: 'vergangen', label: 'Vergangene Auftritte', icon: 'history' },
  ] as const;
  protected readonly filter = signal<'kommend' | 'proben' | 'vergangen'>('kommend');
  private readonly upcoming = this.shows.filter((s) => (s.endDate ?? s.date) >= this.today);
  private readonly pastShows = this.shows.filter((s) => (s.endDate ?? s.date) < this.today).reverse();
  protected readonly counts = computed(() => ({
    kommend: this.upcoming.length,
    proben: this.rehearsals.filter((r) => r.date >= this.today).length,
    vergangen: this.pastShows.length,
  }));
  protected readonly visible = computed(() => (this.filter() === 'vergangen' ? this.pastShows : this.upcoming));
  protected readonly confirmed = this.shows.filter((s) => s.confirmed).length;
  protected readonly open = this.shows.length - this.confirmed;
  protected readonly privateCount = this.shows.filter((s) => s.private).length;

  constructor() {
    // Suchmaschinen sollen die Seite nicht aufnehmen
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    // Direktaufruf einer Unterseite: GitHub Pages leitet /backstage/<id>[/<teil>] über die Fehlerseite
    // nach /backstage/?auftritt=<id>[&teil=<teil>] um – von hier geht es zur eigentlichen Unterseite weiter.
    const query = inject(ActivatedRoute).snapshot.queryParamMap;
    const id = query.get('auftritt');
    const teil = query.get('teil');
    if (id) this.router.navigate(['/backstage', id, ...(teil ? [teil] : [])], { replaceUrl: true });
  }

  protected openShow(s: Show): void {
    this.router.navigate(['/backstage', this.band.showId(s)]);
  }

  // Bandkalender inkl. privater Termine, Status und Kommentaren
  protected exportAll(): void {
    downloadIcs(this.shows, 'blickfeld-nord-backstage.ics', 'Blickfeld Nord – Backstage', true, false, { rehearsals: this.rehearsals });
  }

  ngOnDestroy(): void {
    this.meta.removeTag("name='robots'");
  }
}
