import { Component, OnDestroy, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Meta } from '@angular/platform-browser';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';

// Versteckte Übersicht aller Auftritte (auch private), erreichbar per Easter Egg:
// fünfmal schnell auf das Logo oben links klicken.
@Component({
  selector: 'app-backstage',
  imports: [DatePipe, MatTableModule, MatIconModule],
  template: `
    <section class="section">
      <p class="kicker">Nur für die Band</p>
      <h2>Backstage</h2>
      <p class="lead">Alle Auftritte – öffentlich und privat – mit Status und Notizen.</p>

      <div class="summary">
        <span><strong>{{ shows.length }}</strong> Auftritte</span>
        <span><strong>{{ open }}</strong> offen</span>
        <span><strong>{{ privateCount }}</strong> privat</span>
      </div>

      <div class="table-wrap">
        <table mat-table [dataSource]="shows">
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Datum</th>
            <td mat-cell *matCellDef="let s" class="date" [class.past]="(s.endDate ?? s.date) < today">{{ s.date | date: 'EEE, dd.MM.yyyy' : '' : 'de' }}@if (s.endDate) {<br />– {{ s.endDate | date: 'EEE, dd.MM.yyyy' : '' : 'de' }}}</td>
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
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
      </div>
    </section>
  `,
  styles: `
    .summary {
      display: flex; flex-wrap: wrap; gap: 24px; margin-bottom: 20px;
      font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .16em; font-size: .72rem; color: var(--bn-fog);
    }
    .summary strong { color: var(--bn-ink); font-size: 1rem; margin-right: 4px; }
    .table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--mat-sys-outline-variant); }
    table { width: 100%; min-width: 720px; background: transparent; }
    .date { white-space: nowrap; font-variant-numeric: tabular-nums; }
    .past { opacity: .45; }
    .sub { display: block; font-size: .85rem; opacity: .7; }
    .tag {
      display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: .75rem;
      border: 1px solid var(--bn-line); color: var(--bn-fog);
    }
    .tag.private { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .status { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; color: #e0b25a; }
    .status.ok { color: #7fc29b; }
    .status mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .comment { max-width: 320px; white-space: pre-line; color: rgba(236, 233, 228, .82); }
  `,
})
export class Backstage implements OnDestroy {
  private readonly meta = inject(Meta);
  protected readonly shows = [...inject(BandService).shows].sort((a, b) => a.date.localeCompare(b.date));
  protected readonly columns = ['date', 'venue', 'type', 'status', 'comment'];
  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly open = this.shows.filter((s) => !s.confirmed).length;
  protected readonly privateCount = this.shows.filter((s) => s.private).length;

  constructor() {
    // Suchmaschinen sollen die Seite nicht aufnehmen
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  ngOnDestroy(): void {
    this.meta.removeTag("name='robots'");
  }
}
