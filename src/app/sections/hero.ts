import { Component, DestroyRef, PLATFORM_ID, computed, inject, output, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BandService, Show } from '../data/band.service';
import { I18n, LANGS, LDatePipe, localize, tr } from '../i18n';

const TEXT = tr(
  {
    next: 'Nächstes Konzert:',
    oclock: ' Uhr',
    free: 'Eintritt frei',
    live: 'Jetzt live!',
    day: 'Tag',
    days: 'Tage',
    hours: 'Std',
    minutes: 'Min',
    alt: 'Logo von Blickfeld Nord mit Kompass über einem nebligen See bei Sonnenuntergang',
    concerts: 'Konzerte',
    band: 'Die Band',
  },
  {
    next: 'Next show:',
    oclock: '',
    free: 'Free entry',
    live: 'Live now!',
    day: 'Day',
    days: 'Days',
    hours: 'Hrs',
    minutes: 'Min',
    alt: 'Blickfeld Nord logo with a compass above a misty lake at sunset',
    concerts: 'Shows',
    band: 'The band',
  },
  {
    next: 'Volgend optreden:',
    oclock: '',
    free: 'Gratis entree',
    live: 'Nu live!',
    day: 'Dag',
    days: 'Dagen',
    hours: 'Uur',
    minutes: 'Min',
    alt: 'Logo van Blickfeld Nord met een kompas boven een mistig meer bij zonsondergang',
    concerts: 'Optredens',
    band: 'De band',
  },
);

// Hinweis auf das Booking in den jeweils anderen Sprachen (Veranstalter aus den Niederlanden, internationale Gäste)
// in der jeweiligen Sprache selbst beschriftet, damit Besucher ihre Sprache auf Anhieb finden
const LANG_LINK = { de: 'Auf Deutsch', en: 'In English', nl: 'In het Nederlands' } as const;

@Component({
  selector: 'app-next-show',
  imports: [LDatePipe],
  template: `
    @if (nextShow; as s) {
      <p class="claim">
        <span>{{ t().next }} <strong>{{ s.date | ldate: 'short' }}@if (s.time) {, {{ s.time }}{{ t().oclock }}}</strong></span>
        <span>{{ s.venue }} {{ s.city ?? '' }}@if (s.price === 0) { · {{ t().free }}}</span>
      </p>
      <!-- Countdown: Platz ist immer reserviert (kein Layout-Sprung), Zahlen erscheinen erst im Browser -->
      <div class="countdown" aria-live="off">
        @if (left(); as l) {
          @if (l.live) {
            <span class="live">{{ t().live }}</span>
          } @else {
            <span class="unit"><b>{{ l.days }}</b><small>{{ l.days === 1 ? t().day : t().days }}</small></span>
            <span class="unit"><b>{{ l.hours }}</b><small>{{ t().hours }}</small></span>
            <span class="unit"><b>{{ l.minutes }}</b><small>{{ t().minutes }}</small></span>
          }
        }
      </div>
    }
  `,
  styles: `
    :host { display: block; }
    .claim {
      font-family: 'Montserrat', sans-serif; font-weight: 300; text-transform: uppercase;
      letter-spacing: .22em; font-size: clamp(.75rem, 1.4vw, .95rem); line-height: 1.7;
      display: flex; flex-direction: column; gap: 2px; margin: 0 auto 12px; text-shadow: 0 1px 3px #000, 0 2px 12px rgba(0, 0, 0, .9);
    }
    .claim strong { font-weight: 400; color: var(--bn-sunset); }
    .countdown { display: flex; justify-content: center; gap: 10px; height: 58px; margin-bottom: 20px; }
    .unit {
      display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 64px;
      border: 1px solid rgba(236, 233, 228, .25); border-radius: 10px; background: rgba(20, 22, 25, .55);
      backdrop-filter: blur(4px);
    }
    .unit b { font-family: var(--bn-display); font-weight: 400; font-size: 1.25rem; line-height: 1.1; font-variant-numeric: tabular-nums; }
    .unit small { font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .16em; font-size: .6rem; color: var(--bn-fog); }
    .live {
      align-self: center; padding: 8px 18px; border-radius: 999px; background: var(--bn-sunset); color: #2a1708;
      font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .2em; font-weight: 600; font-size: .8rem;
      animation: pulse 1.6s ease-in-out infinite;
    }
    @keyframes pulse { 50% { box-shadow: 0 0 0 8px rgba(232, 164, 106, .25); } }
    @media (prefers-reduced-motion: reduce) { .live { animation: none; } }
    @media (max-width: 720px) { .claim { letter-spacing: .14em; } }
  `,
})
export class NextShow {
  // Auftritte haben kein festes Ende – so lange gilt ein Konzert nach Beginn als „live“
  private static readonly LIVE_HOURS = 3;

  private readonly now = signal(Date.now());
  protected readonly t = inject(I18n).t(TEXT);

  // Nächster öffentlicher Termin, der noch nicht vorbei ist (Beginn + 3 h bzw. Tagesende ohne Uhrzeit)
  protected readonly nextShow = inject(BandService).publicShows.find((s) => this.end(s) > Date.now());

