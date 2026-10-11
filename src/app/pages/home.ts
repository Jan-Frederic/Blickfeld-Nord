import { Component } from '@angular/core';
import { Hero } from '../sections/hero';
import { Band } from '../sections/band';
import { Music } from '../sections/music';
import { Tour } from '../sections/tour';
import { Gallery } from '../sections/gallery';

@Component({
  selector: 'app-home',
  imports: [Hero, Band, Music, Tour, Gallery],
  template: `
    <app-hero (navigate)="scrollTo($event)" />
    <app-band />
    <app-music />
    <app-tour />
    <app-gallery />
  `,
})
export class Home {
  protected scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
