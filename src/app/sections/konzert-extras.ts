import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import data from '../data/repertoire.json';
import { BandService, Show } from '../data/band.service';
import { Content } from '../content';
import { I18n, LDatePipe, LocPipe, tr } from '../i18n';

// Konzertseite, unten: Songwunsch für genau diesen Abend (vor dem Konzert) und weitere anstehende Konzerte –
// am selben Ort zuerst. Kein Server: der Wunsch öffnet eine fertig ausgefüllte E-Mail wie im Songwunsch-Formular.
const MAIL = 'Matthiaswigger@me.com';

const TEXT = tr(
  {
    wish: 'Euer Wunschsong für diesen Abend',
    wishIntro: 'Sagt uns vorher, was ihr hören wollt – wir planen die Setlist mit euren Wünschen.',
    song: 'Song aus unserem Repertoire',
    name: 'Euer Name (optional)',
    send: 'Wunsch senden',
    hint: 'Öffnet euer E-Mail-Programm mit dem fertigen Text.',
    subject: (when: string, venue: string) => `Songwunsch für ${when} – ${venue}`,
    body: (song: string, when: string, venue: string, name: string) => `Hallo Blickfeld Nord,\n\nfür euren Auftritt am ${when} (${venue}) wünsche ich mir:\n${song}\n\nViele Grüße\n${name}`,
    next: 'Weitere Konzerte',
    same: 'auch hier',
  },
  {
    wish: 'Your song request for this night',
    wishIntro: 'Tell us in advance what you want to hear – we plan the setlist with your requests.',
    song: 'Song from our repertoire',
    name: 'Your name (optional)',
    send: 'Send request',
    hint: 'Opens your e-mail program with the text ready to go.',
    subject: (when: string, venue: string) => `Song request for ${when} – ${venue}`,
    body: (song: string, when: string, venue: string, name: string) => `Hello Blickfeld Nord,\n\nfor your show on ${when} (${venue}) I'd love to hear:\n${song}\n\nBest regards\n${name}`,
    next: 'More shows',
    same: 'same place',
  },
  {
    wish: 'Jullie verzoeknummer voor deze avond',
    wishIntro: 'Laat ons van tevoren weten wat jullie willen horen – we plannen de setlist met jullie wensen.',
    song: 'Nummer uit ons repertoire',
    name: 'Je naam (optioneel)',
    send: 'Verzoek versturen',
    hint: 'Opent je e-mailprogramma met de tekst al ingevuld.',
    subject: (when: string, venue: string) => `Verzoeknummer voor ${when} – ${venue}`,
    body: (song: string, when: string, venue: string, name: string) => `Hallo Blickfeld Nord,\n\nvoor jullie optreden op ${when} (${venue}) zou ik graag horen:\n${song}\n\nGroeten\n${name}`,
    next: 'Meer optredens',
    same: 'ook hier',
  },
);

@Component({
  selector: 'app-konzert-extras',
  imports: [RouterLink, MatIconModule, LDatePipe, LocPipe],
  template: `
    @if (!past()) {
      <section class="box" aria-labelledby="wish-title">
        <h3 id="wish-title"><mat-icon>music_note</mat-icon> {{ t().wish }}</h3>
        <p>{{ t().wishIntro }}</p>
        <div class="row">
          <label>{{ t().song }}
            <input list="wish-songs" [value]="song()" (input)="song.set($any($event.target).value)" maxlength="120" />
          </label>
          <datalist id="wish-songs">@for (s of songs; track s) { <option [value]="s"></option> }</datalist>
          <label>{{ t().name }}<input [value]="name()" (input)="name.set($any($event.target).value)" maxlength="60" /></label>
          <a class="btn primary" [class.off]="!song().trim()" [attr.aria-disabled]="!song().trim()" [href]="mailto()"><mat-icon>send</mat-icon> {{ t().send }}</a>
        </div>
        <p class="hint">{{ t().hint }}</p>
      </section>
    }
    @if (weitere().length) {
      <section class="box" aria-labelledby="next-title">
        <h3 id="next-title"><mat-icon>event</mat-icon> {{ t().next }}</h3>
        <ul>
          @for (w of weitere(); track w.id) {
            <li>
              <a [routerLink]="('/konzerte/' + w.id) | loc">{{ w.show.date | ldate: 'short' }} · {{ w.show.venue }}@if (w.show.city) {, {{ w.show.city }}}</a>
              @if (w.same) { <span class="tag">{{ t().same }}</span> }
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    .box { margin-top: 40px; padding: 24px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; font-family: var(--bn-display); font-weight: 400; font-size: 1.05rem; text-transform: uppercase; letter-spacing: .06em; }
    h3 mat-icon { color: var(--bn-sunset); }
    p { margin: 0 0 14px; color: rgba(236, 233, 228, .86); line-height: 1.6; }
    .row { display: grid; grid-template-columns: 2fr 1fr auto; gap: 12px; align-items: end; }
    label { display: grid; gap: 6px; font-size: .82rem; color: var(--bn-fog); }
    input { padding: 9px 12px; border-radius: 8px; border: 1px solid var(--bn-line); background: #1b1e22; color: var(--bn-ink); font: inherit; font-size: .95rem; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 999px; text-decoration: none; font-weight: 500; white-space: nowrap; }
    .btn.primary { background: var(--bn-sunset); color: #2a1708; }
    .btn.off { opacity: .45; pointer-events: none; }
    .btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .hint { margin: 10px 0 0; font-size: .8rem; color: var(--bn-fog); }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    li a { color: var(--bn-ink); text-decoration: none; } li a:hover { color: var(--bn-sunset); }
    .tag { margin-left: 8px; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--bn-sunset); color: var(--bn-sunset); font-size: .72rem; }
    @media (max-width: 640px) { .row { grid-template-columns: 1fr; } }
  `,
})
export class KonzertExtras {
  readonly show = input.required<Show>();
  readonly past = input(false);
  private readonly band = inject(BandService);
  private readonly content = inject(Content);
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t(TEXT);
  protected readonly songs = data.tracks.map((s) => `${s.title} – ${s.artist}`);
  protected readonly song = signal('');
  protected readonly name = signal('');

  protected readonly mailto = computed(() => {
    const s = this.show();
    const when = new Date(`${s.date}T12:00:00`).toLocaleDateString(this.i18n.lang() === 'de' ? 'de-DE' : this.i18n.lang() === 'nl' ? 'nl-NL' : 'en-GB');
    const venue = this.content.t(this.band.publicVenue(s));
    const t = this.t();
    return `mailto:${MAIL}?subject=${encodeURIComponent(t.subject(when, venue))}&body=${encodeURIComponent(t.body(this.song().trim(), when, venue, this.name().trim()))}`;
  });

  // bis zu drei anstehende öffentliche Konzerte, am selben Ort zuerst
  protected readonly weitere = computed(() => {
    const s = this.show();
    const heute = new Date().toISOString().slice(0, 10);
    return this.band.publicShows
      .filter((x) => x !== s && (x.endDate ?? x.date) >= heute)
      .map((x) => ({ show: x, id: this.band.showId(x), same: !!s.city && x.city === s.city }))
      .sort((a, b) => Number(b.same) - Number(a.same) || a.show.date.localeCompare(b.show.date))
      .slice(0, 3);
  });
}
