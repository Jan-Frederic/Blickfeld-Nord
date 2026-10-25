import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService, Show } from '../data/band.service';
import { kampagnenLink } from '../data/goatcounter';
import { erledigteSchritte, schrittText, setzeSchritt, werbeplan, werbeplanAktiv } from '../data/werbeplan';

// Backstage-Übersicht, ganz oben: was heute dran ist – Auftritt und Probe von heute sowie fällige, noch nicht
// abgehakte Schritte aus dem Werbeplan (mit Haken und „Text kopieren“). Ohne Einträge unsichtbar.
interface Werbung {
  show: Show;
  id: string;
  schritt: string;
  titel: string;
  /** seit so vielen Tagen fällig (0 = heute) */
  tage: number;
}

@Component({
  selector: 'app-heute-faellig',
  imports: [RouterLink, MatIconModule],
  template: `
    @if (termine().length || werbung().length) {
      <section class="heute" aria-labelledby="heute-titel">
        <h3 id="heute-titel"><mat-icon>today</mat-icon> Heute fällig</h3>
        <ul>
          @for (t of termine(); track t.label) {
            <li>
              <mat-icon>{{ t.icon }}</mat-icon>
              <a [routerLink]="t.link">{{ t.label }}</a>
            </li>
          }
          @for (w of werbung(); track w.id + w.schritt) {
            <li [class.spaet]="w.tage > 0">
              <input type="checkbox" [id]="'heute-' + w.id + w.schritt" (change)="haken(w)" [attr.aria-label]="'Erledigt: ' + w.titel" />
              <label [for]="'heute-' + w.id + w.schritt">
                <a [routerLink]="['/backstage', w.id]">{{ w.show.venue }}</a>: {{ w.titel }}@if (w.tage > 0) { <span class="hinweis"> · seit {{ w.tage === 1 ? 'gestern' : w.tage + ' Tagen' }} fällig</span> }
              </label>
              <button type="button" (click)="kopieren(w)" [attr.aria-label]="'Text für „' + w.titel + '“ kopieren'">
                <mat-icon>{{ kopiert() === w.id + w.schritt ? 'check' : 'content_copy' }}</mat-icon>
              </button>
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    .heute { margin: 24px 0 0; padding: 14px 18px; border-radius: 12px; border: 1px solid var(--bn-sunset); background: rgba(232, 164, 106, .08); }
    h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; font: 400 .85rem var(--bn-wide); text-transform: uppercase; letter-spacing: .14em; }
    h3 mat-icon { color: var(--bn-sunset); }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
    li { display: flex; align-items: center; gap: 10px; min-height: 36px; font-size: .92rem; }
    li > mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--bn-fog); }
    label { flex: 1; min-width: 0; cursor: pointer; }
    input { accent-color: var(--bn-sunset); margin: 0 4px; }
    a { color: var(--bn-ink); }
    a:hover { color: var(--bn-sunset); }
    .hinweis { color: #e0b25a; font-size: .82rem; }
    button { display: grid; place-items: center; flex: none; width: 34px; height: 34px; border: 1px solid var(--bn-line); border-radius: 50%; background: none; color: var(--bn-ink); cursor: pointer; }
    button:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    button mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `,
})
export class HeuteFaellig {
  private readonly band = inject(BandService);
  private readonly heute = new Date().toISOString().slice(0, 10);
  private readonly stand = signal(0); // nach dem Abhaken neu berechnen
  protected readonly kopiert = signal<string | null>(null);

  protected readonly termine = computed(() => [
    ...this.band.shows
      .filter((s) => s.date <= this.heute && (s.endDate ?? s.date) >= this.heute)
      .map((s) => ({ icon: 'celebration', label: `Auftritt: ${s.venue}${s.time ? ' · ' + s.time + ' Uhr' : ''}`, link: ['/backstage', this.band.showId(s)] })),
    ...this.band.rehearsals
      .filter((r) => r.date === this.heute)
      .map((r) => ({ icon: 'music_note', label: `Probe${r.time ? ' · ' + r.time + ' Uhr' : ''}${r.place ? ', ' + r.place : ''}`, link: ['/backstage/probe', r.date] })),
  ]);

  protected readonly werbung = computed<Werbung[]>(() => {
    this.stand();
    return this.band.shows
      .filter((s) => s.confirmed && !s.private && werbeplanAktiv(s.date, this.heute, s.endDate))
      .flatMap((show) => {
        const id = this.band.showId(show);
        const jetzt = werbeplan(show.date, this.heute, show.endDate).find((x) => x.status === 'jetzt');
        if (!jetzt || erledigteSchritte(id).includes(jetzt.schritt.id)) return [];
        // Rückblick schon geschrieben → erledigt
        if (jetzt.schritt.id === 'rueckblick' && this.band.history.some((h) => h.date === show.date && !h.example)) return [];
        const tage = Math.round((Date.parse(this.heute) - Date.parse(jetzt.datum)) / 864e5);
        return [{ show, id, schritt: jetzt.schritt.id, titel: jetzt.schritt.titel, tage }];
      });
  });

  protected haken(w: Werbung): void {
    setzeSchritt(w.id, w.schritt, true);
    this.stand.update((n) => n + 1);
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
