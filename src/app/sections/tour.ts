import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BandService, Show } from '../data/band.service';

type Filter = 'alle' | 'verfuegbar';

@Component({
  selector: 'app-tour',
  imports: [DatePipe, MatTableModule, MatButtonModule, MatButtonToggleModule, MatIconModule],
  template: `
    <section id="tour" class="section">
      <div class="head">
        <div>
          <p class="kicker">Live</p>
          <h2>Gegenwind-Tour 2026</h2>
        </div>
        <mat-button-toggle-group [value]="filter()" (change)="filter.set($event.value)" hideSingleSelectionIndicator>
          <mat-button-toggle value="alle">Alle Shows</mat-button-toggle>
          <mat-button-toggle value="verfuegbar">Tickets verfügbar</mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      <div class="table-wrap">
        <table mat-table [dataSource]="shows()">
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Datum</th>
            <td mat-cell *matCellDef="let s" class="date">{{ s.date | date: 'EEE, dd.MM.' : '' : 'de' }}</td>
          </ng-container>
          <ng-container matColumnDef="city">
            <th mat-header-cell *matHeaderCellDef>Stadt</th>
            <td mat-cell *matCellDef="let s"><strong>{{ s.city }}</strong><span class="venue-inline">{{ s.venue }}</span></td>
          </ng-container>
          <ng-container matColumnDef="venue">
            <th mat-header-cell *matHeaderCellDef class="venue">Location</th>
            <td mat-cell *matCellDef="let s" class="venue">{{ s.venue }}</td>
          </ng-container>
          <ng-container matColumnDef="action">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let s" class="action">
              @if (s.status === 'Ausverkauft') {
                <span class="sold">Ausverkauft</span>
              } @else {
                <button mat-flat-button (click)="buy(s)">
                  {{ s.status === 'Wenige Tickets' ? 'Letzte Tickets' : 'Tickets' }}
                </button>
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
    .head { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
    .head h2 { margin: 0; }
    .table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--mat-sys-outline-variant); }
    table { width: 100%; background: transparent; }
    .date { white-space: nowrap; font-variant-numeric: tabular-nums; }
    .action { text-align: right; }
    .venue-inline { display: none; font-size: .85rem; opacity: .75; }
    @media (max-width: 640px) {
      .venue { display: none; }
      .venue-inline { display: block; }
      th, td { padding: 0 8px !important; }
    }
    .sold { opacity: .6; text-transform: uppercase; letter-spacing: .1em; font-size: .8rem; }
  `,
})
export class Tour {
  private readonly band = inject(BandService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly columns = ['date', 'city', 'venue', 'action'];
  protected readonly filter = signal<Filter>('alle');
  protected readonly shows = computed(() =>
    this.filter() === 'alle' ? this.band.shows : this.band.shows.filter((s) => s.status !== 'Ausverkauft'),
  );

  protected buy(s: Show): void {
    this.snackBar.open(`Ticketshop für ${s.city} (${s.venue}) öffnet bald.`, 'OK', { duration: 3000 });
  }
}
