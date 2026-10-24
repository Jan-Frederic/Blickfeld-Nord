import { Component, computed, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Availability } from './availability';
import { Anfrage } from './anfrage';
import { Angebot } from './angebot';
import { Entfernung } from './entfernung';
import { Referenzen } from './referenzen';
import { scrollToSection } from '../scroll';
import { I18n, LocPipe, tr } from '../i18n';

// Booking-Infos für Veranstalter. Kontakt läuft über Meta (Instagram/Facebook-Nachrichten) oder E-Mail.
// Gilt für /booking, /en/booking und /nl/booking (Sprache aus der Adresse). Angaben gleich halten mit der Technik-Seite.
const BOOKING_MAIL = 'Matthiaswigger@me.com';

const TEXT = tr(
  {
    kicker: 'Für Veranstalter',
    lead: 'Ihr plant ein Fest, eine private Feier oder einen Abend in eurer Kneipe und sucht eine Band, die für Stimmung sorgt? Dann seid ihr bei uns richtig – wir bringen alles mit, ihr bringt die Gäste.',
    facts: [
      { icon: 'celebration', label: 'Anlässe', value: 'Feste, private Feiern und Kneipen' },
      { icon: 'schedule', label: 'Spielzeit', value: '3 bis 4 Stunden – in Sets à 1 Stunde' },
      { icon: 'local_cafe', label: 'Pausen', value: 'Nach Absprache oder spontan, ganz wie es zur Stimmung passt' },
      { icon: 'speaker', label: 'Technik', value: 'Eigene PA und Licht bringen wir mit' },
    ],
    request: 'Anfragen',
    requestText: 'Schreibt uns, wie es euch am liebsten ist – wir melden uns schnellstmöglich zurück.',
    offer: 'Angebot anfragen',
    instagram: 'Nachricht über Instagram',
    facebook: 'Nachricht über Facebook',
    direct: 'oder direkt an',
    repertoireText: 'Pop, Rock, Schlager, Dance und Disco – live ausgeschmückt mit Fill-Ins, Jam-Sessions und spontanen Ideen. Stöbert in unserer Songliste oder hört direkt rein.',
    toRepertoire: 'Zum Repertoire',
    faq: 'Noch Fragen? Zu den häufigen Fragen von Veranstaltern',
    spotify: 'Playlist auf Spotify',
    subject: 'Booking-Anfrage Blickfeld Nord',
    body: `Hallo Blickfeld Nord,

wir möchten euch gerne buchen:

Datum:
Ort / Location:
Anlass (Fest, private Feier, Kneipe …):
Ungefähre Gästezahl:
Gewünschte Spielzeit (3–4 Stunden):
Ansprechpartner & Telefon:

Viele Grüße
`,
  },
  {
    kicker: 'For organisers',
    lead: 'Planning a festival, a private party or a night at your pub and looking for a band that gets everyone singing and dancing? Blickfeld Nord is a three-piece party and cover band from Hamminkeln on the Lower Rhine, Germany – just a short drive from the Dutch border. We bring the sound and the lights, you bring the guests.',
    facts: [
      { icon: 'celebration', label: 'Occasions', value: 'Festivals, private parties and pubs' },
      { icon: 'schedule', label: 'Playing time', value: '3 to 4 hours – in sets of 1 hour' },
      { icon: 'local_cafe', label: 'Breaks', value: 'As agreed or spontaneously, whatever suits the mood' },
      { icon: 'speaker', label: 'Equipment', value: 'We bring our own PA and lights' },
    ],
    request: 'Get in touch',
    requestText: 'Write to us however suits you best – we will get back to you as soon as possible.',
    offer: 'Request a quote',
    instagram: 'Message on Instagram',
    facebook: 'Message on Facebook',
    direct: 'or directly to',
    repertoireText: 'Pop, rock, German Schlager, dance and disco – played live with fills, jam sessions and spontaneous ideas. Browse our song list or have a listen.',
    toRepertoire: 'To the repertoire',
    faq: 'Any questions? See the frequently asked questions',
    spotify: 'Playlist on Spotify',
    subject: 'Booking request Blickfeld Nord',
    body: `Hello Blickfeld Nord,

we would like to book you:

Date:
Venue / location:
Occasion (festival, private party, pub …):
Approx. number of guests:
Preferred playing time (3–4 hours):
Contact person & phone:

Best regards
`,
  },
  {
    kicker: 'Voor organisatoren',
    lead: 'Organiseren jullie een feest, een privéfeest of een avond in jullie café en zoeken jullie een band die voor sfeer zorgt? Blickfeld Nord is een driekoppige party- en coverband uit Hamminkeln aan de Nederrijn (Duitsland) – op korte afstand van de Nederlandse grens. Wij nemen alles mee, jullie zorgen voor de gasten.',
    facts: [
      { icon: 'celebration', label: 'Gelegenheden', value: 'Feesten, privéfeesten en cafés' },
      { icon: 'schedule', label: 'Speelduur', value: '3 tot 4 uur – in sets van 1 uur' },
      { icon: 'local_cafe', label: 'Pauzes', value: 'In overleg of spontaan, precies zoals het bij de sfeer past' },
      { icon: 'speaker', label: 'Apparatuur', value: 'Eigen geluid (PA) en licht nemen we zelf mee' },
    ],
    request: 'Aanvragen',
    requestText: 'Schrijf ons zoals het jullie het beste uitkomt – we nemen zo snel mogelijk contact met jullie op.',
    offer: 'Offerte aanvragen',
    instagram: 'Bericht via Instagram',
    facebook: 'Bericht via Facebook',
    direct: 'of rechtstreeks naar',
    repertoireText: 'Pop, rock, schlagers, dance en disco – live aangekleed met fills, jamsessies en spontane ideeën. Snuffel in onze songlijst of luister meteen.',
    toRepertoire: 'Naar het repertoire',
    faq: 'Nog vragen? Bekijk de veelgestelde vragen',
    spotify: 'Playlist op Spotify',
    subject: 'Boekingsaanvraag Blickfeld Nord',
    body: `Hallo Blickfeld Nord,

we willen jullie graag boeken:

Datum:
Locatie:
Gelegenheid (feest, privéfeest, café …):
Aantal gasten (ca.):
Gewenste speelduur (3–4 uur):
Contactpersoon & telefoon:

Met vriendelijke groet
`,
  },
);

