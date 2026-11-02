import { Component, computed, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { ichSetzen, ladeIch, rufname, zusageSetzen, zusagen, zusagenText } from '../data/band-ich';
import { ladeWackelt } from '../data/wackelt';

// Backstage → Probe: „Wer kommt?“ – einmal „Ich bin …“ wählen (gilt für die Person, auf allen ihren Geräten), dann
// zusagen oder absagen (mit Notiz wie „komme später“). Jede Person schreibt ihre eigene Datei, gespiegelt über OneDrive.
@Component({
  selector: 'app-probe-zusagen',
  imports: [MatIconModule],
  template: `
    <div class="zusagen">
      <p class="stand">{{ text() }}</p>
      <ul>
        @for (m of mitglieder; track m.slug) {
          @let z = liste().get(m.slug);
          <li [class.ja]="z?.kommt === true" [class.nein]="z?.kommt === false" [class.ich]="m.slug === ich()">
            <mat-icon>{{ z ? (z.kommt ? 'check_circle' : 'cancel') : 'help_outline' }}</mat-icon>
            <span>{{ rufname(m) }}{{ m.slug === ich() ? ' (du)' : '' }}
              <small>{{ z ? (z.kommt ? 'kommt' : 'kommt nicht') : 'noch offen' }}{{ z?.notiz ? ' – ' + z!.notiz : '' }}</small></span>
          </li>
        }
      </ul>
      @if (ich()) {
        <div class="knoepfe">
          <button type="button" class="ja" [class.an]="meine()?.kommt === true" (click)="setzen(true)"><mat-icon>check</mat-icon> Ich komme</button>
          <button type="button" class="nein" [class.an]="meine()?.kommt === false" (click)="setzen(false)"><mat-icon>close</mat-icon> Ich kann nicht</button>
          <input maxlength="80" placeholder="Notiz, z. B. komme 30 min später" aria-label="Notiz zur Zusage" [value]="meine()?.notiz ?? ''" (change)="notiz($any($event.target).value)" />
        </div>
        <button type="button" class="link" (click)="ich.set('')">nicht {{ ichName() }}?</button>
      } @else {
        <label class="wer">Ich bin
          <select aria-label="Wer bist du?" (change)="ichWaehlen($any($event.target).value)">
            <option value="">– wählen –</option>
            @for (m of mitglieder; track m.slug) { <option [value]="m.slug">{{ rufname(m) }}</option> }
          </select>
          <small>einmal je Person – dann siehst du hier deine Zusage, und die Band sieht, wo du unsicher bist</small>
        </label>
      }
    </div>
  `,
})
export class ProbeZusagen {
  readonly datum = input.required<string>();
  protected readonly mitglieder = inject(BandService).members;
  protected readonly rufname = rufname;
  protected readonly ich = signal(ladeIch());
  private readonly stand = signal(0);
  protected readonly liste = computed(() => (this.stand(), zusagen(this.datum(), this.mitglieder)));
  protected readonly meine = computed(() => this.liste().get(this.ich()));
  protected readonly text = computed(() => zusagenText(this.liste(), this.mitglieder.length) || 'Noch keine Antworten');
  protected readonly ichName = computed(() => {
    const m = this.mitglieder.find((x) => x.slug === this.ich());
    return m ? rufname(m) : '';
  });

  protected ichWaehlen(slug: string): void {
    ichSetzen(slug, ladeWackelt());
    this.ich.set(slug);
  }
  protected setzen(kommt: boolean): void {
    zusageSetzen(this.datum(), this.ich(), { kommt, notiz: this.meine()?.notiz });
    this.stand.update((n) => n + 1);
  }
  protected notiz(text: string): void {
    zusageSetzen(this.datum(), this.ich(), { kommt: this.meine()?.kommt ?? true, notiz: text });
    this.stand.update((n) => n + 1);
  }
}
