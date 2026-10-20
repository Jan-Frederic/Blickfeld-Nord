import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Rehearsal, Show } from '../data/band.service';

const DAY = 864e5;

// Kennzahlen oben im Backstage: je Kachel Icon + Beschriftung + Zahl, dazu ein dünner Anteilsbalken.
// Farben unterstützen nur (grün = geklärt, gelb = offen, orange = privat, blau = Probe) – die Bedeutung steht immer auch
// als Text und Symbol da. Farbpaare mit dem dataviz-Validator gegen den dunklen Hintergrund geprüft.
@Component({
  selector: 'app-backstage-stats',
  imports: [DatePipe, MatIconModule],
  template: `
    <ul class="tiles">
      <li>
        <span class="head"><mat-icon>event</mat-icon> Auftritte</span>
        <span class="value">{{ total() }}</span>
        <span class="bar" aria-hidden="true">
          <span class="seg upcoming" [style.flex]="upcoming()"></span><span class="seg past" [style.flex]="past()"></span>
        </span>
        <span class="sub"><i class="dot upcoming"></i>{{ upcoming() }} kommend · <i class="dot past"></i>{{ past() }} gespielt</span>
      </li>
      <li>
        <span class="head"><mat-icon class="ok">check_circle</mat-icon> Geklärt</span>
        <span class="value">{{ confirmed() }}<small> / {{ total() }}</small></span>
        <span class="bar" aria-hidden="true">
          <span class="seg ok" [style.flex]="confirmed()"></span><span class="seg open" [style.flex]="open()"></span>
        </span>
        <span class="sub">{{ pct(confirmed(), total()) }} % aller Auftritte</span>
      </li>
      <li [class.attention]="openSoon() > 0">
        <span class="head"><mat-icon class="open">schedule</mat-icon> Offen</span>
        <span class="value">{{ open() }}</span>
        <span class="bar" aria-hidden="true">
          <span class="seg open" [style.flex]="openSoon()"></span><span class="seg rest" [style.flex]="open() - openSoon()"></span>
        </span>
        <span class="sub">
          @if (openSoon()) { {{ openSoon() }} davon in den nächsten 8 Wochen } @else if (open()) { keiner davon in den nächsten 8 Wochen } @else { alles geklärt }
        </span>
      </li>
      <li>
        <span class="head"><mat-icon class="private">lock</mat-icon> Privat / öffentlich</span>
        <span class="value">{{ privateCount() }}<small> / {{ total() - privateCount() }}</small></span>
        <span class="bar" aria-hidden="true">
          <span class="seg private" [style.flex]="privateCount()"></span><span class="seg public" [style.flex]="total() - privateCount()"></span>
        </span>
        <span class="sub"><i class="dot private"></i>{{ privateCount() }} privat · <i class="dot public"></i>{{ total() - privateCount() }} öffentlich</span>
      </li>
      <li>
        <span class="head"><mat-icon class="probe">music_note</mat-icon> Proben</span>
        <span class="value">{{ rehearsalsAhead() }}<small> kommend</small></span>
        <span class="sub">
          @if (nextRehearsal(); as r) { nächste: {{ r.date | date: 'EEE, d. MMM' : '' : 'de' }}@if (r.time) {, {{ r.time }} Uhr} ({{ inDays(r.date) }}) } @else { keine geplant }
        </span>
      </li>
      <li>
        <span class="head"><mat-icon class="next">celebration</mat-icon> Nächster Auftritt</span>
        @if (nextShow(); as s) {
          <span class="value">@if (daysUntil(s.date) <= 0) {heute} @else {{{ daysUntil(s.date) }}<small> {{ daysUntil(s.date) === 1 ? 'Tag' : 'Tage' }}</small>}</span>
          <span class="sub">
            @if (daysUntil(s.date) > 0) {noch bis }{{ s.date | date: 'EEE, d. MMM' : '' : 'de' }} · {{ s.venue }}
            @if (!s.confirmed) { <span class="tag-open">offen</span> }
          </span>
        } @else {
          <span class="value">–</span><span class="sub">nichts geplant</span>
        }
      </li>
    </ul>
  `,
  styles: `
    :host { display: block; }
    .tiles { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    @media (min-width: 720px) { .tiles { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; } }
    li {
      display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border-radius: 12px; min-width: 0;
      border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72);
    }
    li.attention { border-color: rgba(224, 178, 90, .55); }
    .head {
      display: flex; align-items: center; gap: 6px; font-family: var(--bn-wide); text-transform: uppercase;
      letter-spacing: .14em; font-size: .66rem; color: var(--bn-fog);
    }
    .head mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--bn-ink); background: none; }
    .head mat-icon.ok { color: #5fb88a; }
    .head mat-icon.open { color: #e0b25a; }
    .head mat-icon.private, .head mat-icon.next { color: var(--bn-sunset); }
    .head mat-icon.probe { color: #7fb3e0; }
    .value { font-family: var(--bn-display); font-size: clamp(1.35rem, 4vw, 1.7rem); line-height: 1.1; color: var(--bn-ink); font-variant-numeric: tabular-nums; }
    .value small { font-family: Inter, sans-serif; font-size: .85rem; color: var(--bn-fog); }
    .sub { font-size: .8rem; line-height: 1.45; color: var(--bn-fog); }
    /* Anteilsbalken: dünn, Segmente mit 2 px Abstand, abgerundete Enden */
    .bar { display: flex; gap: 2px; height: 6px; }
    .seg { border-radius: 3px; min-width: 0; }
    .seg[style*='flex: 0'] { display: none; }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin: 0 5px 0 0; vertical-align: 0; }
    .seg.ok { background: #5fb88a; }
    .seg.open { background: #e0b25a; }
    .seg.rest { background: rgba(224, 178, 90, .35); }
    .seg.private, .dot.private { background: var(--bn-sunset); }
    .seg.upcoming, .dot.upcoming { background: var(--bn-ink); }
    .seg.past, .seg.public, .dot.past, .dot.public { background: #5d636b; }
    .tag-open { margin-left: 4px; padding: 0 6px; border-radius: 999px; border: 1px solid #e0b25a; color: #e0b25a; font-size: .7rem; }
  `,
})
export class BackstageStats {
  readonly shows = input.required<Show[]>();
  readonly rehearsals = input.required<Rehearsal[]>();

