import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { BandService } from '../data/band.service';
import { zaehler } from '../data/goatcounter';
import { EINHEITEN, Einheit, Ereignis, ereignisseJeZeitraum, zeitraeume } from '../data/besucher-verlauf';
import { erledigteSchritte, werbeplan } from '../data/werbeplan';

// Backstage → Zahlen → Besucher: Seitenaufrufe als Zeitlinie (Tag, Woche, Monat, Jahr – Standard Monat), darauf die
// Auftritte (●) und Werbemaßnahmen aus dem Werbeplan (◆, ausgefüllt = abgehakt). Zahlen je Zeitraum vom öffentlichen
// GoatCounter-Zähler (TOTAL), einmal je Einheit geladen. Antippen bzw. Fokus auf einen Balken zeigt Zahl und Ereignisse.
const W = 640;
const H = 200;
const OBEN = 34; // Platz für die Ereignis-Marken
const UNTEN = 22; // Achsenbeschriftung
const RECHTS = 40; // Skala rechts neben den Balken

@Component({
  selector: 'app-besucher-verlauf',
  imports: [DecimalPipe],
  template: `
    <div class="verlauf">
      <div class="kopf">
        <h3>Besucher im Verlauf</h3>
        <div class="einheiten" role="group" aria-label="Zeitraum je Balken">
          @for (e of einheiten; track e.key) {
            <button type="button" [attr.aria-pressed]="einheit() === e.key" (click)="waehlen(e.key)">{{ e.label }}</button>
          }
        </div>
      </div>
      <p class="legende">
        <span><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5" class="m-auftritt" /></svg> Auftritt</span>
        <span><svg width="14" height="14" aria-hidden="true"><path d="M7 1 L13 7 L7 13 L1 7 Z" class="m-werbung" /></svg> Werbemaßnahme (abgehakt)</span>
        <span><svg width="14" height="14" aria-hidden="true"><path d="M7 2 L12 7 L7 12 L2 7 Z" class="m-werbung offen" /></svg> geplant, nicht abgehakt</span>
      </p>
      @if (fehler()) {
        <p class="hinweis">Verlauf nicht geladen – GoatCounter antwortet gerade nicht.</p>
      } @else {
        <svg [attr.viewBox]="'0 0 ' + w + ' ' + h" class="diagramm" role="img" [attr.aria-label]="'Seitenaufrufe je ' + einheitLabel() + ' mit Auftritten und Werbemaßnahmen'">
          <!-- Hilfslinien: recessiv -->
          @for (g of gitter(); track g.wert) {
            <line [attr.x1]="0" [attr.x2]="w - rechts + 4" [attr.y1]="g.y" [attr.y2]="g.y" class="gitter" />
            <text [attr.x]="w" [attr.y]="g.y + 4" class="achse" text-anchor="end">{{ g.wert | number: '1.0-0' }}</text>
          }
          @for (b of balken(); track b.label; let i = $index) {
            <g class="spalte" tabindex="0" [class.aktiv]="aktiv() === i" (mouseenter)="aktiv.set(i)" (focus)="aktiv.set(i)" (click)="aktiv.set(i)"
               [attr.aria-label]="b.label + ': ' + (b.wert ?? '…') + ' Aufrufe' + (b.ereignisse.length ? ', ' + b.ereignisse.length + ' Ereignisse' : '')">
              <rect [attr.x]="b.x" [attr.y]="0" [attr.width]="b.breite" [attr.height]="h - unten" class="treffer" />
              @if (b.hoehe > 0) { <path [attr.d]="b.pfad" class="balken" /> }
              @if (b.auftritt) { <circle [attr.cx]="b.mitte" cy="10" r="5" class="m-auftritt" /> }
              @if (b.werbung) { <path [attr.d]="raute(b.mitte, 25, b.werbung === 'offen' ? 5 : 6)" class="m-werbung" [class.offen]="b.werbung === 'offen'" /> }
              @if (b.beschriften) { <text [attr.x]="b.mitte" [attr.y]="h - 6" class="achse" text-anchor="middle">{{ b.label }}</text> }
            </g>
          }
        </svg>
        <p class="info" aria-live="polite">
          @if (auswahl(); as a) {
            <strong>{{ a.label }}</strong> · {{ a.wert === null ? 'lädt …' : (a.wert | number: '1.0-0') + ' Aufrufe' }}
            @for (e of a.ereignisse; track $index) { <span class="ev" [class.auftritt]="e.art === 'auftritt'">{{ e.art === 'auftritt' ? '●' : e.erledigt ? '◆' : '◇' }} {{ e.datum.slice(8, 10) }}.{{ e.datum.slice(5, 7) }}. {{ e.text }}</span> }
          } @else { Balken antippen für Zahl und Ereignisse. }
        </p>
        <details class="tabelle">
          <summary>Als Tabelle</summary>
          <table>
            <thead><tr><th scope="col">{{ einheitLabel() }}</th><th scope="col">Aufrufe</th><th scope="col">Ereignisse</th></tr></thead>
            <tbody>
              @for (b of balken(); track b.label) {
                <tr><th scope="row">{{ b.label }}</th><td>{{ b.wert === null ? '…' : (b.wert | number: '1.0-0') }}</td><td>{{ b.text }}</td></tr>
              }
            </tbody>
          </table>
        </details>
      }
    </div>
  `,
})
export class BesucherVerlauf {
  protected readonly w = W;
  protected readonly h = H;
  protected readonly unten = UNTEN;
  protected readonly rechts = RECHTS;
  protected readonly einheiten = EINHEITEN;
  protected readonly einheit = signal<Einheit>('monat');
  protected readonly einheitLabel = computed(() => EINHEITEN.find((e) => e.key === this.einheit())!.label);
  protected readonly aktiv = signal<number | null>(null);
  protected readonly fehler = signal(false);
  private readonly heute = new Date().toLocaleDateString('sv-SE');
  private readonly werte = signal<Partial<Record<Einheit, (number | null)[]>>>({});
  private readonly band = inject(BandService);

