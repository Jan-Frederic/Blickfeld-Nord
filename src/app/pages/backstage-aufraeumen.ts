import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { LISTEN, songAbgleich } from '../data/playlisten';
import { BandService } from '../data/band.service';
import { BEREICHE, alleSchluessel, cacheLeeren, entfernen, vergangene, verwaist } from '../data/aufraeumen';
import { notenAllesLoeschen, notenEntfernen, notenVerwaist } from '../data/noten';
import { mitschnitteAllesLoeschen } from '../data/mitschnitte';
import { ordnerSpeicherLoeschen } from '../data/ordner';
import { syncSpeicherLoeschen } from '../data/sync-ordner';

// Backstage → Abgleich → Daten auf diesem Gerät → Aufräumen (in backstage-daten.ts eingebettet): vergangene Auftritte
// und verwaiste Einträge entfernen, alles zurücksetzen.
// Jeder Schritt fragt vorher nach – gesichert wird unter Einstellungen → Backup.
const ALTER = [
  { tage: 0, label: 'gleich nach dem Auftritt' },
  { tage: 30, label: 'älter als 30 Tage' },
  { tage: 182, label: 'älter als 6 Monate' },
  { tage: 365, label: 'älter als 1 Jahr' },
];

@Component({
  selector: 'app-backstage-aufraeumen',
  imports: [MatIconModule],
  template: `
      <h5>Vergangene Auftritte und Proben</h5>
      <div class="zeile">
        <select aria-label="Ab welchem Alter" (change)="alter.set(+$any($event.target).value)">
          @for (a of alterListe; track a.tage) { <option [value]="a.tage" [selected]="a.tage === alter()">{{ a.label }}</option> }
        </select>
        @for (b of jeAuftritt; track b.id) {
          <label class="check"><input type="checkbox" [checked]="auswahl().has(b.id)" (change)="umschalten(b.id)" /> {{ b.label }}</label>
        }
      </div>
      <button type="button" [disabled]="!alt().length" (click)="bereichLoeschen('vergangene Einträge', alt())"><mat-icon>auto_delete</mat-icon> {{ alt().length }} {{ alt().length === 1 ? 'Eintrag' : 'Einträge' }} entfernen</button>

      <h5>Verwaiste Einträge</h5>
      <p>Daten zu Auftritten, die es nicht mehr gibt (abgesagt oder verschoben), leere Noten-Einträge zu Songs, die in keiner Spotify-Liste
        stehen, und PDFs, die kein Song nutzt.</p>
      <button type="button" [disabled]="!verwaistZahl()" (click)="verwaistEntfernen()"><mat-icon>cleaning_services</mat-icon> {{ verwaistText() }}</button>

      <h5>Alles löschen</h5>
      <p>Setzt die Website auf diesem Gerät komplett zurück: alle Backstage-Daten, Noten, Einstellungen und Seiten für unterwegs.</p>
      <button type="button" class="gefahr" (click)="allesLoeschen()"><mat-icon>delete_forever</mat-icon> Alles auf diesem Gerät löschen</button>
      @if (meldung(); as m) { <p class="meldung" role="status">{{ m }}</p> }
  `,
  styles: `
    :host { display: block; }
    h5 { margin: 16px 0 6px; font-size: .9rem; font-weight: 600; }
    h5:first-child { margin-top: 4px; }
    p { margin: 0 0 10px; max-width: 720px; font-size: .88rem; line-height: 1.55; color: var(--bn-fog); }
    .zeile { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin-bottom: 10px; font-size: .88rem; }
    select { padding: 6px 8px; border: 1px solid var(--bn-line); border-radius: 8px; background: #1b1e22; color: var(--bn-ink); font: inherit; color-scheme: dark; }
    .check { display: inline-flex; align-items: center; gap: 6px; }
    .check input { accent-color: var(--bn-sunset); }
    button {
      display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px; border: 1px solid var(--bn-line);
      background: none; color: var(--bn-ink); font: inherit; font-size: .86rem; cursor: pointer;
    }
    button:hover:not(:disabled) { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    button:disabled { opacity: .4; cursor: default; }
    button.gefahr { border-color: #e07a5a; color: #e07a5a; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .meldung { margin: 14px 0 0; color: #5fb88a; }
  `,
})
export class BackstageAufraeumen {
  /** von außen hochgezählt, wenn anderswo auf der Seite Daten geändert wurden */
  readonly version = input(0);
  readonly geaendert = output<void>();
  private readonly band = inject(BandService);
  protected readonly alterListe = ALTER;
  protected readonly jeAuftritt = BEREICHE.filter((b) => b.jeAuftritt || b.probe);
  protected readonly meldung = signal('');
  /** nach jeder Änderung hochzählen – die Übersicht liest neu */
  private readonly stand = signal(0);