  private readonly today = new Date().toISOString().slice(0, 10);
  private readonly isUpcoming = (s: Show) => (s.endDate ?? s.date) >= this.today;

  protected readonly total = computed(() => this.shows().length);
  protected readonly upcoming = computed(() => this.shows().filter(this.isUpcoming).length);
  protected readonly past = computed(() => this.total() - this.upcoming());
  protected readonly confirmed = computed(() => this.shows().filter((s) => s.confirmed).length);
  protected readonly open = computed(() => this.total() - this.confirmed());
  // offene Termine, die bald anstehen – die eilen
  protected readonly openSoon = computed(() => {
    const limit = new Date(Date.now() + 56 * DAY).toISOString().slice(0, 10);
    return this.shows().filter((s) => !s.confirmed && this.isUpcoming(s) && s.date <= limit).length;
  });
  protected readonly privateCount = computed(() => this.shows().filter((s) => s.private).length);
  protected readonly rehearsalsAhead = computed(() => this.rehearsals().filter((r) => r.date >= this.today).length);
  protected readonly nextRehearsal = computed(() => this.rehearsals().find((r) => r.date >= this.today));
  protected readonly nextShow = computed(() => this.shows().find(this.isUpcoming));

  protected pct(part: number, all: number): number {
    return all ? Math.round((part / all) * 100) : 0;
  }

  protected daysUntil(date: string): number {
    return Math.round((Date.parse(date) - Date.parse(this.today)) / DAY);
  }

  // „heute“, „morgen“, „in 12 Tagen“ – nach Kalendertagen
  protected inDays(date: string): string {
    const days = this.daysUntil(date);
    return days <= 0 ? 'heute' : days === 1 ? 'morgen' : `in ${days} Tagen`;
  }
}
