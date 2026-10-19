import { Component, OnDestroy, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { downloadIcs } from '../data/calendar';
import { SetlistStats } from './setlist-stats';
import { BandService, Show } from '../data/band.service';

// Versteckte Übersicht aller Auftritte (auch private), erreichbar per Easter Egg:
// fünfmal schnell auf das Logo oben links klicken. Jede Zeile führt zur Unterseite des Auftritts.
@Component({
  selector: 'app-backstage',
  imports: [DatePipe, MatTableModule, MatIconModule, MatButtonModule, SetlistStats],
  template: `
    <section class="section">
      <p class="kicker">Nur für die Band</p>
      <h2>Backstage</h2>
      <p class="lead">Alle Auftritte – öffentlich und privat – mit Status und Notizen. Für Details, Plakat und Packliste einfach einen Auftritt antippen.</p>

      <div class="summary">
        <span><strong>{{ shows.length }}</strong> Auftritte</span>
        <span><strong>{{ confirmed }}</strong> geklärt</span>
        <span><strong>{{ open }}</strong> offen</span>
        <span><strong>{{ privateCount }}</strong> privat</span>
        <button mat-stroked-button class="export" (click)="exportAll()">
          <mat-icon>event</mat-icon> Alle Termine als Kalender
        </button>
      </div>

      <div class="table-wrap">
        <table mat-table [dataSource]="shows">
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
    downloadIcs(this.shows, 'blickfeld-nord-backstage.ics', 'Blickfeld Nord – Backstage', true);
  }

  ngOnDestroy(): void {
    this.meta.removeTag("name='robots'");
  }
}
