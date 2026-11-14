import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { kampagnenLink } from '../data/goatcounter';
import { schrittText } from '../data/werbeplan';
import { Hinweise, Werbung } from '../data/hinweise.service';

// Liste der Benachrichtigungen (Seite /backstage/benachrichtigungen): was heute dran ist – berechnet im Dienst
// data/hinweise.service.ts, der auch die Zahl an der Glocke oben liefert. Werbeplan-Schritte mit Haken und „Text kopieren“.
@Component({
  selector: 'app-heute-faellig',
  imports: [RouterLink, MatIconModule],
  template: `
    @if (h.anzahl()) {
      <ul class="hinweise">
        @if (h.deploy(); as d) {
          <li class="spaet">
            <mat-icon>error</mat-icon>
            <a [href]="d.html_url" target="_blank" rel="noopener">Website-Update gescheitert ({{ seit(d.created_at) }}) – live ist noch der alte Stand. Zum Lauf auf GitHub</a>
          </li>
        }
        @for (t of h.termine(); track t.label) {
          <li>
            <mat-icon>{{ t.icon }}</mat-icon>
            <a [routerLink]="t.link" [queryParams]="t.query">{{ t.label }}</a>
          </li>
        }
        @for (w of h.werbung(); track w.id + w.schritt) {
          <li [class.spaet]="w.tage > 0">
            <input type="checkbox" [id]="'heute-' + w.id + w.schritt" (change)="h.haken(w)" [attr.aria-label]="'Erledigt: ' + w.titel" />
            <label [for]="'heute-' + w.id + w.schritt">
              <a [routerLink]="['/backstage', w.id]">{{ w.show.venue }}</a>: {{ w.titel }}@if (w.tage > 0) { <span class="hinweis"> · seit {{ w.tage === 1 ? 'gestern' : w.tage + ' Tagen' }} fällig</span> }
            </label>
            <button type="button" (click)="kopieren(w)" [attr.aria-label]="'Text für „' + w.titel + '“ kopieren'">
              <mat-icon>{{ kopiert() === w.id + w.schritt ? 'check' : 'content_copy' }}</mat-icon>
            </button>
          </li>
        }
      </ul>
    } @else {
      <p class="leer"><mat-icon>notifications_none</mat-icon> Heute ist nichts fällig.</p>
    }
  `,
  styles: `
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    li { display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 8px 14px; border: 1px solid var(--bn-line); border-radius: 12px; font-size: .95rem; }
    li.spaet { border-color: #e0b25a; }
    li > mat-icon { font-size: 22px; width: 22px; height: 22px; color: var(--bn-sunset); }
    label { flex: 1; min-width: 0; cursor: pointer; }
    input { accent-color: var(--bn-sunset); margin: 0 4px; }
    a { color: var(--bn-ink); }
    a:hover { color: var(--bn-sunset); }
    .hinweis { color: #e0b25a; font-size: .82rem; }
    button { display: grid; place-items: center; flex: none; width: 34px; height: 34px; border: 1px solid var(--bn-line); border-radius: 50%; background: none; color: var(--bn-ink); cursor: pointer; }
    button:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    button mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .leer { display: flex; align-items: center; gap: 10px; padding: 16px; border: 1px dashed var(--bn-line); border-radius: 12px; color: var(--bn-fog); }
  `,
})
export class HeuteFaellig {
  protected readonly h = inject(Hinweise);
  protected readonly kopiert = signal<string | null>(null);

  constructor() {
    this.h.start();
    this.h.neu();
  }

  protected seit(iso: string): string {
    const std = Math.round((Date.now() - Date.parse(iso)) / 36e5);
    return std < 1 ? 'gerade eben' : std < 24 ? `vor ${std} Std.` : `vor ${Math.round(std / 24)} Tagen`;
  }

  protected async kopieren(w: Werbung): Promise<void> {
    const text = schrittText(w.schritt, w.show, kampagnenLink(w.id, 'text'));
    try {
      await navigator.clipboard.writeText(text);
      this.kopiert.set(w.id + w.schritt);
      setTimeout(() => this.kopiert.set(null), 2000);
    } catch {
      window.prompt('Text kopieren:', text);
    }
  }
}
