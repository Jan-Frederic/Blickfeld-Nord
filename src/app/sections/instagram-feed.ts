import { Component, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { BandService } from '../data/band.service';
import { I18n, LocPipe, tr } from '../i18n';

const TEXT = tr(
  {
    title: 'Neu auf Instagram',
    follow: 'folgen',
    post: 'Instagram-Beitrag von Blickfeld Nord',
    one: 'Beitrag',
    many: 'Beiträge',
    fromIg: 'von Instagram',
    note1: 'Mit Klick auf „Posts laden“ werden Inhalte von Instagram (Meta Platforms Ireland Ltd.) geladen. Dabei werden Daten wie Ihre IP-Adresse an Meta übertragen und ggf. Cookies gesetzt. Mehr dazu in der',
    privacy: 'Datenschutzerklärung',
    load: 'Posts laden',
    direct: 'oder direkt auf Instagram ansehen',
    empty: 'Fotos, Videos und Neuigkeiten von unseren Auftritten gibt es auf Instagram –',
    visit: 'schaut vorbei',
  },
  {
    title: 'New on Instagram',
    follow: 'follow',
    post: 'Instagram post by Blickfeld Nord',
    one: 'post',
    many: 'posts',
    fromIg: 'from Instagram',
    note1: 'Clicking “Load posts” loads content from Instagram (Meta Platforms Ireland Ltd.). Data such as your IP address is sent to Meta and cookies may be set. More in our',
    privacy: 'privacy policy',
    load: 'Load posts',
    direct: 'or view them directly on Instagram',
    empty: 'Photos, videos and news from our shows are on Instagram –',
    visit: 'come and have a look',
  },
  {
    title: 'Nieuw op Instagram',
    follow: 'volgen',
    post: 'Instagram-bericht van Blickfeld Nord',
    one: 'bericht',
    many: 'berichten',
    fromIg: 'van Instagram',
    note1: 'Met een klik op „Berichten laden” wordt inhoud van Instagram (Meta Platforms Ireland Ltd.) geladen. Daarbij worden gegevens zoals je IP-adres naar Meta verstuurd en mogelijk cookies geplaatst. Meer hierover in de',
    privacy: 'privacyverklaring',
    load: 'Berichten laden',
    direct: 'of bekijk ze direct op Instagram',
    empty: "Foto's, video's en nieuws van onze optredens vind je op Instagram –",
    visit: 'kom eens kijken',
  },
);

// „Neu auf Instagram“ auf der Startseite. Ohne Instagram-API kann eine statische Seite die neuesten Posts nicht
// selbst abrufen – die gezeigten Posts stehen daher als Links in band.service.ts (instagramPosts).
// Zwei-Klick-Lösung: Erst nach „Posts laden“ wird eine Verbindung zu Instagram (Meta) aufgebaut.
const PROFILE = 'https://www.instagram.com/blickfeldnord/';

@Component({
  selector: 'app-instagram-feed',
  imports: [RouterLink, LocPipe],
  template: `
    <section id="instagram" class="section">
      <p class="kicker">Social</p>
      <div class="head">
        <h2>{{ t().title }}</h2>
        <a class="follow" [href]="profile" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" /><circle cx="12" cy="12" r="4.3" /><circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" stroke="none" />
          </svg>
          &#64;blickfeldnord {{ t().follow }}
        </a>
      </div>

      @if (posts.length) {
        @if (loaded()) {
          <div class="grid">
            @for (p of posts; track p.url) {
              <iframe [src]="p.embed" [title]="t().post + ' ' + ($index + 1)" loading="lazy" allowfullscreen></iframe>
            }
          </div>
        } @else {
          <div class="consent">
            <p class="title">{{ posts.length }} {{ posts.length === 1 ? t().one : t().many }} {{ t().fromIg }}</p>
            <p class="note">
              {{ t().note1 }}
              <a [routerLink]="'/datenschutz' | loc">{{ t().privacy }}</a>.
            </p>
            <button type="button" class="load" (click)="loaded.set(true)">{{ t().load }}</button>
            <a class="direct" [href]="profile" target="_blank" rel="noopener">{{ t().direct }}</a>
          </div>
        }
      } @else {
        <p class="empty">
          {{ t().empty }}
          <a [href]="profile" target="_blank" rel="noopener">{{ t().visit }}</a>!
        </p>
      }
    </section>
  `,
  styles: `
    .head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
    .head h2 { margin: 0; }
    .follow {
      display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 999px;
      border: 1px solid var(--bn-line); color: var(--bn-ink); text-decoration: none; font-weight: 500;
    }
    .follow:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .follow svg { width: 20px; height: 20px; }
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
    iframe { width: 100%; height: 560px; border: 0; border-radius: 8px; background: #fff; }
    .consent {
      display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; padding: 32px 22px;
      border-radius: 12px; border: 1px solid var(--bn-line);
      background: radial-gradient(120% 80% at 50% 0%, rgba(232, 164, 106, .18), transparent 60%), rgba(27, 30, 34, .72);
    }
    .title { margin: 0; font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .16em; font-size: .78rem; }
    .note { margin: 0; max-width: 560px; font-size: .84rem; line-height: 1.6; color: var(--bn-fog); }
    .note a, .empty a { color: var(--bn-sunset); }
    .load { padding: 10px 22px; border-radius: 999px; border: 0; cursor: pointer; font: inherit; font-weight: 600; background: var(--bn-sunset); color: #1b1e22; }
    .load:hover { filter: brightness(1.08); }
    .direct { font-size: .82rem; color: var(--bn-fog); }
    .empty { margin: 0; color: rgba(236, 233, 228, .82); line-height: 1.6; }
  `,
})
export class InstagramFeed {
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly profile = PROFILE;
  protected readonly loaded = signal(false);
  protected readonly t = inject(I18n).t(TEXT);
  // https://www.instagram.com/p/<code>/ bzw. /reel/<code>/ → …/embed
  protected readonly posts: { url: string; embed: SafeResourceUrl }[] = inject(BandService).instagramPosts.map((url) => {
    const clean = url.split('?')[0].replace(/\/?$/, '/');
    return { url: clean, embed: this.sanitizer.bypassSecurityTrustResourceUrl(`${clean}embed`) };
  });
}
