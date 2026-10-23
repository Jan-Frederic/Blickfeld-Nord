import { Component, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

// Backstage-Daten (Setlists, Packlisten, Vor-Ort-Angaben, Probenplanung, Song-Sterne) liegen nur im Browser des jeweiligen Geräts.
// Damit alle in der Band denselben Stand haben: als Datei exportieren bzw. per WhatsApp & Co. teilen
// und auf dem anderen Gerät importieren. Ohne Server – die Datei geht direkt von Gerät zu Gerät.

const PREFIXES = ['bn-setlist-', 'bn-packliste-', 'bn-vorort-', 'bn-probe-', 'bn-bewertung-'];
const APP = 'blickfeld-nord-backstage';

interface Backup {
  app: typeof APP;
  version: 1;
  exported: string;
  data: Record<string, unknown>;
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
  protected readonly message = signal<{ text: string; error?: boolean } | null>(null);

  // Datei bauen und übers Teilen-Menü verschicken (z. B. WhatsApp-Gruppe) – sonst als Download
  protected async send(): Promise<void> {
    const data = collect(this.show());
    const count = Object.keys(data).length;
    if (!count) {
      this.message.set({ text: 'Noch nichts gespeichert, was sich teilen ließe.', error: true });
      return;
    }
    const backup: Backup = { app: APP, version: 1, exported: new Date().toISOString(), data };
    const name = `blickfeld-nord-backstage-${this.show() ?? 'alle'}-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([JSON.stringify(backup, null, 1)], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Blickfeld Nord – Backstage', text: 'Backstage-Daten zum Importieren (Backstage → Datei importieren)' });
        this.message.set({ text: `${count} ${count === 1 ? 'Liste' : 'Listen'} geteilt.` });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(file);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.message.set({ text: `${count} ${count === 1 ? 'Liste' : 'Listen'} als Datei gespeichert – jetzt an die Band schicken.` });
  }

  // Datei einlesen: nur bekannte Backstage-Einträge übernehmen, vorhandene werden überschrieben
  protected async load(event: Event): Promise<void> {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text()) as Partial<Backup>;
      if (backup.app !== APP || !backup.data) throw new Error();
      const entries = Object.entries(backup.data).filter(([k]) => PREFIXES.some((p) => k.startsWith(p)));
      if (!entries.length) throw new Error();
      if (!confirm(`${entries.length} ${entries.length === 1 ? 'Liste' : 'Listen'} übernehmen? Vorhandene Einträge für dieselben Auftritte werden ersetzt.`)) return;
      for (const [k, v] of entries) {
        // Sterne mehrerer Geräte zusammenführen statt ersetzen – bei demselben Song gilt die importierte Bewertung
        const alt = k.startsWith('bn-bewertung-') ? JSON.parse(localStorage.getItem(k) ?? '{}') : {};
        localStorage.setItem(k, JSON.stringify(k.startsWith('bn-bewertung-') ? { ...alt, ...(v as object) } : v));
      }
      this.message.set({ text: 'Übernommen – Seite wird neu geladen …' });
      setTimeout(() => location.reload(), 600);
    } catch {
      this.message.set({ text: 'Das ist keine Backstage-Datei von Blickfeld Nord.', error: true });
    }
  }
}
