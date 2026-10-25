import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { HERKUNFT } from '../analytics';
import { GC, kampagne, zaehler as count } from '../data/goatcounter';
import { BandService } from '../data/band.service';
import { WEGE } from './konzert-kampagne';

// Besucherzahlen aus GoatCounter (öffentlicher Zähler, siehe data/goatcounter.ts)
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

@Component({
  selector: 'app-backstage-besucher',
  imports: [DecimalPipe, MatIconModule, RouterLink],
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
          <h3>Booking-Anfragen · 12 Monate</h3>
          <ul class="totals">
            @for (a of anfragen(); track a.label) {
              <li><span class="value">{{ a.count | number: '1.0-0' }}</span><span class="label">{{ a.label }}</span></li>
            }
          </ul>
          @if (anfrageHerkunft().length) {
            <p class="foot">davon über: @for (h of anfrageHerkunft(); track h.ref; let last = $last) { <span>{{ h.label }} {{ h.count }}{{ last ? '' : ', ' }}</span> }</p>
          }
          <p class="foot">Gezählt, wenn jemand im Booking die Anfrage abschickt bzw. auf die Mail-Adresse tippt – ob die Mail
          wirklich rausgeht, sieht GoatCounter nicht.</p>
          <h3>Gekommen über · 12 Monate</h3>
          @if (herkunft().length) {
            <ol class="pages">
              @for (h of herkunft(); track h.ref) {
                <li>
                  <span class="name">{{ h.label }}</span>
                  <span class="bar" aria-hidden="true"><span [style.width.%]="herkunftMax() ? (h.count / herkunftMax()) * 100 : 0"></span></span>
                  <span class="num">{{ h.count | number: '1.0-0' }}</span>
                </li>
              }
            </ol>
          } @else {
            <p class="note">Noch niemand über einen QR-Code gekommen.</p>
          }
          @if (kampagnen().length) {
            <h3>Kampagnen der Konzerte · 12 Monate</h3>
            <div class="table-wrap">
              <table class="kampagnen">
                <thead>
                  <tr><th scope="col">Konzert</th><th scope="col">Seite</th>
                    @for (w of wege; track w.ref) { <th scope="col">{{ w.kurz }}</th> }
                  </tr>
                </thead>
                <tbody>
                  @for (k of kampagnen(); track k.id) {
                    <tr>
                      <th scope="row"><a [routerLink]="['/backstage', k.id]">{{ k.datum }} · {{ k.name }}</a></th>
                      <td data-label="Seite">{{ k.seite | number: '1.0-0' }}</td>
                      @for (c of k.wege; track $index) { <td [attr.data-label]="wege[$index].kurz" [class.null]="!c">{{ c | number: '1.0-0' }}</td> }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <p class="foot">Seite = Aufrufe der Konzertseite (DE/EN/NL); die übrigen Spalten zählen Besucher über Plakat, Story,
              Beitragstext und geteilte Links mit der Kampagne des Konzerts.</p>
          }
          <h3>Fehlerseite · 12 Monate</h3>
          <p class="text">{{ fehler() | number: '1.0-0' }}× aufgerufen – welche Adressen, steht in
            <a [href]="dashboard" target="_blank" rel="noopener">GoatCounter</a> unter den Ereignissen „404:…“. Viele Aufrufe
            deuten auf einen alten oder falschen Link hin, z. B. auf einem Plakat.</p>
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
    .kampagnen { width: 100%; border-collapse: collapse; font-size: .85rem; }
    .kampagnen th, .kampagnen td { padding: 6px 8px; border-bottom: 1px solid var(--bn-line); text-align: right; white-space: nowrap; }
    .kampagnen th[scope=row], .kampagnen thead th:first-child { text-align: left; }
    .kampagnen td.null { color: var(--bn-fog); }
    .table-wrap { overflow-x: auto; }
    /* Handy: je Konzert eine Karte – Name oben, Zahlen mit Beschriftung darunter */
    @media (max-width: 600px) {
      .kampagnen thead { display: none; }
      .kampagnen tr { display: grid; grid-template-columns: repeat(5, 1fr); padding: 8px 0; border-bottom: 1px solid var(--bn-line); }
      .kampagnen th[scope=row] { grid-column: 1 / -1; white-space: normal; padding: 0 0 6px; border: 0; }
      .kampagnen td { display: flex; flex-direction: column; align-items: center; padding: 0; border: 0; font-variant-numeric: tabular-nums; }
      .kampagnen td::before { content: attr(data-label); font-size: .7rem; color: var(--bn-fog); }
    }
    .pages li { display: grid; grid-template-columns: minmax(7.5em, auto) 1fr 4em; align-items: center; gap: 10px; font-size: .88rem; }
    .bar { height: 8px; border-radius: 4px; background: rgba(255, 255, 255, .06); overflow: hidden; }
    .bar span { display: block; height: 100%; border-radius: 4px; background: #7fb3e0; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .note { display: flex; align-items: flex-start; gap: 8px; margin: 0; color: var(--bn-fog); }
    .note mat-icon { color: #e0b25a; }
    .text { margin: 0; color: var(--bn-fog); }
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
  protected readonly herkunft = signal<{ ref: string; label: string; count: number }[]>([]);
  protected readonly anfragen = signal<{ label: string; count: number }[]>([]);
  protected readonly fehler = signal(0);
  protected readonly anfrageHerkunft = signal<{ ref: string; label: string; count: number }[]>([]);
  protected readonly herkunftMax = signal(0);
  private readonly band = inject(BandService);
  protected readonly wege = WEGE.map((w) => ({ ...w, kurz: { plakat: 'Plakat', story: 'Story', text: 'Text', geteilt: 'Geteilt' }[w.ref] ?? w.ref }));
  protected readonly kampagnen = signal<{ id: string; datum: string; name: string; seite: number; wege: number[] }[]>([]);

  async ngOnInit(): Promise<void> {
    try {
      const totals = await Promise.all(PERIODS.map(async (p) => ({ label: p.label, count: await count('TOTAL', p.key) })));
      const pages = await Promise.all(PAGES.map(async (p) => ({ ...p, count: await count(p.path, 'month') })));
      pages.sort((a, b) => b.count - a.count);
      this.totals.set(totals);
      this.pages.set(pages);
      this.max.set(pages[0]?.count ?? 0);
      this.state.set('ok');
      // Herkunft aus QR-Codes (Ereignisse „von-…“, siehe analytics.ts) – Fehler hier lassen den Rest stehen
      const herkunft = await Promise.all(HERKUNFT.map(async (h) => ({ ...h, count: await count(`von-${h.ref}`, 'year').catch(() => 0) })));
      const besucht = herkunft.filter((h) => h.count > 0).sort((a, b) => b.count - a.count);
      this.herkunft.set(besucht);
      this.herkunftMax.set(besucht[0]?.count ?? 0);
      // Booking-Anfragen (Ereignisse aus analytics.ts → zaehleAnfrage)
      const n = (path: string) => count(path, 'year').catch(() => 0);
      const [assistent, mail, fehler] = await Promise.all([n('anfrage-assistent'), n('anfrage-mail'), n('fehlerseite')]);
      this.fehler.set(fehler);
      this.anfragen.set([
        { label: 'Anfragen gesamt', count: assistent + mail },
        { label: 'über den Anfrage-Assistenten', count: assistent },
        { label: 'per Mail-Link', count: mail },
      ]);
      const ah = await Promise.all(HERKUNFT.map(async (h) => ({ ...h, count: await n(`anfrage-von-${h.ref}`) })));
      this.anfrageHerkunft.set(ah.filter((h) => h.count > 0).sort((a, b) => b.count - a.count));
      // Kampagnen: öffentliche Konzerte der letzten 12 Monate und alle kommenden, neueste zuerst
      const seit = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
      const konzerte = this.band.publicShows.filter((s) => s.date >= seit).reverse();
      this.kampagnen.set(
        await Promise.all(
          konzerte.map(async (s) => {
            const id = this.band.showId(s);
            const seiten = await Promise.all(['', '/en', '/nl'].map((l) => n(`${l}/konzerte/${id}`)));
            const wege = await Promise.all(WEGE.map((w) => n(`kampagne-${kampagne(id)}-${w.ref}`)));
            return { id, datum: s.date.split('-').reverse().join('.'), name: s.venue, seite: seiten.reduce((a, b) => a + b, 0), wege };
          }),
        ),
      );
    } catch {
      // GoatCounter schickt die Sperre (403) ohne CORS-Freigabe – der Browser meldet dann nur einen Netzwerkfehler
      this.state.set(navigator.onLine ? 'disabled' : 'offline');
    }
  }
}
