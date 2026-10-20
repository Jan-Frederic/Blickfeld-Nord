import { Injectable, Pipe, PipeTransform, computed, inject, signal } from '@angular/core';
import { formatDate } from '@angular/common';
import { ResolveEnd, Router } from '@angular/router';

// Mehrsprachigkeit der öffentlichen Seiten: Deutsch unter /, Englisch unter /en/…, Niederländisch unter /nl/….
// Die Sprache ergibt sich allein aus der Adresse – so entsteht beim Vorrendern je Sprache fertiges HTML.
// Texte stehen als typisierte Wörterbücher direkt in den Komponenten (tr(de, en, nl)): Fehlt in einer Sprache
// ein Eintrag, meldet TypeScript beim Build einen Fehler. Inhalte aus band.service.ts übersetzt
// src/app/data/uebersetzungen.ts. Der Backstage bleibt deutsch.
export type Lang = 'de' | 'en' | 'nl';
export const LANGS: readonly Lang[] = ['de', 'en', 'nl'];
export const LANG_NAMES: Record<Lang, string> = { de: 'Deutsch', en: 'English', nl: 'Nederlands' };
// Angular-Locale je Sprache (registriert in app.config.ts) – für Datums- und Zahlenformate
export const LOCALE_OF: Record<Lang, string> = { de: 'de', en: 'en-GB', nl: 'nl' };

/** Sprache einer Adresse: /en/… → en, /nl/… → nl, sonst de */
export function langOf(url: string): Lang {
  const first = url.split(/[?#]/)[0].split('/')[1];
  return first === 'en' || first === 'nl' ? first : 'de';
}

/** Adresse ohne Sprachpräfix: /en/booking → /booking, /nl → / */
export function stripLang(url: string): string {
  return url.replace(/^\/(en|nl)(?=\/|$|[?#])/, '') || '/';
}

/** Adresse in einer Sprache: ('/booking', 'en') → /en/booking, ('/', 'nl') → /nl */
export function localize(path: string, lang: Lang): string {
  if (lang === 'de' || !path.startsWith('/')) return path;
  return path === '/' ? `/${lang}` : `/${lang}${path}`;
}

/** Wörterbuch in drei Sprachen – Englisch und Niederländisch müssen genau die Form der deutschen Fassung haben */
export function tr<T>(de: T, en: NoInfer<T>, nl: NoInfer<T>): Record<Lang, T> {
  return { de, en, nl };
}

// Benannte Datumsformate je Sprache; andere Formate werden unverändert verwendet
const DATE_FORMATS: Record<string, Record<Lang, string>> = {
  long: { de: 'd. MMMM yyyy', en: 'd MMMM yyyy', nl: 'd MMMM yyyy' },
  full: { de: 'EEEE, d. MMMM yyyy', en: 'EEEE, d MMMM yyyy', nl: 'EEEE d MMMM yyyy' },
  weekday: { de: 'EEE, dd.MM.yyyy', en: 'EEE dd/MM/yyyy', nl: 'EEE dd-MM-yyyy' },
  short: { de: 'dd.MM.yyyy', en: 'dd/MM/yyyy', nl: 'dd-MM-yyyy' },
  tiny: { de: 'dd.MM.yy', en: 'dd/MM/yy', nl: 'dd-MM-yy' },
  dayMonth: { de: 'd. MMMM', en: 'd MMMM', nl: 'd MMMM' },
  monthYear: { de: 'MMMM yyyy', en: 'MMMM yyyy', nl: 'MMMM yyyy' },
};

@Injectable({ providedIn: 'root' })
export class I18n {
  /** aktuelle Sprache */
  readonly lang = signal<Lang>('de');
  /** aktuelle Seite ohne Sprachpräfix, z. B. /booking */
  readonly path = signal('/');

  /** beim App-Start aufgerufen (app.config.ts) – nicht im Konstruktor, sonst entsteht ein Kreis Router → Titel → I18n */
  listen(router: Router): void {
    // vor dem Aktivieren der neuen Seite umschalten, damit sie gleich in der richtigen Sprache entsteht
    router.events.subscribe((e) => {
      if (e instanceof ResolveEnd) {
        this.lang.set(langOf(e.urlAfterRedirects));
        this.path.set(stripLang(e.urlAfterRedirects.split(/[?#]/)[0]));
      }
    });
  }

  /** Wörterbuch der aktuellen Sprache, z. B. protected readonly t = inject(I18n).t(TEXT) */
  t<T>(dict: Record<Lang, T>) {
    return computed(() => dict[this.lang()]);
  }

  /** Link in der aktuellen Sprache */
  link(path: string): string {
    return localize(path, this.lang());
  }

  /** Datum formatieren – benannte Formate (long, full, weekday, short, tiny, dayMonth, monthYear) passen sich der Sprache an */
  date(value: string | number | Date, format = 'long'): string {
    const lang = this.lang();
    return formatDate(value, DATE_FORMATS[format]?.[lang] ?? format, LOCALE_OF[lang]);
  }

  /** Zahl im Format der aktuellen Sprache */
  number(value: number, digits = 0): string {
    return new Intl.NumberFormat(LOCALE_OF[this.lang()], { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
  }
}

/** Link in der aktuellen Sprache: [routerLink]="'/booking' | loc" oder [routerLink]="['/konzerte', id] | loc" */
@Pipe({ name: 'loc', pure: false })
export class LocPipe implements PipeTransform {
  private readonly i18n = inject(I18n);
  transform<T extends string | readonly unknown[]>(path: T): T {
    if (typeof path === 'string') return this.i18n.link(path) as T;
    const [first, ...rest] = path;
    return (typeof first === 'string' ? [this.i18n.link(first), ...rest] : path) as unknown as T;
  }
}

/** Datum in der aktuellen Sprache: {{ s.date | ldate: 'full' }} */
@Pipe({ name: 'ldate', pure: false })
export class LDatePipe implements PipeTransform {
  private readonly i18n = inject(I18n);
  transform(value: string | number | Date | null | undefined, format = 'long'): string {
    return value == null || value === '' ? '' : this.i18n.date(value, format);
  }
}
