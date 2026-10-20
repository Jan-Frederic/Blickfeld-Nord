import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import data from '../data/repertoire.json';
import { I18n, tr } from '../i18n';

// Live-Wunschbox (/wunsch): Gäste scannen am Abend den QR-Code auf der Bühne, suchen einen Song aus unserem
// Repertoire aus und schicken den Wunsch – per Instagram-Nachricht (Text wird kopiert) oder per E-Mail.
// Kein Server, keine Anmeldung; erreichbar über das Wunschbox-Schild (scripts/build-qr-karte.py).
const MAIL = 'Matthiaswigger@me.com';
const INSTAGRAM_DM = 'https://ig.me/m/blickfeldnord';
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

type Track = { title: string; artist: string };

const TEXT = tr(
  {
    title: 'Euer Song?',
    lead: 'Sucht euch einen Song aus unserem Repertoire aus – wir schauen, wann er am besten in den Abend passt.',
    placeholder: 'Song oder Interpret …',
    search: 'Song suchen',
    none: 'Nichts gefunden – ruft uns euren Wunsch einfach zwischen zwei Songs zu!',
    change: 'ändern',
    name: 'Euer Name (optional)',
    note: 'Gruß oder Anlass (optional)',
    notePlaceholder: 'z. B. für Anna zum 30.!',
    instagram: 'Per Instagram senden',
    mail: 'Per E-Mail',
    ok: 'Wunsch kopiert – in der Instagram-Nachricht einfach einfügen und abschicken. Danke!',
    hint: 'Bei Instagram wird euer Wunsch kopiert – im Chat dann nur noch einfügen.',
    request: 'Songwunsch',
    greeting: 'Gruß',
    from: 'von',
  },
  {
    title: 'Your song?',
    lead: "Pick a song from our repertoire – we'll see when it fits into the evening best.",
    placeholder: 'Song or artist …',
    search: 'Search songs',
    none: "Nothing found – just shout your request to us between two songs!",
    change: 'change',
    name: 'Your name (optional)',
    note: 'Greeting or occasion (optional)',
    notePlaceholder: "e.g. for Anna's 30th!",
    instagram: 'Send via Instagram',
    mail: 'By e-mail',
    ok: 'Request copied – just paste it into the Instagram message and send. Thanks!',
    hint: "With Instagram, your request is copied – you then just paste it into the chat.",
    request: 'Song request',
    greeting: 'Greeting',
    from: 'from',
  },
  {
    title: 'Jouw nummer?',
    lead: 'Kies een nummer uit ons repertoire – wij kijken wanneer het het beste in de avond past.',
    placeholder: 'Nummer of artiest …',
    search: 'Nummer zoeken',
    none: 'Niets gevonden – roep je verzoek gewoon tussen twee nummers naar ons!',
    change: 'wijzigen',
    name: 'Je naam (optioneel)',
    note: 'Groet of gelegenheid (optioneel)',
    notePlaceholder: 'bijv. voor Anna, 30 jaar!',
    instagram: 'Via Instagram sturen',
    mail: 'Per e-mail',
    ok: 'Verzoek gekopieerd – plak het gewoon in het Instagram-bericht en verstuur het. Bedankt!',
    hint: 'Bij Instagram wordt je verzoek gekopieerd – in de chat hoef je het alleen nog te plakken.',
    request: 'Verzoeknummer',
    greeting: 'Groet',
    from: 'van',
  },
);

