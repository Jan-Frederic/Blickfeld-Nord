import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TechnikAufbau } from '../sections/technik-aufbau';
import { I18n, LocPipe, tr } from '../i18n';

const TEXT = tr(
  {
    kicker: 'Für Veranstalter',
    title: 'Technik',
    lead: 'Ihr kümmert euch um die Gäste, wir um den Sound: PA, Licht und Instrumente bringen wir selbst mit. Von euch brauchen wir nur ein bisschen Platz und Strom – hier sind alle Details auf einen Blick.',
    rider: 'Technik-Rider (PDF)',
    bring: 'Was wir mitbringen',
    cards: [
      { icon: 'speaker', title: 'PA', items: ['Lautsprecher (Tops) und Subwoofer', 'Mischpult', 'Drei Gesangsmikrofone und Drum-Mikrofone', 'Monitorboxen'] },
      { icon: 'lightbulb', title: 'Licht', items: ['PAR-Scheinwerfer', 'Lichtstativ bzw. Lichtbrücke', 'Lichtsteuerung', 'Nebelmaschine'] },
      { icon: 'queue_music', title: 'Instrumente', items: ['Akustikgitarre', 'E-Bass mit Verstärker', 'Schlagzeug', 'Kabel, Ständer und Mehrfachsteckdosen'] },
    ],
    need: 'Was wir von euch brauchen',
    area: 'Spielfläche',
    areaValue: 'ca. 4 × 3 Meter',
    power: 'Strom',
    powerValue: '2 Steckdosen in der Nähe der Spielfläche',
    schedule: 'Zeitplan',
    timeline: [
      { time: 'ca. 3 Std. vorher', text: 'Ankunft und Aufbau' },
      { time: '3 bis 4 Std.', text: 'Spielzeit in Sets à 1 Stunde – Pausen nach Absprache oder spontan' },
      { time: 'ca. 1 Std.', text: 'Abbau nach dem letzten Song' },
    ],
    setup: 'Technischer Aufbau',
    question: 'Noch Fragen zur Technik oder besondere Gegebenheiten vor Ort? Meldet euch gern über die',
    bookingLink: 'Booking-Seite',
    questionEnd: ' – wir finden eine Lösung.',
  },
  {
    kicker: 'For organisers',
    title: 'Technical info',
    lead: 'You take care of the guests, we take care of the sound: we bring our own PA, lights and instruments. All we need from you is a little space and power – here are all the details at a glance.',
    rider: 'Tech rider (PDF)',
    bring: 'What we bring',
    cards: [
      { icon: 'speaker', title: 'PA', items: ['Speakers (tops) and subwoofer', 'Mixing desk', 'Three vocal mics and drum mics', 'Monitor speakers'] },
      { icon: 'lightbulb', title: 'Lights', items: ['PAR lights', 'Lighting stand or truss', 'Lighting control', 'Fog machine'] },
      { icon: 'queue_music', title: 'Instruments', items: ['Acoustic guitar', 'Electric bass with amp', 'Drum kit', 'Cables, stands and power strips'] },
    ],
    need: 'What we need from you',
    area: 'Stage area',
    areaValue: 'approx. 4 × 3 metres',
    power: 'Power',
    powerValue: '2 power sockets near the stage area',
    schedule: 'Schedule',
    timeline: [
      { time: 'approx. 3 hrs before', text: 'Arrival and set-up' },
      { time: '3 to 4 hrs', text: 'Playing time in sets of 1 hour – breaks as agreed or spontaneously' },
      { time: 'approx. 1 hr', text: 'Tear-down after the last song' },
    ],
    setup: 'Technical set-up',
    question: 'Any questions about the technical side or special conditions at your venue? Just get in touch via the',
    bookingLink: 'booking page',
    questionEnd: ' – we will find a solution.',
  },
  {
    kicker: 'Voor organisatoren',
    title: 'Techniek',
    lead: 'Jullie zorgen voor de gasten, wij voor het geluid: geluid (PA), licht en instrumenten nemen we zelf mee. Van jullie hebben we alleen wat ruimte en stroom nodig – hier staan alle details op een rij.',
    rider: 'Techniek-rider (pdf)',
    bring: 'Wat we meenemen',
    cards: [
      { icon: 'speaker', title: 'PA', items: ['Speakers (tops) en subwoofer', 'Mengpaneel', "Drie zangmicrofoons en drummicrofoons", 'Monitorspeakers'] },
      { icon: 'lightbulb', title: 'Licht', items: ['PAR-spots', 'Lichtstatief of lichtbrug', 'Lichtsturing', 'Rookmachine'] },
      { icon: 'queue_music', title: 'Instrumenten', items: ['Akoestische gitaar', 'Elektrische bas met versterker', 'Drumstel', 'Kabels, statieven en stekkerdozen'] },
    ],
    need: 'Wat we van jullie nodig hebben',
    area: 'Speelvlak',
    areaValue: 'ca. 4 × 3 meter',
    power: 'Stroom',
    powerValue: '2 stopcontacten in de buurt van het speelvlak',
    schedule: 'Tijdschema',
    timeline: [
      { time: 'ca. 3 uur vooraf', text: 'Aankomst en opbouw' },
      { time: '3 tot 4 uur', text: 'Speeltijd in sets van 1 uur – pauzes in overleg of spontaan' },
      { time: 'ca. 1 uur', text: 'Afbouw na het laatste nummer' },
    ],
    setup: 'Technische opbouw',
    question: 'Nog vragen over de techniek of bijzondere omstandigheden ter plaatse? Neem gerust contact op via de',
    bookingLink: 'boekingspagina',
    questionEnd: ' – we vinden een oplossing.',
  },
);

