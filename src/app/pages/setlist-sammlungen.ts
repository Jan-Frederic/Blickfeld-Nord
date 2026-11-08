import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Entry, isPause, setLength, setTime } from '../data/setlist-data';
import { Sammlung, alleSammlungen, anhaengen, sammlungSetzen, sammlungSongs, sammlungen } from '../data/sammlungen';

// Sammlungen (Backstage → Setlist): eine benannte Songfolge ersetzt die ganze Setlist oder wird hinten angehängt;
// die aktuelle Setlist lässt sich als Sammlung speichern. Bearbeitet werden Sammlungen unter Songs → Liste.
@Component({
  selector: 'app-setlist-sammlungen',
  imports: [MatIconModule, RouterLink],
  template: `
    <div class="sammlungen">
      <span class="label"><mat-icon>bookmarks</mat-icon> Sammlungen</span>
      @if (list().length) {
        <select [value]="selected()" (change)="selected.set(+$any($event.target).value)" aria-label="Sammlung wählen">
          @for (v of list(); track v.name; let i = $index) {
            <option [value]="i">{{ v.name }}{{ v.fest ? ' (fest)' : '' }} · {{ info(v) }}</option>
          }
        </select>
        <button type="button" (click)="ersetzen()"><mat-icon>playlist_add_check</mat-icon> Ersetzen</button>
        <button type="button" (click)="dranhaengen()"><mat-icon>playlist_add</mat-icon> Anhängen</button>
      } @else {
        <span class="none">Noch keine – eine fertige Setlist hier als Sammlung speichern.</span>
      }
      <button type="button" class="save" (click)="save()" [disabled]="!songCount()"><mat-icon>bookmark_add</mat-icon> Als Sammlung speichern</button>
      <a class="bearbeiten" routerLink="/backstage/songs/sammlungen" [queryParams]="list()[selected()] ? { name: list()[selected()].name } : {}"><mat-icon>edit</mat-icon> bearbeiten</a>
      @if (meldung(); as m) { <span class="meldung" role="status">{{ m }}</span> }
    </div>
  `,
  styles: `
    .sammlungen { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; }
    .label { display: inline-flex; align-items: center; gap: 6px; font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .14em; font-size: .7rem; color: var(--bn-fog); }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
    select {
      flex: 1 1 200px; min-width: 0; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--bn-line);
      background: #1b1e22; color: var(--bn-ink); font: inherit; font-size: .88rem; color-scheme: dark;
    }
    button, .bearbeiten {
      display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px; cursor: pointer;
      border: 1px solid var(--bn-line); background: transparent; color: var(--bn-ink); font: inherit; font-size: .85rem; text-decoration: none;
    }
    button:hover:not(:disabled), .bearbeiten:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    button:disabled { opacity: .4; cursor: default; }
    .none, .meldung { font-size: .85rem; color: var(--bn-fog); }
    .meldung { flex-basis: 100%; color: #5fb88a; }
  `,
})
export class SetlistSammlungen {
  /** aktuelle Setlist – zum Speichern bzw. Anhängen */
  readonly entries = input.required<Entry[]>();
  /** neue Setlist (ersetzt oder mit angehängter Sammlung) */
  readonly apply = output<Entry[]>();

  protected readonly list = computed(() => sammlungen());
  protected readonly selected = signal(0);
  protected readonly meldung = signal('');
  protected readonly songCount = computed(() => this.entries().filter((e) => !isPause(e)).length);

  protected info(v: Sammlung): string {
    const songs = sammlungSongs(v);
    const sec = setLength(songs).seconds;
    return `${songs.length} Songs${sec ? ', ' + setTime(sec) : ''}`;
  }

  protected save(): void {
    const name = prompt('Name der Sammlung (z. B. „Kneipe 3 Sets“):')?.trim();
    if (!name) return;
    const da = alleSammlungen().find((v) => v.name.toLowerCase() === name.toLowerCase());
    if (da && !confirm(`Sammlung „${da.name}“ gibt es schon – überschreiben?`)) return;
    sammlungSetzen(da?.name ?? name, this.entries());
    this.selected.set(this.list().findIndex((v) => v.name === (da?.name ?? name)));
    this.meldung.set(`Als Sammlung „${da?.name ?? name}“ gespeichert ✓`);
  }

  protected ersetzen(): void {
    const v = this.list()[this.selected()];
    if (!v) return;
    if (this.entries().length && !confirm(`Aktuelle Setlist durch die Sammlung „${v.name}“ ersetzen?`)) return;
    this.apply.emit(structuredClone(v.entries));
    this.meldung.set(`Setlist durch „${v.name}“ ersetzt ✓`);
  }

  protected dranhaengen(): void {
    const v = this.list()[this.selected()];
    if (!v) return;
    const r = anhaengen(this.entries(), v.entries);
    this.apply.emit(r.entries);
    this.meldung.set(`${r.neu} ${r.neu === 1 ? 'Song' : 'Songs'} aus „${v.name}“ angehängt ✓${r.doppelt ? ` – ${r.doppelt} schon in der Setlist` : ''}`);
  }
}
