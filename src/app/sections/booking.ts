import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Availability } from './availability';
import { Repertoire } from './repertoire';

// Booking-Infos für Veranstalter. Kontakt läuft über Meta (Instagram/Facebook-Nachrichten) oder E-Mail.
const BOOKING_MAIL = 'Matthiaswigger@me.com';
const MAIL_SUBJECT = 'Booking-Anfrage Blickfeld Nord';
const MAIL_BODY = `Hallo Blickfeld Nord,

wir möchten euch gerne buchen:

Datum:
Ort / Location:
Anlass (Fest, private Feier, Kneipe …):
Ungefähre Gästezahl:
Gewünschte Spielzeit (3–4 Stunden):
Ansprechpartner & Telefon:

Viele Grüße
`;

// Häufige Fragen von Veranstaltern (Angaben auch im Technik-Rider: scripts/build-rider.py)
const FAQ: { q: string; a: string }[] = [
  { q: 'Wie weit fahrt ihr?', a: 'Wir spielen im Umkreis von bis zu 50 km rund um Hamminkeln.' },
  { q: 'Wie viel Platz braucht ihr?', a: 'Eine Fläche von etwa 4 × 3 Metern.' },
  { q: 'Wie viel Strom braucht ihr?', a: 'Zwei Steckdosen in der Nähe der Spielfläche. PA und Licht bringen wir selbst mit.' },
  { q: 'Wie früh sollte man buchen?', a: 'Am besten mindestens 4 Wochen im Voraus – je früher, desto besser die Chancen auf euren Wunschtermin.' },
  { q: 'Wie lange dauern Auf- und Abbau?', a: 'Für den Aufbau brauchen wir rund 3 Stunden, für den Abbau etwa 1 Stunde. Plant bitte ein, dass wir entsprechend früher vor Ort sind.' },
  { q: 'Wie läuft der Abend ab?', a: 'Wir spielen 3 bis 4 Stunden in Sets à 1 Stunde. Pausen legen wir nach Absprache oder spontan ein – ganz wie es zur Stimmung passt.' },
];

