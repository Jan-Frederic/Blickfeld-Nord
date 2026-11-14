import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Zurueck } from '../zurueck';
import { auffrischenAnmelden } from '../data/neu-zeichnen';
import { LISTEN, ListenWahl, listenFiltern, songAbgleich } from '../data/playlisten';
import { alleSongNoten } from '../data/noten';
import { Entry, durationOf, isPause, setLength, setTime, setsOf, songTime } from '../data/setlist-data';
import { songInfoText } from '../data/songinfo';
import { Sammlung, alleSammlungen, sammlungLoeschen, sammlungSetzen, sammlungSongs, sammlungUmbenennen, sammlungen, sammlungenNeuLaden, songKey } from '../data/sammlungen';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Backstage → Songs → Sammlungen: alle Sammlungen (data/sammlungen.ts) – anlegen, umbenennen, löschen – und je Sammlung
// eine eigene Unterseite (…/sammlungen?name=…) zum Bearbeiten wie die Setlist eines Auftritts: Songs suchen oder per
// Listen-Chip wählen und hinzufügen, Reihenfolge mit Pfeilen, Pausen, entfernen. In der Setlist eines Auftritts wird
// eine Sammlung dann übernommen oder angehängt.
@Component({
  selector: 'app-songs-sammlungen',
  imports: [Zurueck, RouterLink, MatIconModule],
  template: `
    @if (aktiv(); as sm) {
      <section class="sammlung">
        <app-zurueck ziel="/backstage/songs/sammlungen" text="Alle Sammlungen" />
        <div class="head">
          <div>
            <p class="kicker">Sammlung{{ sm.fest ? ' · fest im Code, bearbeitet wird eine eigene Kopie' : '' }}</p>
            <h3>{{ sm.name }}</h3>
          </div>
          <span class="count">{{ songs(sm).length }} Songs@if (dauer(sm); as d) { · <strong>{{ d }}</strong> }</span>
          <div class="tools">
            <button type="button" (click)="pause()" [disabled]="!sm.entries.length"><mat-icon>coffee</mat-icon> Pause einfügen</button>
            <button type="button" (click)="umbenennen(sm.name)"><mat-icon>edit</mat-icon> Umbenennen</button>
            <button type="button" (click)="loeschen(sm)"><mat-icon>{{ sm.fest ? 'restart_alt' : 'delete' }}</mat-icon> {{ sm.fest ? 'Zurücksetzen' : 'Löschen' }}</button>
          </div>
          @if (meldung(); as m) { <p class="meldung" role="status">{{ m }}</p> }
        </div>
        <div class="cols">
          <div class="pick">
            <div class="listen-chips" role="group" aria-label="Songs nach Spotify-Liste filtern">
              <button type="button" [attr.aria-pressed]="chip() && liste() === ''" (click)="waehlen('')">Alle</button>
              @for (l of listen; track l.key) {
                <button type="button" [attr.aria-pressed]="chip() && liste() === l.key" (click)="waehlen(l.key)"><mat-icon>{{ l.icon }}</mat-icon> {{ l.label }}</button>
              }
              <button type="button" [attr.aria-pressed]="chip() && liste() === 'ohne'" (click)="waehlen('ohne')">Ohne Liste</button>
            </div>
            <label class="search">
              <mat-icon aria-hidden="true">search</mat-icon>
              <input type="search" placeholder="Song suchen …" aria-label="Songs für die Sammlung suchen" [value]="query()" (input)="query.set($any($event.target).value)" />
            </label>
            @if (!chip() && !query().trim()) {
              <p class="zu">Songs hinzufügen: suchen oder oben eine Liste wählen.</p>
            } @else {
              <button type="button" class="zu-knopf" (click)="chip.set(false); query.set('')"><mat-icon>expand_less</mat-icon> Songliste schließen</button>
              <ul class="songs">
                @for (t of verfuegbar(); track t.key) {
                  <li><button type="button" (click)="hinzu(t)" [attr.aria-label]="t.title + ' ' + t.artist + ' – zur Sammlung hinzufügen'">
                    <span class="song"><span class="t">{{ t.title }}</span>&ngsp;<span class="a">{{ t.artist }}</span></span><mat-icon>add</mat-icon>
                  </button></li>
                } @empty { <li class="none">Keine weiteren Songs gefunden.</li> }
              </ul>
            }
          </div>
          <ol class="list">
            @for (e of sm.entries; track $index; let i = $index, first = $first, last = $last) {
              <li [class.pause]="pauseIst(e)">
                @if (pauseIst(e)) {
                  <span class="pause-label"><mat-icon>coffee</mat-icon> Pause</span>
                } @else {
                  <span class="no">{{ nummer(sm, i) }}</span>
                  <span class="song"><span class="t">{{ $any(e).title }}</span>&ngsp;<span class="a">{{ $any(e).artist }}</span>@if (info($any(e)); as x) {<span class="info">{{ x }}</span>}</span>
                  @if (laenge($any(e)); as d) { <span class="dur">{{ d }}</span> }
                }
                <span class="row-tools">
                  <button type="button" (click)="schieben(i, -1)" [disabled]="first" aria-label="Nach oben"><mat-icon>arrow_upward</mat-icon></button>
                  <button type="button" (click)="schieben(i, 1)" [disabled]="last" aria-label="Nach unten"><mat-icon>arrow_downward</mat-icon></button>
                  <button type="button" (click)="entfernen(i)" aria-label="Entfernen"><mat-icon>close</mat-icon></button>
                </span>
              </li>
            } @empty {
              <li class="empty">Noch leer – links Songs suchen oder eine Liste wählen.</li>
            }
          </ol>
        </div>
      </section>
    } @else {
      @if (name() && !aktiv()) { <p class="meldung fehlt">Die Sammlung „{{ name() }}“ gibt es (auf diesem Gerät) nicht.</p> }
      <ul class="karten">
        @for (s of alle(); track s.name) {
          <li>
            <a [routerLink]="[]" [queryParams]="{ name: s.name }">
              <span class="titel"><mat-icon>bookmarks</mat-icon> {{ s.name }}</span>
              <span class="info">{{ songs(s).length }} Songs@if (dauer(s); as d) { · {{ d }} }{{ s.fest ? ' · fest' : '' }}</span>
              <span class="vorschau">{{ vorschau(s) }}</span>
            </a>
          </li>
        }
      </ul>
      <form class="neu" (submit)="anlegen($event, neuName.value); neuName.value = ''">
        <label>Neue Sammlung <input #neuName maxlength="60" placeholder="z. B. Kneipe Set 1" aria-label="Name der neuen Sammlung" /></label>
        <button type="submit"><mat-icon>add</mat-icon> Anlegen</button>
      </form>
      @if (meldung(); as m) { <p class="meldung" role="status">{{ m }}</p> }
    }
  `,
})
export class SongsSammlungen {
  /** gewählte Sammlung (?name=…) – leer: Übersicht aller Sammlungen */
  readonly name = input<string>('');
  private readonly router = inject(Router);
  protected readonly alle = computed(() => sammlungen());
  protected readonly aktiv = computed(() => this.alle().find((s) => s.name === this.name()));
  protected readonly meldung = signal('');

