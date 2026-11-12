import { Component, DestroyRef, ElementRef, computed, inject, input, linkedSignal, output, signal, viewChild, effect, untracked } from '@angular/core';
import { UebeStatus, eigenerStatus, statusLabel } from '../data/uebe-status';
import { AUFLEUCHTEN_MS, StatusSchalter } from './status-schalter';
import { SpotifySteuerung } from './spotify-steuerung';
import { SpotifySpieler } from '../data/spotify-spieler';
import { spotifyArt } from '../data/spotify-remote';
import { browserVollbild } from '../data/vollbild';
import { ladeIch } from '../data/band-ich';
import { MatIconModule } from '@angular/material/icon';
import { Entry, durationOf, isPause, setLength, setTime, setsOf, songTime } from '../data/setlist-data';
import { gespielteTonart, songInfo } from '../data/songinfo';
import { alleSongNoten, pdfjsVorladen } from '../data/noten';
import { NotenAnzeige } from './noten-anzeige';
import { ProbeEnde, ProbeLeiste, probeStatusSetzen } from './probe-leiste';
import { minutenText, probenDauer } from '../data/probe-modus';
import { BandService } from '../data/band.service';
import { Stimmgeraet } from './stimmgeraet';
import { tasten } from '../data/buehne-einstellungen';
import { BEWERTUNG_PREFIX, alleBewertungen, bewerten, ladeBewertungen, rangliste, songKey } from '../data/bewertung';
import { RestSong, streichVorschlag, ueberzug } from '../data/kuerzen';
import { wunschEinfuegen } from '../data/buehne-wunsch';
import { LISTEN, songAbgleich, vergleichsKey } from '../data/playlisten';
import { DomSanitizer } from '@angular/platform-browser';

// Bühnen-Modus: Setlist im Vollbild für Tablet/Handy am Mikroständer. Großer aktueller Song, danach der nächste;
// weiter per Tippen rechts, Wischen oder Pfeiltaste, zurück per Tippen links. Der Bildschirm bleibt an (Wake Lock),
// die Uhr zeigt, wie lange das Set schon läuft und wie lange es laut Spotify-Längen noch dauert.
// Tonart (die der Band, mit Capo) und Tempo aus songinfo.ts stehen unter dem Titel; „Klick“ blinkt im Tempo,
// der Ton dazu ist eigens zuschaltbar (bn-buehne-ton) – auf der Bühne reicht meist das Blinken. „1-2-3-4“ zählt ein.
// Eine Notiz für diesen Auftritt (Setlist → ✎) steht grün unter dem Titel.
// Sterne (oder Tasten 1–5) bewerten, wie der Song an diesem Abend lief – Rangliste unter Backstage → Zahlen.
const ZOOM_KEY = 'bn-buehne-zoom';
const TON_KEY = 'bn-buehne-ton';
function ladeTon(): boolean {
  try {
    return localStorage.getItem(TON_KEY) === '1';
  } catch {
    return false;
  }
}
function ladeZoom(): number {
  try {
    const z = Number(localStorage.getItem(ZOOM_KEY));
    return z >= 0.7 && z <= 1.6 ? z : 1;
  } catch {
    return 1;
  }
}

/** so lange lässt sich die letzte Status-Wahl im Übe-Modus zurücknehmen */
const ZURUECK_MS = 6000;