  /** Auftritte (private nur mit öffentlichem Namen bzw. „Private Feier“) und Werbeplan-Schritte öffentlicher Auftritte */
  private readonly ereignisse: Ereignis[] = this.band.shows.flatMap((s) => {
    const id = this.band.showId(s);
    const name = s.private ? (s.publicName ?? 'Private Feier') : s.venue;
    const auftritt: Ereignis = { datum: s.date, art: 'auftritt', text: name };
    if (s.private) return [auftritt];
    const erledigt = erledigteSchritte(id);
    const werbung = werbeplan(s.date, this.heute, s.endDate).map(
      (x): Ereignis => ({ datum: x.datum, art: 'werbung', text: `${x.schritt.titel} (${name})`, erledigt: erledigt.includes(x.schritt.id) }),
    );
    return [auftritt, ...werbung];
  });

  protected readonly raeume = computed(() => zeitraeume(this.einheit(), this.heute));
  protected readonly balken = computed(() => {
    const r = this.raeume();
    const werte = this.werte()[this.einheit()] ?? r.map(() => null);
    const ev = ereignisseJeZeitraum(r, this.ereignisse);
    const max = this.skala();
    const schritt = (W - RECHTS) / r.length;
    const breite = Math.max(2, schritt - 2); // 2px Abstand zwischen den Balken
    const jede = Math.ceil(r.length / 8); // höchstens ~8 Beschriftungen
    return r.map((z, i) => {
      const wert = werte[i] ?? null;
      const hoehe = wert && max ? ((H - OBEN - UNTEN) * wert) / max : 0;
      const x = i * schritt + 1;
      const y = H - UNTEN - hoehe;
      const rr = Math.min(4, breite / 2, hoehe);
      const werbung = ev[i].filter((e) => e.art === 'werbung');
      return {
        label: z.label,
        wert,
        x,
        breite,
        mitte: x + breite / 2,
        hoehe,
        // oben 4px gerundet, unten auf der Grundlinie gerade
        pfad: `M${x},${H - UNTEN} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + breite - rr} Q${x + breite},${y} ${x + breite},${y + rr} V${H - UNTEN} Z`,
        ereignisse: ev[i],
        auftritt: ev[i].some((e) => e.art === 'auftritt'),
        werbung: werbung.length ? (werbung.some((e) => e.erledigt) ? 'erledigt' : 'offen') : '',
        text: ev[i].map((e) => e.text).join(', '),
        beschriften: (r.length - 1 - i) % jede === 0,
      };
    });
  });
  /** runde Obergrenze der Skala */
  private readonly skala = computed(() => {
    const m = Math.max(0, ...((this.werte()[this.einheit()] ?? []).filter((x) => x !== null) as number[]));
    if (!m) return 0;
    const p = 10 ** Math.floor(Math.log10(m));
    return Math.ceil(m / p) * p;
  });
  protected readonly gitter = computed(() => {
    const max = this.skala();
    return max ? [max / 2, max].map((wert) => ({ wert, y: H - UNTEN - ((H - OBEN - UNTEN) * wert) / max })) : [];
  });
  protected readonly auswahl = computed(() => {
    const i = this.aktiv();
    return i === null ? null : (this.balken()[i] ?? null);
  });

  constructor() {
    void this.laden();
  }

  protected waehlen(e: Einheit): void {
    this.einheit.set(e);
    this.aktiv.set(null);
    void this.laden();
  }

  protected raute(x: number, y: number, r: number): string {
    return `M${x} ${y - r} L${x + r} ${y} L${x} ${y + r} L${x - r} ${y} Z`;
  }

  private async laden(): Promise<void> {
    const e = this.einheit();
    if (this.werte()[e]) return;
    const r = this.raeume();
    this.werte.update((w) => ({ ...w, [e]: r.map(() => null) }));
    try {
      const zahlen = await Promise.all(r.map((z) => zaehler('TOTAL', z.start, z.ende)));
      this.werte.update((w) => ({ ...w, [e]: zahlen }));
      this.fehler.set(false);
    } catch {
      this.werte.update((w) => {
        const neu = { ...w };
        delete neu[e];
        return neu;
      });
      this.fehler.set(true);
    }
  }
}
