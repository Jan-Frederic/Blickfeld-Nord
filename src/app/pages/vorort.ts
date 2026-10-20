import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { DEFAULT_START, arrivalTime, departureTime, routeUrl } from '../data/trip';

// Checkliste „Vor Ort“ je Auftritt (Backstage): Ansprechpartner, Ankunft, Parkplatz, Strom usw.
// Gespeichert nur im Browser dieses Geräts (localStorage, je Auftritt) – private Kontaktdaten landen so nie im öffentlichen Repo.

export const VORORT_PREFIX = 'bn-vorort-';

export const FIELDS: { key: string; label: string; icon: string; placeholder: string; wide?: boolean }[] = [
  { key: 'kontakt', label: 'Ansprechpartner', icon: 'person', placeholder: 'Name vor Ort' },
  { key: 'telefon', label: 'Telefon', icon: 'call', placeholder: 'Nummer für den Abend' },
  { key: 'ankunft', label: 'Ankunft / Aufbau ab', icon: 'schedule', placeholder: 'z. B. 15:00 Uhr' },
  { key: 'soundcheck', label: 'Soundcheck', icon: 'graphic_eq', placeholder: 'z. B. 18:30 Uhr' },
  { key: 'parken', label: 'Parkplatz / Zufahrt', icon: 'local_parking', placeholder: 'Wo können wir ausladen und parken?' },
  { key: 'strom', label: 'Strom vor Ort', icon: 'power', placeholder: 'Wo sind die 2 Steckdosen?' },
  { key: 'flaeche', label: 'Spielfläche', icon: 'straighten', placeholder: 'Größe, Untergrund, überdacht?' },
  { key: 'verpflegung', label: 'Verpflegung', icon: 'local_cafe', placeholder: 'Essen und Getränke für die Band' },
  { key: 'notizen', label: 'Sonstiges', icon: 'notes', placeholder: 'Ablauf, Reden, Spiele, Lautstärke, Schluss …', wide: true },
];

