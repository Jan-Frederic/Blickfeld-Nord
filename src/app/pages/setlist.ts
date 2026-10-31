import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AuftrittVorbereiten } from './auftritt-vorbereiten';
import data from '../data/repertoire.json';
import { LISTEN, ListenKey, ListenWahl, listeInReihenfolge, listenFiltern, listenZahlen, songAbgleich } from '../data/playlisten';
import { alleSongNoten } from '../data/noten';
import { SetlistVorlagen } from './setlist-vorlagen';
import { SetlistVorschlag } from './setlist-vorschlag';
import { SetlistBuehne } from './setlist-buehne';
import { TempoVerlauf } from './tempo-verlauf';
import { Entry, SETLIST_PREFIX, durationOf, isPause, loadSetlist, setLength, setTime, setsOf, songTime } from '../data/setlist-data';
import { gespielteTonart, songInfo, songInfoText } from '../data/songinfo';
import { glaetten, sprungHinweis, spruenge } from '../data/tonart-uebergang';
import { setlistAusHash, setlistLink } from '../data/setlist-link';
import { BandService } from '../data/band.service';
import { abwechslung, hierGespielt } from '../data/abwechslung';

// Setlist pro Auftritt (Backstage): Songs aus dem Repertoire per Klick übernehmen, sortieren, Pausen zwischen
// den Sets einfügen und als großformatige Bühnen-Setlist drucken bzw. als PDF speichern.
// Gespeichert nur im Browser dieses Geräts (localStorage, je Auftritt).

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

