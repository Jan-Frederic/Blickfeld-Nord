import { afterNextRender, Component, computed, effect, inject, signal } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { scrollToSection } from './scroll';
import { trackPageViews } from './analytics';
import release from './data/version.json';
import { enableOffline, install, installable, iosHint, setupPwa, updateReady } from './pwa';
import { I18n, LANGS, LANG_NAMES, Lang, LocPipe, localize, rememberLanguage, tr } from './i18n';
import { BACKSTAGE_BEREICHE, imBereich } from './data/backstage-bereiche';
import { SyncKompass } from './pages/sync-kompass';
import { KopfSuche } from './pages/kopf-suche';
import { KopfGlocke } from './pages/kopf-glocke';
import { BandService } from './data/band.service';
import { ladeIch } from './data/band-ich';
import { ansichtAus } from './data/neu-zeichnen';
import { Verlauf } from './zurueck';
import { SprachHinweis } from './sections/sprach-hinweis';
import { BaldLeiste } from './sections/bald-leiste';

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
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LocPipe, SprachHinweis, SyncKompass, BaldLeiste, KopfSuche, KopfGlocke],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly i18n = inject(I18n);
  /** Verlauf für „zurück“ ab der ersten Navigation mitschreiben (zurueck.ts) */
  private readonly verlauf = inject(Verlauf);
  /** geroutete Seite kurz ausblenden, damit sie neue Daten aus dem Abgleich liest (data/neu-zeichnen.ts) */
  protected readonly ansichtAus = ansichtAus;
  protected readonly t = this.i18n.t(TEXT);
  // Symbole erscheinen nur im Handy-Menü (wie im Backstage), die Desktop-Leiste bleibt reine Schrift
  protected readonly nav = computed((): { id?: string; link?: string; label: string; icon: string }[] => {
    const n = this.t().nav;
    return [
      { id: 'tour', label: n.tour, icon: 'event' },
      { link: '/booking', label: n.booking, icon: 'event_available' },
      { link: '/presse', label: n.press, icon: 'newspaper' },
      { link: '/technik', label: n.tech, icon: 'tune' },
      { link: '/repertoire', label: n.repertoire, icon: 'library_music' },
      { link: '/galerie', label: n.gallery, icon: 'photo_camera' },
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
  /** mit dem Microsoft-Konto der Synchronisation angemeldet (merkt sich das Gerät) – dann Backstage-Zugang in der Navigation */
  protected readonly angemeldet = signal(false);
  // Im Backstage listet die Kopfleiste dessen Bereiche statt der Abschnitte der Website (Logo führt zurück)
  protected readonly imBackstage = computed(() => this.i18n.path().startsWith('/backstage'));

  // Im Backstage (der App) nicht zoomen: Zwei-Finger- und Doppeltipp-Zoom aus (styles.scss, html.backstage), auf dem
  // iPhone zusätzlich die Safari-Geste abfangen. Die öffentliche Website bleibt zoombar (Barrierefreiheit); im Backstage
  // gibt es eigene Größenregler (Schriftgröße im Bühnen-Modus, Zoom der Noten).
  private readonly zoomSperre = effect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('backstage', this.imBackstage());
  });
  private readonly safariGeste = (() => {
    if (typeof document === 'undefined') return;
    const sperren = (e: Event) => document.documentElement.classList.contains('backstage') && e.preventDefault();
    document.addEventListener('gesturestart', sperren, { passive: false });
    document.addEventListener('gesturechange', sperren, { passive: false });
  })();
  protected readonly backstage = BACKSTAGE_BEREICHE;
  protected readonly imBereich = imBereich;
  protected readonly nordBuchstaben = ['N', 'O', 'R', 'D'];
  /** Backstage: „Ich bin …“ dieses Geräts (nach dem Hydrieren und bei jedem Seitenwechsel gelesen) – Initialen oben links */
  private readonly ich = signal('');
  private readonly mitglieder = inject(BandService).members;
  protected readonly initialen = computed(() => this.mitglieder.find((m) => m.slug === this.ich())?.initials ?? '');
  protected readonly profilLabel = computed(() => {
    const m = this.mitglieder.find((x) => x.slug === this.ich());
    return m ? `Profil: ${m.name}` : 'Profil';
  });
  /** Backstage: Leiste beim Hochwischen (nach unten scrollen) ausgeblendet, beim Runterwischen wieder da */
  protected readonly kopfWeg = signal(false);
  /** aktuelle Adresse ohne Sprache (für die Hervorhebung von Bereichen mit Untermenü) */
  protected readonly pfad = computed(() => this.i18n.path().replace(/\/$/, '') || '/');
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

  /** Spotify-Anmeldung kam in einem anderen Browser an als dem, in dem sie begonnen wurde */
  protected readonly spotifyFremd = signal(false);

  protected reload(): void {
    location.reload();
  }

  constructor() {
    // Rückkehr von der Spotify-Anmeldung (Startseite mit ?code=&state=): Zugang holen, zurück zur Ausgangsseite
    // (die Adresse gleich merken – bis das Modul geladen ist, kann sie sich schon geändert haben). Kam die Antwort in
    // einem Browser an, in dem die Anmeldung nicht begonnen wurde, erklärt ein Hinweis, was zu tun ist.
    const suche = typeof location !== 'undefined' ? location.search : '';
    if (/[?&]state=/.test(suche) && /[?&](code|error)=/.test(suche))
      void import('./data/spotify-remote').then((m) => {
        const art = m.spotifyRueckkehr(suche);
        if (art === 'passt' || art === 'abgebrochen') return m.spotifyAnmeldungAbschliessen(suche);
        if (art === 'fremd') this.spotifyFremd.set(true);
        return undefined;
      });
    trackPageViews();
    // Sprungmarken (z. B. /booking#verfuegbarkeit) nicht unter der fest stehenden Kopfzeile verstecken
    inject(ViewportScroller).setOffset([0, 80]);
    // Progressive Web App: offline nutzbar und installierbar (erst nach dem ersten Rendern, bremst den Seitenaufbau nicht)
    setupPwa();
    afterNextRender(() => enableOffline());
    // erst nach dem Hydrieren lesen, damit die vorgerenderte Seite (nicht angemeldet) unverändert übernommen wird
    afterNextRender(() => {
      try {
        this.angemeldet.set(!!localStorage.getItem('bn-onedrive-konto'));
      } catch {
        // ohne Speicher eben nicht
      }
      this.leisteBeobachten();
      this.untermenuesSchliessen();
      this.ich.set(ladeIch());
      this.router.events.subscribe(() => this.ich.set(ladeIch()));
      this.kopfBeimScrollen();
    });
  }

  // Backstage-Leiste: weg, sobald man nach unten scrollt (auf dem Handy: nach oben wischt), zurück beim Hochscrollen,
  // ganz oben und nach jedem Seitenwechsel. Offenes Menü, Untermenü oder Suche halten sie sichtbar.
  private kopfBeimScrollen(): void {
    let zuletzt = scrollY;
    addEventListener(
      'scroll',
      () => {
        const y = scrollY;
        const d = y - zuletzt;
        if (Math.abs(d) < 6) return;
        zuletzt = y;
        const offen = !!document.querySelector('#hauptmenue:popover-open, details.untermenue[open], .kopf-suche');
        this.kopfWeg.set(this.imBackstage() && d > 0 && y > 80 && !offen);
      },
      { passive: true },
    );
    this.router.events.subscribe(() => this.kopfWeg.set(false));
  }

  // Untermenüs der Backstage-Leiste (details.untermenue): Klick daneben oder Escape klappt sie zu, immer nur eins offen
  private untermenuesSchliessen(): void {
    const zu = (ausser?: EventTarget | null) =>
      document.querySelectorAll<HTMLDetailsElement>('details.untermenue[open]').forEach((d) => {
        if (!(ausser instanceof Node && d.contains(ausser))) d.open = false;
      });
    document.addEventListener('click', (e) => zu(e.target));
    document.addEventListener('keydown', (e) => e.key === 'Escape' && zu());
  }

  // Volle Leiste nur, wenn sie wirklich passt: Die Punkte (je Sprache, Backstage mit mehr Bereichen, angemeldet mit
  // Backstage-Link) brauchen unterschiedlich viel Platz. Passt sie nicht, übernimmt das Menü (Klasse „eng“) – sonst
  // wird die Leiste links und rechts abgeschnitten (z. B. Backstage bei 1366–1450 px).
  private leisteBeobachten(): void {
    const kopf = document.querySelector<HTMLElement>('header.topbar');
    if (!kopf) return;
    let geplant = 0;
    const pruefen = () => {
      cancelAnimationFrame(geplant);
      geplant = requestAnimationFrame(() => {
        kopf.classList.remove('eng');
        kopf.classList.toggle('eng', kopf.scrollWidth > kopf.clientWidth + 1);
      });
    };
    pruefen();
    addEventListener('resize', pruefen, { passive: true });
    document.fonts?.ready.then(pruefen).catch(() => undefined);
    // nach jedem Seitenwechsel (Backstage-Leiste, Sprache, Anmeldung) neu messen
    this.router.events.subscribe(() => pruefen());
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