export function loadVorOrt(key: string): Record<string, string | undefined> {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, string | undefined>;
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-vorort',
  imports: [MatIconModule],
  template: `
    <section class="vorort" aria-labelledby="vorort-title">
      <div class="head">
        <div>
          <p class="kicker">Für diesen Auftritt</p>
          <h3 id="vorort-title">Vor Ort</h3>
        </div>
        <div class="progress" [class.done]="filled() === fields.length">
          <span>{{ filled() }} / {{ fields.length }} geklärt</span>
          <span class="bar"><span [style.width.%]="(filled() / fields.length) * 100"></span></span>
        </div>
      </div>
      <div class="grid">
        @for (f of fields; track f.key) {
          <label [class.wide]="f.wide" [class.ok]="!!values()[f.key]?.trim()">
            <span class="label"><mat-icon>{{ values()[f.key]?.trim() ? 'check_circle' : f.icon }}</mat-icon> {{ f.label }}</span>
            @if (f.wide) {
              <textarea rows="3" maxlength="1000" [value]="values()[f.key] ?? ''" (input)="set(f.key, $event)" [placeholder]="f.placeholder"></textarea>
            } @else {
              <input [type]="f.key === 'telefon' ? 'tel' : 'text'" maxlength="200" [value]="values()[f.key] ?? ''" (input)="set(f.key, $event)" [placeholder]="f.placeholder" />
            }
          </label>
        }
      </div>
      <div class="trip">
        <h4><mat-icon>directions_car</mat-icon> Anfahrt</h4>
        <div class="trip-row">
          <label>Start
            <input [value]="values()['start'] ?? defaultStart" (input)="set('start', $event)" placeholder="z. B. Proberaum, Hamminkeln" maxlength="120" />
          </label>
          <label>Fahrzeit (Min.)
            <input type="number" min="0" max="600" [value]="values()['fahrzeit'] ?? ''" (input)="set('fahrzeit', $event)" placeholder="laut Route" />
          </label>
          <label>Puffer (Min.)
            <input type="number" min="0" max="240" [value]="values()['puffer'] ?? '15'" (input)="set('puffer', $event)" />
          </label>
          <a class="route" [href]="route()" target="_blank" rel="noopener"><mat-icon>map</mat-icon> Route starten</a>
        </div>
        <p class="departure" [class.ok]="departure()">
          @if (departure(); as d) {
            <mat-icon>alarm</mat-icon> Abfahrt spätestens <strong>{{ d }} Uhr</strong> (Ankunft {{ arrival() }} Uhr − Fahrzeit − Puffer)
          } @else {
            Ankunftszeit (z. B. „15:00“) und Fahrzeit eintragen – dann steht hier die Abfahrtszeit.
          }
        </p>
      </div>
      <p class="hint">Wird pro Auftritt nur in diesem Browser auf diesem Gerät gespeichert – nicht auf der Website.</p>
    </section>
  `,
  styles: `
    .vorort { margin-top: 48px; padding: 24px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    .head { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px 28px; margin-bottom: 20px; }
    .head .kicker { margin-bottom: 4px; }
    h3 { font-family: var(--bn-display); font-weight: 400; font-size: 1.3rem; text-transform: uppercase; letter-spacing: .08em; margin: 0; }
    .progress { display: flex; flex-direction: column; gap: 6px; min-width: 200px; font-size: .85rem; color: var(--bn-fog); }
    .progress.done { color: #7fc29b; }
    .bar { display: block; height: 6px; border-radius: 3px; background: var(--bn-line); overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--bn-sunset); transition: width .3s; }
    .progress.done .bar span { background: #7fc29b; }
    .grid { display: grid; gap: 14px 16px; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
    .wide { grid-column: 1 / -1; }
    label { display: flex; flex-direction: column; gap: 6px; }
    .label {
      display: flex; align-items: center; gap: 6px; font-family: var(--bn-wide); text-transform: uppercase;
      letter-spacing: .14em; font-size: .68rem; color: var(--bn-fog);
    }
    .label mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--bn-sunset); }
    .ok .label mat-icon { color: #7fc29b; }
    input, textarea {
      padding: 9px 12px; border-radius: 8px; border: 1px solid var(--bn-line); background: transparent;
      color: var(--bn-ink); font: 400 .95rem/1.4 Inter, sans-serif; resize: vertical;
    }
    input:focus, textarea:focus { outline: none; border-color: var(--bn-sunset); }
    .trip { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--bn-line); }
    h4 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-family: var(--bn-wide); font-weight: 400; text-transform: uppercase; letter-spacing: .14em; font-size: .78rem; }
    h4 mat-icon, .route mat-icon, .departure mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--bn-sunset); }
    .trip-row { display: grid; gap: 12px 16px; grid-template-columns: 2fr 1fr 1fr auto; align-items: end; }
    .trip-row label { gap: 6px; font-size: .8rem; color: var(--bn-fog); }
    .route {
      display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 999px; white-space: nowrap;
      border: 1px solid var(--bn-line); color: var(--bn-ink); text-decoration: none;
    }
    .route:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .departure { display: flex; align-items: center; gap: 8px; margin: 12px 0 0; font-size: .9rem; color: var(--bn-fog); }
    .departure.ok { color: var(--bn-ink); }
    .departure strong { color: var(--bn-sunset); }
    @media (max-width: 700px) { .trip-row { grid-template-columns: 1fr 1fr; } .trip-row label:first-child { grid-column: 1 / -1; } }
    .hint { margin: 16px 0 0; font-size: .8rem; color: var(--bn-fog); }
    @media (max-width: 520px) { .vorort { padding: 16px; } }
  `,
})
export class VorOrt {
  /** Auftritts-ID – jeder Auftritt hat seine eigenen Angaben */
  readonly show = input.required<string>();
  protected readonly fields = FIELDS;
  private readonly key = computed(() => VORORT_PREFIX + this.show());
  protected readonly values = signal<Record<string, string | undefined>>({});
  protected readonly filled = computed(() => FIELDS.filter((f) => this.values()[f.key]?.trim()).length);

  // Anfahrt: Route von Start zum Auftrittsort, Abfahrt = Ankunft − Fahrzeit − Puffer (src/app/data/trip.ts)
  private readonly band = inject(BandService);
  protected readonly defaultStart = DEFAULT_START;
  protected readonly route = computed(() => routeUrl(this.band.showById(this.show()), this.values()));
  protected readonly arrival = computed(() => arrivalTime(this.values()));
  protected readonly departure = computed(() => departureTime(this.values()));

  constructor() {
    // beim Wechsel zu einem anderen Auftritt dessen Angaben laden
    effect(() => this.values.set(loadVorOrt(this.key())));
  }

  protected set(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.values.update((v) => ({ ...v, [field]: value }));
    try {
      localStorage.setItem(this.key(), JSON.stringify(this.values()));
    } catch {
      // Speichern nicht möglich (z. B. privater Modus) – Angaben gelten dann nur bis zum Neuladen
    }
  }
}
