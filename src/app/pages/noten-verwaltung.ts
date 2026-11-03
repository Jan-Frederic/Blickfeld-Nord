import { Component, computed, inject, input, output, signal } from '@angular/core';
import { SyncService } from '../data/sync.service';
import { MatIconModule } from '@angular/material/icon';
import { CHORDPRO_ENDUNGEN } from '../data/chordpro';
import { notenEinlesen, notenErgebnisText } from '../data/noten-import';
import { NotenDateiInfo, notenDateiLoeschen, notenExportieren, notenImportieren } from '../data/noten';

// Notenblätter auf diesem Gerät (Backstage → Songs → Noten): gespeicherte PDFs mit Größe, Löschen, viele Dateien oder
// ganze Ordner (PDF und ChordPro) einlesen – jede wird über den Dateinamen bzw. {title:} ihrem Song zugeordnet –
// und der Austausch in der Band als Datei, die direkt von Gerät zu Gerät geht (Teilen-Menü, z. B. AirDrop oder Messenger).
// Suche über die Dateinamen. Löschen: alle nur von diesem Gerät; wer den OneDrive-Ordner besitzt (Berechtigung „Daten
// löschen“), wird gefragt – nur vom Gerät oder auch aus OneDrive (betrifft dann die ganze Band).
@Component({
  selector: 'app-noten-verwaltung',
  imports: [MatIconModule],
  template: `
    <section class="verwaltung" aria-labelledby="noten-titel">
      <h3 id="noten-titel"><mat-icon>library_music</mat-icon> Notenblätter auf diesem Gerät</h3>
      <p class="lead">
        {{ songs() }} {{ songs() === 1 ? 'Song' : 'Songs' }} mit Noten, {{ dateien().length }} {{ dateien().length === 1 ? 'PDF' : 'PDFs' }} ({{ mb() }}).
        Noten bleiben auf diesem Gerät und gehen nie an GitHub – Notenblätter und Liedtexte sind urheberrechtlich geschützt.
        Im Bühnen-Modus oben auf <mat-icon class="inline">library_music</mat-icon> tippen.
      </p>
      @if (dateien().length) {
        <label class="suche"><mat-icon>search</mat-icon>
          <input type="search" placeholder="Noten suchen …" aria-label="Noten suchen" [value]="suche()" (input)="suche.set($any($event.target).value)" />
          @if (suche().trim()) { <small>{{ gefiltert().length }} von {{ dateien().length }}</small> }
        </label>
        <ul>
          @for (d of gefiltert(); track d.id) {
            <li><span>{{ d.name }} <small>{{ groesse(d.groesse) }}</small></span>
              @if (frage() === d.id) {
                <span class="frage" role="group" [attr.aria-label]="d.name + ' löschen'">
                  <button type="button" (click)="loeschen(d, false)"><mat-icon>phone_android</mat-icon> Nur vom Gerät</button>
                  <button type="button" class="gefahr" (click)="loeschen(d, true)"><mat-icon>delete_forever</mat-icon> Auch aus OneDrive</button>
                  <button type="button" class="icon" (click)="frage.set(null)" aria-label="Abbrechen"><mat-icon>close</mat-icon></button>
                </span>
              } @else {
                <button type="button" class="icon" (click)="loeschenFragen(d)" [attr.aria-label]="d.name + ' löschen'"><mat-icon>delete</mat-icon></button>
              }
            </li>
          } @empty { <li class="leer">Keine Noten zu „{{ suche() }}“.</li> }
        </ul>
      }
      <div class="knoepfe">
        <button type="button" (click)="teilen()" [disabled]="!songs()"><mat-icon>ios_share</mat-icon> Notenblätter an die Band</button>
        <label class="knopf"><mat-icon>file_open</mat-icon> Notenblätter importieren
          <input type="file" accept=".json,application/json" (change)="importieren($event)" />
        </label>
        <label class="knopf"><mat-icon>upload</mat-icon> Dateien einlesen (PDF, .pro)
          <input type="file" class="dateien" multiple [accept]="'.pdf,application/pdf,' + endungen" (change)="einlesen($event)" />
        </label>
        <label class="knopf"><mat-icon>folder_open</mat-icon> Ganzen Ordner einlesen
          <input type="file" class="ordner" webkitdirectory multiple (change)="einlesen($event)" />
        </label>
      </div>
      @if (meldung(); as m) { <p class="meldung" [class.fehler]="m.fehler" role="status">{{ m.text }}</p> }
      @if (ohneSong().length) {
        <p class="meldung fehler">Keinem Song zugeordnet (Titel und Interpret nicht im Dateinamen erkannt): {{ ohneSong().join(', ') }} –
          diese unter Songs im Song-Dialog einzeln laden oder umbenennen („Titel - Interpret - Fassung.pdf“).</p>
      }
      <p class="hinweis">Tipp für iPhone und iPad: die Backstage-Seite zum Home-Bildschirm hinzufügen – sonst darf Safari gespeicherte
        Daten nach 7 Tagen ohne Besuch löschen.</p>
    </section>
  `,
  styles: `
    .verwaltung { margin-top: 24px; padding: 16px 18px; border: 1px solid var(--bn-line); border-radius: 12px; font-size: .9rem; }
    h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; font-size: 1rem; }
    .lead, .hinweis { margin: 0 0 10px; color: var(--bn-fog); line-height: 1.5; }
    .hinweis { margin: 10px 0 0; font-size: .8rem; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
    mat-icon.inline { vertical-align: -3px; }
    ul { list-style: none; margin: 0 0 10px; padding: 0; display: grid; gap: 4px; }
    li { display: flex; align-items: center; gap: 8px; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--bn-line); overflow-wrap: anywhere; }
    small { color: var(--bn-fog); }
    .knoepfe { display: flex; flex-wrap: wrap; gap: 8px; }
    button, .knopf {
      display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px; border: 1px solid var(--bn-line);
      background: none; color: var(--bn-ink); font: inherit; font-size: .85rem; cursor: pointer;
    }
    button.icon { padding: 5px; }
    button:hover:not(:disabled), .knopf:hover, .knopf:focus-within { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    button:disabled { opacity: .4; cursor: default; }
    .knopf input { position: absolute; width: 1px; height: 1px; opacity: 0; }
    .meldung { margin: 10px 0 0; color: #5fb88a; }
    .meldung.fehler { color: #e07a5a; }
  `,
})
export class NotenVerwaltung {
  readonly dateien = input.required<NotenDateiInfo[]>();
  /** Anzahl Songs mit Noten */
  readonly songs = input.required<number>();
  readonly geaendert = output<void>();
  protected readonly meldung = signal<{ text: string; fehler?: boolean } | null>(null);
  protected readonly endungen = CHORDPRO_ENDUNGEN;
  protected readonly ohneSong = signal<string[]>([]);
  protected readonly mb = computed(() => this.groesse(this.dateien().reduce((s, d) => s + d.groesse, 0)));

