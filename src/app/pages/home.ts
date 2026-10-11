import { Component } from '@angular/core';
import { Hero } from '../sections/hero';
import { Band } from '../sections/band';
import { Music } from '../sections/music';
import { Tour } from '../sections/tour';

@Component({
  selector: 'app-home',
  imports: [Hero, Band, Music, Tour],
  template: `
    <app-hero (navigate)="scrollTo($event)" />
    <app-band />
    <app-music />
    <app-tour />
  `,
})
export class Home {
  protected scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