import { einzaehlFolge, einzaehlText, einzaehlUnterteilung, schlaegeJeTakt, taktHinweis } from '../data/takt';
@Component({
  selector: 'app-setlist-buehne',
  imports: [MatIconModule, NotenAnzeige, Stimmgeraet, ProbeLeiste, ProbeEnde, StatusSchalter, SpotifySteuerung],
  host: { tabindex: '-1', '(keydown)': 'key($event)' },
  template: `
    <div class="stage" (pointerdown)="down($event)" (pointerup)="up($event)" (touchstart)="wischStart($event)" (touchend)="wischEnde($event)" [style.--zoom]="zoom()">
      <header>
        <span class="set">@if (anlass()) { <span class="anlass">{{ anlass() }}</span> }{{ ueben() ? 'Karte ' + (index() + 1) + ' / ' + liste().length : probe() && !generalprobe() ? 'Song ' + songNo() + ' / ' + songZahl() : setKopf() }}</span>
        <span class="clock" [class.over]="remaining() < 0" [class.still]="ueben()">
          <mat-icon>timer</mat-icon> {{ fmt(elapsed()) }}
          @if (planned()) { <small>/ {{ plannedText() }} · {{ remaining() < 0 ? '+' + fmt(-remaining()) : 'noch ' + (probe() && !generalprobe() ? minutenText(remaining()) : fmt(remaining())) }}</small> }
        </span>
        <!-- Reihenfolge: Werkzeuge (Schrift, Stimmgerät, Wunsch-Suche) – Navigation (Song-Liste) – Noten – Beenden.
             Im Übe-Modus ohne Wunsch-Suche; die Song-Liste zeigt dort die Karten. -->
        <span class="zoom" role="group" aria-label="Schriftgröße">
          <button type="button" (click)="zoomen(-1)" [disabled]="zoom() <= ZOOM_MIN" aria-label="Schrift kleiner">A−</button>
          <button type="button" (click)="zoomen(1)" [disabled]="zoom() >= ZOOM_MAX" aria-label="Schrift größer">A+</button>
        </span>
        <button type="button" class="close" (click)="stimmen.set(!stimmen()); $event.stopPropagation()" [attr.aria-pressed]="stimmen()" aria-label="Stimmgerät" title="Stimmgerät"><mat-icon>tune</mat-icon></button>
        @if (!ueben()) {
          <button type="button" class="close lupe" (click)="lupeAuf($event)" [attr.aria-pressed]="lupe()" aria-label="Song suchen (Wunsch)" title="Song suchen – kommt jetzt dran"><mat-icon>search</mat-icon></button>
        }
        <button type="button" class="close liste-knopf" (click)="navUmschalten($event)" [attr.aria-pressed]="nav()" [attr.aria-label]="ueben() ? 'Alle Karten' : 'Alle Songs der Setlist'" title="Alle Songs – zum Springen antippen"><mat-icon>format_list_numbered</mat-icon></button>
        @if (notenSongs().size || notenAuf()) {
          <button type="button" class="noten-knopf" (click)="notenUmschalten($event)" [attr.aria-pressed]="notenOffen()" aria-label="Noten anzeigen" title="Noten – oder nach oben wischen">
            <mat-icon>library_music</mat-icon><span class="noten-text">Noten</span>
          </button>
        }
        <button type="button" class="close" (click)="end($event)" [attr.aria-label]="probe() ? 'Probe-Modus beenden' : ueben() ? 'Übe-Modus beenden' : 'Bühnen-Modus beenden'"><mat-icon>close</mat-icon></button>
      </header>

      <main>
        @if (current(); as c) {
          @if (isPause(c)) {
            <p class="pause"><mat-icon>coffee</mat-icon> Pause</p>
            <p class="hint">Weiter mit Set {{ setNo() + 1 }}</p>
          } @else {
            <p class="no">{{ songNo() }}</p>
            <h1>{{ $any(c).title }}</h1>
            <p class="artist">{{ $any(c).artist }} @if (length(c)) { · {{ length(c) }} }</p>
            @if ($any(c).wunsch !== undefined) { <p class="wunsch">♥ {{ $any(c).wunsch ? 'Wunsch von ' + $any(c).wunsch : 'Publikumswunsch' }}</p> }
            @if ($any(c).notiz) { <p class="wunsch heute" style="color: #9ccc9c">✎ {{ $any(c).notiz }}</p> }
            @if (info(); as i) {
              <p class="info">
                @if (tonart(i); as t) { <span class="key" title="Tonart">{{ t }}</span> }
                @if (i.capo) { <span class="capo">Capo {{ i.capo }}</span> }
                @if (i.bpm) {
                  <button type="button" class="bpm" [class.on]="klick()" [class.beat]="beat()" [class.eins]="eins()" (click)="toggleKlick($event)" [attr.aria-pressed]="klick()">
                    {{ klickBpm() }} bpm@if (taktText(); as t) { · {{ t }}} · Klick
                  </button>
                  <button type="button" class="ton" (click)="einzaehlen($event)" [attr.aria-label]="'Einzählen ' + (taktText() || '4/4')" [title]="'Im Takt des Songs vorzählen (' + (taktText() || '4/4') + ')'">{{ einzaehlKnopf() }}</button>
                  @if (klick()) {
                    @if (ueben()) {
                      <!-- Übe-Modus: Tempo-Training steigert 70 → 80 → 90 → 100 %; „Sitzt“ gibt es erst bei 100 % -->
                      <button type="button" class="ton tempo" [class.on]="faktor() < 1" (click)="schneller($event)" [attr.aria-label]="'Tempo-Training ' + faktorText() + ', antippen für schneller'" title="Tempo-Training: 70 → 80 → 90 → 100 % – „Sitzt“ erst bei vollem Tempo">{{ faktorText() }} ↑</button>
                    } @else {
                      <button type="button" class="ton tempo" [class.on]="faktor() < 1" (click)="langsamer($event)" [attr.aria-label]="'Übungstempo ' + faktorText() + ', antippen für langsamer'" title="Zum Üben langsamer: 100 → 90 → 80 → 70 %">{{ faktorText() }}</button>
                    }
                    <button type="button" class="ton" [class.on]="ton()" (click)="toggleTon($event)" [attr.aria-pressed]="ton()" [attr.aria-label]="ton() ? 'Ton aus' : 'Ton an'">
                      <mat-icon>{{ ton() ? 'volume_up' : 'volume_off' }}</mat-icon>
                    </button>
                  }
                }
                @if (i.notiz) { <span class="note">{{ i.notiz }}</span> }
              </p>
            }
            <!-- Spotify im Übe- und Probe-Modus – je nach Einstellung (Einstellungen → Spotify, Standard: aus):
                 „fern“ steuert die Spotify-App (ganze Songs, Premium), „vorschau“ lädt auf Knopfdruck den eingebetteten Player -->
            @if (spotifyMoeglich() && spotifyArt === 'fern') {
              <app-spotify-steuerung />
            }
            @if (spotifyMoeglich() && spotifyArt === 'vorschau') {
              <p class="spotify-zeile"><button type="button" class="ton spotify-knopf" [class.on]="spotifyAn()" (click)="spotifyUmschalten($event)" [attr.aria-pressed]="spotifyAn()" title="Eingebetteter Spotify-Player (auf dem Handy 30-Sekunden-Vorschau)">♫ {{ spotifyAn() ? 'Spotify ausblenden' : 'Auf Spotify anhören' }}</button></p>
            }
            @if (spotifyAn() && spotifyArt === 'vorschau' && spotifyEmbed(); as url) {
              <div class="spotify-player" (pointerdown)="$event.stopPropagation()" (pointerup)="$event.stopPropagation()">
                <iframe [src]="url" [title]="'Spotify-Player: ' + $any(c).title" width="100%" height="152" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>
              </div>
            }
            @if (probe(); as d) { <app-probe-leiste [datum]="d" [song]="$any(c)" [neu]="statusNeu()" /> }
            @if (ueben()) {
              <!-- Übe-Modus: derselbe Status-Umschalter wie in der Kopfleiste der Notenansicht -->
              <div class="ueben-status" (pointerdown)="$event.stopPropagation()" (pointerup)="$event.stopPropagation()">
                <app-status-schalter [status]="uebeStatus()" [weiter]="true" [sperren]="gesperrteStatus()" (gewaehlt)="werten($event)" />
              </div>
            }
            @if (show()) {
              <p class="stars" role="group" aria-label="Wie lief der Song heute?">
                @for (n of [1, 2, 3, 4, 5]; track n) {
                  <button type="button" [class.on]="n <= sterne()" [attr.aria-pressed]="n === sterne()" [attr.aria-label]="n + (n === 1 ? ' Stern' : ' Sterne')" (click)="bewerte(n, $event)">
                    <mat-icon>{{ n <= sterne() ? 'star' : 'star_border' }}</mat-icon>
                  </button>
                }
              </p>
            }
          }
        } @else if (probe(); as d) {
          <app-probe-ende [datum]="d" (schliessen)="closed.emit()" />
        } @else {
          <p class="pause">Ende – danke!</p>
        }
      </main>

      <footer>
        @if (next(); as n) {
          <span class="label">Als Nächstes</span>
          <span class="next">{{ isPause(n) ? 'Pause' : $any(n).title }}@if (nextInfo(); as ni) { <span class="next-info"> · {{ ni }}</span> }</span>
        } @else if (current()) {
          <span class="label">Letzter Song</span>
        }
        @if (streichen().length) {
          <span class="label" style="color: #ff8a65">⏱ {{ fmt(ueber()) }} drüber</span>
          <span class="next" style="font-size: .7em">streichen: {{ streichText() }} <button type="button" class="ton" style="display: inline" (click)="streichenJa($event)">Streichen</button></span>
        }
        <div class="progress" role="slider" tabindex="0" aria-label="Position in der Setlist – antippen zum Springen" aria-valuemin="1" [attr.aria-valuemax]="liste().length" [attr.aria-valuenow]="index() + 1"
             (pointerdown)="$event.stopPropagation()" (pointerup)="balken($event)">
          <span class="stand" [style.width.%]="progress()"></span>
          @for (m of setMarken(); track m.index) { <span class="marke" [style.left.%]="m.links" [attr.title]="'Set ' + m.set"></span> }
        </div>
      </footer>
      @if (stimmen()) { <app-stimmgeraet style="position: fixed; left: 50%; top: 50%; z-index: 4; width: min(520px, 92vw); transform: translate(-50%, -50%)" (schliessen)="stimmen.set(false)" (pointerup)="$event.stopPropagation()" /> }
      @if (lupe()) {
        <div class="suche" (pointerdown)="$event.stopPropagation()" (pointerup)="$event.stopPropagation()" (keydown)="sucheTaste($event)">
          <div class="suche-kopf">
            <mat-icon>search</mat-icon>
            <input #feld type="search" placeholder="Song suchen – kommt jetzt dran" aria-label="Song suchen" [value]="suche()" (input)="suche.set($any($event.target).value)" (keydown.enter)="treffer()[0] && waehlen(treffer()[0])" />
            <button type="button" class="close" (click)="lupe.set(false)" aria-label="Suche schließen"><mat-icon>close</mat-icon></button>
          </div>
          <ul>
            @for (t of treffer(); track t.key) {
              <li><button type="button" (click)="waehlen(t)">
                <span class="t">{{ t.title }}</span> <span class="a">{{ t.artist }}</span>
                @if (platz(t); as nr) { <small>steht als Nr. {{ nr }} drin – kommt hierher</small> }
              </button></li>
            } @empty { <li class="leer">{{ suche().trim() ? 'Kein Song gefunden.' : 'Titel oder Interpret eintippen …' }}</li> }
          </ul>
        </div>
      }
      @if (nav()) {
        <nav class="navi" aria-label="Songs der Setlist" (pointerdown)="$event.stopPropagation()" (pointerup)="$event.stopPropagation()" (keydown)="navTaste($event)">
          <div class="navi-kopf">
            <span>{{ ueben() ? 'Karten' : probe() ? 'Probe' : 'Setlist' }}</span>
            <button type="button" class="close" (click)="navUmschalten($event)" aria-label="Song-Liste schließen"><mat-icon>close</mat-icon></button>
          </div>
          <ol>
            @for (z of navZeilen(); track z.index) {
              @if (z.pause) {
                <li class="navi-pause">Pause · weiter mit Set {{ z.set }}</li>
              } @else {
                <li><button type="button" [class.jetzt]="z.index === index()" [class.weg]="z.gestrichen" [attr.aria-current]="z.index === index() ? 'true' : null" (click)="navSpringen(z.index)">
                  <span class="nr">{{ z.nr }}</span> <span class="t">{{ z.title }}</span>
                </button></li>
              }
            }
          </ol>
        </nav>
      }
      @if (zaehler()) { <div class="einzaehlen" aria-live="assertive">{{ zaehler() }}</div> }
      @if (spotifyArt === 'fern' && spotifySpieler.hinweis(); as h) {
        <!-- Meldung der Spotify-Fernsteuerung – sichtbar in Titelanzeige und Notenansicht -->
        <p class="spotify-hinweis" role="status" (pointerdown)="$event.stopPropagation()" (pointerup)="$event.stopPropagation()">
          <span>{{ h }}</span>
          @if (spotifySpieler.spotifyOeffnen() && spotifyId(); as id) { <a [href]="'https://open.spotify.com/track/' + id" target="_blank" rel="noopener">Spotify öffnen</a> }
          <button type="button" (click)="$event.stopPropagation(); spotifySpieler.hinweisWeg()" aria-label="Hinweis schließen">✕</button>
        </p>
      }
      @if (zurueckHinweis()) { <p class="zurueck-hinweis" role="status">Noch einmal „Zurück“ beendet den {{ probe() ? 'Probe-Modus' : ueben() ? 'Übe-Modus' : 'Bühnen-Modus' }}</p> }
      @if (zurueck(); as z) {
        <!-- Übe-Modus: letzte Status-Wahl ein paar Sekunden lang zurücknehmbar (Karte und Kasten wie vorher) -->
        <button type="button" class="rueckgaengig" (click)="rueckgaengigKlick($event)" (pointerdown)="$event.stopPropagation()" (pointerup)="$event.stopPropagation()"><span aria-hidden="true">↶</span> Rückgängig: {{ z.title }} – {{ z.label }}</button>
      }
      @if (notenOffen()) { <app-noten-anzeige [class.raus]="notenRaus()" [song]="aktuellerSong()" [info]="info()" [anlass]="anlass()" [bewerten]="ueben() || (!!probe() && !!ich)" [weiter]="ueben()" [sperren]="gesperrteStatus()" [listeKnopf]="ueben() || !!probe()" (liste)="navOeffnen()" [status]="uebeStatus()" (wertung)="werten($event)" [endeText]="probe() ? 'Probe-Modus beenden' : ueben() ? 'Übe-Modus beenden' : 'Bühnen-Modus beenden'" (schliessen)="notenSchliessen()" (beenden)="closed.emit()" /> }
    </div>
  `,
  styles: `
    :host { position: fixed; inset: 0; z-index: 2000; display: block; outline: none; }
    .stage {
      box-sizing: border-box; height: 100%; display: flex; flex-direction: column; background: #000; color: #fff; user-select: none;
      touch-action: pan-y; font-family: Inter, sans-serif; padding: max(12px, env(safe-area-inset-top)) 20px max(12px, env(safe-area-inset-bottom));
    }
    header { display: flex; align-items: center; gap: 16px; font-size: clamp(1rem, 2.5vw, 1.4rem); color: #9aa0a6; }
    .set { font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .14em; }
    .clock { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; font-variant-numeric: tabular-nums; color: #fff; }
    .clock small { color: #9aa0a6; font-size: .8em; }
    .clock.over, .clock.over small { color: #ff8a65; }
    /* Schriftgröße für Song und „Als Nächstes“ (A−/A+), je Gerät gemerkt – z. B. größer fürs Tablet am Schlagzeug */
    .no, h1, .artist, .info, .wunsch, .pause, .hint, footer { zoom: var(--zoom, 1); }
    .set { white-space: nowrap; }
    @media (max-width: 480px) {
      header { flex-wrap: wrap; row-gap: 6px; }
      .zoom { margin-left: auto; }
      .clock { order: 5; flex-basis: 100%; margin-left: 0; }
    }
    .zoom { display: inline-flex; gap: 6px; }
    .noten-knopf { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-width: 48px; height: 48px; padding: 0 14px; border-radius: 24px; border: 1px solid #e8a46a; background: transparent; color: #e8a46a; font: 600 .95rem Inter, sans-serif; cursor: pointer; }
    .noten-knopf[aria-pressed=true] { border-color: #e8a46a; color: #e8a46a; }
    .zoom button { min-width: 48px; height: 48px; border-radius: 24px; border: 1px solid #333; background: transparent; color: #fff; font: 600 1rem Inter, sans-serif; cursor: pointer; }
    .zoom button:disabled { opacity: .35; cursor: default; }
    .close { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 50%; border: 1px solid #333; background: transparent; color: #fff; cursor: pointer; }
    /* safe center: wird es (große Schrift) zu hoch, läuft es nach unten über statt über die Kopfzeile */
    main { flex: 1; display: flex; flex-direction: column; justify-content: safe center; text-align: center; min-height: 0; overflow-y: auto; }
    header { position: relative; z-index: 1; }
    .no { margin: 0; font-size: clamp(1.5rem, 5vw, 3rem); color: var(--bn-sunset); font-variant-numeric: tabular-nums; }
    h1 { margin: .1em 0; font-size: clamp(2.6rem, 11vw, 7.5rem); line-height: 1.05; font-weight: 700; overflow-wrap: anywhere; }
    .artist { margin: 0; font-size: clamp(1.1rem, 4vw, 2.2rem); color: #b0b6bc; }
    .info { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin: 16px 0 0; font-size: clamp(1rem, 3vw, 1.6rem); }
    .key { padding: 4px 14px; border-radius: 8px; background: #e8a46a; color: #000; font-weight: 700; }
    .bpm { padding: 4px 14px; border-radius: 8px; border: 1px solid #555; background: transparent; color: #fff; font: inherit; cursor: pointer; }
    .bpm.on { border-color: #e8a46a; }
    .bpm.on.beat { background: #e8a46a; color: #000; }
    .bpm.on.beat.eins { background: #fff; }
    .capo { padding: 4px 14px; border-radius: 8px; border: 1px solid #e8a46a; color: #e8a46a; }
    .ton { display: grid; place-items: center; padding: 4px 10px; border-radius: 8px; border: 1px solid #555; background: transparent; color: #9aa0a6; cursor: pointer; }
    .ton.on { border-color: #e8a46a; color: #e8a46a; }
    .note { color: #b0b6bc; }
    .next-info { color: #e8a46a; }
    .einzaehlen { position: fixed; inset: 0; z-index: 3; display: grid; place-items: center; background: #000c; color: #e8a46a; font: 700 60vmin Inter; pointer-events: none; }
    .wunsch { margin: 12px 0 0; font-size: clamp(1.2rem, 4vw, 2.2rem); color: #ff8a80; }
    .stars { display: flex; justify-content: center; gap: 4px; margin: 14px 0 0; }
    .stars button { display: grid; place-items: center; width: 56px; height: 56px; border: 0; border-radius: 50%; background: transparent; color: #555; cursor: pointer; }
    .stars button.on { color: #e8a46a; }
    .stars mat-icon { font-size: 40px; width: 40px; height: 40px; }
    .pause { display: flex; align-items: center; justify-content: center; gap: .3em; margin: 0; font-size: clamp(3rem, 12vw, 8rem); font-weight: 700; color: var(--bn-sunset); }
    .pause mat-icon { font-size: 1em; width: 1em; height: 1em; }
    .hint { color: #9aa0a6; font-size: clamp(1rem, 3vw, 1.6rem); }
    footer { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; align-items: baseline; font-size: clamp(1.1rem, 3.5vw, 2rem); }
    .label { color: #9aa0a6; font-size: .7em; text-transform: uppercase; letter-spacing: .12em; }
    .next { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `,
})
export class SetlistBuehne {
  readonly entries = input.required<Entry[]>();
  /** Setlist im Bühnen-Modus – spontane Wünsche (Lupe) ändern sie; geaendert meldet die neue Liste zum Speichern */
  protected readonly liste = linkedSignal(() => this.entries());
  readonly geaendert = output<Entry[]>();
  /** Auftritts-ID – nur damit gibt es Sterne */
  readonly show = input<string>();
  /** Startposition in der Liste (z. B. der angeklickte Song in Backstage → Songs) */
  readonly start = input(0);
  /** gleich mit geöffneten Noten beginnen */
  readonly notenAuf = input(false);
  readonly closed = output<void>();
  /** Probe-Modus: Datum der Probe – Probe-Leiste je Song, Uhr bis zum Probenende, kein Kürzen und keine Sterne */
  readonly probe = input<string>();
  /** Generalprobe: Setlist mit Pausen, Uhr je Set wie auf der Bühne */
  readonly generalprobe = input(false);
  /** Generalprobe: so viele Songs kommen vor dem Durchlauf einzeln (dann eine Pause) – zählen nicht als Set */
  readonly vorab = input(0);
  /** „Set 1 / 2“ – bei der Generalprobe vorher „Einzeln 1 / 2“, die Sets danach ohne den Einzel-Block gezählt */
  protected readonly setKopf = computed(() => {
    const v = this.vorab();
    if (v && this.index() < v) return `Einzeln ${this.index() + 1} / ${v}`;
    return v ? `Set ${this.setNo() - 1} / ${this.sets().length - 1}` : `Set ${this.setNo()} / ${this.sets().length}`;
  });
  /** Übe-Modus: Notenansicht mit den fünf Übe-Status oben rechts – die Liste ist die Reihe der Karteikarten */
  readonly ueben = input(false);
  readonly bewertet = output<{ title: string; artist: string; status: UebeStatus }>();
  /** Übe-Modus: die letzte Status-Wahl zurücknehmen (der Elternteil stellt den Stand wieder her) */
  readonly rueckgaengig = output<void>();
  /** letzte Status-Wahl im Übe-Modus, solange sie zurückgenommen werden kann */
  protected readonly zurueck = signal<{ title: string; label: string; bei: number; nochmal: boolean } | null>(null);
  private zurueckZeit: ReturnType<typeof setTimeout> | undefined;
  protected readonly statusNeu = signal(0);
  /** Person am Gerät – ohne gibt es im Probe-Modus keinen Status-Umschalter in der Kopfleiste */
  protected readonly ich = ladeIch();
  /** eigener Übe-Status des aktuellen Songs (Übe- und Probe-Modus) */
  protected readonly uebeStatus = computed(() => {
    this.statusNeu();
    const c = this.aktuellerSong();
    return (this.ueben() || this.probe()) && c ? eigenerStatus(`${c.title}|${c.artist}`) : null;
  });
  /**
   * Status setzen. Probe-Modus (Kopfleiste der Notenansicht): wie in der Probe-Leiste, der Song bleibt. Übe-Modus:
   * Status gilt sofort; „Üben“ kommt hinten noch einmal dran. Weiter zur nächsten Karte (am Ende: fertig) erst, wenn
   * der gewählte Status kurz aufgeleuchtet hat (AUFLEUCHTEN_MS) – und nur, wenn man nicht schon selbst geblättert hat.
   */
  // „Zurück“ des Handys (Wischen vom Rand, Zurück-Taste) soll den Modus nicht versehentlich beenden – beim Blättern
  // per Wischen passiert das leicht. Der Modus legt dafür einen eigenen Schritt in den Browser-Verlauf: einmal „Zurück“
  // zeigt nur einen Hinweis, erst ein zweites Mal innerhalb von 2,5 s beendet ihn. Beim Schließen verschwindet der
  // Schritt wieder (vor dem Schließen-Ereignis, damit „zurück zur Übersicht“ des Elternteils danach stimmt).
  protected readonly zurueckHinweis = signal(false);
  private readonly zurueckSchutz = (() => {
    if (typeof window === 'undefined' || typeof history === 'undefined') return;
    const marke = Date.now();
    const ablegen = () => history.pushState({ ...(history.state ?? {}), bnModus: marke }, '');
    ablegen();
    let offen = true;
    let letztes = 0;
    let hinweisZeit: ReturnType<typeof setTimeout> | undefined;
    const zurueck = () => {
      if (!offen) return;
      if (Date.now() - letztes < 2500) {
        this.closed.emit();
        return;
      }
      letztes = Date.now();
      ablegen();
      this.zurueckHinweis.set(true);
      clearTimeout(hinweisZeit);
      hinweisZeit = setTimeout(() => this.zurueckHinweis.set(false), 2500);
    };
    window.addEventListener('popstate', zurueck);
    const aufraeumen = () => {
      if (!offen) return;
      offen = false;
      clearTimeout(hinweisZeit);
      window.removeEventListener('popstate', zurueck);
      // unser Schritt liegt noch oben: wieder herausnehmen
      if ((history.state as { bnModus?: number } | null)?.bnModus === marke) history.back();
    };
    this.closed.subscribe(aufraeumen);
    inject(DestroyRef).onDestroy(aufraeumen);
  })();
  private weiterZeit: ReturnType<typeof setTimeout> | undefined;
  private readonly weiterAufraeumen = inject(DestroyRef).onDestroy(() => {
    clearTimeout(this.weiterZeit);
    clearTimeout(this.zurueckZeit);
  });
  protected werten(status: UebeStatus): void {
    const c = this.aktuellerSong();
    if (!c || this.weiterZeit !== undefined) return;
    const datum = this.probe();
    if (datum) {
      if (this.ich) probeStatusSetzen(datum, c, status, this.band.members);
      this.statusNeu.update((n) => n + 1);
      return;
    }
    this.bewertet.emit({ title: c.title, artist: c.artist, status });
    // nächste Karte: Tempo-Training wieder bei 70 %
    if (this.klick()) this.faktor.set(0.7);
    this.statusNeu.update((n) => n + 1);
    if (status === 'ueben') this.liste.update((l) => [...l, { title: c.title, artist: c.artist }]);
    const bei = this.index();
    clearTimeout(this.zurueckZeit);
    this.zurueck.set({ title: c.title, label: statusLabel(status), bei, nochmal: status === 'ueben' });
    this.zurueckZeit = setTimeout(() => this.zurueck.set(null), ZURUECK_MS);
    this.weiterZeit = setTimeout(() => {
      this.weiterZeit = undefined;
      if (this.index() !== bei) return;
      if (bei + 1 >= this.liste().length) this.closed.emit();
      else this.springen(bei + 1);
    }, AUFLEUCHTEN_MS);
  }
  /** „Rückgängig“: zurück zur Karte, angehängte Wiederholung wieder weg, Stand beim Elternteil zurück */
  protected rueckgaengigKlick(e: Event): void {
    e.stopPropagation();
    const z = this.zurueck();
    if (!z) return;
    clearTimeout(this.zurueckZeit);
    clearTimeout(this.weiterZeit);
    this.weiterZeit = undefined;
    this.zurueck.set(null);
    if (z.nochmal) this.liste.update((l) => l.slice(0, -1));
    this.rueckgaengig.emit();
    this.statusNeu.update((n) => n + 1);
    if (this.index() !== z.bei) this.springen(z.bei);
  }
  protected readonly minutenText = minutenText;

