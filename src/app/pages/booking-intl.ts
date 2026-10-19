import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Anfrage } from '../sections/anfrage';

// Fremdsprachige Kurzfassungen der Booking-Seite (/booking/en, /booking/nl) – z. B. für Veranstalter aus den
// Niederlanden. Die Sprache kommt aus der Route (data: { lang }). Angaben gleich halten mit
// src/app/sections/booking.ts und der Technik-Seite.
const MAIL = 'Matthiaswigger@me.com';

type Lang = 'en' | 'nl';

const TEXT = {
  en: {
    kicker: 'For organisers',
    lead: 'Planning a festival, a private party or a night at your pub and looking for a band that gets everyone singing and dancing? Blickfeld Nord is a three-piece party and cover band from Hamminkeln on the Lower Rhine, Germany – just a short drive from the Dutch border. We bring the sound and the lights, you bring the guests.',
    facts: [
      { icon: 'celebration', label: 'Occasions', value: 'Festivals, private parties and pubs' },
      { icon: 'schedule', label: 'Playing time', value: '3 to 4 hours, in sets of 1 hour – breaks as agreed' },
      { icon: 'speaker', label: 'Equipment', value: 'We bring our own PA and lights' },
      { icon: 'straighten', label: 'Space & power', value: 'Approx. 4 × 3 m stage area, 2 power sockets nearby' },
      { icon: 'build', label: 'Set-up', value: 'Approx. 3 hours before the show, tear-down approx. 1 hour' },
      { icon: 'place', label: 'Travel', value: 'Up to 50 km around Hamminkeln – including the Dutch border region' },
      { icon: 'event_available', label: 'Lead time', value: 'Please book at least 4 weeks in advance' },
    ],
    music: 'Music',
    musicText: 'Pop, rock, German Schlager, dance and disco – sing-along classics in English and German, played live with fills, jams and spontaneous ideas, so no two shows are the same. Have a look at our',
    songList: 'song list',
    songListNote: '(in German, but the song titles speak for themselves).',
    contact: 'Get in touch',
    contactText: 'Send us your date and location – we will get back to you as soon as possible.',
    otherWays: 'Prefer to write directly? That works too:',
    mailButton: 'Booking request by e-mail',
    instagram: 'Message on Instagram',
    rider: 'Tech rider (PDF, German)',
    direct: 'or directly to',
    subject: 'Booking request Blickfeld Nord',
    body: 'Hello Blickfeld Nord,\n\nwe would like to book you:\n\nDate:\nVenue / location:\nOccasion (festival, private party, pub …):\nApprox. number of guests:\nContact person & phone:\n\nBest regards\n',
  },
  nl: {
    kicker: 'Voor organisatoren',
    lead: 'Organiseer je een feest, een privéfeest of een avond in je café en zoek je een band die iedereen laat meezingen en dansen? Blickfeld Nord is een driekoppige party- en coverband uit Hamminkeln aan de Nederrijn (Duitsland) – op korte afstand van de Nederlandse grens. Wij zorgen voor geluid en licht, jullie voor de gasten.',
    facts: [
      { icon: 'celebration', label: 'Gelegenheden', value: 'Feesten, privéfeesten en cafés' },
      { icon: 'schedule', label: 'Speelduur', value: '3 tot 4 uur, in sets van 1 uur – pauzes in overleg' },
      { icon: 'speaker', label: 'Apparatuur', value: 'Eigen geluid (PA) en licht nemen we zelf mee' },
      { icon: 'straighten', label: 'Ruimte & stroom', value: 'Ca. 4 × 3 m speelvlak, 2 stopcontacten in de buurt' },
      { icon: 'build', label: 'Opbouw', value: 'Ca. 3 uur voor aanvang, afbouw ca. 1 uur' },
      { icon: 'place', label: 'Afstand', value: 'Tot 50 km rond Hamminkeln – inclusief de Nederlandse grensregio' },
      { icon: 'event_available', label: 'Op tijd boeken', value: 'Graag minimaal 4 weken van tevoren' },
    ],
    music: 'Muziek',
    musicText: 'Pop, rock, Duitse schlagers, dance en disco – meezingers in het Engels en Duits, live aangekleed met fills, jams en spontane ideeën, dus geen optreden is hetzelfde. Bekijk onze',
    songList: 'songlijst',
    songListNote: '(in het Duits, maar de titels spreken voor zich).',
    contact: 'Contact',
    contactText: 'Stuur ons jullie datum en locatie – we nemen zo snel mogelijk contact met jullie op.',
    otherWays: 'Liever direct schrijven? Dat kan ook:',
    mailButton: 'Boekingsaanvraag per e-mail',
    instagram: 'Bericht via Instagram',
    rider: 'Techniek-rider (pdf, Duits)',
    direct: 'of rechtstreeks naar',
    subject: 'Boekingsaanvraag Blickfeld Nord',
    body: 'Hallo Blickfeld Nord,\n\nwe willen jullie graag boeken:\n\nDatum:\nLocatie:\nGelegenheid (feest, privéfeest, café …):\nAantal gasten (ca.):\nContactpersoon & telefoon:\n\nMet vriendelijke groet\n',
  },
} satisfies Record<Lang, unknown>;