// Technik-Seite für Veranstalter – im Footer, in den Booking-FAQ und über die Link-Leiste von Booking/Pressekit verlinkt.
// Angaben bitte gleich halten mit dem Technik-Rider (scripts/build-rider.py) und den FAQ (src/app/data/faq.ts, alle drei Sprachen).
@Component({
  selector: 'app-technik',
  imports: [RouterLink, MatIconModule, TechnikAufbau, LocPipe],
  template: `
    <section class="section">
      <p class="kicker">{{ t().kicker }}</p>
      <h2>{{ t().title }}</h2>
      <p class="lead">{{ t().lead }}</p>

      <div class="downloads">
        <a class="btn primary" [href]="'presse/blickfeld-nord-technik-rider' + sfx() + '.pdf'" download>
          <mat-icon>description</mat-icon> {{ t().rider }}
        </a>
      </div>

      <h3>{{ t().bring }}</h3>
      <div class="cards">
        @for (c of t().cards; track c.icon) {
          <div class="card">
            <mat-icon>{{ c.icon }}</mat-icon>
            <h4>{{ c.title }}</h4>
            <ul>
              @for (i of c.items; track i) {
                <li>{{ i }}</li>
              }
            </ul>
          </div>
        }
      </div>

      <h3>{{ t().need }}</h3>
      <ul class="facts">
        <li>
          <mat-icon>straighten</mat-icon>
          <span class="label">{{ t().area }}</span>
          <span class="value">{{ t().areaValue }}</span>
        </li>
        <li>
          <mat-icon>power</mat-icon>
          <span class="label">{{ t().power }}</span>
          <span class="value">{{ t().powerValue }}</span>
        </li>
      </ul>

      <h3>{{ t().schedule }}</h3>
      <ol class="timeline">
        @for (s of t().timeline; track s.time) {
          <li><span class="time">{{ s.time }}</span><span>{{ s.text }}</span></li>
        }
      </ol>

      <h3 id="aufbau">{{ t().setup }}</h3>
      <app-technik-aufbau />

      <p class="note">
        <mat-icon>info</mat-icon>
        <span>
          {{ t().question }}
          <a [routerLink]="'/booking' | loc">{{ t().bookingLink }}</a>{{ t().questionEnd }}
        </span>
      </p>
    </section>
  `,
  styles: `
    h3 {
      font-family: var(--bn-display); font-weight: 400; font-size: 1.1rem; text-transform: uppercase;
      letter-spacing: .08em; margin: 40px 0 16px;
    }
    .downloads { display: flex; flex-wrap: wrap; gap: 12px; }
    .btn {
      display: inline-flex; align-items: center; gap: 10px; padding: 10px 18px; border-radius: 999px;
      border: 1px solid var(--bn-line); color: var(--bn-ink); text-decoration: none; font-weight: 500;
      transition: border-color .2s, color .2s, background .2s;
    }
    .btn:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .btn.primary { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    .btn.primary:hover { background: #f0b884; color: #2a1708; }
    .btn mat-icon { width: 20px; height: 20px; font-size: 20px; flex: none; }
    .cards { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
    .card { padding: 20px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    .card mat-icon { color: var(--bn-sunset); }
    h4 { margin: 10px 0 10px; font-family: var(--bn-wide); font-weight: 400; font-size: .8rem; text-transform: uppercase; letter-spacing: .14em; }
    .card ul { margin: 0; padding-left: 18px; line-height: 1.7; color: rgba(236, 233, 228, .86); }
    .facts { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
    .facts li {
      display: grid; grid-template-columns: auto 1fr; column-gap: 12px; align-items: center;
      padding: 16px 18px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72);
    }
    .facts mat-icon { grid-row: span 2; color: var(--bn-sunset); }
    .label { font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .14em; font-size: .68rem; color: var(--bn-fog); }
    .value { line-height: 1.5; }
    .timeline { list-style: none; padding: 0; margin: 0; border-left: 1px solid var(--bn-line); }
    .timeline li { position: relative; display: flex; flex-wrap: wrap; gap: 4px 16px; padding: 0 0 18px 22px; line-height: 1.55; }
    .timeline li::before {
      content: ''; position: absolute; left: -5px; top: 7px; width: 9px; height: 9px; border-radius: 50%; background: var(--bn-sunset);
    }
    .time { min-width: 140px; font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .12em; font-size: .72rem; color: var(--bn-sunset); padding-top: 3px; }
    .note {
      display: flex; gap: 10px; align-items: flex-start; margin: 32px 0 0; padding: 14px 16px; border-radius: 10px;
      background: rgba(232, 164, 106, .08); border: 1px solid rgba(232, 164, 106, .3); line-height: 1.55; color: rgba(236, 233, 228, .86);
    }
    .note mat-icon { flex: none; color: var(--bn-sunset); }
    .note a { color: var(--bn-sunset); }
  `,
})
export class Technik {
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t(TEXT);
  // Technik-Rider je Sprache (scripts/build-rider.py): Deutsch ohne Zusatz, sonst -en / -nl
  protected readonly sfx = computed(() => (this.i18n.lang() === 'de' ? '' : '-' + this.i18n.lang()));
}
