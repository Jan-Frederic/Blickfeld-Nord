import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { BandService, Show, friendId } from '../data/band.service';
import { downloadIcs } from '../data/calendar';
import { AboButton } from './abo-button';
import { I18n, LDatePipe, LocPipe, tr } from '../i18n';
import { Content } from '../content';

const TEXT = tr(
  {
    title: 'Tour und Konzerte',
    date: 'Datum',
    city: 'Ort',
    venue: 'Location',
    details: 'Details',
    detailsLabel: 'Details zum Konzert',
    oclock: ' Uhr',
    past: 'Vergangene Auftritte',
    private: 'privat',
    recap: 'Rückblick',
    free: 'Eintritt frei',
    entry: 'Eintritt',
    toFriends: 'Zu unseren Freunden',
    icsName: 'Blickfeld Nord – Konzerte',
  },
  {
    title: 'Tour and shows',
    date: 'Date',
    city: 'Town',
    venue: 'Venue',
    details: 'Details',
    detailsLabel: 'show details',
    oclock: '',
    past: 'Past shows',
    private: 'private',
    recap: 'Look back',
    free: 'Free entry',
    entry: 'Entry',
    toFriends: 'To our friends',
    icsName: 'Blickfeld Nord – Shows',
  },
  {
    title: 'Tour en optredens',
    date: 'Datum',
    city: 'Plaats',
    venue: 'Locatie',
    details: 'Details',
    detailsLabel: 'details van het optreden',
    oclock: '',
    past: 'Eerdere optredens',
    private: 'privé',
    recap: 'Terugblik',
    free: 'Gratis entree',
    entry: 'Entree',
    toFriends: 'Naar onze vrienden',
    icsName: 'Blickfeld Nord – Optredens',
  },
);

