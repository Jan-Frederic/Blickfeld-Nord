import { Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Song, durationOf } from '../data/setlist-data';
import { SongInfo, gespielteTonart } from '../data/songinfo';
import { NotenPdf, SongNoten, notenDatei, pdfName, songNoten } from '../data/noten';
import { fassungWaehlen, ladeWahl, pdfId, wahlSpeichern } from '../data/noten-wahl';
import { halbseite } from '../data/buehne-einstellungen';
import { NotenStift } from './noten-stift';
import { PdfDokument, pdfOeffnen, seiteZeichnen } from '../data/pdf';
import { Akkordblatt, blattTransponieren, chordproLesen, griffbild, tonartVerschieben } from '../data/chordpro';

// Notenblatt im Bühnen-Modus: PDF-Seiten (ggf. nur der Bereich des Songs im Songbook) oder das Akkordblatt
// (ChordPro, in die Tonart der Band transponiert – mit Capo als Griffbild). Geblättert wird vom Bühnen-Modus aus
// (Tippen, Wischen, Pfeiltasten, Bluetooth-Pedal): erst innerhalb des Blatts, am Ende weiter zum nächsten Song.
const BREITE_KEY = 'bn-noten-breite';
@Component({
  selector: 'app-noten-anzeige',
  imports: [MatIconModule, NotenStift],
  template: `
    <div class="noten">
      <header>
        <span class="titel">{{ song()?.title ?? 'Pause' }}</span>
        @if (ansicht() === 'pdf' && seiten().length) { <span class="seite">Seite {{ index() + 1 }}{{ halb() ? '–' + (index() + 2) : '' }} / {{ seiten().length }}</span> }
        @if (optionen().length > 1) {
          <select class="wahl" aria-label="Fassung wählen" (change)="waehlen($any($event.target).value); $any($event.target).blur()"
            (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            @for (o of optionen(); track o.id) { <option [value]="o.id" [selected]="o.id === wahl()">{{ o.label }}</option> }
          </select>
        }
        @if (ansicht() === 'pdf' && seiten().length) {
          <button type="button" class="stift" (click)="stiftUmschalten($event)" [attr.aria-pressed]="stift()" aria-label="Markieren" title="Im Notenblatt markieren">
            <mat-icon>edit</mat-icon>
          </button>
          <button type="button" (click)="breiteUmschalten($event)" [attr.aria-pressed]="nurBreite()" title="Ganze Seite oder volle Breite">
            <mat-icon>{{ nurBreite() ? 'fit_screen' : 'unfold_more' }}</mat-icon>
          </button>
        }
        @if (ansicht() === 'akkorde' && blatt()) {
          <span class="griff">{{ griffText() }}</span>
          <button type="button" (click)="verschieben(-1, $event)" aria-label="Halbton tiefer">−</button>
          <button type="button" (click)="verschieben(1, $event)" aria-label="Halbton höher">+</button>
          <button type="button" (click)="scrollen($event)" [attr.aria-pressed]="laeuft()" title="Scrollt in der Länge des Songs mit">
            <mat-icon>{{ laeuft() ? 'pause' : 'play_arrow' }}</mat-icon> Mitscrollen
          </button>
        }
        <button type="button" class="zu" (click)="zu($event)" aria-label="Noten schließen"><mat-icon>close</mat-icon></button>
      </header>
      <div class="flaeche" #flaeche [class.breit]="nurBreite()">
        @if (laden()) {
          <p class="hinweis">Lädt …</p>
        } @else if (fehler(); as f) {
          <p class="hinweis">{{ f }}</p>
        } @else if (ansicht() === 'pdf' && seiten().length) {
          <div class="blattseite">
            <canvas #leinwand></canvas>
            @if (aktivPdf(); as p) { <app-noten-stift [datei]="p.datei" [seite]="seiten()[index()]" [aktiv]="stift()" /> }
            <!-- Halbseiten-Blättern: oben schon der Anfang der nächsten Seite -->
            @if (halb()) { <canvas #naechste class="oben" aria-hidden="true"></canvas> }
          </div>
        } @else if (ansicht() === 'akkorde' && blatt(); as b) {
          <div class="blatt">
            @for (z of b.zeilen; track $index) {
              @switch (z.art) {
                @case ('text') {
                  <p class="zeile">@for (t of $any(z).teile; track $index) {<span class="teil"><b>{{ t.akkord ?? '' }}</b>{{ t.text || ' ' }}</span>}</p>
                }
                @case ('abschnitt') { <p class="abschnitt">{{ $any(z).text }}</p> }
                @case ('kommentar') { <p class="kommentar">{{ $any(z).text }}</p> }
                @default { <p class="leer"></p> }
              }
            }
          </div>
        } @else {
          <p class="hinweis">{{ song() ? 'Für diesen Song sind auf diesem Gerät keine Noten hinterlegt (Backstage → Songs).' : 'Pause' }}</p>
        }
      </div>
    </div>
  `,
  styles: `
    :host { position: absolute; inset: 0; z-index: 2; display: block; }
    .noten { height: 100%; display: flex; flex-direction: column; background: #111; color: #fff; }
    header { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: max(8px, env(safe-area-inset-top)) 12px 8px; background: #000; font-size: .95rem; }
    .titel { font-weight: 700; margin-right: auto; overflow-wrap: anywhere; }
    .seite, .griff { color: #e8a46a; font-variant-numeric: tabular-nums; }
    header button {
      display: inline-flex; align-items: center; gap: 4px; min-height: 40px; min-width: 40px; justify-content: center; padding: 0 10px;
      border-radius: 20px; border: 1px solid #444; background: transparent; color: #fff; font: inherit; cursor: pointer;
    }
    header button[aria-pressed=true] { border-color: #e8a46a; color: #e8a46a; }
    .wahl { min-height: 40px; max-width: 46vw; padding: 0 10px; border-radius: 20px; border: 1px solid #e8a46a; background: #000; color: #e8a46a; font: inherit; color-scheme: dark; }
    header mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .flaeche { flex: 1; min-height: 0; overflow: auto; display: grid; place-items: center; touch-action: pan-y; }
    .flaeche.breit { place-items: start center; }
    canvas { display: block; background: #fff; }
    .blattseite { position: relative; }
    canvas.oben { position: absolute; top: 0; left: 0; clip-path: inset(0 0 50% 0); }
    .blattseite:has(.oben)::after { content: ''; position: absolute; left: 0; right: 0; top: 50%; border-top: 3px solid #e8a46a; }
    .hinweis { color: #9aa0a6; padding: 24px; text-align: center; }
    .blatt { align-self: start; width: 100%; box-sizing: border-box; padding: 16px 20px 40vh; font-size: calc(clamp(1.05rem, 2.6vw, 1.6rem) * var(--zoom, 1)); line-height: 1.25; }
    .zeile { margin: 0; white-space: pre-wrap; }
    .teil { display: inline-flex; flex-direction: column; vertical-align: bottom; }
    .teil b { min-height: 1.2em; color: #e8a46a; font-weight: 700; padding-right: .4em; }
    .abschnitt { margin: 1em 0 .3em; color: #9aa0a6; text-transform: uppercase; letter-spacing: .12em; font-size: .75em; }
    .kommentar { margin: .4em 0; color: #9aa0a6; font-style: italic; }
    .leer { margin: 0; height: .8em; }
  `,
})
export class NotenAnzeige {
  /** aktueller Song (undefined = Pause) */
  readonly song = input<Song>();
  readonly info = input<SongInfo>();
  readonly schliessen = output<void>();

