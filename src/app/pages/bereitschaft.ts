import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { datenStand } from '../data/neu-zeichnen';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService, Show } from '../data/band.service';
import { VORABEND_PREFIX, bereitschaft, langsamStrecken } from '../data/bereitschaft';
import { isPause, loadSetlist } from '../data/setlist-data';
import { gespielteTonart, songInfo } from '../data/songinfo';
import { spruenge } from '../data/tonart-uebergang';
import { notizBaustellen, probenNotizen } from '../data/song-stand';
import { alleSongNoten } from '../data/noten';
import { type OfflineStand, offlineStand, offlineVorladen } from '../data/offline';
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
    <details class="bereit" [class.fertig]="offen() === 0" [open]="auf()" (toggle)="auf.set($any($event.target).open)">
      <summary>
        <mat-icon>{{ offen() === 0 ? 'verified' : 'checklist' }}</mat-icon>
        <span>@if (titel()) { {{ titel() }}: } {{ offen() === 0 ? 'alles bereit' : punkte().length - offen() + ' von ' + punkte().length + ' bereit' }}</span>
        <!-- zugeklappt: alle Punkte als Haken in einer Reihe, rechtsbündig -->
        @if (!auf()) {
          <span class="haken-reihe" aria-hidden="true">
            @for (p of punkte(); track p.text) { <mat-icon [class.ok]="p.ok" [title]="p.text">{{ p.ok ? 'check_box' : 'check_box_outline_blank' }}</mat-icon> }
          </span>
        }
      </summary>
      <ul>
        @for (p of punkte(); track p.text) {
          <li [class.ok]="p.ok">
            @if (p.haken) {
              <input type="checkbox" [id]="'vorabend-' + p.haken" [checked]="p.ok" (change)="haken(p.haken, $any($event.target).checked)" />
            } @else {
              <mat-icon>{{ p.ok ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
            }
            <span>
              @if (p.haken) {
                <label [for]="'vorabend-' + p.haken">{{ p.text }}</label>
                @if (p.ziel && !p.ok) { <a class="weiter" [routerLink]="['/backstage', id(), p.ziel]">öffnen</a> }
              } @else if (p.aktion && !p.ok) {
                {{ p.text }}
                <button type="button" class="vorladen" (click)="vorladen()" [disabled]="laedt()">{{ laedt() ? 'Lädt …' : 'Jetzt vorladen' }}</button>
              } @else if (p.ziel !== undefined && !p.ok) { <a [routerLink]="p.ziel ? ['/backstage', id(), p.ziel] : ['/backstage', id()]">{{ p.text }}</a> } @else { {{ p.text }} }
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
    .vorladen { margin-left: 8px; padding: 2px 10px; border-radius: 999px; border: 1px solid var(--bn-sunset); background: none; color: var(--bn-sunset); font: inherit; font-size: .8rem; cursor: pointer; }
    li input { flex: none; width: 18px; height: 18px; margin: 2px 0 0; accent-color: #5fb88a; }
    label { cursor: pointer; }
    .weiter { margin-left: 8px; font-size: .8rem; }
    small { display: block; color: var(--bn-fog); font-size: .8rem; }
  `,
})
export class Bereitschaft {
  readonly show = input.required<Show>();
  /** Überschrift, z. B. „Weihnachtsmarkt in 37 Tagen“ (Übersicht); leer auf der Seite des Auftritts */
  readonly titel = input('');
  readonly aufgeklappt = input(false);
  /** gerade aufgeklappt? (Anfang: aufgeklappt, danach wie angetippt) */
  protected readonly auf = linkedSignal(() => this.aufgeklappt());
  private readonly band = inject(BandService);
  protected readonly id = computed(() => this.band.showId(this.show()));
  private readonly notenKeys = signal<Set<string> | undefined>(undefined);
  /** Songs, deren letzte Probennotiz nach Baustelle klingt */
  private readonly baustellen = new Set(notizBaustellen(probenNotizen()).map((b) => b.key));
  private readonly offline = signal<OfflineStand | undefined>(undefined);
  protected readonly laedt = signal(false);
  /** von Hand abgehakte Vorabend-Punkte (Wetter, Notenmappe) – gespiegelt für die ganze Band */
  private readonly vorabend = signal(0);
  private vorabendLesen(id: string): string[] {
    try {
      const v = JSON.parse(localStorage.getItem(VORABEND_PREFIX + id) ?? '[]');
      return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
  protected haken(h: string, an: boolean): void {
    const id = this.id();
    const neu = this.vorabendLesen(id).filter((x) => x !== h).concat(an ? [h] : []);
    try {
      if (neu.length) localStorage.setItem(VORABEND_PREFIX + id, JSON.stringify(neu));
      else localStorage.removeItem(VORABEND_PREFIX + id);
    } catch {
      // ohne Speicher bleibt der Haken nur bis zum Neuladen
    }
    this.vorabend.update((n) => n + 1);
  }

  constructor() {
    alleSongNoten()
      .then((n) => this.notenKeys.set(new Set(Object.keys(n))))
      .catch(() => undefined);
    offlineStand().then((s) => this.offline.set(s));
  }

  protected async vorladen(): Promise<void> {
    this.laedt.set(true);
    try {
      this.offline.set(await offlineVorladen());
    } finally {
      this.laedt.set(false);
    }
  }

  protected readonly punkte = computed(() => {
    const id = this.id();
    const setlist = loadSetlist(id);
    const songs = setlist.filter((e) => !isPause(e)) as { title: string; artist: string }[];
    const pack = loadPackliste(PACKLISTE_PREFIX + id);
    const gesamt = GROUPS.reduce((n, g) => n + g.items.length, 0) + pack.custom.length;
    const noten = this.notenKeys();
    this.vorabend();
    datenStand();
    return bereitschaft({
      show: this.show(),
      heute: new Date().toISOString().slice(0, 10),
      setlist,
      ohneTonartTempo: songs.filter((s) => { const i = songInfo(s.title, s.artist); return !i?.tonart || !i?.bpm; }).map((s) => s.title),
      ohneNoten: noten && songs.filter((s) => !noten.has(`${s.title}|${s.artist}`)).map((s) => s.title),
      vorort: loadVorOrt(VORORT_PREFIX + id),
      werbungErledigt: erledigteSchritte(id),
      packliste: { eingepackt: Math.min(pack.checked.length, gesamt), gesamt },
      offline: this.offline(),
      vorabend: this.vorabendLesen(id),
      setlistCheck: {
        langsamStrecken: langsamStrecken(setlist, (s) => songInfo(s.title, s.artist)?.bpm),
        spruenge: spruenge(setlist, (s) => gespielteTonart(songInfo(s.title, s.artist))),
        baustellen: songs.filter((s) => this.baustellen.has(`${s.title}|${s.artist}`)).map((s) => s.title),
      },
    });
  });
  protected readonly offen = computed(() => this.punkte().filter((p) => !p.ok).length);
}
