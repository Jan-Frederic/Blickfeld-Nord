import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

// Englische Kurzfassung der Booking-Seite (/booking/en) – z. B. für Veranstalter aus den Niederlanden.
// Angaben bitte gleich halten mit src/app/sections/booking.ts und der Technik-Seite.
const MAIL = 'Matthiaswigger@me.com';
const BODY = `Hello Blickfeld Nord,

we would like to book you:

Date:
Venue / location:
Occasion (festival, private party, pub …):
Approx. number of guests:
Contact person & phone:

Best regards
`;

@Component({
  selector: 'app-booking-en',
  imports: [RouterLink, MatIconModule],
  template: `
    <section class="section" lang="en">
      <p class="kicker">For organisers</p>
      <h2>Booking</h2>
      <p class="lead">
        Planning a festival, a private party or a night at your pub and looking for a band that gets everyone singing
        and dancing? Blickfeld Nord is a three-piece party and cover band from Hamminkeln on the Lower Rhine, Germany –
        just a short drive from the Dutch border. We bring the sound and the lights, you bring the guests.
      </p>
      <p class="lang"><a routerLink="/booking" lang="de"><mat-icon>translate</mat-icon> Deutsche Version mit Kalender und FAQ</a></p>

      <ul class="facts">
        @for (f of facts; track f.label) {
          <li>
            <mat-icon>{{ f.icon }}</mat-icon>
            <span class="label">{{ f.label }}</span>
            <span class="value">{{ f.value }}</span>
          </li>
        }
      </ul>

      <h3>Music</h3>
      <p class="text">
        Pop, rock, German Schlager, dance and disco – sing-along classics in English and German, played live with
        fills, jams and spontaneous ideas, so no two shows are the same. Have a look at our
        <a routerLink="/repertoire">song list</a> (in German, but the song titles speak for themselves).
      </p>

      <h3>Get in touch</h3>
      <p class="text">Send us your date and location – we will get back to you as soon as possible.</p>
      <div class="contacts">
        <a class="btn primary" [href]="mailto"><mat-icon>mail</mat-icon> Booking request by e-mail</a>
        <a class="btn" href="https://ig.me/m/blickfeldnord" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
            <circle cx="12" cy="12" r="4.3" />
            <circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" stroke="none" />
          </svg>
          Message on Instagram
        </a>
        <a class="btn" href="presse/blickfeld-nord-technik-rider.pdf" download><mat-icon>description</mat-icon> Tech rider (PDF, German)</a>
      </div>
      <p class="mail">or directly to <a [href]="mailto">{{ mail }}</a></p>
    </section>
  `,
  styles: `
    .lang { margin: -12px 0 28px; }
    .lang a { display: inline-flex; align-items: center; gap: 6px; color: var(--bn-fog); font-size: .9rem; text-decoration: none; }
    .lang a:hover { color: var(--bn-sunset); }
    .lang mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .facts { list-style: none; padding: 0; margin: 0 0 8px; display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
    .facts li {
      display: grid; grid-template-columns: auto 1fr; column-gap: 12px; align-items: center;
      padding: 16px 18px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72);
    }
    .facts mat-icon { grid-row: span 2; color: var(--bn-sunset); }
    .label { font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .14em; font-size: .68rem; color: var(--bn-fog); }
    .value { line-height: 1.5; }
    h3 { font-family: var(--bn-display); font-weight: 400; font-size: 1.1rem; text-transform: uppercase; letter-spacing: .08em; margin: 36px 0 10px; }
    .text { max-width: 760px; line-height: 1.7; color: rgba(236, 233, 228, .86); margin: 0 0 16px; }
    .text a, .mail a { color: var(--bn-sunset); }
    .contacts { display: flex; flex-wrap: wrap; gap: 12px; }
    .btn {
      display: inline-flex; align-items: center; gap: 10px; padding: 10px 18px; border-radius: 999px;
      border: 1px solid var(--bn-line); color: var(--bn-ink); text-decoration: none; font-weight: 500;
    }
    .btn:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .btn.primary { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    .btn.primary:hover { background: #f0b884; color: #2a1708; }
    .btn svg, .btn mat-icon { width: 20px; height: 20px; font-size: 20px; flex: none; }
    .mail { margin: 16px 0 0; color: var(--bn-fog); font-size: .9rem; }
  `,
})
export class BookingEn {
  protected readonly mail = MAIL;
  protected readonly mailto = `mailto:${MAIL}?subject=${encodeURIComponent('Booking request Blickfeld Nord')}&body=${encodeURIComponent(BODY)}`;
  protected readonly facts = [
    { icon: 'celebration', label: 'Occasions', value: 'Festivals, private parties and pubs' },
    { icon: 'schedule', label: 'Playing time', value: '3 to 4 hours, in sets of 1 hour – breaks as agreed' },
    { icon: 'speaker', label: 'Equipment', value: 'We bring our own PA and lights' },
    { icon: 'straighten', label: 'Space & power', value: 'Approx. 4 × 3 m stage area, 2 power sockets nearby' },
    { icon: 'build', label: 'Set-up', value: 'Approx. 3 hours before the show, tear-down approx. 1 hour' },
    { icon: 'place', label: 'Travel', value: 'Up to 50 km around Hamminkeln – including the Dutch border region' },
    { icon: 'event_available', label: 'Lead time', value: 'Please book at least 4 weeks in advance' },
  ];
}
