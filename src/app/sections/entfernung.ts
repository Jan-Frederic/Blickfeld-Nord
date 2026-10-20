import { Component, computed, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RADIUS_KM, findOrt, suggest } from '../data/entfernung';

// Entfernungs-Check im Booking: Ort eingeben → Luftlinie von Hamminkeln und ob er im 50-km-Umkreis liegt (DE/EN/NL)
const T = {
  de: {
    title: 'Liegt euer Ort in unserem Umkreis?', label: 'Ort', placeholder: 'z. B. Bocholt oder Winterswijk',
    inside: (o: string, k: number) => `${o} liegt etwa ${k} km Luftlinie von Hamminkeln entfernt – das passt.`,
    home: (o: string) => `${o} – das ist quasi bei uns um die Ecke.`,
    outside: (o: string, k: number) => `${o} liegt etwa ${k} km Luftlinie entfernt, also außerhalb unseres Umkreises von ${RADIUS_KM} km. Fragt gern trotzdem an – vielleicht passt es ja.`,
    unknown: 'Diesen Ort kennen wir nicht – wählt einen Vorschlag aus der Liste oder fragt einfach an.',
    note: 'Luftlinie; die Fahrstrecke ist meist etwas länger. Ortsdaten: GeoNames (CC BY 4.0).',
  },
  en: {
    title: 'Is your venue within our area?', label: 'Town', placeholder: 'e.g. Bocholt or Winterswijk',
    inside: (o: string, k: number) => `${o} is about ${k} km from Hamminkeln as the crow flies – that works.`,
    home: (o: string) => `${o} – that's practically on our doorstep.`,
    outside: (o: string, k: number) => `${o} is about ${k} km away as the crow flies, outside our ${RADIUS_KM} km radius. Feel free to ask anyway – it might still work.`,
    unknown: "We don't know this town – pick a suggestion from the list or just send us a request.",
    note: 'Straight-line distance; the driving route is usually a bit longer. Place data: GeoNames (CC BY 4.0).',
  },
  nl: {
    title: 'Ligt jullie plaats binnen ons gebied?', label: 'Plaats', placeholder: 'bijv. Bocholt of Winterswijk',
    inside: (o: string, k: number) => `${o} ligt hemelsbreed ongeveer ${k} km van Hamminkeln – dat past.`,
    home: (o: string) => `${o} – dat is bij ons om de hoek.`,
    outside: (o: string, k: number) => `${o} ligt hemelsbreed ongeveer ${k} km weg, buiten onze straal van ${RADIUS_KM} km. Vraag het gerust toch – misschien past het.`,
    unknown: 'Deze plaats kennen we niet – kies een suggestie uit de lijst of vraag het gewoon aan.',
    note: 'Hemelsbrede afstand; de rijroute is meestal iets langer. Plaatsgegevens: GeoNames (CC BY 4.0).',
  },
};

@Component({
  selector: 'app-entfernung',
  imports: [MatIconModule],
  template: `
    <div class="box">
      <h3><mat-icon>near_me</mat-icon> {{ t().title }}</h3>
      <label>
        <span class="sr-only">{{ t().label }}</span>
        <input [value]="query()" (input)="query.set($any($event.target).value)" [placeholder]="t().placeholder"
               [attr.list]="listId" autocomplete="off" maxlength="60" [attr.aria-label]="t().label" />
        <datalist [id]="listId">
          @for (o of suggestions(); track o.name + o.country) { <option [value]="o.name">{{ o.country }} · {{ o.km }} km</option> }
        </datalist>
      </label>
      @if (result(); as r) {
        <p class="result" [class.ok]="r.ok" [class.out]="!r.ok" role="status">
          <mat-icon>{{ r.ok ? 'check_circle' : 'info' }}</mat-icon> {{ r.text }}
        </p>
      }
      <p class="note">{{ t().note }}</p>
    </div>
  `,
  styles: `
    :host { display: block; margin: 32px 0; }
    .box { padding: 20px 22px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    h3 {
      display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-family: var(--bn-display); font-weight: 400;
      font-size: 1.05rem; text-transform: uppercase; letter-spacing: .06em; line-height: 1.3;
    }
    h3 mat-icon { color: var(--bn-sunset); }
    input {
      width: 100%; max-width: 420px; box-sizing: border-box; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--bn-line);
      background: transparent; color: var(--bn-ink); font: 400 .95rem/1.4 Inter, sans-serif; color-scheme: dark;
    }
    input:focus { outline: none; border-color: var(--bn-sunset); }
    .result { display: flex; align-items: flex-start; gap: 8px; margin: 12px 0 0; line-height: 1.5; }
    .result mat-icon { font-size: 20px; width: 20px; height: 20px; margin-top: 1px; }
    .result.ok mat-icon { color: #5fb88a; }
    .result.out mat-icon { color: #e0b25a; }
    .note { margin: 10px 0 0; font-size: .78rem; color: var(--bn-fog); }
  `,
})
export class Entfernung {
  readonly lang = input<'de' | 'en' | 'nl'>('de');
  protected readonly t = computed(() => T[this.lang()]);
  protected readonly listId = 'orte-vorschlaege';
  protected readonly query = signal('');
  protected readonly suggestions = computed(() => suggest(this.query()));
  protected readonly result = computed(() => {
    const q = this.query().trim();
    if (q.length < 3) return null;
    const o = findOrt(q);
    // während des Tippens noch nicht „unbekannt“ melden, solange es passende Vorschläge gibt
    if (!o) return this.suggestions().length ? null : { ok: false, text: this.t().unknown };
    const t = this.t();
    if (o.km <= 5) return { ok: true, text: t.home(o.name) };
    return o.km <= RADIUS_KM ? { ok: true, text: t.inside(o.name, o.km) } : { ok: false, text: t.outside(o.name, o.km) };
  });
}
