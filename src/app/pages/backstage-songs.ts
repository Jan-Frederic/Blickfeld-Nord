import { Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NotenDateiInfo, alleSongNoten, notenDateien } from '../data/noten';
import { NotenVerwaltung } from './noten-verwaltung';
import { SongsListe } from './songs-liste';
import { SongsSetlists } from './songs-setlists';
import { SongsReife } from './songs-reife';

// Backstage → Songs mit Unterseiten: Liste (Tonart, Tempo, Notiz und Noten je Song), Setlists (aller Auftritte)
// und Noten (PDFs und Akkordblätter auf diesem Gerät: einlesen, an die Band weitergeben), Bühnenreife (Fortschritt je
// Musiker und Reife je Song).
export const SONG_BEREICHE = [
  { path: '', teil: 'liste', label: 'Liste', icon: 'library_music' },
  { path: 'setlists', teil: 'setlists', label: 'Setlists', icon: 'queue_music' },
  { path: 'noten', teil: 'noten', label: 'Noten', icon: 'picture_as_pdf' },
  { path: 'reife', teil: 'reife', label: 'Bühnenreife', icon: 'military_tech' },
] as const;

@Component({
  selector: 'app-backstage-songs',
  imports: [RouterLink, MatIconModule, NotenVerwaltung, SongsListe, SongsSetlists, SongsReife],
  template: `
    <section class="section">
      <p class="kicker">Backstage</p>
      <h2>Songs</h2>
      <nav class="tabs" aria-label="Bereiche der Songs">
        @for (b of bereiche; track b.teil) {
          <a [routerLink]="b.path ? ['/backstage/songs', b.path] : ['/backstage/songs']" [class.active]="b.teil === teil()" [attr.aria-current]="b.teil === teil() ? 'page' : null">
            <mat-icon>{{ b.icon }}</mat-icon> {{ b.label }}
          </a>
        }
      </nav>
      @switch (teil()) {
        <!-- Setlists und Noten-Verwaltung erst laden, wenn der Reiter gewählt ist -->
        @case ('setlists') { @defer { <app-songs-setlists /> } }
        @case ('reife') { @defer { <app-songs-reife /> } }
        @case ('noten') { @defer { <app-noten-verwaltung [dateien]="dateien()" [songs]="mitNoten()" (geaendert)="laden()" /> } }
        @default { <app-songs-liste /> }
      }
    </section>
  `,
  styles: `
    .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
    .tabs a {
      display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 999px;
      border: 1px solid var(--bn-line); color: var(--bn-ink); text-decoration: none; font-size: .92rem;
    }
    .tabs a:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .tabs a.active { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    .tabs mat-icon { font-size: 18px; width: 18px; height: 18px; }
    app-noten-verwaltung { display: block; margin-top: -24px; }
  `,
})
export class BackstageSongs {
  /** Unterseite aus den Routendaten (/backstage/songs, …/setlists, …/noten) */
  readonly teil = input<string>('liste');
  protected readonly bereiche = SONG_BEREICHE;

  // für „Noten“: gespeicherte PDFs und Anzahl Songs mit Noten
  protected readonly dateien = signal<NotenDateiInfo[]>([]);
  protected readonly mitNoten = signal(0);
  constructor() {
    this.laden();
  }
  protected laden(): void {
    notenDateien().then((d) => this.dateien.set(d)).catch(() => undefined);
    alleSongNoten().then((n) => this.mitNoten.set(Object.keys(n).length)).catch(() => undefined);
  }
}
