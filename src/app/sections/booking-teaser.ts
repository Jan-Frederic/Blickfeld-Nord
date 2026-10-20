import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { I18n, LocPipe, tr } from '../i18n';

const TEXT = tr(
  {
    kicker: 'Für Veranstalter',
    lead: 'Ihr plant ein Fest, eine private Feier oder einen Abend in eurer Kneipe? Wir bringen PA und Licht mit und spielen 3 bis 4 Stunden Partymusik zum Mitsingen und Tanzen.',
    all: 'Alles zum Booking',
    dates: 'Freie Termine ansehen',
  },
  {
    kicker: 'For organisers',
    lead: 'Planning a festival, a private party or a night at your pub? We bring our own PA and lights and play 3 to 4 hours of party music to sing and dance along to.',
    all: 'All about booking',
    dates: 'See available dates',
  },
  {
    kicker: 'Voor organisatoren',
    lead: 'Organiseren jullie een feest, een privéfeest of een avond in jullie café? Wij nemen geluid en licht mee en spelen 3 tot 4 uur partymuziek om mee te zingen en te dansen.',
    all: 'Alles over boeken',
    dates: 'Vrije data bekijken',
  },
);

// Kurzer Hinweis auf der Startseite – alle Details stehen auf /booking (bzw. /en/booking, /nl/booking)
@Component({
  selector: 'app-booking-teaser',
  imports: [RouterLink, LocPipe, MatIconModule],
  template: `
    <section id="booking" class="section">
      <p class="kicker">{{ t().kicker }}</p>
      <h2>Booking</h2>
      <div class="teaser">
        <p class="lead">{{ t().lead }}</p>
        <div class="actions">
          <a class="btn primary" [routerLink]="'/booking' | loc"><mat-icon>celebration</mat-icon> {{ t().all }}</a>
          <a class="btn" [routerLink]="'/booking' | loc" fragment="verfuegbarkeit"><mat-icon>event</mat-icon> {{ t().dates }}</a>
        </div>
      </div>
    </section>
  `,
  styles: `
    .teaser {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px 32px;
      padding: 24px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72);
    }
    .teaser .lead { margin: 0; flex: 1 1 380px; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; }
    .btn {
      display: inline-flex; align-items: center; gap: 10px; padding: 10px 18px; border-radius: 999px;
      border: 1px solid var(--bn-line); color: var(--bn-ink); text-decoration: none; font-weight: 500;
      transition: border-color .2s, color .2s, background .2s;
    }
    .btn:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .btn.primary { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    .btn.primary:hover { background: #f0b884; color: #2a1708; }
    .btn mat-icon { width: 20px; height: 20px; font-size: 20px; }
  `,
})
export class BookingTeaser {
  protected readonly t = inject(I18n).t(TEXT);
}