  private readonly flaeche = viewChild<ElementRef<HTMLDivElement>>('flaeche');
  private readonly leinwand = viewChild<ElementRef<HTMLCanvasElement>>('leinwand');
  private readonly naechste = viewChild<ElementRef<HTMLCanvasElement>>('naechste');
  /** Halbseiten-Blättern eingeschaltet (Backstage → Einstellungen) und gerade halb umgeblättert */
  private readonly halbseite = halbseite();
  protected readonly halb = signal(false);
  /** Markieren (Stift) eingeschaltet */
  protected readonly stift = signal(false);
  protected stiftUmschalten(e: Event): void {
    e.stopPropagation();
    this.stift.update((x) => !x);
  }

  protected readonly noten = signal<SongNoten | undefined>(undefined);
  protected readonly laden = signal(false);
  protected readonly fehler = signal('');
  /** gewählte Fassung: 'akkorde' oder pdfId(…) */
  protected readonly wahl = signal('');
  protected readonly ansicht = computed(() => (this.wahl() === 'akkorde' ? 'akkorde' : 'pdf'));
  protected readonly aktivPdf = computed(() => this.noten()?.pdfs?.find((p) => pdfId(p) === this.wahl()));
  protected readonly optionen = computed(() => {
    const n = this.noten();
    const pdfs = n?.pdfs ?? [];
    return [...pdfs.map((p, i) => ({ id: pdfId(p), label: pdfName(p, i, pdfs) })), ...(n?.chordpro ? [{ id: 'akkorde', label: 'Akkorde' }] : [])];
  });
  private gemerkt = ladeWahl();
  private vonHinten = false;
  protected readonly nurBreite = signal(ladeBreite());
  private readonly doc = signal<PdfDokument | null>(null);
  protected readonly index = signal(0);
  private readonly groesse = signal({ b: 0, h: 0 });
  private amEnde = false;

