import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BandService, Show, friendId } from '../data/band.service';
import { downloadIcs, icsFileName } from '../data/calendar';

@Component({
  selector: 'app-tour',
  imports: [DatePipe, NgTemplateOutlet, RouterLink, MatTableModule, MatButtonModule, MatIconModule],
  template: `
    <section id="tour" class="section">
      <p class="kicker">Live</p>
      <div class="head">
        <h2>Tour und Konzerte</h2>
        @if (shows.length) {
          <button mat-stroked-button (click)="addAll()">
            <mat-icon>event</mat-icon> Alle Termine in den Kalender
          </button>
        }
      </div>

      <div class="table-wrap">
        <table mat-table [dataSource]="shows">
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Datum</th>
            <td mat-cell *matCellDef="let s" class="date">
              <span class="long">{{ s.date | date: 'EEE, dd.MM.yyyy' : '' : 'de' }}@if (s.time) {<span class="time">{{ s.time }} Uhr</span>}@if (s.endDate) {<br />– {{ s.endDate | date: 'EEE, dd.MM.yyyy' : '' : 'de' }}}</span>
              <span class="short">{{ s.date | date: 'dd.MM.yy' }}@if (s.time) {<span class="time">{{ s.time }} Uhr</span>}@if (s.endDate) {<br />– {{ s.endDate | date: 'dd.MM.yy' }}}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="city">
            <th mat-header-cell *matHeaderCellDef>Ort</th>
            <td mat-cell *matCellDef="let s"><strong>{{ s.city ?? '–' }}</strong><span class="venue-inline"><ng-container *ngTemplateOutlet="venue; context: { $implicit: s }" /></span></td>
          </ng-container>
          <ng-container matColumnDef="venue">
            <th mat-header-cell *matHeaderCellDef class="venue">Location</th>
            <td mat-cell *matCellDef="let s" class="venue"><ng-container *ngTemplateOutlet="venue; context: { $implicit: s }" /></td>
          </ng-container>
          <ng-container matColumnDef="action">
            <th mat-header-cell *matHeaderCellDef><span class="sr-only">Aktionen</span></th>
            <td mat-cell *matCellDef="let s" class="action">
              <button mat-stroked-button (click)="add(s)" [attr.aria-label]="'Termin ' + s.venue + ' in den Kalender eintragen'">
                <mat-icon>event</mat-icon><span class="label">Kalender</span>
              </button>
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

      @if (past.length) {
        <details class="past">
          <summary>Vergangene Auftritte ({{ past.length }})</summary>
          <ul>
            @for (s of past; track s.date + s.venue) {
              <li>
                <time [attr.datetime]="s.date">{{ s.date | date: 'dd.MM.yyyy' }}</time>
                <span class="where"><ng-container *ngTemplateOutlet="venue; context: { $implicit: s }" />@if (s.city) {<span class="city">, {{ s.city }}</span>}@if (s.private) {<span class="private">privat</span>}</span>
                @if (historyDates.has(s.date)) {
                  <a routerLink="/historie" [fragment]="'e-' + s.date" class="recap">Rückblick <mat-icon>arrow_forward</mat-icon></a>
                }
              </li>
            }
          </ul>
        </details>
      }

      <!-- Location: Freunde der Band verlinken auf ihre Karte unter /freunde (die dort kurz aufleuchtet) -->
      <ng-template #venue let-s>@for (p of venueParts.get(s.venue); track $index) {@if (p.friend) {<a class="friend" routerLink="/freunde" [fragment]="p.id" title="Zu unseren Freunden">{{ p.text }}</a>} @else {{{ p.text }}}}</ng-template>
    </section>
  `,
  styles: `
    .table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--mat-sys-outline-variant); }
    table { width: 100%; background: transparent; }
    .date { white-space: nowrap; font-variant-numeric: tabular-nums; }
    .head { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
    .head h2 { margin: 0; }
    .action { text-align: right; white-space: nowrap; }
    .action > * + * { margin-left: 8px; }
    .venue-inline { display: none; font-size: .85rem; opacity: .75; }
    .short { display: none; }
    .friend { color: inherit; text-decoration: underline; text-decoration-color: var(--bn-sunset); text-underline-offset: 3px; }
    .friend:hover { color: var(--bn-sunset); }
    .past { margin-top: 20px; border: 1px solid var(--bn-line); border-radius: 12px; padding: 0 18px; }
    .past summary {
      cursor: pointer; padding: 14px 0; font-family: var(--bn-wide); text-transform: uppercase;
      letter-spacing: .16em; font-size: .78rem; color: var(--bn-fog);
    }
    .past summary:hover { color: var(--bn-sunset); }
    .past ul { list-style: none; margin: 0; padding: 0 0 12px; }
    .past li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 16px; padding: 10px 0; border-top: 1px solid var(--bn-line); }
    .past time { font-variant-numeric: tabular-nums; color: var(--bn-sunset); min-width: 6.5em; }
    .past .where { flex: 1; }
    .past .city { opacity: .7; }
    .past .private {
      margin-left: 10px; padding: 1px 8px; border-radius: 999px; border: 1px solid var(--bn-line);
      font-size: .7rem; letter-spacing: .08em; text-transform: uppercase; color: var(--bn-fog); vertical-align: 2px;
    }
    .past .recap { display: inline-flex; align-items: center; gap: 4px; color: var(--bn-ink); font-size: .88rem; text-decoration: none; }
    .past .recap:hover { color: var(--bn-sunset); }
    .past .recap mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .time { display: block; font-size: .82rem; color: var(--bn-sunset); }
    @media (max-width: 640px) {
      .venue { display: none; }
      .venue-inline { display: block; }
      th, td { padding: 0 8px !important; }
      .long { display: none; }
      .short { display: inline; }
      .action a, .action button { min-width: 0; padding: 0 10px; }
      .action > * + * { margin-left: 4px; }
      .action .label { display: none; }
      .action mat-icon { margin: 0; }
    }
  `,
})
export class Tour {
  private readonly band = inject(BandService);
  // Termine bis einschließlich heute (bei mehrtägigen bis zum letzten Tag) gelten als kommend
  private readonly today = localToday();
  protected readonly shows = this.band.publicShows.filter((s) => (s.endDate ?? s.date) >= this.today);
  // Gespielte öffentliche Gigs wandern automatisch in den Rückblick, neueste zuerst
  // Rückblick zeigt alle geklärten Auftritte – auch private (gekennzeichnet)
  protected readonly past = this.band.shows
    .filter((s) => s.confirmed && (s.endDate ?? s.date) < this.today)
    .sort((a, b) => b.date.localeCompare(a.date));
  protected readonly historyDates = new Set(this.band.history.map((h) => h.date));
  // Location → Textstücke, Freunde mit Anker auf /freunde
  protected readonly venueParts = new Map(
    this.band.shows.filter((s) => s.confirmed).map((s) => [
      s.venue,
      this.band.venueParts(s.venue).map((p) => ({ text: p.text, friend: !!p.friend, id: p.friend ? friendId(p.friend) : '' })),
    ]),
  );
  protected readonly columns = ['date', 'city', 'venue', 'action'];

  protected add(s: Show): void {
    downloadIcs([s], icsFileName(s), 'Blickfeld Nord');
  }

  protected addAll(): void {
    downloadIcs(this.shows, 'blickfeld-nord-konzerte.ics', 'Blickfeld Nord – Konzerte');
  }
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
