import { Component, DOCUMENT, Injectable, computed, inject, input, signal } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

// Zurück dorthin, woher man kam: Der Verlauf merkt sich je Navigation die vorige Seite (Adresse und Titel). Pfeile
// „zurück“ (<app-zurueck>) und das Schließen von Modi, die über einen Link geöffnet wurden (Bühnen-/Probe-Modus aus
// der Übersicht), gehen damit einen Schritt zurück im Browser-Verlauf – wie der Zurück-Knopf des Browsers. Ohne
// Vorgänger in der App (Seite direkt geöffnet) führt der Pfeil zum festen Ziel der Seite.
@Injectable({ providedIn: 'root' })
export class Verlauf {
  private readonly router = inject(Router);
  private readonly doc = inject(DOCUMENT);
  private readonly location = inject(Location);
  private readonly stapel = signal<{ url: string; titel: string }[]>([]);
  /** vorige Seite in der App (oder null) */
  readonly vorher = computed(() => this.stapel().at(-1) ?? null);

  constructor() {
    let kandidat: { url: string; titel: string } | null = null;
    let popstate = false;
    let ersetzen = false;
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationStart) {
        kandidat = this.router.navigated ? { url: this.router.url, titel: this.doc.title } : null;
        popstate = e.navigationTrigger === 'popstate';
        ersetzen = !!this.router.getCurrentNavigation()?.extras.replaceUrl;
      } else if (e instanceof NavigationEnd) {
        if (popstate) this.stapel.update((s) => s.slice(0, -1));
        else if (!ersetzen && kandidat && kandidat.url !== e.urlAfterRedirects) this.stapel.update((s) => [...s.slice(-49), kandidat!]);
      }
    });
  }

  /** einen Schritt zurück – true, wenn es in der App einen Vorgänger gab */
  zurueck(): boolean {
    if (!this.vorher()) return false;
    this.location.back();
    return true;
  }
}

/** Seitentitel kurz: „Termine – Backstage – Blickfeld Nord“ → „Termine“ */
export const kurzTitel = (t: string) => t.split(' – ')[0].trim() || 'Zurück';

// Pfeil „zurück“ oben auf Unterseiten: zeigt den Titel der vorigen Seite und geht dorthin zurück; ohne Vorgänger
// (direkt geöffnet) führt er zum festen Ziel mit dem festen Text.
@Component({
  selector: 'app-zurueck',
  imports: [MatIconModule],
  template: `
    <a class="back" [href]="href()" (click)="klick($event)">
      <mat-icon>arrow_back</mat-icon> {{ beschriftung() }}
    </a>
  `,
})
export class Zurueck {
  /** festes Ziel, wenn es keinen Vorgänger gibt */
  readonly ziel = input.required<string | unknown[]>();
  readonly fragment = input<string>();
  /** Text für das feste Ziel */
  readonly text = input.required<string>();
  /** Titel der vorigen Seite zeigen (Backstage); öffentliche Seiten behalten ihren übersetzten Text */
  readonly titel = input(true);
  private readonly verlauf = inject(Verlauf);
  private readonly router = inject(Router);
  private readonly baum = computed(() => {
    const z = this.ziel();
    return this.router.createUrlTree(Array.isArray(z) ? z : [z], { fragment: this.fragment() });
  });
  protected readonly href = computed(() => this.router.serializeUrl(this.baum()));
  protected readonly beschriftung = computed(() => {
    const v = this.verlauf.vorher();
    return v && this.titel() ? kurzTitel(v.titel) : this.text();
  });
  protected klick(e: MouseEvent): void {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (!this.verlauf.zurueck()) void this.router.navigateByUrl(this.baum());
  }
}
