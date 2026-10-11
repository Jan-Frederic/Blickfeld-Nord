import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Hero } from './sections/hero';
import { Band } from './sections/band';
import { Music } from './sections/music';
import { Tour } from './sections/tour';
import { Contact } from './sections/contact';

@Component({
  selector: 'app-root',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, Hero, Band, Music, Tour, Contact],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly nav = [
    { id: 'band', label: 'Band' },
    { id: 'musik', label: 'Musik' },
    { id: 'tour', label: 'Tour' },
    { id: 'kontakt', label: 'Kontakt' },
  ];
  protected readonly year = new Date().getFullYear();

  protected scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
