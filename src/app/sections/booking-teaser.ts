import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

// Kurzer Hinweis auf der Startseite – alle Details stehen auf /booking
@Component({
  selector: 'app-booking-teaser',
  imports: [RouterLink, MatIconModule],
  template: `
    <section id="booking" class="section">
      <p class="kicker">Für Veranstalter</p>
      <h2>Booking</h2>
      <div class="teaser">
        <p class="lead">
          Ihr plant ein Fest, eine private Feier oder einen Abend in eurer Kneipe? Wir bringen PA und Licht mit und
          spielen 3 bis 4 Stunden Partymusik zum Mitsingen und Tanzen.
        </p>
        <div class="actions">
          <a class="btn primary" routerLink="/booking"><mat-icon>celebration</mat-icon> Alles zum Booking</a>
          <a class="btn" routerLink="/booking" fragment="verfuegbarkeit"><mat-icon>event</mat-icon> Freie Termine ansehen</a>
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
export class BookingTeaser {}