  // Spotify-Player (Übe- und Probe-Modus): Track-Link aus den Spotify-Listen → Einbett-Adresse; erst auf Knopfdruck,
  // nur mit Netz. Voller Song nur mit Spotify-Anmeldung im selben Browser, sonst 30-Sekunden-Vorschau.
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly spotifyAn = signal(false);
  /** Einstellung dieses Geräts: 'aus' (Standard), 'vorschau' (eingebetteter Player) oder 'fern' (Fernsteuerung) */
  protected readonly spotifyArt = spotifyArt();
  // Fernsteuerung (data/spotify-spieler.ts): immer den angezeigten Song melden – gespielt wird nur er; beim Verlassen
  // des Modus pausieren
  protected readonly spotifySpieler = inject(SpotifySpieler);
  private readonly spotifyMelden = (() => {
    if (typeof window === 'undefined' || this.spotifyArt !== 'fern') return;
    let gestartet = false;
    effect(() => {
      const an = this.ueben() || !!this.probe();
      const t = an && this.online() ? this.spotifyId() : undefined;
      const c = this.aktuellerSong();
      untracked(() => {
        if (an && !gestartet) {
          gestartet = true;
          this.spotifySpieler.start();
        }
        // Länge aus den Spotify-Listen: der Fortschritt läuft damit auch, bevor (oder ohne dass) Spotify sie meldet
        if (gestartet) this.spotifySpieler.songSetzen(t, t && c ? (durationOf(c) ?? 0) * 1000 : 0);
      });
    });
    inject(DestroyRef).onDestroy(() => gestartet && this.spotifySpieler.ende());
  })();
  private readonly online = signal(typeof navigator === 'undefined' || navigator.onLine !== false);
  private readonly spotifyTracks = (() => {
    const m = new Map<string, string>();
    for (const l of LISTEN) for (const t of l.tracks) if (t.url && !m.has(vergleichsKey(t.title, t.artist))) m.set(vergleichsKey(t.title, t.artist), t.url);
    return m;
  })();
  protected readonly spotifyId = computed(() => {
    const c = this.aktuellerSong();
    const url = c ? this.spotifyTracks.get(vergleichsKey(c.title, c.artist)) : undefined;
    return /open\.spotify\.com\/track\/([A-Za-z0-9]+)/.exec(url ?? '')?.[1];
  });
  protected readonly spotifyMoeglich = computed(() => this.spotifyArt !== 'aus' && (this.ueben() || !!this.probe()) && !!this.spotifyId() && this.online());
  protected readonly spotifyEmbed = computed(() => {
    const id = this.spotifyId();
    return id && this.online() ? this.sanitizer.bypassSecurityTrustResourceUrl(`https://open.spotify.com/embed/track/${id}?utm_source=generator&theme=0`) : null;
  });
  protected spotifyUmschalten(e: Event): void {
    e.stopPropagation();
    this.spotifyAn.update((a) => !a);
  }
  private readonly band = inject(BandService);
  // links oben: wofür der Modus läuft – Name des Auftritts bzw. „Probe 12.11.“ (danach Set bzw. Song)
  protected readonly anlass = computed(() => {
    const d = this.probe();
    if (d) return `${this.generalprobe() ? 'Generalprobe' : 'Probe'} ${d.slice(8, 10)}.${d.slice(5, 7)}.`;
    if (this.ueben()) return 'Übe-Modus';
    const id = this.show();
    const s = id ? this.band.showById(id) : undefined;
    return s ? (s.private ? (s.publicName ?? 'Private Feier') : s.venue) : '';
  });
  protected readonly songZahl = computed(() => this.liste().filter((e) => !isPause(e)).length);

