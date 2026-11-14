import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { BackstageSuche } from './backstage-suche';

// Lupe oben in der Backstage-Leiste: öffnet die Suche über alles (pages/backstage-suche.ts) auf jeder Unterseite.
// Schließt sich mit einem Treffer, Escape oder einem Tipp daneben; „/“ öffnet sie mit der Tastatur.
// Styles global (styles.scss, .kopf-knopf, .kopf-suche).
@Component({
  selector: 'app-kopf-suche',
  imports: [BackstageSuche],
  template: `
    <button type="button" class="bn-icon-btn kopf-knopf" [class.on]="offen()" (click)="umschalten()" [attr.aria-expanded]="offen()" aria-controls="kopf-suche" aria-label="Suchen" title="Suchen (/)">
      <span class="material-icons" aria-hidden="true">{{ offen() ? 'close' : 'search' }}</span>
    </button>
    @if (offen()) {
      <div class="kopf-suche-hintergrund" (click)="offen.set(false)" aria-hidden="true"></div>
      <div class="kopf-suche" id="kopf-suche" #feld>
        <app-backstage-suche />
      </div>
    }
  `,
})
export class KopfSuche {
  protected readonly offen = signal(false);
  private readonly feld = viewChild<ElementRef<HTMLElement>>('feld');

  constructor() {
    const sub = inject(Router).events.subscribe((e) => e instanceof NavigationEnd && this.offen.set(false));
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.offen()) return this.offen.set(false);
      const ziel = e.target as HTMLElement | null;
      const tippt = !!ziel && (/^(INPUT|TEXTAREA|SELECT)$/.test(ziel.tagName) || ziel.isContentEditable);
      if (e.key === '/' && !tippt && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        this.oeffnen();
      }
    };
    document.addEventListener('keydown', taste);
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      document.removeEventListener('keydown', taste);
    });
  }

  protected umschalten(): void {
    if (this.offen()) this.offen.set(false);
    else this.oeffnen();
  }

  private oeffnen(): void {
    this.offen.set(true);
    setTimeout(() => this.feld()?.nativeElement.querySelector('input')?.focus());
  }
}
