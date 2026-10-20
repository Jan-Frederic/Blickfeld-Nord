import { Component, computed, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Ortsverzeichnis, RADIUS_KM } from '../data/entfernung';

// Entfernungs-Check im Booking: Ort eingeben → Luftlinie von Hamminkeln und ob er im 50-km-Umkreis liegt (DE/EN/NL)
const T = {
  de: {
    plz: 'PLZ',
    title: 'Liegt euer Ort in unserem Umkreis?', label: 'Ort oder Postleitzahl', placeholder: 'Ort oder PLZ, z. B. Bocholt oder 46399',
    inside: (o: string, k: number) => `${o} liegt etwa ${k} km Luftlinie von Hamminkeln entfernt – das passt.`,
    home: (o: string) => `${o} – das ist quasi bei uns um die Ecke.`,
    outside: (o: string, k: number) => `${o} liegt etwa ${k} km Luftlinie entfernt, also außerhalb unseres Umkreises von ${RADIUS_KM} km. Fragt gern trotzdem an – vielleicht passt es ja.`,
    far: (o: string, k: number) => `${o} – rund ${k} km Luftlinie. Das ist für uns schon ein Tagesausflug mit Proviant und Thermoskanne. Fragt gern an, vielleicht machen wir einen Ausflug draus!`,
    tour: (o: string, k: number) => `${o}? Rund ${k} km Luftlinie – das wäre keine Anfahrt mehr, das wäre eine Tournee. Mit Übernachtung und reichlich Kaffee reden wir trotzdem gern drüber.`,
    flight: (o: string, k: number) => `${o}? Etwa ${k} km Luftlinie – leider passt unser Schlagzeug nicht ins Handgepäck. Aber träumen darf man ja: Schreibt uns trotzdem!`,
    unknown: 'Den Ort finden nicht mal wir auf der Karte – und wir haben einen Kompass im Logo. Probiert es mit der Postleitzahl oder fragt einfach an.',
    note: 'Luftlinie; die Fahrstrecke ist meist etwas länger. Ortsdaten: GeoNames (CC BY 4.0), Ortsteile genähert.',
  },
  en: {
    plz: 'Postcode',
    title: 'Is your venue within our area?', label: 'Town or postcode', placeholder: 'Town or postcode, e.g. Winterswijk or 7101',
    inside: (o: string, k: number) => `${o} is about ${k} km from Hamminkeln as the crow flies – that works.`,
    home: (o: string) => `${o} – that's practically on our doorstep.`,
    outside: (o: string, k: number) => `${o} is about ${k} km away as the crow flies, outside our ${RADIUS_KM} km radius. Feel free to ask anyway – it might still work.`,
    far: (o: string, k: number) => `${o} – about ${k} km as the crow flies. For us that's a day trip with packed lunch and a thermos. Feel free to ask – maybe we'll make an excursion of it!`,
    tour: (o: string, k: number) => `${o}? About ${k} km as the crow flies – that's not a drive any more, that's a tour. With an overnight stay and plenty of coffee we're still happy to talk.`,
    flight: (o: string, k: number) => `${o}? Roughly ${k} km as the crow flies – sadly our drum kit doesn't fit in hand luggage. But a band can dream: write to us anyway!`,
    unknown: "Even we can't find that place on the map – and we've got a compass in our logo. Try the postcode or just send us a request.",
    note: 'Straight-line distance; the driving route is usually a bit longer. Place data: GeoNames (CC BY 4.0), districts approximated.',
  },
  nl: {
    plz: 'Postcode',
    title: 'Ligt jullie plaats binnen ons gebied?', label: 'Plaats of postcode', placeholder: 'Plaats of postcode, bijv. Winterswijk of 7101',
    inside: (o: string, k: number) => `${o} ligt hemelsbreed ongeveer ${k} km van Hamminkeln – dat past.`,
    home: (o: string) => `${o} – dat is bij ons om de hoek.`,
    outside: (o: string, k: number) => `${o} ligt hemelsbreed ongeveer ${k} km weg, buiten onze straal van ${RADIUS_KM} km. Vraag het gerust toch – misschien past het.`,
    far: (o: string, k: number) => `${o} – hemelsbreed zo'n ${k} km. Voor ons is dat al een dagje uit met boterhammen en thermoskan. Vraag het gerust, misschien maken we er een uitje van!`,
    tour: (o: string, k: number) => `${o}? Hemelsbreed zo'n ${k} km – dat is geen ritje meer, dat is een tournee. Met een overnachting en flink wat koffie praten we er toch graag over.`,
    flight: (o: string, k: number) => `${o}? Hemelsbreed ongeveer ${k} km – helaas past ons drumstel niet in de handbagage. Maar dromen mag: schrijf ons toch!`,
    unknown: 'Die plaats vinden zelfs wij niet op de kaart – en we hebben een kompas in ons logo. Probeer de postcode of vraag het gewoon aan.',
    note: 'Hemelsbrede afstand; de rijroute is meestal iets langer. Plaatsgegevens: GeoNames (CC BY 4.0), dorpskernen benaderd.',
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
        <input [value]="query()" (focus)="load()" (input)="query.set($any($event.target).value); load()" [placeholder]="t().placeholder"
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
  // Ortsverzeichnis wird erst beim ersten Antippen des Felds geladen (~30 KB)
  private readonly verzeichnis = signal<Ortsverzeichnis | null>(null);
  protected load(): void {
    if (!this.verzeichnis()) Ortsverzeichnis.load().then((v) => this.verzeichnis.set(v)).catch(() => undefined);
  }
  protected readonly suggestions = computed(() => this.verzeichnis()?.suggest(this.query()) ?? []);
  protected readonly result = computed(() => {
    const q = this.query().trim();
    const v = this.verzeichnis();
    if (q.length < 3 || !v) return null;
    const o = v.find(q);
    const digits = /^\d+/.test(q);
    // Postleitzahl: 4 Ziffern (NL) nur bei Treffer, sonst auf die 5. Ziffer (DE) warten
    if (!o && digits && q.replace(/\D/g, '').length < 5) return null;
    // Ortsname: während des Tippens noch nicht „unbekannt“ melden, solange es passende Vorschläge gibt
    if (!o) return !digits && this.suggestions().length ? null : { ok: false, text: this.t().unknown };
    const t = this.t();
    const name = o.plz ? `${t.plz} ${o.plz}` : o.name;
    // weit entfernt: grob runden, bei PLZ-Leitregionen ist die Entfernung ohnehin nur ungefähr
    const round = (k: number) => (k > 200 ? Math.round(k / 10) * 10 : k);
    if (o.km <= 5) return { ok: true, text: t.home(name) };
    if (o.km <= RADIUS_KM) return { ok: true, text: t.inside(name, o.km) };
    if (o.km <= 90) return { ok: false, text: t.outside(name, o.km) };
    if (o.km <= 250) return { ok: false, text: t.far(name, round(o.km)) };
    if (o.km <= 700) return { ok: false, text: t.tour(name, round(o.km)) };
    return { ok: false, text: t.flight(name, round(o.km)) };
  });
}
