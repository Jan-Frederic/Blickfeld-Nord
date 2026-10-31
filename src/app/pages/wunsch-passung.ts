import { Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { SongEintrag } from '../data/playlisten';
import { gespielteTonart, songInfo } from '../data/songinfo';
import { durationOf } from '../data/setlist-data';
import { wunschPassung } from '../data/wunsch-passung';

// Songs → Liste „Wunschliste“: welche Wunschsongs am besten in die Setlist passen (Logik: data/wunsch-passung.ts)
@Component({
  selector: 'app-wunsch-passung',
  imports: [MatIconModule],
  template: `
    @let p = passung();
    <details class="wunsch-passung" open>
      <summary><mat-icon>lightbulb</mat-icon> Was passt als Nächstes?
        <small>Setlist: {{ p.verteilung.langsam }} langsam · {{ p.verteilung.mittel }} mittel · {{ p.verteilung.schnell }} schnell@if (p.fehlt) { – es fehlen {{ p.fehlt === 'mittel' ? 'mittelschnelle' : p.fehlt }} Songs }</small>
      </summary>
      <ol>
        @for (v of p.vorschlaege; track v.song.title + v.song.artist) {
          <li><button type="button" class="link" (click)="oeffnen.emit(v.song.title + '|' + v.song.artist)">{{ v.song.title }}</button> <span class="a">{{ v.song.artist }}</span>
            <small>{{ v.gruende.join(' · ') }}</small></li>
        } @empty { <li>Alle Wunschsongs stehen schon auf der Setlist.</li> }
      </ol>
    </details>
  `,
})
export class WunschPassung {
  readonly songs = input.required<SongEintrag[]>();
  readonly oeffnen = output<string>();
  protected readonly passung = computed(() => {
    const werte = (s: SongEintrag) => {
      const i = songInfo(s.title, s.artist);
      return { title: s.title, artist: s.artist, bpm: i?.bpm, tonart: gespielteTonart(i), dauer: durationOf(s) };
    };
    const alle = this.songs();
    return wunschPassung(alle.filter((s) => s.listen.includes('setlist')).map(werte), alle.filter((s) => s.listen.includes('wunschliste')).map(werte));
  });
}