// Sprachumschalter: jeweils die anderen Fassungen
const SWITCH: { lang: Lang | 'de'; link: string; label: string }[] = [
  { lang: 'de', link: '/booking', label: 'Deutsche Version mit Kalender und FAQ' },
  { lang: 'en', link: '/booking/en', label: 'English version' },
  { lang: 'nl', link: '/booking/nl', label: 'Nederlandse versie' },
];

@Component({
  selector: 'app-booking-intl',
  imports: [RouterLink, MatIconModule, Anfrage],
  template: `
    <section class="section" [attr.lang]="lang()">
      <p class="kicker">{{ t().kicker }}</p>
      <h2>Booking</h2>
      <p class="lead">{{ t().lead }}</p>
      <p class="lang">
        @for (s of others(); track s.lang) {
          <a [routerLink]="s.link" [attr.lang]="s.lang" [attr.hreflang]="s.lang"><mat-icon>translate</mat-icon> {{ s.label }}</a>
        }
      </p>

      <ul class="facts">
        @for (f of t().facts; track f.label) {
          <li>
            <mat-icon>{{ f.icon }}</mat-icon>
            <span class="label">{{ f.label }}</span>
            <span class="value">{{ f.value }}</span>
          </li>
        }
      </ul>

      <h3>{{ t().music }}</h3>
      <p class="text">{{ t().musicText }} <a routerLink="/repertoire">{{ t().songList }}</a> {{ t().songListNote }}</p>

      <h3>{{ t().contact }}</h3>
      <p class="text">{{ t().contactText }}</p>
      <app-anfrage [lang]="lang()" />
      <p class="text other">{{ t().otherWays }}</p>
      <div class="contacts">
        <a class="btn" [href]="mailto()"><mat-icon>mail</mat-icon> {{ t().mailButton }}</a>
        <a class="btn" href="https://ig.me/m/blickfeldnord" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
            <circle cx="12" cy="12" r="4.3" />
            <circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" stroke="none" />
          </svg>
          {{ t().instagram }}
        </a>
        <a class="btn" href="presse/blickfeld-nord-technik-rider.pdf" download><mat-icon>description</mat-icon> {{ t().rider }}</a>
      </div>
      <p class="mail">{{ t().direct }} <a [href]="mailto()">{{ mail }}</a></p>
    </section>
  `,
  styles: `
    .lang { display: flex; flex-wrap: wrap; gap: 6px 20px; margin: -12px 0 28px; }
    .lang a { display: inline-flex; align-items: center; gap: 6px; color: var(--bn-fog); font-size: .9rem; text-decoration: none; }
    .lang a:hover { color: var(--bn-sunset); }
    .lang mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .facts { list-style: none; padding: 0; margin: 0 0 8px; display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
    .facts li {
      display: grid; grid-template-columns: auto 1fr; column-gap: 12px; align-items: center;
      padding: 16px 18px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72);
    }
    .facts mat-icon { grid-row: span 2; color: var(--bn-sunset); }
    .label { font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .14em; font-size: .68rem; color: var(--bn-fog); }
    .value { line-height: 1.5; }
    h3 { font-family: var(--bn-display); font-weight: 400; font-size: 1.1rem; text-transform: uppercase; letter-spacing: .08em; margin: 36px 0 10px; }
    .text { max-width: 760px; line-height: 1.7; color: rgba(236, 233, 228, .86); margin: 0 0 16px; }
    .text a, .mail a { color: var(--bn-sunset); }
    .text.other { margin-top: 28px; }
    .contacts { display: flex; flex-wrap: wrap; gap: 12px; }
    .btn {
      display: inline-flex; align-items: center; gap: 10px; padding: 10px 18px; border-radius: 999px;
      border: 1px solid var(--bn-line); color: var(--bn-ink); text-decoration: none; font-weight: 500;
    }
    .btn:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .btn.primary { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    .btn.primary:hover { background: #f0b884; color: #2a1708; }
    .btn svg, .btn mat-icon { width: 20px; height: 20px; font-size: 20px; flex: none; }
    .mail { margin: 16px 0 0; color: var(--bn-fog); font-size: .9rem; }
  `,
})
export class BookingIntl {
  /** Sprache aus der Route (data: { lang }) */
  readonly lang = input<Lang>('en');
  protected readonly t = computed(() => TEXT[this.lang()]);
  protected readonly others = computed(() => SWITCH.filter((s) => s.lang !== this.lang()));
  protected readonly mail = MAIL;
  protected readonly mailto = computed(
    () => `mailto:${MAIL}?subject=${encodeURIComponent(this.t().subject)}&body=${encodeURIComponent(this.t().body)}`,
  );
}
