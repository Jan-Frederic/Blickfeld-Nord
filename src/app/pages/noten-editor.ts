import { Component, computed, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NotenDateiInfo, SongNoten, notenDateiSpeichern, pdfjsVorladen, songNoten, songNotenSetzen } from '../data/noten';
import { chordproLesen } from '../data/chordpro';

// Noten eines Songs bearbeiten (Backstage → Songs): PDF wählen oder hochladen, Seitenbereich im Songbook, Akkordblatt
// im ChordPro-Format. Alles bleibt auf diesem Gerät (IndexedDB) – siehe data/noten.ts.
const BEISPIEL = `{key: C}
{c: Intro 2x}
[C]Einer von [G]80 Mil[Am]lionen …

{soc}
[F]Refrain …
{eoc}`;

@Component({
  selector: 'app-noten-editor',
  imports: [MatIconModule],
  template: `
    <div class="editor">
      <div class="pdf">
        <label>PDF
          <select (change)="pdfWaehlen($any($event.target).value)">
            <option value="" [selected]="!noten().pdf">– kein PDF –</option>
            @for (d of dateien(); track d.id) { <option [value]="d.id" [selected]="noten().pdf?.datei === d.id">{{ d.name }}</option> }
          </select>
        </label>
        <label class="hochladen">
          <mat-icon>upload</mat-icon> PDF hochladen
          <input type="file" accept="application/pdf,.pdf" (change)="hochladen($event)" />
        </label>
        @if (noten().pdf) {
          <label class="zahl">Seite von
            <input type="number" min="1" inputmode="numeric" placeholder="1" [value]="noten().pdf?.von ?? ''" (change)="seiten('von', $any($event.target).value)" />
          </label>
          <label class="zahl">bis
            <input type="number" min="1" inputmode="numeric" placeholder="Ende" [value]="noten().pdf?.bis ?? ''" (change)="seiten('bis', $any($event.target).value)" />
          </label>
        }
      </div>
      <label class="akkorde">Akkordblatt (ChordPro) – Akkorde in [ ], Tonart mit {{ '{' }}key: …{{ '}' }}
        <textarea rows="7" spellcheck="false" [placeholder]="beispiel" [value]="noten().chordpro ?? ''" (change)="akkorde($any($event.target).value)"></textarea>
      </label>
      @if (pruefung(); as p) { <p class="pruefung">{{ p }}</p> }
      @if (meldung(); as m) { <p class="meldung" role="status">{{ m }}</p> }
    </div>
  `,
  styles: `
    :host { grid-column: 1 / -1; min-width: 0; }
    .editor { display: grid; gap: 10px; padding: 10px 0 4px; border-top: 1px dashed var(--bn-line); }
    label { display: grid; gap: 2px; min-width: 0; font-size: .72rem; color: var(--bn-fog); text-transform: uppercase; letter-spacing: .08em; }
    select, input[type=number] {
      width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid var(--bn-line); border-radius: 8px; background: #1b1e22;
      color: var(--bn-ink); font: inherit; font-size: .9rem; text-transform: none; letter-spacing: 0; color-scheme: dark;
    }
    .pdf { display: flex; flex-wrap: wrap; align-items: end; gap: 10px; }
    .pdf > label:first-child { flex: 1 1 220px; }
    .zahl { width: 90px; }
    .hochladen {
      display: inline-flex !important; flex-direction: row; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px;
      border: 1px solid var(--bn-line); cursor: pointer; text-transform: none !important; letter-spacing: 0 !important; font-size: .85rem !important; color: var(--bn-ink) !important;
    }
    .hochladen:hover, .hochladen:focus-within { border-color: var(--bn-sunset); color: var(--bn-sunset) !important; }
    .hochladen input { position: absolute; width: 1px; height: 1px; opacity: 0; }
    .hochladen mat-icon { font-size: 18px; width: 18px; height: 18px; }
    textarea { width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid var(--bn-line); border-radius: 8px; background: #1b1e22; color: var(--bn-ink); font: .85rem/1.4 ui-monospace, monospace; text-transform: none; letter-spacing: 0; }
    .pruefung, .meldung { margin: 0; font-size: .8rem; color: var(--bn-fog); }
    .meldung { color: #5fb88a; }
  `,
})
export class NotenEditor {
  /** Schlüssel „Titel|Interpret“ */
  readonly songKey = input.required<string>();
  /** alle PDFs auf diesem Gerät (aus Backstage → Songs) */
  readonly dateien = input.required<NotenDateiInfo[]>();
  /** Noten geändert – Liste und Kennzeichnung neu laden */
  readonly geaendert = output<void>();

  protected readonly beispiel = BEISPIEL;
  protected readonly noten = signal<SongNoten>({});
  protected readonly meldung = signal('');
  protected readonly pruefung = computed(() => {
    const t = this.noten().chordpro;
    if (!t?.trim()) return '';
    const b = chordproLesen(t);
    const akkorde = b.zeilen.reduce((n, z) => n + (z.art === 'text' ? z.teile.filter((x) => x.akkord).length : 0), 0);
    return `${akkorde} Akkorde erkannt${b.tonart ? ` · geschrieben in ${b.tonart}` : ' · ohne {key: …} gilt die Originaltonart'}`;
  });

  ngOnInit(): void {
    songNoten(this.songKey())
      .then((n) => this.noten.set(n ?? {}))
      .catch(() => this.meldung.set('Die Noten-Datenbank ist in diesem Browser nicht verfügbar.'));
  }

  private async speichern(n: SongNoten, text = 'Gespeichert ✓ (nur auf diesem Gerät)'): Promise<void> {
    this.noten.set(n);
    await songNotenSetzen(this.songKey(), n);
    this.meldung.set(text);
    this.geaendert.emit();
  }

  protected pdfWaehlen(id: string): void {
    void this.speichern({ ...this.noten(), pdf: id ? { datei: id } : undefined });
  }

  protected async hochladen(e: Event): Promise<void> {
    const feld = e.target as HTMLInputElement;
    const datei = feld.files?.[0];
    feld.value = '';
    if (!datei) return;
    if (datei.type && datei.type !== 'application/pdf') {
      this.meldung.set('Bitte eine PDF-Datei wählen.');
      return;
    }
    const id = await notenDateiSpeichern(datei.name, await datei.arrayBuffer());
    pdfjsVorladen();
    await this.speichern({ ...this.noten(), pdf: { datei: id } }, `„${datei.name}“ gespeichert ✓ (nur auf diesem Gerät)`);
  }

  protected seiten(feld: 'von' | 'bis', roh: string): void {
    const pdf = this.noten().pdf;
    if (!pdf) return;
    const n = Math.round(Number(roh));
    void this.speichern({ ...this.noten(), pdf: { ...pdf, [feld]: n >= 1 ? n : undefined } });
  }

  protected akkorde(text: string): void {
    void this.speichern({ ...this.noten(), chordpro: text.trim() ? text : undefined });
  }
}
