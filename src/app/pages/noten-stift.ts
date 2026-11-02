import { Component, DestroyRef, ElementRef, afterRenderEffect, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Strich, markierungen, markierungenSetzen } from '../data/noten';

// Markierungen im Notenblatt (Bühnen-Modus → Noten → Stift): eine durchsichtige Leinwand genau über der PDF-Seite.
// Gezeichnet wird mit Finger, Stift oder Maus; die Striche werden in Seitenanteilen (0–1) gespeichert und passen so
// bei jeder Größe. Gespeichert je PDF-Datei und Seite auf diesem Gerät (data/noten.ts), im Notenpaket enthalten.
// Markierungen gelten für alle in der Band (Synchronisation); mit dem Personen-Knopf nur für mich.
// Schrift: mit „T“ auf Text umschalten, auf die Stelle tippen und den Text eingeben – auch mehrzeilig (drei Größen);
// Tippen auf einen vorhandenen Text ändert oder löscht ihn.
const FARBEN = [
  { farbe: '#d93025', name: 'Rot' },
  { farbe: '#1a73e8', name: 'Blau' },
  { farbe: '#188038', name: 'Grün' },
  { farbe: 'rgba(255, 213, 0, .45)', name: 'Textmarker' },
];

/** Schriftgrößen als Anteil der Seitenbreite */
const GROESSEN = [
  { wert: 0.022, name: 'klein' },
  { wert: 0.032, name: 'mittel' },
  { wert: 0.046, name: 'groß' },
];

/** Zeilenabstand mehrzeiliger Texte (× Schriftgröße) */
const ZEILE = 1.25;

const PRIVAT_KEY = 'bn-noten-stift-privat';
function ladePrivat(): boolean {
  try {
    return localStorage.getItem(PRIVAT_KEY) === '1';
  } catch {
    return false;
  }
}

