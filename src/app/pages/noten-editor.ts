import { Component, computed, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NotenDateiInfo, NotenPdf, SongNoten, notenDateiSpeichern, pdfjsVorladen, songNoten, songNotenSetzen } from '../data/noten';
import { CHORDPRO_ENDUNGEN, chordproLesen, dateiText, dateinameZuordnen } from '../data/chordpro';

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
      <div class="pdfs">
        <span class="kopf">PDFs – eins je Fassung, z. B. Bass, Gitarre, Version 2</span>
        @for (p of noten().pdfs ?? []; track $index; let i = $index) {
          <div class="pdf">
            <label class="name">Fassung
              <input maxlength="30" placeholder="z. B. Bass" [value]="p.name ?? ''" (change)="pdfAendern(i, { name: $any($event.target).value.trim() || undefined })" />
            </label>
            <label class="zahl">Seite von
              <input type="number" min="1" inputmode="numeric" placeholder="1" [value]="p.von ?? ''" (change)="pdfAendern(i, { von: seite($any($event.target).value) })" />
            </label>
            <label class="zahl">bis
              <input type="number" min="1" inputmode="numeric" placeholder="Ende" [value]="p.bis ?? ''" (change)="pdfAendern(i, { bis: seite($any($event.target).value) })" />
            </label>
            <button type="button" class="weg" (click)="pdfEntfernen(i)" [attr.aria-label]="'PDF ' + (p.name || i + 1) + ' entfernen'"><mat-icon>delete</mat-icon></button>
            <small class="datei">{{ dateiName(p.datei) }}</small>
          </div>
        }
        <div class="pdf">
          <label class="name">PDF hinzufügen
            <select (change)="pdfHinzu($any($event.target).value); $any($event.target).value = ''">
              <option value="">– schon gespeichertes wählen –</option>
              @for (d of dateien(); track d.id) { <option [value]="d.id">{{ d.name }}</option> }
            </select>
          </label>
          <label class="hochladen">
            <mat-icon>upload</mat-icon> PDF hochladen
            <input type="file" multiple accept="application/pdf,.pdf" (change)="hochladen($event)" />
          </label>
        </div>
      </div>
      <div class="akkorde-kopf">
        <span>Akkordblatt (ChordPro) – Akkorde in [ ], Tonart mit {{ '{' }}key: …{{ '}' }}</span>
        <label class="hochladen">
          <mat-icon>description</mat-icon> .pro-Datei laden
          <input type="file" [accept]="endungen" (change)="proLaden($event)" />
        </label>
      </div>
      <label class="akkorde"><span class="unsichtbar">Akkordblatt</span>
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
    select, input {
      width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid var(--bn-line); border-radius: 8px; background: #1b1e22;
      color: var(--bn-ink); font: inherit; font-size: .9rem; text-transform: none; letter-spacing: 0; color-scheme: dark;
    }
    .pdfs { display: grid; gap: 8px; }
    .kopf, .akkorde-kopf { font-size: .72rem; color: var(--bn-fog); text-transform: uppercase; letter-spacing: .08em; }
    .pdf { display: flex; flex-wrap: wrap; align-items: end; gap: 6px 10px; }
    .name { flex: 1 1 160px; }
    .zahl { width: 80px; }
    @media (max-width: 520px) { .name { flex-basis: 100%; } }
    .datei { flex-basis: 100%; color: var(--bn-fog); font-size: .75rem; overflow-wrap: anywhere; }
    .weg { display: grid; place-items: center; width: 34px; height: 34px; padding: 0; border: 1px solid var(--bn-line); border-radius: 8px; background: none; color: var(--bn-fog); cursor: pointer; }
    .weg:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .weg mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .akkorde-kopf { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 10px; }
    .unsichtbar { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
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
  protected readonly endungen = CHORDPRO_ENDUNGEN;
  protected readonly noten = signal<SongNoten>({});
  protected readonly meldung = signal('');
  protected readonly pruefung = computed(() => {
    const t = this.noten().chordpro;
    if (!t?.trim()) return '';
    const b = chordproLesen(t);
    const akkorde = b.zeilen.reduce((n, z) => n + (z.art === 'text' ? z.teile.filter((x) => x.akkord).length : 0), 0);
    return `${akkorde} ${akkorde === 1 ? 'Akkord' : 'Akkorde'} erkannt${b.capo ? ` · Capo ${b.capo} laut Datei` : ''}${b.tonart ? ` · geschrieben in ${b.tonart}` : ' · ohne {key: …} gilt die Originaltonart'}`;
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

  protected dateiName(id: string): string {
    return this.dateien().find((d) => d.id === id)?.name ?? 'Datei fehlt auf diesem Gerät';
  }

  protected seite(roh: string): number | undefined {
    const n = Math.round(Number(roh));
    return n >= 1 ? n : undefined;
  }

  private pdfsSetzen(pdfs: NotenPdf[], text?: string): Promise<void> {
    return this.speichern({ ...this.noten(), pdfs }, text);
  }

  protected pdfAendern(i: number, teil: Partial<NotenPdf>): void {
    void this.pdfsSetzen((this.noten().pdfs ?? []).map((p, j) => (j === i ? { ...p, ...teil } : p)));
  }

  protected pdfEntfernen(i: number): void {
    void this.pdfsSetzen((this.noten().pdfs ?? []).filter((_, j) => j !== i), 'PDF entfernt (die Datei bleibt gespeichert)');
  }

  protected pdfHinzu(id: string): void {
    const d = this.dateien().find((x) => x.id === id);
    if (d) void this.pdfsSetzen([...(this.noten().pdfs ?? []), { datei: id, name: this.fassung(d.name) }]);
  }

  // Fassung aus dem Dateinamen: was neben Titel und Interpret darin steht („Iris - Goo Goo Dolls - Bass.pdf“ → Bass)
  private fassung(dateiname: string): string | undefined {
    const [title, artist] = this.songKey().split('|');
    const z = dateinameZuordnen(dateiname, [{ title, artist }]);
    return (z ? z.fassung : dateiname.replace(/\.[^.]+$/, '')).trim() || undefined;
  }

  protected async hochladen(e: Event): Promise<void> {
    const feld = e.target as HTMLInputElement;
    const dateien = [...(feld.files ?? [])];
    feld.value = '';
    const pdfs = [...(this.noten().pdfs ?? [])];
    for (const datei of dateien) {
      if (datei.type && datei.type !== 'application/pdf') {
        this.meldung.set('Bitte PDF-Dateien wählen.');
        return;
      }
      // dieselbe Datei nicht doppelt speichern
      const da = this.dateien().find((d) => d.name === datei.name && d.groesse === datei.size);
      const id = da?.id ?? (await notenDateiSpeichern(datei.name, await datei.arrayBuffer()));
      if (!pdfs.some((p) => p.datei === id)) pdfs.push({ datei: id, name: this.fassung(datei.name) });
    }
    if (!dateien.length) return;
    pdfjsVorladen();
    await this.pdfsSetzen(pdfs, dateien.length === 1 ? `„${dateien[0].name}“ gespeichert ✓ (nur auf diesem Gerät)` : `${dateien.length} PDFs gespeichert ✓ (nur auf diesem Gerät)`);
  }

  // ChordPro-Datei (.pro, .cho, .chopro …) als Akkordblatt übernehmen
  protected async proLaden(e: Event): Promise<void> {
    const feld = e.target as HTMLInputElement;
    const datei = feld.files?.[0];
    feld.value = '';
    if (!datei) return;
    const text = dateiText(await datei.arrayBuffer());
    if (this.noten().chordpro?.trim() && !confirm('Das vorhandene Akkordblatt durch die Datei ersetzen?')) return;
    const titel = chordproLesen(text).titel;
    const anderer = titel && !this.songKey().toLocaleLowerCase('de').startsWith(titel.toLocaleLowerCase('de').slice(0, 4));
    await this.speichern({ ...this.noten(), chordpro: text }, `„${datei.name}“ übernommen ✓${anderer ? ` – Achtung, in der Datei steht „${titel}“` : ''}`);
  }

  protected akkorde(text: string): void {
    void this.speichern({ ...this.noten(), chordpro: text.trim() ? text : undefined });
  }
}
