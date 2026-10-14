import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-root',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly nav = [
    { id: 'band', label: 'Band' },
    { id: 'tour', label: 'Konzerte' },
    { id: 'booking', label: 'Booking' },
    { id: 'galerie', label: 'Galerie' },
  ];
  protected readonly year = new Date().getFullYear();

  private readonly router = inject(Router);

  private logoClicks: number[] = [];
  private eggCooldownUntil = 0;

  // Easter Egg: fünf Klicks aufs Logo innerhalb von 2 Sekunden öffnen die Backstage-Seite
  protected onLogoClick(): void {
    const now = Date.now();
    // Überzählige Klicks direkt nach dem Auslösen ignorieren, sonst geht es gleich zurück zur Startseite
    if (now < this.eggCooldownUntil) return;
    this.logoClicks = [...this.logoClicks.filter((t) => now - t < 2000), now];
    if (this.logoClicks.length >= 5) {
      this.logoClicks = [];
      this.eggCooldownUntil = now + 1000;
      this.router.navigateByUrl('/backstage');
      return;
    }
    this.scrollTo('home');
  }

  // Von Impressum/Datenschutz aus erst zur Startseite wechseln, dann zum Abschnitt scrollen
  protected async scrollTo(id: string): Promise<void> {
    if (this.router.url.split(/[?#]/)[0] !== '/') {
      await this.router.navigateByUrl('/');
    }
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }));
  }
}