  protected readonly listen = LISTEN;
  protected readonly liste = signal<ListenWahl>('');
  protected readonly chip = signal(false);
  protected readonly query = signal('');
  private readonly notenKeys = signal<string[]>([]);
  private readonly alleSongs = computed(() => songAbgleich(LISTEN, this.notenKeys()));
  protected readonly verfuegbar = computed(() => {
    const sm = this.aktiv();
    const drin = new Set(sm ? sammlungSongs(sm).map(songKey) : []);
    const q = norm(this.query().trim());
    return listenFiltern(this.alleSongs(), this.liste()).filter((t) => !drin.has(t.key) && (!q || norm(`${t.title} ${t.artist}`).includes(q)));
  });

  constructor() {
    alleSongNoten()
      .then((n) => this.notenKeys.set(Object.entries(n).filter(([, x]) => x.pdfs?.length || x.chordpro).map(([k]) => k)))
      .catch(() => undefined);
    // neue Daten der Band: Sammlungen neu einlesen statt die Seite neu aufzubauen
    inject(DestroyRef).onDestroy(auffrischenAnmelden(() => sammlungenNeuLaden()));
  }

  protected songs(s: Sammlung) {
    return sammlungSongs(s);
  }
  protected dauer(s: Sammlung): string {
    const sek = setsOf(s.entries).reduce((n, x) => n + setLength(x).seconds, 0);
    return sek ? setTime(sek) : '';
  }
  protected vorschau(s: Sammlung): string {
    const t = sammlungSongs(s).map((x) => x.title);
    return t.length ? t.slice(0, 4).join(' · ') + (t.length > 4 ? ' …' : '') : 'noch leer';
  }
  protected pauseIst(e: Entry): boolean {
    return isPause(e);
  }
  protected nummer(s: Sammlung, i: number): number {
    return s.entries.slice(0, i + 1).filter((e) => !isPause(e)).length;
  }
  protected info(s: { title: string; artist: string }): string {
    return songInfoText(s.title, s.artist);
  }
  protected laenge(s: { title: string; artist: string }): string | null {
    const d = durationOf(s);
    return d ? songTime(d) : null;
  }
  protected waehlen(l: ListenWahl): void {
    this.liste.set(l);
    this.chip.set(true);
  }

