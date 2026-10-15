import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const SITE_URL = 'https://blickfeld-nord.de';
export const DEFAULT_DESCRIPTION =
  'Blickfeld Nord – Partyband mit drei Stimmen und jeder Menge Stimmung. Live-Musik für Feste, Märkte und Events.';

export interface PageMeta {
  title: string;
  description?: string;
  /** Pfad ohne führenden Schrägstrich, z. B. 'presse' */
  path: string;
  /** z. B. 'noindex' für Seiten, die nicht in Suchmaschinen sollen */
  robots?: string;
}

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

    this.title.setTitle(page.title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:title', content: page.title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ name: 'twitter:title', content: page.title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    if (page.robots) {
      this.meta.updateTag({ name: 'robots', content: page.robots });
    } else {
      this.meta.removeTag('name="robots"');
    }
    this.document.querySelector('link[rel="canonical"]')?.setAttribute('href', url);
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
      path: snapshot.url.split(/[?#]/)[0].replace(/^\//, ''),
    });
  }
}
