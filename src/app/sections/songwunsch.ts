import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import data from '../data/repertoire.json';
import { I18n, tr } from '../i18n';

// Songwunsch-Formular: Die Seite ist statisch (kein Server) – „Wunsch senden“ öffnet daher eine fertig
// ausgefüllte E-Mail im Mailprogramm. Ist der Song schon im Repertoire, gibt es direkt einen Hinweis.
const MAIL = 'Matthiaswigger@me.com';

const TEXT = tr(
  {
    title: 'Songwunsch',
    intro: 'Euer Lieblingssong fehlt? Schlagt ihn uns vor – wir schauen, ob er zu uns passt.',
    song: 'Song *',
    artist: 'Interpret',
    name: 'Euer Name',
    occasion: 'Anlass oder Termin',
    occasionPlaceholder: 'z. B. Hochzeit am 12.06.',
    message: 'Nachricht',
    known: (title: string, artist: string) => `„${title}“ von ${artist} spielen wir schon – sprecht uns am Abend einfach an!`,
    send: 'Wunsch senden',
    hint: 'Öffnet euer E-Mail-Programm mit dem fertigen Text.',
    mail: {
      hello: 'Hallo Blickfeld Nord,',
      wish: 'ich hätte einen Songwunsch:',
      song: 'Song',
      artist: 'Interpret',
      occasion: 'Anlass/Termin',
      regards: 'Viele Grüße',
      subject: 'Songwunsch',
    },
  },
  {
    title: 'Song request',
    intro: "Your favourite song is missing? Suggest it to us – we'll see if it suits us.",
    song: 'Song *',
    artist: 'Artist',
    name: 'Your name',
    occasion: 'Occasion or date',
    occasionPlaceholder: 'e.g. wedding on 12 June',
    message: 'Message',
    known: (title: string, artist: string) => `We already play “${title}” by ${artist} – just come and ask us on the night!`,
    send: 'Send request',
    hint: 'Opens your e-mail program with the text ready to go.',
    mail: {
      hello: 'Hello Blickfeld Nord,',
      wish: "I'd like to request a song:",
      song: 'Song',
      artist: 'Artist',
      occasion: 'Occasion/date',
      regards: 'Best regards',
      subject: 'Song request',
    },
  },
  {
    title: 'Verzoeknummer',
    intro: 'Mist je favoriete nummer? Stel het ons voor – we kijken of het bij ons past.',
    song: 'Nummer *',
    artist: 'Artiest',
    name: 'Je naam',
    occasion: 'Gelegenheid of datum',
    occasionPlaceholder: 'bijv. bruiloft op 12 juni',
    message: 'Bericht',
    known: (title: string, artist: string) => `„${title}” van ${artist} spelen we al – spreek ons op de avond gewoon aan!`,
    send: 'Verzoek versturen',
    hint: 'Opent je e-mailprogramma met de kant-en-klare tekst.',
    mail: {
      hello: 'Hallo Blickfeld Nord,',
      wish: 'ik heb een verzoeknummer:',
      song: 'Nummer',
      artist: 'Artiest',
      occasion: 'Gelegenheid/datum',
      regards: 'Met vriendelijke groet',
      subject: 'Verzoeknummer',
    },
  },
);

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

