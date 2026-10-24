import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BandService } from '../data/band.service';
import { jahresrueckblick } from '../data/jahresrueckblick';
import { PageMetaService } from '../page-meta';
import { I18n, LDatePipe, LocPipe, tr } from '../i18n';
import { Content } from '../content';

const TEXT = tr(
  {
    kicker: 'Jahresrückblick',
    title: (j: number) => `Unser Jahr ${j}`,
    lead: (j: number) => `${j} in Zahlen, Stationen und Momenten – danke an alle, die mit uns gefeiert, gesungen und getanzt haben!`,
    shows: 'Auftritte',
    public: 'davon öffentlich',
    places: 'verschiedene Orte',
    rehearsals: 'Proben',
    stations: 'Hier waren wir',
    highlights: 'Momente',
    songOfNight: 'Song des Abends:',
    more: 'Zum Rückblick',
    outlook: (j: number, n: number) => (n ? `${j} stehen schon ${n === 1 ? 'ein Konzert' : n + ' Konzerte'} fest – wir freuen uns auf euch!` : `Wir freuen uns auf ${j} – die nächsten Termine stehen bald fest.`),
    concerts: 'Alle Konzerte',
    booking: 'Auch bei euch? Zum Booking',
    metaTitle: (j: number) => `Unser Jahr ${j} – Blickfeld Nord`,
    metaDescription: (j: number, n: number) => `Der Jahresrückblick ${j} von Blickfeld Nord: ${n} Auftritte, Stationen und die schönsten Momente.`,
    fallback: 'Jahresrückblick – Blickfeld Nord',
  },
  {
    kicker: 'Year in review',
    title: (j: number) => `Our year ${j}`,
    lead: (j: number) => `${j} in numbers, stops and moments – thank you to everyone who celebrated, sang and danced with us!`,
    shows: 'Shows',
    public: 'of which public',
    places: 'different places',
    rehearsals: 'Rehearsals',
    stations: 'Where we played',
    highlights: 'Moments',
    songOfNight: 'Song of the night:',
    more: 'To the review',
    outlook: (j: number, n: number) => (n ? `${n === 1 ? 'One show is' : n + ' shows are'} already confirmed for ${j} – we look forward to seeing you!` : `We are looking forward to ${j} – the next dates will be announced soon.`),
    concerts: 'All shows',
    booking: 'At your place too? Booking',
    metaTitle: (j: number) => `Our year ${j} – Blickfeld Nord`,
    metaDescription: (j: number, n: number) => `Blickfeld Nord's year in review ${j}: ${n} shows, stops and the best moments.`,
    fallback: 'Year in review – Blickfeld Nord',
  },
  {
    kicker: 'Jaaroverzicht',
    title: (j: number) => `Ons jaar ${j}`,
    lead: (j: number) => `${j} in cijfers, plekken en momenten – bedankt aan iedereen die met ons heeft gefeest, gezongen en gedanst!`,
    shows: 'Optredens',
    public: 'waarvan openbaar',
    places: 'verschillende plekken',
    rehearsals: 'Repetities',
    stations: 'Hier speelden we',
    highlights: 'Momenten',
    songOfNight: 'Nummer van de avond:',
    more: 'Naar de terugblik',
    outlook: (j: number, n: number) => (n ? `Voor ${j} ${n === 1 ? 'staat al één optreden' : 'staan al ' + n + ' optredens'} vast – we kijken ernaar uit!` : `We kijken uit naar ${j} – de volgende data volgen binnenkort.`),
    concerts: 'Alle optredens',
    booking: 'Ook bij jullie? Naar boeken',
    metaTitle: (j: number) => `Ons jaar ${j} – Blickfeld Nord`,
    metaDescription: (j: number, n: number) => `Het jaaroverzicht ${j} van Blickfeld Nord: ${n} optredens, plekken en de mooiste momenten.`,
    fallback: 'Jaaroverzicht – Blickfeld Nord',
  },
);

