import { Component, computed, inject, signal } from '@angular/core';
import { BandService } from '../data/band.service';
import { ladeIch, rufname } from '../data/band-ich';
import { alleFortschritte } from '../data/fortschritt';
import { Woche, wochenRueckblick, wochenVerlauf } from '../data/wochenrueckblick';

// Backstage → Zahlen: Üben der Band – geübte Karten je Kalenderwoche und Person (letzte 8 Wochen, die laufende rechts)
// als gruppierte Balken; darunter die Songs, die diese Woche bei allen sitzen. Daten: data/wochenrueckblick.ts.
// HTML-Balken statt SVG, damit die Beschriftung auch auf dem Handy lesbar groß bleibt. Antippen bzw. Fokus auf eine
// Woche zeigt die Zahlen; für Screenreader und zum Nachlesen gibt es die Tabelle. Farben je Person in fester
// Reihenfolge der Band (geprüft gegen den dunklen Hintergrund, auch bei Farbfehlsichtigkeit). Styles global.
@Component({
  selector: 'app-uebe-wochen',
  template: `
    <h3>Üben – Karten je Woche</h3>
    @if (leer()) {
      <p class="hinweis">In den letzten 8 Wochen hat noch niemand im Übe-Modus geübt.</p>
    } @else {
      <p class="legende">
        @for (p of personen(); track p.slug; let j = $index) {
          <span><i [class]="'p' + j" aria-hidden="true"></i> {{ p.name }} <b>{{ dieseWoche()[p.slug] }}</b> <small>diese Woche</small></span>
        }
      </p>
      <div class="flaeche" role="group" aria-label="Geübte Karten je Woche und Person">
        @for (g of gitter(); track g.wert) {
          <div class="linie" [style.bottom.%]="g.pct" aria-hidden="true"><span>{{ g.wert }}</span></div>
        }
        <div class="spalten">
          @for (w of wochen(); track w.ab; let i = $index) {
            <button type="button" class="woche" [class.aktiv]="aktiv() === i" (mouseenter)="aktiv.set(i)" (focus)="aktiv.set(i)" (click)="aktiv.set(i)" [attr.aria-label]="beschreibung(w)">
              @for (p of personen(); track p.slug; let j = $index) {
                <span class="bar" [class]="'bar p' + j" [style.height.%]="pct(w.karten[p.slug])"></span>
              }
            </button>
          }
        </div>
      </div>
      <div class="kws" aria-hidden="true">
        @for (w of wochen(); track w.ab; let i = $index) { <span [class.aktiv]="aktiv() === i">KW {{ w.kw }}</span> }
      </div>
      <p class="info" aria-live="polite">
        @if (auswahl(); as w) { <strong>KW {{ w.kw }}</strong>&nbsp;<small>({{ datum(w.ab) }}–{{ datum(w.bis) }})</small> · {{ zahlen(w) }} }
      </p>
      <details class="tabelle">
        <summary>Als Tabelle</summary>
        <table>
          <thead><tr><th scope="col">Woche</th>@for (p of personen(); track p.slug) { <th scope="col">{{ p.name }}</th> }</tr></thead>
          <tbody>
            @for (w of wochen(); track w.ab) {
              <tr><th scope="row">KW {{ w.kw }} <small>{{ datum(w.ab) }}</small></th>@for (p of personen(); track p.slug) { <td>{{ w.karten[p.slug] }}</td> }</tr>
            }
          </tbody>
        </table>
      </details>
    }
    @if (gefestigt().length) { <p class="gefestigt"><strong>Sitzt jetzt bei allen:</strong> {{ gefestigt().join(', ') }}</p> }
  `,
})
export class UebeWochen {
  private readonly band = inject(BandService);
  private readonly heute = new Date().toLocaleDateString('sv-SE');
  private readonly ich = ladeIch();
  private readonly verlaeufe = alleFortschritte(this.band.members);
  protected readonly personen = signal(this.band.members.map((m) => ({ slug: m.slug, name: m.slug === this.ich ? 'du' : rufname(m) })));
  protected readonly wochen = signal<Woche[]>(wochenVerlauf(this.band.members, this.verlaeufe, this.heute, 8));
  protected readonly gefestigt = signal(wochenRueckblick(this.band.members, this.verlaeufe, this.ich, this.heute).gefestigt);
  protected readonly leer = computed(() => this.wochen().every((w) => Object.values(w.karten).every((n) => !n)));
  protected readonly dieseWoche = computed(() => this.wochen().at(-1)?.karten ?? {});
  /** ausgewählte Woche – zuerst die laufende */
  protected readonly aktiv = signal(7);
  protected readonly auswahl = computed(() => this.wochen()[this.aktiv()]);
  /** Skala: runde Schritte (1, 2, 5, 10 …), höchstens 4 Linien */
  private readonly skala = computed(() => {
    const max = Math.max(1, ...this.wochen().flatMap((w) => Object.values(w.karten)));
    const schritt = [1, 2, 5, 10, 20, 25, 50, 100].find((s) => max / s <= 4) ?? 100;
    return { schritt, oben: Math.ceil(max / schritt) * schritt };
  });
  protected readonly gitter = computed(() => {
    const { schritt, oben } = this.skala();
    const out: { wert: number; pct: number }[] = [];
    for (let v = schritt; v <= oben; v += schritt) out.push({ wert: v, pct: (v / oben) * 100 });
    return out;
  });
  protected pct(n: number): number {
    return (n / this.skala().oben) * 100;
  }
  protected datum(tag: string): string {
    return `${tag.slice(8, 10)}.${tag.slice(5, 7)}.`;
  }
  protected zahlen(w: Woche): string {
    return this.personen().map((p) => `${p.name} ${w.karten[p.slug]}`).join(' · ');
  }
  protected beschreibung(w: Woche): string {
    return `KW ${w.kw}: ${this.personen().map((p) => `${p.name} ${w.karten[p.slug]} ${w.karten[p.slug] === 1 ? 'Karte' : 'Karten'}`).join(', ')}`;
  }
}
