import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';

@Component({
  selector: 'app-gallery',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <section id="galerie" class="section">
      <p class="kicker">Momente</p>
      <h2>Galerie</h2>
      <div class="grid">
        @for (p of band.photos; track p.src; let i = $index) {
          <button class="tile" [class.wide]="i % 5 === 0" (click)="open(i)" [attr.aria-label]="'Bild vergrößern: ' + p.alt">
            <img [src]="p.thumb" [alt]="p.alt" loading="lazy" />
          </button>
        }
      </div>
    </section>

    @if (current(); as p) {
      <div class="lightbox" role="dialog" aria-modal="true" [attr.aria-label]="p.alt" (click)="close()">
        <figure (click)="$event.stopPropagation()">
          <img [src]="p.src" [alt]="p.alt" />
          <figcaption>
            <span>{{ p.caption ?? '' }}@if (p.credit) {<span class="credit"> · Foto: {{ p.credit }}</span>}</span>
            <span class="count">{{ index()! + 1 }} / {{ band.photos.length }}</span>
          </figcaption>
        </figure>
        <button mat-icon-button class="nav prev" (click)="step(-1, $event)" aria-label="Vorheriges Bild"><mat-icon>chevron_left</mat-icon></button>
        <button mat-icon-button class="nav next" (click)="step(1, $event)" aria-label="Nächstes Bild"><mat-icon>chevron_right</mat-icon></button>
        <button mat-icon-button class="close" (click)="close()" aria-label="Schließen"><mat-icon>close</mat-icon></button>
      </div>
    }
  `,
  styles: `
    .grid {
      display: grid; gap: 12px;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      grid-auto-rows: 220px; grid-auto-flow: dense;
    }
    .tile {
      all: unset; cursor: zoom-in; position: relative; overflow: hidden; border-radius: 10px;
      border: 1px solid var(--bn-line); background: var(--bn-night-2);
    }
    .tile.wide { grid-column: span 2; }
    @media (max-width: 520px) { .tile.wide { grid-column: span 1; } }
    .tile img {
      width: 100%; height: 100%; object-fit: cover; display: block;
      filter: saturate(.85); transition: transform .5s ease, filter .5s ease;
    }
    .tile:hover img, .tile:focus-visible img { transform: scale(1.04); filter: saturate(1); }
    .tile:focus-visible { outline: 2px solid var(--bn-sunset); outline-offset: 2px; }

    .lightbox {
      position: fixed; inset: 0; z-index: 50; display: grid; place-items: center;
      background: rgba(10, 11, 13, .94); backdrop-filter: blur(6px); padding: 56px 16px;
    }
    figure { margin: 0; max-width: min(1400px, 100%); }
    figure img { display: block; max-width: 100%; max-height: calc(100svh - 160px); margin: 0 auto; border-radius: 6px; }
    .credit { opacity: .7; }
    figcaption {
      display: flex; justify-content: space-between; gap: 16px; margin-top: 12px;
      font-family: var(--bn-wide); font-weight: 300; text-transform: uppercase; letter-spacing: .2em; font-size: .75rem;
      color: var(--bn-fog);
    }
    .nav, .close { position: absolute; color: var(--bn-ink); }
    .nav { top: 50%; transform: translateY(-50%); }
    .prev { left: 8px; }
    .next { right: 8px; }
    .close { top: 12px; right: 12px; }
  `,
})
export class Gallery {
  protected readonly band = inject(BandService);
  protected readonly index = signal<number | null>(null);
  protected readonly current = computed(() => {
    const i = this.index();
    return i === null ? null : this.band.photos[i];
  });

  protected open(i: number): void {
    this.index.set(i);
  }

  protected close(): void {
    this.index.set(null);
  }

  protected step(dir: number, event?: Event): void {
    event?.stopPropagation();
    const n = this.band.photos.length;
    this.index.update((i) => (i === null ? null : (i + dir + n) % n));
  }

  @HostListener('document:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    if (this.index() === null) return;
    if (e.key === 'Escape') this.close();
    else if (e.key === 'ArrowRight') this.step(1);
    else if (e.key === 'ArrowLeft') this.step(-1);
  }
}