// Öffentlicher Jahresrückblick /jahr/<Jahr> (Daten: data/jahresrueckblick.ts) – erscheint ab dem 15.12. des Jahres
@Component({
  selector: 'app-jahr',
  imports: [RouterLink, LocPipe, LDatePipe],
  template: `
    @if (r(); as r) {
      <section class="section jahr">
        <p class="kicker">{{ t().kicker }}</p>
        <h2>{{ t().title(r.jahr) }}</h2>
        <p class="lead">{{ t().lead(r.jahr) }}</p>

        <ul class="zahlen">
          <li><span class="wert">{{ r.auftritte }}</span><span class="was">{{ t().shows }}</span></li>
          <li><span class="wert">{{ r.oeffentlich }}</span><span class="was">{{ t().public }}</span></li>
          <li><span class="wert">{{ r.orte }}</span><span class="was">{{ t().places }}</span></li>
          @if (r.proben) {
            <li><span class="wert">{{ r.proben }}</span><span class="was">{{ t().rehearsals }}</span></li>
          }
        </ul>

        <h3>{{ t().stations }}</h3>
        <ol class="stationen">
          @for (s of r.stationen; track s.date + s.name) {
            <li>
              <time [attr.datetime]="s.date">{{ s.date | ldate: 'dayMonth' }}</time>
              @if (s.id) {
                <a [routerLink]="'/konzerte/' + s.id | loc">{{ content.t(s.name) }}</a>
              } @else {
                <span>{{ content.t(s.name) }}</span>
              }
              @if (s.city) { <span class="ort">{{ s.city }}</span> }
            </li>
          }
        </ol>

        @if (r.highlights.length) {
          <h3>{{ t().highlights }}</h3>
          <div class="momente">
            @for (h of r.highlights; track h.date) {
              <article>
                @if (h.images?.[0]; as img) {
                  <img [src]="img.src" [alt]="content.t(img.alt)" loading="lazy" decoding="async" />
                } @else {
                  <img class="ohne" src="kompass-440.webp" alt="" loading="lazy" decoding="async" />
                }
                <div class="text">
                  <time [attr.datetime]="h.date">{{ h.date | ldate: 'long' }}</time>
                  <h4>{{ content.t(h.title) }}</h4>
                  @if (h.highlight) { <p class="song">{{ t().songOfNight }} {{ h.highlight }}</p> }
                  <a [routerLink]="'/historie' | loc" [fragment]="'e-' + h.date">{{ t().more }} →</a>
                </div>
              </article>
            }
          </div>
        }

        <p class="ausblick">{{ t().outlook(r.jahr + 1, r.ausblick) }}</p>
        <p class="links">
          <a [routerLink]="'/' | loc" fragment="tour">{{ t().concerts }}</a>
          <a [routerLink]="'/booking' | loc">{{ t().booking }}</a>
        </p>
      </section>
    }
  `,
  styles: `
    .jahr { max-width: 1000px; }
    h3 { font-family: var(--bn-display); font-weight: 400; font-size: 1.1rem; text-transform: uppercase; letter-spacing: .08em; margin: 40px 0 14px; }
    .zahlen { list-style: none; margin: 24px 0 0; padding: 0; display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
    .zahlen li { display: flex; flex-direction: column; gap: 4px; padding: 18px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    .wert { font-family: var(--bn-display); font-size: 2rem; color: var(--bn-sunset); }
    .was { font-family: var(--bn-wide); font-size: .72rem; letter-spacing: .2em; text-transform: uppercase; color: var(--bn-fog); }
    .stationen { list-style: none; margin: 0; padding: 0; }
    .stationen li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 14px; padding: 10px 0; border-bottom: 1px solid var(--bn-line); }
    .stationen time { flex: 0 0 8.5em; font-variant-numeric: tabular-nums; color: var(--bn-sunset); }
    .stationen a { color: var(--bn-ink); }
    .ort { color: var(--bn-fog); font-size: .9rem; }
    .momente { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
    article { overflow: hidden; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    article img { display: block; width: 100%; aspect-ratio: 16 / 10; object-fit: cover; }
    article img.ohne { object-fit: contain; padding: 18px; box-sizing: border-box; opacity: .5; }
    .text { padding: 14px 16px 16px; }
    .text time { font-size: .8rem; color: var(--bn-fog); }
    h4 { margin: 4px 0 6px; font-size: 1rem; font-weight: 600; }
    .song { margin: 0 0 8px; font-size: .9rem; color: rgba(236, 233, 228, .86); }
    .text a, .links a { color: var(--bn-sunset); }
    .ausblick { margin: 40px 0 10px; font-size: 1.05rem; }
    .links { display: flex; flex-wrap: wrap; gap: 18px; margin: 0; }
  `,
})
export class JahrPage {
  /** Jahr aus der URL (/jahr/:jahr) */
  readonly jahr = input.required<string>();

  private readonly band = inject(BandService);
  private readonly i18n = inject(I18n);
  protected readonly content = inject(Content);
  protected readonly t = this.i18n.t(TEXT);
  private readonly heute = new Date().toISOString().slice(0, 10);
  protected readonly r = computed(() =>
    /^\d{4}$/.test(this.jahr())
      ? jahresrueckblick(+this.jahr(), this.heute, this.band.shows, this.band.rehearsals, this.band.history, (s) => this.band.showId(s))
      : undefined,
  );

  constructor() {
    const pageMeta = inject(PageMetaService);
    effect(() => {
      const r = this.r();
      const t = this.t();
      pageMeta.set({
        title: r ? t.metaTitle(r.jahr) : t.fallback,
        description: r ? t.metaDescription(r.jahr, r.auftritte) : undefined,
        path: this.i18n.link(`/jahr/${this.jahr()}`).slice(1),
      });
    });
  }
}
