import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Component, computed, input } from '@angular/core';
import { BackstageBesucher } from './backstage-besucher';
import { SetlistStats } from './setlist-stats';
import { SongRangliste } from './song-rangliste';
import { BandjahrKarte } from './bandjahr-karte';
import { UebeWochen } from './uebe-wochen';
import { SongsReife } from './songs-reife';
import { DokuLink } from './doku-link';
import type { DokuId } from '../data/doku-themen';

// Backstage → Zahlen, vier Seiten (je ein Punkt im Menü oben, data/backstage-bereiche.ts): Bandjahr (mit Vorschau
// des Jahresrückblicks), Bühnenreife (Übe-Status je Musiker und Song, Üben je Woche), Besucher der Website
// (GoatCounter), Songs und Sterne (wie oft auf Setlists, Sterne-Rangliste). Kopf jeder Unterseite: Titel, Text, Anleitung.
const TEILE: Record<string, { titel: string; lead: string; doku: DokuId }> = {
  jahr: { titel: 'Bandjahr', doku: 'zahlen', lead: 'Das Jahr der Band auf einen Blick – Auftritte, Proben, Orte und Songs – und die Vorschau des Jahresrückblicks.' },
  reife: { titel: 'Bühnenreife', doku: 'reife', lead: 'Wie sicher die Songs bei jedem sitzen, die Bühnenreife je Song und wie viel die Band je Woche übt.' },
  besucher: { titel: 'Besucher', doku: 'besucher', lead: 'Wie viele Leute die Website besuchen, woher sie kommen und welche Seiten sie lesen.' },
  songs: { titel: 'Songs und Sterne', doku: 'sterne', lead: 'Welche Songs in euren Setlists am häufigsten vorkommen – und welche im Bühnen-Modus die meisten Sterne bekommen.' },
};

@Component({
  selector: 'app-backstage-zahlen',
  imports: [DokuLink, RouterLink, MatIconModule, BackstageBesucher, SetlistStats, SongRangliste, BandjahrKarte, UebeWochen, SongsReife],
  template: `
    <section class="section">
      <p class="kicker">Backstage · Zahlen</p>
      <h2>{{ kopf().titel }}</h2>
      <p class="lead">{{ kopf().lead }}</p>
      <app-doku-link [thema]="kopf().doku" />
      @switch (teil()) {
        @case ('reife') {
          @defer { <app-songs-reife /> }
          <app-uebe-wochen />
        }
        @case ('besucher') { <app-backstage-besucher /> }
        @case ('songs') {
          <app-setlist-stats />
          <app-song-rangliste />
        }
        @default {
          <app-bandjahr />
          <p class="vorschau-link"><a [routerLink]="'/backstage/jahr/' + jahr"><mat-icon>auto_stories</mat-icon> Vorschau Jahresrückblick {{ jahr }}</a> – so sieht die öffentliche Seite ab dem 15.12. aus</p>
        }
      }
    </section>
  `,
})
export class BackstageZahlen {
  /** Unterseite aus den Routendaten (/backstage/zahlen, …/reife, …/besucher, …/songs) */
  readonly teil = input<string>('jahr');
  protected readonly kopf = computed(() => TEILE[this.teil()] ?? TEILE['jahr']);
  protected readonly jahr = new Date().getFullYear();
}
