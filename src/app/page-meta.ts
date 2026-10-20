import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { I18n, LANGS, Lang, langOf, localize, stripLang } from './i18n';

export const SITE_URL = 'https://blickfeld-nord.de';
export const DEFAULT_DESCRIPTION: Record<Lang, string> = {
  de: 'Blickfeld Nord – Partyband mit drei Stimmen und jeder Menge Stimmung. Live-Musik für Feste, private Feiern und Kneipen rund um Hamminkeln.',
  en: 'Blickfeld Nord – party band with three voices and plenty of atmosphere. Live music for festivals, private parties and pubs around Hamminkeln, close to the Dutch border.',
  nl: 'Blickfeld Nord – partyband met drie stemmen en een hoop sfeer. Livemuziek voor feesten, privéfeesten en cafés rond Hamminkeln, vlak bij de Nederlandse grens.',
};

export interface PageMeta {
  title: string;
  description?: string;
  /** Pfad ohne führenden Schrägstrich, z. B. 'presse' */
  path: string;
  /** z. B. 'noindex' für Seiten, die nicht in Suchmaschinen sollen */
  robots?: string;
  /** nur Deutsch (Backstage) – ohne Verweise auf andere Sprachfassungen */
  germanOnly?: boolean;
}

export type { Lang };

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
    // Sprache ergibt sich aus der Adresse (/en/…, /nl/…)
    const lang = langOf('/' + page.path);
    const description = page.description ?? DEFAULT_DESCRIPTION[lang];
    const url = `${SITE_URL}/${page.path}`;

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
    // öffentliche Seiten gibt es in allen drei Sprachen – Suchmaschinen zeigen so je Sprache die passende Fassung
    const base = stripLang('/' + page.path);
    const alternates: [string, string][] = page.germanOnly
      ? []
      : [...LANGS.map((l): [string, string] => [l, localize(base, l)]), ['x-default', base]];
    for (const [hreflang, path] of alternates) {
      const link = this.document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', hreflang);
      link.setAttribute('href', `${SITE_URL}${path === '/' ? '/' : path}`);
      after ? after.after(link) : this.document.head.appendChild(link);
      after = link;
    }
  }
}

// Liest title und data.description aus der Route
@Injectable({ providedIn: 'root' })
export class PageTitleStrategy extends TitleStrategy {
  private readonly pageMeta = inject(PageMetaService);
  private readonly i18n = inject(I18n);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    let route = snapshot.root;
    while (route.firstChild) route = route.firstChild;
    const lang = this.i18n.lang();
    // öffentliche Seiten: Titel und Beschreibung je Sprache in data; Backstage: fester deutscher Titel
    const title = (route.data['title'] as Record<Lang, string> | undefined)?.[lang] ?? this.buildTitle(snapshot);
    // Seiten ohne festen Titel (z. B. Bandmitglieder) setzen ihre Angaben selbst
    if (!title) return;
    const path = snapshot.url.split(/[?#]/)[0].replace(/^\//, '');
    this.pageMeta.set({
      title,
      description: (route.data['description'] as Record<Lang, string> | undefined)?.[lang],
      robots: route.data['robots'],
      germanOnly: path.startsWith('backstage'),
      path,
    });
  }
}