@Component({
  selector: 'app-tour',
  imports: [LDatePipe, LocPipe, NgTemplateOutlet, RouterLink, MatTableModule, MatIconModule, AboButton],
  template: `
    <section id="tour" class="section">
      <p class="kicker">Live</p>
      <div class="head">
        <h2>{{ t().title }}</h2>
        <app-abo-button path="konzerte.ics" (download)="addAll()" />
      </div>

      <div class="table-wrap">
        <table mat-table [dataSource]="shows">
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>{{ t().date }}</th>
            <td mat-cell *matCellDef="let s" class="date">
              <a class="details" [routerLink]="['/konzerte', band.showId(s)] | loc" [attr.aria-label]="(s.date | ldate: 'long') + ', ' + s.venue + ' – ' + t().detailsLabel">
              <span class="long">{{ s.date | ldate: 'weekday' }}@if (s.time) {<span class="time">{{ s.time }}{{ t().oclock }}</span>}@if (s.endDate) {<br />– {{ s.endDate | ldate: 'weekday' }}}</span>
              <span class="short">{{ s.date | ldate: 'tiny' }}@if (s.time) {<span class="time">{{ s.time }}{{ t().oclock }}</span>}@if (s.endDate) {<br />– {{ s.endDate | ldate: 'tiny' }}}</span>
              </a>
            </td>
          </ng-container>
          <ng-container matColumnDef="city">
            <th mat-header-cell *matHeaderCellDef>{{ t().city }}</th>
            <td mat-cell *matCellDef="let s"><strong>{{ s.city ?? '–' }}</strong><span class="venue-inline"><ng-container *ngTemplateOutlet="venue; context: { $implicit: s }" /><ng-container *ngTemplateOutlet="entry; context: { $implicit: s }" /></span></td>
          </ng-container>
          <ng-container matColumnDef="venue">
            <th mat-header-cell *matHeaderCellDef class="venue">{{ t().venue }}</th>
            <td mat-cell *matCellDef="let s" class="venue"><ng-container *ngTemplateOutlet="venue; context: { $implicit: s }" /><ng-container *ngTemplateOutlet="entry; context: { $implicit: s }" /></td>
          </ng-container>
          <ng-container matColumnDef="open">
            <th mat-header-cell *matHeaderCellDef><span class="sr-only">{{ t().details }}</span></th>
            <td mat-cell *matCellDef="let s" class="open"><span class="label">{{ t().details }}</span><mat-icon>chevron_right</mat-icon></td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <!-- ganze Zeile führt zur Konzertseite; per Tastatur über den Link im Datum -->
          <tr mat-row *matRowDef="let row; columns: columns" class="link" (click)="open(row, $event)"></tr>
        </table>
      </div>

      @if (past.length) {
        <details class="past">
          <summary>{{ t().past }} ({{ past.length }})</summary>
          <ul>
            @for (s of past; track s.date + s.venue) {
              <li>
                @if (s.private) {
                  <time [attr.datetime]="s.date">{{ s.date | ldate: 'short' }}</time>
                } @else {
                  <a class="details" [routerLink]="['/konzerte', band.showId(s)] | loc"><time [attr.datetime]="s.date">{{ s.date | ldate: 'short' }}</time></a>
                }
                <span class="where"><ng-container *ngTemplateOutlet="venue; context: { $implicit: s }" />@if (s.city) {<span class="city">, {{ s.city }}</span>}@if (s.private && s.publicName) {<span class="private">{{ t().private }}</span>}</span>
                @if (historyDates.has(s.date)) {
                  <a [routerLink]="'/historie' | loc" [fragment]="'e-' + s.date" class="recap">{{ t().recap }} <mat-icon>arrow_forward</mat-icon></a>
                }
              </li>
            }
          </ul>
        </details>
      }

      <!-- Eintritt: „frei“ bei price 0, sonst Betrag; ohne Angabe nichts -->
      <ng-template #entry let-s>@if (s.price === 0) {<span class="entry">{{ t().free }}</span>} @else if (s.price) {<span class="entry">{{ t().entry }} {{ s.price }} €</span>}</ng-template>

      <!-- Location: Freunde der Band verlinken auf ihre Karte unter /freunde (die dort kurz aufleuchtet) -->
      <ng-template #venue let-s>@for (p of venueParts().get(band.publicVenue(s)); track $index) {@if (p.friend) {<a class="friend" [routerLink]="'/freunde' | loc" [fragment]="p.id" [title]="t().toFriends">{{ p.text }}</a>} @else {{{ p.text }}}}</ng-template>
    </section>
  `,
  styles: `
    .table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--mat-sys-outline-variant); }
    table { width: 100%; background: transparent; }
    .date { white-space: nowrap; font-variant-numeric: tabular-nums; }
    .head { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
    .head h2 { margin: 0; }
    .details { color: inherit; text-decoration: none; }
    .details:hover, .details:focus-visible { color: var(--bn-sunset); }
    tr.link { cursor: pointer; transition: background .15s; }
    tr.link:hover { background: rgba(232, 164, 106, .07); }
    tr.link:hover .open { color: var(--bn-sunset); }
    .open { text-align: right; white-space: nowrap; color: var(--bn-fog); }
    .open .label { font-size: .85rem; vertical-align: middle; }
    .open mat-icon { vertical-align: middle; }
    .venue-inline { display: none; font-size: .85rem; opacity: .75; }
    .short { display: none; }
    .entry {
      display: inline-block; margin-left: 10px; padding: 1px 9px; border-radius: 999px; border: 1px solid rgba(127, 194, 155, .5);
      font-size: .72rem; letter-spacing: .06em; color: #7fc29b; white-space: nowrap; vertical-align: 1px;
    }
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
    .past time { display: inline-block; font-variant-numeric: tabular-nums; color: var(--bn-sunset); min-width: 6.5em; }
    .past li > a.details { flex: none; }
    /* lange Orts- und Location-Namen dürfen umbrechen, statt über den Rand zu ragen */
    .past .where { flex: 1 1 14em; min-width: 0; overflow-wrap: anywhere; }
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
      .open .label { display: none; }
    }
  `,
})
export class Tour {
  protected readonly band = inject(BandService);
  private readonly content = inject(Content);
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t(TEXT);
  // Termine bis einschließlich heute (bei mehrtägigen bis zum letzten Tag) gelten als kommend
  private readonly today = localToday();
  protected readonly shows = this.band.publicShows.filter((s) => (s.endDate ?? s.date) >= this.today);
  // Gespielte öffentliche Gigs wandern automatisch in den Rückblick, neueste zuerst
  // Rückblick zeigt alle geklärten Auftritte – auch private (gekennzeichnet)
  protected readonly past = this.band.shows
    .filter((s) => s.confirmed && (s.endDate ?? s.date) < this.today)
    .sort((a, b) => b.date.localeCompare(a.date));
  protected readonly historyDates = new Set(this.band.history.map((h) => h.date));
  // Öffentlicher Location-Name → Textstücke (übersetzt, z. B. „Private Feier“), Freunde mit Anker auf /freunde
  // (private Namen bleiben intern)
  protected readonly venueParts = computed(
    () =>
      new Map(
        this.band.shows.filter((s) => s.confirmed).map((s) => {
          const name = this.band.publicVenue(s);
          return [
            name,
            this.band.venueParts(this.content.t(name)).map((p) => ({ text: p.text, friend: !!p.friend, id: p.friend ? friendId(p.friend) : '' })),
          ];
        }),
      ),
  );
  protected readonly columns = ['date', 'city', 'venue', 'open'];
  private readonly router = inject(Router);

  // Klick irgendwo in die Zeile öffnet die Konzertseite – Links in der Zeile (Datum, Freunde) behalten ihr Ziel
  protected open(s: Show, event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('a')) return;
    this.router.navigate([this.i18n.link('/konzerte'), this.band.showId(s)]);
  }

  protected addAll(): void {
    downloadIcs(this.shows, 'blickfeld-nord-konzerte.ics', this.t().icsName);
  }
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
