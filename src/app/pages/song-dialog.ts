import { Component, ElementRef, afterNextRender, input, output, signal, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SongWerte } from '../data/songinfo';
import { NotenDateiInfo } from '../data/noten';
import { NotenEditor } from './noten-editor';
import { SongMitschnitte } from './song-mitschnitte';

// Dialog „Song bearbeiten“ (Backstage → Songs): Tonart (Original und wie die Band spielt), Capo, Tempo – auch per
// Tippen im Takt –, Notiz, Recherche-Quelle sowie Noten (PDF, Akkordblatt). Mit „Voriger/Nächster“ lässt sich die
// Liste durchgehen, „Im Bühnen-Modus“ öffnet den Song zur Kontrolle so, wie er auf der Bühne erscheint.
// Dazu: „Wackelt noch“ (eigene Übe-Liste) und Proben-Mitschnitte (nur auf diesem Gerät).
const TONARTEN = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'H'];

export interface SongZeile {
  title: string;
  artist: string;
  key: string;
}

@Component({
  selector: 'app-song-dialog',
  imports: [MatIconModule, NotenEditor, SongMitschnitte],
  template: `
    <dialog #dialog (close)="schliessen.emit()" [attr.aria-labelledby]="'song-dialog-titel'">
      <header>
        <div class="titel">
          <h3 id="song-dialog-titel">{{ song().title }}</h3>
          <span class="a">{{ song().artist }}</span>
        </div>
        <button type="button" class="wackelt" [class.an]="wackelt()" [attr.aria-pressed]="wackelt()" (click)="wackeltUmschalten.emit()" title="Nur für dich: Songs, bei denen du unsicher bist, schlägt die Probe-Planung zuerst vor">
          <mat-icon>{{ wackelt() ? 'warning' : 'check' }}</mat-icon> {{ wackelt() ? 'Wackelt noch' : 'Sitzt' }}
        </button>
        <button type="button" class="icon" (click)="zu()" aria-label="Schließen"><mat-icon>close</mat-icon></button>
      </header>

      <div class="felder">
        <label>Original
          <select (change)="setzen.emit({ feld: 'tonart', roh: $any($event.target).value })">
            <option value="" [selected]="!werte().tonart">–</option>
            @for (t of tonarten; track t) { <option [value]="t" [selected]="werte().tonart === t">{{ t }}</option> }
          </select>
        </label>
        <label>Wir spielen
          <select (change)="setzen.emit({ feld: 'spielTonart', roh: $any($event.target).value })">
            <option value="" [selected]="!werte().spielTonart">wie Original</option>
            @for (t of tonarten; track t) { <option [value]="t" [selected]="werte().spielTonart === t">{{ t }}</option> }
          </select>
        </label>
        <label>Capo
          <select (change)="setzen.emit({ feld: 'capo', roh: $any($event.target).value })">
            <option value="" [selected]="!werte().capo">–</option>
            @for (c of capos; track c) { <option [value]="c" [selected]="werte().capo === c">{{ c }}</option> }
          </select>
        </label>
        <label>bpm
          <span class="tempo">
            <input type="number" min="40" max="240" inputmode="numeric" [value]="werte().bpm ?? ''" (change)="setzen.emit({ feld: 'bpm', roh: $any($event.target).value })" />
            <button type="button" class="tap" [class.aktiv]="tapZahl() > 0" (click)="tippen()" aria-label="Tempo im Takt tippen" title="Mindestens 4-mal im Takt tippen">
              @if (tapZahl() > 0) { {{ tapBpm() ?? tapZahl() + '/4' }} } @else { <mat-icon>touch_app</mat-icon> }
            </button>
          </span>
        </label>
        <label class="notiz">Notiz
          <input maxlength="40" placeholder="z. B. Intro Gitarre" [value]="werte().notiz ?? ''" (change)="setzen.emit({ feld: 'notiz', roh: $any($event.target).value })" />
        </label>
      </div>
      @if (quelle(); as q) { <p class="quelle"><mat-icon>info</mat-icon> Recherche: {{ q }}</p> }

      <!-- je Song neu anlegen, damit der Editor die Noten des neuen Songs lädt -->
      @for (s of [song()]; track s.key) {
        <app-noten-editor [songKey]="s.key" [dateien]="dateien()" (geaendert)="notenGeaendert.emit()" />
        <app-song-mitschnitte [songKey]="s.key" [titel]="s.title" />
      }

      <footer>
        <button type="button" (click)="blaettern.emit(-1)" [disabled]="!hatVorigen()"><mat-icon>chevron_left</mat-icon> Voriger</button>
        <span class="pos">{{ position() }}</span>
        <button type="button" (click)="blaettern.emit(1)" [disabled]="!hatNaechsten()">Nächster <mat-icon>chevron_right</mat-icon></button>
        <button type="button" class="primaer" (click)="buehne.emit()"><mat-icon>fit_screen</mat-icon> Im Bühnen-Modus ansehen</button>
      </footer>
    </dialog>
  `,
  styles: `
    dialog {
      width: min(760px, calc(100vw - 24px)); max-height: calc(100dvh - 24px); box-sizing: border-box; padding: 18px 20px; overflow: auto;
      border: 1px solid var(--bn-line); border-radius: 14px; background: #15171a; color: var(--bn-ink);
    }
    dialog::backdrop { background: rgba(0, 0, 0, .6); }
    header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
    .titel { flex: 1; min-width: 0; overflow-wrap: anywhere; }
    h3 { margin: 0; font-size: 1.15rem; }
    .a { color: var(--bn-fog); font-size: .88rem; }
    .felder { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    .notiz { grid-column: 1 / -1; }
    label { display: grid; gap: 2px; min-width: 0; font-size: .72rem; color: var(--bn-fog); text-transform: uppercase; letter-spacing: .08em; }
    select, input {
      width: 100%; box-sizing: border-box; padding: 7px 8px; border: 1px solid var(--bn-line); border-radius: 8px; background: #1b1e22;
      color: var(--bn-ink); font: inherit; font-size: .9rem; text-transform: none; letter-spacing: 0; color-scheme: dark;
    }
    .tempo { display: flex; gap: 4px; }
    .tempo input { min-width: 0; }
    button {
      display: inline-flex; align-items: center; justify-content: center; gap: 4px; min-height: 36px; padding: 0 12px; border: 1px solid var(--bn-line);
      border-radius: 999px; background: none; color: var(--bn-ink); font: inherit; font-size: .85rem; text-transform: none; letter-spacing: 0; cursor: pointer;
    }
    button:hover:not(:disabled), .tap.aktiv { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    button:disabled { opacity: .4; cursor: default; }
    button.icon, .tap { flex: none; padding: 0 8px; border-radius: 8px; }
    .wackelt { flex: none; color: var(--bn-fog); }
    .wackelt.an { border-color: #e0b25a; color: #e0b25a; }
    button.primaer { margin-left: auto; background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .quelle { display: flex; align-items: center; gap: 6px; margin: 10px 0 0; font-size: .78rem; color: var(--bn-fog); }
    .quelle mat-icon { flex: none; font-size: 14px; width: 14px; height: 14px; }
    footer { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--bn-line); }
    .pos { font-size: .8rem; color: var(--bn-fog); font-variant-numeric: tabular-nums; }
    @media (max-width: 560px) {
      .felder { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      button.primaer { margin-left: 0; flex-basis: 100%; }
    }
  `,
})
export class SongDialog {
  readonly song = input.required<SongZeile>();
  readonly werte = input.required<SongWerte>();
  readonly quelle = input<string>();
  readonly dateien = input.required<NotenDateiInfo[]>();
  /** z. B. „3 / 52“ */
  readonly position = input('');
  readonly hatVorigen = input(false);
  readonly hatNaechsten = input(false);
  /** auf der eigenen „Wackelt noch“-Liste */
  readonly wackelt = input(false);
  readonly wackeltUmschalten = output<void>();
  readonly setzen = output<{ feld: keyof SongWerte; roh: string }>();
  readonly notenGeaendert = output<void>();
  readonly blaettern = output<number>();
  readonly buehne = output<void>();
  readonly schliessen = output<void>();

