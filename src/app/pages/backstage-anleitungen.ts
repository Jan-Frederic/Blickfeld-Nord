import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Zurueck } from '../zurueck';
import { DOKU_GRUPPEN, DOKU_THEMEN, dokuPfad } from '../data/doku-themen';

// Backstage → Alle Anleitungen (/backstage/anleitung): je Unterseite eine ausführliche Anleitung, gruppiert wie das Menü.
@Component({
  selector: 'app-backstage-anleitungen',
  imports: [RouterLink, MatIconModule, Zurueck],
  template: `
    <section class="section">
      <app-zurueck ziel="/backstage" text="Backstage" />
      <p class="kicker">Backstage · Anleitung</p>
      <h2>Alle Anleitungen</h2>
      <p class="lead">Je Seite des Backstage eine ausführliche Anleitung. Auf jeder Seite führt oben „Anleitung: …“ direkt hierher.</p>
      @for (g of gruppen; track g.titel) {
        <h3>{{ g.titel }}</h3>
        <ul class="themen">
          @for (t of g.themen; track t.pfad) { <li><a [routerLink]="t.pfad"><mat-icon aria-hidden="true">help_outline</mat-icon> {{ t.titel }}</a></li> }
        </ul>
      }
    </section>
  `,
})
export class BackstageAnleitungen {
  protected readonly gruppen = DOKU_GRUPPEN.map((g) => ({ titel: g.titel, themen: g.themen.map((id) => ({ titel: DOKU_THEMEN[id].titel, pfad: dokuPfad(id) })) }));
}