@Component({
  selector: 'app-noten-stift',
  imports: [MatIconModule],
  host: { '[class.aktiv]': 'aktiv()', '[class.text]': "aktiv() && modus() === 'text'" },
  template: `
    <canvas #flaeche (pointerdown)="runter($event)" (pointermove)="ziehen($event)" (pointerup)="hoch($event)" (pointercancel)="hoch($event)"
      (click)="$event.stopPropagation()"></canvas>
    @if (aktiv()) {
      <div class="werkzeuge" (pointerdown)="$event.stopPropagation()" (pointerup)="$event.stopPropagation()" (click)="$event.stopPropagation()">
        <button type="button" class="modus" [class.an]="modus() === 'text'" (click)="modus.set(modus() === 'text' ? 'stift' : 'text')" [attr.aria-pressed]="modus() === 'text'"
          [attr.aria-label]="modus() === 'text' ? 'Schrift: auf die Stelle tippen' : 'Schrift einfügen'" title="Schrift"><mat-icon>title</mat-icon></button>
        @if (modus() === 'text') {
          <button type="button" class="groesse" (click)="groesseWeiter()" [attr.aria-label]="'Schriftgröße ' + groessen[groesse()].name" title="Schriftgröße">
            <span [style.font-size.px]="10 + groesse() * 4">A</span></button>
        }
        @for (f of farben; track f.farbe) {
          <button type="button" class="farbe" [class.an]="farbe() === f.farbe" [style.background]="f.farbe" (click)="farbe.set(f.farbe)" [attr.aria-label]="f.name" [attr.aria-pressed]="farbe() === f.farbe"></button>
        }
        <button type="button" class="wer" [class.an]="privat()" (click)="privatUmschalten()" [attr.aria-pressed]="privat()"
          [attr.aria-label]="privat() ? 'Neue Markierungen nur für mich' : 'Neue Markierungen für alle'" [title]="privat() ? 'Nur für mich' : 'Für alle in der Band'">
          <mat-icon>{{ privat() ? 'person' : 'groups' }}</mat-icon></button>
        <button type="button" (click)="rueckgaengig()" [disabled]="!striche().length" aria-label="Letzte Markierung entfernen"><mat-icon>undo</mat-icon></button>
        <button type="button" (click)="leeren()" [disabled]="!striche().length" aria-label="Alle Markierungen dieser Seite löschen"><mat-icon>delete</mat-icon></button>
      </div>
    }
    @if (eingabe(); as e) {
      <!-- Schrift: mehrzeilig (Enter = neue Zeile, Strg/Cmd+Enter = übernehmen); Tasten und Tippen blättern hier nicht -->
      <div class="schrift" role="dialog" aria-label="Text für das Notenblatt" (pointerdown)="$event.stopPropagation()" (pointerup)="$event.stopPropagation()"
        (click)="$event.stopPropagation()" (keydown)="schriftTaste($event)">
        <textarea #feld rows="3" maxlength="200" [value]="e.text" placeholder="Text – Enter für eine neue Zeile" aria-label="Text"></textarea>
        <div class="knoepfe">
          <button type="button" class="ok" (click)="schriftFertig(feld.value)">Übernehmen</button>
          @if (e.index >= 0) { <button type="button" (click)="schriftFertig('')">Löschen</button> }
          <button type="button" (click)="eingabe.set(null)">Abbrechen</button>
        </div>
      </div>
    }
  `,
  styles: `
    :host { position: absolute; inset: 0; pointer-events: none; }
    canvas { position: absolute; inset: 0; width: 100%; height: 100%; background: none !important; }
    :host(.aktiv) canvas { pointer-events: auto; touch-action: none; cursor: crosshair; outline: 2px dashed #e8a46a; outline-offset: -2px; }
    :host(.text) canvas { cursor: text; }
    .modus.an { border-color: #e8a46a; color: #e8a46a; }
    .groesse span { font-weight: 700; line-height: 1; }
    .schrift { position: absolute; left: 50%; top: 12px; transform: translateX(-50%); width: min(92%, 420px); display: grid; gap: 8px; padding: 10px; border-radius: 12px; background: rgba(0, 0, 0, .88); pointer-events: auto; z-index: 2; }
    .schrift textarea { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #555; border-radius: 8px; background: #15171a; color: #fff; font: 600 16px system-ui, sans-serif; resize: vertical; }
    .schrift .knoepfe { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
    .schrift .knoepfe button { width: auto; height: 34px; padding: 0 14px; border-radius: 999px; font: inherit; font-size: .85rem; }
    .schrift .ok { border-color: #e8a46a; color: #e8a46a; }
    .werkzeuge {
      position: absolute; right: 8px; bottom: 8px; display: flex; gap: 6px; padding: 6px; border-radius: 999px;
      background: rgba(0, 0, 0, .8); pointer-events: auto;
    }
    button { display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid #444; border-radius: 50%; background: transparent; color: #fff; cursor: pointer; }
    button:disabled { opacity: .4; }
    .farbe.an { outline: 3px solid #fff; outline-offset: 1px; }
    .wer.an { border-color: #e8a46a; color: #e8a46a; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `,
})
export class NotenStift {
  /** PDF-Datei-ID und Seite (1-basiert) */
  readonly datei = input.required<string>();
  readonly seite = input.required<number>();
  readonly aktiv = input(false);
  protected readonly farben = FARBEN;
  protected readonly farbe = signal(FARBEN[0].farbe);
  /** zeichnen oder schreiben */
  protected readonly modus = signal<'stift' | 'text'>('stift');
  protected readonly groessen = GROESSEN;
  protected readonly groesse = signal(1);
  protected groesseWeiter(): void {
    this.groesse.update((g) => (g + 1) % GROESSEN.length);
  }
  protected readonly striche = signal<Strich[]>([]);
  /** neue Striche nur für mich (Standard: für alle in der Band) – je Person gemerkt */
  protected readonly privat = signal(ladePrivat());
  protected privatUmschalten(): void {
    this.privat.update((p) => !p);
    try {
      localStorage.setItem(PRIVAT_KEY, this.privat() ? '1' : '0');
    } catch {
      // ohne Speicher gilt es bis zum Schließen
    }
  }
  private readonly flaeche = viewChild.required<ElementRef<HTMLCanvasElement>>('flaeche');
  private aktuell: Strich | null = null;

