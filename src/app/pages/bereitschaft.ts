import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService, Show } from '../data/band.service';
import { bereitschaft } from '../data/bereitschaft';
import { isPause, loadSetlist } from '../data/setlist-data';
import { songInfo } from '../data/songinfo';
import { alleSongNoten } from '../data/noten';
import { erledigteSchritte } from '../data/werbeplan';
import { VORORT_PREFIX, loadVorOrt } from './vorort';
import { GROUPS, PACKLISTE_PREFIX, loadPackliste } from './packliste';

// „Bereit?“ für einen kommenden Auftritt (Logik: data/bereitschaft.ts) – in der Backstage-Übersicht für den nächsten
// Auftritt, auf der Seite jedes kommenden Auftritts. Liest Setlist, Vor-Ort-Angaben, Werbeplan-Häkchen, Packliste
// und Noten dieses Geräts; jeder offene Punkt führt dorthin, wo er sich erledigen lässt.
@Component({
  selector: 'app-bereitschaft',
  imports: [RouterLink, MatIconModule],
  template: `
    <details class="bereit" [class.fertig]="offen() === 0" [open]="aufgeklappt()">
      <summary>
        <mat-icon>{{ offen() === 0 ? 'verified' : 'checklist' }}</mat-icon>
        <span>@if (titel()) { {{ titel() }}: } {{ offen() === 0 ? 'alles bereit' : punkte().length - offen() + ' von ' + punkte().length + ' bereit' }}</span>
      </summary>
      <ul>
        @for (p of punkte(); track p.text) {
          <li [class.ok]="p.ok">
            <mat-icon>{{ p.ok ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
            <span>
              @if (p.ziel !== undefined && !p.ok) { <a [routerLink]="p.ziel ? ['/backstage', id(), p.ziel] : ['/backstage', id()]">{{ p.text }}</a> } @else { {{ p.text }} }
              @if (p.hinweis) { <small>{{ p.hinweis }}</small> }
            </span>
          </li>
        }
      </ul>
    </details>
  `,
  styles: `
    .bereit { margin: 20px 0 0; padding: 12px 16px; border-radius: 12px; border: 1px solid #e0b25a; }
    .bereit.fertig { border-color: #5fb88a; }
    summary { display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 600; }
    summary mat-icon { color: #e0b25a; }
    .fertig summary mat-icon { color: #5fb88a; }
    ul { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 6px; }
    li { display: flex; align-items: flex-start; gap: 8px; font-size: .9rem; }
    li mat-icon { flex: none; font-size: 18px; width: 18px; height: 18px; margin-top: 2px; color: #e0b25a; }
    li.ok mat-icon { color: #5fb88a; }
    li.ok { color: var(--bn-fog); }
    a { color: var(--bn-sunset); }
    small { display: block; color: var(--bn-fog); font-size: .8rem; }
  `,
})
export class Bereitschaft {
  readonly show = input.required<Show>();
  /** Überschrift, z. B. „Weihnachtsmarkt in 37 Tagen“ (Übersicht); leer auf der Seite des Auftritts */
  readonly titel = input('');
  readonly aufgeklappt = input(false);
  private readonly band = inject(BandService);
  protected readonly id = computed(() => this.band.showId(this.show()));
  private readonly notenKeys = signal<Set<string> | undefined>(undefined);

  constructor() {
    alleSongNoten()
      .then((n) => this.notenKeys.set(new Set(Object.keys(n))))
      .catch(() => undefined);
  }

  protected readonly punkte = computed(() => {
    const id = this.id();
    const setlist = loadSetlist(id);
    const songs = setlist.filter((e) => !isPause(e)) as { title: string; artist: string }[];
    const pack = loadPackliste(PACKLISTE_PREFIX + id);
    const gesamt = GROUPS.reduce((n, g) => n + g.items.length, 0) + pack.custom.length;
    const noten = this.notenKeys();
    return bereitschaft({
      show: this.show(),
      heute: new Date().toISOString().slice(0, 10),
      setlist,
      ohneTonartTempo: songs.filter((s) => { const i = songInfo(s.title, s.artist); return !i?.tonart || !i?.bpm; }).map((s) => s.title),
      ohneNoten: noten && songs.filter((s) => !noten.has(`${s.title}|${s.artist}`)).map((s) => s.title),
      vorort: loadVorOrt(VORORT_PREFIX + id),
      werbungErledigt: erledigteSchritte(id),
      packliste: { eingepackt: Math.min(pack.checked.length, gesamt), gesamt },
    });
  });
  protected readonly offen = computed(() => this.punkte().filter((p) => !p.ok).length);
}