  protected readonly isPause = isPause;
  protected readonly stimmen = signal(false);
  // Schriftgröße (Faktor), je Gerät gespeichert
  protected readonly ZOOM_MIN = 0.7;
  protected readonly ZOOM_MAX = 1.6;
  protected readonly zoom = signal(ladeZoom());
  protected zoomen(richtung: number): void {
    const z = Math.round(Math.min(this.ZOOM_MAX, Math.max(this.ZOOM_MIN, this.zoom() + richtung * 0.15)) * 100) / 100;
    this.zoom.set(z);
    try {
      localStorage.setItem(ZOOM_KEY, String(z));
    } catch {
      // ohne Speicher gilt die Größe bis zum Schließen
    }
  }
  protected readonly index = linkedSignal(() => this.start());
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly now = signal(Date.now());
  private setStart = Date.now();

  protected readonly sets = computed(() => setsOf(this.liste()));
  protected readonly current = computed(() => this.liste()[this.index()]);
  /** im Set gestrichene Songs (Index) – werden beim Blättern übersprungen */
  protected readonly gestrichen = signal(new Set<number>());
  private readonly naechsterIndex = computed(() => {
    let i = this.index() + 1;
    while (this.gestrichen().has(i)) i++;
    return i;
  });
  protected readonly next = computed(() => this.liste()[this.naechsterIndex()]);
  // Set-Nummer: Pausen vor der aktuellen Position zählen (Pause gehört noch zum Set davor)
  protected readonly setNo = computed(() => this.liste().slice(0, this.index()).filter((e) => isPause(e)).length + 1);
  protected readonly songNo = computed(() => this.liste().slice(0, this.index() + 1).filter((e) => !isPause(e)).length);
  protected readonly progress = computed(() => (this.liste().length ? ((this.index() + 1) / this.liste().length) * 100 : 0));
  protected readonly elapsed = computed(() => Math.max(0, Math.round((this.now() - this.setStart) / 1000)));
  protected readonly planned = computed(() => {
    const d = this.probe();
    return d && !this.generalprobe() ? probenDauer(this.band.rehearsals.find((r) => r.date === d)) : setLength(this.sets()[this.setNo() - 1] ?? []).seconds;
  });
  protected readonly plannedText = computed(() => setTime(this.planned()));
  protected readonly remaining = computed(() => this.planned() - this.elapsed());

