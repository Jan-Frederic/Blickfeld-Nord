import { Component, inject, input, signal } from '@angular/core';
import { BandService } from '../data/band.service';
import { vorschau, vorschauText } from '../data/aufraeumen';
import { MatIconModule } from '@angular/material/icon';
import { NOTEN_APP, notenImportieren } from '../data/noten';

// Backstage-Daten (Setlists, Packlisten, Vor-Ort-Angaben, Probenplanung, Song-Sterne) liegen nur im Browser des jeweiligen Geräts.
// Damit alle in der Band denselben Stand haben: als Datei exportieren bzw. per WhatsApp & Co. teilen
// und auf dem anderen Gerät importieren. Ohne Server – die Datei geht direkt von Gerät zu Gerät.

export const PREFIXES = ['bn-setlist-', 'bn-packliste-', 'bn-vorort-', 'bn-probe-', 'bn-bewertung-', 'bn-ui-geprueft', 'bn-werbeplan-', 'bn-songinfo-entwurf', 'bn-nachbereitung-'];
// Zeitpunkt der letzten vollständigen Sicherung („Alles an die Band schicken“) – für den Hinweis unter Aufgaben
export const GESICHERT_KEY = 'bn-gesichert';

/** Tage seit der letzten vollständigen Sicherung; null = noch nie; undefined = nichts zu sichern */
export function tageSeitSicherung(): number | null | undefined {
  try {
    if (!Object.keys(collect()).length) return undefined;
    const zuletzt = Number(localStorage.getItem(GESICHERT_KEY));
    return zuletzt ? Math.floor((Date.now() - zuletzt) / 864e5) : null;
  } catch {
    return undefined;
  }
}

function merken(show?: string): void {
  if (show) return;
  try {
    localStorage.setItem(GESICHERT_KEY, String(Date.now()));
  } catch {
    // ohne Speicher eben ohne Erinnerung
  }
}
export const APP = 'blickfeld-nord-backstage';

interface Backup {
  app: typeof APP;
  version: 1;
  exported: string;
  data: Record<string, unknown>;
}