@Component({
  selector: 'app-booking',
  imports: [RouterLink, MatIconModule, Availability, Repertoire],
  template: `
    <section class="section">
      <p class="kicker">Für Veranstalter</p>
      <h2>Booking</h2>
      <p class="lead">
        Ihr plant ein Fest, eine private Feier oder einen Abend in eurer Kneipe und sucht eine Band, die für Stimmung
        sorgt? Dann seid ihr bei uns richtig – wir bringen alles mit, ihr bringt die Gäste.
      </p>

      <ul class="facts">
        <li>
          <mat-icon>celebration</mat-icon>
          <span class="label">Anlässe</span>
          <span class="value">Feste, private Feiern und Kneipen</span>
        </li>
        <li>
          <mat-icon>schedule</mat-icon>
          <span class="label">Spielzeit</span>
          <span class="value">3 bis 4 Stunden – in Sets à 1 Stunde</span>
        </li>
        <li>
          <mat-icon>local_cafe</mat-icon>
          <span class="label">Pausen</span>
          <span class="value">Nach Absprache oder spontan, ganz wie es zur Stimmung passt</span>
        </li>
        <li>
          <mat-icon>speaker</mat-icon>
          <span class="label">Technik</span>
          <span class="value">Eigene PA und Licht bringen wir mit</span>
        </li>
      </ul>

      <div class="blocks">
        <div class="block">
          <h3>Repertoire</h3>
          <p>Was wir spielen, hört ihr am besten selbst: Unsere Songliste gibt's als Playlist auf Spotify.</p>
          <a class="btn primary" href="https://open.spotify.com/playlist/6O7apXN53rSGaWGhP8S8TW" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="9.5" />
              <path d="M7 9.3c3.6-1 7.4-.7 10.4.9M7.6 12.6c2.9-.8 5.9-.5 8.4.8M8.2 15.7c2.2-.6 4.4-.4 6.3.6" />
            </svg>
            Repertoire auf Spotify
          </a>
        </div>

        <div class="block">
          <h3>Anfragen</h3>
          <p>Schreibt uns, wie es euch am liebsten ist – wir melden uns schnellstmöglich zurück.</p>
          <div class="contacts">
            <a class="btn primary" [href]="mailto">
              <mat-icon>mail</mat-icon> Anfrage per E-Mail
            </a>
            <a class="btn" href="https://ig.me/m/blickfeldnord" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
                <circle cx="12" cy="12" r="4.3" />
                <circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" stroke="none" />
              </svg>
              Nachricht über Instagram
            </a>
            <a class="btn" href="https://www.facebook.com/share/1BBobZWfjG/" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <circle cx="12" cy="12" r="9.5" />
                <path d="M13.2 21.4V10.2c0-1.8 1-2.8 2.8-2.8h1.2" />
                <path d="M10 13h6.2" />
              </svg>
              Nachricht über Facebook
            </a>
          </div>
          <p class="mail">oder direkt an <a [href]="mailto">{{ mail }}</a></p>
          <p class="mail">Logos, Fotos und Infos für eure Ankündigung: <a routerLink="/presse">Pressekit</a></p>
        </div>
      </div>

      <app-repertoire />

      <!-- im Browser neu berechnet: welcher Monat und welche Tage vergangen sind, hängt vom Besuchstag ab -->
      <div id="verfuegbarkeit" class="anchor"><app-availability ngSkipHydration (pick)="request($event)" /></div>

      <div class="faq">
        <div class="faq-head">
          <h3>Häufige Fragen</h3>
          <a class="btn" href="presse/blickfeld-nord-technik-rider.pdf" download>
            <mat-icon>description</mat-icon> Technik-Rider (PDF)
          </a>
        </div>
        @for (f of faq; track f.q) {
          <details>
            <summary>{{ f.q }}</summary>
            <p>{{ f.a }}</p>
          </details>
        }
      </div>
    </section>
  `,
  styles: `
    .facts {
      list-style: none; padding: 0; margin: 0 0 32px;
      display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    }
    .facts li {
      display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto 1fr; column-gap: 14px; row-gap: 4px;
      align-items: start; align-content: start;
      padding: 18px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72);
    }
    .facts mat-icon { grid-row: span 2; color: var(--bn-sunset); margin-top: 2px; }
    .label {
      font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .16em; font-size: .7rem; color: var(--bn-fog);
    }
    .value { line-height: 1.5; }
    .blocks { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
    .block { padding: 24px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    h3 {
      font-family: var(--bn-display); font-weight: 400; font-size: 1.1rem; text-transform: uppercase;
      letter-spacing: .08em; margin: 0 0 10px;
    }
    .block p { line-height: 1.65; color: rgba(236, 233, 228, .84); margin: 0 0 16px; }
    .contacts { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
    .btn {
      display: inline-flex; align-items: center; gap: 10px; padding: 10px 18px; border-radius: 999px;
      border: 1px solid var(--bn-line); color: var(--bn-ink); text-decoration: none; font-weight: 500;
      transition: border-color .2s, color .2s, background .2s;
    }
    .btn:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .btn.primary { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    .btn.primary:hover { background: #f0b884; color: #2a1708; }
    .btn svg, .btn mat-icon { width: 20px; height: 20px; font-size: 20px; flex: none; }
    .anchor { scroll-margin-top: 72px; }
    .faq { margin-top: 32px; }
    .faq-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
    .faq-head h3 { margin: 0; }
    details { border-top: 1px solid var(--bn-line); }
    details:last-child { border-bottom: 1px solid var(--bn-line); }
    summary {
      cursor: pointer; list-style: none; padding: 16px 32px 16px 0; position: relative; font-weight: 500;
    }
    summary::-webkit-details-marker { display: none; }
    summary::after {
      content: '+'; position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
      color: var(--bn-sunset); font-size: 1.4rem; font-weight: 300; transition: transform .2s;
    }
    details[open] summary::after { transform: translateY(-50%) rotate(45deg); }
    summary:hover { color: var(--bn-sunset); }
    details p { margin: 0 0 16px; line-height: 1.65; color: rgba(236, 233, 228, .84); }
    .mail { margin: 14px 0 0 !important; font-size: .9rem; }
    .mail a { color: var(--bn-sunset); }
  `,
})
export class Booking {
  // Klick auf einen freien Tag im Kalender: E-Mail-Vorlage mit vorausgefülltem Datum
  protected request(isoDate: string): void {
    const [y, m, d] = isoDate.split('-');
    const body = MAIL_BODY.replace('Datum:', `Datum: ${d}.${m}.${y}`);
    window.location.href = `mailto:${BOOKING_MAIL}?subject=${encodeURIComponent(MAIL_SUBJECT)}&body=${encodeURIComponent(body)}`;
  }

  protected readonly faq = FAQ;
  protected readonly mail = BOOKING_MAIL;
  protected readonly mailto =
    `mailto:${BOOKING_MAIL}?subject=${encodeURIComponent(MAIL_SUBJECT)}&body=${encodeURIComponent(MAIL_BODY)}`;
}