  constructor() {
    // Seite gewechselt → Markierungen laden
    effect(() => {
      const d = this.datei();
      const s = this.seite();
      untracked(() => {
        this.striche.set([]);
        markierungen(d, s)
          .then((m) => {
            if (this.datei() === d && this.seite() === s) this.striche.set(m);
          })
          .catch(() => undefined);
      });
    });
    effect(() => {
      this.striche();
      this.zeichnen();
    });
    // Eingabefeld geöffnet → gleich hineinschreiben
    afterRenderEffect(() => {
      if (this.eingabe()) this.feld()?.nativeElement.focus();
    });
    // Seite gewechselt → offenes Eingabefeld schließen
    effect(() => {
      this.datei();
      this.seite();
      untracked(() => this.eingabe.set(null));
    });
    // Größe der Seite ändert sich (Drehen, volle Breite) → neu zeichnen
    const beobachter = new ResizeObserver(() => this.zeichnen());
    effect(() => beobachter.observe(this.flaeche().nativeElement));
    inject(DestroyRef).onDestroy(() => beobachter.disconnect());
  }

  private zeichnen(): void {
    const c = this.flaeche()?.nativeElement;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const b = c.clientWidth;
    const h = c.clientHeight;
    if (c.width !== Math.round(b * dpr)) c.width = Math.round(b * dpr);
    if (c.height !== Math.round(h * dpr)) c.height = Math.round(h * dpr);
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, b, h);
    for (const s of [...this.striche(), ...(this.aktuell ? [this.aktuell] : [])]) {
      if (s.text) {
        this.schreiben(ctx, s, b, h);
        continue;
      }
      ctx.strokeStyle = s.farbe;
      ctx.lineWidth = s.breite * b;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < s.punkte.length; i += 2) {
        const x = s.punkte[i] * b;
        const y = s.punkte[i + 1] * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      if (s.punkte.length === 2) ctx.lineTo(s.punkte[0] * b + 0.1, s.punkte[1] * h);
      ctx.stroke();
    }
  }

  /** Text mit weißem Rand, damit er auf Noten lesbar bleibt (Textmarker-Farbe wird zu Schwarz) */
  private schreiben(ctx: CanvasRenderingContext2D, s: Strich, b: number, h: number): void {
    const px = Math.max(8, s.breite * b);
    ctx.font = `600 ${px}px system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, px / 5);
    ctx.strokeStyle = 'rgba(255, 255, 255, .9)';
    const x = s.punkte[0] * b;
    const y = s.punkte[1] * h;
    ctx.fillStyle = s.farbe.startsWith('rgba') ? '#111' : s.farbe;
    s.text!.split('\n').forEach((zeile, k) => {
      ctx.strokeText(zeile, x, y + k * px * ZEILE);
      ctx.fillText(zeile, x, y + k * px * ZEILE);
    });
  }

  /** Text unter dem Finger (für Ändern/Löschen) – Index in striche() oder -1 */
  private textAn(x: number, y: number): number {
    const c = this.flaeche().nativeElement;
    const ctx = c.getContext('2d')!;
    const b = c.clientWidth;
    const h = c.clientHeight;
    const liste = this.striche();
    for (let i = liste.length - 1; i >= 0; i--) {
      const s = liste[i];
      if (!s.text) continue;
      const px = Math.max(8, s.breite * b);
      ctx.font = `600 ${px}px system-ui, sans-serif`;
      const zeilen = s.text.split('\n');
      const w = Math.max(...zeilen.map((z) => ctx.measureText(z).width));
      const sx = s.punkte[0] * b;
      const sy = s.punkte[1] * h;
      if (x * b >= sx - 4 && x * b <= sx + w + 4 && y * h >= sy - px * 0.7 && y * h <= sy + (zeilen.length - 1) * px * ZEILE + px * 0.7) return i;
    }
    return -1;
  }

  /** offenes Eingabefeld: Stelle, Index des geänderten Texts (-1 = neu) und bisheriger Text */
  protected readonly eingabe = signal<{ x: number; y: number; index: number; text: string } | null>(null);
  private readonly feld = viewChild<ElementRef<HTMLTextAreaElement>>('feld');

  private textEingeben(x: number, y: number): void {
    const i = this.textAn(x, y);
    this.eingabe.set({ x, y, index: i, text: i >= 0 ? (this.striche()[i].text ?? '') : '' });
  }

  /** Enter = neue Zeile, Strg/Cmd+Enter = übernehmen, Esc = abbrechen; nichts davon blättert */
  protected schriftTaste(e: KeyboardEvent): void {
    e.stopPropagation();
    if (e.key === 'Escape') this.eingabe.set(null);
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.schriftFertig(this.feld()?.nativeElement.value ?? '');
    }
  }

  protected schriftFertig(eingabe: string): void {
    const e = this.eingabe();
    this.eingabe.set(null);
    if (!e) return;
    const text = eingabe.replace(/\r/g, '').split('\n').map((z) => z.trimEnd()).join('\n').replace(/^\n+|\n+$/g, '').slice(0, 200);
    const liste = [...this.striche()];
    const alt = e.index >= 0 ? liste[e.index] : null;
    if (alt) {
      if (text) liste[e.index] = { ...alt, text };
      else liste.splice(e.index, 1);
    } else if (text) {
      liste.push({ farbe: this.farbe(), breite: GROESSEN[this.groesse()].wert, punkte: [e.x, e.y], text, ...(this.privat() ? { privat: true } : {}) });
    } else return;
    this.speichern(liste);
  }

  private punkt(e: PointerEvent): [number, number] {
    const r = this.flaeche().nativeElement.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * 1e4) / 1e4, Math.round(((e.clientY - r.top) / r.height) * 1e4) / 1e4];
  }

  protected runter(e: PointerEvent): void {
    if (!this.aktiv()) return;
    e.stopPropagation();
    e.preventDefault();
    if (this.modus() === 'text') {
      const [x, y] = this.punkt(e);
      // nach dem Loslassen öffnen – sonst landet der Fokus nicht im Feld
      setTimeout(() => this.textEingeben(x, y));
      return;
    }
    this.flaeche().nativeElement.setPointerCapture(e.pointerId);
    const textmarker = this.farbe().startsWith('rgba');
    this.aktuell = { farbe: this.farbe(), breite: textmarker ? 0.025 : 0.004, punkte: this.punkt(e), ...(this.privat() ? { privat: true } : {}) };
    this.zeichnen();
  }

  protected ziehen(e: PointerEvent): void {
    if (!this.aktuell) return;
    e.stopPropagation();
    this.aktuell.punkte.push(...this.punkt(e));
    this.zeichnen();
  }

  protected hoch(e: PointerEvent): void {
    // Schrift: Tippen setzt Text, blättert aber nicht
    if (this.aktiv() && this.modus() === 'text') e.stopPropagation();
    if (!this.aktuell) return;
    e.stopPropagation();
    const fertig = this.aktuell;
    this.aktuell = null;
    this.speichern([...this.striche(), fertig]);
  }

  protected rueckgaengig(): void {
    this.speichern(this.striche().slice(0, -1));
  }

  protected leeren(): void {
    if (confirm('Alle Markierungen dieser Seite löschen?')) this.speichern([]);
  }

  private speichern(striche: Strich[]): void {
    this.striche.set(striche);
    markierungenSetzen(this.datei(), this.seite(), striche).catch(() => undefined);
  }
}