/** Backstage-Datei bauen und übers Teilen-Menü verschicken, sonst herunterladen; true = geteilt, false = gespeichert, null = abgebrochen */
export async function backupTeilen(data: Record<string, unknown>, teil: string): Promise<boolean | null> {
  const backup: Backup = { app: APP, version: 1, exported: new Date().toISOString(), data };
  const name = `blickfeld-nord-backstage-${teil}-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([JSON.stringify(backup, null, 1)], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Blickfeld Nord – Backstage', text: 'Backstage-Daten zum Importieren (Backstage → Datei importieren)' });
      return true;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return null;
    }
  }
  const url = URL.createObjectURL(file);
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return false;
}

/** Einträge einer Backstage-Datei (nur bekannte Bereiche); wirft bei fremden Dateien */
export function backupEintraege(text: string): [string, unknown][] {
  const backup = JSON.parse(text) as Partial<Backup>;
  if (backup.app !== APP || !backup.data) throw new Error('keine Backstage-Datei');
  return Object.entries(backup.data).filter(([k]) => PREFIXES.some((p) => k.startsWith(p)));
}

/**
 * Backstage-Datei übernehmen: ergänzen (gleiche Einträge werden ersetzt, Sterne zusammengeführt) oder mit
 * ersetzen=true alle bisherigen Backstage-Einträge vorher löschen. Anzahl übernommener Einträge.
 */
export function backstageImportieren(text: string, ersetzen = false): number {
  const eintraege = backupEintraege(text);
  if (ersetzen) {
    const alt = Object.keys(localStorage).filter((k) => PREFIXES.some((p) => k.startsWith(p)));
    for (const k of alt) localStorage.removeItem(k);
  }
  for (const [k, v] of eintraege) {
    // Sterne mehrerer Geräte zusammenführen statt ersetzen – bei demselben Song gilt die importierte Bewertung
    const alt = !ersetzen && k.startsWith('bn-bewertung-') ? JSON.parse(localStorage.getItem(k) ?? '{}') : {};
    localStorage.setItem(k, JSON.stringify(k.startsWith('bn-bewertung-') ? { ...alt, ...(v as object) } : v));
  }
  return eintraege.length;
}

/** alle Backstage-Einträge dieses Geräts als Datei-Inhalt (für OneDrive) */
export function backstageDatei(): { name: string; text: string; anzahl: number } {
  const data = collect();
  const backup: Backup = { app: APP, version: 1, exported: new Date().toISOString(), data };
  return { name: `blickfeld-nord-backstage-alle-${new Date().toISOString().slice(0, 10)}.json`, text: JSON.stringify(backup, null, 1), anzahl: Object.keys(data).length };
}

/** nach einer Sicherung (Teilen, OneDrive) merken – für den Hinweis unter Aufgaben */
export function gesichert(): void {
  merken();
}

function collect(show?: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    const prefix = PREFIXES.find((p) => key.startsWith(p));
    if (!prefix || (show && key !== prefix + show)) continue;
    try {
      data[key] = JSON.parse(localStorage.getItem(key)!);
    } catch {
      // kaputter Eintrag – nicht mitnehmen
    }
  }
  return data;
}

@Component({
  selector: 'app-backstage-sync',
  imports: [MatIconModule],
  template: `
    <div class="sync">
      <button type="button" (click)="send()"><mat-icon>ios_share</mat-icon> {{ show() ? 'Diesen Termin an die Band' : 'Alles an die Band schicken' }}</button>
      <label class="import">
        <mat-icon>file_open</mat-icon> Datei importieren
        <input type="file" accept=".json,application/json" (change)="load($event)" />
      </label>
      @if (message(); as m) { <span class="msg" [class.err]="m.error" role="status">{{ m.text }}</span> }
    </div>
  `,
  styles: `
    .sync { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; }
    button, .import {
      display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; cursor: pointer;
      border: 1px solid var(--bn-line); background: transparent; color: var(--bn-ink); font: inherit; font-size: .88rem;
    }
    button:hover, .import:hover, .import:focus-within { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .import input { position: absolute; width: 1px; height: 1px; opacity: 0; }
    .msg { font-size: .85rem; color: #7fc29b; }
    .msg.err { color: #e07a5a; }
  `,
})
export class BackstageSync {
  /** optional: nur diesen Auftritt austauschen (ID), sonst alles */
  readonly show = input<string>();
  private readonly band = inject(BandService);
  protected readonly message = signal<{ text: string; error?: boolean } | null>(null);

  // Datei bauen und übers Teilen-Menü verschicken (z. B. WhatsApp-Gruppe) – sonst als Download
  protected async send(): Promise<void> {
    const data = collect(this.show());
    const count = Object.keys(data).length;
    if (!count) {
      this.message.set({ text: 'Noch nichts gespeichert, was sich teilen ließe.', error: true });
      return;
    }
    const geteilt = await backupTeilen(data, this.show() ?? 'alle');
    if (geteilt === null) return;
    merken(this.show());
    if (geteilt) {
      this.message.set({ text: `${count} ${count === 1 ? 'Liste' : 'Listen'} geteilt.` });
      return;
    }
    this.message.set({ text: `${count} ${count === 1 ? 'Liste' : 'Listen'} als Datei gespeichert – jetzt an die Band schicken.` });
  }

  // Datei einlesen: nur bekannte Backstage-Einträge übernehmen, vorhandene werden überschrieben
  protected async load(event: Event): Promise<void> {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const backup = JSON.parse(text) as Partial<Backup> | { app: typeof NOTEN_APP };
      // Notenblatt-Datei (Backstage → Songs → „Notenblätter an die Band“) auch hier annehmen
      if (backup.app === NOTEN_APP) {
        const n = await notenImportieren(text);
        this.message.set({ text: `Noten für ${n} ${n === 1 ? 'Song' : 'Songs'} übernommen ✓` });
        return;
      }
      const eintraege = backupEintraege(text);
      if (!eintraege.length) throw new Error();
      // Vorschau: was neu ist und was sich ändert
      const v = vorschau(eintraege, new Map(this.band.shows.map((s) => [this.band.showId(s), s.venue])));
      const zeilen = [...v.neu.map((e) => `+ ${e.titel}`), ...v.geaendert.map((e) => `~ ${e.titel}: ${e.was}`)];
      const liste = zeilen.slice(0, 12).join('\n') + (zeilen.length > 12 ? `\n… und ${zeilen.length - 12} weitere` : '');
      if (!v.neu.length && !v.geaendert.length) {
        this.message.set({ text: 'Nichts Neues – alles ist schon auf dem Stand der Datei.' });
        return;
      }
      if (!confirm(`Übernehmen? ${vorschauText(v)}.\n\n${liste}`)) return;
      backstageImportieren(text);
      this.message.set({ text: 'Übernommen – Seite wird neu geladen …' });
      setTimeout(() => location.reload(), 600);
    } catch {
      this.message.set({ text: 'Das ist keine Backstage-Datei von Blickfeld Nord.', error: true });
    }
  }
}
