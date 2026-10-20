import { Component, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { I18n, LocPipe, tr } from '../i18n';

const TEXT = tr(
  {
    frameTitle: 'Instagram-Reel von Blickfeld Nord',
    title: 'Reel von Instagram',
    note: 'Mit Klick auf „Reel laden“ wird das Video von Instagram (Meta Platforms Ireland Ltd.) geladen. Dabei werden Daten wie Ihre IP-Adresse an Meta übertragen und ggf. Cookies gesetzt. Mehr dazu in der',
    privacy: 'Datenschutzerklärung',
    load: 'Reel laden',
    direct: 'oder direkt auf Instagram ansehen',
  },
  {
    frameTitle: 'Instagram reel by Blickfeld Nord',
    title: 'Reel from Instagram',
    note: 'Clicking “Load reel” loads the video from Instagram (Meta Platforms Ireland Ltd.). Data such as your IP address is transferred to Meta and cookies may be set. More in our',
    privacy: 'privacy policy',
    load: 'Load reel',
    direct: 'or watch it directly on Instagram',
  },
  {
    frameTitle: 'Instagram-reel van Blickfeld Nord',
    title: 'Reel van Instagram',
    note: 'Met een klik op „Reel laden” wordt de video van Instagram (Meta Platforms Ireland Ltd.) geladen. Daarbij worden gegevens zoals je IP-adres naar Meta verstuurd en worden mogelijk cookies geplaatst. Meer hierover in de',
    privacy: 'privacyverklaring',
    load: 'Reel laden',
    direct: 'of bekijk hem direct op Instagram',
  },
);

// Zwei-Klick-Lösung: Das Instagram-Embed wird erst nach aktiver Zustimmung geladen,
// vorher findet keine Verbindung zu Meta statt.
@Component({
  selector: 'app-instagram-reel',
  imports: [RouterLink, LocPipe],
  template: `
    @if (loaded()) {
      <iframe
        class="frame"
        [src]="embedUrl()"
        [title]="t().frameTitle"
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
        <p class="title">{{ t().title }}</p>
        <p class="note">
          {{ t().note }} <a [routerLink]="'/datenschutz' | loc">{{ t().privacy }}</a>.
        </p>
        <button type="button" class="load" (click)="loaded.set(true)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
          {{ t().load }}
        </button>
        <a class="direct" [href]="url()" target="_blank" rel="noopener">{{ t().direct }}</a>
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
  protected readonly t = inject(I18n).t(TEXT);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly url = computed(() => `https://www.instagram.com/reel/${encodeURIComponent(this.id())}/`);
  protected readonly embedUrl = computed(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(`${this.url()}embed/`),
  );
}
