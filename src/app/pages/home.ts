import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Hero } from '../sections/hero';
import { Band } from '../sections/band';
import { Tour } from '../sections/tour';
import { BookingTeaser } from '../sections/booking-teaser';
import { LastLive } from '../sections/last-live';
import { InstagramFeed } from '../sections/instagram-feed';
import { SaisonHinweis } from '../sections/saison-hinweis';
import { scrollToSection } from '../scroll';

// Abschnitte unterhalb des Startbilds sind vorgerendert (sichtbar und für Google lesbar),
// werden aber erst aktiviert, wenn sie ins Bild kommen – das spart JavaScript beim Laden.
// Bei Navigation innerhalb der Seite werden sie sofort geladen.
@Component({
  selector: 'app-home',
  imports: [Hero, Band, Tour, LastLive, InstagramFeed, BookingTeaser, SaisonHinweis],
  template: `
    <app-hero (navigate)="scrollTo($event)" />
    @defer (on immediate; hydrate on viewport) {
      <app-band />
    }
    @defer (on immediate; hydrate on viewport) {
      <!-- im Browser neu berechnet: welche Termine schon vorbei sind, hängt vom Besuchstag ab, nicht vom Build-Tag -->
      <app-tour ngSkipHydration />
    }
    @defer (on immediate; hydrate on viewport) {
      <!-- abhängig vom Besuchstag (Saison, freie Wochenenden) – im Browser neu berechnet -->
      <app-saison-hinweis ngSkipHydration />
    }
    @defer (on immediate; hydrate on viewport) {
      <app-last-live />
    }
    @defer (on immediate; hydrate on viewport) {
      <app-instagram-feed />
    }
    @defer (on immediate; hydrate on viewport) {
      <app-booking-teaser />
    }
  `,
})
export class Home implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  ngOnInit(): void {
    // Links wie „/#band“ (z. B. „Zur Band“ auf den Mitgliederseiten) zum Abschnitt führen
    const fragment = this.route.snapshot.fragment;
    if (this.isBrowser && fragment) scrollToSection(fragment);
  }

  protected scrollTo(id: string): void {
    scrollToSection(id);
  }
}
