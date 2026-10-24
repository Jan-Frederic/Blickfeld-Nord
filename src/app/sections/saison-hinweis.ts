import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { I18n, LocPipe, tr } from '../i18n';

// Saison-Hinweis auf der Startseite: im Herbst für Weihnachtsfeiern (Dezember), im Frühjahr für Sommerfeste und
// Hochzeiten (Mai–September). Erscheint nur, solange in diesem Zeitraum noch mindestens zwei Freitage/Samstage
// frei sind (ohne Auftritt, Anfrage oder Abwesenheit) – und führt direkt zu den freien Tagen im Booking.
const TEXT = tr(
  {
    winter: { title: 'Weihnachtsfeier geplant?', text: 'Für Dezember sind noch Termine frei – mit Live-Musik wird die Feier ein Abend, über den man noch lange spricht.' },
    sommer: { title: 'Sommerfest, Stadtfest oder Hochzeit?', text: 'Zwischen Mai und September sind noch Termine frei – sichert euch euren Termin.' },
    cta: 'Freie Tage ansehen',
  },
  {
    winter: { title: 'Planning a Christmas party?', text: 'There are still free dates in December – live music turns your party into a night people talk about for ages.' },
    sommer: { title: 'Summer party, town festival or wedding?', text: 'There are still free dates between May and September – secure your date.' },
    cta: 'See free dates',
  },
  {
    winter: { title: 'Kerstfeest gepland?', text: 'In december zijn er nog data vrij – met livemuziek wordt jullie feest een avond om nog lang over na te praten.' },
    sommer: { title: 'Zomerfeest, stadsfeest of bruiloft?', text: 'Tussen mei en september zijn er nog data vrij – leg jullie datum vast.' },
    cta: 'Vrije data bekijken',
  },
);

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

@Component({
  selector: 'app-saison-hinweis',
  imports: [RouterLink, MatIconModule, LocPipe],
  template: `
    @if (saison(); as s) {
      <aside class="section saison">
        <div class="box">
          @if (s === 'winter') { <mat-icon aria-hidden="true">celebration</mat-icon> } @else { <mat-icon aria-hidden="true">wb_sunny</mat-icon> }
          <div>
            <p class="title">{{ t()[s].title }}</p>
            <p>{{ t()[s].text }}</p>
          </div>
          <a class="btn" [routerLink]="'/booking' | loc" fragment="verfuegbarkeit"><mat-icon>event_available</mat-icon> {{ t().cta }}</a>
        </div>
      </aside>
    }
  `,
  styles: `
    .saison { padding-top: 0; padding-bottom: 0; }
    .box {
      display: flex; align-items: center; gap: 18px; flex-wrap: wrap; padding: 20px 24px; border-radius: 14px;
      border: 1px solid rgba(232, 164, 106, .45); background: linear-gradient(120deg, rgba(232, 164, 106, .12), rgba(27, 30, 34, .72) 60%);
    }
    .box > mat-icon { font-size: 34px; width: 34px; height: 34px; color: var(--bn-sunset); }
    .box > div { flex: 1 1 280px; }
    .title { margin: 0 0 4px; font-family: var(--bn-display); text-transform: uppercase; letter-spacing: .06em; font-size: 1rem; }
    p { margin: 0; line-height: 1.6; color: rgba(236, 233, 228, .88); }
    .btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 999px; white-space: nowrap;
      background: var(--bn-sunset); color: #2a1708; text-decoration: none; font-weight: 600;
    }
    .btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `,
})
export class SaisonHinweis {
  private readonly band = inject(BandService);
  protected readonly t = inject(I18n).t(TEXT);

  protected readonly saison = computed<'winter' | 'sommer' | null>(() => {
    const heute = new Date();
    const m = heute.getMonth();
    const j = heute.getFullYear();
    const fenster = m >= 8 && m <= 10 ? { s: 'winter' as const, von: new Date(j, 11, 1), bis: new Date(j, 11, 23) }
      : m <= 3 ? { s: 'sommer' as const, von: new Date(j, 4, 1), bis: new Date(j, 8, 30) } : null;
    if (!fenster) return null;
    const belegt = new Set<string>();
    for (const a of this.band.abwesenheiten)
      for (let d = new Date(`${a.von}T12:00:00`); d <= new Date(`${a.bis ?? a.von}T12:00:00`); d.setDate(d.getDate() + 1)) belegt.add(iso(d));
    for (const s of this.band.shows)
      for (let d = new Date(`${s.date}T12:00:00`); d <= new Date(`${s.endDate ?? s.date}T12:00:00`); d.setDate(d.getDate() + 1)) belegt.add(iso(d));
    let frei = 0;
    for (const d = new Date(fenster.von); d <= fenster.bis; d.setDate(d.getDate() + 1))
      if ((d.getDay() === 5 || d.getDay() === 6) && !belegt.has(iso(d))) frei++;
    return frei >= 2 ? fenster.s : null;
  });
}
