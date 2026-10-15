import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Hero } from '../sections/hero';
import { Band } from '../sections/band';
import { Tour } from '../sections/tour';
import { Gallery } from '../sections/gallery';
import { Booking } from '../sections/booking';
import { scrollToSection } from '../scroll';

// Abschnitte unterhalb des Startbilds sind vorgerendert (sichtbar und für Google lesbar),
// werden aber erst aktiviert, wenn sie ins Bild kommen – das spart JavaScript beim Laden.
// Bei Navigation innerhalb der Seite werden sie sofort geladen.
@Component({
  selector: 'app-home',
  imports: [Hero, Band, Tour, Booking, Gallery],
  template: `
    <app-hero (navigate)="scrollTo($event)" />
    @defer (on immediate; hydrate on viewport) {
      <app-band />
    }
    @defer (on immediate; hydrate on viewport) {
      <app-tour />
    }
    @defer (on immediate; hydrate on viewport) {
      <app-booking />
    }
    @defer (on immediate; hydrate on viewport) {
      <app-gallery />
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
