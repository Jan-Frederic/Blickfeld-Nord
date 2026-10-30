import { Component, DestroyRef, ElementRef, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Strich, markierungen, markierungenSetzen } from '../data/noten';

// Markierungen im Notenblatt (Bühnen-Modus → Noten → Stift): eine durchsichtige Leinwand genau über der PDF-Seite.
// Gezeichnet wird mit Finger, Stift oder Maus; die Striche werden in Seitenanteilen (0–1) gespeichert und passen so
// bei jeder Größe. Gespeichert je PDF-Datei und Seite auf diesem Gerät (data/noten.ts), im Notenpaket enthalten.
// Markierungen gelten für alle in der Band (Synchronisation); mit dem Personen-Knopf nur für mich.
const FARBEN = [
  { farbe: '#d93025', name: 'Rot' },
  { farbe: '#1a73e8', name: 'Blau' },
  { farbe: '#188038', name: 'Grün' },
  { farbe: 'rgba(255, 213, 0, .45)', name: 'Textmarker' },
];

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
  host: { '[class.aktiv]': 'aktiv()' },
  template: `
    <canvas #flaeche (pointerdown)="runter($event)" (pointermove)="ziehen($event)" (pointerup)="hoch($event)" (pointercancel)="hoch($event)"
      (click)="$event.stopPropagation()"></canvas>
    @if (aktiv()) {
      <div class="werkzeuge" (pointerdown)="$event.stopPropagation()" (pointerup)="$event.stopPropagation()" (click)="$event.stopPropagation()">
        @for (f of farben; track f.farbe) {
          <button type="button" class="farbe" [class.an]="farbe() === f.farbe" [style.background]="f.farbe" (click)="farbe.set(f.farbe)" [attr.aria-label]="f.name" [attr.aria-pressed]="farbe() === f.farbe"></button>
        }
        <button type="button" class="wer" [class.an]="privat()" (click)="privatUmschalten()" [attr.aria-pressed]="privat()"
          [attr.aria-label]="privat() ? 'Neue Markierungen nur für mich' : 'Neue Markierungen für alle'" [title]="privat() ? 'Nur für mich' : 'Für alle in der Band'">
          <mat-icon>{{ privat() ? 'person' : 'groups' }}</mat-icon></button>
        <button type="button" (click)="rueckgaengig()" [disabled]="!striche().length" aria-label="Letzten Strich entfernen"><mat-icon>undo</mat-icon></button>
        <button type="button" (click)="leeren()" [disabled]="!striche().length" aria-label="Alle Markierungen dieser Seite löschen"><mat-icon>delete</mat-icon></button>
      </div>
    }
  `,
  styles: `
    :host { position: absolute; inset: 0; pointer-events: none; }
    canvas { position: absolute; inset: 0; width: 100%; height: 100%; background: none !important; }
    :host(.aktiv) canvas { pointer-events: auto; touch-action: none; cursor: crosshair; outline: 2px dashed #e8a46a; outline-offset: -2px; }
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

  private punkt(e: PointerEvent): [number, number] {
    const r = this.flaeche().nativeElement.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * 1e4) / 1e4, Math.round(((e.clientY - r.top) / r.height) * 1e4) / 1e4];
  }

  protected runter(e: PointerEvent): void {
    if (!this.aktiv()) return;
    e.stopPropagation();
    e.preventDefault();
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