@Component({
  selector: 'app-songwunsch',
  imports: [MatIconModule],
  template: `
    <form class="wish" (submit)="send($event)">
      <div class="head">
        <mat-icon>lyrics</mat-icon>
        <div>
          <h3>{{ t().title }}</h3>
          <p>{{ t().intro }}</p>
        </div>
      </div>

      <div class="fields">
        <label>
          <span>{{ t().song }}</span>
          <input name="song" required maxlength="80" autocomplete="off" [value]="song()" (input)="song.set(value($event))" />
        </label>
        <label>
          <span>{{ t().artist }}</span>
          <input name="artist" maxlength="80" autocomplete="off" [value]="artist()" (input)="artist.set(value($event))" />
        </label>
        <label>
          <span>{{ t().name }}</span>
          <input name="name" maxlength="60" autocomplete="name" [value]="name()" (input)="name.set(value($event))" />
        </label>
        <label>
          <span>{{ t().occasion }}</span>
          <input name="occasion" maxlength="80" [placeholder]="t().occasionPlaceholder" [value]="occasion()" (input)="occasion.set(value($event))" />
        </label>
        <label class="wide">
          <span>{{ t().message }}</span>
          <textarea name="message" rows="3" maxlength="500" [value]="message()" (input)="message.set(value($event))"></textarea>
        </label>
      </div>

      @if (known(); as k) {
        <p class="known" aria-live="polite">
          <mat-icon>check_circle</mat-icon> {{ t().known(k.title, k.artist) }}
        </p>
      }

      <div class="actions">
        <button type="submit" class="btn primary" [disabled]="!song().trim()"><mat-icon>send</mat-icon> {{ t().send }}</button>
        <span class="hint">{{ t().hint }}</span>
      </div>
    </form>
  `,
  styles: `
    .wish { margin-top: 32px; padding: 24px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); text-align: left; }
    .head { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 18px; }
    .head mat-icon { color: var(--bn-sunset); margin-top: 2px; }
    h3 { margin: 0 0 4px; font-family: var(--bn-display); font-weight: 400; font-size: 1.1rem; text-transform: uppercase; letter-spacing: .08em; }
    .head p { margin: 0; color: rgba(236, 233, 228, .82); line-height: 1.55; }
    .fields { display: grid; gap: 12px 16px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    label { display: flex; flex-direction: column; gap: 6px; }
    label.wide { grid-column: 1 / -1; }
    label span { font-family: var(--bn-wide); font-size: .68rem; letter-spacing: .14em; text-transform: uppercase; color: var(--bn-fog); }
    input, textarea {
      padding: 10px 12px; border-radius: 8px; border: 1px solid var(--bn-line); background: #15171c;
      color: var(--bn-ink); font: inherit; resize: vertical;
    }
    input:focus, textarea:focus { outline: none; border-color: var(--bn-sunset); }
    .known { display: flex; align-items: center; gap: 8px; margin: 14px 0 0; color: #7fc29b; font-size: .92rem; }
    .known mat-icon { flex: none; }
    .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; margin-top: 18px; }
    .hint { font-size: .8rem; color: var(--bn-fog); }
    .btn {
      display: inline-flex; align-items: center; gap: 10px; padding: 10px 18px; border-radius: 999px; cursor: pointer;
      border: 1px solid var(--bn-sunset); background: var(--bn-sunset); color: #2a1708; font: inherit; font-weight: 500;
    }
    .btn:hover:not(:disabled) { background: #f0b884; }
    .btn:disabled { opacity: .45; cursor: default; }
    .btn mat-icon { width: 20px; height: 20px; font-size: 20px; }
    @media (max-width: 520px) { .wish { padding: 16px; } }
  `,
})
export class Songwunsch {
  protected readonly t = inject(I18n).t(TEXT);
  protected readonly song = signal('');
  protected readonly artist = signal('');
  protected readonly name = signal('');
  protected readonly occasion = signal('');
  protected readonly message = signal('');

  // Schon im Repertoire? Vergleich ohne Groß-/Kleinschreibung, Akzente und Satzzeichen
  protected readonly known = computed(() => {
    const q = norm(this.song());
    return q.length < 3 ? null : (data.tracks.find((t) => norm(t.title).startsWith(q) || q.startsWith(norm(t.title))) ?? null);
  });

  protected value(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  protected send(e: Event): void {
    e.preventDefault();
    const song = this.song().trim();
    if (!song) return;
    const m = this.t().mail;
    const lines = [
      m.hello,
      '',
      m.wish,
      '',
      `${m.song}: ${song}`,
      ...(this.artist().trim() ? [`${m.artist}: ${this.artist().trim()}`] : []),
      ...(this.occasion().trim() ? [`${m.occasion}: ${this.occasion().trim()}`] : []),
      ...(this.message().trim() ? ['', this.message().trim()] : []),
      '',
      m.regards,
      this.name().trim(),
    ];
    const subject = `${m.subject}: ${song}${this.artist().trim() ? ` – ${this.artist().trim()}` : ''}`;
    window.location.href = `mailto:${MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
  }
}