  protected readonly tonarten = [...TONARTEN, ...TONARTEN.map((t) => t + 'm')];
  protected readonly capos = Array.from({ length: 9 }, (_, i) => i + 1);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  protected zu(): void {
    this.dialog().nativeElement.close();
  }

  // Tap-Tempo: im Takt tippen, ab dem 4. Tippen wird das Tempo aus den letzten (bis zu 8) Abständen übernommen;
  // mehr als 2 Sekunden Pause beginnt neu
  protected readonly tapZahl = signal(0);
  protected readonly tapBpm = signal<number | null>(null);
  private tapZeiten: number[] = [];
  protected tippen(): void {
    const jetzt = performance.now();
    if (jetzt - (this.tapZeiten.at(-1) ?? 0) > 2000) {
      this.tapZeiten = [];
      this.tapBpm.set(null);
    }
    this.tapZeiten = [...this.tapZeiten, jetzt].slice(-9);
    this.tapZahl.set(this.tapZeiten.length);
    if (this.tapZeiten.length < 4) return;
    const bpm = Math.round(60000 / ((this.tapZeiten.at(-1)! - this.tapZeiten[0]) / (this.tapZeiten.length - 1)));
    if (bpm < 40 || bpm > 240) return;
    this.tapBpm.set(bpm);
    this.setzen.emit({ feld: 'bpm', roh: String(bpm) });
  }
}
