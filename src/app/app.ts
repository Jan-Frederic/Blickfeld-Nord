import { Component, afterNextRender, computed, inject } from '@angular/core';
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
import { I18n, LANGS, LANG_NAMES, LocPipe, localize, tr } from './i18n';

const TEXT = tr(
  {
    nav: { band: 'Band', tour: 'Konzerte', booking: 'Booking', repertoire: 'Repertoire', gallery: 'Galerie', history: 'Historie', friends: 'Freunde' },
    footer: { press: 'Presse', tech: 'Technik', imprint: 'Impressum', privacy: 'Datenschutz' },
    toTop: 'Zum Seitenanfang',
    openMenu: 'Menü öffnen',
    language: 'Sprache',
    instagram: 'Blickfeld Nord auf Instagram',
    facebook: 'Blickfeld Nord auf Facebook',
    mail: 'E-Mail an Matthias Wigger',
    install: 'Als App installieren',
    iosHint: 'Als App nutzen:',
    iosShare: 'Teilen → „Zum Home-Bildschirm“',
    rights: 'Alle Rechte vorbehalten',
    whatsNew: 'Was ist neu?',
    version: 'Version',
    updateReady: 'Neue Version verfügbar',
    reload: 'Neu laden',
    closeHint: 'Hinweis schließen',
  },
  {
    nav: { band: 'Band', tour: 'Shows', booking: 'Booking', repertoire: 'Repertoire', gallery: 'Gallery', history: 'History', friends: 'Friends' },
    footer: { press: 'Press', tech: 'Technical info', imprint: 'Legal notice', privacy: 'Privacy' },
    toTop: 'Back to top',
    openMenu: 'Open menu',
    language: 'Language',
    instagram: 'Blickfeld Nord on Instagram',
    facebook: 'Blickfeld Nord on Facebook',
    mail: 'E-mail Matthias Wigger',
    install: 'Install as app',
    iosHint: 'Use as an app:',
    iosShare: 'Share → “Add to Home Screen”',
    rights: 'All rights reserved',
    whatsNew: "What's new?",
    version: 'Version',
    updateReady: 'New version available',
    reload: 'Reload',
    closeHint: 'Close notice',
  },
  {
    nav: { band: 'Band', tour: 'Optredens', booking: 'Boeken', repertoire: 'Repertoire', gallery: 'Galerij', history: 'Geschiedenis', friends: 'Vrienden' },
    footer: { press: 'Pers', tech: 'Techniek', imprint: 'Colofon', privacy: 'Privacy' },
    toTop: 'Naar boven',
    openMenu: 'Menu openen',
    language: 'Taal',
    instagram: 'Blickfeld Nord op Instagram',
    facebook: 'Blickfeld Nord op Facebook',
    mail: 'E-mail aan Matthias Wigger',
    install: 'Als app installeren',
    iosHint: 'Als app gebruiken:',
    iosShare: 'Delen → „Zet op beginscherm”',
    rights: 'Alle rechten voorbehouden',
    whatsNew: 'Wat is er nieuw?',
    version: 'Versie',
    updateReady: 'Nieuwe versie beschikbaar',
    reload: 'Opnieuw laden',
    closeHint: 'Melding sluiten',
  },
);

@Component({
  selector: 'app-root',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, RouterOutlet, RouterLink, LocPipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t(TEXT);
  protected readonly nav = computed((): { id?: string; link?: string; label: string }[] => {
    const n = this.t().nav;
    return [
      { id: 'band', label: n.band },
      { id: 'tour', label: n.tour },
      { link: '/booking', label: n.booking },
      { link: '/repertoire', label: n.repertoire },
      { link: '/galerie', label: n.gallery },
    ];
  });
  // Sprachumschalter: dieselbe Seite in den anderen Sprachen (nicht im Backstage – der ist nur deutsch)
  protected readonly languages = computed(() =>
    LANGS.map((lang) => ({ lang, name: LANG_NAMES[lang], link: localize(this.i18n.path(), lang), current: lang === this.i18n.lang() })),
  );
  protected readonly showLanguages = computed(() => !this.i18n.path().startsWith('/backstage'));
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
    if (this.i18n.path() !== '/') {
      await this.router.navigateByUrl(this.i18n.link('/'));
    }
    scrollToSection(id);
  }
}
