import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Repertoire } from '../sections/repertoire';
import { Songwunsch } from '../sections/songwunsch';
import { I18n, LocPipe, tr } from '../i18n';

const TEXT = tr(
  {
    kicker: 'Was wir spielen',
    lead: 'Von Pop und Rock über Schlager bis Dance und Disco: Unsere Songs laden zum Mitsingen, Tanzen und Feiern ein. Doch die Setlist ist bei uns nur der Anfang – denn live spielen wir nichts einfach nach.',
    liveTitle: "Live klingt's bei uns anders",
    liveText: 'Wir schmücken unsere Auftritte musikalisch aus: mit knackigen Fill-Ins, Jam-Sessions, spontanen Aktionen und kreativen Überlegungen. Wir hören aufeinander, schauen ins Publikum und lassen uns vom Abend tragen – so wird aus einem bekannten Song jedes Mal ein kleines bisschen etwas Neues.',
    cards: [
      { icon: 'graphic_eq', title: 'Knackige Fill-Ins', text: 'Ein Trommelwirbel hier, ein Basslauf da: Kleine Fills, die Übergänge zünden lassen und jedem Song ordentlich Schwung geben.' },
      { icon: 'all_inclusive', title: 'Jam-Sessions', text: 'Wenn die Stimmung stimmt, lassen wir es laufen – der Groove wird länger, das Solo größer, und ein Song geht wie von selbst in den nächsten über.' },
      { icon: 'bolt', title: 'Spontane Aktionen', text: 'Ein Ständchen fürs Geburtstagskind, ein Refrain, den der ganze Saal übernimmt, oder ein Gast, der kurzerhand mit einsteigt: Wir spielen mit dem Moment.' },
      { icon: 'lightbulb', title: 'Kreative Überlegungen', text: 'Eigene Arrangements, überraschende Wendungen und bekannte Hits im neuen Gewand – mal ruhiger, mal schneller, immer mit unserer Handschrift.' },
    ],
    claim: 'Kein Auftritt gleicht dem anderen.',
    sub: 'Darum lohnt es sich, öfter vorbeizukommen – und darum wird jede Feier mit uns zu eurer ganz eigenen.',
    cta: 'Viele Wünsche erfüllen wir gern, manche sogar spontan am Abend.',
    booking: 'Booking & Anfrage',
    spotify: 'Playlist auf Spotify',
  },
  {
    kicker: 'What we play',
    lead: 'From pop and rock to German Schlager, dance and disco: our songs get people singing, dancing and celebrating. But for us the setlist is just the beginning – because live, we never simply copy a song.',
    liveTitle: 'Live, we sound different',
    liveText: 'We dress up our shows musically: with punchy fills, jam sessions, spontaneous moments and creative ideas. We listen to each other, watch the crowd and let the evening carry us – so a well-known song turns into something a little bit new every time.',
    cards: [
      { icon: 'graphic_eq', title: 'Punchy fills', text: 'A drum roll here, a bass run there: little fills that make the transitions spark and give every song a proper lift.' },
      { icon: 'all_inclusive', title: 'Jam sessions', text: 'When the vibe is right, we let it flow – the groove gets longer, the solo bigger, and one song slides into the next as if by itself.' },
      { icon: 'bolt', title: 'Spontaneous moments', text: 'A serenade for the birthday boy or girl, a chorus the whole room takes over, or a guest who simply joins in: we play with the moment.' },
      { icon: 'lightbulb', title: 'Creative ideas', text: 'Our own arrangements, surprising twists and well-known hits in a new guise – sometimes calmer, sometimes faster, always with our own signature.' },
    ],
    claim: 'No two shows are the same.',
    sub: "That's why it's worth coming back more often – and why every party with us becomes truly your own.",
    cta: "We're happy to fulfil lots of requests, some even spontaneously on the night.",
    booking: 'Booking & enquiries',
    spotify: 'Playlist on Spotify',
  },
  {
    kicker: 'Wat we spelen',
    lead: 'Van pop en rock tot schlagers, dance en disco: onze nummers nodigen uit om mee te zingen, te dansen en te feesten. Maar de setlist is bij ons pas het begin – want live spelen we niets zomaar na.',
    liveTitle: 'Live klinkt het bij ons anders',
    liveText: 'We kleden onze optredens muzikaal aan: met pittige fills, jamsessies, spontane acties en creatieve ideeën. We luisteren naar elkaar, kijken naar het publiek en laten ons door de avond meevoeren – zo wordt een bekend nummer elke keer weer een beetje iets nieuws.',
    cards: [
      { icon: 'graphic_eq', title: 'Pittige fills', text: 'Een roffel hier, een baslijntje daar: kleine fills die de overgangen laten vonken en elk nummer flink vaart geven.' },
      { icon: 'all_inclusive', title: 'Jamsessies', text: 'Als de sfeer goed is, laten we het lopen – de groove wordt langer, de solo groter, en het ene nummer gaat als vanzelf over in het volgende.' },
      { icon: 'bolt', title: 'Spontane acties', text: 'Een serenade voor de jarige, een refrein dat de hele zaal overneemt, of een gast die zomaar meedoet: we spelen met het moment.' },
      { icon: 'lightbulb', title: 'Creatieve ideeën', text: 'Eigen arrangementen, verrassende wendingen en bekende hits in een nieuw jasje – soms rustiger, soms sneller, altijd met ons eigen handschrift.' },
    ],
    claim: 'Geen optreden is hetzelfde.',
    sub: 'Daarom loont het om vaker langs te komen – en daarom wordt elk feest met ons echt het jouwe.',
    cta: 'Veel verzoeken vervullen we graag, sommige zelfs spontaan op de avond.',
    booking: 'Boeken & aanvraag',
    spotify: 'Playlist op Spotify',
  },
);

// Eigene Unterseite /repertoire: wie wir live spielen + durchsuchbare Songliste aus der Spotify-Playlist
@Component({
  selector: 'app-repertoire-page',
  imports: [RouterLink, MatIconModule, Repertoire, Songwunsch, LocPipe],
  template: `
    <section class="section">
      <p class="kicker">{{ t().kicker }}</p>
      <h2>Repertoire</h2>
      <p class="lead">{{ t().lead }}</p>

      <div class="live">
        <h3>{{ t().liveTitle }}</h3>
        <p>{{ t().liveText }}</p>

        <ul class="cards">
          @for (c of t().cards; track c.icon) {
            <li>
              <mat-icon>{{ c.icon }}</mat-icon>
              <h4>{{ c.title }}</h4>
              <p>{{ c.text }}</p>
            </li>
          }
        </ul>

        <p class="claim">{{ t().claim }}</p>
        <p class="sub">{{ t().sub }}</p>
      </div>

      <app-repertoire />

      <app-songwunsch />

      <div class="cta">
        <p>{{ t().cta }}</p>
        <div class="buttons">
          <a class="btn primary" [routerLink]="'/booking' | loc"><mat-icon>event_available</mat-icon> {{ t().booking }}</a>
          <a class="btn" href="https://open.spotify.com/playlist/6O7apXN53rSGaWGhP8S8TW" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="9.5" />
              <path d="M7 9.3c3.6-1 7.4-.7 10.4.9M7.6 12.6c2.9-.8 5.9-.5 8.4.8M8.2 15.7c2.2-.6 4.4-.4 6.3.6" />
            </svg>
            {{ t().spotify }}
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
export class RepertoirePage {
  protected readonly t = inject(I18n).t(TEXT);
}