  protected readonly aktuellerSong = computed(() => {
    const c = this.current();
    return c && !isPause(c) ? c : undefined;
  });

  // Noten (PDF/Akkordblatt) aus Backstage → Songs: Knopf oben, sobald auf diesem Gerät welche hinterlegt sind
  protected readonly notenSongs = signal(new Set<string>());
  protected readonly notenOffen = linkedSignal(() => this.notenAuf());
  private readonly anzeige = viewChild(NotenAnzeige);
  protected notenUmschalten(e: Event): void {
    e.stopPropagation();
    if (this.notenOffen()) this.notenSchliessen();
    else this.notenOffen.set(true);
  }
  /** Notenansicht gleitet nach unten heraus (Herunterwischen, Noten-Knopf, Escape), dann die Titelanzeige */
  protected readonly notenRaus = signal(false);
  protected notenSchliessen(): void {
    if (!this.notenOffen() || this.notenRaus()) return;
    const ruhig = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (ruhig) {
      this.notenOffen.set(false);
      return;
    }
    this.notenRaus.set(true);
    setTimeout(() => {
      this.notenOffen.set(false);
      this.notenRaus.set(false);
    }, 240);
  }
  // Titelanzeige: nach oben wischen holt die Notenansicht herein (wie der Noten-Knopf)
  private wischY: { x: number; y: number } | null = null;
  protected wischStart(e: TouchEvent): void {
    const t = e.touches[0];
    this.wischY = e.touches.length === 1 && t && !this.notenOffen() && !(e.target as HTMLElement).closest('button, input, select, textarea, .navi, .suche') ? { x: t.clientX, y: t.clientY } : null;
  }
  protected wischEnde(e: TouchEvent): void {
    const t = e.changedTouches[0];
    if (this.wischY && t) this.notenHochgewischt(t.clientX - this.wischY.x, t.clientY - this.wischY.y, e.target as HTMLElement);
    this.wischY = null;
  }
  private notenHochgewischt(dx: number, dy: number, ziel: HTMLElement): boolean {
    if (this.notenOffen() || !(this.notenSongs().size || this.notenAuf()) || dy > -60 || Math.abs(dy) < Math.abs(dx) * 1.5) return false;
    // im Song-Bereich gescrollt (lange Probe-Leiste): erst wenn unten angekommen
    const main = ziel.closest('main');
    if (main && main.scrollHeight > main.clientHeight + 2 && main.scrollTop + main.clientHeight < main.scrollHeight - 2) return false;
    this.notenOffen.set(true);
    return true;
  }

