import { Injectable, inject } from '@angular/core';
import { I18n, Lang } from './i18n';
import { UEBERSETZUNGEN } from './data/uebersetzungen';

// Übersetzte Inhalte aus band.service.ts und technik.json (Bios, Historie, Bildtexte, Freunde, Geräte …).
// Nachschlagen über den deutschen Originaltext: Ändert sich das Original, gilt die alte Übersetzung nicht mehr
// und die Seite zeigt wieder den deutschen Text – mit Hinweis, bis jemand neu übersetzt.
export type Uebersetzungsstand = 'original' | 'geprueft' | 'ungeprueft' | 'fehlt';

const BY_GERMAN = new Map(UEBERSETZUNGEN.map((u) => [u.de, u]));

@Injectable({ providedIn: 'root' })
export class Content {
  private readonly i18n = inject(I18n);

  /** Text in der aktuellen Sprache – ohne Übersetzung das deutsche Original */
  t(de: string): string;
  t(de: string | undefined): string | undefined;
  t(de: string | undefined): string | undefined {
    if (de === undefined) return undefined;
    const lang = this.i18n.lang();
    return lang === 'de' ? de : (BY_GERMAN.get(de)?.[lang] ?? de);
  }

  /** Sprache, in der ein Text tatsächlich angezeigt wird (für das lang-Attribut) */
  langOf(de: string): Lang {
    const lang = this.i18n.lang();
    return lang === 'de' || BY_GERMAN.has(de) ? lang : 'de';
  }

  /** Stand mehrerer zusammengehöriger Texte (z. B. ein Historie-Eintrag) – für den Hinweis unter dem Text */
  status(...texts: (string | undefined)[]): Uebersetzungsstand {
    const lang = this.i18n.lang();
    if (lang === 'de') return 'original';
    const entries = texts.filter((t): t is string => !!t).map((t) => BY_GERMAN.get(t));
    if (entries.some((e) => !e)) return 'fehlt';
    return entries.every((e) => e!.geprueft?.[lang]) ? 'geprueft' : 'ungeprueft';
  }
}