  protected groesse(bytes: number): string {
    return bytes >= 1e6 ? `${(bytes / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB` : `${Math.ceil(bytes / 1e3)} kB`;
  }

  private readonly sync = inject(SyncService);
  protected readonly suche = signal('');
  protected readonly gefiltert = computed(() => {
    const w = this.suche().trim().toLocaleLowerCase('de').split(/\s+/).filter(Boolean);
    return this.dateien().filter((d) => w.every((x) => d.name.toLocaleLowerCase('de').replace(/[_-]+/g, ' ').includes(x)));
  });
  /** Datei, bei der gerade „nur vom Gerät / auch aus OneDrive“ gefragt wird */
  protected readonly frage = signal<string | null>(null);

  /** Besitzer des OneDrive-Ordners wählt, sonst gleich vom Gerät löschen */
  protected loeschenFragen(d: NotenDateiInfo): void {
    if (this.sync.darfLoeschen()) this.frage.set(d.id);
    else void this.loeschen(d, false);
  }

  protected async loeschen(d: NotenDateiInfo, oneDrive: boolean): Promise<void> {
    const text = oneDrive
      ? `„${d.name}“ aus OneDrive und von diesem Gerät löschen? Das betrifft die ganze Band – beim nächsten Abgleich ist die Datei überall weg.`
      : `„${d.name}“ von diesem Gerät löschen? Songs, die es nutzen, haben hier dann kein PDF mehr.${this.sync.bereit() ? ' In OneDrive bleibt die Datei.' : ''}`;
    if (!confirm(text)) return;
    this.frage.set(null);
    try {
      // erst vom Gerät (Songs verlieren den Verweis), dann aus OneDrive – der Abgleich danach schreibt den neuen Stand
      await notenDateiLoeschen(d.id);
      const drueben = oneDrive ? await this.sync.ausOneDriveLoeschen([d]) : 0;
      this.meldung.set({
        text: `„${d.name}“ gelöscht${oneDrive ? (drueben ? ' – auch aus OneDrive; die anderen Geräte entfernen sie beim nächsten Abgleich' : ' – im Sync-Ordner lag sie nicht (mehr); die anderen Geräte entfernen ihre Kopie beim nächsten Abgleich') : ' (nur auf diesem Gerät)'} ✓`,
      });
      this.geaendert.emit();
    } catch (e) {
      this.meldung.set({ text: `Löschen fehlgeschlagen: ${(e as Error).message || 'unbekannter Fehler'}`, fehler: true });
    }
  }

