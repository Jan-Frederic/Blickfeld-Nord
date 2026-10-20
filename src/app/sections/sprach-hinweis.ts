import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { I18n, Lang, browserLanguage, localize, rememberLanguage, rememberedLanguage } from '../i18n';

// Texte in der Zielsprache – wer die Seite in der falschen Sprache vor sich hat, soll den Hinweis lesen können
const TEXT: Record<Lang, { text: string; go: string; close: string }> = {
  de: { text: 'Diese Website gibt es auch auf Deutsch.', go: 'Auf Deutsch lesen', close: 'Hinweis schließen' },
  en: { text: 'This website is also available in English.', go: 'Read in English', close: 'Close' },
  nl: { text: 'Deze website is ook in het Nederlands beschikbaar.', go: 'Lees in het Nederlands', close: 'Sluiten' },
};

// Einmaliger Hinweis, wenn der Browser eine andere unserer Sprachen bevorzugt als die aufgerufene Seite.
// Bewusst keine automatische Umleitung (verwirrt Besucher und Suchmaschinen). Wer eine Sprache wählt oder den
// Hinweis schließt, sieht ihn nicht wieder. Nur im Browser, nie im vorgerenderten HTML.
@Component({
  selector: 'app-sprach-hinweis',
  imports: [RouterLink, MatIconModule],
  template: `
    @if (suggestion(); as s) {
      <aside class="hint" [attr.lang]="s.lang" [attr.aria-label]="s.text.text">
        <mat-icon aria-hidden="true">translate</mat-icon>
        <span>{{ s.text.text }}</span>
        <a [routerLink]="s.link" [attr.hreflang]="s.lang" (click)="choose(s.lang)">{{ s.text.go }}</a>
        <button type="button" class="close" (click)="choose(i18n.lang())" [attr.aria-label]="s.text.close"><mat-icon>close</mat-icon></button>
      </aside>
    }
  `,
  styles: `
    .hint {
      position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 20;
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap; max-width: calc(100vw - 32px); box-sizing: border-box;
      padding: 10px 40px 10px 16px; border-radius: 12px; border: 1px solid var(--bn-line);
      background: #1b1e22; box-shadow: 0 8px 24px rgba(0, 0, 0, .45); font-size: .92rem;
    }
    mat-icon { color: var(--bn-sunset); }
    a {
      padding: 6px 14px; border-radius: 999px; background: var(--bn-sunset); color: #2a1708;
      text-decoration: none; font-weight: 500; white-space: nowrap;
    }
    span { flex: 1 1 200px; }
    .close { position: absolute; top: 6px; right: 6px; display: inline-flex; padding: 4px; border: 0; background: none; color: var(--bn-fog); cursor: pointer; }
    .close mat-icon { color: inherit; }
  `,
})
export class SprachHinweis {
  protected readonly i18n = inject(I18n);
  private readonly preferred = signal<Lang | null>(null);

  protected readonly suggestion = computed(() => {
    const lang = this.preferred();
    if (!lang || lang === this.i18n.lang() || this.i18n.path().startsWith('/backstage')) return null;
    return { lang, text: TEXT[lang], link: localize(this.i18n.path(), lang) };
  });

  constructor() {
    afterNextRender(() => {
      if (!rememberedLanguage()) this.preferred.set(browserLanguage(navigator.languages ?? [navigator.language]));
    });
  }

  protected choose(lang: Lang): void {
    rememberLanguage(lang);
    this.preferred.set(null);
  }
}
