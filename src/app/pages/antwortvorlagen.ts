import { Component, computed, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Sprache, VORLAGEN, Vorlage, antwort } from '../data/antworten';

// Backstage → Material: Antwort auf eine Booking-Anfrage – Vorlage wählen, Name/Anlass/Datum eintragen, Text
// prüfen und kopieren. Gage und Adressen bewusst nicht in der Vorlage (siehe data/antworten.ts).
@Component({
  selector: 'app-antwortvorlagen',
  imports: [MatIconModule],
  template: `
    <h3 class="sub"><mat-icon>mail</mat-icon> Antwort auf eine Anfrage</h3>
    <div class="wahl" role="radiogroup" aria-label="Vorlage">
      @for (v of vorlagen; track v.id) {
        <button type="button" role="radio" [attr.aria-checked]="vorlage() === v.id" [class.on]="vorlage() === v.id" (click)="vorlage.set(v.id)" [title]="v.text">{{ v.label }}</button>
      }
    </div>
    <div class="wahl" role="radiogroup" aria-label="Sprache">
      @for (l of sprachen; track l.id) {
        <button type="button" role="radio" [attr.aria-checked]="sprache() === l.id" [class.on]="sprache() === l.id" (click)="sprache.set(l.id)">{{ l.label }}</button>
      }
      @if (sprache() !== 'de') { <span class="hint">Übersetzung vor dem ersten Einsatz gegenlesen</span> }
    </div>
    <div class="felder">
      <label>Name <input [value]="name()" (input)="name.set($any($event.target).value)" placeholder="z. B. Anna" /></label>
      <label>Anlass <input [value]="anlass()" (input)="anlass.set($any($event.target).value)" placeholder="z. B. euer Sommerfest" /></label>
      <label>Datum <input type="date" [value]="datum()" (input)="datum.set($any($event.target).value)" /></label>
      <label>Von <input [value]="absender()" (input)="absender.set($any($event.target).value)" placeholder="dein Name" /></label>
    </div>
    <textarea rows="14" [value]="text()" aria-label="Antworttext" readonly></textarea>
    <div class="aktionen">
      <button type="button" class="kopieren" (click)="kopieren()"><mat-icon>{{ kopiert() ? 'check' : 'content_copy' }}</mat-icon> {{ kopiert() ? 'Kopiert!' : 'Text kopieren' }}</button>
      <span class="hint">Gage, Adressen und Telefonnummern erst in der Mail ergänzen – sie gehören nicht auf die Website.</span>
    </div>
  `,
  styles: `
    :host { display: block; margin-top: 40px; }
    .sub { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; font-size: 1rem; }
    .sub mat-icon { color: var(--bn-sunset); }
    .wahl { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 12px 0; }
    .wahl button, .kopieren {
      display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; border: 1px solid var(--bn-line);
      background: none; color: var(--bn-ink); font: inherit; font-size: .88rem; cursor: pointer;
    }
    .wahl button:hover, .kopieren:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .wahl button.on { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    .felder { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 12px; }
    label { display: grid; gap: 4px; font-size: .8rem; color: var(--bn-fog); }
    input, textarea {
      box-sizing: border-box; width: 100%; padding: 9px 12px; border: 1px solid var(--bn-line); border-radius: 10px;
      background: transparent; color: var(--bn-ink); font: inherit; font-size: .92rem; color-scheme: dark;
    }
    textarea { resize: vertical; line-height: 1.5; font-size: .88rem; }
    .aktionen { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 10px; }
    .kopieren mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .hint { font-size: .8rem; color: var(--bn-fog); }
  `,
})
export class Antwortvorlagen {
  protected readonly vorlagen = VORLAGEN;
  protected readonly vorlage = signal<Vorlage>('zusage');
  protected readonly sprachen: { id: Sprache; label: string }[] = [{ id: 'de', label: 'Deutsch' }, { id: 'en', label: 'English' }, { id: 'nl', label: 'Nederlands' }];
  protected readonly sprache = signal<Sprache>('de');
  protected readonly name = signal('');
  protected readonly anlass = signal('');
  protected readonly datum = signal('');
  protected readonly absender = signal('');
  protected readonly kopiert = signal(false);
  protected readonly text = computed(() =>
    antwort(this.vorlage(), { name: this.name(), anlass: this.anlass(), datum: this.datum(), absender: this.absender() }, this.sprache()),
  );

  protected async kopieren(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.text());
      this.kopiert.set(true);
      setTimeout(() => this.kopiert.set(false), 2000);
    } catch {
      window.prompt('Text kopieren:', this.text());
    }
  }
}
