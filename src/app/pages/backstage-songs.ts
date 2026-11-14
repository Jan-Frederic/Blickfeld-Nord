import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SongsListe } from './songs-liste';
import { SongsSetlists } from './songs-setlists';
import { SongsSammlungen } from './songs-sammlungen';
import { DokuLink } from './doku-link';
import type { DokuId } from '../data/doku-themen';

// Backstage → Songs mit Unterseiten (im Menü oben unter „Songs“, data/backstage-bereiche.ts): Liste (Tonart, Tempo,
// Notiz und Noten je Song), Setlists (aller Auftritte), Sammlungen (anlegen und bearbeiten, je Sammlung eine Seite).
// Die Noten-Verwaltung liegt im Abgleich, die Bühnenreife unter Zahlen. Kopf jeder Unterseite: Titel, Text, Anleitung.
const TEILE: Record<string, { titel: string; doku: DokuId }> = {
  liste: { titel: 'Songs', doku: 'songs' },
  setlists: { titel: 'Setlists', doku: 'setlists' },
  sammlungen: { titel: 'Sammlungen', doku: 'sammlungen' },
};

@Component({
  selector: 'app-backstage-songs',
  imports: [DokuLink, MatIconModule, SongsListe, SongsSetlists, SongsSammlungen],
  template: `
    <section class="section">
      <p class="kicker">Backstage{{ teil() === 'liste' ? '' : ' · Songs' }}</p>
      <h2>{{ kopf().titel }}</h2>
      @switch (teil()) {
        @case ('setlists') {
          <p class="lead">Die Setlists aller Auftritte, wie sie auf diesem Gerät gespeichert sind – Setlists der anderen kommen über
            „Abgleich“ oder „Setlist als Link“ dazu. Bearbeitet wird je Auftritt unter „Setlist“.</p>
        }
        @case ('sammlungen') {
          @if (!name()) {
            <p class="lead">Sammlungen sind feste Songfolgen – z. B. die Weihnachtslieder oder ein bewährtes Kneipen-Set. In der
              Setlist eines Auftritts ersetzen sie die ganze Setlist oder werden hinten angehängt.</p>
          }
        }
        @default {
          <p class="lead">Tonart, Tempo, Notiz und Noten je Song. Zeile antippen zum Bearbeiten,
            <mat-icon class="inline">play_arrow</mat-icon> startet den Bühnen-Modus ab dem Song.</p>
        }
      }
      <app-doku-link [thema]="kopf().doku" />
      @switch (teil()) {
        <!-- Setlists und Sammlungen erst laden, wenn die Unterseite gewählt ist -->
        @case ('setlists') { @defer { <app-songs-setlists /> } }
        @case ('sammlungen') { @defer { <app-songs-sammlungen [name]="name()" /> } }
        @default { <app-songs-liste /> }
      }
    </section>
  `,
})
export class BackstageSongs {
  /** Unterseite aus den Routendaten (/backstage/songs, …/setlists, …/sammlungen) */
  readonly teil = input<string>('liste');
  /** Sammlungen: gewählte Sammlung (?name=…) – eigene Unterseite je Sammlung */
  readonly name = input<string>('');
  protected readonly kopf = computed(() => TEILE[this.teil()] ?? TEILE['liste']);
}
