import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DOKU_THEMEN, DokuId, dokuPfad } from '../data/doku-themen';

// Link zur ausführlichen Anleitung – oben auf jeder Backstage-Unterseite, direkt unter der Überschrift (die Seiten
// halten ihre Texte kurz, die Details stehen in der Anleitung). Styles global (styles.scss, app-doku-link).
@Component({
  selector: 'app-doku-link',
  imports: [RouterLink, MatIconModule],
  template: `<a class="doku-link" [routerLink]="pfad()"><mat-icon aria-hidden="true">help_outline</mat-icon> Anleitung: {{ titel() }}</a>`,
})
export class DokuLink {
  readonly thema = input.required<DokuId>();
  protected readonly pfad = computed(() => dokuPfad(this.thema()));
  protected readonly titel = computed(() => DOKU_THEMEN[this.thema()].titel);
}
