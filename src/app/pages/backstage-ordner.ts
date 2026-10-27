import { Component, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Fund, sichten } from '../data/einlesen';
import { notenExportieren } from '../data/noten';
import { OrdnerHandle, dateienAlsQuellen, gemerkterOrdner, ordnerDateien, ordnerErlaubnis, ordnerSchreiben, ordnerTrennen, ordnerVerbinden, ordnerVerbindbar } from '../data/ordner';
import { backstageDatei, backupTeilen, gesichert } from './backstage-sync';
import { FundeListe } from './funde-liste';
import { Fortschritt, Stand } from './fortschritt';

// Backstage → Abgleich → Ordner auf dem Gerät: z. B. der OneDrive-Ordner (Windows-Explorer, Finder, „Dateien“-App
// am iPhone) – die OneDrive-App gleicht ihn ab, eine Anmeldung bei Microsoft ist hier nicht nötig.
// Chrome/Edge am Computer: Ordner einmal verbinden, dann einlesen und direkt hineinsichern. Sonst: Ordner bzw.
// Dateien wählen und einlesen; gesichert wird über Teilen/Speichern (dort den OneDrive-Ordner wählen).
@Component({
  selector: 'app-backstage-ordner',
  imports: [MatIconModule, FundeListe, Fortschritt],
  template: `
    <div class="box">
      <h3><mat-icon>folder_shared</mat-icon> Ordner auf dem Gerät (z. B. OneDrive)</h3>
      <p>Setlists, Packlisten, Noten (PDF, .pro) und Sicherungen aus einem Ordner einlesen – etwa dem OneDrive-Ordner, den
        die OneDrive-App mit deinem Microsoft-Konto abgleicht. Unterordner werden mit durchsucht.</p>
      @if (verbindbar) {
        @if (ordner(); as o) {
          <p class="ok"><mat-icon>link</mat-icon> Verbunden: {{ o.name }} <button type="button" class="link" (click)="trennen()">trennen</button></p>
          <div class="knoepfe">
            <button type="button" (click)="durchsuchen()" [disabled]="laeuft()"><mat-icon>travel_explore</mat-icon> Ordner durchsuchen</button>
            <button type="button" (click)="sichern()" [disabled]="laeuft()"><mat-icon>save</mat-icon> Stand dort sichern</button>
            <label class="check"><input type="checkbox" [checked]="mitNoten()" (change)="mitNoten.set($any($event.target).checked)" /> mit Notenblättern</label>
          </div>
        } @else {
          <button type="button" class="primaer" (click)="verbinden()" [disabled]="laeuft()"><mat-icon>create_new_folder</mat-icon> Ordner verbinden</button>
        }
      } @else {
        <div class="knoepfe">
          <label class="knopf"><mat-icon>folder_open</mat-icon> Ordner wählen
            <input type="file" class="ordner" webkitdirectory multiple (change)="gewaehlt($event)" />
          </label>
          <label class="knopf"><mat-icon>upload_file</mat-icon> Dateien wählen
            <input type="file" class="dateien" multiple accept=".json,application/json,.pdf,application/pdf,.pro,.cho,.chopro,.chordpro,.crd,.txt" (change)="gewaehlt($event)" />
          </label>
          <button type="button" (click)="sichern()" [disabled]="laeuft()"><mat-icon>ios_share</mat-icon> Stand sichern</button>
          <label class="check"><input type="checkbox" [checked]="mitNoten()" (change)="mitNoten.set($any($event.target).checked)" /> mit Notenblättern</label>
        </div>
        <p class="hinweis">Am iPhone/iPad in der Auswahl links „OneDrive“ antippen; beim Sichern „In Dateien sichern“ → OneDrive.</p>
      }
      @if (funde(); as f) { <app-funde-liste [funde]="f" (geaendert)="geaendert.emit()" /> }
      @if (stand(); as s) { <app-fortschritt [stand]="s" /> }
      @if (meldung(); as m) { <p class="meldung" [class.fehler]="m.fehler" role="status">{{ m.text }}</p> }
    </div>
  `,
  styles: `
    .box { margin-top: 20px; padding: 20px 24px; border-radius: 12px; border: 1px solid var(--bn-line); }
    h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; font-family: var(--bn-wide); font-weight: 400; text-transform: uppercase; letter-spacing: .14em; font-size: .85rem; }
    p { margin: 0 0 12px; max-width: 720px; font-size: .88rem; line-height: 1.55; color: var(--bn-fog); }
    .ok { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; color: #5fb88a; overflow-wrap: anywhere; }
    .hinweis { margin: 10px 0 0; font-size: .8rem; }
    .knoepfe { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
    .check { display: inline-flex; align-items: center; gap: 8px; font-size: .88rem; }
    .check input { accent-color: var(--bn-sunset); }
    button, .knopf { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; font-size: .86rem; cursor: pointer; }
    button:hover:not(:disabled), .knopf:hover, .knopf:focus-within { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    button:disabled { opacity: .4; cursor: default; }
    button.primaer { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    button.link { padding: 0 4px; border: 0; color: var(--bn-fog); text-decoration: underline; }
    .knopf input { position: absolute; width: 1px; height: 1px; opacity: 0; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .meldung { margin: 12px 0 0; color: #5fb88a; }
    .meldung.fehler { color: #e07a5a; }
  `,
})
export class BackstageOrdner {
  readonly geaendert = output<void>();
  protected readonly verbindbar = ordnerVerbindbar();
  protected readonly ordner = signal<OrdnerHandle | null>(null);
  protected readonly funde = signal<Fund[] | null>(null);
  protected readonly laeuft = signal(false);
  protected readonly stand = signal<Stand | null>(null);
  protected readonly mitNoten = signal(false);
  protected readonly meldung = signal<{ text: string; fehler?: boolean } | null>(null);

