import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Repertoire } from '../sections/repertoire';
import { Songwunsch } from '../sections/songwunsch';

// Eigene Unterseite /repertoire: wie wir live spielen + durchsuchbare Songliste aus der Spotify-Playlist
@Component({
  selector: 'app-repertoire-page',
  imports: [RouterLink, MatIconModule, Repertoire, Songwunsch],
  template: `
    <section class="section">
      <p class="kicker">Was wir spielen</p>
      <h2>Repertoire</h2>
      <p class="lead">
        Von Pop und Rock über Schlager bis Dance und Disco: Unsere Songs laden zum Mitsingen, Tanzen und Feiern ein.
        Doch die Setlist ist bei uns nur der Anfang – denn live spielen wir nichts einfach nach.
      </p>

      <div class="live">
        <h3>Live klingt's bei uns anders</h3>
        <p>
          Wir schmücken unsere Auftritte musikalisch aus: mit knackigen Fill-Ins, Jam-Sessions, spontanen Aktionen
          und kreativen Überlegungen. Wir hören aufeinander, schauen ins Publikum und lassen uns vom Abend tragen –
          so wird aus einem bekannten Song jedes Mal ein kleines bisschen etwas Neues.
        </p>

        <ul class="cards">
          <li>
            <mat-icon>graphic_eq</mat-icon>
            <h4>Knackige Fill-Ins</h4>
            <p>Ein Trommelwirbel hier, ein Basslauf da: Kleine Fills, die Übergänge zünden lassen und jedem Song ordentlich Schwung geben.</p>
          </li>
          <li>
            <mat-icon>all_inclusive</mat-icon>
            <h4>Jam-Sessions</h4>
            <p>Wenn die Stimmung stimmt, lassen wir es laufen – der Groove wird länger, das Solo größer, und ein Song geht wie von selbst in den nächsten über.</p>
          </li>
          <li>
            <mat-icon>bolt</mat-icon>
            <h4>Spontane Aktionen</h4>
            <p>Ein Ständchen fürs Geburtstagskind, ein Refrain, den der ganze Saal übernimmt, oder ein Gast, der kurzerhand mit einsteigt: Wir spielen mit dem Moment.</p>
          </li>
          <li>
            <mat-icon>lightbulb</mat-icon>
            <h4>Kreative Überlegungen</h4>
            <p>Eigene Arrangements, überraschende Wendungen und bekannte Hits im neuen Gewand – mal ruhiger, mal schneller, immer mit unserer Handschrift.</p>
          </li>
        </ul>

        <p class="claim">Kein Auftritt gleicht dem anderen.</p>
        <p class="sub">Darum lohnt es sich, öfter vorbeizukommen – und darum wird jede Feier mit uns zu eurer ganz eigenen.</p>
      </div>

      <app-repertoire />

      <app-songwunsch />

      <div class="cta">
        <p>Viele Wünsche erfüllen wir gern, manche sogar spontan am Abend.</p>
        <div class="buttons">
          <a class="btn primary" routerLink="/booking"><mat-icon>event_available</mat-icon> Booking & Anfrage</a>
          <a class="btn" href="https://open.spotify.com/playlist/6O7apXN53rSGaWGhP8S8TW" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="9.5" />
              <path d="M7 9.3c3.6-1 7.4-.7 10.4.9M7.6 12.6c2.9-.8 5.9-.5 8.4.8M8.2 15.7c2.2-.6 4.4-.4 6.3.6" />
            </svg>
            Playlist auf Spotify
          </a>
        </div>
      </div>
    </section>
  `,
  styles: `
    .live { padding: 28px 24px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    h3 {
      font-family: var(--bn-display); font-weight: 400; font-size: 1.1rem; text-transform: uppercase;
      letter-spacing: .08em; margin: 0 0 12px;
    }
    .live > p { margin: 0; max-width: 760px; line-height: 1.7; color: rgba(236, 233, 228, .86); }
    .cards { list-style: none; padding: 0; margin: 24px 0; display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
    .cards li { padding: 18px; border-radius: 10px; border: 1px solid var(--bn-line); }
    .cards mat-icon { color: var(--bn-sunset); }
    h4 { margin: 10px 0 6px; font-family: var(--bn-wide); font-weight: 400; font-size: .8rem; text-transform: uppercase; letter-spacing: .14em; }
    .cards p { margin: 0; font-size: .92rem; line-height: 1.6; color: rgba(236, 233, 228, .8); }
    .claim { margin: 8px 0 4px !important; font-family: var(--bn-display); font-size: 1.35rem; color: var(--bn-sunset) !important; text-align: center; }
    .sub { text-align: center; margin: 0 auto !important; font-size: .95rem; color: var(--bn-fog) !important; }
    .cta { margin-top: 32px; text-align: center; }
    .cta p { color: rgba(236, 233, 228, .86); line-height: 1.6; }
    .buttons { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
    .btn {
      display: inline-flex; align-items: center; gap: 10px; padding: 10px 18px; border-radius: 999px;
      border: 1px solid var(--bn-line); color: var(--bn-ink); text-decoration: none; font-weight: 500;
      transition: border-color .2s, color .2s, background .2s;
    }
    .btn:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .btn.primary { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    .btn.primary:hover { background: #f0b884; color: #2a1708; }
    .btn svg, .btn mat-icon { width: 20px; height: 20px; font-size: 20px; flex: none; }
    @media (max-width: 520px) { .live { padding: 18px 16px; } .claim { font-size: 1.1rem; } }
  `,
})
export class RepertoirePage {}
