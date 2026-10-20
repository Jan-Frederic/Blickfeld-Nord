import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { I18n, LDatePipe, LocPipe, tr } from '../i18n';
import { Content } from '../content';
import { UebersetzungHinweis } from './uebersetzung-hinweis';

const TEXT = tr(
  { kicker: 'Zuletzt live', more: 'Ganzen Rückblick lesen' },
  { kicker: 'Last seen live', more: 'Read the full story' },
  { kicker: 'Laatst live', more: 'Lees de hele terugblik' },
);

// „Zuletzt live“: der neueste Historie-Eintrag als Vorschau auf der Startseite
@Component({
  selector: 'app-last-live',
  imports: [LDatePipe, LocPipe, RouterLink, MatIconModule, UebersetzungHinweis],
  template: `
    @if (entry; as e) {
      <section id="zuletzt-live" class="section">
        <p class="kicker">{{ t().kicker }}</p>
        <a class="card" [routerLink]="'/historie' | loc" [fragment]="'e-' + e.date">
          <span class="media">
            <img [src]="e.images?.[0]?.src ?? 'kompass-440.webp'" [alt]="content.t(e.images?.[0]?.alt) ?? ''" loading="lazy" />
          </span>
          <span class="body" [attr.lang]="content.langOf(e.text[0])">
            <time [attr.datetime]="e.date">{{ e.date | ldate: 'long' }}</time>
            <span class="title">{{ content.t(e.title) }}</span>
            <span class="excerpt">{{ excerpt() }}</span>
            <span class="more">{{ t().more }} <mat-icon>arrow_forward</mat-icon></span>
          </span>
        </a>
        <app-uebersetzung-hinweis [status]="content.status(e.title, e.text[0])" />
      </section>
    }
  `,
  styles: `
    .card {
      display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); overflow: hidden;
      border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72);
      color: var(--bn-ink); text-decoration: none; transition: border-color .2s;
    }
    .card:hover, .card:focus-visible { border-color: var(--bn-sunset); }
    .media { display: block; min-height: 260px; overflow: hidden; }
    .media img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .5s; }
    .card:hover .media img { transform: scale(1.03); }
    .body { display: flex; flex-direction: column; gap: 10px; padding: 28px; }
    time { font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .2em; font-size: .75rem; color: var(--bn-sunset); }
    .title { font-family: var(--bn-display); font-size: 1.25rem; line-height: 1.35; }
    .excerpt { line-height: 1.7; color: rgba(236, 233, 228, .82); }
    .more {
      display: inline-flex; align-items: center; gap: 6px; margin-top: auto; padding-top: 6px;
      font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .16em; font-size: .72rem; color: var(--bn-sunset);
    }
    .more mat-icon { font-size: 16px; width: 16px; height: 16px; }
    @media (max-width: 720px) {
      .card { grid-template-columns: 1fr; }
      .media { min-height: 0; aspect-ratio: 16 / 10; }
      .body { padding: 20px; }
    }
  `,
})
export class LastLive {
  protected readonly entry = [...inject(BandService).history].sort((a, b) => b.date.localeCompare(a.date))[0];
  protected readonly content = inject(Content);
  protected readonly t = inject(I18n).t(TEXT);

  // erster Absatz (in der aktuellen Sprache), auf ganze Wörter gekürzt
  protected readonly excerpt = computed(() => {
    const text = this.content.t(this.entry?.text[0] ?? '');
    if (text.length <= 220) return text;
    return text.slice(0, 220).replace(/\s+\S*$/, '') + ' …';
  });
}
