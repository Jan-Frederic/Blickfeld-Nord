import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';

// „Angebot anfragen“ in drei Schritten (Termin → Anlass → Kontakt). Die Seite ist statisch, daher entsteht
// am Ende eine vollständig ausgefüllte E-Mail im Mailprogramm – mit allem, was wir sonst nachfragen müssten.
const MAIL = 'Matthiaswigger@me.com';
const ANLAESSE = ['Geburtstag', 'Hochzeit', 'Firmenfeier', 'Stadt- / Dorffest', 'Vereinsfest', 'Kneipe / Gastro', 'Sonstiges'];
const STEPS = ['Termin', 'Anlass', 'Kontakt'];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const de = (date: string) => date.split('-').reverse().join('.');

@Component({
  selector: 'app-anfrage',
  imports: [MatIconModule],
  template: `
    <form class="wizard" (submit)="send($event)" aria-labelledby="anfrage-title">
      <div class="top">
        <h3 id="anfrage-title">Angebot anfragen</h3>
        <ol class="steps">
          @for (s of steps; track s; let i = $index) {
            <li [class.active]="step() === i" [class.done]="step() > i"><span>{{ i + 1 }}</span> {{ s }}</li>
          }
        </ol>
      </div>

      @switch (step()) {
        @case (0) {
          <div class="grid">
            <label>Datum *<input type="date" [min]="today" [value]="date()" (input)="date.set(v($event))" required /></label>
            <label>Beginn (ungefähr)<input type="time" [value]="time()" (input)="time.set(v($event))" /></label>
            <label class="wide">Ort / Location *<input [value]="place()" (input)="place.set(v($event))" placeholder="z. B. Festzelt am Sportplatz, Hamminkeln" maxlength="120" /></label>
          </div>
          @if (busy(); as b) {
            <p class="note warn"><mat-icon>event_busy</mat-icon> An diesem Tag sind wir {{ b === 'booked' ? 'leider schon gebucht' : 'schon reserviert' }} – fragt gern trotzdem oder wählt einen anderen Termin.</p>
          } @else if (soon()) {
            <p class="note"><mat-icon>schedule</mat-icon> Ziemlich kurzfristig – wir versuchen es trotzdem möglich zu machen.</p>
          }
        }
        @case (1) {
          <p class="label">Anlass *</p>
          <div class="chips">
            @for (a of anlaesse; track a) {
              <button type="button" [class.on]="anlass() === a" (click)="anlass.set(a)">{{ a }}</button>
            }
          </div>
          <div class="grid">
            <label>Ungefähre Gästezahl *<input type="number" min="1" max="5000" [value]="gaeste()" (input)="gaeste.set(v($event))" /></label>
            <label>Drinnen oder draußen?
              <select [value]="ort()" (change)="ort.set(v($event))">
                <option>drinnen</option><option>draußen</option><option>beides möglich</option><option>noch offen</option>
              </select>
            </label>
            <label>Spielzeit
              <select [value]="dauer()" (change)="dauer.set(v($event))">
                <option>3 Stunden</option><option>4 Stunden</option><option>noch offen</option>
              </select>
            </label>
            <label>2 Steckdosen vorhanden?
              <select [value]="strom()" (change)="strom.set(v($event))">
                <option>ja</option><option>nein</option><option>weiß ich nicht</option>
              </select>
            </label>
          </div>
        }
        @case (2) {
          <div class="grid">
            <label>Name *<input [value]="name()" (input)="name.set(v($event))" autocomplete="name" maxlength="80" /></label>
            <label>Telefon<input type="tel" [value]="phone()" (input)="phone.set(v($event))" autocomplete="tel" maxlength="40" /></label>
            <label>E-Mail<input type="email" [value]="email()" (input)="email.set(v($event))" autocomplete="email" maxlength="80" /></label>
            <label class="wide">Noch etwas?<textarea rows="3" maxlength="800" [value]="message()" (input)="message.set(v($event))" placeholder="Wünsche, Ablauf, Fragen …"></textarea></label>
          </div>
          <p class="hint">Telefon oder E-Mail reicht – Hauptsache, wir können euch erreichen.</p>
          <pre class="summary" aria-label="Vorschau der Anfrage">{{ body() }}</pre>
        }
      }

      <div class="nav">
        @if (step() > 0) { <button type="button" class="btn" (click)="step.set(step() - 1)"><mat-icon>arrow_back</mat-icon> Zurück</button> }
        @if (step() < 2) {
          <button type="button" class="btn primary" [disabled]="!valid()" (click)="step.set(step() + 1)">Weiter <mat-icon>arrow_forward</mat-icon></button>
        } @else {
          <button type="submit" class="btn primary" [disabled]="!valid()"><mat-icon>send</mat-icon> E-Mail erstellen</button>
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
  private readonly shows = inject(BandService).shows;
  protected readonly steps = STEPS;
  protected readonly anlaesse = ANLAESSE;
  protected readonly today = iso(new Date());

  protected readonly step = signal(0);
  protected readonly date = signal('');
  protected readonly time = signal('');
  protected readonly place = signal('');
  protected readonly anlass = signal('');
  protected readonly gaeste = signal('');
  protected readonly ort = signal('drinnen');
  protected readonly dauer = signal('3 Stunden');
  protected readonly strom = signal('ja');
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
      case 1: return !!this.anlass() && Number(this.gaeste()) > 0;
      default: return !!this.name().trim() && !!(this.phone().trim() || this.email().trim());
    }
  });

  protected readonly body = computed(() =>
    [
      'Hallo Blickfeld Nord,',
      '',
      'wir möchten euch gerne buchen:',
      '',
      `Datum: ${this.date() ? de(this.date()) : '–'}${this.time() ? `, Beginn ca. ${this.time()} Uhr` : ''}`,
      `Ort / Location: ${this.place().trim() || '–'}`,
      `Anlass: ${this.anlass() || '–'}`,
      `Gäste: ca. ${this.gaeste() || '–'}`,
      `Drinnen / draußen: ${this.ort()}`,
      `Spielzeit: ${this.dauer()}`,
      `2 Steckdosen vorhanden: ${this.strom()}`,
      ...(this.message().trim() ? ['', this.message().trim()] : []),
      '',
      'Viele Grüße',
      this.name().trim(),
      ...(this.phone().trim() ? [`Telefon: ${this.phone().trim()}`] : []),
      ...(this.email().trim() ? [`E-Mail: ${this.email().trim()}`] : []),
    ].join('\n'),
  );

  protected v(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  protected send(e: Event): void {
    e.preventDefault();
    if (!this.valid()) return;
    const subject = `Booking-Anfrage: ${this.anlass()} am ${de(this.date())}`;
    window.location.href = `mailto:${MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(this.body())}`;
  }
}