  constructor() {
    if (this.verbindbar) gemerkterOrdner().then((h) => this.ordner.set(h ?? null));
  }

  private async tun(arbeit: () => Promise<void>): Promise<void> {
    this.laeuft.set(true);
    try {
      await arbeit();
    } catch (e) {
      if ((e as Error).name !== 'AbortError') this.meldung.set({ text: `Ordner: ${(e as Error).message || 'unbekannter Fehler'}`, fehler: true });
    } finally {
      this.laeuft.set(false);
      this.stand.set(null);
    }
  }

  protected verbinden(): Promise<void> {
    return this.tun(async () => {
      this.ordner.set(await ordnerVerbinden());
      this.meldung.set({ text: 'Verbunden ✓ – jetzt „Ordner durchsuchen“.' });
    });
  }

  protected trennen(): Promise<void> {
    return this.tun(async () => {
      await ordnerTrennen();
      this.ordner.set(null);
      this.funde.set(null);
      this.meldung.set(null);
    });
  }

  protected durchsuchen(): Promise<void> {
    return this.tun(async () => {
      const h = this.ordner()!;
      if (!(await ordnerErlaubnis(h))) throw new Error('Kein Zugriff erlaubt.');
      this.meldung.set(null);
      this.funde.set(null);
      const melden = (s: Stand) => this.stand.set(s);
      const dateien = await ordnerDateien(h, (n, ordner) => melden({ text: `Durchsuchen: ${ordner} – ${n} ${n === 1 ? 'Datei' : 'Dateien'} gefunden` }));
      this.funde.set(await sichten(dateien, melden));
    });
  }

  protected gewaehlt(e: Event): Promise<void> {
    const feld = e.target as HTMLInputElement;
    const dateien = [...(feld.files ?? [])];
    feld.value = '';
    return this.tun(async () => {
      if (!dateien.length) return;
      this.meldung.set(null);
      this.funde.set(null);
      this.funde.set(await sichten(dateienAlsQuellen(dateien), (s) => this.stand.set(s)));
    });
  }

  // Sichern: verbundener Ordner → Unterordner „Backstage“; sonst Teilen/Speichern (dort OneDrive wählen)
  protected sichern(): Promise<void> {
    return this.tun(async () => {
      const b = backstageDatei();
      if (this.mitNoten()) this.stand.set({ text: 'Notenblätter werden zusammengestellt …' });
      const n = this.mitNoten() ? await notenExportieren() : null;
      if (!b.anzahl && !n) {
        this.meldung.set({ text: 'Noch nichts gespeichert, was sich sichern ließe.', fehler: true });
        return;
      }
      const h = this.ordner();
      if (h) {
        if (!(await ordnerErlaubnis(h, true))) throw new Error('Schreiben nicht erlaubt.');
        const gesamt = (b.anzahl ? 1 : 0) + (n ? 1 : 0);
        this.stand.set({ text: `Sichern: ${b.anzahl ? b.name : n!.name}`, fertig: 0, gesamt });
        if (b.anzahl) await ordnerSchreiben(h, 'Backstage', b.name, new Blob([b.text], { type: 'application/json' }));
        if (n) {
          this.stand.set({ text: `Sichern: ${n.name}`, fertig: b.anzahl ? 1 : 0, gesamt });
          await ordnerSchreiben(h, 'Backstage', n.name, n);
        }
        gesichert();
        this.meldung.set({ text: `In „${h.name}/Backstage“ gesichert ✓${n ? ' (mit Notenblättern)' : ''}` });
        return;
      }
      if (b.anzahl && (await backupTeilen(JSON.parse(b.text).data, 'alle')) !== null) gesichert();
      if (n) {
        const url = URL.createObjectURL(n);
        Object.assign(document.createElement('a'), { href: url, download: n.name }).click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      this.meldung.set({ text: 'Gesichert ✓ – am besten im OneDrive-Ordner ablegen.' });
    });
  }
}
