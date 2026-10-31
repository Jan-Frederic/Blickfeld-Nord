import { Component, DestroyRef, ElementRef, computed, inject, input, linkedSignal, output, signal, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Entry, durationOf, isPause, setLength, setTime, setsOf, songTime } from '../data/setlist-data';
import { gespielteTonart, songInfo } from '../data/songinfo';
import { alleSongNoten, pdfjsVorladen } from '../data/noten';
import { NotenAnzeige } from './noten-anzeige';
import { Stimmgeraet } from './stimmgeraet';
import { tasten } from '../data/buehne-einstellungen';
import { BEWERTUNG_PREFIX, alleBewertungen, bewerten, ladeBewertungen, rangliste, songKey } from '../data/bewertung';
import { RestSong, streichVorschlag, ueberzug } from '../data/kuerzen';
import { wunschEinfuegen } from '../data/buehne-wunsch';
import { LISTEN, songAbgleich } from '../data/playlisten';

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

@Component({
  selector: 'app-setlist-buehne',
  imports: [MatIconModule, NotenAnzeige, Stimmgeraet],
  host: { tabindex: '-1', '(keydown)': 'key($event)' },
  template: `
    <div class="stage" (pointerdown)="down($event)" (pointerup)="up($event)" [style.--zoom]="zoom()">
      <header>
        <span class="set">Set {{ setNo() }} / {{ sets().length }}</span>
        <span class="clock" [class.over]="remaining() < 0">
          <mat-icon>timer</mat-icon> {{ fmt(elapsed()) }}
          @if (planned()) { <small>/ {{ plannedText() }} · {{ remaining() < 0 ? '+' + fmt(-remaining()) : 'noch ' + fmt(remaining()) }}</small> }
        </span>
        <span class="zoom" role="group" aria-label="Schriftgröße">
          <button type="button" (click)="zoomen(-1)" [disabled]="zoom() <= ZOOM_MIN" aria-label="Schrift kleiner">A−</button>
          <button type="button" (click)="zoomen(1)" [disabled]="zoom() >= ZOOM_MAX" aria-label="Schrift größer">A+</button>
        </span>
        @if (notenSongs().size) {
          <button type="button" class="noten-knopf" (click)="notenUmschalten($event)" [attr.aria-pressed]="notenOffen()" aria-label="Noten anzeigen">
            <mat-icon>library_music</mat-icon>
          </button>
        }
        <button type="button" class="close lupe" (click)="lupeAuf($event)" [attr.aria-pressed]="lupe()" aria-label="Song suchen (Wunsch)"><mat-icon>search</mat-icon></button>
        <button type="button" class="close" (click)="stimmen.set(!stimmen()); $event.stopPropagation()" [attr.aria-pressed]="stimmen()" aria-label="Stimmgerät"><mat-icon>tune</mat-icon></button>
        <button type="button" class="close" (click)="end($event)" aria-label="Bühnen-Modus beenden"><mat-icon>close</mat-icon></button>
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
                  <button type="button" class="bpm" [class.on]="klick()" [class.beat]="beat()" (click)="toggleKlick($event)" [attr.aria-pressed]="klick()">
                    {{ klickBpm() }} bpm · Klick
                  </button>
                  <button type="button" class="ton" (click)="einzaehlen($event)" aria-label="Einzählen" title="Vier Schläge im Tempo des Songs vorzählen">1-2-3-4</button>
                  @if (klick()) {
                    <button type="button" class="ton tempo" [class.on]="faktor() < 1" (click)="langsamer($event)" [attr.aria-label]="'Übungstempo ' + faktorText() + ', antippen für langsamer'" title="Zum Üben langsamer: 100 → 90 → 80 → 70 %">{{ faktorText() }}</button>
                    <button type="button" class="ton" [class.on]="ton()" (click)="toggleTon($event)" [attr.aria-pressed]="ton()" [attr.aria-label]="ton() ? 'Ton aus' : 'Ton an'">
                      <mat-icon>{{ ton() ? 'volume_up' : 'volume_off' }}</mat-icon>
                    </button>
                  }
                }
                @if (i.notiz) { <span class="note">{{ i.notiz }}</span> }
              </p>
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
        <div class="suche" (pointerdown)="$event.stopPropagation()" (pointerup)="$event.stopPropagation()" (keydown)="$event.stopPropagation(); $event.key === 'Escape' && lupe.set(false)">
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
      @if (zaehler()) { <div class="einzaehlen" aria-live="assertive">{{ zaehler() }}</div> }
      @if (notenOffen()) { <app-noten-anzeige [song]="aktuellerSong()" [info]="info()" (schliessen)="notenOffen.set(false)" /> }
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
    .noten-knopf { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 24px; border: 1px solid #333; background: transparent; color: #fff; cursor: pointer; }
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
  protected readonly planned = computed(() => setLength(this.sets()[this.setNo() - 1] ?? []).seconds);
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
    this.notenOffen.update((o) => !o);
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
    document.documentElement.requestFullscreen?.().catch(() => undefined);
    queueMicrotask(() => this.host.nativeElement.focus());
    inject(DestroyRef).onDestroy(() => {
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
    this.startKlick();
  }

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

  private startKlick(): void {
    this.stopKlick();
    const bpm = this.klickBpm();
    if (!this.klick() || !bpm) return;
    this.klickTimer = setInterval(() => {
      this.beat.set(true);
      setTimeout(() => this.beat.set(false), 90);
      if (this.ton()) this.piep(1000);
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

  // Einzählen: vier Schläge im Tempo des Songs (beim Üben im gewählten Übungstempo) groß über dem Bildschirm,
  // mit Ton, wenn er eingeschaltet ist – die Eins höher. Danach läuft der Klick weiter, falls er an war.
  protected readonly zaehler = signal(0);
  private zaehlTimer: ReturnType<typeof setInterval> | undefined;
  protected einzaehlen(e: Event): void {
    e.stopPropagation();
    const bpm = Math.round((this.info()?.bpm ?? 0) * this.faktor());
    if (!bpm) return;
    this.stopKlick();
    this.stopZaehlen();
    let n = 0;
    const schlag = () => {
      if (++n > 4) {
        this.stopZaehlen();
        this.startKlick();
        return;
      }
      this.zaehler.set(n);
      if (this.ton()) this.piep(n === 1 ? 1500 : 1000);
    };
    schlag();
    this.zaehlTimer = setInterval(schlag, 60000 / bpm);
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
  protected readonly streichen = computed(() => streichVorschlag(this.rest(), this.ueber()));
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
    else if (e.key === 'Escape') this.notenOffen() ? this.notenOffen.set(false) : this.closed.emit();
    else if (/^[1-5]$/.test(e.key)) this.bewerte(Number(e.key));
    else return;
    e.preventDefault();
  }

  protected end(e: Event): void {
    e.stopPropagation();
    this.closed.emit();
  }
}