  /** Seiten des Songs im PDF (1-basiert) */
  protected readonly seiten = computed(() => {
    const d = this.doc();
    const p = this.aktivPdf();
    if (!d || !p) return [];
    const von = Math.min(Math.max(1, p.von ?? 1), d.numPages);
    const bis = Math.min(Math.max(von, p.bis ?? d.numPages), d.numPages);
    return Array.from({ length: bis - von + 1 }, (_, i) => von + i);
  });

  // Akkordblatt: in die Tonart der Band (mit Capo als Griffbild), dazu Halbtöne von Hand
  protected readonly extra = signal(0);
  private readonly roh = computed<Akkordblatt | null>(() => (this.noten()?.chordpro ? chordproLesen(this.noten()!.chordpro!) : null));
  // Tonart der Griffe im Blatt: {key: …}, sonst die Originaltonart – bei {capo: n} in der Datei n Halbtöne darunter
  private readonly geschrieben = computed(() => {
    const b = this.roh();
    const original = this.info()?.tonart;
    return b?.tonart ?? (original ? tonartVerschieben(original, -(b?.capo ?? 0)) : undefined);
  });
  private readonly griff = computed(() => {
    const i = this.info();
    return griffbild(this.geschrieben(), gespielteTonart(i), i?.capo ?? 0);
  });
  protected readonly blatt = computed(() => {
    const b = this.roh();
    if (!b) return null;
    return blattTransponieren({ ...b, tonart: this.geschrieben() }, this.griff().schritte + this.extra());
  });
  protected readonly griffText = computed(() => {
    const b = this.blatt();
    const capo = this.info()?.capo;
    const t = b?.tonart ? `Griffe in ${b.tonart}` : '';
    return [t, capo ? `Capo ${capo}` : '', this.extra() ? `${this.extra() > 0 ? '+' : ''}${this.extra()}` : ''].filter(Boolean).join(' · ');
  });
  protected readonly laeuft = signal(false);
  private rahmen = 0;

