import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { scrollToSection } from './scroll';
import { trackPageViews } from './analytics';
import release from './data/version.json';
import { enableOffline, install, installable, iosHint, setupPwa, updateReady } from './pwa';
import { I18n, LANGS, LANG_NAMES, Lang, LocPipe, localize, rememberLanguage, tr } from './i18n';
import { BACKSTAGE_BEREICHE } from './data/backstage-bereiche';
import { SprachHinweis } from './sections/sprach-hinweis';

const TEXT = tr(
  {
    nav: { tour: 'Konzerte', booking: 'Booking', press: 'Pressekit', tech: 'Technik', repertoire: 'Repertoire', gallery: 'Galerie', history: 'Historie', friends: 'Freunde', faq: 'FAQ' },
    footer: { press: 'Presse', tech: 'Technik', imprint: 'Impressum', privacy: 'Datenschutz' },
    toTop: 'Zum Seitenanfang',
    openMenu: 'Menü öffnen',
    language: 'Sprache',
    instagram: 'Blickfeld Nord auf Instagram',
    facebook: 'Blickfeld Nord auf Facebook',
    mail: 'E-Mail an Matthias Wigger',
    share: 'Seite teilen',
    copied: 'Link kopiert',
    install: 'Als App installieren',
    iosHint: 'Als App nutzen:',
    iosShare: 'Teilen → „Zum Home-Bildschirm“',
    rights: 'Alle Rechte vorbehalten',
    credit: 'Gestaltung und Umsetzung:',
    whatsNew: 'Was ist neu?',
    version: 'Version',
    updateReady: 'Neue Version verfügbar',
    reload: 'Neu laden',
    closeHint: 'Hinweis schließen',
  },
  {
    nav: { tour: 'Shows', booking: 'Booking', press: 'Press kit', tech: 'Tech info', repertoire: 'Repertoire', gallery: 'Gallery', history: 'History', friends: 'Friends', faq: 'FAQ' },
    footer: { press: 'Press', tech: 'Technical info', imprint: 'Legal notice', privacy: 'Privacy' },
    toTop: 'Back to top',
    openMenu: 'Open menu',
    language: 'Language',
    instagram: 'Blickfeld Nord on Instagram',
    facebook: 'Blickfeld Nord on Facebook',
    mail: 'E-mail Matthias Wigger',
    share: 'Share this page',
    copied: 'Link copied',
    install: 'Install as app',
    iosHint: 'Use as an app:',
    iosShare: 'Share → “Add to Home Screen”',
    rights: 'All rights reserved',
    credit: 'Design and development:',
    whatsNew: "What's new?",
    version: 'Version',
    updateReady: 'New version available',
    reload: 'Reload',
    closeHint: 'Close notice',
  },
  {
    nav: { tour: 'Optredens', booking: 'Boeken', press: 'Perskit', tech: 'Techniek', repertoire: 'Repertoire', gallery: 'Galerij', history: 'Geschiedenis', friends: 'Vrienden', faq: 'FAQ' },
    footer: { press: 'Pers', tech: 'Techniek', imprint: 'Colofon', privacy: 'Privacy' },
    toTop: 'Naar boven',
    openMenu: 'Menu openen',
    language: 'Taal',
    instagram: 'Blickfeld Nord op Instagram',
    facebook: 'Blickfeld Nord op Facebook',
    mail: 'E-mail aan Matthias Wigger',
    share: 'Pagina delen',
    copied: 'Link gekopieerd',
    install: 'Als app installeren',
    iosHint: 'Als app gebruiken:',
    iosShare: 'Delen → „Zet op beginscherm”',
    rights: 'Alle rechten voorbehouden',
    credit: 'Ontwerp en realisatie:',
    whatsNew: 'Wat is er nieuw?',
    version: 'Versie',
    updateReady: 'Nieuwe versie beschikbaar',
    reload: 'Opnieuw laden',
    closeHint: 'Melding sluiten',
  },
);

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LocPipe, SprachHinweis],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t(TEXT);
  protected readonly nav = computed((): { id?: string; link?: string; label: string }[] => {
    const n = this.t().nav;
    return [
      { id: 'tour', label: n.tour },
      { link: '/booking', label: n.booking },
      { link: '/presse', label: n.press },
      { link: '/technik', label: n.tech },
      { link: '/repertoire', label: n.repertoire },
      { link: '/galerie', label: n.gallery },
    ];
  });
  // Sprachumschalter: dieselbe Seite in den anderen Sprachen (nicht im Backstage – der ist nur deutsch)
  protected readonly languages = computed(() =>
    LANGS.map((lang) => ({ lang, name: LANG_NAMES[lang], link: localize(this.i18n.path(), lang), current: lang === this.i18n.lang() })),
  );
  // ausdrücklich gewählte Sprache merken – dann kein Sprachvorschlag mehr
  protected remember(lang: Lang): void {
    rememberLanguage(lang);
  }
  protected readonly showLanguages = computed(() => !this.i18n.path().startsWith('/backstage'));
  // Im Backstage listet die Kopfleiste dessen Bereiche statt der Abschnitte der Website (Logo führt zurück)
  protected readonly imBackstage = computed(() => this.i18n.path().startsWith('/backstage'));
  protected readonly backstage = BACKSTAGE_BEREICHE;
  protected readonly year = new Date().getFullYear();
  // Release-Version (semantic-release, beim Deploy von scripts/write-version.mjs eingetragen)
  protected readonly version = release.version;
  protected readonly releaseUrl = `https://github.com/Jan-Frederic/Blickfeld-Nord/releases/tag/v${release.version}`;

  private readonly router = inject(Router);
  protected readonly installable = installable;
  protected readonly iosHint = iosHint;
  protected readonly install = install;
  protected readonly updateReady = updateReady;
  // Seite teilen (Fußzeile): Teilen-Menü des Geräts mit Titel und Adresse der Seite, sonst Link kopieren
  protected readonly kopiert = signal(false);
  protected async share(): Promise<void> {
    // Canonical-Adresse der Seite (ohne Herkunftsvermerk o. Ä.), sonst die aktuelle Adresse
    const url = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href || location.origin + location.pathname;
    if (navigator.share) {
      await navigator.share({ title: document.title, url }).catch(() => undefined);
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      this.kopiert.set(true);
      setTimeout(() => this.kopiert.set(false), 2000);
    } catch {
      window.prompt(this.t().share, url);
    }
  }

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
