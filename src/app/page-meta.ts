import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const SITE_URL = 'https://blickfeld-nord.de';
export const DEFAULT_DESCRIPTION =
  'Blickfeld Nord – Partyband mit drei Stimmen und jeder Menge Stimmung. Live-Musik für Feste, private Feiern und Kneipen rund um Hamminkeln.';

export interface PageMeta {
  title: string;
  description?: string;
  /** Pfad ohne führenden Schrägstrich, z. B. 'presse' */
  path: string;
  /** z. B. 'noindex' für Seiten, die nicht in Suchmaschinen sollen */
  robots?: string;
  /** Sprache der Seite (Standard: Deutsch) */
  lang?: Lang;
  /** Sprachfassungen derselben Seite (hreflang), z. B. BOOKING_ALTERNATES */
  alternates?: Record<string, string>;
}

export type Lang = 'de' | 'en' | 'nl';

// Die Booking-Seite gibt es auf Deutsch, Englisch und Niederländisch – Suchmaschinen zeigen so je Sprache die passende Fassung
export const BOOKING_ALTERNATES: Record<string, string> = { de: 'booking', en: 'booking/en', nl: 'booking/nl', 'x-default': 'booking' };

const LOCALE: Record<Lang, string> = { de: 'de_DE', en: 'en_GB', nl: 'nl_NL' };
const IMAGE_ALT: Record<Lang, string> = {
  de: 'Logo von Blickfeld Nord: Kompass mit Schriftzug vor einer abendlichen Seelandschaft',
  en: 'Blickfeld Nord logo: compass with lettering in front of an evening lake landscape',
  nl: 'Logo van Blickfeld Nord: kompas met letters voor een avondlijk merenlandschap',
};

// Titel, Beschreibung, Canonical und Link-Vorschau (Open Graph / Twitter) je Seite.
// Wird beim Vorrendern ausgeführt, die Tags stehen also fertig im HTML jeder Unterseite.
@Injectable({ providedIn: 'root' })
export class PageMetaService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  set(page: PageMeta): void {
    const description = page.description ?? DEFAULT_DESCRIPTION;
    const url = `${SITE_URL}/${page.path}`;
    const lang = page.lang ?? 'de';

    this.title.setTitle(page.title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:title', content: page.title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ name: 'twitter:title', content: page.title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.document.documentElement.lang = lang;
    this.meta.updateTag({ property: 'og:locale', content: LOCALE[lang] });
    this.meta.updateTag({ property: 'og:image:alt', content: IMAGE_ALT[lang] });
    if (page.robots) {
      this.meta.updateTag({ name: 'robots', content: page.robots });
    } else {
      this.meta.removeTag('name="robots"');
    }
    const canonical = this.document.querySelector('link[rel="canonical"]');
    canonical?.setAttribute('href', url);

    // hreflang-Verweise auf die anderen Sprachfassungen (vorherige Seite aufräumen)
    this.document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((l) => l.remove());
    let after = canonical;
    for (const [hreflang, path] of Object.entries(page.alternates ?? {})) {
      const link = this.document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', hreflang);
      link.setAttribute('href', `${SITE_URL}/${path}`);
      after ? after.after(link) : this.document.head.appendChild(link);
      after = link;
    }
  }
}

// Liest title und data.description aus der Route
@Injectable({ providedIn: 'root' })
export class PageTitleStrategy extends TitleStrategy {
  private readonly pageMeta = inject(PageMetaService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot);
    // Seiten ohne festen Titel (z. B. Bandmitglieder) setzen ihre Angaben selbst
    if (!title) return;
    let route = snapshot.root;
    while (route.firstChild) route = route.firstChild;
    this.pageMeta.set({
      title,
      description: route.data['description'],
      robots: route.data['robots'],
      lang: route.data['lang'],
      alternates: route.data['alternates'],
      path: snapshot.url.split(/[?#]/)[0].replace(/^\//, ''),
    });
  }
}
