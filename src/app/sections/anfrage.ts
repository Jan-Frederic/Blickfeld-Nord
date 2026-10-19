import { Component, computed, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';

// „Angebot anfragen“ in drei Schritten (Termin → Anlass → Kontakt), auf Deutsch, Englisch und Niederländisch.
// Die Seite ist statisch, daher entsteht am Ende eine vollständig ausgefüllte E-Mail im Mailprogramm –
// in der Sprache der Seite und mit allem, was wir sonst nachfragen müssten.
const MAIL = 'Matthiaswigger@me.com';

export type AnfrageLang = 'de' | 'en' | 'nl';

const T = {
  de: {
    title: 'Angebot anfragen', steps: ['Termin', 'Anlass', 'Kontakt'],
    date: 'Datum', start: 'Beginn (ungefähr)', place: 'Ort / Location', placeHint: 'z. B. Festzelt am Sportplatz, Hamminkeln',
    booked: 'An diesem Tag sind wir leider schon gebucht – fragt gern trotzdem oder wählt einen anderen Termin.',
    option: 'An diesem Tag sind wir schon reserviert – fragt gern trotzdem oder wählt einen anderen Termin.',
    soon: 'Ziemlich kurzfristig – wir versuchen es trotzdem möglich zu machen.',
    occasion: 'Anlass', occasions: ['Geburtstag', 'Hochzeit', 'Firmenfeier', 'Stadt- / Dorffest', 'Vereinsfest', 'Kneipe / Gastro', 'Sonstiges'],
    guests: 'Ungefähre Gästezahl', venue: 'Drinnen oder draußen?', venues: ['drinnen', 'draußen', 'beides möglich', 'noch offen'],
    length: 'Spielzeit', lengths: ['3 Stunden', '4 Stunden', 'noch offen'],
    power: '2 Steckdosen vorhanden?', powers: ['ja', 'nein', 'weiß ich nicht'],
    name: 'Name', phone: 'Telefon', email: 'E-Mail', message: 'Noch etwas?', messageHint: 'Wünsche, Ablauf, Fragen …',
    reach: 'Telefon oder E-Mail reicht – Hauptsache, wir können euch erreichen.', preview: 'Vorschau der Anfrage',
    back: 'Zurück', next: 'Weiter', send: 'E-Mail erstellen',
    hello: 'Hallo Blickfeld Nord,', intro: 'wir möchten euch gerne buchen:', startAt: 'Beginn ca.', clock: ' Uhr', approx: 'ca.',
    guestsMail: 'Gäste', venueMail: 'Drinnen / draußen', powerMail: '2 Steckdosen vorhanden', regards: 'Viele Grüße',
    subject: (a: string, d: string) => `Booking-Anfrage: ${a} am ${d}`,
    formatDate: (d: string) => d.split('-').reverse().join('.'),
  },
  en: {
    title: 'Request a quote', steps: ['Date', 'Occasion', 'Contact'],
    date: 'Date', start: 'Start (approx.)', place: 'Venue / location', placeHint: 'e.g. marquee at the sports ground, Winterswijk',
    booked: 'Sorry, we are already booked on this day – feel free to ask anyway or pick another date.',
    option: 'This day is already reserved – feel free to ask anyway or pick another date.',
    soon: 'That is quite short notice – we will still try to make it happen.',
    occasion: 'Occasion', occasions: ['Birthday', 'Wedding', 'Company party', 'Town / village festival', 'Club party', 'Pub / bar', 'Other'],
    guests: 'Approx. number of guests', venue: 'Indoors or outdoors?', venues: ['indoors', 'outdoors', 'either', 'not decided yet'],
    length: 'Playing time', lengths: ['3 hours', '4 hours', 'not decided yet'],
    power: '2 power sockets available?', powers: ['yes', 'no', "don't know"],
    name: 'Name', phone: 'Phone', email: 'E-mail', message: 'Anything else?', messageHint: 'Wishes, schedule, questions …',
    reach: 'Phone or e-mail is enough – as long as we can reach you.', preview: 'Preview of your request',
    back: 'Back', next: 'Next', send: 'Create e-mail',
    hello: 'Hello Blickfeld Nord,', intro: 'we would like to book you:', startAt: 'start approx.', clock: '', approx: 'approx.',
    guestsMail: 'Guests', venueMail: 'Indoors / outdoors', powerMail: '2 power sockets available', regards: 'Best regards',
    subject: (a: string, d: string) => `Booking request: ${a} on ${d}`,
    formatDate: (d: string) => d.split('-').reverse().join('/'),
  },
  nl: {
    title: 'Offerte aanvragen', steps: ['Datum', 'Gelegenheid', 'Contact'],
    date: 'Datum', start: 'Aanvang (ongeveer)', place: 'Plaats / locatie', placeHint: 'bijv. feesttent bij het sportpark, Winterswijk',
    booked: 'Op deze dag zijn we helaas al geboekt – vraag het gerust toch of kies een andere datum.',
    option: 'Deze dag is al gereserveerd – vraag het gerust toch of kies een andere datum.',
    soon: 'Dat is vrij kort dag – we proberen het toch mogelijk te maken.',
    occasion: 'Gelegenheid', occasions: ['Verjaardag', 'Bruiloft', 'Bedrijfsfeest', 'Dorps- / stadsfeest', 'Verenigingsfeest', 'Café / horeca', 'Anders'],
    guests: 'Aantal gasten (ca.)', venue: 'Binnen of buiten?', venues: ['binnen', 'buiten', 'allebei mogelijk', 'nog niet bekend'],
    length: 'Speelduur', lengths: ['3 uur', '4 uur', 'nog niet bekend'],
    power: '2 stopcontacten aanwezig?', powers: ['ja', 'nee', 'weet ik niet'],
    name: 'Naam', phone: 'Telefoon', email: 'E-mail', message: 'Nog iets?', messageHint: 'Wensen, programma, vragen …',
    reach: 'Telefoon of e-mail is genoeg – als we jullie maar kunnen bereiken.', preview: 'Voorbeeld van de aanvraag',
    back: 'Terug', next: 'Verder', send: 'E-mail maken',
    hello: 'Hallo Blickfeld Nord,', intro: 'we willen jullie graag boeken:', startAt: 'aanvang ca.', clock: ' uur', approx: 'ca.',
    guestsMail: 'Gasten', venueMail: 'Binnen / buiten', powerMail: '2 stopcontacten aanwezig', regards: 'Met vriendelijke groet',
    subject: (a: string, d: string) => `Boekingsaanvraag: ${a} op ${d}`,
    formatDate: (d: string) => d.split('-').reverse().join('-'),
  },
};

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

@Component({
  selector: 'app-anfrage',
  imports: [MatIconModule],
  template: `
    <form class="wizard" (submit)="send($event)" aria-labelledby="anfrage-title">
      <div class="top">
        <h3 id="anfrage-title">{{ t().title }}</h3>
        <ol class="steps">
          @for (s of t().steps; track s; let i = $index) {
            <li [class.active]="step() === i" [class.done]="step() > i"><span>{{ i + 1 }}</span> {{ s }}</li>
          }
        </ol>
      </div>

      @switch (step()) {
        @case (0) {
          <div class="grid">
            <label>{{ t().date }} *<input type="date" [min]="today" [value]="date()" (input)="date.set(v($event))" required /></label>
            <label>{{ t().start }}<input type="time" [value]="time()" (input)="time.set(v($event))" /></label>
            <label class="wide">{{ t().place }} *<input [value]="place()" (input)="place.set(v($event))" [placeholder]="t().placeHint" maxlength="120" /></label>
          </div>
          @if (busy(); as b) {
            <p class="note warn"><mat-icon>event_busy</mat-icon> {{ b === 'booked' ? t().booked : t().option }}</p>
          } @else if (soon()) {
            <p class="note"><mat-icon>schedule</mat-icon> {{ t().soon }}</p>
          }
        }
        @case (1) {
          <p class="label">{{ t().occasion }} *</p>
          <div class="chips">
            @for (a of t().occasions; track a; let i = $index) {
              <button type="button" [class.on]="anlass() === i" (click)="anlass.set(i)">{{ a }}</button>
            }
          </div>
          <div class="grid">
            <label>{{ t().guests }} *<input type="number" min="1" max="5000" [value]="gaeste()" (input)="gaeste.set(v($event))" /></label>
            <label>{{ t().venue }}
              <select (change)="ort.set(+v($event))">
                @for (o of t().venues; track o; let i = $index) { <option [value]="i" [selected]="ort() === i">{{ o }}</option> }
              </select>
            </label>
            <label>{{ t().length }}
              <select (change)="dauer.set(+v($event))">
                @for (o of t().lengths; track o; let i = $index) { <option [value]="i" [selected]="dauer() === i">{{ o }}</option> }
              </select>
            </label>
            <label>{{ t().power }}
              <select (change)="strom.set(+v($event))">
                @for (o of t().powers; track o; let i = $index) { <option [value]="i" [selected]="strom() === i">{{ o }}</option> }
              </select>
            </label>
          </div>
        }
        @case (2) {
          <div class="grid">
            <label>{{ t().name }} *<input [value]="name()" (input)="name.set(v($event))" autocomplete="name" maxlength="80" /></label>
            <label>{{ t().phone }}<input type="tel" [value]="phone()" (input)="phone.set(v($event))" autocomplete="tel" maxlength="40" /></label>
            <label>{{ t().email }}<input type="email" [value]="email()" (input)="email.set(v($event))" autocomplete="email" maxlength="80" /></label>
            <label class="wide">{{ t().message }}<textarea rows="3" maxlength="800" [value]="message()" (input)="message.set(v($event))" [placeholder]="t().messageHint"></textarea></label>
          </div>
          <p class="hint">{{ t().reach }}</p>
          <pre class="summary" [attr.aria-label]="t().preview">{{ body() }}</pre>
        }
      }

      <div class="nav">
        @if (step() > 0) { <button type="button" class="btn" (click)="step.set(step() - 1)"><mat-icon>arrow_back</mat-icon> {{ t().back }}</button> }
        @if (step() < 2) {
          <button type="button" class="btn primary" [disabled]="!valid()" (click)="step.set(step() + 1)">{{ t().next }} <mat-icon>arrow_forward</mat-icon></button>
        } @else {
          <button type="submit" class="btn primary" [disabled]="!valid()"><mat-icon>send</mat-icon> {{ t().send }}</button>
        }
      </div>
    </form>
  `,
  styles: `
    .wizard { margin-top: 32px; padding: 24px; border-radius: 12px; border: 1px solid var(--bn-sunset); background: rgba(27, 30, 34, .72); }
    .top { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 20px; }
    h3 { margin: 0; font-family: var(--bn-display); font-weight: 400; font-size: 1.1rem; text-transform: uppercase; letter-spacing: .08em; }
    .steps { list-style: none; display: flex; gap: 16px; margin: 0; padding: 0; font-size: .85rem; color: var(--bn-fog); }
    .steps span { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--bn-line); margin-right: 4px; font-size: .75rem; }
    .steps .active { color: var(--bn-ink); }
    .steps .active span, .steps .done span { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    .grid { display: grid; gap: 14px 16px; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
    label, .label { display: flex; flex-direction: column; gap: 6px; font-family: var(--bn-wide); font-size: .68rem; letter-spacing: .12em; text-transform: uppercase; color: var(--bn-fog); }
    .label { margin: 0 0 8px; }
    .wide { grid-column: 1 / -1; }
    input, select, textarea {
      padding: 10px 12px; border-radius: 8px; border: 1px solid var(--bn-line); background: #15171c; color: var(--bn-ink);
      font: 400 .95rem/1.4 Inter, sans-serif; letter-spacing: normal; text-transform: none; color-scheme: dark;
    }
    input:focus, select:focus, textarea:focus { outline: none; border-color: var(--bn-sunset); }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
    .chips button { padding: 8px 14px; border-radius: 999px; border: 1px solid var(--bn-line); background: transparent; color: var(--bn-ink); font: inherit; cursor: pointer; }
    .chips button.on { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    .note { display: flex; align-items: center; gap: 8px; margin: 14px 0 0; font-size: .9rem; color: var(--bn-fog); }
    .note.warn { color: #e0b25a; }
    .hint { margin: 10px 0 0; font-size: .82rem; color: var(--bn-fog); }
    .summary { margin: 16px 0 0; padding: 14px; border-radius: 8px; background: #15171c; border: 1px dashed var(--bn-line); white-space: pre-wrap; font: inherit; font-size: .85rem; line-height: 1.55; color: rgba(236, 233, 228, .82); }
    .nav { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 999px; border: 1px solid var(--bn-line); background: transparent; color: var(--bn-ink); font: inherit; font-weight: 500; cursor: pointer; }
    .btn.primary { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    .btn:disabled { opacity: .45; cursor: default; }
    .btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    @media (max-width: 520px) { .wizard { padding: 16px; } .steps { gap: 10px; } }
  `,
})
export class Anfrage {
  /** Sprache der Seite – auch die E-Mail wird in dieser Sprache erstellt */
  readonly lang = input<AnfrageLang>('de');
  protected readonly t = computed(() => T[this.lang()]);

  private readonly shows = inject(BandService).shows;
  protected readonly today = iso(new Date());

  protected readonly step = signal(0);
  protected readonly date = signal('');
  protected readonly time = signal('');
  protected readonly place = signal('');
  protected readonly anlass = signal<number | null>(null);
  protected readonly gaeste = signal('');
  // Auswahlfelder als Index in die Optionen der jeweiligen Sprache
  protected readonly ort = signal(0);
  protected readonly dauer = signal(0);
  protected readonly strom = signal(0);
  protected readonly name = signal('');
  protected readonly phone = signal('');
  protected readonly email = signal('');
  protected readonly message = signal('');

  /** Vom Verfügbarkeitskalender: Datum übernehmen und zum ersten Schritt springen */
  setDate(isoDate: string): void {
    this.date.set(isoDate);
    this.step.set(0);
  }

  // Schon belegt/reserviert? (gleiche Logik wie der Verfügbarkeitskalender)
  protected readonly busy = computed(() => {
    const d = this.date();
    const hits = this.shows.filter((s) => d >= s.date && d <= (s.endDate ?? s.date));
    return hits.some((s) => s.confirmed) ? 'booked' : hits.length ? 'option' : null;
  });

  // Weniger als 4 Wochen Vorlauf
  protected readonly soon = computed(() => {
    const d = this.date();
    return !!d && (Date.parse(d) - Date.parse(this.today)) / 864e5 < 28;
  });

  protected readonly valid = computed(() => {
    switch (this.step()) {
      case 0: return !!this.date() && this.date() >= this.today && this.place().trim().length > 1;
      case 1: return this.anlass() !== null && Number(this.gaeste()) > 0;
      default: return !!this.name().trim() && !!(this.phone().trim() || this.email().trim());
    }
  });

  private readonly occasion = computed(() => (this.anlass() === null ? '–' : this.t().occasions[this.anlass()!]));

  protected readonly body = computed(() => {
    const t = this.t();
    return [
      t.hello,
      '',
      t.intro,
      '',
      `${t.date}: ${this.date() ? t.formatDate(this.date()) : '–'}${this.time() ? `, ${t.startAt} ${this.time()}${t.clock}` : ''}`,
      `${t.place}: ${this.place().trim() || '–'}`,
      `${t.occasion}: ${this.occasion()}`,
      `${t.guestsMail}: ${t.approx} ${this.gaeste() || '–'}`,
      `${t.venueMail}: ${t.venues[this.ort()]}`,
      `${t.length}: ${t.lengths[this.dauer()]}`,
      `${t.powerMail}: ${t.powers[this.strom()]}`,
      ...(this.message().trim() ? ['', this.message().trim()] : []),
      '',
      t.regards,
      this.name().trim(),
      ...(this.phone().trim() ? [`${t.phone}: ${this.phone().trim()}`] : []),
      ...(this.email().trim() ? [`${t.email}: ${this.email().trim()}`] : []),
    ].join('\n');
  });

  protected v(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  protected send(e: Event): void {
    e.preventDefault();
    if (!this.valid()) return;
    const subject = this.t().subject(this.occasion(), this.t().formatDate(this.date()));
    window.location.href = `mailto:${MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(this.body())}`;
  }
}
