import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { sammlungSongs, sammlungen } from '../data/sammlungen';
import { BandService } from '../data/band.service';
import { BACKSTAGE_BEREICHE } from '../data/backstage-bereiche';
import { LISTEN, songAbgleich } from '../data/playlisten';
import { ladeKontakte, ortKey } from '../data/kontakte';
import { datumText } from '../data/datum';

// Backstage-Übersicht: eine Suche über alles – Auftritte, Proben, Songs (alle Spotify-Listen), Kontakte und Bereiche.
// Tippen genügt; Treffer führen direkt hin (Songs öffnen die Songs-Liste mit der Suche).
interface Treffer {
  icon: string;
  text: string;
  info: string;
  link: string;
  query?: Record<string, string>;
}

const norm = (s: string) => s.toLocaleLowerCase('de').normalize('NFD').replace(/\p{Diacritic}/gu, '');

@Component({
  selector: 'app-backstage-suche',
  imports: [RouterLink, MatIconModule],
  template: `
    <div class="backstage-suche" role="search">
      <label class="feld">
        <mat-icon>search</mat-icon>
        <input type="search" placeholder="Suchen: Auftritt, Song, Kontakt, Probe …" aria-label="Im Backstage suchen" [value]="q()" (input)="q.set($any($event.target).value)" />
      </label>
      @if (q().trim().length >= 2) {
        <ul>
          @for (t of treffer(); track t.link + t.text) {
            <li><a [routerLink]="t.link" [queryParams]="t.query"><mat-icon>{{ t.icon }}</mat-icon> <span class="t">{{ t.text }}</span> <span class="i">{{ t.info }}</span></a></li>
          } @empty { <li class="leer">Nichts gefunden.</li> }
        </ul>
      }
    </div>
  `,
})
export class BackstageSuche {
  private readonly band = inject(BandService);
  protected readonly q = signal('');
  private readonly songs = songAbgleich(LISTEN);

  protected readonly treffer = computed<Treffer[]>(() => {
    const q = norm(this.q().trim());
    if (q.length < 2) return [];
    const passt = (...teile: (string | undefined)[]) => norm(teile.filter(Boolean).join(' ')).includes(q);
    const kontakte = ladeKontakte();
    const out: Treffer[] = [
      ...this.band.shows
        .filter((s) => passt(s.venue, s.city, s.publicName, s.date, datumText(s.date)))
        .map((s) => ({ icon: 'celebration', text: s.venue, info: `${datumText(s.date)}${s.city ? ' · ' + s.city : ''}`, link: `/backstage/${this.band.showId(s)}` })),
      ...this.band.rehearsals
        .filter((p) => passt('probe', p.place, p.note, p.date, datumText(p.date)))
        .map((p) => ({ icon: 'music_note', text: 'Probe', info: `${datumText(p.date)}${p.place ? ' · ' + p.place : ''}`, link: `/backstage/probe/${p.date}` })),
      ...Object.entries(kontakte)
        .filter(([key, k]) => passt(k.name, k.ort, k.stadt, key.replace('|', ' ')))
        .map(([key, k]) => ({ icon: 'contact_phone', text: k.ort || this.band.shows.find((s) => ortKey(s) === key)?.venue || key.split('|')[1], info: k.name ?? 'Kontakt', link: '/backstage/termine/kontakte' })),
      ...this.songs
        .filter((s) => passt(s.title, s.artist))
        .map((s) => ({ icon: 'library_music', text: s.title, info: s.artist, link: '/backstage/songs', query: { suche: s.title } })),
      // Sammlungen: Name oder ein Song darin → Seite der Sammlung
      ...sammlungen()
        .filter((m) => passt(m.name, ...sammlungSongs(m).map((x) => x.title)))
        .map((m) => ({ icon: 'bookmarks', text: m.name, info: `Sammlung · ${sammlungSongs(m).length} Songs`, link: '/backstage/songs/sammlungen', query: { name: m.name } })),
      ...BACKSTAGE_BEREICHE.filter((b) => passt(b.label, b.text)).map((b) => ({ icon: b.icon, text: b.label, info: b.text, link: b.path })),
      // Unterpunkte (Setlists, Saison, Bühnenreife …) – ohne den ersten, der die Seite des Bereichs selbst ist
      ...BACKSTAGE_BEREICHE.flatMap((b) => (b.unter ?? []).slice(1).filter((u) => passt(u.label)).map((u) => ({ icon: u.icon, text: u.label, info: b.label, link: u.path }))),
    ];
    return out.slice(0, 12);
  });
}
