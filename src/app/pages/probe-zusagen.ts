import { Component, computed, inject, input, signal } from '@angular/core';
import { datenStand } from '../data/neu-zeichnen';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { BandService } from '../data/band.service';
import { ladeIch, rufname, zusageSetzen, zusagen, zusagenText } from '../data/band-ich';

// Backstage → Probe: „Wer kommt?“ – einmal unter Einstellungen „Ich bin …“ wählen (gilt für die Person, auf allen ihren Geräten), dann
// zusagen oder absagen (mit Notiz wie „komme später“). Jede Person schreibt ihre eigene Datei, gespiegelt über OneDrive.
@Component({
  selector: 'app-probe-zusagen',
  imports: [MatIconModule, RouterLink],
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
      } @else {
        <p class="wer">Wähle unter <a routerLink="/backstage/einstellungen">Einstellungen</a> „Ich bin …“ – dann kannst du hier
          zusagen, und die Band sieht, wo du unsicher bist.</p>
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
  protected readonly liste = computed(() => (this.stand(), datenStand(), zusagen(this.datum(), this.mitglieder)));
  protected readonly meine = computed(() => this.liste().get(this.ich()));
  protected readonly text = computed(() => zusagenText(this.liste(), this.mitglieder.length) || 'Noch keine Antworten');

  protected setzen(kommt: boolean): void {
    zusageSetzen(this.datum(), this.ich(), { kommt, notiz: this.meine()?.notiz });
    this.stand.update((n) => n + 1);
  }
  protected notiz(text: string): void {
    zusageSetzen(this.datum(), this.ich(), { kommt: this.meine()?.kommt ?? true, notiz: text });
    this.stand.update((n) => n + 1);
  }
}
