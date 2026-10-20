import { Component, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

// Besucherzahlen aus GoatCounter (öffentlicher Zähler, nur Summen – keine Daten über einzelne Besucher).
// Voraussetzung: In GoatCounter unter Settings „Allow adding visitor counts on your website“ aktivieren, sonst
// antwortet der Zähler mit 403. GoatCounter puffert die Zahlen bis zu einige Stunden.
const GC = 'https://blickfeld-nord.goatcounter.com';
const DASHBOARD = GC;
const PERIODS = [
  { key: 'week', label: '7 Tage' },
  { key: 'month', label: '30 Tage' },
  { key: 'year', label: '12 Monate' },
  { key: '', label: 'insgesamt' },
] as const;
const PAGES = [
  { path: '/', label: 'Startseite' },
  { path: '/booking', label: 'Booking' },
  { path: '/repertoire', label: 'Repertoire' },
  { path: '/galerie', label: 'Galerie' },
  { path: '/historie', label: 'Historie' },
  { path: '/technik', label: 'Technik' },
  { path: '/presse', label: 'Pressekit' },
  { path: '/freunde', label: 'Freunde' },
  { path: '/wunsch', label: 'Wunschbox' },
  { path: '/en', label: 'Startseite EN' },
  { path: '/nl', label: 'Startseite NL' },
  { path: '/en/booking', label: 'Booking EN' },
  { path: '/nl/booking', label: 'Booking NL' },
];

type State = 'loading' | 'ok' | 'disabled' | 'offline';

async function count(path: string, start: string): Promise<number> {
  const url = `${GC}/counter/${encodeURIComponent(path)}.json${start ? '?start=' + start : ''}`;
  const res = await fetch(url);
  if (res.status === 404) return 0; // Seite noch nie aufgerufen
  if (!res.ok) throw new Error(String(res.status));
  // Zahl kommt formatiert („1.234“ / „1,234“ / „1 234“)
  return Number(String((await res.json()).count).replace(/\D/g, '')) || 0;
}

@Component({
  selector: 'app-backstage-besucher',
  imports: [DecimalPipe, MatIconModule],
  template: `
    <section class="besucher" aria-labelledby="besucher-titel">
      <h2 id="besucher-titel"><mat-icon>insights</mat-icon> Besucher der Webseite</h2>
      @switch (state()) {
        @case ('loading') {
          <p class="note">Zahlen werden geladen …</p>
        }
        @case ('disabled') {
          <p class="note">
            <mat-icon>info</mat-icon>
            <span>Keine Zahlen erhalten. Meist ist der öffentliche Zähler noch nicht freigeschaltet: In
            <a [href]="dashboard + '/settings/main'" target="_blank" rel="noopener">GoatCounter → Settings</a>
            „Allow adding visitor counts on your website“ aktivieren und speichern. Sonst blockiert ein Werbeblocker
            GoatCounter.</span>
          </p>
        }
        @case ('offline') {
          <p class="note"><mat-icon>cloud_off</mat-icon> Offline – Besucherzahlen gibt es nur mit Internet.</p>
        }
        @default {
          <ul class="totals">
            @for (p of totals(); track p.label) {
              <li><span class="value">{{ p.count | number: '1.0-0' }}</span><span class="label">{{ p.label }}</span></li>
            }
          </ul>
          <h3>Beliebteste Seiten · 30 Tage</h3>
          <ol class="pages">
            @for (p of pages(); track p.path) {
              <li>
                <span class="name">{{ p.label }}</span>
                <span class="bar" aria-hidden="true"><span [style.width.%]="max() ? (p.count / max()) * 100 : 0"></span></span>
                <span class="num">{{ p.count | number: '1.0-0' }}</span>
              </li>
            }
          </ol>
        }
      }
      <p class="foot">
        Seitenaufrufe laut GoatCounter (ohne Backstage), aktualisiert alle paar Stunden ·
        <a [href]="dashboard" target="_blank" rel="noopener">alle Details in GoatCounter</a>
      </p>
    </section>
  `,
  styles: `
    .besucher { margin-top: 32px; padding: 20px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    h2 { display: flex; align-items: center; gap: 8px; margin: 0 0 16px; font-size: 1.05rem; }
    h2 mat-icon { color: #7fb3e0; }
    h3 { margin: 22px 0 10px; font-size: .85rem; font-weight: 500; color: var(--bn-fog); }
    mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .totals { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin: 0; padding: 0; list-style: none; }
    .totals li { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border-radius: 10px; background: rgba(255, 255, 255, .04); }
    .value { font: 600 1.5rem/1.2 Inter, sans-serif; }
    .label { font-size: .8rem; color: var(--bn-fog); }
    .pages { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; }
    .pages li { display: grid; grid-template-columns: 7.5em 1fr 4em; align-items: center; gap: 10px; font-size: .88rem; }
    .bar { height: 8px; border-radius: 4px; background: rgba(255, 255, 255, .06); overflow: hidden; }
    .bar span { display: block; height: 100%; border-radius: 4px; background: #7fb3e0; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .note { display: flex; align-items: flex-start; gap: 8px; margin: 0; color: var(--bn-fog); }
    .note mat-icon { color: #e0b25a; }
    .foot { margin: 16px 0 0; font-size: .78rem; color: var(--bn-fog); }
    a { color: var(--bn-sunset); }
  `,
})
export class BackstageBesucher implements OnInit {
  protected readonly dashboard = DASHBOARD;
  protected readonly state = signal<State>('loading');
  protected readonly totals = signal<{ label: string; count: number }[]>([]);
  protected readonly pages = signal<{ path: string; label: string; count: number }[]>([]);
  protected readonly max = signal(0);

  async ngOnInit(): Promise<void> {
    try {
      const totals = await Promise.all(PERIODS.map(async (p) => ({ label: p.label, count: await count('TOTAL', p.key) })));
      const pages = await Promise.all(PAGES.map(async (p) => ({ ...p, count: await count(p.path, 'month') })));
      pages.sort((a, b) => b.count - a.count);
      this.totals.set(totals);
      this.pages.set(pages);
      this.max.set(pages[0]?.count ?? 0);
      this.state.set('ok');
    } catch {
      // GoatCounter schickt die Sperre (403) ohne CORS-Freigabe – der Browser meldet dann nur einen Netzwerkfehler
      this.state.set(navigator.onLine ? 'disabled' : 'offline');
    }
  }
}