  constructor() {
    const pdfs = new Map<string, PdfDokument>();
    // Song gewechselt → seine Noten laden (PDF-Dokumente bleiben offen, ein Songbook wird nur einmal gelesen)
    effect(() => {
      const s = this.song();
      untracked(() => this.stoppen());
      this.extra.set(0);
      void this.ladeSong(s);
    });
    // Fassung gewechselt (Song oder Auswahl) → das PDF dazu öffnen
    effect(() => {
      const p = this.aktivPdf();
      untracked(() => void this.ladePdf(p, pdfs));
    });
    // Seite zeichnen, sobald Leinwand, Dokument, Seite und Größe feststehen
    effect(() => {
      const c = this.leinwand()?.nativeElement;
      const d = this.doc();
      const nr = this.seiten()[this.index()];
      const { b, h } = this.groesse();
      const breit = this.nurBreite();
      if (!c || !d || !nr || !b) return;
      seiteZeichnen(d, nr, c, b - 8, h - 8, breit).catch((e) => this.fehler.set(`Diese Seite lässt sich nicht anzeigen (${(e as Error).message}).`));
      this.flaeche()?.nativeElement.scrollTo(0, 0);
    });
    // Halbseite: die nächste Seite in gleicher Größe darüber zeichnen (sichtbar nur die obere Hälfte)
    effect(() => {
      const c = this.naechste()?.nativeElement;
      const d = this.doc();
      const nr = this.seiten()[this.index() + 1];
      const { b, h } = this.groesse();
      if (!c || !d || !nr || !b || !this.halb()) return;
      seiteZeichnen(d, nr, c, b - 8, h - 8, false).catch(() => this.halb.set(false));
    });
    const beobachter = new ResizeObserver(([e]) => this.groesse.set({ b: e.contentRect.width, h: e.contentRect.height }));
    effect(() => {
      const f = this.flaeche()?.nativeElement;
      if (f) beobachter.observe(f);
    });
    inject(DestroyRef).onDestroy(() => {
      beobachter.disconnect();
      this.stoppen();
      for (const d of pdfs.values()) d.destroy().catch(() => undefined);
    });
  }

  private async ladeSong(s: Song | undefined): Promise<void> {
    this.fehler.set('');
    this.vonHinten = this.amEnde;
    this.amEnde = false;
    if (!s) {
      this.noten.set(undefined);
      return this.wahl.set('');
    }
    this.laden.set(true);
    try {
      const n = await songNoten(`${s.title}|${s.artist}`);
      if (this.song() !== s) return;
      this.noten.set(n);
      this.wahl.set(n ? this.auswahl(n, `${s.title}|${s.artist}`) : '');
      // zurückgeblättert ins Akkordblatt: am Ende einsteigen
      if (this.vonHinten && this.ansicht() === 'akkorde') {
        this.vonHinten = false;
        requestAnimationFrame(() => requestAnimationFrame(() => this.flaeche()?.nativeElement.scrollTo(0, 1e6)));
      }
    } catch (e) {
      this.fehler.set(`Noten lassen sich nicht öffnen: ${(e as Error).message || 'unbekannter Fehler'}`);
    } finally {
      if (this.song() === s && !this.aktivPdf()) this.laden.set(false);
    }
  }

  private auswahl(n: SongNoten, key: string): string {
    return fassungWaehlen(n, key, this.gemerkt);
  }

  private async ladePdf(p: NotenPdf | undefined, pdfs: Map<string, PdfDokument>): Promise<void> {
    this.halb.set(false);
    this.doc.set(null);
    this.index.set(0);
    if (!p) return;
    this.laden.set(true);
    try {
      let d = pdfs.get(p.datei);
      if (!d) {
        const datei = await notenDatei(p.datei);
        if (!datei) throw new Error('PDF fehlt auf diesem Gerät');
        d = await pdfOeffnen(datei.daten);
        pdfs.set(p.datei, d);
      }
      if (this.aktivPdf() !== p) return;
      this.doc.set(d);
      if (this.vonHinten) this.index.set(this.seiten().length - 1);
      this.vonHinten = false;
    } catch (e) {
      this.fehler.set(`Noten lassen sich nicht öffnen: ${(e as Error).message || 'unbekannter Fehler'}`);
    } finally {
      if (this.aktivPdf() === p) this.laden.set(false);
    }
  }