  private aendern(f: (e: Entry[]) => Entry[]): void {
    const sm = this.aktiv();
    if (sm) sammlungSetzen(sm.name, f([...sm.entries]));
  }
  protected hinzu(t: { title: string; artist: string }): void {
    this.aendern((e) => [...e, { title: t.title, artist: t.artist }]);
    this.meldung.set(`${t.title} hinzugefügt ✓`);
  }
  protected pause(): void {
    this.aendern((e) => (e.length && !isPause(e[e.length - 1]) ? [...e, { pause: true }] : e));
  }
  protected schieben(i: number, r: -1 | 1): void {
    this.aendern((e) => {
      const j = i + r;
      if (j < 0 || j >= e.length) return e;
      [e[i], e[j]] = [e[j], e[i]];
      return e;
    });
  }
  protected entfernen(i: number): void {
    this.aendern((e) => e.filter((_, j) => j !== i));
  }

  protected anlegen(ev: Event, roh: string): void {
    ev.preventDefault();
    const name = roh.trim();
    if (!name) return;
    if (alleSammlungen().some((x) => x.name.toLowerCase() === name.toLowerCase())) {
      this.meldung.set(`„${name}“ gibt es schon.`);
      return;
    }
    sammlungSetzen(name, []);
    this.meldung.set('');
    void this.router.navigate([], { queryParams: { name } });
  }
  protected umbenennen(alt: string): void {
    const neu = prompt('Neuer Name der Sammlung:', alt)?.trim();
    if (!neu || neu === alt) return;
    if (alleSammlungen().some((x) => x.name.toLowerCase() === neu.toLowerCase())) {
      this.meldung.set(`„${neu}“ gibt es schon.`);
      return;
    }
    sammlungUmbenennen(alt, neu);
    void this.router.navigate([], { queryParams: { name: neu }, replaceUrl: true });
  }
  protected loeschen(sm: Sammlung): void {
    if (!confirm(sm.fest ? `Änderungen an der festen Sammlung „${sm.name}“ verwerfen?` : `Sammlung „${sm.name}“ löschen? Setlists, die sie übernommen haben, bleiben.`)) return;
    sammlungLoeschen(sm.name);
    if (sm.fest) this.meldung.set('Zurückgesetzt ✓');
    else void this.router.navigate([], { queryParams: {} });
  }
}
