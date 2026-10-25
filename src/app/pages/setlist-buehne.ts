import { Component, DestroyRef, ElementRef, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Entry, durationOf, isPause, setLength, setTime, setsOf, songTime } from '../data/setlist-data';
import { songInfo } from '../data/songinfo';
import { BEWERTUNG_PREFIX, bewerten, ladeBewertungen, songKey } from '../data/bewertung';

// Bühnen-Modus: Setlist im Vollbild für Tablet/Handy am Mikroständer. Großer aktueller Song, danach der nächste;
// weiter per Tippen rechts, Wischen oder Pfeiltaste, zurück per Tippen links. Der Bildschirm bleibt an (Wake Lock),
// die Uhr zeigt, wie lange das Set schon läuft und wie lange es laut Spotify-Längen noch dauert.
// Tonart und Tempo aus songinfo.ts stehen unter dem Titel; „Klick“ blinkt (und piept auf Wunsch) im Tempo.
// Sterne (oder Tasten 1–5) bewerten, wie der Song an diesem Abend lief – Rangliste unter Backstage → Zahlen.
@Component({
  selector: 'app-setlist-buehne',
  imports: [MatIconModule],
  host: { tabindex: '-1', '(keydown)': 'key($event)' },
  template: `
    <div class="stage" (pointerdown)="down($event)" (pointerup)="up($event)">
      <header>
        <span class="set">Set {{ setNo() }} / {{ sets().length }}</span>
        <span class="clock" [class.over]="remaining() < 0">
          <mat-icon>timer</mat-icon> {{ fmt(elapsed()) }}
          @if (planned()) { <small>/ {{ plannedText() }} · {{ remaining() < 0 ? '+' + fmt(-remaining()) : 'noch ' + fmt(remaining()) }}</small> }
        </span>
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
            @if (info(); as i) {
              <p class="info">
                @if (i.tonart) { <span class="key" title="Tonart">{{ i.tonart }}</span> }
                @if (i.bpm) {
                  <button type="button" class="bpm" [class.on]="klick()" [class.beat]="beat()" (click)="toggleKlick($event)" [attr.aria-pressed]="klick()">
                    {{ i.bpm }} bpm · Klick
                  </button>
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
        <span class="progress"><span [style.width.%]="progress()"></span></span>
      </footer>
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
    .close { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 50%; border: 1px solid #333; background: transparent; color: #fff; cursor: pointer; }
    main { flex: 1; display: flex; flex-direction: column; justify-content: center; text-align: center; min-height: 0; }
    .no { margin: 0; font-size: clamp(1.5rem, 5vw, 3rem); color: var(--bn-sunset); font-variant-numeric: tabular-nums; }
    h1 { margin: .1em 0; font-size: clamp(2.6rem, 11vw, 7.5rem); line-height: 1.05; font-weight: 700; overflow-wrap: anywhere; }
    .artist { margin: 0; font-size: clamp(1.1rem, 4vw, 2.2rem); color: #b0b6bc; }
    .info { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin: 16px 0 0; font-size: clamp(1rem, 3vw, 1.6rem); }
    .key { padding: 4px 14px; border-radius: 8px; background: #e8a46a; color: #000; font-weight: 700; }
    .bpm { padding: 4px 14px; border-radius: 8px; border: 1px solid #555; background: transparent; color: #fff; font: inherit; cursor: pointer; }
    .bpm.on { border-color: #e8a46a; }
    .bpm.on.beat { background: #e8a46a; color: #000; }
    .note { color: #b0b6bc; }
    .next-info { color: #e8a46a; }
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
    .progress { grid-column: 1 / -1; height: 6px; border-radius: 3px; background: #222; margin-top: 10px; overflow: hidden; }
    .progress span { display: block; height: 100%; background: var(--bn-sunset); }
  `,
})
export class SetlistBuehne {
  readonly entries = input.required<Entry[]>();
  /** Auftritts-ID – nur damit gibt es Sterne */
  readonly show = input<string>();
  readonly closed = output<void>();

  protected readonly isPause = isPause;
  protected readonly index = signal(0);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly now = signal(Date.now());
  private setStart = Date.now();