@Component({
  selector: 'app-setlist',
  imports: [AuftrittVorbereiten, MatIconModule, SetlistVorlagen, SetlistVorschlag, SetlistBuehne, TempoVerlauf],
  template: `
    <section class="setlist" aria-labelledby="setlist-title">
      <div class="head">
        <div>
          <p class="kicker">Für diesen Auftritt</p>
          <h3 id="setlist-title">Setlist</h3>
        </div>
        <span class="count">
          {{ songCount() }} Songs · {{ sets().length }} {{ sets().length === 1 ? 'Set' : 'Sets' }}
          @if (total().seconds) { · <strong>{{ time(total().seconds) }}</strong>@if (total().missing) { <span title="Songs ohne Längenangabe von Spotify"> + {{ total().missing }} ohne Länge</span>} }
        </span>
        <div class="spielzeit">
          <label>Spielzeit <input type="number" min="10" max="600" step="5" inputmode="numeric" placeholder="–" aria-label="Geplante Spielzeit in Minuten (Musik ohne Pausen)" [value]="ziel() || ''" (change)="zielSetzen($any($event.target).value)" /> Min.</label>
          @if (ziel()) {
            <span [class.zu-lang]="rest() < 0">{{ rest() >= 0 ? 'noch ' + time(rest()) + ' frei' : time(-rest()) + ' zu lang' }}</span>
            @for (t of auffuellen(); track t.key) {
              <button type="button" (click)="add(t)" [attr.aria-label]="t.title + ' hinzufügen'"><mat-icon>add</mat-icon> {{ t.title }} <small>{{ length(t) }}</small></button>
            }
          }
        </div>
        <div class="tools">
          <button type="button" class="primary" (click)="stage.set(true)" [disabled]="!songCount()"><mat-icon>fit_screen</mat-icon> Bühnen-Modus</button>
          <button type="button" (click)="addPause()" [disabled]="!entries().length"><mat-icon>coffee</mat-icon> Pause einfügen</button>
          <button type="button" (click)="print()" [disabled]="!songCount()"><mat-icon>print</mat-icon> Drucken / PDF</button>
          <button type="button" (click)="share()" [disabled]="!songCount()"><mat-icon>{{ copied() ? 'check' : 'send' }}</mat-icon> {{ copied() ? 'Kopiert!' : 'An die Band' }}</button>
          <button type="button" (click)="linkTeilen()" [disabled]="!songCount()"><mat-icon>{{ linkKopiert() ? 'check' : 'link' }}</mat-icon> {{ linkKopiert() ? 'Link kopiert!' : 'Als Link' }}</button>
          <button type="button" (click)="clear()" [disabled]="!entries().length"><mat-icon>delete_sweep</mat-icon> Leeren</button>
        </div>
        <app-auftritt-vorbereiten [entries]="entries()" [titel]="title() || 'Setlist'" />
      </div>

      @if (importiert()) { <p class="importiert"><mat-icon>check_circle</mat-icon> Setlist aus dem Link übernommen.</p> }
      <div class="cols">
        <div class="pick">
          <div class="listen-chips" role="group" aria-label="Songs nach Spotify-Liste filtern">
            <button type="button" [attr.aria-pressed]="liste() === ''" (click)="liste.set('')">Alle</button>
            @for (l of listen; track l.key) {
              <button type="button" [attr.aria-pressed]="liste() === l.key" (click)="liste.set(l.key)" [attr.aria-label]="l.label + ' (' + (zahlen()[l.key] || 0) + ')'"><mat-icon>{{ l.icon }}</mat-icon> {{ l.label }}</button>
            }
            <button type="button" [attr.aria-pressed]="liste() === 'ohne'" (click)="liste.set('ohne')">Ohne Liste</button>
          </div>
          @if (liste() === 'setlist' || liste() === 'probe') {
            <button type="button" class="aus-liste" (click)="listeUebernehmen()"><mat-icon>playlist_add</mat-icon> Ganze Liste „{{ listeVon($any(liste())).label }}“ in dieser Reihenfolge übernehmen</button>
          }
          <label class="search">
            <mat-icon aria-hidden="true">search</mat-icon>
            <input type="search" placeholder="Song suchen …" aria-label="Songs durchsuchen"
                   [value]="query()" (input)="query.set($any($event.target).value)" />
          </label>
          <ul class="songs">
            @for (t of available(); track t.title + t.artist) {
              <li>
                <button type="button" (click)="add(t)" [attr.aria-label]="t.title + ' zur Setlist hinzufügen'">
                  <span class="song"><span class="t">{{ t.title }}</span>&ngsp;<span class="a">{{ t.artist }}</span>@for (k of t.listen; track k) {<mat-icon class="liste" [attr.title]="listeVon(k).label" aria-hidden="true">{{ listeVon(k).icon }}</mat-icon>}</span><mat-icon>add</mat-icon>
                </button>
              </li>
            } @empty {
              <li class="none">Keine weiteren Songs gefunden.</li>
            }
          </ul>
        </div>

        <ol class="list">
          @for (e of entries(); track $index; let i = $index, first = $first, last = $last) {
            <li [class.pause]="isPause(e)">
              @if (isPause(e)) {
                <span class="pause-label"><mat-icon>coffee</mat-icon> Pause @if (setBefore(i); as l) {<span class="set-time">· Set davor {{ time(l.seconds) }}</span>}</span>
              } @else {
                <span class="no">{{ number(i) }}</span>
                <span class="song"><span class="t">{{ $any(e).title }}</span>&ngsp;<span class="a">{{ $any(e).artist }}</span>@if ($any(e).wunsch !== undefined) {&ngsp;<span class="wunsch">♥ {{ $any(e).wunsch || 'Wunsch' }}</span>}@if (info($any(e)); as i) {<span class="info">{{ i }}</span>}@if ($any(e).notiz) {<span class="info" style="color: #9ccc9c">✎ {{ $any(e).notiz }}</span>}@if (hier().get($any(e).title + '|' + $any(e).artist); as d) {<span class="sprung" style="color: #e8a46a">↺ hier schon am {{ datum(d) }} gespielt</span>}@if (sprung(i); as sp) {<span class="sprung" title="Großer Tonartwechsel ohne Pause – Überleitung über den Dominantseptakkord der neuen Tonart oder umsortieren">⚡ Tonartsprung {{ sp }}</span>}</span>
                @if (length($any(e)); as d) { <span class="dur">{{ d }}</span> }
              }
              <span class="row-tools">
                @if (!isPause(e)) {
                  <button type="button" (click)="wunsch(i)" [class.on]="$any(e).wunsch !== undefined" [attr.aria-pressed]="$any(e).wunsch !== undefined" aria-label="Als Wunsch markieren"><mat-icon>favorite</mat-icon></button>
                  <button type="button" (click)="notiz(i)" [class.on]="!!$any(e).notiz" aria-label="Notiz für diesen Auftritt" title="Notiz für diesen Auftritt, z. B. „Schluss zweimal“"><mat-icon>edit_note</mat-icon></button>
                }
                <button type="button" (click)="move(i, -1)" [disabled]="first" aria-label="Nach oben"><mat-icon>arrow_upward</mat-icon></button>
                <button type="button" (click)="move(i, 1)" [disabled]="last" aria-label="Nach unten"><mat-icon>arrow_downward</mat-icon></button>
                <button type="button" (click)="remove(i)" aria-label="Entfernen"><mat-icon>close</mat-icon></button>
              </span>
            </li>
          } @empty {
            <li class="empty">Noch leer – links Songs antippen, um sie hinzuzufügen.</li>
          }
          @if (sets().length > 1 && lastSet(); as l) {
            <li class="set-end"><span class="set-time">Letztes Set {{ time(l.seconds) }}</span></li>
          }
        </ol>
      </div>
      @if (sprungZahl(); as n) {
        <div class="tools uebergaenge">
          ⚡ {{ n }} {{ n === 1 ? 'Tonartsprung' : 'Tonartsprünge' }} innerhalb der Sets
          <button type="button" (click)="glaetten()"><mat-icon>auto_fix_high</mat-icon> Übergänge glätten</button>
          @if (glattMeldung(); as m) { <span role="status">{{ m }}</span> }
        </div>
      }
      @if (hierZahl(); as n) {
        <div class="tools uebergaenge" style="color: #e8a46a">
          ↺ {{ n }} {{ n === 1 ? 'Song lief' : 'Songs liefen' }} hier schon beim letzten Mal
          <button type="button" (click)="abwechseln()"><mat-icon>shuffle</mat-icon> Für Abwechslung tauschen</button>
        </div>
      }
      <app-tempo-verlauf [sets]="sets()" />
      <app-setlist-vorschlag [entries]="entries()" [show]="show()" (apply)="replace($event)" />
      <app-setlist-vorlagen [entries]="entries()" (apply)="replace($event)" />
      @if (stage()) { <app-setlist-buehne [entries]="entries()" [show]="show()" (closed)="stage.set(false)" /> }
      <p class="hint">Die Setlist wird pro Auftritt nur in diesem Browser auf diesem Gerät gespeichert.</p>
    </section>
  `,
  styles: `
    .setlist { margin-top: 48px; padding: 24px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    .head { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px 24px; margin-bottom: 18px; }
    .head .kicker { margin-bottom: 4px; }
    h3 { font-family: var(--bn-display); font-weight: 400; font-size: 1.3rem; text-transform: uppercase; letter-spacing: .08em; margin: 0; }
    .count { font-size: .85rem; color: var(--bn-fog); }
    .importiert { display: flex; align-items: center; gap: 6px; margin: 0 0 12px; color: #5fb88a; font-size: .9rem; }
    .count strong { color: var(--bn-sunset); font-weight: 600; }
    .dur { margin-left: auto; font-size: .78rem; color: var(--bn-fog); font-variant-numeric: tabular-nums; }
    .set-time { font-size: .78rem; color: var(--bn-sunset); text-transform: none; letter-spacing: normal; }
    .set-end { justify-content: flex-end; border: 0 !important; }
    .dur + .row-tools { margin-left: 8px; }
    .wunsch { color: #e57373; font-size: .8rem; white-space: nowrap; } .row-tools .on, .sprung, .uebergaenge { color: #e57373; }
    .tools { margin-left: auto; display: flex; flex-wrap: wrap; gap: 8px; }
    .tools button {
      display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; cursor: pointer;
      border: 1px solid var(--bn-line); background: transparent; color: var(--bn-ink); font: inherit; font-size: .85rem;
    }
    .tools button.primary { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    .tools button:hover:not(:disabled) { border-color: var(--bn-sunset); }
    .tools button:disabled { opacity: .4; cursor: default; }
    .tools mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .cols { display: grid; gap: 20px; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); }
    @media (max-width: 760px) { .cols { grid-template-columns: minmax(0, 1fr); } .tools { margin-left: 0; } }
    .search { display: flex; align-items: center; gap: 6px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--bn-line); }
    .search:focus-within { border-color: var(--bn-sunset); }
    .search mat-icon { color: var(--bn-fog); font-size: 20px; width: 20px; height: 20px; }
    .search input { flex: 1; min-width: 0; border: 0; background: transparent; color: var(--bn-ink); font: inherit; padding: 9px 0; outline: none; }
    ul, ol { list-style: none; margin: 0; padding: 0; }
    .songs { margin-top: 10px; max-height: 420px; overflow-y: auto; border-top: 1px solid var(--bn-line); }
    .songs button {
      all: unset; box-sizing: border-box; width: 100%; display: flex; align-items: baseline; gap: 10px; padding: 9px 4px;
      border-bottom: 1px solid var(--bn-line); cursor: pointer;
    }
    .songs button:hover, .songs button:focus-visible { color: var(--bn-sunset); }
    .songs mat-icon { margin-left: auto; font-size: 18px; width: 18px; height: 18px; align-self: center; color: var(--bn-fog); }
    .t { font-weight: 500; }
    /* lange Titel und Interpreten umbrechen statt aus der Box zu laufen */
    .t, .a { min-width: 0; overflow-wrap: anywhere; }
    .a { color: var(--bn-fog); font-size: .88rem; }
    .list { border: 1px solid var(--bn-line); border-radius: 10px; padding: 4px 12px; min-height: 120px; }
    .list li { display: flex; align-items: baseline; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--bn-line); }
    .song { flex: 1; min-width: 0; }
    /* Tonart · Tempo · Notiz als eigene Zeile unter dem Titel – neben dem Titel quetscht sie ihn auf dem Handy zusammen */
    .song .info, .sprung { display: block; margin-top: 2px; font-size: .78rem; color: var(--bn-sunset); }
    .uebergaenge { margin: 14px 0 0; font-size: .85rem; }
    .list li:last-child { border-bottom: 0; }
    .no { min-width: 1.8em; color: var(--bn-sunset); font-variant-numeric: tabular-nums; }
    .pause-label { display: inline-flex; align-items: center; gap: 6px; color: var(--bn-sunset); font-family: var(--bn-wide); font-size: .72rem; letter-spacing: .16em; text-transform: uppercase; }
    .pause-label mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .row-tools { margin-left: auto; display: inline-flex; gap: 2px; align-self: center; }
    .row-tools button { display: grid; place-items: center; padding: 3px; border: 0; background: transparent; color: var(--bn-fog); cursor: pointer; }
    .row-tools button:hover:not(:disabled) { color: var(--bn-sunset); }
    /* schmale Handys: Knöpfe in eine eigene Zeile unter den Song, damit Titel und Interpret die Breite bekommen */
    @media (max-width: 520px) {
      .list li { flex-wrap: wrap; row-gap: 0; }
      .list li .song { flex-basis: calc(100% - 90px); }
      .list li .row-tools, .dur + .row-tools { flex-basis: 100%; justify-content: flex-end; margin: -4px 0 0; }
    }
    .row-tools button:disabled { opacity: .3; cursor: default; }
    .row-tools mat-icon { font-size: 17px; width: 17px; height: 17px; }
    .empty, .none { color: var(--bn-fog); font-size: .9rem; padding: 12px 0; }
    .hint { margin: 16px 0 0; font-size: .8rem; color: var(--bn-fog); }
  `,
})
export class Setlist {
  /** Auftritts-ID (/backstage/:id) */
  readonly show = input.required<string>();
  /** Überschrift auf dem Ausdruck, z. B. „Gasthof Küpper · 22.08.2026“ */
  readonly title = input('');

