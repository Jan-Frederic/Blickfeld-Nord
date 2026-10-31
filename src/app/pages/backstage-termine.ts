import { SaisonPlanung } from './saison-planung';
import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { downloadIcs } from '../data/calendar';
import { TerminFormular } from './termin-formular';
import { Terminabfrage } from './terminabfrage';
import { AboButton } from '../sections/abo-button';
import { BandService, Rehearsal, Show } from '../data/band.service';

type FilterKey = 'kommend' | 'proben' | 'vergangen';
type SortCol = 'date' | 'venue' | 'type' | 'status' | 'comment';
// unsortiert / aufsteigend / absteigend
const SORT_ICONS = [{ icon: 'unfold_more' }, { icon: 'arrow_upward' }, { icon: 'arrow_downward' }];
interface Row {
  show?: Show;
  probe?: Rehearsal;
  date: string;
  endDate?: string;
  time?: string;
  past: boolean;
}

const FILTER_KEY = 'bn-backstage-filter';
function loadFilters(): Set<FilterKey> {
  try {
    const saved = JSON.parse(localStorage.getItem(FILTER_KEY) ?? 'null') as FilterKey[] | null;
    if (Array.isArray(saved)) return new Set(saved);
  } catch {
    // Standard unten
  }
  return new Set<FilterKey>(['kommend', 'proben']);
}