@Component({
  selector: 'app-wunsch',
  imports: [MatIconModule],
  template: `
    <section class="section wunsch">
      <p class="kicker">Live-Wunschbox</p>
      <h2>{{ t().title }}</h2>

      @if (!chosen()) {
        <p class="lead">{{ t().lead }}</p>
        <label class="search">
          <mat-icon aria-hidden="true">search</mat-icon>
          <input type="search" [value]="query()" (input)="query.set($any($event.target).value)" [placeholder]="t().placeholder" [attr.aria-label]="t().search" />
        </label>
        <ul class="songs">
          @for (s of list(); track s.title + s.artist) {
            <li><button type="button" (click)="chosen.set(s)"><strong>{{ s.title }}</strong><span>{{ s.artist }}</span></button></li>
          } @empty {
            <li class="none">{{ t().none }}</li>
          }
        </ul>
      } @else {
        @if (chosen(); as c) {
          <div class="chosen">
            <mat-icon>music_note</mat-icon>
            <div><strong>{{ c.title }}</strong><span>{{ c.artist }}</span></div>
            <button type="button" class="change" (click)="chosen.set(null); sent.set(false)">{{ t().change }}</button>
          </div>
          <label class="field">{{ t().name }}<input [value]="name()" (input)="name.set($any($event.target).value)" maxlength="40" autocomplete="given-name" /></label>
          <label class="field">{{ t().note }}<input [value]="note()" (input)="note.set($any($event.target).value)" maxlength="100" [placeholder]="t().notePlaceholder" /></label>

          <div class="send">
            <a class="btn primary" [href]="instagram" target="_blank" rel="noopener" (click)="copy()"><mat-icon>chat</mat-icon> {{ t().instagram }}</a>
            <a class="btn" [href]="mailto()"><mat-icon>mail</mat-icon> {{ t().mail }}</a>
          </div>
          @if (sent()) {
            <p class="ok" role="status"><mat-icon>check_circle</mat-icon> {{ t().ok }}</p>
          } @else {
            <p class="hint">{{ t().hint }}</p>
          }
        }
      }
    </section>
  `,
  styles: `
    .wunsch { max-width: 640px; }
    .search { display: flex; align-items: center; gap: 8px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--bn-line); background: #1b1e22; }
    .search:focus-within { border-color: var(--bn-sunset); }
    .search input { flex: 1; min-width: 0; padding: 14px 0; border: 0; background: transparent; color: var(--bn-ink); font: 400 1.05rem Inter, sans-serif; outline: none; }
    .songs { list-style: none; margin: 16px 0 0; padding: 0; }
    .songs li { border-bottom: 1px solid var(--bn-line); }
    .songs button {
      display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; padding: 14px 4px; border: 0;
      background: transparent; color: var(--bn-ink); font: inherit; text-align: left; cursor: pointer;
    }
    .songs button:hover strong, .songs button:focus-visible strong { color: var(--bn-sunset); }
    .songs strong { font-size: 1.05rem; font-weight: 600; }
    .songs span, .chosen span { color: var(--bn-fog); font-size: .9rem; }
    .none { padding: 16px 4px; color: var(--bn-fog); }
    .chosen { display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: 12px; border: 1px solid var(--bn-sunset); background: rgba(232, 164, 106, .08); margin-bottom: 20px; }
    .chosen mat-icon { color: var(--bn-sunset); }
    .chosen div { flex: 1; display: flex; flex-direction: column; }
    .chosen strong { font-size: 1.15rem; }
    .change { border: 0; background: none; color: var(--bn-sunset); text-decoration: underline; cursor: pointer; font: inherit; }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; font-size: .85rem; color: var(--bn-fog); }
    .field input { padding: 12px; border-radius: 8px; border: 1px solid var(--bn-line); background: transparent; color: var(--bn-ink); font: 400 1rem Inter, sans-serif; }
    .field input:focus { outline: none; border-color: var(--bn-sunset); }
    .send { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
    .btn {
      display: inline-flex; align-items: center; gap: 10px; padding: 12px 20px; border-radius: 999px;
      border: 1px solid var(--bn-line); color: var(--bn-ink); text-decoration: none; font-weight: 500;
    }
    .btn.primary { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    .ok, .hint { display: flex; align-items: flex-start; gap: 8px; margin: 14px 0 0; font-size: .9rem; color: var(--bn-fog); }
    .ok { color: #5fb88a; }
  `,
})
export class WunschPage {
  protected readonly t = inject(I18n).t(TEXT);
  protected readonly query = signal('');
  protected readonly chosen = signal<Track | null>(null);
  protected readonly name = signal('');
  protected readonly note = signal('');
  protected readonly sent = signal(false);
  protected readonly instagram = INSTAGRAM_DM;

  protected readonly list = computed(() => {
    const q = norm(this.query().trim());
    const tracks = data.tracks as Track[];
    return q ? tracks.filter((t) => norm(`${t.title} ${t.artist}`).includes(q)) : tracks;
  });

  protected readonly text = computed(() => {
    const c = this.chosen();
    if (!c) return '';
    const t = this.t();
    return [
      `${t.request}: „${c.title}“ (${c.artist})`,
      this.note().trim() ? `${t.greeting}: ${this.note().trim()}` : '',
      this.name().trim() ? `${t.from} ${this.name().trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  });

  protected readonly mailto = computed(
    () => `mailto:${MAIL}?subject=${encodeURIComponent(this.t().request + ': ' + (this.chosen()?.title ?? ''))}&body=${encodeURIComponent(this.text())}`,
  );

  protected copy(): void {
    navigator.clipboard?.writeText(this.text()).then(() => this.sent.set(true)).catch(() => undefined);
  }
}