  /**
   * Einen Schritt weiter bzw. zurück innerhalb des Blatts: erst scrollen (wenn die Seite höher als der Bildschirm
   * ist), dann zur nächsten Seite. false = am Ende bzw. Anfang angekommen, der Bühnen-Modus wechselt den Song.
   */
  blaettern(richtung: number): boolean {
    const f = this.flaeche()?.nativeElement;
    const schritt = f ? f.clientHeight * 0.85 : 0;
    if (f && richtung > 0 && f.scrollTop + f.clientHeight < f.scrollHeight - 4) {
      f.scrollBy({ top: schritt, behavior: 'smooth' });
      return true;
    }
    if (f && richtung < 0 && f.scrollTop > 4) {
      f.scrollBy({ top: -schritt, behavior: 'smooth' });
      return true;
    }
    if (this.ansicht() === 'pdf' && this.seiten().length) {
      // Halbseiten-Blättern (nur bei ganzer Seite): vor → erst halb, dann ganz; zurück aus „halb“ → wieder ganz
      if (this.halbseite && !this.nurBreite()) {
        if (richtung > 0 && !this.halb() && this.index() + 1 < this.seiten().length) {
          this.halb.set(true);
          return true;
        }
        if (this.halb()) {
          this.halb.set(false);
          if (richtung > 0) this.index.update((i) => i + 1);
          return true;
        }
      }
      const ziel = this.index() + richtung;
      if (ziel >= 0 && ziel < this.seiten().length) {
        this.index.set(ziel);
        return true;
      }
    }
    // zurück zum vorigen Song: dort auf der letzten Seite einsteigen
    this.amEnde = richtung < 0;
    return false;
  }

  protected waehlen(id: string): void {
    const s = this.song();
    if (!s) return;
    this.stoppen();
    this.vonHinten = false;
    this.wahl.set(id);
    this.gemerkt = { songs: { ...this.gemerkt.songs, [`${s.title}|${s.artist}`]: id }, art: this.ansicht(), name: this.aktivPdf()?.name ?? this.gemerkt.name };
    wahlSpeichern(this.gemerkt);
  }

  protected breiteUmschalten(e: Event): void {
    e.stopPropagation();
    this.nurBreite.update((b) => !b);
    try {
      localStorage.setItem(BREITE_KEY, this.nurBreite() ? '1' : '0');
    } catch {
      // ohne Speicher gilt die Wahl bis zum Schließen
    }
  }

  protected verschieben(halbtoene: number, e: Event): void {
    e.stopPropagation();
    this.extra.update((x) => Math.max(-11, Math.min(11, x + halbtoene)));
  }

  // Mitscrollen: gleichmäßig in der Länge des Songs (Spotify-Länge, sonst 3:30) vom Anfang bis zum Ende des Blatts
  protected scrollen(e: Event): void {
    e.stopPropagation();
    if (this.laeuft()) return this.stoppen();
    const f = this.flaeche()?.nativeElement;
    const s = this.song();
    if (!f || !s) return;
    const sekunden = durationOf(s) ?? 210;
    const tempo = Math.max(0, f.scrollHeight - f.clientHeight) / sekunden;
    let zuletzt = performance.now();
    let pos = f.scrollTop;
    const schritt = (jetzt: number) => {
      pos += (tempo * (jetzt - zuletzt)) / 1000;
      zuletzt = jetzt;
      f.scrollTop = pos;
      if (pos >= f.scrollHeight - f.clientHeight) return this.stoppen();
      this.rahmen = requestAnimationFrame(schritt);
    };
    this.laeuft.set(true);
    this.rahmen = requestAnimationFrame(schritt);
  }

  private stoppen(): void {
    cancelAnimationFrame(this.rahmen);
    this.laeuft.set(false);
  }

  protected zu(e: Event): void {
    e.stopPropagation();
    this.schliessen.emit();
  }
}

function ladeBreite(): boolean {
  try {
    return localStorage.getItem(BREITE_KEY) === '1';
  } catch {
    return false;
  }
}

