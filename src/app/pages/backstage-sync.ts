import { Component, inject, input, signal } from '@angular/core';
import { BandService } from '../data/band.service';
import { vorschau, vorschauText } from '../data/aufraeumen';
import { MatIconModule } from '@angular/material/icon';
import { NOTEN_APP, notenExportieren, notenImportieren } from '../data/noten';

// Backstage-Daten (Setlists, Packlisten, Vor-Ort-Angaben, Probenplanung, Song-Sterne …) liegen nur im Browser des
// jeweiligen Geräts. Backup (Einstellungen → Backup, backup-karte.ts): alles samt Notenblättern als Datei bzw. in den
// OneDrive-Ordner der Synchronisation. Die Komponente unten teilt einzelne Auftritte bzw. Proben mit der Band.

export const PREFIXES = ['bn-setlist-', 'bn-packliste-', 'bn-vorort-', 'bn-probe-', 'bn-bewertung-', 'bn-ui-geprueft', 'bn-werbeplan-', 'bn-songinfo-entwurf', 'bn-nachbereitung-'];
// Zeitpunkt des letzten Backups – für den Hinweis unter Aufgaben und in der Backup-Kachel
export const GESICHERT_KEY = 'bn-gesichert';

/** Tage seit dem letzten Backup; null = noch nie; undefined = nichts zu sichern */
export function tageSeitBackup(): number | null | undefined {
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

/** Datei mit Backstage-Daten bauen und übers Teilen-Menü verschicken, sonst herunterladen; true = geteilt, false = gespeichert, null = abgebrochen */
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

/** Einträge eines Backups (nur bekannte Bereiche); wirft bei fremden Dateien */
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

/** Backup dieses Geräts als Dateien: Backstage-Daten und Notenblätter (je null, wenn es nichts gibt) */
export async function backupDateien(): Promise<{ backup: File | null; noten: File | null; anzahl: number }> {
  const data = collect();
  const anzahl = Object.keys(data).length;
  const tag = new Date().toISOString().slice(0, 10);
  const inhalt: Backup = { app: APP, version: 1, exported: new Date().toISOString(), data };
  const backup = anzahl ? new File([JSON.stringify(inhalt, null, 1)], `blickfeld-nord-backup-${tag}.json`, { type: 'application/json' }) : null;
  const n = await notenExportieren();
  const noten = n ? new File([n], `blickfeld-nord-backup-noten-${tag}.json`, { type: 'application/json' }) : null;
  return { backup, noten, anzahl };
}

/** Backup bzw. Notenpaket aus einer Datei übernehmen – mit Vorschau und Rückfrage; Text für die Meldung, null = abgebrochen */
export async function backupEinlesen(text: string, ersetzen: boolean, auftritte: Map<string, string>): Promise<string | null> {
  const inhalt = JSON.parse(text) as Partial<Backup> | { app: typeof NOTEN_APP };
  if (inhalt.app === NOTEN_APP) {
    const n = await notenImportieren(text);
    return `Notenblätter für ${n} ${n === 1 ? 'Song' : 'Songs'} übernommen`;
  }
  const eintraege = backupEintraege(text);
  const v = vorschau(eintraege, auftritte);
  const zeilen = [...v.neu.map((e) => `+ ${e.titel}`), ...v.geaendert.map((e) => `~ ${e.titel}: ${e.was}`)];
  const liste = zeilen.slice(0, 12).join('\n') + (zeilen.length > 12 ? `\n… und ${zeilen.length - 12} weitere` : '');
  if (ersetzen) {
    const alt = Object.keys(localStorage).filter((k) => PREFIXES.some((p) => k.startsWith(p))).length;
    if (!confirm(`${alt} vorhandene Einträge löschen und durch ${eintraege.length} aus dem Backup ersetzen?`)) return null;
  } else {
    if (!v.neu.length && !v.geaendert.length) return 'Nichts Neues – alles ist schon auf dem Stand des Backups';
    if (!confirm(`Übernehmen? ${vorschauText(v)}.\n\n${liste}`)) return null;
  }
  backstageImportieren(text, ersetzen);
  return `Backup übernommen (${eintraege.length} Einträge)`;
}

/** nach einem Backup (Datei, OneDrive) merken – für den Hinweis unter Aufgaben */
export function backupGemerkt(): void {
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
      const ergebnis = await backupEinlesen(text, false, new Map(this.band.shows.map((s) => [this.band.showId(s), s.venue])));
      if (!ergebnis) return;
      this.message.set({ text: `${ergebnis} – Seite wird neu geladen …` });
      setTimeout(() => location.reload(), 600);
    } catch {
      this.message.set({ text: 'Das ist keine Datei von Blickfeld Nord.', error: true });
    }
  }
}