@Component({
  selector: 'app-booking',
  imports: [RouterLink, LocPipe, MatIconModule, Availability, Anfrage, Angebot, Entfernung, Referenzen],
  template: `
    <section class="section">
      <p class="kicker">{{ t().kicker }}</p>
      <h2>Booking</h2>
      <p class="lead">{{ t().lead }}</p>

      <ul class="facts">
        @for (f of t().facts; track f.icon) {
          <li>
            <mat-icon>{{ f.icon }}</mat-icon>
            <span class="label">{{ f.label }}</span>
            <span class="value">{{ f.value }}</span>
          </li>
        }
      </ul>

      <!-- Reihenfolge: was wir bieten → wo wir schon gespielt haben → kommen wir zu euch? → freie Tage → Anfrage → Kontakt; Fragen auf /faq -->
      <app-angebot />
      <app-referenzen />

      <app-entfernung />

      <!-- im Browser neu berechnet: welcher Monat und welche Tage vergangen sind, hängt vom Besuchstag ab -->
      <div id="verfuegbarkeit" class="anchor"><app-availability ngSkipHydration (pick)="request($event)" /></div>

      <div id="anfrage" class="anchor"><app-anfrage /></div>

      <div class="blocks">
        <div class="block">
          <h3>{{ t().request }}</h3>
          <p>{{ t().requestText }}</p>
          <div class="contacts">
            <a class="btn primary" [routerLink]="'/booking' | loc" fragment="anfrage" (click)="toForm($event)">
              <mat-icon>edit_note</mat-icon> {{ t().offer }}
            </a>
            <a class="btn" href="https://ig.me/m/blickfeldnord" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
                <circle cx="12" cy="12" r="4.3" />
                <circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" stroke="none" />
              </svg>
              {{ t().instagram }}
            </a>
            <a class="btn" href="https://www.facebook.com/share/1BBobZWfjG/" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <circle cx="12" cy="12" r="9.5" />
                <path d="M13.2 21.4V10.2c0-1.8 1-2.8 2.8-2.8h1.2" />
                <path d="M10 13h6.2" />
              </svg>
              {{ t().facebook }}
            </a>
          </div>
          <p class="mail">{{ t().direct }} <a [href]="mailto()">{{ mail }}</a></p>
        </div>

        <div class="block">
          <h3>Repertoire</h3>
          <p>{{ t().repertoireText }}</p>
          <div class="contacts">
          <a class="btn primary" [routerLink]="'/repertoire' | loc"><mat-icon>queue_music</mat-icon> {{ t().toRepertoire }}</a>
          <a class="btn" href="https://open.spotify.com/playlist/6O7apXN53rSGaWGhP8S8TW" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="9.5" />
              <path d="M7 9.3c3.6-1 7.4-.7 10.4.9M7.6 12.6c2.9-.8 5.9-.5 8.4.8M8.2 15.7c2.2-.6 4.4-.4 6.3.6" />
            </svg>
            {{ t().spotify }}
          </a>
          </div>
        </div>
      </div>

      <p class="faq-hinweis"><mat-icon>help</mat-icon> <a [routerLink]="'/faq' | loc">{{ t().faq }}</a></p>
    </section>
  `,
  styles: `
    .facts {
      list-style: none; padding: 0; margin: 0 0 32px;
      display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    }
    .facts li {
      display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto 1fr; column-gap: 14px; row-gap: 4px;
      align-items: start; align-content: start;
      padding: 18px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72);
    }
    .facts mat-icon { grid-row: span 2; color: var(--bn-sunset); margin-top: 2px; }
    .label {
      font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .16em; font-size: .7rem; color: var(--bn-fog);
    }
    .value { line-height: 1.5; }
    .faq-hinweis { display: flex; align-items: center; gap: 8px; margin: 28px 0 0; } .faq-hinweis mat-icon { color: var(--bn-sunset); } .faq-hinweis a { color: var(--bn-ink); }
    .blocks { margin-top: 32px; display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
    .block { padding: 24px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    h3 {
      font-family: var(--bn-display); font-weight: 400; font-size: 1.1rem; text-transform: uppercase;
      letter-spacing: .08em; margin: 0 0 10px;
    }
    .block p { line-height: 1.65; color: rgba(236, 233, 228, .84); margin: 0 0 16px; }
    .contacts { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
    .btn {
      display: inline-flex; align-items: center; gap: 10px; padding: 10px 18px; border-radius: 999px;
      border: 1px solid var(--bn-line); color: var(--bn-ink); text-decoration: none; font-weight: 500;
      transition: border-color .2s, color .2s, background .2s;
    }
    .btn:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .btn.primary { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    .btn.primary:hover { background: #f0b884; color: #2a1708; }
    .btn svg, .btn mat-icon { width: 20px; height: 20px; font-size: 20px; flex: none; }
    .anchor { scroll-margin-top: 72px; }
    .mail { margin: 14px 0 0 !important; font-size: .9rem; }
    .mail a { color: var(--bn-sunset); }
  `,
})
export class Booking {
  private readonly anfrage = viewChild.required(Anfrage);

  // Klick auf einen freien Tag im Kalender: Datum in die Anfrage übernehmen und dorthin scrollen
  protected request(isoDate: string): void {
    this.anfrage().setDate(isoDate);
    scrollToSection('anfrage');
  }

  protected toForm(event: Event): void {
    event.preventDefault();
    scrollToSection('anfrage');
  }

  protected readonly t = inject(I18n).t(TEXT);
  protected readonly mail = BOOKING_MAIL;
  protected readonly mailto = computed(
    () => `mailto:${BOOKING_MAIL}?subject=${encodeURIComponent(this.t().subject)}&body=${encodeURIComponent(this.t().body)}`,
  );
}
