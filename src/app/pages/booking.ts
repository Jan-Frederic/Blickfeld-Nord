import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Booking } from '../sections/booking';
import { scrollToSection } from '../scroll';

// Eigene Unterseite /booking: Infos für Veranstalter, Verfügbarkeitskalender, FAQ und Kontakt
@Component({
  selector: 'app-booking-page',
  imports: [Booking],
  template: `<app-booking />`,
})
export class BookingPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  ngOnInit(): void {
    // /booking#verfuegbarkeit springt direkt zum Kalender
    const fragment = this.route.snapshot.fragment;
    if (this.isBrowser && fragment) scrollToSection(fragment);
  }
}
