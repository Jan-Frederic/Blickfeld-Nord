import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';

@Component({
  selector: 'app-tour',
  imports: [DatePipe, MatTableModule, MatButtonModule, MatIconModule],
  template: `
    <section id="tour" class="section">
      <p class="kicker">Live</p>
      <h2>Tour und Konzerte</h2>

      <div class="table-wrap">
        <table mat-table [dataSource]="shows">
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Datum</th>
            <td mat-cell *matCellDef="let s" class="date">{{ s.date | date: 'EEE, dd.MM.yyyy' : '' : 'de' }}@if (s.endDate) {<br />– {{ s.endDate | date: 'EEE, dd.MM.yyyy' : '' : 'de' }}}</td>
          </ng-container>
          <ng-container matColumnDef="city">
            <th mat-header-cell *matHeaderCellDef>Ort</th>
            <td mat-cell *matCellDef="let s"><strong>{{ s.city ?? '–' }}</strong><span class="venue-inline">{{ s.venue }}</span></td>
          </ng-container>
          <ng-container matColumnDef="venue">
            <th mat-header-cell *matHeaderCellDef class="venue">Location</th>
            <td mat-cell *matCellDef="let s" class="venue">{{ s.venue }}</td>
          </ng-container>
          <ng-container matColumnDef="action">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let s" class="action">
              @if (s.mapsUrl) {
                <a mat-stroked-button [href]="s.mapsUrl" target="_blank" rel="noopener" [attr.aria-label]="'Anfahrt zu ' + s.venue + ' in Google Maps'">
                  <mat-icon>place</mat-icon><span class="label">Anfahrt</span>
                </a>
              }
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
      </div>
    </section>
  `,
  styles: `
    .table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--mat-sys-outline-variant); }
    table { width: 100%; background: transparent; }
    .date { white-space: nowrap; font-variant-numeric: tabular-nums; }
    .action { text-align: right; }
    .venue-inline { display: none; font-size: .85rem; opacity: .75; }
    @media (max-width: 640px) {
      .venue { display: none; }
      .venue-inline { display: block; }
      th, td { padding: 0 8px !important; }
      .action a { min-width: 0; padding: 0 12px; }
      .action .label { display: none; }
      .action mat-icon { margin: 0; }
    }
  `,
})
export class Tour {
  protected readonly shows = inject(BandService).publicShows;
  protected readonly columns = ['date', 'city', 'venue', 'action'];
}
