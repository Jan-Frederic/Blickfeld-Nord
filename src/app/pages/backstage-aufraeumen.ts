import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import data from '../data/repertoire.json';
import { BandService } from '../data/band.service';
import { BEREICHE, alleSchluessel, cacheLeeren, entfernen, mb, uebersicht, vergangene, verwaist } from '../data/aufraeumen';
import { alleSongNoten, notenAllesLoeschen, notenDateien, notenEntfernen, notenVerwaist } from '../data/noten';
import { mitschnittUebersicht, mitschnitteAllesLoeschen } from '../data/mitschnitte';
import { ordnerSpeicherLoeschen } from '../data/ordner';
import { syncSpeicherLoeschen } from '../data/sync-ordner';

// Backstage → Abgleich → Aufräumen: was liegt auf diesem Gerät, je Bereich löschen; vergangene Auftritte und
// verwaiste Einträge entfernen; den Stand der Band übernehmen (ersetzt statt ergänzt); alles zurücksetzen.
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
    <div class="box">
      <h3>Aufräumen</h3>
      <p>Was auf diesem Gerät gespeichert ist. Vor dem Löschen ein Backup erstellen (Einstellungen → Backup) – damit lässt
        sich alles samt Notenblättern wiederherstellen.</p>
      <table>
        <tbody>
          @for (z of zeilen(); track z.bereich.id) {
            <tr>
              <th scope="row">{{ z.bereich.label }}@if (z.bereich.hinweis) { <small>{{ z.bereich.hinweis }}</small> }</th>
              <td>{{ z.keys.length || '–' }}</td>
              <td>{{ mb(z.bytes) }}</td>
              <td><button type="button" class="klein" [disabled]="!z.keys.length" (click)="bereichLoeschen(z.bereich.label, z.keys)" [attr.aria-label]="z.bereich.label + ' löschen'"><mat-icon>delete</mat-icon></button></td>
            </tr>
          }
          <tr>
            <th scope="row">Noten<small>{{ noten().songs }} Songs, {{ noten().pdfs }} PDFs</small></th>
            <td>{{ noten().songs || '–' }}</td>
            <td>{{ mb(noten().bytes) }}</td>
            <td><button type="button" class="klein" [disabled]="!noten().songs && !noten().pdfs" (click)="notenLoeschen()" aria-label="Alle Noten löschen"><mat-icon>delete</mat-icon></button></td>
          </tr>
          <tr>
            <th scope="row">Proben-Mitschnitte<small>{{ mitschnitte().songs }} Songs</small></th>
            <td>{{ mitschnitte().anzahl || '–' }}</td>
            <td>{{ mb(mitschnitte().bytes) }}</td>
            <td><button type="button" class="klein" [disabled]="!mitschnitte().anzahl" (click)="mitschnitteLoeschen()" aria-label="Alle Mitschnitte löschen"><mat-icon>delete</mat-icon></button></td>
          </tr>
          <tr>
            <th scope="row">Seiten für unterwegs<small>lädt beim nächsten Besuch mit Netz neu</small></th>
            <td>{{ caches() || '–' }}</td>
            <td>{{ mb(speicher()) }}</td>
            <td><button type="button" class="klein" [disabled]="!caches()" (click)="offlineLeeren()" aria-label="Seiten für unterwegs leeren"><mat-icon>delete</mat-icon></button></td>
          </tr>
        </tbody>
      </table>

      <h4>Vergangene Auftritte und Proben</h4>
      <div class="zeile">
        <select aria-label="Ab welchem Alter" (change)="alter.set(+$any($event.target).value)">
          @for (a of alterListe; track a.tage) { <option [value]="a.tage" [selected]="a.tage === alter()">{{ a.label }}</option> }
        </select>
        @for (b of jeAuftritt; track b.id) {
          <label class="check"><input type="checkbox" [checked]="auswahl().has(b.id)" (change)="umschalten(b.id)" /> {{ b.label }}</label>
        }
      </div>
      <button type="button" [disabled]="!alt().length" (click)="bereichLoeschen('vergangene Einträge', alt())"><mat-icon>auto_delete</mat-icon> {{ alt().length }} {{ alt().length === 1 ? 'Eintrag' : 'Einträge' }} entfernen</button>

      <h4>Verwaiste Einträge</h4>
      <p>Daten zu Auftritten, die es nicht mehr gibt (abgesagt oder verschoben), Noten zu Songs, die nicht mehr im Repertoire
        stehen, und PDFs, die kein Song nutzt.</p>
      <button type="button" [disabled]="!verwaistZahl()" (click)="verwaistEntfernen()"><mat-icon>cleaning_services</mat-icon> {{ verwaistText() }}</button>

      <h4>Alles löschen</h4>
      <p>Setzt die Website auf diesem Gerät komplett zurück: alle Backstage-Daten, Noten, Einstellungen und Seiten für unterwegs.</p>
      <button type="button" class="gefahr" (click)="allesLoeschen()"><mat-icon>delete_forever</mat-icon> Alles auf diesem Gerät löschen</button>
      @if (meldung(); as m) { <p class="meldung" role="status">{{ m }}</p> }
    </div>
  `,
  styles: `
    .box { margin-top: 20px; padding: 20px 24px; border-radius: 12px; border: 1px solid var(--bn-line); }
    h3, h4 { margin: 0 0 6px; font-family: var(--bn-wide); font-weight: 400; text-transform: uppercase; letter-spacing: .14em; font-size: .85rem; }
    h4 { margin-top: 22px; font-size: .75rem; color: var(--bn-sunset); }
    p { margin: 0 0 10px; max-width: 720px; font-size: .88rem; line-height: 1.55; color: var(--bn-fog); }
    table { width: 100%; border-collapse: collapse; font-size: .88rem; }
    th, td { padding: 6px 4px; border-bottom: 1px solid var(--bn-line); text-align: left; font-weight: 400; overflow-wrap: anywhere; }
    td { white-space: nowrap; color: var(--bn-fog); font-variant-numeric: tabular-nums; }
    td:last-child { width: 1%; text-align: right; }
    small { display: block; color: var(--bn-fog); font-size: .75rem; }
    .zeile { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin-bottom: 10px; font-size: .88rem; }
    select { padding: 6px 8px; border: 1px solid var(--bn-line); border-radius: 8px; background: #1b1e22; color: var(--bn-ink); font: inherit; color-scheme: dark; }
    .check { display: inline-flex; align-items: center; gap: 6px; }
    .check input { accent-color: var(--bn-sunset); }
    button, .knopf {
      display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px; border: 1px solid var(--bn-line);
      background: none; color: var(--bn-ink); font: inherit; font-size: .86rem; cursor: pointer;
    }
    button.klein { padding: 5px; }
    button:hover:not(:disabled), .knopf:hover, .knopf:focus-within { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    button:disabled { opacity: .4; cursor: default; }
    button.gefahr { border-color: #e07a5a; color: #e07a5a; }
    .knopf input { position: absolute; width: 1px; height: 1px; opacity: 0; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .meldung { margin: 14px 0 0; color: #5fb88a; }
  `,
})
export class BackstageAufraeumen {
  /** von außen hochgezählt, wenn anderswo auf der Seite Daten geändert wurden */
  readonly version = input(0);
  readonly geaendert = output<void>();
  private readonly band = inject(BandService);
  protected readonly mb = mb;
  protected readonly alterListe = ALTER;
  protected readonly jeAuftritt = BEREICHE.filter((b) => b.jeAuftritt || b.probe);
  protected readonly meldung = signal('');
  /** nach jeder Änderung hochzählen – die Übersicht liest neu */
  private readonly stand = signal(0);

  protected readonly zeilen = computed(() => (this.stand(), uebersicht()));

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
  private readonly repertoire = new Set(data.tracks.map((t) => `${t.title}|${t.artist}`));
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

  protected readonly noten = signal({ songs: 0, pdfs: 0, bytes: 0 });
  protected readonly mitschnitte = signal({ anzahl: 0, songs: 0, bytes: 0 });
  protected readonly caches = signal(0);
  protected readonly speicher = signal(0);

  constructor() {
    effect(() => {
      this.version();
      untracked(() => void this.laden());
    });
  }

  private async laden(): Promise<void> {
    this.stand.update((x) => x + 1);
    try {
      const [songs, dateien] = await Promise.all([alleSongNoten(), notenDateien()]);
      this.noten.set({ songs: Object.keys(songs).length, pdfs: dateien.length, bytes: dateien.reduce((s, d) => s + d.groesse, 0) });
      this.verwaisteNoten.set(await notenVerwaist(this.repertoire));
    } catch {
      // ohne IndexedDB keine Noten
    }
    try {
      this.mitschnitte.set(await mitschnittUebersicht());
    } catch {
      // ohne IndexedDB keine Mitschnitte
    }
    try {
      this.caches.set(typeof caches === 'undefined' ? 0 : (await caches.keys()).length);
      const s = await navigator.storage?.estimate?.();
      // grob: alles, was nicht Noten oder localStorage ist
      this.speicher.set(Math.max(0, (s?.usage ?? 0) - this.noten().bytes - this.mitschnitte().bytes));
    } catch {
      // Schätzung nicht verfügbar
    }
  }

  protected bereichLoeschen(was: string, keys: string[]): void {
    if (!confirm(`${was}: ${keys.length} ${keys.length === 1 ? 'Eintrag' : 'Einträge'} auf diesem Gerät löschen?`)) return;
    this.meldung.set(`${entfernen(keys)} gelöscht ✓`);
    this.geaendert.emit();
  }

  protected async notenLoeschen(): Promise<void> {
    if (!confirm(`Alle Noten (${this.noten().songs} Songs, ${this.noten().pdfs} PDFs) auf diesem Gerät löschen?`)) return;
    await notenAllesLoeschen();
    this.meldung.set('Noten gelöscht ✓');
    this.geaendert.emit();
  }

  protected async mitschnitteLoeschen(): Promise<void> {
    if (!confirm(`Alle ${this.mitschnitte().anzahl} Proben-Mitschnitte auf diesem Gerät löschen?`)) return;
    await mitschnitteAllesLoeschen();
    this.meldung.set('Mitschnitte gelöscht ✓');
    this.geaendert.emit();
  }

  protected async offlineLeeren(): Promise<void> {
    if (!confirm('Seiten für unterwegs leeren? Ohne Netz ist Backstage dann erst nach dem nächsten Besuch mit Netz wieder da.')) return;
    await cacheLeeren();
    this.meldung.set('Seiten für unterwegs geleert ✓');
    void this.laden();
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