  protected readonly info = computed(() => {
    const c = this.current();
    return c && !isPause(c) ? songInfo(c.title, c.artist) : undefined;
  });
  // Tonart und Tempo des nächsten Songs – zum Umstimmen bzw. Einzählen schon vorher sichtbar
  protected readonly nextInfo = computed(() => {
    const n = this.next();
    const i = n && !isPause(n) ? songInfo(n.title, n.artist) : undefined;
    return i ? [gespielteTonart(i), i.capo && `Capo ${i.capo}`, i.bpm && `${i.bpm} bpm`].filter(Boolean).join(' · ') : '';
  });
  // Sterne je Song für diesen Auftritt, sofort im Browser gespeichert
  private readonly bewertungen = linkedSignal(() => (this.show() ? ladeBewertungen(this.show()!) : {}));
  protected readonly sterne = computed(() => {
    const c = this.current();
    return c && !isPause(c) ? (this.bewertungen()[songKey(c)] ?? 0) : 0;
  });

  protected bewerte(n: number, e?: Event): void {
    e?.stopPropagation();
    const c = this.current();
    const show = this.show();
    if (!c || isPause(c) || !show) return;
    this.bewertungen.update((b) => bewerten(b, songKey(c), n));
    try {
      localStorage.setItem(BEWERTUNG_PREFIX + show, JSON.stringify(this.bewertungen()));
    } catch {
      // ohne Speicher gilt die Bewertung nur bis zum Schließen
    }
  }

  protected readonly tonart = gespielteTonart;

  // Klick: blinkt im Tempo des aktuellen Songs, auf Wunsch mit kurzem Ton über Web Audio
  protected readonly klick = signal(false);
  protected readonly ton = signal(ladeTon());
  protected readonly beat = signal(false);
  private klickTimer: ReturnType<typeof setInterval> | undefined;
  private audio: AudioContext | undefined;

  private wakeLock: { release(): Promise<void> } | null = null;
  private startX = 0;
  private startY = 0;

