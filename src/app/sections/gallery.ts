import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { I18n, LocPipe, tr } from '../i18n';
import { Content } from '../content';

const TEXT = tr(
  {
    kicker: 'Momente',
    title: 'Galerie',
    lead: 'Eindrücke von unseren Auftritten und von uns als Band – zum Vergrößern einfach antippen.',
    enlarge: 'Bild vergrößern: ',
    photo: 'Foto',
    toShow: 'Zum Auftritt',
    prev: 'Vorheriges Bild',
    next: 'Nächstes Bild',
    close: 'Schließen',
  },
  {
    kicker: 'Moments',
    title: 'Gallery',
    lead: 'Impressions from our shows and of us as a band – just tap to enlarge.',
    enlarge: 'Enlarge photo: ',
    photo: 'Photo',
    toShow: 'To the show',
    prev: 'Previous photo',
    next: 'Next photo',
    close: 'Close',
  },
  {
    kicker: 'Momenten',
    title: 'Galerij',
    lead: 'Indrukken van onze optredens en van ons als band – tik om te vergroten.',
    enlarge: 'Foto vergroten: ',
    photo: 'Foto',
    toShow: 'Naar het optreden',
    prev: 'Vorige foto',
    next: 'Volgende foto',
    close: 'Sluiten',
  },
);

@Component({
  selector: 'app-gallery',
  imports: [RouterLink, LocPipe, MatButtonModule, MatIconModule],
  template: `
    <section id="galerie" class="section">
      <p class="kicker">{{ t().kicker }}</p>
      <h2>{{ t().title }}</h2>
      <p class="lead">{{ t().lead }}</p>
      <div class="grid">
        @for (p of band.photos; track p.src; let i = $index) {
          <button class="tile" [class.wide]="i % 5 === 0 && !p.tall" (click)="open(i)" [attr.aria-label]="t().enlarge + content.t(p.alt)">
            <!-- Vorschau in drei Größen (480/720/900 px) – jedes Gerät lädt nur, was es für ein scharfes Bild braucht -->
            <img [src]="p.thumb" [attr.srcset]="srcset(p.thumb)" [attr.sizes]="i % 5 === 0 && !p.tall ? wideSizes : sizes" [alt]="content.t(p.alt)" loading="lazy" decoding="async" />
            @if (entries.has(p.src)) { <span class="badge" aria-hidden="true"><mat-icon>history_edu</mat-icon></span> }
          </button>
        }
      </div>
    </section>

    @if (current(); as p) {
      <div class="lightbox" role="dialog" aria-modal="true" [attr.aria-label]="content.t(p.alt)" (click)="close()">
        <figure (click)="$event.stopPropagation()">
          <img [src]="p.src" [alt]="content.t(p.alt)" />
          <figcaption>
            <span>{{ content.t(p.caption) ?? '' }}@if (p.credit) {<span class="credit"> · {{ t().photo }}: {{ p.credit }}</span>}</span>
            <span class="right">
              @if (entries.get(p.src); as date) {
                <a class="entry" [routerLink]="'/historie' | loc" [fragment]="'e-' + date" (click)="close()">{{ t().toShow }} <mat-icon>arrow_forward</mat-icon></a>
              }
              <span class="count">{{ index()! + 1 }} / {{ band.photos.length }}</span>
            </span>
          </figcaption>
        </figure>
        <button mat-icon-button class="nav prev" (click)="step(-1, $event)" [attr.aria-label]="t().prev"><mat-icon>chevron_left</mat-icon></button>
        <button mat-icon-button class="nav next" (click)="step(1, $event)" [attr.aria-label]="t().next"><mat-icon>chevron_right</mat-icon></button>
        <button mat-icon-button class="close" (click)="close()" [attr.aria-label]="t().close"><mat-icon>close</mat-icon></button>
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
    .badge {
      position: absolute; right: 8px; bottom: 8px; display: grid; place-items: center; width: 30px; height: 30px;
      border-radius: 50%; background: rgba(20, 22, 25, .75); color: var(--bn-sunset);
    }
    .badge mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .right { display: inline-flex; align-items: center; gap: 18px; flex: none; }
    .entry { display: inline-flex; align-items: center; gap: 4px; color: var(--bn-sunset); text-decoration: none; }
    .entry:hover { color: var(--bn-ink); }
    .entry mat-icon { font-size: 16px; width: 16px; height: 16px; }
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
  // Kachelbreite: Handy eine Spalte, Tablet zwei, sonst ca. 280 px (breite Kacheln doppelt).
  // Auf dem Handy bewusst etwas knapper angegeben, damit dort die 720-px-Fassung reicht – zum Vergrößern
  // wird ohnehin das Originalfoto geladen.
  protected readonly sizes = '(max-width: 520px) 62vw, (max-width: 780px) 50vw, 280px';
  protected readonly wideSizes = '(max-width: 520px) 62vw, 560px';
  protected srcset(thumb: string): string {
    return `${thumb.replace('-thumb.webp', '-thumb-480.webp')} 480w, ${thumb.replace('-thumb.webp', '-thumb-720.webp')} 720w, ${thumb} 900w`;
  }

  protected readonly band = inject(BandService);
  protected readonly content = inject(Content);
  protected readonly t = inject(I18n).t(TEXT);
  protected readonly index = signal<number | null>(null);
  // Fotos, die auch in einem Historie-Eintrag stecken (gleiche Bilddatei) → Datum des Auftritts
  protected readonly entries = new Map(
    this.band.history.flatMap((h) => (h.images ?? []).map((img) => [img.src, h.date] as const)),
  );
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