  // Vergangenes: Sterne und Setlists bleiben standardmäßig (Rückblick, Top 100)
  protected readonly alter = signal(30);
  protected readonly auswahl = signal(new Set(['packliste', 'vorort', 'werbeplan', 'probe']));
  private readonly letzterTag = new Map(this.band.shows.map((s) => [this.band.showId(s), s.endDate ?? s.date]));
  protected readonly alt = computed(() => {
    this.stand();
    const bis = new Date(Date.now() - this.alter() * 864e5).toISOString().slice(0, 10);
    return vergangene(bis, this.auswahl(), this.letzterTag);
  });
  protected umschalten(id: string): void {
    this.auswahl.update((a) => {
      const neu = new Set(a);
      if (!neu.delete(id)) neu.add(id);
      return neu;
    });
  }

  // Verwaistes: localStorage sofort, Noten asynchron
  // Songs aller Spotify-Listen (Website und Backstage-Listen)
  private readonly repertoire = new Set(songAbgleich(LISTEN).map((s) => s.key));
  private readonly verwaisteNoten = signal<{ songs: string[]; dateien: { id: string }[] }>({ songs: [], dateien: [] });
  private readonly verwaisteKeys = computed(() => (this.stand(), verwaist(new Set(this.letzterTag.keys()))));
  protected readonly verwaistZahl = computed(() => this.verwaisteKeys().length + this.verwaisteNoten().songs.length + this.verwaisteNoten().dateien.length);
  protected readonly verwaistText = computed(() => {
    const n = this.verwaisteNoten();
    const teile = [
      this.verwaisteKeys().length && `${this.verwaisteKeys().length} ${this.verwaisteKeys().length === 1 ? 'Eintrag' : 'Einträge'}`,
      n.songs.length && `${n.songs.length} Noten`,
      n.dateien.length && `${n.dateien.length} ungenutzte ${n.dateien.length === 1 ? 'PDF' : 'PDFs'}`,
    ].filter(Boolean);
    return teile.length ? `${teile.join(', ')} entfernen` : 'Nichts Verwaistes gefunden';
  });


  constructor() {
    effect(() => {
      this.version();
      untracked(() => void this.laden());
    });
  }

  private async laden(): Promise<void> {
    this.stand.update((x) => x + 1);
    try {
      this.verwaisteNoten.set(await notenVerwaist(this.repertoire));
    } catch {
      // ohne IndexedDB keine Noten
    }
  }

  protected bereichLoeschen(was: string, keys: string[]): void {
    if (!confirm(`${was}: ${keys.length} ${keys.length === 1 ? 'Eintrag' : 'Einträge'} auf diesem Gerät löschen?`)) return;
    this.meldung.set(`${entfernen(keys)} gelöscht ✓`);
    this.geaendert.emit();
  }

  protected async verwaistEntfernen(): Promise<void> {
    if (!confirm(`${this.verwaistText()}?`)) return;
    const n = this.verwaisteNoten();
    entfernen(this.verwaisteKeys());
    await notenEntfernen(n.songs, n.dateien.map((d) => d.id));
    this.meldung.set('Verwaiste Einträge entfernt ✓');
    this.geaendert.emit();
  }

  protected async allesLoeschen(): Promise<void> {
    const antwort = prompt('Wirklich alles auf diesem Gerät löschen? Zum Bestätigen LÖSCHEN eintippen.');
    if (antwort?.trim().toUpperCase() !== 'LÖSCHEN') return;
    entfernen(alleSchluessel());
    try {
      for (const k of Object.keys(sessionStorage)) if (k.startsWith('bn-')) sessionStorage.removeItem(k);
    } catch {
      // egal
    }
    await notenAllesLoeschen();
    await mitschnitteAllesLoeschen();
    await ordnerSpeicherLoeschen();
    await syncSpeicherLoeschen();
    await cacheLeeren();
    this.meldung.set('Alles gelöscht – Seite wird neu geladen …');
    setTimeout(() => location.reload(), 600);
  }
}