  protected readonly sets = computed(() => setsOf(this.entries()));
  protected readonly current = computed(() => this.entries()[this.index()]);
  protected readonly next = computed(() => this.entries()[this.index() + 1]);
  // Set-Nummer: Pausen vor der aktuellen Position zählen (Pause gehört noch zum Set davor)
  protected readonly setNo = computed(() => this.entries().slice(0, this.index()).filter((e) => isPause(e)).length + 1);
  protected readonly songNo = computed(() => this.entries().slice(0, this.index() + 1).filter((e) => !isPause(e)).length);
  protected readonly progress = computed(() => (this.entries().length ? ((this.index() + 1) / this.entries().length) * 100 : 0));
  protected readonly elapsed = computed(() => Math.max(0, Math.round((this.now() - this.setStart) / 1000)));
  protected readonly planned = computed(() => setLength(this.sets()[this.setNo() - 1] ?? []).seconds);
  protected readonly plannedText = computed(() => setTime(this.planned()));
  protected readonly remaining = computed(() => this.planned() - this.elapsed());

  protected readonly info = computed(() => {
    const c = this.current();
    return c && !isPause(c) ? songInfo(c.title, c.artist) : undefined;
  });
  // Tonart und Tempo des nächsten Songs – zum Umstimmen bzw. Einzählen schon vorher sichtbar
  protected readonly nextInfo = computed(() => {
    const n = this.next();
    const i = n && !isPause(n) ? songInfo(n.title, n.artist) : undefined;
    return i ? [i.tonart, i.bpm && `${i.bpm} bpm`].filter(Boolean).join(' · ') : '';
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

  // Klick: blinkt im Tempo des aktuellen Songs, kurzer Ton über Web Audio
  protected readonly klick = signal(false);
  protected readonly beat = signal(false);
  private klickTimer: ReturnType<typeof setInterval> | undefined;
  private audio: AudioContext | undefined;

  private wakeLock: { release(): Promise<void> } | null = null;
  private startX = 0;

  constructor() {
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

  private startKlick(): void {
    this.stopKlick();
    const bpm = this.info()?.bpm;
    if (!this.klick() || !bpm) return;
    this.audio ??= new AudioContext();
    this.klickTimer = setInterval(() => {
      this.beat.set(true);
      setTimeout(() => this.beat.set(false), 90);
      const osc = this.audio!.createOscillator();
      const gain = this.audio!.createGain();
      osc.frequency.value = 1000;
      gain.gain.setValueAtTime(0.2, this.audio!.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audio!.currentTime + 0.05);
      osc.connect(gain).connect(this.audio!.destination);
      osc.start();
      osc.stop(this.audio!.currentTime + 0.05);
    }, 60000 / bpm);
  }

  private stopKlick(): void {
    clearInterval(this.klickTimer);
    this.beat.set(false);
  }

  protected go(step: number): void {
    const before = this.setNo();
    const target = Math.min(this.entries().length, Math.max(0, this.index() + step));
    this.index.set(target);
    // neues Set beginnt (nach der Pause weiter) → Uhr neu starten
    if (this.setNo() !== before) this.setStart = Date.now();
    // Klick läuft im Tempo des neuen Songs weiter (ohne Tempo: aus)
    this.startKlick();
  }

  // Tippen: rechte zwei Drittel weiter, linkes Drittel zurück; Wischen nach links/rechts ebenso
  protected down(e: PointerEvent): void {
    this.startX = e.clientX;
  }
  protected up(e: PointerEvent): void {
    if ((e.target as HTMLElement).closest('button')) return;
    const dx = e.clientX - this.startX;
    if (Math.abs(dx) > 50) this.go(dx < 0 ? 1 : -1);
    else this.go(e.clientX < window.innerWidth / 3 ? -1 : 1);
  }

  protected key(e: KeyboardEvent): void {
    if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(e.key)) this.go(1);
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) this.go(-1);
    else if (e.key === 'Escape') this.closed.emit();
    else if (/^[1-5]$/.test(e.key)) this.bewerte(Number(e.key));
    else return;
    e.preventDefault();
  }

  protected end(e: Event): void {
    e.stopPropagation();
    this.closed.emit();
  }
}
