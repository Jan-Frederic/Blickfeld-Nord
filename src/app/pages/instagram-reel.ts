import { Component, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

// Zwei-Klick-Lösung: Das Instagram-Embed wird erst nach aktiver Zustimmung geladen,
// vorher findet keine Verbindung zu Meta statt.
@Component({
  selector: 'app-instagram-reel',
  imports: [RouterLink],
  template: `
    @if (loaded()) {
      <iframe
        class="frame"
        [src]="embedUrl()"
        title="Instagram-Reel von Blickfeld Nord"
        allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
        allowfullscreen
        loading="lazy"
      ></iframe>
    } @else {
      <div class="consent">
        <svg class="ig" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6">
          <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
          <circle cx="12" cy="12" r="4.3" />
          <circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" stroke="none" />
        </svg>
        <p class="title">Reel von Instagram</p>
        <p class="note">
          Mit Klick auf „Reel laden“ wird das Video von Instagram (Meta Platforms Ireland Ltd.) geladen.
          Dabei werden Daten wie Ihre IP-Adresse an Meta übertragen und ggf. Cookies gesetzt.
          Mehr dazu in der <a routerLink="/datenschutz">Datenschutzerklärung</a>.
        </p>
        <button type="button" class="load" (click)="loaded.set(true)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
          Reel laden
        </button>
        <a class="direct" [href]="url()" target="_blank" rel="noopener">oder direkt auf Instagram ansehen</a>
      </div>
    }
  `,
  styles: `
    :host { display: block; max-width: 400px; margin: 16px 0; }
    .frame { display: block; width: 100%; height: 720px; border: 0; border-radius: 8px; background: #fff; }
    .consent {
      display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px;
      min-height: 420px; justify-content: center; padding: 28px 22px; border-radius: 8px;
      border: 1px solid var(--bn-line);
      background:
        radial-gradient(120% 80% at 50% 0%, rgba(232, 164, 106, .22), transparent 60%),
        linear-gradient(180deg, rgba(27, 30, 34, .9), rgba(14, 16, 19, .95));
    }
    .ig { width: 44px; height: 44px; color: var(--bn-sunset); }
    .title { font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .18em; font-size: .78rem; margin: 0; color: var(--bn-ink); }
    .note { font-size: .82rem; line-height: 1.6; color: var(--bn-fog); margin: 0; }
    .note a { color: var(--bn-sunset); }
    .load {
      display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
      padding: 10px 22px; border-radius: 999px; border: 0; font: inherit; font-weight: 600;
      background: var(--bn-sunset); color: #1b1e22; transition: filter .2s;
    }
    .load:hover { filter: brightness(1.1); }
    .load svg { width: 20px; height: 20px; }
    .direct { font-size: .82rem; color: var(--bn-fog); }
    .direct:hover { color: var(--bn-sunset); }
  `,
})
export class InstagramReel {
  /** Reel-Kennung aus der URL, z. B. „DcWl7qDO7gp“ */
  readonly id = input.required<string>();
  protected readonly loaded = signal(false);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly url = computed(() => `https://www.instagram.com/reel/${encodeURIComponent(this.id())}/`);
  protected readonly embedUrl = computed(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(`${this.url()}embed/`),
  );
}
