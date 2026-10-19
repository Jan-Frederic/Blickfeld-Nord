import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { downloadIcs } from '../data/calendar';
import { SetlistStats } from './setlist-stats';
import { AboButton } from '../sections/abo-button';
import { BackstageSync } from './backstage-sync';
import { enableOffline, offlineReady } from './offline';
import { BandService, Rehearsal, Show } from '../data/band.service';

type FilterKey = 'kommend' | 'proben' | 'vergangen';
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

// Versteckte Übersicht aller Auftritte (auch private), erreichbar per Easter Egg:
// fünfmal schnell auf das Logo oben links klicken. Jede Zeile führt zur Unterseite des Auftritts.
@Component({
  selector: 'app-backstage',
  imports: [DatePipe, RouterLink, MatTableModule, MatIconModule, SetlistStats, AboButton, BackstageSync],
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

      <!-- Filter lassen sich frei kombinieren; Kommendes steht oben (chronologisch), Vergangenes darunter (neueste zuerst) -->
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
            <th mat-header-cell *matHeaderCellDef>Datum</th>
            <td mat-cell *matCellDef="let r" class="date" [class.past]="r.past">
              {{ r.date | date: 'EEE, dd.MM.yyyy' : '' : 'de' }}
              @if (r.time) {<span class="time">{{ r.time }} Uhr</span>}
              @if (r.endDate) {<br />– {{ r.endDate | date: 'EEE, dd.MM.yyyy' : '' : 'de' }}}
            </td>
          </ng-container>
          <ng-container matColumnDef="venue">
            <th mat-header-cell *matHeaderCellDef>Termin</th>
            <td mat-cell *matCellDef="let r">
              @if (r.show; as s) {
                <!-- Link für Tastatur und Screenreader; die ganze Zeile ist zusätzlich klickbar -->
                <a class="row-link" [routerLink]="['/backstage', band.showId(s)]"><strong>{{ s.venue }}</strong></a>
                @if (s.city) { <span class="sub">{{ s.city }}</span> }
              } @else {
                <strong>Probe</strong>
                @if (r.probe.place) { <span class="sub">{{ r.probe.place }}</span> }
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef>Art</th>
            <td mat-cell *matCellDef="let r">
              @if (r.show; as s) {
                <span class="tag" [class.private]="s.private">{{ s.private ? 'Privat' : 'Öffentlich' }}</span>
              } @else {
                <span class="tag probe">Probe</span>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
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
            <th mat-header-cell *matHeaderCellDef>Kommentar</th>
            <td mat-cell *matCellDef="let r" class="comment">{{ (r.show ? r.show.comment : r.probe.note) || '–' }}</td>
          </ng-container>
          <ng-container matColumnDef="open">
            <th mat-header-cell *matHeaderCellDef><span class="sr-only">Öffnen</span></th>
            <td mat-cell *matCellDef="let r" class="open">@if (r.show) {<mat-icon>chevron_right</mat-icon>}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns" [class.link]="!!row.show" (click)="openRow(row, $event)"></tr>
        </table>
      </div>
      }

      <div class="exchange">
        <h3>Mit der Band abgleichen</h3>
        <p>Setlists, Packlisten und Vor-Ort-Angaben werden nur auf diesem Gerät gespeichert. Schickt sie als Datei
          (z. B. in die WhatsApp-Gruppe) und importiert sie auf den anderen Handys – dann haben alle denselben Stand.</p>
        <app-backstage-sync />
        @if (offline()) {
          <p class="offline"><mat-icon>offline_pin</mat-icon> Backstage ist auf diesem Gerät auch ohne Netz verfügbar.</p>
        }
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
    .exchange { margin-top: 40px; padding: 20px 24px; border-radius: 12px; border: 1px solid var(--bn-line); }
    .exchange h3 { margin: 0 0 6px; font-family: var(--bn-wide); font-weight: 400; text-transform: uppercase; letter-spacing: .14em; font-size: .85rem; }
    .exchange p { margin: 0 0 14px; max-width: 720px; font-size: .9rem; line-height: 1.6; color: var(--bn-fog); }
    .exchange .offline { display: flex; align-items: center; gap: 6px; margin: 14px 0 0; color: #7fc29b; }
    .offline mat-icon { font-size: 18px; width: 18px; height: 18px; }
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
    .tag.probe { border-color: #7fa8c9; color: #9cc0dd; }
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
    .status.ok { color: #7fc29b; }
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
export class Backstage implements OnDestroy {
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  protected readonly band = inject(BandService);
  protected readonly shows = [...this.band.shows].sort((a, b) => a.date.localeCompare(b.date));
  protected readonly offline = offlineReady;
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
  // Kommendes zuerst (chronologisch), danach Vergangenes (neueste zuerst)
  protected readonly rows = computed(() => {
    const picked = this.allRows.filter((r) => [...this.active()].some((f) => this.matches(r, f)));
    const key = (r: Row) => r.date + (r.time ?? '');
    return [
      ...picked.filter((r) => !r.past).sort((a, b) => key(a).localeCompare(key(b))),
      ...picked.filter((r) => r.past).sort((a, b) => key(b).localeCompare(key(a))),
    ];
  });

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

  protected readonly confirmed = this.shows.filter((s) => s.confirmed).length;
  protected readonly open = this.shows.length - this.confirmed;
  protected readonly privateCount = this.shows.filter((s) => s.private).length;

  constructor() {
    // Suchmaschinen sollen die Seite nicht aufnehmen
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    // ab jetzt auf diesem Gerät auch offline nutzbar
    enableOffline();
    // Direktaufruf einer Unterseite: GitHub Pages leitet /backstage/<id>[/<teil>] über die Fehlerseite
    // nach /backstage/?auftritt=<id>[&teil=<teil>] um – von hier geht es zur eigentlichen Unterseite weiter.
    const query = inject(ActivatedRoute).snapshot.queryParamMap;
    const id = query.get('auftritt');
    const teil = query.get('teil');
    if (id) this.router.navigate(['/backstage', id, ...(teil ? [teil] : [])], { replaceUrl: true });
  }

  protected openRow(r: Row, event: MouseEvent): void {
    if (!r.show || (event.target as HTMLElement).closest('a')) return;
    this.router.navigate(['/backstage', this.band.showId(r.show)]);
  }

  // Bandkalender inkl. privater Termine, Status und Kommentaren
  protected exportAll(): void {
    downloadIcs(this.shows, 'blickfeld-nord-backstage.ics', 'Blickfeld Nord – Backstage', true, false, { rehearsals: this.rehearsals });
  }

  ngOnDestroy(): void {
    this.meta.removeTag("name='robots'");
  }
}
