import { Component, computed, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Entry, SETLIST_PREFIX, isPause, setLength, setTime } from '../data/setlist-data';

// Setlist-Vorlagen (Backstage): eine bewährte Setlist unter einem Namen speichern und für den nächsten Auftritt
// übernehmen. Gespeichert im Browser („bn-setlist-vorlagen“) – wird beim „An die Band schicken“ mit ausgetauscht.
interface Vorlage {
  name: string;
  entries: Entry[];
  saved: string;
}

const KEY = SETLIST_PREFIX + 'vorlagen';

function load(): Vorlage[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Vorlage[];
  } catch {
    return [];
  }
}

@Component({
  selector: 'app-setlist-vorlagen',
  imports: [MatIconModule],
  template: `
    <div class="vorlagen">
      <span class="label"><mat-icon>bookmarks</mat-icon> Vorlagen</span>
      @if (list().length) {
        <select [value]="selected()" (change)="selected.set(+$any($event.target).value)" aria-label="Vorlage wählen">
          @for (v of list(); track v.name; let i = $index) {
            <option [value]="i">{{ v.name }} · {{ info(v) }}</option>
          }
        </select>
        <button type="button" (click)="use()"><mat-icon>playlist_add_check</mat-icon> Übernehmen</button>
        <button type="button" class="icon" (click)="remove()" aria-label="Vorlage löschen" title="Vorlage löschen"><mat-icon>delete</mat-icon></button>
      } @else {
        <span class="none">Noch keine – eine fertige Setlist hier als Vorlage speichern.</span>
      }
      <button type="button" class="save" (click)="save()" [disabled]="!songCount()"><mat-icon>bookmark_add</mat-icon> Als Vorlage speichern</button>
    </div>
  `,
  styles: `
    .vorlagen { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--bn-line); }
    .label { display: inline-flex; align-items: center; gap: 6px; font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .14em; font-size: .7rem; color: var(--bn-fog); }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
    select {
      flex: 1 1 200px; min-width: 0; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--bn-line);
      background: #1b1e22; color: var(--bn-ink); font: inherit; font-size: .88rem; color-scheme: dark;
    }
    button {
      display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px; cursor: pointer;
      border: 1px solid var(--bn-line); background: transparent; color: var(--bn-ink); font: inherit; font-size: .85rem;
    }
    button:hover:not(:disabled) { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    button:disabled { opacity: .4; cursor: default; }
    button.icon { padding: 7px; }
    .save { margin-left: auto; }
    .none { font-size: .85rem; color: var(--bn-fog); }
  `,
})
export class SetlistVorlagen {
  /** aktuelle Setlist – zum Speichern als Vorlage */
  readonly entries = input.required<Entry[]>();
  /** Vorlage soll die aktuelle Setlist ersetzen */
  readonly apply = output<Entry[]>();

  protected readonly list = signal<Vorlage[]>(load());
  protected readonly selected = signal(0);
  protected readonly songCount = computed(() => this.entries().filter((e) => !isPause(e)).length);

  protected info(v: Vorlage): string {
    const songs = v.entries.filter((e) => !isPause(e)) as { title: string; artist: string }[];
    const sec = setLength(songs).seconds;
    return `${songs.length} Songs${sec ? ', ' + setTime(sec) : ''}`;
  }

  protected save(): void {
    const name = prompt('Name der Vorlage (z. B. „Kneipe 3 Sets“):')?.trim();
    if (!name) return;
    const existing = this.list().findIndex((v) => v.name === name);
    if (existing >= 0 && !confirm(`Vorlage „${name}“ gibt es schon – überschreiben?`)) return;
    const vorlage: Vorlage = { name, entries: this.entries(), saved: new Date().toISOString() };
    const next = existing >= 0 ? this.list().map((v, i) => (i === existing ? vorlage : v)) : [...this.list(), vorlage];
    this.store(next.sort((a, b) => a.name.localeCompare(b.name, 'de')));
    this.selected.set(next.findIndex((v) => v.name === name));
  }

  protected use(): void {
    const v = this.list()[this.selected()];
    if (!v) return;
    if (this.entries().length && !confirm(`Aktuelle Setlist durch die Vorlage „${v.name}“ ersetzen?`)) return;
    this.apply.emit(structuredClone(v.entries));
  }

  protected remove(): void {
    const v = this.list()[this.selected()];
    if (!v || !confirm(`Vorlage „${v.name}“ löschen?`)) return;
    this.store(this.list().filter((x) => x !== v));
    this.selected.set(0);
  }

  private store(list: Vorlage[]): void {
    this.list.set(list);
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      // ohne Speicher gilt die Vorlage bis zum Neuladen
    }
  }
}