  protected readonly query = signal('');
  protected readonly stage = signal(false);
  protected readonly entries = signal<Entry[]>([]);
  private readonly key = computed(() => SETLIST_PREFIX + this.show());

  // Setlist aus einem geteilten Link (#liste=…) – gleich beim Erzeugen gelesen, bevor die Adresse sich ändern kann
  private linkListe = typeof location === 'undefined' ? null : setlistAusHash(location.hash, data.tracks);

  constructor() {
    alleSongNoten()
      .then((n) => this.notenKeys.set(Object.entries(n).filter(([, x]) => x.pdfs?.length || x.chordpro).map(([k]) => k)))
      .catch(() => undefined);
    effect(() => {
      this.entries.set(loadSetlist(this.show()));
      try {
        this.ziel.set(Number(localStorage.getItem(this.zielKey())) || 0);
      } catch {
        this.ziel.set(0);
      }
      this.ausLink();
    });
  }

  // Setlist aus dem Link übernehmen – vorhandene Setlist nur nach Rückfrage ersetzen
  private ausLink(): void {
    const liste = this.linkListe;
    this.linkListe = null;
    if (!liste?.length) return;
    if (/[#&]liste=/.test(location.hash)) history.replaceState(history.state, '', location.pathname + location.search);
    const vorhanden = untracked(() => this.entries()).length;
    if (vorhanden && !confirm(`Setlist aus dem Link übernehmen (${liste.filter((e) => !this.isPause(e)).length} Songs)? Die bisherige Setlist auf diesem Gerät wird ersetzt.`)) return;
    untracked(() => this.replace(liste));
    this.importiert.set(true);
  }
  protected readonly importiert = signal(false);

  // Link mit der Setlist für die Band – öffnet diese Seite und übernimmt die Liste auf dem Gerät
  protected readonly linkKopiert = signal(false);
  protected async linkTeilen(): Promise<void> {
    const url = setlistLink(location.origin, this.show(), this.entries(), data.tracks);
    if (navigator.share) {
      navigator.share({ title: `Setlist – ${this.title()}`, url }).catch(() => undefined);
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      this.linkKopiert.set(true);
      setTimeout(() => this.linkKopiert.set(false), 2000);
    } catch {
      window.prompt('Link kopieren:', url);
    }
  }

  // „Hier schon gespielt“: Songs früherer Auftritte am selben Ort (Setlists auf diesem Gerät bzw. aus der Synchronisation)
  private readonly band = inject(BandService);
  protected readonly hier = computed(() => {
    const show = this.band.showById(this.show());
    return show ? hierGespielt(show, this.band.shows, (s) => loadSetlist(this.band.showId(s))) : new Map<string, string>();
  });
  protected readonly hierZahl = computed(() => this.entries().filter((e) => !this.isPause(e) && this.hier().has(`${(e as { title: string }).title}|${(e as { artist: string }).artist}`)).length);
  protected datum(d: string): string {
    return d.split('-').reverse().join('.');
  }
  protected abwechseln(): void {
    const r = abwechslung(this.entries(), this.hier(), data.tracks, (x) => songInfo(x.title, x.artist)?.bpm);
    if (!r.getauscht) return;
    if (confirm(`${r.getauscht} ${r.getauscht === 1 ? 'Song' : 'Songs'} gegen ${r.getauscht === 1 ? 'einen' : ''} hier noch nicht gespielte tauschen (ähnliches Tempo)?`)) this.replace(r.entries);
  }

  protected readonly songCount = computed(() => this.entries().filter((e) => !this.isPause(e)).length);

  protected readonly sets = computed(() => setsOf(this.entries()));

  // Spieldauer laut Spotify: gesamt, je Set (an der Pause danach) und fürs letzte Set
  protected readonly total = computed(() => setLength(this.sets().flat()));
  protected readonly lastSet = computed(() => {
    const sets = this.sets();
    return sets.length ? setLength(sets[sets.length - 1]) : null;
  });
  protected setBefore(index: number): { seconds: number } | null {
    const before = setsOf(this.entries().slice(0, index)).at(-1);
    return before ? setLength(before) : null;
  }
  // Tonart · Tempo · Notiz aus songinfo.ts
  protected info(s: { title: string; artist: string }): string {
    return songInfoText(s.title, s.artist);
  }

  // Tonart-Übergänge: großer Sprung im Quintenzirkel zum vorigen Song desselben Sets (z. B. „Ab → E“)
  private readonly tonartVon = (s: { title: string; artist: string }) => gespielteTonart(songInfo(s.title, s.artist));
  protected sprung(i: number): string | null {
    const a = this.entries()[i - 1];
    const b = this.entries()[i];
    if (!a || !b || isPause(a) || isPause(b)) return null;
    return sprungHinweis(this.tonartVon(a), this.tonartVon(b));
  }
  protected readonly sprungZahl = computed(() => spruenge(this.entries(), this.tonartVon));
  protected readonly glattMeldung = signal('');
  protected glaetten(): void {
    const neu = glaetten(this.entries(), this.tonartVon);
    const vorher = this.sprungZahl();
    const nachher = spruenge(neu, this.tonartVon);
    if (nachher >= vorher) {
      this.glattMeldung.set('Besser geht es mit diesen Songs nicht – ggf. eine Überleitung einplanen.');
      return;
    }
    if (!confirm(`Reihenfolge innerhalb der Sets nach Tonart ordnen? Tonartsprünge: ${vorher} → ${nachher}. Erster und letzter Song je Set bleiben.`)) return;
    this.glattMeldung.set('');
    this.replace(neu);
  }

  protected length(s: { title: string; artist: string }): string | null {
    const d = durationOf(s);
    return d ? songTime(d) : null;
  }
  protected readonly time = setTime;

  // Songs aller Spotify-Listen und eigenständige Songs (nur mit Noten auf dem Gerät, data/playlisten.ts) –
  // die noch nicht auf der Setlist stehen, gefiltert nach Liste und Suche
  protected readonly listen = LISTEN;
  protected readonly liste = signal<ListenWahl>('');
  private readonly notenKeys = signal<string[]>([]);
  private readonly alleSongs = computed(() => songAbgleich(LISTEN, this.notenKeys()));
  protected readonly zahlen = computed(() => listenZahlen(this.alleSongs()));
  private readonly listenNachKey = new Map(LISTEN.map((l) => [l.key, l]));
  protected listeVon(k: ListenKey) {
    return this.listenNachKey.get(k)!;
  }
  // Ziel-Spielzeit je Auftritt (Minuten Musik ohne Pausen, bn-spielzeit-<id>, mit der Band abgeglichen): wie viel
  // noch frei ist bzw. zu lang, dazu bis zu drei Songs, die in die Lücke passen (Website-Liste zuerst, dann längste)
  private readonly zielKey = computed(() => 'bn-spielzeit-' + this.show());
  protected readonly ziel = signal(0);
  protected readonly rest = computed(() => this.ziel() * 60 - this.total().seconds);
  protected readonly auffuellen = computed(() => {
    const frei = this.rest();
    if (frei < 120) return [];
    return this.available()
      .map((t) => ({ t, d: durationOf(t) ?? 0 }))
      .filter((x) => x.d && x.d <= frei)
      .sort((a, b) => Number(b.t.listen.includes('website')) - Number(a.t.listen.includes('website')) || b.d - a.d)
      .slice(0, 3)
      .map((x) => x.t);
  });
  protected zielSetzen(roh: string): void {
    const min = Math.round(Number(roh));
    this.ziel.set(min >= 10 && min <= 600 ? min : 0);
    try {
      if (this.ziel()) localStorage.setItem(this.zielKey(), String(this.ziel()));
      else localStorage.removeItem(this.zielKey());
    } catch {
      // ohne Speicher gilt das Ziel bis zum Neuladen
    }
  }

  /** Spotify-Liste (Setlist/Probe) als ganze Setlist übernehmen – ersetzt nach Rückfrage die bisherige */
  protected listeUebernehmen(): void {
    const l = this.liste() as ListenKey;
    const songs = listeInReihenfolge(l, this.alleSongs());
    if (!songs.length) return;
    if (this.songCount() && !confirm(`Setlist durch die ${songs.length} Songs der Spotify-Liste „${this.listeVon(l).label}“ ersetzen?`)) return;
    this.update(() => songs.map(({ title, artist }) => ({ title, artist })));
  }

  protected readonly available = computed(() => {
    const used = new Set(this.entries().map((e) => (this.isPause(e) ? '' : `${(e as { title: string }).title}|${(e as { artist: string }).artist}`)));
    const q = norm(this.query().trim());
    return listenFiltern(this.alleSongs(), this.liste()).filter((t) => !used.has(t.key) && (!q || norm(`${t.title} ${t.artist}`).includes(q)));
  });

  protected isPause(e: Entry): boolean {
    return isPause(e);
  }

  // Laufende Nummer innerhalb der ganzen Setlist (Pausen zählen nicht mit)
  protected number(index: number): number {
    return this.entries().slice(0, index + 1).filter((e) => !this.isPause(e)).length;
  }

  protected add(t: { title: string; artist: string }): void {
    this.update((l) => [...l, { title: t.title, artist: t.artist }]);
  }

  protected addPause(): void {
    this.update((l) => [...l, { pause: true }]);
  }

  protected move(i: number, dir: number): void {
    this.update((l) => {
      const next = [...l];
      [next[i], next[i + dir]] = [next[i + dir], next[i]];
      return next;
    });
  }

  // Herz: Wunsch mit Namen (Rückfrage) setzen oder wieder entfernen
  protected wunsch(i: number): void {
    const e = this.entries()[i] as { wunsch?: string };
    let wunsch: string | undefined;
    if (e.wunsch === undefined) {
      const name = prompt('Wer hat sich den Song gewünscht? (leer lassen = ohne Namen)');
      if (name === null) return;
      wunsch = name.trim().slice(0, 40);
    }
    this.update((l) => l.map((x, j) => (j === i ? { ...(x as object), wunsch } : x)) as Entry[]);
  }

  // Notiz nur für diesen Auftritt (z. B. „Schluss zweimal“, „Einstieg nur Gitarre“) – leer löscht sie
  protected notiz(i: number): void {
    const e = this.entries()[i] as { notiz?: string };
    const text = prompt('Notiz für diesen Auftritt (erscheint im Bühnen-Modus und in der Notenmappe):', e.notiz ?? '');
    if (text === null) return;
    const notiz = text.trim().slice(0, 80) || undefined;
    this.update((l) => l.map((x, j) => (j === i ? { ...(x as object), notiz } : x)) as Entry[]);
  }

  protected remove(i: number): void {
    this.update((l) => l.filter((_, j) => j !== i));
  }

  protected replace(entries: Entry[]): void {
    this.update(() => entries);
  }

  protected clear(): void {
    if (confirm('Setlist für diesen Auftritt wirklich leeren?')) this.update(() => []);
  }

  // Setlist als Text (Sets, nummerierte Songs mit Interpret) – Teilen-Menü, sonst Zwischenablage
  protected readonly copied = signal(false);
  protected async share(): Promise<void> {
    let n = 0;
    const text = [
      `Setlist – ${this.title()}`,
      ...this.sets().map((set, i) => {
        const sec = setLength(set).seconds;
        return [``, `SET ${i + 1}${sec ? ` (${setTime(sec)})` : ''}`, ...set.map((t) => `${++n}. ${t.title} – ${t.artist}${t.notiz ? ` (${t.notiz})` : ''}`)].join('\n');
      }),
    ].join('\n');
    if (navigator.share) {
      navigator.share({ title: `Setlist – ${this.title()}`, text }).catch(() => undefined);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      window.prompt('Setlist kopieren:', text);
    }
  }

  // Druckansicht in neuem Fenster: groß, schwarz auf weiß, ein Set pro Spalte – „Als PDF speichern“ im Druckdialog
  // Kleingedrucktes unter dem Titel auf dem Bühnen-Ausdruck: Tonart der Band mit Capo, bei einem Sprung die Überleitung
  private druckInfo(vorher: { title: string; artist: string } | undefined, s: { title: string; artist: string }): string {
    const i = songInfo(s.title, s.artist);
    const teile = [gespielteTonart(i), i?.capo && `Capo ${i.capo}`, (s as { notiz?: string }).notiz && `✎ ${(s as { notiz?: string }).notiz}`].filter(Boolean);
    const sprung = vorher ? sprungHinweis(this.tonartVon(vorher), this.tonartVon(s)) : null;
    if (sprung) teile.push(`⚡ ${sprung.split(' · ')[1]}`);
    return teile.length ? `<small>${esc(teile.join(' · '))}</small>` : '';
  }

  protected print(): void {
    const win = window.open('', '_blank');
    if (!win) return;
    let n = 0;
    const sets = this.sets()
      .map((set, i) => `<section><h2>Set ${i + 1}${setLength(set).seconds ? ` <small>${setTime(setLength(set).seconds)}</small>` : ''}</h2><ol>${set.map((t, j) => `<li value="${++n}">${esc(t.title)}${this.druckInfo(set[j - 1], t)}</li>`).join('')}</ol></section>`)
      .join('');
    win.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Setlist – ${esc(this.title())}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 3px solid #000; padding-bottom: 6px; margin-bottom: 14px; }
  header b { font-size: 20pt; letter-spacing: .06em; }
  header span { font-size: 12pt; }
  main { columns: ${Math.min(this.sets().length, 2)}; column-gap: 12mm; }
  section { break-inside: avoid; margin-bottom: 10mm; }
  h2 { font-size: 13pt; text-transform: uppercase; letter-spacing: .2em; margin: 0 0 4mm; }
  h2 small { font-size: 10pt; letter-spacing: .05em; text-transform: none; font-weight: normal; }
  ol { margin: 0; padding-left: 12mm; }
  li { font-size: 22pt; font-weight: bold; line-height: 1.35; }
  li::marker { font-size: 14pt; font-weight: normal; }
  li small { display: block; font-size: 11pt; font-weight: normal; line-height: 1.2; margin-bottom: 1.5mm; }
</style></head><body>
<header><b>BLICKFELD NORD</b><span>${esc(this.title())}</span></header>
<main>${sets}</main>
</body></html>`);
    win.document.close();
    // Drucken von hier aus starten – ein Skript im Fenster würde die Content-Security-Policy brauchen
    win.focus();
    win.print();
  }

  private update(fn: (l: Entry[]) => Entry[]): void {
    this.entries.update(fn);
    try {
      localStorage.setItem(this.key(), JSON.stringify(this.entries()));
    } catch {
      // Speichern nicht möglich – die Liste funktioniert trotzdem bis zum Neuladen
    }
  }
}
