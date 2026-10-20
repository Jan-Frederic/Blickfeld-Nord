import { Component, computed, input, signal, effect } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Show } from '../data/band.service';
import { HOME, Ortsverzeichnis } from '../data/entfernung';

// Wetter für einen Auftritt (Backstage): Vorhersage von Open-Meteo (kostenlos, ohne Anmeldung) für Ort, Tag und
// Uhrzeit des Auftritts – gibt es etwa 16 Tage im Voraus. Die Abfrage läuft nur im Backstage, im Browser der Band.
const DAY = 864e5;
const RANGE_DAYS = 15;

// WMO-Wettercodes → Text und Symbol
const CODES: { max: number; text: string; icon: string }[] = [
  { max: 0, text: 'klar', icon: 'wb_sunny' },
  { max: 2, text: 'teils bewölkt', icon: 'wb_cloudy' },
  { max: 3, text: 'bedeckt', icon: 'cloud' },
  { max: 48, text: 'Nebel', icon: 'cloud' },
  { max: 57, text: 'Nieselregen', icon: 'water_drop' },
  { max: 67, text: 'Regen', icon: 'umbrella' },
  { max: 77, text: 'Schnee', icon: 'ac_unit' },
  { max: 82, text: 'Regenschauer', icon: 'umbrella' },
  { max: 86, text: 'Schneeschauer', icon: 'ac_unit' },
  { max: 99, text: 'Gewitter', icon: 'thunderstorm' },
];
const describe = (code: number) => CODES.find((c) => code <= c.max) ?? CODES[CODES.length - 1];

interface Forecast {
  hour: string;
  temp: number;
  rain: number;
  wind: number;
  code: number;
  min: number;
  max: number;
}

@Component({
  selector: 'app-wetter',
  imports: [MatIconModule],
  template: `
    <section class="wetter" aria-labelledby="wetter-title">
      <h3 id="wetter-title"><mat-icon>wb_cloudy</mat-icon> Wetter</h3>
      @if (state() === 'early') {
        <p class="note">Die Vorhersage gibt es ab etwa {{ range }} Tage vor dem Auftritt – noch {{ daysUntil() - range }} Tage warten.</p>
      } @else if (state() === 'loading') {
        <p class="note">Vorhersage wird geladen …</p>
      } @else if (state() === 'error') {
        <p class="note">Vorhersage gerade nicht abrufbar (offline?).</p>
      } @else if (forecast(); as f) {
        <div class="now">
          <mat-icon class="big">{{ info().icon }}</mat-icon>
          <span class="temp">{{ f.temp }}°</span>
          <span class="desc">
            <strong>{{ info().text }}</strong> um {{ f.hour }} Uhr<br />
            Tag {{ f.min }}–{{ f.max }}° · <mat-icon>umbrella</mat-icon> {{ f.rain }} % Regen · <mat-icon>air</mat-icon> {{ f.wind }} km/h
          </span>
        </div>
        @if (f.rain >= 40 || f.wind >= 40) {
          <p class="warn"><mat-icon>warning</mat-icon> {{ f.rain >= 40 ? 'Regen wahrscheinlich – an Abdeckung und Pavillon denken.' : 'Kräftiger Wind – Stative und Pavillon sichern.' }}</p>
        }
        <p class="src">{{ place() }} · Daten: Open-Meteo.com</p>
      }
    </section>
  `,
  styles: `
    .wetter { margin-top: 24px; padding: 18px 20px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-family: var(--bn-wide); font-weight: 400; text-transform: uppercase; letter-spacing: .14em; font-size: .8rem; color: var(--bn-fog); }
    h3 mat-icon { color: var(--bn-sunset); font-size: 20px; width: 20px; height: 20px; }
    .now { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
    .big { font-size: 44px; width: 44px; height: 44px; color: var(--bn-sunset); }
    .temp { font: 600 2.4rem/1 Inter, sans-serif; }
    .desc { line-height: 1.6; color: rgba(236, 233, 228, .86); }
    .desc mat-icon, .warn mat-icon { font-size: 16px; width: 16px; height: 16px; vertical-align: -3px; }
    .warn { margin: 12px 0 0; color: #e0b25a; }
    .note { margin: 0; color: var(--bn-fog); }
    .src { margin: 10px 0 0; font-size: .75rem; color: var(--bn-fog); }
  `,
})
export class Wetter {
  readonly show = input.required<Show>();
  protected readonly range = RANGE_DAYS;
  protected readonly forecast = signal<Forecast | null>(null);
  protected readonly place = signal('');
  protected readonly failed = signal(false);

  private readonly today = new Date().toISOString().slice(0, 10);
  protected readonly daysUntil = computed(() => Math.round((Date.parse(this.show().date) - Date.parse(this.today)) / DAY));
  protected readonly state = computed(() =>
    this.daysUntil() > RANGE_DAYS ? 'early' : this.failed() ? 'error' : this.forecast() ? 'ready' : 'loading',
  );
  protected readonly info = computed(() => describe(this.forecast()?.code ?? 0));

  constructor() {
    effect(() => {
      const s = this.show();
      if (this.daysUntil() <= RANGE_DAYS && this.daysUntil() >= 0) this.load(s).catch(() => this.failed.set(true));
    });
  }

  private async load(s: Show): Promise<void> {
    // Koordinaten über das Ortsverzeichnis (Ort, sonst Location), notfalls Hamminkeln
    const orte = await Ortsverzeichnis.load();
    const hit = (s.city && orte.locate(s.city)) || orte.locate(s.venue);
    const pos = hit ?? { lat: HOME.lat, lon: HOME.lon, name: HOME.name };
    this.place.set(hit ? pos.name : `${HOME.name} (Ort unbekannt)`);
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${pos.lat}&longitude=${pos.lon}` +
      `&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m` +
      `&daily=temperature_2m_min,temperature_2m_max&timezone=Europe%2FBerlin&start_date=${s.date}&end_date=${s.date}`;
    const data = await (await fetch(url)).json();
    const hour = (s.time ?? '18:00').slice(0, 2) + ':00';
    const i = (data.hourly.time as string[]).findIndex((t) => t.endsWith(hour));
    if (i < 0) throw new Error('keine Stunde');
    this.forecast.set({
      hour,
      temp: Math.round(data.hourly.temperature_2m[i]),
      rain: data.hourly.precipitation_probability[i] ?? 0,
      wind: Math.round(data.hourly.wind_speed_10m[i]),
      code: data.hourly.weather_code[i],
      min: Math.round(data.daily.temperature_2m_min[0]),
      max: Math.round(data.daily.temperature_2m_max[0]),
    });
  }
}