  private readonly netzBeobachten = (() => {
    if (typeof window === 'undefined') return;
    const an = () => this.online.set(true);
    const aus = () => this.online.set(false);
    window.addEventListener('online', an);
    window.addEventListener('offline', aus);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', an);
      window.removeEventListener('offline', aus);
    });
  })();
  constructor() {
    alleSongNoten()
      .then((n) => {
        this.notenSongs.set(new Set(Object.keys(n)));
        if (Object.keys(n).length) pdfjsVorladen();
      })
      .catch(() => undefined);
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    const lock = () =>
      (navigator as unknown as { wakeLock?: { request(t: string): Promise<{ release(): Promise<void> }> } }).wakeLock
        ?.request('screen')
        .then((l) => (this.wakeLock = l))
        .catch(() => undefined);
    lock();
    // Wake Lock geht beim Wechsel in den Hintergrund verloren – beim Zurückkommen neu holen
    const visible = () => document.visibilityState === 'visible' && lock();
    document.addEventListener('visibilitychange', visible);
    // Vollbild des Browsers – außer in der installierten App auf Handy und Tablet: Dort füllt der Modus das Fenster
    // ohnehin (nur die Statusleiste bleibt), und das Browser-Vollbild brächte Androids Meldung „Zum Beenden des
    // Vollbildmodus …“ samt Randgeste mit, die sich mit dem Herunterwischen in der Notenansicht beißt und den Modus
    // aus dem Vollbild wirft. Beides kann eine Seite nicht abschalten – also gar nicht erst hinein.
    // Im Browser-Tab auf Touch-Geräten: fällt das Vollbild weg (Randgeste, Zurück), holt der nächste Tipp es zurück.
    const el = this.host.nativeElement;
    const vollbild = () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()?.catch(() => undefined);
    };
    const wiederVollbild = (e: PointerEvent) => {
      if (e.pointerType === 'touch') vollbild();
    };
    if (browserVollbild()) {
      vollbild();
      el.addEventListener('pointerup', wiederVollbild, true);
    }
    queueMicrotask(() => this.host.nativeElement.focus());
    inject(DestroyRef).onDestroy(() => {
      el.removeEventListener('pointerup', wiederVollbild, true);
      clearInterval(timer);
      this.stopKlick();
      this.stopZaehlen();
      this.audio?.close().catch(() => undefined);
      document.removeEventListener('visibilitychange', visible);
      this.wakeLock?.release().catch(() => undefined);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    });
  }

  protected length(e: Entry): string | null {
    const d = isPause(e) ? undefined : durationOf(e);
    return d ? songTime(d) : null;
  }

  protected fmt(sec: number): string {
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  }

  protected toggleKlick(e: Event): void {
    e.stopPropagation();
    this.klick.update((k) => !k);
    // Übe-Modus: Tempo-Training beginnt bei 70 %
    if (this.ueben() && this.klick()) this.faktor.set(0.7);
    this.startKlick();
  }
  /** Tempo-Training (Übe-Modus): eine Stufe schneller, nach 100 % wieder 70 % */
  protected schneller(e: Event): void {
    e.stopPropagation();
    const f = [...SetlistBuehne.FAKTOREN].reverse();
    this.faktor.set(f[(f.indexOf(this.faktor()) + 1) % f.length]);
    this.startKlick();
  }
  /** Übe-Modus mit Klick unter 100 %: „Sitzt“ und „Eingenordet“ erst bei vollem Tempo */
  protected readonly gesperrteStatus = computed<UebeStatus[]>(() => (this.ueben() && this.klick() && this.faktor() < 1 ? ['sitzt', 'eingenordet'] : []));

  protected toggleTon(e: Event): void {
    e.stopPropagation();
    this.ton.update((t) => !t);
    try {
      localStorage.setItem(TON_KEY, this.ton() ? '1' : '0');
    } catch {
      // ohne Speicher gilt die Wahl bis zum Schließen
    }
  }

  // Tempo-Trainer: Klick zum Üben auf 90, 80 oder 70 % – gilt bis zum Schließen, nicht für den nächsten Auftritt
  private static readonly FAKTOREN = [1, 0.9, 0.8, 0.7];
  protected readonly faktor = signal(1);
  protected readonly faktorText = computed(() => `${Math.round(this.faktor() * 100)} %`);
  protected readonly klickBpm = computed(() => Math.round((this.info()?.bpm ?? 0) * (this.klick() ? this.faktor() : 1)));
  protected langsamer(e: Event): void {
    e.stopPropagation();
    const f = SetlistBuehne.FAKTOREN;
    this.faktor.set(f[(f.indexOf(this.faktor()) + 1) % f.length]);
    this.startKlick();
  }

  // Taktart des Songs (data/takt.ts): Klick betont die Eins (heller, höherer Ton), Einzählen zählt passend ein
  protected readonly taktText = computed(() => taktHinweis(this.info()?.takt));
  protected readonly einzaehlKnopf = computed(() => einzaehlText(this.info()?.takt));
  protected readonly eins = signal(false);
  private startKlick(): void {
    this.stopKlick();
    const bpm = this.klickBpm();
    if (!this.klick() || !bpm) return;
    const schlaege = schlaegeJeTakt(this.info()?.takt);
    let n = 0;
    this.klickTimer = setInterval(() => {
      const erster = n++ % schlaege === 0;
      this.eins.set(erster);
      this.beat.set(true);
      setTimeout(() => this.beat.set(false), 90);
      if (this.ton()) this.piep(erster ? 1500 : 1000);
    }, 60000 / bpm);
  }

  private piep(frequenz: number): void {
    this.audio ??= new AudioContext();
    const a = this.audio;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.frequency.value = frequenz;
    gain.gain.setValueAtTime(0.2, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.05);
    osc.connect(gain).connect(a.destination);
    osc.start();
    osc.stop(a.currentTime + 0.05);
  }

  private stopKlick(): void {
    clearInterval(this.klickTimer);
    this.beat.set(false);
  }

  // Einzählen: ein Takt (4/4: vier Schläge, 3/4: zweimal drei) im Tempo des Songs (beim Üben im gewählten Übungstempo) groß über dem Bildschirm,
  // mit Ton, wenn er eingeschaltet ist – die Eins höher. Danach läuft der Klick weiter, falls er an war.
  protected readonly zaehler = signal(0);
  private zaehlTimer: ReturnType<typeof setInterval> | undefined;
  protected einzaehlen(e: Event): void {
    e.stopPropagation();
    const bpm = Math.round((this.info()?.bpm ?? 0) * this.faktor());
    if (!bpm) return;
    this.stopKlick();
    this.stopZaehlen();
    // ein Takt (bei 3/4 und 2/4 zwei Takte, bei 6/8 alle sechs Achtel), die Eins jedes Takts höher
    const folge = einzaehlFolge(this.info()?.takt);
    let n = 0;
    const schlag = () => {
      if (n >= folge.length) {
        this.stopZaehlen();
        this.startKlick();
        return;
      }
      const z = folge[n++];
      this.zaehler.set(z);
      if (this.ton()) this.piep(z === 1 ? 1500 : 1000);
    };
    schlag();
    // bei 6/8 usw. zählt bpm die punktierte Viertel – eingezählt werden die Achtel (dreimal so schnell)
    this.zaehlTimer = setInterval(schlag, 60000 / bpm / einzaehlUnterteilung(this.info()?.takt));
  }
  private stopZaehlen(): void {
    clearInterval(this.zaehlTimer);
    this.zaehler.set(0);
  }

  // „Set zu lang“: Rest des laufenden Sets (nach dem aktuellen Song) gegen die geplante Länge – Vorschlag zum Streichen
  private readonly sterneSchnitt = new Map(rangliste(alleBewertungen(), Infinity).map((p) => [songKey(p), p.schnitt]));
  private readonly rest = computed<RestSong[]>(() => {
    const out: RestSong[] = [];
    for (let i = this.index() + 1; i < this.liste().length; i++) {
      const e = this.liste()[i];
      if (isPause(e)) break;
      if (this.gestrichen().has(i)) continue;
      out.push({ index: i, title: e.title, dauer: durationOf(e) ?? 0, sterne: this.sterneSchnitt.get(songKey(e)) ?? 3, wunsch: e.wunsch !== undefined });
    }
    return out;
  });
  protected readonly ueber = computed(() => {
    const c = this.current();
    const aktuell = c && !isPause(c) ? (durationOf(c) ?? 0) : 0;
    return this.planned() ? Math.round(ueberzug(this.elapsed() + aktuell / 2, this.rest().reduce((n, s) => n + s.dauer, 0), this.planned())) : 0;
  });
  protected readonly streichen = computed(() => (this.probe() ? [] : streichVorschlag(this.rest(), this.ueber())));
  protected readonly streichText = computed(() => this.streichen().map((s) => s.title).join(', '));
  protected streichenJa(e: Event): void {
    e.stopPropagation();
    this.gestrichen.update((g) => new Set([...g, ...this.streichen().map((s) => s.index)]));
  }

  protected go(step: number): void {
    // Noten offen: erst innerhalb des Blatts blättern, am Ende bzw. Anfang weiter zum nächsten bzw. vorigen Song
    if (this.notenOffen() && this.anzeige()?.blaettern(step)) return;
    let target = Math.min(this.liste().length, Math.max(0, this.index() + step));
    // gestrichene Songs überspringen
    while (this.gestrichen().has(target) && target > 0 && target < this.liste().length) target += step > 0 ? 1 : -1;
    this.springen(target);
  }

  // Fortschrittsbalken: antippen springt an die Stelle; die Sets sind als Striche markiert (an den Pausen)
  protected readonly setMarken = computed(() => {
    const l = this.liste();
    const out: { index: number; links: number; set: number }[] = [];
    l.forEach((e, i) => isPause(e) && out.push({ index: i, links: ((i + 0.5) / l.length) * 100, set: out.length + 2 }));
    return out;
  });
  protected balken(e: PointerEvent): void {
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const anteil = Math.min(0.999, Math.max(0, (e.clientX - r.left) / r.width));
    this.springen(Math.floor(anteil * this.liste().length));
  }

  // Song-Liste rechts: alle Songs der Setlist mit Nummer, Pausen als Trenner – antippen springt dorthin
  protected readonly nav = signal(false);
  protected readonly navZeilen = computed(() => {
    let nr = 0;
    let set = 1;
    return this.liste().map((e, index) =>
      isPause(e) ? { index, pause: true, set: ++set, nr: 0, title: '', gestrichen: false } : { index, pause: false, set, nr: ++nr, title: e.title, gestrichen: this.gestrichen().has(index) },
    );
  });
  /** aus der Kopfleiste der Notenansicht: Song-Liste öffnen */
  protected navOeffnen(): void {
    if (this.nav()) return;
    this.nav.set(true);
    setTimeout(() => this.host.nativeElement.querySelector('.navi .jetzt')?.scrollIntoView({ block: 'center' }));
  }
  protected navUmschalten(e: Event): void {
    e.stopPropagation();
    this.nav.update((n) => !n);
    if (this.nav()) setTimeout(() => this.host.nativeElement.querySelector('.navi .jetzt')?.scrollIntoView({ block: 'center' }));
    else this.host.nativeElement.focus();
  }
  protected navSpringen(i: number): void {
    this.springen(i);
    // auf dem Handy verdeckt die Liste den Song – dort nach dem Springen schließen
    if (window.innerWidth < 700) {
      this.nav.set(false);
      this.host.nativeElement.focus();
    }
  }
  /** Tasten in der Liste: Enter/Leertaste wählen den Song (nicht Blättern); Escape schließt */
  protected navTaste(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.stopPropagation();
      this.nav.set(false);
      this.host.nativeElement.focus();
    } else if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
  }

  // Lupe: spontaner Wunsch – Song aus allen Listen (und eigenständige mit Noten) suchen; er kommt an die aktuelle
  // Stelle, steht er schon drin, wird er hierher gezogen (data/buehne-wunsch.ts)
  protected readonly lupe = signal(false);
  protected readonly suche = signal('');
  private readonly feld = viewChild<ElementRef<HTMLInputElement>>('feld');
  private readonly alleSongs = computed(() => songAbgleich(LISTEN, [...this.notenSongs()]));
  protected readonly treffer = computed(() => {
    const q = this.suche().trim().toLocaleLowerCase('de').normalize('NFD').replace(/\p{Diacritic}/gu, '');
    if (!q) return [];
    return this.alleSongs()
      .filter((s) => `${s.title} ${s.artist}`.toLocaleLowerCase('de').normalize('NFD').replace(/\p{Diacritic}/gu, '').includes(q))
      .slice(0, 8);
  });
  // Tasten im Suchfeld gehören dem Feld (nicht dem Blättern); Escape schließt. Kein Ausdruck mit „&&“ im Template:
  // gibt ein Handler false zurück, ruft Angular preventDefault() – dann käme am Laptop kein Buchstabe im Feld an
  protected sucheTaste(e: KeyboardEvent): void {
    e.stopPropagation();
    if (e.key === 'Escape') {
      this.lupe.set(false);
      this.host.nativeElement.focus();
    }
  }
  protected lupeAuf(e: Event): void {
    e.stopPropagation();
    this.suche.set('');
    this.lupe.set(!this.lupe());
    if (this.lupe()) setTimeout(() => this.feld()?.nativeElement.focus());
  }
  /** Nummer in der Setlist, falls der Song schon drinsteht (nicht der aktuelle) */
  protected platz(t: { title: string; artist: string }): number | null {
    const l = this.liste();
    const i = l.findIndex((e, j) => j !== this.index() && !isPause(e) && e.title === t.title && e.artist === t.artist);
    return i < 0 ? null : l.slice(0, i + 1).filter((e) => !isPause(e)).length;
  }
  protected waehlen(t: { title: string; artist: string }): void {
    const r = wunschEinfuegen(this.liste(), this.index(), t);
    this.gestrichen.update((g) => new Set([...g].map(r.abbild).filter((i) => i !== r.ziel)));
    this.liste.set(r.liste);
    this.geaendert.emit(r.liste);
    this.lupe.set(false);
    this.springen(r.ziel);
    this.host.nativeElement.focus();
  }

  private springen(target: number): void {
    const before = this.setNo();
    this.index.set(Math.min(this.liste().length, Math.max(0, target)));
    // neues Set beginnt (nach der Pause weiter) → Uhr neu starten
    if (this.setNo() !== before) this.setStart = Date.now();
    // Klick läuft im Tempo des neuen Songs weiter (ohne Tempo: aus); angefangenes Einzählen endet
    this.stopZaehlen();
    this.startKlick();
  }

  // Tippen: rechte zwei Drittel weiter, linkes Drittel zurück; Wischen nach links/rechts ebenso
  protected down(e: PointerEvent): void {
    this.startX = e.clientX;
    this.startY = e.clientY;
  }
  protected up(e: PointerEvent): void {
    if ((e.target as HTMLElement).closest('button, select')) return;
    const dx = e.clientX - this.startX;
    // mit der Maus nach oben gezogen: Notenansicht (mit dem Finger über die Touch-Ereignisse)
    if (e.pointerType === 'mouse' && this.notenHochgewischt(dx, e.clientY - this.startY, e.target as HTMLElement)) return;
    // senkrecht gewischt = im Notenblatt gescrollt, kein Blättern
    if (Math.abs(e.clientY - this.startY) > 30 && Math.abs(e.clientY - this.startY) > Math.abs(dx)) return;
    if (Math.abs(dx) > 50) this.go(dx < 0 ? 1 : -1);
    else this.go(e.clientX < window.innerWidth / 3 ? -1 : 1);
  }

  // Tasten fürs Blättern (Fußpedal) – in Backstage → Einstellungen belegbar
  private readonly tasten = tasten();
  protected key(e: KeyboardEvent): void {
    if (this.tasten.weiter.includes(e.key)) this.go(1);
    else if (this.tasten.zurueck.includes(e.key)) this.go(-1);
    else if (e.key === 'Escape') this.notenOffen() && !this.notenRaus() ? this.notenSchliessen() : this.closed.emit();
    else if (/^[1-5]$/.test(e.key)) this.bewerte(Number(e.key));
    else return;
    e.preventDefault();
  }

  protected end(e: Event): void {
    e.stopPropagation();
    this.closed.emit();
  }
}
