import { Component } from '@angular/core';
import { Hero } from '../sections/hero';
import { Band } from '../sections/band';
import { Tour } from '../sections/tour';
import { Gallery } from '../sections/gallery';

@Component({
  selector: 'app-home',
  imports: [Hero, Band, Tour, Gallery],
  template: `
    <app-hero (navigate)="scrollTo($event)" />
    <app-band />
    <app-tour />
    <app-gallery />
  `,
})
export class Home {
  protected scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