// Backstage → Termine: alle Auftritte (auch private) und Proben als Tabelle mit kombinierbaren Filtern und Sortierung.
// Jede Zeile führt zur Unterseite des Auftritts.
@Component({
  selector: 'app-backstage-termine',
  imports: [DatePipe, RouterLink, MatTableModule, MatIconModule, AboButton, TerminFormular, Terminabfrage, SaisonPlanung],
  template: `
    <section class="section">
      <p class="kicker">Backstage</p>
      <h2>Termine</h2>
      <p class="lead">Alle Auftritte – öffentlich und privat – mit Status und Notizen, dazu die Probetermine. Für Details, Plakat, Setlist und Packliste einfach einen Auftritt antippen.</p>

      <app-saison-planung />

      <div class="summary">
        <app-abo-button class="export" path="backstage/kalender.ics" (download)="exportAll()" />
      </div>

      <!-- Filter lassen sich frei kombinieren; sortiert wird standardmäßig nach Datum, per Klick auf die Spaltenköpfe auch anders -->
      <div class="filters" role="group" aria-label="Termine filtern">
        @for (f of filters; track f.key) {
          <button type="button" [class.on]="active().has(f.key)" [attr.aria-pressed]="active().has(f.key)" (click)="toggle(f.key)">
            <mat-icon>{{ active().has(f.key) ? 'check' : f.icon }}</mat-icon> {{ f.label }} <span class="count">{{ counts[f.key] }}</span>
          </button>
        }
      </div>

      @if (!active().size) {
        <p class="empty">Mindestens einen Filter wählen.</p>
      } @else if (!rows().length) {
        <p class="empty">
          Keine Termine für diese Auswahl.
          @if (active().has('proben') && !rehearsals.length) { Probetermine werden in src/app/data/band.service.ts unter „rehearsals“ eingetragen. }
        </p>
      } @else {
      <div class="table-wrap">
        <table mat-table [dataSource]="rows()">
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef [attr.aria-sort]="ariaSort('date')">
              <button type="button" class="sort" (click)="sortBy('date')">Datum<mat-icon>{{ sortIcons().date }}</mat-icon></button>
            </th>
            <td mat-cell *matCellDef="let r" class="date" [class.past]="r.past">
              {{ r.date | date: 'EEE, dd.MM.yyyy' : '' : 'de' }}
              @if (r.time) {<span class="time">{{ r.time }} Uhr</span>}
              @if (r.endDate) {<br />– {{ r.endDate | date: 'EEE, dd.MM.yyyy' : '' : 'de' }}}
            </td>
          </ng-container>
          <ng-container matColumnDef="venue">
            <th mat-header-cell *matHeaderCellDef [attr.aria-sort]="ariaSort('venue')">
              <button type="button" class="sort" (click)="sortBy('venue')">Termin<mat-icon>{{ sortIcons().venue }}</mat-icon></button>
            </th>
            <td mat-cell *matCellDef="let r">
              @if (r.show; as s) {
                <!-- Link für Tastatur und Screenreader; die ganze Zeile ist zusätzlich klickbar -->
                <a class="row-link" [routerLink]="['/backstage', band.showId(s)]"><strong>{{ s.venue }}</strong></a>
                @if (s.city) { <span class="sub">{{ s.city }}</span> }
              } @else {
                <a class="row-link" [routerLink]="['/backstage/probe', r.probe.date]"><strong>Probe</strong></a>
                @if (r.probe.place) { <span class="sub">{{ r.probe.place }}</span> }
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef [attr.aria-sort]="ariaSort('type')">
              <button type="button" class="sort" (click)="sortBy('type')">Art<mat-icon>{{ sortIcons().type }}</mat-icon></button>
            </th>
            <td mat-cell *matCellDef="let r">
              @if (r.show; as s) {
                <span class="tag" [class.private]="s.private">{{ s.private ? 'Privat' : 'Öffentlich' }}</span>
              } @else {
                <span class="tag probe">Probe</span>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef [attr.aria-sort]="ariaSort('status')">
              <button type="button" class="sort" (click)="sortBy('status')">Status<mat-icon>{{ sortIcons().status }}</mat-icon></button>
            </th>
            <td mat-cell *matCellDef="let r">
              @if (r.show; as s) {
                <span class="status" [class.ok]="s.confirmed">
                  <mat-icon>{{ s.confirmed ? 'check_circle' : 'schedule' }}</mat-icon>
                  {{ s.confirmed ? 'Geklärt' : 'Offen' }}
                </span>
              } @else { – }
            </td>
          </ng-container>
          <ng-container matColumnDef="comment">
            <th mat-header-cell *matHeaderCellDef [attr.aria-sort]="ariaSort('comment')">
              <button type="button" class="sort" (click)="sortBy('comment')">Kommentar<mat-icon>{{ sortIcons().comment }}</mat-icon></button>
            </th>
            <td mat-cell *matCellDef="let r" class="comment">{{ (r.show ? r.show.comment : r.probe.note) || '–' }}</td>
          </ng-container>
          <ng-container matColumnDef="open">
            <th mat-header-cell *matHeaderCellDef><span class="sr-only">Öffnen</span></th>
            <td mat-cell *matCellDef="let r" class="open">@if (r.show) {<mat-icon>chevron_right</mat-icon>}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns" class="link" (click)="openRow(row, $event)"></tr>
        </table>
      </div>
      }

      <app-termin-formular />
      <app-terminabfrage />
    </section>
  `,
  styles: `
    .summary { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px; margin: 16px 0 20px; }
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
    .sort {
      display: inline-flex; align-items: center; gap: 4px; padding: 0; border: 0; background: none; cursor: pointer;
      color: inherit; font: inherit; font-weight: 500;
    }
    .sort mat-icon { font-size: 16px; width: 16px; height: 16px; opacity: .5; }
    th[aria-sort] .sort mat-icon { opacity: 1; color: var(--bn-sunset); }
    .sort:hover mat-icon { opacity: 1; }
    .tag.probe { border-color: #7fb3e0; color: #7fb3e0; }
    .table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--mat-sys-outline-variant); }
    table { width: 100%; min-width: 820px; background: transparent; }
    .date { white-space: nowrap; font-variant-numeric: tabular-nums; }
    /* vergangene Termine gedämpft, aber mit ausreichendem Kontrast */
    .past, .past .time { color: var(--bn-fog); }
    .time { display: block; font-size: .82rem; color: var(--bn-sunset); }
    .sub { display: block; font-size: .85rem; opacity: .7; }
    .tag {
      display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: .75rem;
      border: 1px solid var(--bn-line); color: var(--bn-fog);
    }
    .tag.private { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .status { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; color: #e0b25a; }
    .status.ok { color: #5fb88a; }
    .status mat-icon { font-size: 18px; width: 18px; height: 18px; }
    tr.link { cursor: pointer; transition: background .15s; }
    tr.link:hover, tr.link:focus-within { background: rgba(232, 164, 106, .07); }
    .row-link { color: inherit; text-decoration: none; }
    .row-link:focus-visible { outline: 2px solid var(--bn-sunset); outline-offset: 2px; border-radius: 2px; }
    .open { width: 32px; color: var(--bn-fog); }
    tr.link:hover .open { color: var(--bn-sunset); }
    .comment { max-width: 320px; white-space: pre-line; color: rgba(236, 233, 228, .82); }
  `,
})
export class BackstageTermine {
  private readonly router = inject(Router);
  protected readonly band = inject(BandService);
  protected readonly shows = [...this.band.shows].sort((a, b) => a.date.localeCompare(b.date));
  protected readonly columns = ['date', 'venue', 'type', 'status', 'comment', 'open'];
  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly rehearsals = [...this.band.rehearsals].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));

  // Filter über der Tabelle – frei kombinierbar (Auswahl merkt sich das Gerät)
  protected readonly filters = [
    { key: 'kommend', label: 'Ausstehende Auftritte', icon: 'upcoming' },
    { key: 'proben', label: 'Probetermine', icon: 'music_note' },
    { key: 'vergangen', label: 'Vergangene Auftritte', icon: 'history' },
  ] as const;
  protected readonly active = signal<ReadonlySet<FilterKey>>(loadFilters());

  // Auftritte und Proben als gemeinsame Zeilen
  private readonly allRows: Row[] = [
    ...this.shows.map((s) => ({ show: s, date: s.date, endDate: s.endDate, time: s.time, past: (s.endDate ?? s.date) < this.today })),
    ...this.rehearsals.map((p) => ({
      probe: p,
      date: p.date,
      time: p.time ? p.time + (p.endTime ? '–' + p.endTime : '') : undefined,
      past: p.date < this.today,
    })),
  ];
  private readonly matches = (r: Row, f: FilterKey) =>
    f === 'proben' ? !!r.probe : !!r.show && (f === 'vergangen' ? r.past : !r.past);
  protected readonly counts = Object.fromEntries(
    this.filters.map((f) => [f.key, this.allRows.filter((r) => this.matches(r, f.key)).length]),
  ) as Record<FilterKey, number>;
  // Sortierung: Standard zeitlich aufsteigend; Klick auf einen Spaltenkopf sortiert danach, erneuter Klick dreht um
  protected readonly sort = signal<{ col: SortCol; dir: 1 | -1 }>({ col: 'date', dir: 1 });
  private readonly sortValue: Record<SortCol, (r: Row) => string> = {
    date: (r) => r.date + (r.time ?? ''),
    venue: (r) => (r.show ? r.show.venue : 'Probe ' + (r.probe!.place ?? '')).toLocaleLowerCase('de'),
    type: (r) => (r.probe ? 'Probe' : r.show!.private ? 'Privat' : 'Öffentlich'),
    status: (r) => (r.probe ? '' : r.show!.confirmed ? 'Geklärt' : 'Offen'),
    comment: (r) => ((r.show ? r.show.comment : r.probe!.note) ?? '').toLocaleLowerCase('de'),
  };
  protected readonly rows = computed(() => {
    const { col, dir } = this.sort();
    const value = this.sortValue[col];
    const time = this.sortValue.date;
    return this.allRows
      .filter((r) => [...this.active()].some((f) => this.matches(r, f)))
      // gleiche Werte (z. B. „Geklärt“) bleiben untereinander zeitlich sortiert
      .sort((a, b) => dir * value(a).localeCompare(value(b), 'de') || time(a).localeCompare(time(b)));
  });

  protected sortBy(col: SortCol): void {
    const cur = this.sort();
    this.sort.set({ col, dir: cur.col === col ? (-cur.dir as 1 | -1) : 1 });
  }

  // Pfeil je Spalte (als Feld statt Funktionsaufruf, damit scripts/subset-icons.py die Spaltennamen nicht für Icons hält)
  protected readonly sortIcons = computed(() => {
    const { col, dir } = this.sort();
    const icons = {} as Record<SortCol, string>;
    for (const c of Object.keys(this.sortValue) as SortCol[]) icons[c] = SORT_ICONS[c !== col ? 0 : dir === 1 ? 1 : 2].icon;
    return icons;
  });

  protected ariaSort(col: SortCol): string | null {
    const cur = this.sort();
    return cur.col !== col ? null : cur.dir === 1 ? 'ascending' : 'descending';
  }

  protected toggle(f: FilterKey): void {
    const next = new Set(this.active());
    if (next.has(f)) next.delete(f);
    else next.add(f);
    this.active.set(next);
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify([...next]));
    } catch {
      // ohne Speicher gilt die Auswahl bis zum Neuladen
    }
  }

  protected openRow(r: Row, event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('a')) return;
    if (r.probe) this.router.navigate(['/backstage/probe', r.probe.date]);
    else if (r.show) this.router.navigate(['/backstage', this.band.showId(r.show)]);
  }

  // Bandkalender inkl. privater Termine, Status und Kommentaren
  protected exportAll(): void {
    downloadIcs(this.shows, 'blickfeld-nord-backstage.ics', 'Blickfeld Nord – Backstage', true, false, { rehearsals: this.rehearsals });
  }
}
