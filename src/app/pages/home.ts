import { Component } from '@angular/core';
import { Hero } from '../sections/hero';
import { Band } from '../sections/band';
import { Tour } from '../sections/tour';
import { Gallery } from '../sections/gallery';
import { Booking } from '../sections/booking';

@Component({
  selector: 'app-home',
  imports: [Hero, Band, Tour, Booking, Gallery],
  template: `
    <app-hero (navigate)="scrollTo($event)" />
    <app-band />
    <app-tour />
    <app-booking />
    <app-gallery />
  `,
})
export class Home {
  protected scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