  protected async teilen(): Promise<void> {
    const datei = await notenExportieren();
    if (!datei) return;
    if (navigator.canShare?.({ files: [datei] })) {
      try {
        await navigator.share({ files: [datei], title: 'Blickfeld Nord – Notenblätter', text: 'Notenblätter zum Importieren (Backstage → Songs → Notenblätter importieren)' });
        this.meldung.set({ text: 'Geteilt.' });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(datei);
    Object.assign(document.createElement('a'), { href: url, download: datei.name }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.meldung.set({ text: `Als „${datei.name}“ gespeichert – jetzt an die Band schicken.` });
  }

  // viele Dateien oder ein ganzer Ordner: siehe data/noten-import.ts
  protected async einlesen(e: Event): Promise<void> {
    const feld = e.target as HTMLInputElement;
    const dateien = [...(feld.files ?? [])];
    feld.value = '';
    if (!dateien.length) return;
    this.meldung.set({ text: `${dateien.length} Dateien werden gelesen …` });
    const r = await notenEinlesen(
      dateien.map((d) => ({ name: d.name, pfad: (d as File & { webkitRelativePath?: string }).webkitRelativePath || d.name, groesse: d.size, daten: () => d.arrayBuffer() })),
      this.dateien(),
      (fertig, gesamt, name) => this.meldung.set({ text: name ? `${fertig + 1} / ${gesamt}: ${name}` : 'Fertig' }),
    );
    this.ohneSong.set(r.ohne);
    this.meldung.set(notenErgebnisText(r));
    if (r.pdfs || r.blaetter || r.aktualisiert) this.geaendert.emit();
  }

  protected async importieren(e: Event): Promise<void> {
    const feld = e.target as HTMLInputElement;
    const datei = feld.files?.[0];
    feld.value = '';
    if (!datei) return;
    try {
      const n = await notenImportieren(await datei.text());
      this.meldung.set({ text: `Noten für ${n} ${n === 1 ? 'Song' : 'Songs'} übernommen ✓` });
      this.geaendert.emit();
    } catch {
      this.meldung.set({ text: 'Das ist keine Notenblatt-Datei von Blickfeld Nord.', fehler: true });
    }
  }
}
