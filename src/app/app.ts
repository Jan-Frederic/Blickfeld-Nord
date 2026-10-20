import { Component, afterNextRender, inject } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { scrollToSection } from './scroll';
import { trackPageViews } from './analytics';
import release from './data/version.json';
import { enableOffline, install, installable, iosHint, setupPwa, updateReady } from './pwa';

@Component({
  selector: 'app-root',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly nav: { id?: string; link?: string; label: string }[] = [
    { id: 'band', label: 'Band' },
    { id: 'tour', label: 'Konzerte' },
    { link: '/booking', label: 'Booking' },
    { link: '/repertoire', label: 'Repertoire' },
    { link: '/galerie', label: 'Galerie' },
  ];
  protected readonly year = new Date().getFullYear();
  // Release-Version (semantic-release, beim Deploy von scripts/write-version.mjs eingetragen)
  protected readonly version = release.version;
  protected readonly releaseUrl = `https://github.com/Jan-Frederic/Blickfeld-Nord/releases/tag/v${release.version}`;

  private readonly router = inject(Router);
  protected readonly installable = installable;
  protected readonly iosHint = iosHint;
  protected readonly install = install;
  protected readonly updateReady = updateReady;
  protected reload(): void {
    location.reload();
  }

  constructor() {
    trackPageViews();
    // Sprungmarken (z. B. /booking#verfuegbarkeit) nicht unter der fest stehenden Kopfzeile verstecken
    inject(ViewportScroller).setOffset([0, 80]);
    // Progressive Web App: offline nutzbar und installierbar (erst nach dem ersten Rendern, bremst den Seitenaufbau nicht)
    setupPwa();
    afterNextRender(() => enableOffline());
  }

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
    scrollToSection(id);
  }
}
