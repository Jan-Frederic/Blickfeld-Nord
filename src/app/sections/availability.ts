import { Component, computed, inject, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { I18n } from '../i18n';

type DayState = 'free' | 'booked' | 'option' | 'past';

interface Day {
  iso: string;
  day: number;
  state: DayState;
}

const T = {
  de: {
    title: 'Verfügbarkeit', prev: 'Vorheriger Monat', next: 'Nächster Monat',
    months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
    weekdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
    note: 'Unser Kalender wird noch nicht vollständig gepflegt – wir bemühen uns, ihn immer aktuell zu halten. Ein freier Tag ist also noch keine Zusage: Fragt euren Wunschtermin am besten kurz bei uns an.',
    pickFree: 'frei – Termin anfragen', states: { free: 'frei', booked: 'belegt', option: 'reserviert', past: 'vergangen' },
    legend: ['frei – zum Anfragen antippen', 'reserviert / angefragt', 'belegt'],
    label: (d: number, m: string, y: number) => `${d}. ${m} ${y}`,
  },
  en: {
    title: 'Availability', prev: 'Previous month', next: 'Next month',
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    weekdays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
    note: 'Our calendar is not yet fully maintained – we do our best to keep it up to date. A free day is not a confirmation yet, so please just send us a quick request for your preferred date.',
    pickFree: 'free – request this date', states: { free: 'free', booked: 'booked', option: 'reserved', past: 'past' },
    legend: ['free – tap to request', 'reserved / requested', 'booked'],
    label: (d: number, m: string, y: number) => `${d} ${m} ${y}`,
  },
  nl: {
    title: 'Beschikbaarheid', prev: 'Vorige maand', next: 'Volgende maand',
    months: ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
    weekdays: ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'],
    note: 'Onze agenda is nog niet volledig bijgewerkt – we doen ons best om hem actueel te houden. Een vrije dag is dus nog geen toezegging: vraag jullie gewenste datum het beste even bij ons aan.',
    pickFree: 'vrij – datum aanvragen', states: { free: 'vrij', booked: 'geboekt', option: 'gereserveerd', past: 'voorbij' },
    legend: ['vrij – tik om aan te vragen', 'gereserveerd / aangevraagd', 'geboekt'],
    label: (d: number, m: string, y: number) => `${d} ${m} ${y}`,
  },
} satisfies Record<string, { states: Record<DayState, string> } & Record<string, unknown>>;
// So weit lässt sich in die Zukunft blättern
const MONTHS_AHEAD = 18;

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Verfügbarkeitskalender für Veranstalter: zeigt nur, an welchen Tagen wir schon belegt sind –
// ohne Ort, Anlass oder sonstige Details (auch private Termine erscheinen nur als „belegt“).
@Component({
  selector: 'app-availability',
  imports: [MatIconModule],
  template: `
    <div class="availability">
      <div class="head">
        <h3>{{ t().title }}</h3>
        <div class="nav">
          <button type="button" (click)="step(-1)" [disabled]="offset() === 0" [attr.aria-label]="t().prev">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <span class="month" aria-live="polite">{{ title() }}</span>
          <button type="button" (click)="step(1)" [disabled]="offset() === maxOffset" [attr.aria-label]="t().next">
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>
      </div>

      <p class="note">
        <mat-icon>info</mat-icon>
        <span>{{ t().note }}</span>
      </p>

      <div class="grid" [attr.aria-label]="t().title + ' ' + title()" role="group">
        @for (w of t().weekdays; track w) {
          <span class="wd" aria-hidden="true">{{ w }}</span>
        }
        @for (blank of blanks(); track $index) {
          <span class="blank" aria-hidden="true"></span>
        }
        @for (d of days(); track d.iso) {
          @if (d.state === 'free') {
            <button type="button" class="day free" (click)="pick.emit(d.iso)" [attr.aria-label]="label(d) + ': ' + t().pickFree">
              {{ d.day }}
            </button>
          } @else {
            <span [class]="'day ' + d.state">
              <span aria-hidden="true">{{ d.day }}</span><span class="sr-only">{{ label(d) }}: {{ t().states[d.state] }}</span>
            </span>
          }
        }
      </div>

      <ul class="legend">
        <li><span class="dot free"></span> {{ t().legend[0] }}</li>
        <li><span class="dot option"></span> {{ t().legend[1] }}</li>
        <li><span class="dot booked"></span> {{ t().legend[2] }}</li>
      </ul>
    </div>
  `,
  styles: `
    :host { display: block; }
    .availability { margin-top: 32px; padding: 24px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    .head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
    h3 {
      font-family: var(--bn-display); font-weight: 400; font-size: 1.1rem; text-transform: uppercase;
      letter-spacing: .08em; margin: 0;
    }
    .nav { display: flex; align-items: center; gap: 8px; }
    .nav button {
      display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; cursor: pointer;
      border: 1px solid var(--bn-line); background: transparent; color: var(--bn-ink);
    }
    .nav button:hover:not(:disabled) { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .nav button:disabled { opacity: .3; cursor: default; }
    .month { min-width: 150px; text-align: center; font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .14em; font-size: .85rem; }
    .note {
      display: flex; gap: 10px; align-items: flex-start; margin: 0 0 18px; padding: 12px 14px; border-radius: 8px;
      background: rgba(232, 164, 106, .08); border: 1px solid rgba(232, 164, 106, .3);
      font-size: .88rem; line-height: 1.55; color: rgba(236, 233, 228, .86);
    }
    .note mat-icon { flex: none; color: var(--bn-sunset); font-size: 20px; width: 20px; height: 20px; }
    .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; max-width: 520px; }
    .wd { text-align: center; font-family: var(--bn-wide); font-size: .7rem; letter-spacing: .12em; color: var(--bn-fog); padding-bottom: 4px; }
    .day {
      aspect-ratio: 1; display: grid; place-items: center; border-radius: 8px; font: inherit; font-size: .9rem;
      font-variant-numeric: tabular-nums; border: 1px solid transparent; color: var(--bn-ink); background: transparent;
    }
    .day.free { border-color: var(--bn-line); cursor: pointer; transition: border-color .2s, color .2s, background .2s; }
    .day.free:hover, .day.free:focus-visible { border-color: var(--bn-sunset); color: var(--bn-sunset); background: rgba(232, 164, 106, .08); }
    .day.booked { background: rgba(232, 164, 106, .85); color: #2a1708; font-weight: 600; }
    .day.option { border: 1px dashed var(--bn-sunset); color: var(--bn-sunset); }
    .day.past { color: rgba(236, 233, 228, .55); }
    .legend { list-style: none; display: flex; flex-wrap: wrap; gap: 8px 20px; padding: 0; margin: 16px 0 0; font-size: .82rem; color: var(--bn-fog); }
    .legend li { display: flex; align-items: center; gap: 8px; }
    .dot { width: 14px; height: 14px; border-radius: 4px; display: inline-block; }
    .dot.free { border: 1px solid var(--bn-fog); }
    .dot.option { border: 1px dashed var(--bn-sunset); }
    .dot.booked { background: rgba(232, 164, 106, .85); }
    @media (max-width: 520px) { .availability { padding: 16px; } .grid { gap: 4px; } }
  `,
})
export class Availability {
  /** ISO-Datum eines freien Tages, der angefragt werden soll */
  readonly pick = output<string>();

  /** Sprache der Seite */
  // Sprache aus der Adresse (/, /en/…, /nl/…)
  protected readonly lang = inject(I18n).lang;
  protected readonly t = computed(() => T[this.lang()]);

  protected readonly maxOffset = MONTHS_AHEAD;
  protected readonly offset = signal(0);

  private readonly now = new Date();
  private readonly today = iso(this.now.getFullYear(), this.now.getMonth(), this.now.getDate());

  // Belegte Tage aus allen Auftritten (auch privaten); mehrtägige Termine belegen jeden Tag
  private readonly busy = (() => {
    const map = new Map<string, DayState>();
    for (const s of inject(BandService).shows) {
      const state: DayState = s.confirmed ? 'booked' : 'option';
      const d = new Date(`${s.date}T12:00:00`);
      const end = new Date(`${s.endDate ?? s.date}T12:00:00`);
      for (; d <= end; d.setDate(d.getDate() + 1)) {
        const key = iso(d.getFullYear(), d.getMonth(), d.getDate());
        if (map.get(key) !== 'booked') map.set(key, state);
      }
    }
    return map;
  })();

  private readonly month = computed(() => {
    const d = new Date(this.now.getFullYear(), this.now.getMonth() + this.offset(), 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  protected readonly title = computed(() => `${this.t().months[this.month().m]} ${this.month().y}`);

  // Leere Felder vor dem 1. (Woche beginnt montags)
  protected readonly blanks = computed(() => {
    const { y, m } = this.month();
    return Array.from({ length: (new Date(y, m, 1).getDay() + 6) % 7 });
  });

  protected readonly days = computed<Day[]>(() => {
    const { y, m } = this.month();
    const count = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => {
      const key = iso(y, m, i + 1);
      const state: DayState = key < this.today ? 'past' : (this.busy.get(key) ?? 'free');
      return { iso: key, day: i + 1, state };
    });
  });

  protected step(delta: number): void {
    this.offset.update((o) => Math.min(this.maxOffset, Math.max(0, o + delta)));
  }

  protected label(d: Day): string {
    const { y, m } = this.month();
    return this.t().label(d.day, this.t().months[m], y);
  }
}
