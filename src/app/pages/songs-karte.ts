import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { LISTEN, abweichungen, listenZahlen, songAbgleich } from '../data/playlisten';
import { alleSongNoten } from '../data/noten';
import { gespielteTonart, songInfo } from '../data/songinfo';
import { buehnenreif, doppelte, probenAusSpeicher, probenStand } from '../data/song-stand';

// Backstage-Übersicht: Kachel „Songs“ – Songs je Spotify-Liste, wie viele der Wunschliste bühnenreif sind (Noten,
// Tonart/Tempo, geprobt) und Hinweise (Abweichungen zwischen den Listen, vermutlich Doppelte); führt zu Songs.
@Component({
  selector: 'app-songs-karte',
  imports: [RouterLink, MatIconModule],
  template: `
    <a class="songs-karte" routerLink="/backstage/songs">
      <span class="kopf"><mat-icon>library_music</mat-icon> Songs</span>
      <span class="zahlen">
        @for (l of listen; track l.key) {
          <span><mat-icon aria-hidden="true">{{ l.icon }}</mat-icon> {{ l.label }} <b>{{ zahlen()[l.key] || 0 }}</b></span>
        }
        @if (zahlen()['ohne']) { <span>Ohne Liste <b>{{ zahlen()['ohne'] }}</b></span> }
      </span>
      <span class="stand">Wunschliste: <b>{{ reif() }} von {{ zahlen()['wunschliste'] || 0 }}</b> bühnenreif
        @if (hinweise()) { · <span class="warn">{{ hinweise() }} {{ hinweise() === 1 ? 'Hinweis' : 'Hinweise' }} zu den Listen</span> }</span>
    </a>
  `,
})
export class SongsKarte {
  protected readonly listen = LISTEN;
  private readonly notenKeys = signal<string[]>([]);
  private readonly mitNoten = signal(new Set<string>());
  private readonly songs = computed(() => songAbgleich(LISTEN, this.notenKeys()));
  protected readonly zahlen = computed(() => listenZahlen(this.songs()));
  private readonly proben = probenStand(probenAusSpeicher(), new Date().toISOString().slice(0, 10));
  protected readonly reif = computed(
    () =>
      this.songs().filter((s) => {
        if (!s.listen.includes('wunschliste')) return false;
        const i = songInfo(s.title, s.artist);
        return buehnenreif({ noten: this.mitNoten().has(s.key), tonart: !!(gespielteTonart(i) && i?.bpm), geprobt: this.proben.get(s.key)?.anzahl ?? 0 });
      }).length,
  );
  protected readonly hinweise = computed(() => {
    const a = abweichungen(this.songs());
    return a.setlistOhneWebsite.length + a.archivAufWebsite.length + doppelte(this.songs()).length;
  });

  constructor() {
    alleSongNoten()
      .then((n) => {
        const mit = Object.entries(n).filter(([, x]) => x.pdfs?.length || x.chordpro).map(([k]) => k);
        this.notenKeys.set(mit);
        this.mitNoten.set(new Set(mit));
      })
      .catch(() => undefined);
  }
}
