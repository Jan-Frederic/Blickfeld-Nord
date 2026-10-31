import { Component, computed, input, output, signal } from '@angular/core';
import { Kontakt, STUFEN, Stufe, kontaktSpeichern, ladeKontakte } from '../data/kontakte';

// Bewertung eines Veranstalters (Technik, Publikum, Bezahlung, Notiz) – beim Auftritt unter „Ansprechpartner“ und in
// Termine → Kontakte; „Wieder anfragen“ zeigt die Kurzfassung. Wie die Kontakte nur auf den Geräten und im OneDrive.
@Component({
  selector: 'app-kontakt-bewertung',
  template: `
    <fieldset class="bewertung">
      <legend>Wie war's dort?</legend>
      @for (f of felder; track f.feld) {
        <div class="reihe" role="group" [attr.aria-label]="f.label">
          <span>{{ f.label }}</span>
          @for (s of stufen; track s.wert) {
            <button type="button" [class.an]="k()[f.feld] === s.wert" [attr.aria-pressed]="k()[f.feld] === s.wert" (click)="setzen(f.feld, k()[f.feld] === s.wert ? '' : s.wert)">{{ s.label }}</button>
          }
        </div>
      }
      <div class="reihe" role="group" aria-label="Bezahlung">
        <span>Bezahlung</span>
        @for (b of bezahlung; track b.wert) {
          <button type="button" [class.an]="k().bezahlung === b.wert" [attr.aria-pressed]="k().bezahlung === b.wert" (click)="setzen('bezahlung', k().bezahlung === b.wert ? '' : b.wert)">{{ b.label }}</button>
        }
      </div>
      <label class="notiz">Notiz <input [value]="k().notiz ?? ''" (change)="setzen('notiz', $any($event.target).value)" placeholder="z. B. Strom nur eine Steckdose" autocomplete="off" /></label>
    </fieldset>
  `,
})
export class KontaktBewertung {
  /** Schlüssel des Kontakts („Stadt|Ort“) */
  readonly key = input.required<string>();
  readonly geaendert = output<void>();
  private readonly stand = signal(0);
  protected readonly k = computed<Kontakt>(() => (this.stand(), ladeKontakte()[this.key()] ?? {}));
  protected readonly stufen = STUFEN;
  protected readonly felder: { feld: 'technik' | 'publikum'; label: string }[] = [
    { feld: 'technik', label: 'Technik' },
    { feld: 'publikum', label: 'Publikum' },
  ];
  protected readonly bezahlung = [
    { wert: 'puenktlich', label: 'pünktlich' },
    { wert: 'spaet', label: 'spät' },
  ] as const;

  protected setzen(feld: 'technik' | 'publikum' | 'bezahlung' | 'notiz', wert: Stufe | string): void {
    kontaktSpeichern(this.key(), { ...(ladeKontakte()[this.key()] ?? {}), [feld]: wert } as Kontakt);
    this.stand.update((n) => n + 1);
    this.geaendert.emit();
  }
}
