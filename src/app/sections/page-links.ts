import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { I18n, LocPipe, tr } from '../i18n';

type Page = 'booking' | 'presse' | 'technik';

const PAGES: Record<Page, { link: string; icon: string }> = {
  booking: { link: '/booking', icon: 'celebration' },
  presse: { link: '/presse', icon: 'folder_zip' },
  technik: { link: '/technik', icon: 'speaker' },
};

const TEXT = tr(
  { nav: 'Weitere Infos für Veranstalter', labels: { booking: 'Booking', presse: 'Pressekit', technik: 'Technik' } },
  { nav: 'More information for organisers', labels: { booking: 'Booking', presse: 'Press kit', technik: 'Technical info' } },
  { nav: 'Meer informatie voor organisatoren', labels: { booking: 'Boeken', presse: 'Perskit', technik: 'Techniek' } },
);

// Reihenfolge der Buttons je Seite
const ORDER: Record<Page, Page[]> = {
  booking: ['presse', 'technik'],
  presse: ['technik', 'booking'],
  technik: ['booking', 'presse'],
};

// Querverweise zwischen den Seiten für Veranstalter – jeweils direkt unter dem Einleitungstext.
// Zeigt die beiden anderen Seiten; Downloads stehen auf den Seiten selbst eine Reihe tiefer.
@Component({
  selector: 'app-page-links',
  imports: [RouterLink, LocPipe, MatIconModule],
  template: `
    <nav class="page-links" [attr.aria-label]="t().nav">
      @for (p of others(); track p.link) {
        <a class="btn" [routerLink]="p.link | loc"><mat-icon>{{ p.icon }}</mat-icon> {{ p.label }}</a>
      }
    </nav>
  `,
  styles: `
    .page-links { display: flex; flex-wrap: wrap; gap: 12px; margin: -8px 0 32px; }
    .btn {
      display: inline-flex; align-items: center; gap: 10px; padding: 10px 18px; border-radius: 999px;
      border: 1px solid var(--bn-line); color: var(--bn-ink); text-decoration: none; font-weight: 500;
      transition: border-color .2s, color .2s, background .2s;
    }
    .btn:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .btn mat-icon { width: 20px; height: 20px; font-size: 20px; flex: none; }
  `,
})
export class PageLinks {
  /** Die Seite, auf der die Leiste steht – sie selbst wird nicht verlinkt */
  readonly current = input.required<Page>();
  protected readonly t = inject(I18n).t(TEXT);
  protected readonly others = computed(() => ORDER[this.current()].map((id) => ({ ...PAGES[id], label: this.t().labels[id] })));
}
