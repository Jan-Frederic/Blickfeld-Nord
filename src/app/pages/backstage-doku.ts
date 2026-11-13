import { Component, computed, effect, inject, input } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Zurueck } from '../zurueck';
import { DOKU_THEMEN, DokuId, dokuPfad, istDokuId } from '../data/doku-themen';
import { DOKU } from '../data/doku-inhalte';

// Backstage → Anleitung zu einer Unterseite (/backstage/anleitung/<thema>): Inhalte aus data/doku-inhalte.ts.
// „Übe-, Probe- und Bühnen-Modus“ hat eine eigene Seite (backstage-anleitung.ts). Styles global (app-backstage-doku).
@Component({
  selector: 'app-backstage-doku',
  imports: [RouterLink, MatIconModule, Zurueck],
  template: `
    <section class="section">
      @if (doku(); as d) {
        <app-zurueck [ziel]="d.seite" [text]="d.titel" />
        <p class="kicker">Backstage · Anleitung</p>
        <h2>{{ d.titel }}</h2>
        <p class="lead">{{ d.kurz }}</p>
        <p class="wege"><a [routerLink]="d.seite"><mat-icon aria-hidden="true">arrow_forward</mat-icon> Zur Seite</a>
          <a routerLink="/backstage/anleitung"><mat-icon aria-hidden="true">menu_book</mat-icon> Alle Anleitungen</a></p>
        @for (a of d.abschnitte; track a.titel) {
          <h3>{{ a.titel }}</h3>
          @if (a.text) { <p>{{ a.text }}</p> }
          @if (a.punkte?.length) { <ul>@for (p of a.punkte; track p) { <li>{{ p }}</li> }</ul> }
        }
        @if (d.siehe.length) {
          <h3>Siehe auch</h3>
          <ul class="siehe">@for (s of d.siehe; track s.id) { <li><a [routerLink]="s.pfad">Anleitung: {{ s.titel }}</a></li> }</ul>
        }
      } @else {
        <app-zurueck ziel="/backstage/anleitung" text="Alle Anleitungen" />
        <h2>Anleitung nicht gefunden</h2>
        <p class="lead"><a routerLink="/backstage/anleitung">Alle Anleitungen</a></p>
      }
    </section>
  `,
})
export class BackstageDoku {
  readonly thema = input<string>();
  private readonly titelSetzen = (() => {
    const t = inject(Title);
    effect(() => {
      const d = this.doku();
      if (d) t.setTitle(`Anleitung: ${d.titel} – Backstage – Blickfeld Nord`);
    });
  })();
  protected readonly doku = computed(() => {
    const id = this.thema();
    if (!istDokuId(id) || id === 'modi') return null;
    const d = DOKU[id];
    return {
      ...d,
      titel: DOKU_THEMEN[id].titel,
      seite: DOKU_THEMEN[id].seite,
      siehe: (d.siehe ?? []).map((s: DokuId) => ({ id: s, titel: DOKU_THEMEN[s].titel, pfad: dokuPfad(s) })),
    };
  });
}
