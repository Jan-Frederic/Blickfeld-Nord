import { Component, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import data from '../data/repertoire.json';
import { Entry, SETLIST_PREFIX, durationOf, isPause } from '../data/setlist-data';
import { alleBewertungen, rangliste, songKey } from '../data/bewertung';
import { songInfo } from '../data/songinfo';
import { Kandidat, vorschlagen } from '../data/setlist-vorschlag';

// „Setlist vorschlagen“ (Backstage): Sets in gewünschter Länge aus Sternen, Spielhäufigkeit, Tempo und Tonart –
// die Logik steht in data/setlist-vorschlag.ts. Ersetzt nach Rückfrage die aktuelle Setlist.
@Component({
  selector: 'app-setlist-vorschlag',
  imports: [MatIconModule],
  template: `
    <div class="vorschlag">
      <span class="label"><mat-icon>auto_awesome</mat-icon> Vorschlag</span>
      <label>
        <select [value]="sets()" (change)="sets.set(+$any($event.target).value)" aria-label="Anzahl Sets">
          @for (n of [1, 2, 3, 4]; track n) { <option [value]="n">{{ n }} {{ n === 1 ? 'Set' : 'Sets' }}</option> }
        </select>
      </label>
      <span class="x">à</span>
      <label>
        <select [value]="minuten()" (change)="minuten.set(+$any($event.target).value)" aria-label="Minuten je Set">
          @for (m of [30, 40, 45, 50, 60, 75, 90]; track m) { <option [value]="m">{{ m }} min</option> }
        </select>
      </label>
      <button type="button" (click)="vorschlagen()"><mat-icon>queue_music</mat-icon> Setlist vorschlagen</button>
      <span class="none">Beste Sterne zuerst, sonst die meistgespielten Songs; bester Song ans Set-Ende.</span>
    </div>
  `,
  styles: `
    .vorschlag { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--bn-line); }
    .label { display: inline-flex; align-items: center; gap: 6px; font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .14em; font-size: .7rem; color: var(--bn-fog); }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
    select { padding: 8px 10px; border-radius: 8px; border: 1px solid var(--bn-line); background: #1b1e22; color: var(--bn-ink); font: inherit; font-size: .88rem; color-scheme: dark; }
    .x { color: var(--bn-fog); font-size: .85rem; }
    button {
      display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px; cursor: pointer;
      border: 1px solid var(--bn-line); background: transparent; color: var(--bn-ink); font: inherit; font-size: .85rem;
    }
    button:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .none { flex-basis: 100%; font-size: .8rem; color: var(--bn-fog); }
  `,
})
export class SetlistVorschlag {
  /** aktuelle Setlist – nur für die Rückfrage vor dem Ersetzen */
  readonly entries = input.required<Entry[]>();
  /** Auftritts-ID (beginnt mit dem Datum) – für Weihnachtslieder in der Adventszeit */
  readonly show = input('');
  readonly apply = output<Entry[]>();
  protected readonly sets = signal(2);
  protected readonly minuten = signal(45);

  protected vorschlagen(): void {
    if (this.entries().length && !confirm('Aktuelle Setlist durch einen Vorschlag ersetzen?')) return;
    const wert = new Map(rangliste(alleBewertungen(), Infinity).map((p) => [songKey(p), p.wert]));
    const gespielt = this.gespielt();
    const kandidaten: Kandidat[] = data.tracks.map((t) => {
      const info = songInfo(t.title, t.artist);
      return { title: t.title, artist: t.artist, dauer: durationOf(t), wert: wert.get(songKey(t)), gespielt: gespielt.get(songKey(t)), bpm: info?.bpm, tonart: info?.tonart };
    });
    this.apply.emit(vorschlagen(kandidaten, this.sets(), this.minuten(), /^\d{4}-\d{2}-\d{2}/.test(this.show()) ? this.show() : undefined));
  }

  // wie oft jeder Song auf den gespeicherten Setlists dieses Geräts steht
  private gespielt(): Map<string, number> {
    const zahl = new Map<string, number>();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(SETLIST_PREFIX) || key === SETLIST_PREFIX + 'vorlagen') continue;
        for (const e of JSON.parse(localStorage.getItem(key) ?? '[]') as Entry[]) {
          if (!isPause(e)) zahl.set(songKey(e), (zahl.get(songKey(e)) ?? 0) + 1);
        }
      }
    } catch {
      // ohne Speicher eben ohne Spielhäufigkeit
    }
    return zahl;
  }
}
