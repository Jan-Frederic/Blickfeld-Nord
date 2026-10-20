import { Component, OnDestroy, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { Packliste } from './packliste';
import { Setlist } from './setlist';
import { VorOrt } from './vorort';
import { BackstageSync } from './backstage-sync';

// Backstage-Unterseiten je Auftritt: /backstage/<id>/vorort, /setlist und /packliste
export const TOOLS = [
  { path: 'vorort', label: 'Vor Ort', icon: 'place' },
  { path: 'setlist', label: 'Setlist', icon: 'queue_music' },
  { path: 'packliste', label: 'Packliste', icon: 'check_circle' },
] as const;

@Component({
  selector: 'app-backstage-tool',
  imports: [DatePipe, RouterLink, MatIconModule, Packliste, Setlist, VorOrt, BackstageSync],
  template: `
    <section class="section">
      @if (show(); as s) {
        <a class="back" [routerLink]="['/backstage', id()]">
          <mat-icon>arrow_back</mat-icon> {{ s.venue }} · {{ s.date | date: 'dd.MM.yyyy' : '' : 'de' }}
        </a>

        <nav class="tabs" aria-label="Bereiche dieses Auftritts">
          @for (t of tools; track t.path) {
            <a [routerLink]="['/backstage', id(), t.path]" [class.active]="t.path === teil()" [attr.aria-current]="t.path === teil() ? 'page' : null">
              <mat-icon>{{ t.icon }}</mat-icon> {{ t.label }}
            </a>
          }
        </nav>

        @switch (teil()) {
          @case ('vorort') { <app-vorort [show]="id()" /> }
          @case ('setlist') { <app-setlist [show]="id()" [title]="s.venue + ' · ' + (s.date | date: 'dd.MM.yyyy' : '' : 'de')" /> }
          @case ('packliste') { <app-packliste [show]="id()" /> }
          @default {
            <h2>Bereich nicht gefunden</h2>
            <p class="lead">Zurück zum <a [routerLink]="['/backstage', id()]">Auftritt</a>.</p>
          }
        }
        <div class="share"><app-backstage-sync [show]="id()" /></div>
      } @else {
        <h2>Auftritt nicht gefunden</h2>
        <p class="lead">Diesen Termin gibt es nicht (mehr). Zurück zur <a routerLink="/backstage">Übersicht</a>.</p>
      }
    </section>
  `,
  styles: `
    .back { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 20px; color: var(--bn-fog); text-decoration: none; font-size: .9rem; }
    .back:hover { color: var(--bn-sunset); }
    .back mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .tabs { display: flex; flex-wrap: wrap; gap: 8px; }
    .tabs a {
      display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 999px;
      border: 1px solid var(--bn-line); color: var(--bn-ink); text-decoration: none; font-size: .92rem;
    }
    .tabs a:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .tabs a.active { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    .share { margin-top: 20px; }
    .tabs mat-icon { font-size: 18px; width: 18px; height: 18px; }
    /* die Bereiche bringen ihren eigenen Abstand nach oben mit – hier etwas weniger */
    app-vorort, app-setlist, app-packliste { display: block; margin-top: -16px; }
  `,
})
export class BackstageTool implements OnDestroy {
  /** Auftritts-ID und Bereich aus der URL (/backstage/:id/:teil) */
  readonly id = input.required<string>();
  readonly teil = input.required<string>();

  private readonly band = inject(BandService);
  private readonly meta = inject(Meta);
  protected readonly tools = TOOLS;
  protected readonly show = computed(() => this.band.showById(this.id()));

  constructor() {
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  ngOnDestroy(): void {
    this.meta.removeTag("name='robots'");
  }
}
