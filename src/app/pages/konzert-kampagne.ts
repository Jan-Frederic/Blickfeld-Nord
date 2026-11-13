import { Component, effect, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { GC, kampagne, zaehler } from '../data/goatcounter';

// Backstage eines öffentlichen Auftritts: Wie viele sind über Plakat, Stories, Reel, Beitragstext oder geteilte Links
// gekommen? Ereignisse „kampagne-konzert-<ID>-<Herkunft>“ aus analytics.ts, dazu die Aufrufe der Konzertseite und des
// Pressekits je Sprache. Angezeigt als Summe je Gruppe, darunter die Einzelzahlen (z. B. welche Story wie viel brachte).
export interface Weg {
  ref: string;
  label: string;
}
export interface WegGruppe {
  id: string;
  label: string;
  /** kurze Spaltenüberschrift (Besucher-Tabelle) */
  kurz: string;
  wege: Weg[];
}
export const GRUPPEN: WegGruppe[] = [
  { id: 'plakat', label: 'Plakat (QR-Code)', kurz: 'Plakat', wege: [{ ref: 'plakat', label: 'Plakat, Beitrag, Druck' }] },
  {
    id: 'story',
    label: 'Stories',
    kurz: 'Stories',
    wege: [
      { ref: 'story', label: 'Story' },
      { ref: 'story-1', label: '2 Wochen vorher' },
      { ref: 'story-woche', label: '1 Woche vorher' },
      { ref: 'story-morgen', label: 'am Tag davor' },
      { ref: 'story-heute', label: 'am Auftrittstag' },
      { ref: 'story-danke', label: 'Danke-Story' },
    ],
  },
  { id: 'reel', label: 'Reel', kurz: 'Reel', wege: [{ ref: 'reel', label: 'Reel' }] },
  { id: 'text', label: 'Beitragstext', kurz: 'Text', wege: [{ ref: 'text', label: 'Link im Beitragstext' }] },
  {
    id: 'geteilt',
    label: 'Geteilte Links',
    kurz: 'Geteilt',
    wege: [
      { ref: 'geteilt', label: 'Konzertseite' },
      { ref: 'presse-geteilt', label: 'Pressekit' },
    ],
  },
];
/** alle Herkünfte einzeln (für die Zählung) */
export const WEGE: Weg[] = GRUPPEN.flatMap((g) => g.wege);
const SPRACHEN = [
  { pfad: '', label: 'DE' },
  { pfad: '/en', label: 'EN' },
  { pfad: '/nl', label: 'NL' },
];

type State = 'loading' | 'ok' | 'aus';
interface Zahl {
  label: string;
  count: number;
}
interface Block {
  label: string;
  summe: number;
  einzeln: Zahl[];
}

const block = (label: string, einzeln: Zahl[]): Block => ({ label, summe: einzeln.reduce((a, z) => a + z.count, 0), einzeln });

@Component({
  selector: 'app-konzert-kampagne',
  imports: [DecimalPipe, MatIconModule],
  template: `
    <section class="kampagne" aria-labelledby="kampagne-titel">
      <h3 id="kampagne-titel"><mat-icon>campaign</mat-icon> Kampagne „{{ name() }}“</h3>
      @switch (state()) {
        @case ('loading') { <p class="note">Zahlen werden geladen …</p> }
        @case ('aus') { <p class="note">Keine Zahlen – offline, Werbeblocker oder öffentlicher Zähler in GoatCounter nicht freigeschaltet (siehe Besucher).</p> }
        @default {
          <ul class="summen">
            @for (b of seiten(); track b.label) {
              <li>
                <span class="wert">{{ b.summe | number: '1.0-0' }}</span><span class="was">{{ b.label }}</span>
                <span class="einzeln">@for (z of b.einzeln; track z.label) { <span [class.null]="!z.count">{{ z.label }} {{ z.count | number: '1.0-0' }}</span> }</span>
              </li>
            }
            <li class="gesamt"><span class="wert">{{ werbung() | number: '1.0-0' }}</span><span class="was">über die Werbung insgesamt</span>
              <span class="einzeln">Summe aller Wege unten</span></li>
          </ul>
          <ul class="gruppen">
            @for (b of gruppen(); track b.label) {
              <li [class.null]="!b.summe">
                <span class="wert">{{ b.summe | number: '1.0-0' }}</span><span class="was">über {{ b.label }}</span>
                @if (b.einzeln.length > 1) {
                  <span class="einzeln">@for (z of b.einzeln; track z.label) { <span [class.null]="!z.count">{{ z.label }} {{ z.count | number: '1.0-0' }}</span> }</span>
                }
              </li>
            }
          </ul>
        }
      }
      <p class="foot">
        Letzte 12 Monate ·
        <a [href]="gc + '/campaigns'" target="_blank" rel="noopener">alle Kampagnen in GoatCounter</a>
      </p>
    </section>
  `,
})
export class KonzertKampagne {
  /** Auftritts-ID (Datum, ggf. mit laufender Nummer) */
  readonly id = input.required<string>();
  protected readonly gc = GC;
  protected readonly name = () => kampagne(this.id());
  protected readonly state = signal<State>('loading');
  /** Konzertseite und Pressekit: Summe und je Sprache */
  protected readonly seiten = signal<Block[]>([]);
  protected readonly gruppen = signal<Block[]>([]);
  protected readonly werbung = signal(0);

  constructor() {
    effect(() => {
      const id = this.id();
      this.state.set('loading');
      const jeSprache = (pfad: string) => Promise.all(SPRACHEN.map(async (l) => ({ label: l.label, count: await zaehler(`${l.pfad}/${pfad}/${id}`, 'year') })));
      Promise.all([
        jeSprache('konzerte'),
        jeSprache('presse'),
        Promise.all(GRUPPEN.map(async (g) => block(g.label, await Promise.all(g.wege.map(async (w) => ({ label: w.label, count: await zaehler(`kampagne-${kampagne(id)}-${w.ref}`, 'year') })))))),
      ])
        .then(([seite, presse, gruppen]) => {
          this.seiten.set([block('Aufrufe der Konzertseite', seite), block('Aufrufe des Pressekits (Veranstalter)', presse)]);
          this.gruppen.set(gruppen);
          this.werbung.set(gruppen.reduce((a, g) => a + g.summe, 0));
          this.state.set('ok');
        })
        .catch(() => this.state.set('aus'));
    });
  }
}
