import { Injectable, inject } from '@angular/core';
import { I18n, Lang } from './i18n';
import type { Uebersetzung } from './data/uebersetzungen';

// Übersetzte Inhalte aus band.service.ts und technik.json (Bios, Historie, Bildtexte, Freunde, Geräte …).
// Nachschlagen über den deutschen Originaltext: Ändert sich das Original, gilt die alte Übersetzung nicht mehr
// und die Seite zeigt wieder den deutschen Text – mit Hinweis, bis jemand neu übersetzt.
export type Uebersetzungsstand = 'original' | 'geprueft' | 'ungeprueft' | 'fehlt';

// Die Tabelle (~45 KB) wird nur für englische und niederländische Seiten geladen – deutsche Seiten brauchen sie nicht.
// Die Routen /en und /nl warten darauf (canMatch in app.routes.ts), bevor sie die Seite aufbauen – beim Vorrendern
// wie im Browser. So erscheint nie kurz der deutsche Text.
let BY_GERMAN = new Map<string, Uebersetzung>();
let loading: Promise<boolean> | undefined;

export function loadUebersetzungen(): Promise<boolean> {
  loading ??= import('./data/uebersetzungen').then((m) => {
    BY_GERMAN = new Map(m.UEBERSETZUNGEN.map((u) => [u.de, u]));
    return true;
  });
  return loading;
}

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

/** Alle übersetzbaren Inhaltstexte aus band.service.ts – für den Test und die Übersicht im Backstage */
export function inhaltsTexte(band: {
  members: { role: string; bio: string; tagline?: string; story?: string[]; photo?: { alt: string } }[];
  history: { title: string; text: string[]; images?: { alt: string }[] }[];
  photos: { alt: string; caption?: string }[];
  friends: { description: string }[];
  shows: { private?: boolean; publicName?: string }[];
}): string[] {
  const texts = [
    ...band.members.flatMap((m) => [m.role, m.bio, m.tagline, ...(m.story ?? []), m.photo?.alt]),
    ...band.history.flatMap((h) => [h.title, ...h.text, ...(h.images ?? []).map((i) => i.alt)]),
    ...band.photos.flatMap((p) => [p.alt, p.caption]),
    ...band.friends.map((f) => f.description),
    ...band.shows.filter((s) => s.private).map((s) => s.publicName ?? 'Private Feier'),
  ];
  return [...new Set(texts.filter((t): t is string => !!t))];
}
