import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';

// „Neuer Termin“ im Backstage: Formular → fertige Zeile für src/app/data/band.service.ts.
// Die Seite hat keinen Server – die Zeile wird kopiert und auf GitHub im Browser eingefügt; nach dem Speichern
// prüfen die automatischen Tests den Eintrag und die Seite geht von selbst online (Anleitung: PFLEGE.md).
const EDIT_URL = 'https://github.com/Jan-Frederic/Blickfeld-Nord/edit/main/src/app/data/band.service.ts';

const q = (s: string) => `'${s.trim().replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

@Component({
  selector: 'app-termin-formular',
  imports: [MatIconModule],
  template: `
    <details class="neu" [open]="open()" (toggle)="open.set($any($event.target).open)">
      <summary><mat-icon>add_circle</mat-icon> Neuen Termin eintragen</summary>

      <div class="art" role="radiogroup" aria-label="Art des Termins">
        <button type="button" [class.on]="art() === 'auftritt'" (click)="art.set('auftritt')"><mat-icon>celebration</mat-icon> Auftritt</button>
        <button type="button" [class.on]="art() === 'probe'" (click)="probe()"><mat-icon>music_note</mat-icon> Probe</button>
        <button type="button" [class.on]="art() === 'abwesenheit'" (click)="art.set('abwesenheit')"><mat-icon>event_busy</mat-icon> Abwesenheit</button>
      </div>

      <div class="grid">
        <label>{{ art() === 'abwesenheit' ? 'von *' : 'Datum *' }}<input type="date" [value]="f().date" (input)="set('date', $event)" /></label>
        @if (art() === 'abwesenheit') {
          <label>bis (leer = ein Tag)<input type="date" [value]="f().endDate" (input)="set('endDate', $event)" /></label>
          <label>Wer *
            <select (change)="set('wer', $event)">
              <option value="" [selected]="!f().wer">bitte wählen</option>
              @for (n of namen; track n) { <option [value]="n" [selected]="f().wer === n">{{ n }}</option> }
            </select>
          </label>
          <label>Stichwort<input [value]="f().grund" (input)="set('grund', $event)" placeholder="z. B. Urlaub (öffentlich im Repo – keine Details)" maxlength="40" /></label>
        }
        @if (art() === 'auftritt') {
          <label>bis (bei mehreren Tagen)<input type="date" [value]="f().endDate" (input)="set('endDate', $event)" /></label>
        }
        @if (art() !== 'abwesenheit') {
          <label>Beginn<input type="time" [value]="f().time" (input)="set('time', $event)" /></label>
        }
        @if (art() === 'abwesenheit') {
        } @else if (art() === 'probe') {
          <label>Ende<input type="time" [value]="f().endTime" (input)="set('endTime', $event)" /></label>
          <label class="wide">Ort<input [value]="f().place" (input)="set('place', $event)" placeholder="z. B. Dingden" maxlength="80" /></label>
          <label class="wide">Notiz<input [value]="f().note" (input)="set('note', $event)" placeholder="z. B. neue Songs fürs Weihnachtsset" maxlength="120" /></label>
        } @else {
          <label>Location *<input [value]="f().venue" (input)="set('venue', $event)" placeholder="z. B. Gasthof Küpper" maxlength="80" /></label>
          <label>Ort<input [value]="f().city" (input)="set('city', $event)" placeholder="z. B. Hamminkeln-Dingden" maxlength="60" /></label>
          <label>Veranstalter<input [value]="f().organizer" (input)="set('organizer', $event)" maxlength="80" /></label>
          <label>Eintritt
            <select (change)="set('price', $event)">
              <option value="" [selected]="!f().price">noch offen / keine Angabe</option>
              <option value="0" [selected]="f().price === '0'">frei</option>
              <option value="pay" [selected]="f().price === 'pay'">Betrag …</option>
            </select>
          </label>
          @if (f().price === 'pay') {
            <label>Betrag in €<input type="number" min="1" max="200" [value]="f().amount" (input)="set('amount', $event)" /></label>
          }
          <label class="check"><input type="checkbox" [checked]="f().private" (change)="toggle('private', $event)" /> privat (nicht öffentlich gelistet)</label>
          <label class="check"><input type="checkbox" [checked]="f().confirmed" (change)="toggle('confirmed', $event)" /> geklärt (fest zugesagt)</label>
          @if (f().private) {
            <label class="wide">Öffentlicher Name nach dem Auftritt<input [value]="f().publicName" (input)="set('publicName', $event)" placeholder="leer = „Private Feier“ (keine Namen von Privatleuten!)" maxlength="80" /></label>
          }
          <label class="wide">Kommentar (nur Backstage)<input [value]="f().comment" (input)="set('comment', $event)" maxlength="200" /></label>
        }
      </div>

      @if (problem(); as p) {
        <p class="problem"><mat-icon>info</mat-icon> {{ p }}</p>
      } @else {
        <p class="label">Fertige Zeile – unter <code>{{ liste() }}</code> einfügen:</p>
        @if (art() === 'abwesenheit') {
          @if (kollision().length) {
            <p class="problem"><mat-icon>warning</mat-icon> In diesem Zeitraum steht schon: {{ kollision().join(', ') }}</p>
          }
        } @else if (taken(); as t) {
          <p class="problem"><mat-icon>warning</mat-icon> An diesem Tag steht schon: {{ t }} – Doppelung?</p>
        }
        @if (abwesend(); as a) {
          <p class="problem"><mat-icon>warning</mat-icon> An diesem Tag nicht da: {{ a }}</p>
        }
        <pre class="code">{{ line() }}</pre>
        <div class="actions">
          <button type="button" class="primary" (click)="copy()"><mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon> {{ copied() ? 'Kopiert!' : 'Zeile kopieren' }}</button>
          <a class="btn" [href]="editUrl" target="_blank" rel="noopener"><mat-icon>edit</mat-icon> Datei auf GitHub öffnen</a>
          <a class="btn" href="https://github.com/Jan-Frederic/Blickfeld-Nord/blob/main/PFLEGE.md" target="_blank" rel="noopener"><mat-icon>help</mat-icon> Anleitung</a>
        </div>
        <p class="hint">Auf GitHub mit Strg+F nach „{{ liste() }}“ suchen, Zeile darunter einfügen, unten „Commit changes“ – nach wenigen Minuten ist der Termin online.</p>
      }
    </details>
  `,
  styles: `
    .neu { margin-top: 32px; padding: 0 20px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    .neu[open] { padding-bottom: 20px; }
    summary { display: flex; align-items: center; gap: 8px; padding: 16px 0; cursor: pointer; font-weight: 500; list-style: none; }
    summary::-webkit-details-marker { display: none; }
    summary mat-icon { color: var(--bn-sunset); }
    .art { display: flex; gap: 8px; margin-bottom: 16px; }
    .art button, .actions button, .btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; cursor: pointer;
      border: 1px solid var(--bn-line); background: transparent; color: var(--bn-ink); font: inherit; font-size: .88rem; text-decoration: none;
    }
    .art button.on, .actions .primary { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
    summary mat-icon { font-size: 22px; width: 22px; height: 22px; }
    .grid { display: grid; gap: 12px 16px; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
    .grid label { display: flex; flex-direction: column; gap: 6px; font-size: .8rem; color: var(--bn-fog); }
    .grid .wide { grid-column: 1 / -1; }
    .grid .check { flex-direction: row; align-items: center; gap: 8px; font-size: .9rem; color: var(--bn-ink); }
    input:not([type=checkbox]), select {
      padding: 9px 12px; border-radius: 8px; border: 1px solid var(--bn-line); background: #1b1e22; color: var(--bn-ink);
      font: 400 .95rem/1.4 Inter, sans-serif; color-scheme: dark;
    }
    input[type=checkbox] { width: 18px; height: 18px; accent-color: var(--bn-sunset); }
    .label { margin: 18px 0 6px; font-size: .85rem; color: var(--bn-fog); }
    .code { margin: 0; padding: 12px; border-radius: 8px; background: #0f1113; border: 1px solid var(--bn-line); white-space: pre-wrap; word-break: break-all; font-size: .8rem; color: #cfe3d4; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .hint { margin: 10px 0 0; font-size: .8rem; color: var(--bn-fog); }
    .problem { display: flex; align-items: center; gap: 8px; margin: 18px 0 6px; color: #e0b25a; }
  `,
})
export class TerminFormular {
  protected readonly open = signal(false);
  protected readonly art = signal<'auftritt' | 'probe' | 'abwesenheit'>('auftritt');
  // wer abwesend sein kann: Vor- bzw. Spitznamen der Bandmitglieder oder die ganze Band
  protected readonly namen = [...inject(BandService).members.map((m) => m.nickname ?? m.name.split(' ')[0]), 'Band'];
  // unter dieser Zeile in band.service.ts einfügen
  protected readonly liste = computed(() => ({ auftritt: 'readonly shows', probe: 'readonly rehearsals', abwesenheit: 'readonly abwesenheiten' })[this.art()]);
  protected readonly f = signal({
    date: '', endDate: '', time: '', endTime: '', place: '', note: '', venue: '', city: '', organizer: '',
    price: '', amount: '', private: false, confirmed: false, publicName: '', comment: '', wer: '', grund: '',
  });
  protected readonly copied = signal(false);
  private readonly band = inject(BandService);

  // Hinweis, wenn am selben Tag schon ein Termin eingetragen ist
  protected readonly taken = computed(() => {
    const date = this.f().date;
    const show = this.band.shows.find((s) => s.date === date || (s.endDate && s.date <= date && date <= s.endDate));
    if (show) return `${show.venue}${show.city ? ' (' + show.city + ')' : ''}`;
    return this.band.rehearsals.some((r) => r.date === date) ? 'Probe' : null;
  });
  // Hinweis, wenn an dem Tag jemand abwesend ist (Abwesenheiten in band.service.ts)
  protected readonly abwesend = computed(() => {
    const date = this.f().date;
    const weg = this.band.abwesenheiten.filter((a) => a.von <= date && date <= (a.bis ?? a.von));
    return weg.length ? weg.map((a) => a.wer + (a.grund ? ` (${a.grund})` : '')).join(', ') : null;
  });
  // Auftritte und Proben im Zeitraum einer neuen Abwesenheit
  protected readonly kollision = computed(() => {
    const f = this.f();
    const bis = f.endDate || f.date;
    return [
      ...this.band.shows.filter((s) => s.date <= bis && f.date <= (s.endDate ?? s.date)).map((s) => `${s.venue} (${s.date})`),
      ...this.band.rehearsals.filter((r) => f.date <= r.date && r.date <= bis).map((r) => `Probe (${r.date})`),
    ];
  });
  protected readonly editUrl = EDIT_URL;

  // Proben sind in der Regel 18–21 Uhr in Dingden – leere Felder damit vorbelegen
  protected probe(): void {
    this.art.set('probe');
    this.f.update((f) => ({ ...f, time: f.time || '18:00', endTime: f.endTime || '21:00', place: f.place || 'Dingden' }));
  }

  protected set(key: string, e: Event): void {
    const value = (e.target as HTMLInputElement).value;
    this.f.update((f) => ({ ...f, [key]: value }));
  }
  protected toggle(key: 'private' | 'confirmed', e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    this.f.update((f) => ({ ...f, [key]: checked }));
  }

  protected readonly problem = computed(() => {
    const f = this.f();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return 'Bitte ein Datum wählen.';
    if (this.art() === 'auftritt' && !f.venue.trim()) return 'Bitte die Location angeben.';
    if (this.art() === 'abwesenheit' && !f.wer) return 'Bitte auswählen, wer nicht da ist.';
    if (f.endDate && f.endDate < f.date) return '„bis“ liegt vor dem Startdatum.';
    if (this.art() === 'auftritt' && f.price === 'pay' && !(Number(f.amount) > 0)) return 'Bitte den Eintritt in Euro angeben.';
    return null;
  });

  // Zeile im selben Stil wie die vorhandenen Einträge
  protected readonly line = computed(() => {
    const f = this.f();
    if (this.art() === 'abwesenheit') {
      const a = [`wer: ${q(f.wer)}`, `von: ${q(f.date)}`];
      if (f.endDate && f.endDate !== f.date) a.push(`bis: ${q(f.endDate)}`);
      if (f.grund.trim()) a.push(`grund: ${q(f.grund)}`);
      return `{ ${a.join(', ')} },`;
    }
    const parts: string[] = [`date: ${q(f.date)}`];
    if (this.art() === 'probe') {
      if (f.time) parts.push(`time: ${q(f.time)}`);
      if (f.endTime) parts.push(`endTime: ${q(f.endTime)}`);
      if (f.place.trim()) parts.push(`place: ${q(f.place)}`);
      if (f.note.trim()) parts.push(`note: ${q(f.note)}`);
      return `{ ${parts.join(', ')} },`;
    }
    if (f.endDate && f.endDate !== f.date) parts.push(`endDate: ${q(f.endDate)}`);
    if (f.time) parts.push(`time: ${q(f.time)}`);
    if (f.city.trim()) parts.push(`city: ${q(f.city)}`);
    parts.push(`venue: ${q(f.venue)}`);
    // Anfahrt: Google-Maps-Suche nach Location und Ort
    const where = [f.venue, f.city.replace(/-/g, ', ')].map((s) => s.trim()).filter(Boolean).join(', ') + ', NRW';
    if (!f.private) parts.push(`mapsUrl: ${q('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(where).replace(/'/g, '%27'))}`);
    if (f.private) {
      parts.push('private: true');
      if (f.publicName.trim()) parts.push(`publicName: ${q(f.publicName)}`);
    }
    parts.push(`confirmed: ${f.confirmed}`);
    if (f.price === '0') parts.push('price: 0');
    if (f.price === 'pay') parts.push(`price: ${Number(f.amount)}`);
    if (f.organizer.trim()) parts.push(`organizer: ${q(f.organizer)}`);
    if (f.comment.trim()) parts.push(`comment: ${q(f.comment)}`);
    return `{ ${parts.join(', ')} },`;
  });

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText('    ' + this.line());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      window.prompt('Zeile kopieren:', this.line());
    }
  }
}