  protected readonly left = computed(() => {
    const s = this.nextShow;
    if (!s || !this.browser) return null;
    const diff = this.start(s) - this.now();
    if (diff <= 0) return { live: true, days: 0, hours: 0, minutes: 0 };
    const minutes = Math.floor(diff / 60000);
    return { live: false, days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60), minutes: minutes % 60 };
  });

  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    if (!this.browser) return;
    const timer = setInterval(() => this.now.set(Date.now()), 30_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  // Ortszeit des Besuchers – die Band spielt in NRW, Besucher sind praktisch immer in derselben Zeitzone
  private start(s: Show): number {
    return new Date(`${s.date}T${s.time ?? '00:00'}:00`).getTime();
  }

  private end(s: Show): number {
    if (s.time && !s.endDate) return this.start(s) + NextShow.LIVE_HOURS * 3_600_000;
    return new Date(`${s.endDate ?? s.date}T23:59:59`).getTime();
  }
}

@Component({
  selector: 'app-hero',
  imports: [NextShow, RouterLink],
  template: `
    <section class="hero" id="home">
      <h1 class="visually-hidden">Blickfeld Nord</h1>
      <!-- LCP-Bild: feste Maße (kein Layout-Sprung), passende Größe je Bildschirm, höchste Ladepriorität -->
      <img
        src="hero.webp"
        srcset="hero-800.webp 800w, hero-1200.webp 1200w, hero.webp 2000w"
        sizes="100vw"
        width="2000"
        height="1125"
        fetchpriority="high"
        [alt]="t().alt"
      />
      <div class="hero-content">
        <div class="inner">
        <!-- im Browser neu berechnet: das beim Build vorgerenderte Datum kann inzwischen veraltet sein -->
        <app-next-show ngSkipHydration />
        <div class="actions">
          <button type="button" class="bn-btn bn-btn-flat" (click)="navigate.emit('tour')">
            <span class="material-icons" aria-hidden="true">explore</span> {{ t().concerts }}
          </button>
          <button type="button" class="bn-btn bn-btn-stroked" (click)="navigate.emit('band')">
            <span class="material-icons" aria-hidden="true">groups</span> {{ t().band }}
          </button>
        </div>
        <!-- Startseite in den anderen Sprachen – für Gäste und Veranstalter aus den Niederlanden und international -->
        <p class="langs">
          <span class="material-icons" aria-hidden="true">translate</span>
          @for (b of otherLanguages(); track b.lang; let last = $last) {
            <a [routerLink]="b.link" [attr.lang]="b.lang" [attr.hreflang]="b.lang">{{ b.label }}</a>
            @if (!last) { <span aria-hidden="true">·</span> }
          }
        </p>
        </div>
      </div>
    </section>
  `,
  styles: `
    /* Bild und Inhalt liegen im selben Rasterfeld. Der Inhalt beginnt erst unter dem Logo im Bild (Logo endet bei
       ca. 66 % der Bildhöhe, plus etwas Luft, Bild im Format 16:9 → Prozent-Abstand bezieht sich auf die Breite). Reicht der Platz
       darunter nicht, wächst der Bereich nach unten statt Text über das Logo zu legen. */
    .hero { position: relative; display: grid; padding-top: 64px; }
    @media (max-width: 599px) { .hero { padding-top: 56px; } }
    img, .hero-content { grid-area: 1 / 1; }
    img {
      display: block; width: 100%; height: auto;
      mask-image: linear-gradient(to bottom, #000 78%, transparent);
    }
    .hero-content {
      position: relative; display: flex; flex-direction: column; justify-content: flex-end;
      padding: calc(56.25% * .73) 16px clamp(16px, 3vw, 40px); text-align: center;
    }
    /* dunkler Schleier hinter Text und Countdown – lesbar auch vor der hellen Sonne rechts */
    .inner {
      margin: 0 auto; padding: 14px clamp(14px, 3vw, 36px); border-radius: 18px;
      background: rgba(20, 22, 25, .5); backdrop-filter: blur(5px);
    }
    .actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .actions button { letter-spacing: .12em; text-transform: uppercase; }
    .langs {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 4px 10px; margin: 12px 0 0;
      font-size: .85rem; color: var(--bn-fog); text-shadow: 0 1px 8px rgba(0, 0, 0, .8);
    }
    .langs .material-icons { font-size: 16px; width: 16px; height: 16px; }
    .langs a { color: var(--bn-ink); text-decoration: none; }
    .langs a:hover { color: var(--bn-sunset); }
    .bn-btn-stroked { background: rgba(20, 22, 25, .45); backdrop-filter: blur(4px); }
    .visually-hidden {
      position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;
    }
    /* Auf schmalen Screens folgt der Inhalt unter dem Bild */
    @media (max-width: 720px) {
      .hero-content { grid-area: 2 / 1; padding: 8px 16px; }
      .inner { padding: 0; background: none; backdrop-filter: none; }
    }
  `,
})
export class Hero {
  readonly navigate = output<string>();
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t(TEXT);
  protected readonly otherLanguages = computed(() =>
    LANGS.filter((l) => l !== this.i18n.lang()).map((l) => ({ lang: l, label: LANG_LINK[l], link: localize('/', l) })),
  );
}
