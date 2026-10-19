import { Component, DestroyRef, PLATFORM_ID, computed, inject, output, signal } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BandService, Show } from '../data/band.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-next-show',
  imports: [DatePipe],
  template: `
    @if (nextShow; as s) {
      <p class="claim">Nächstes Konzert: <strong>{{ s.date | date: 'dd.MM.yyyy' }}@if (s.time) {, {{ s.time }} Uhr}</strong> · {{ s.venue }} {{ s.city ?? '' }}@if (s.price === 0) { · Eintritt frei}</p>
      <!-- Countdown: Platz ist immer reserviert (kein Layout-Sprung), Zahlen erscheinen erst im Browser -->
      <div class="countdown" aria-live="off">
        @if (left(); as l) {
          @if (l.live) {
            <span class="live">Jetzt live!</span>
          } @else {
            <span class="unit"><b>{{ l.days }}</b><small>{{ l.days === 1 ? 'Tag' : 'Tage' }}</small></span>
            <span class="unit"><b>{{ l.hours }}</b><small>Std</small></span>
            <span class="unit"><b>{{ l.minutes }}</b><small>Min</small></span>
          }
        }
      </div>
    }
  `,
  styles: `
    :host { display: block; }
    .claim {
      font-family: 'Montserrat', sans-serif; font-weight: 300; text-transform: uppercase;
      letter-spacing: .28em; font-size: clamp(.75rem, 1.6vw, 1rem);
      margin: 0 0 12px; text-shadow: 0 2px 12px rgba(0, 0, 0, .8);
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
  `,
})
export class NextShow {
  // Auftritte haben kein festes Ende – so lange gilt ein Konzert nach Beginn als „live“
  private static readonly LIVE_HOURS = 3;

  private readonly now = signal(Date.now());

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
  imports: [NextShow, RouterLink, MatButtonModule, MatIconModule],
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
        alt="Logo von Blickfeld Nord mit Kompass über einem nebligen See bei Sonnenuntergang"
      />
      <div class="hero-content">
        <!-- im Browser neu berechnet: das beim Build vorgerenderte Datum kann inzwischen veraltet sein -->
        <app-next-show ngSkipHydration />
        <div class="actions">
          <button mat-flat-button (click)="navigate.emit('tour')">
            <mat-icon>explore</mat-icon> Konzerte
          </button>
          <button mat-stroked-button (click)="navigate.emit('band')">
            <mat-icon>groups</mat-icon> Die Band
          </button>
        </div>
        <!-- Kurzfassungen fürs Booking aus den Niederlanden und für internationale Gäste -->
        <p class="langs">
          <mat-icon>translate</mat-icon>
          <a routerLink="/booking/en" lang="en" hreflang="en">Booking in English</a>
          <span aria-hidden="true">·</span>
          <a routerLink="/booking/nl" lang="nl" hreflang="nl">Boeken in het Nederlands</a>
        </p>
      </div>
    </section>
  `,
  styles: `
    .hero { position: relative; padding-top: 64px; }
    @media (max-width: 599px) { .hero { padding-top: 56px; } }
    img {
      display: block; width: 100%; height: auto; max-height: calc(100svh - 64px);
      object-fit: cover; object-position: center 30%;
    }
    .hero-content {
      position: absolute; inset: auto 0 0 0; padding: 0 16px clamp(24px, 6vw, 72px);
      text-align: center;
    }
    .actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .actions button { letter-spacing: .12em; text-transform: uppercase; }
    .langs {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 4px 10px; margin: 16px 0 0;
      font-size: .85rem; color: var(--bn-fog); text-shadow: 0 1px 8px rgba(0, 0, 0, .8);
    }
    .langs mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .langs a { color: var(--bn-ink); text-decoration: none; }
    .langs a:hover { color: var(--bn-sunset); }
    [mat-stroked-button] { background: rgba(20, 22, 25, .45); backdrop-filter: blur(4px); }
    .visually-hidden {
      position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;
    }
    /* Auf schmalen Screens bleibt das Logo vollständig sichtbar, der Inhalt folgt darunter */
    @media (max-width: 720px) {
      .hero-content { position: static; padding: 24px 16px 8px; }
    }
  `,
})
export class Hero {
  readonly navigate = output<string>();
}
