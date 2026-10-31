import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { I18n, LDatePipe, LocPipe, tr } from '../i18n';

// Pressekit: anstehende öffentliche Konzerte – je Konzert eine Unterseite (/presse/<id>) mit Plakat, Story, Texten
// und Songliste für den Veranstalter. „Anstehend“ hängt vom Besuchstag ab – daher im Browser neu aufgebaut.
const TEXT = tr(
  { titel: 'Anstehende Konzerte', info: 'Für Veranstalter: je Auftritt Plakat, Story, fertige Texte und unsere Songliste.', mehr: 'Pressekit zum Auftritt' },
  { titel: 'Upcoming shows', info: 'For organisers: poster, story, ready-made texts and our song list for each show.', mehr: 'Press kit for this show' },
  { titel: 'Komende optredens', info: "Voor organisatoren: per optreden affiche, story, kant-en-klare teksten en onze nummerlijst.", mehr: 'Perskit voor dit optreden' },
);

@Component({
  selector: 'app-presse-termine',
  host: { ngSkipHydration: 'true' },
  imports: [RouterLink, MatIconModule, LDatePipe, LocPipe],
  template: `
    @if (kommend().length) {
      <h3>{{ t().titel }}</h3>
      <p class="presse-termine-info">{{ t().info }}</p>
      <ul class="presse-termine">
        @for (k of kommend(); track k.id) {
          <li>
            <a [routerLink]="('/presse/' + k.id) | loc" [attr.aria-label]="t().mehr + ': ' + k.show.venue">
              <span class="datum">{{ k.show.date | ldate: 'mediumDate' }}@if (k.show.time) { · {{ k.show.time }} }</span>
              <span class="ort">{{ k.show.venue }}@if (k.show.city) { <span class="stadt">, {{ k.show.city }}</span> }</span>
              <mat-icon aria-hidden="true">chevron_right</mat-icon>
            </a>
          </li>
        }
      </ul>
    }
  `,
})
export class PresseTermine {
  private readonly band = inject(BandService);
  protected readonly t = inject(I18n).t(TEXT);
  private readonly heute = new Date().toISOString().slice(0, 10);
  protected readonly kommend = computed(() =>
    this.band.publicShows.filter((s) => (s.endDate ?? s.date) >= this.heute).map((show) => ({ show, id: this.band.showId(show) })),
  );
}
