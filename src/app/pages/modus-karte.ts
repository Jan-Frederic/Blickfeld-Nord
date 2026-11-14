import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';

// Karte der Backstage-Übersicht: kurz antippen startet den Modus (Link `modus`), gedrückt halten (0,55 s) öffnet die
// Seite zum Bearbeiten (`bearbeiten`). Mit der Tastatur: Enter = Modus, Umschalt+Enter = Bearbeiten. Während des
// Haltens füllt sich unten ein Balken; Scrollen bricht ab. Vorgelesen wird der sichtbare Inhalt der Karte (kein
// eigenes aria-label – das müsste den sichtbaren Text enthalten). Styles global (styles.scss, app-modus-karte).
export const HALTE_MS = 550;

@Component({
  selector: 'app-modus-karte',
  template: `
    <a
      class="modus-karte"
      [class.haelt]="haelt()"
      [attr.href]="href()"
      aria-keyshortcuts="Shift+Enter"
      [attr.aria-description]="'Kurz antippen: ' + modusText() + ' · gedrückt halten oder Umschalt+Enter: ' + bearbeitenText()"
      draggable="false"
      (pointerdown)="druck($event)"
      (pointermove)="bewegt($event)"
      (pointerup)="los()"
      (pointerleave)="abbrechen()"
      (pointercancel)="abbrechen()"
      (click)="klick($event)"
      (contextmenu)="$event.preventDefault()"
      (keydown.shift.enter)="$event.preventDefault(); bearbeitenOeffnen()"
    >
      <ng-content />
      <span class="halte-balken" aria-hidden="true"></span>
    </a>
  `,
})
export class ModusKarte {
  private readonly router = inject(Router);
  /** kurzer Tipp: Modus starten */
  readonly modus = input.required<(string | number)[]>();
  readonly query = input<Record<string, string | number> | undefined>(undefined);
  /** gedrückt halten: Seite zum Bearbeiten */
  readonly bearbeiten = input.required<(string | number)[]>();
  readonly modusText = input('Modus starten');
  readonly bearbeitenText = input('bearbeiten');

  /** echte Adresse des Modus (Mittelklick, neuer Tab) – angetippt navigiert der Router */
  protected readonly href = computed(() => this.router.serializeUrl(this.router.createUrlTree(this.modus(), { queryParams: this.query() })));
  protected readonly haelt = signal(false);
  private zeit = 0;
  private lang = false;
  private start = { x: 0, y: 0 };

  protected druck(e: PointerEvent): void {
    if (e.button !== 0) return;
    this.lang = false;
    this.start = { x: e.clientX, y: e.clientY };
    this.haelt.set(true);
    clearTimeout(this.zeit);
    this.zeit = window.setTimeout(() => {
      this.lang = true;
      this.haelt.set(false);
      navigator.vibrate?.(15);
      this.bearbeitenOeffnen();
    }, HALTE_MS);
  }

  /** wer wischt (scrollt), will nicht bearbeiten */
  protected bewegt(e: PointerEvent): void {
    if (this.haelt() && Math.hypot(e.clientX - this.start.x, e.clientY - this.start.y) > 10) this.abbrechen();
  }

  protected los(): void {
    clearTimeout(this.zeit);
    this.haelt.set(false);
  }

  protected abbrechen(): void {
    clearTimeout(this.zeit);
    this.haelt.set(false);
  }

  /** kurzer Tipp: Modus im Router öffnen; nach dem langen Drücken nichts mehr */
  protected klick(e: MouseEvent): void {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (this.lang) {
      this.lang = false;
      return;
    }
    void this.router.navigate(this.modus(), { queryParams: this.query() });
  }

  protected bearbeitenOeffnen(): void {
    void this.router.navigate(this.bearbeiten());
  }
}
