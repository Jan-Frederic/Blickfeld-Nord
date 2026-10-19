import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

// „Wovon hängt das Angebot ab?“ – Orientierung zum Preis ohne konkrete Zahlen (die nennen wir nur im persönlichen Angebot)
const T = {
  de: {
    title: 'Wovon hängt das Angebot ab?',
    intro: 'Feste Preise gibt es bei uns nicht – jede Feier ist anders. Diese Punkte bestimmen, was ein Abend mit uns kostet:',
    items: [
      { icon: 'event', label: 'Datum & Wochentag', text: 'Wochenende oder unter der Woche, Jahreszeit und wie kurzfristig die Anfrage kommt.' },
      { icon: 'schedule', label: 'Spielzeit', text: '3 oder 4 Stunden – und ob ihr euch etwas Besonderes wünscht.' },
      { icon: 'directions_car', label: 'Anfahrt', text: 'Wie weit es von Hamminkeln aus zu euch ist.' },
      { icon: 'celebration', label: 'Anlass & Rahmen', text: 'Private Feier, Vereinsfest oder Kneipe, drinnen oder draußen, Zahl der Gäste.' },
    ],
    outro: 'Schickt uns eure Anfrage – ihr bekommt ein unverbindliches Angebot, das genau zu eurem Abend passt.',
  },
  en: {
    title: 'What does the price depend on?',
    intro: 'We don’t have fixed prices – every party is different. These points determine what an evening with us costs:',
    items: [
      { icon: 'event', label: 'Date & weekday', text: 'Weekend or weekday, season and how short-notice the request is.' },
      { icon: 'schedule', label: 'Playing time', text: '3 or 4 hours – and whether you have any special wishes.' },
      { icon: 'directions_car', label: 'Travel', text: 'How far it is from Hamminkeln to your venue.' },
      { icon: 'celebration', label: 'Occasion & setting', text: 'Private party, club festival or pub, indoors or outdoors, number of guests.' },
    ],
    outro: 'Send us your request – you will receive a non-binding quote tailored to your evening.',
  },
  nl: {
    title: 'Waar hangt de prijs van af?',
    intro: 'Vaste prijzen hebben we niet – elk feest is anders. Deze punten bepalen wat een avond met ons kost:',
    items: [
      { icon: 'event', label: 'Datum & weekdag', text: 'Weekend of doordeweeks, seizoen en hoe kort van tevoren de aanvraag komt.' },
      { icon: 'schedule', label: 'Speelduur', text: '3 of 4 uur – en of jullie speciale wensen hebben.' },
      { icon: 'directions_car', label: 'Reisafstand', text: 'Hoe ver het van Hamminkeln naar jullie locatie is.' },
      { icon: 'celebration', label: 'Gelegenheid & omgeving', text: 'Privéfeest, verenigingsfeest of café, binnen of buiten, aantal gasten.' },
    ],
    outro: 'Stuur ons jullie aanvraag – jullie krijgen een vrijblijvende offerte die precies bij jullie avond past.',
  },
};

@Component({
  selector: 'app-angebot',
  imports: [MatIconModule],
  template: `
    <h3>{{ t().title }}</h3>
    <p class="text">{{ t().intro }}</p>
    <ul>
      @for (i of t().items; track i.label) {
        <li><mat-icon>{{ i.icon }}</mat-icon><strong>{{ i.label }}</strong><span>{{ i.text }}</span></li>
      }
    </ul>
    <p class="text">{{ t().outro }}</p>
  `,
  styles: `
    :host { display: block; margin: 32px 0; }
    h3 { font-family: var(--bn-display); font-weight: 400; font-size: 1.1rem; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 10px; }
    .text { max-width: 760px; line-height: 1.7; color: rgba(236, 233, 228, .86); margin: 0 0 16px; }
    ul { list-style: none; padding: 0; margin: 0 0 16px; display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    li { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; padding: 16px 18px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    mat-icon { grid-row: span 2; color: var(--bn-sunset); }
    strong { font-family: var(--bn-wide); font-weight: 400; font-size: .72rem; text-transform: uppercase; letter-spacing: .14em; color: var(--bn-fog); }
    span { line-height: 1.5; font-size: .92rem; }
  `,
})
export class Angebot {
  /** Sprache der Seite */
  readonly lang = input<'de' | 'en' | 'nl'>('de');
  protected readonly t = computed(() => T[this.lang()]);
}
