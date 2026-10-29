import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { SyncService } from '../data/sync.service';
import { GESICHERT_KEY, backupDateien, backupEinlesen, backupGemerkt } from './backstage-sync';

// Backstage → Einstellungen → Backup: alle Backstage-Daten dieses Geräts (Setlists, Packlisten, Vor Ort, Proben, Sterne,
// Werbeplan, Nachbereitungen, Songs-Entwurf) und die Notenblätter (PDFs, Akkordblätter, Markierungen) sichern und
// wiederherstellen. Mit eingerichteter Synchronisation landet das Backup im Unterordner „Backup“ des OneDrive-Ordners,
// sonst als Datei (Teilen bzw. Download). Ältere Noten-Backups werden dort ersetzt (sie sind groß).
const ORDNER = 'Backup';
const NOTEN_BACKUP = /^(?:Backup|Backstage)\/blickfeld-nord-(?:backup-)?noten-.*\.json$/;
const DATEN_BACKUP = /^(?:Backup|Backstage)\/blickfeld-nord-(?:backup|backstage-alle)-\d{4}-\d{2}-\d{2}\.json$/;

@Component({
  selector: 'app-backup-karte',
  imports: [MatIconModule],
  template: `
    <div class="box">
      <h3><mat-icon>backup</mat-icon> Backup</h3>
      <p>Alle Backstage-Daten dieses Geräts (Setlists, Packlisten, Vor Ort, Proben, Sterne, Werbeplan, Nachbereitungen) und
        die Notenblätter. {{ sync.bereit() ? 'Landet im OneDrive-Ordner der Synchronisation unter „Backup“.' : 'Ohne Synchronisation als Datei zum Teilen oder Speichern.' }}
        Mitschnitte und Einstellungen gehören nicht dazu.</p>
      <p class="zuletzt" [class.alt]="!zuletzt()">{{ zuletzt() ? 'Letztes Backup: ' + zuletzt() : 'Noch kein Backup auf diesem Gerät.' }}</p>
      <div class="knoepfe">
        <button type="button" class="primaer" (click)="erstellen()" [disabled]="laeuft()"><mat-icon>backup</mat-icon> Backup erstellen</button>
        @if (sync.bereit()) {
          <button type="button" (click)="ausOneDrive()" [disabled]="laeuft()"><mat-icon>cloud_download</mat-icon> Aus OneDrive wiederherstellen</button>
          <button type="button" (click)="alsDatei()" [disabled]="laeuft()"><mat-icon>ios_share</mat-icon> Als Datei teilen</button>
        }
        <label class="knopf"><mat-icon>restore</mat-icon> Aus Datei wiederherstellen
          <input type="file" accept=".json,application/json" multiple (change)="ausDatei($event, false)" [disabled]="laeuft()" />
        </label>
      </div>
      <details>
        <summary>Alles ersetzen statt ergänzen</summary>
        <p>Wie „Aus Datei wiederherstellen“, aber alle bisherigen Backstage-Daten werden vorher gelöscht – danach hat dieses
          Gerät genau den Stand des Backups (z. B. ein neues Handy auf den Stand eines anderen bringen).</p>
        <label class="knopf"><mat-icon>sync_alt</mat-icon> Datei wählen und ersetzen
          <input type="file" accept=".json,application/json" multiple (change)="ausDatei($event, true)" [disabled]="laeuft()" />
        </label>
      </details>
      @if (meldung(); as m) { <p class="meldung" [class.fehler]="m.fehler" role="status">{{ m.text }}</p> }
    </div>
  `,
  styles: `
    .box { margin-top: 20px; padding: 20px 24px; border-radius: 12px; border: 1px solid var(--bn-line); }
    h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-family: var(--bn-wide); font-weight: 400; text-transform: uppercase; letter-spacing: .14em; font-size: .85rem; }
    p { margin: 0 0 10px; max-width: 720px; font-size: .88rem; line-height: 1.55; color: var(--bn-fog); }
    .zuletzt { color: #5fb88a; }
    .zuletzt.alt { color: #e0b25a; }
    .knoepfe { display: flex; flex-wrap: wrap; gap: 8px 12px; }
    button, .knopf { position: relative; display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; font-size: .86rem; cursor: pointer; }
    button:hover:not(:disabled), .knopf:hover, .knopf:focus-within { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    button:disabled { opacity: .4; cursor: default; }
    button.primaer { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    .knopf input { position: absolute; width: 1px; height: 1px; opacity: 0; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
    details { margin-top: 14px; font-size: .88rem; }
    summary { cursor: pointer; color: var(--bn-fog); margin-bottom: 8px; }
    .meldung { margin: 12px 0 0; color: #5fb88a; }
    .meldung.fehler { color: #e07a5a; }
  `,
})
export class BackupKarte {
  protected readonly sync = inject(SyncService);
  private readonly band = inject(BandService);
  protected readonly laeuft = signal(false);
  protected readonly meldung = signal<{ text: string; fehler?: boolean } | null>(null);
  protected readonly zuletzt = signal(this.letztes());

  private letztes(): string {
    try {
      const t = Number(localStorage.getItem(GESICHERT_KEY));
      return t ? new Date(t).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : '';
    } catch {
      return '';
    }
  }

  private async tun(arbeit: () => Promise<string | null>): Promise<void> {
    this.laeuft.set(true);
    this.meldung.set(null);
    try {
      const text = await arbeit();
      if (text) this.meldung.set({ text });
    } catch (err) {
      this.meldung.set({ text: (err as Error).message || 'Das hat nicht geklappt.', fehler: true });
    } finally {
      this.laeuft.set(false);
      this.zuletzt.set(this.letztes());
    }
  }

  private async dateien(): Promise<File[]> {
    this.meldung.set({ text: 'Backup wird zusammengestellt …' });
    const { backup, noten } = await backupDateien();
    const liste = [backup, noten].filter((f): f is File => !!f);
    if (!liste.length) throw new Error('Noch nichts gespeichert, was sich sichern ließe.');
    return liste;
  }

  // mit Synchronisation: in den Ordner „Backup“ legen und gleich abgleichen; sonst als Datei
  protected erstellen(): Promise<void> {
    if (!this.sync.bereit()) return this.alsDatei();
    return this.tun(async () => {
      const o = await this.sync.lokal(true);
      if (!o) throw new Error('Kein Zugriff auf den lokalen Ordner – unter Synchronisation wählen.');
      const liste = await this.dateien();
      const neu = new Set(liste.map((f) => `${ORDNER}/${f.name}`));
      // ältere Noten-Backups ersetzen statt ansammeln
      if (liste.some((f) => f.name.includes('-noten-'))) {
        for (const alt of await o.liste()) if (NOTEN_BACKUP.test(alt.pfad) && !neu.has(alt.pfad)) await o.loeschen(alt.pfad);
      }
      for (const f of liste) await o.schreiben(`${ORDNER}/${f.name}`, f);
      backupGemerkt();
      this.zuletzt.set(this.letztes());
      this.meldung.set({ text: 'Backup erstellt – wird jetzt mit OneDrive abgeglichen …' });
      await this.sync.jetzt();
      return 'Backup erstellt und in OneDrive unter „Backup“ abgelegt ✓';
    });
  }

  protected alsDatei(): Promise<void> {
    return this.tun(async () => {
      const liste = await this.dateien();
      if (navigator.canShare?.({ files: liste })) {
        try {
          await navigator.share({ files: liste, title: 'Blickfeld Nord – Backup' });
          backupGemerkt();
          return 'Backup geteilt ✓';
        } catch (e) {
          if ((e as Error).name === 'AbortError') return null;
        }
      }
      for (const f of liste) {
        const url = URL.createObjectURL(f);
        Object.assign(document.createElement('a'), { href: url, download: f.name }).click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      backupGemerkt();
      return `Backup gespeichert (${liste.map((f) => f.name).join(', ')}) ✓`;
    });
  }

  private readonly auftritte = () => new Map(this.band.shows.map((s) => [this.band.showId(s), s.venue]));

  private async einlesen(texte: string[], ersetzen: boolean): Promise<string | null> {
    // Notenpaket zuerst, dann die Daten – bei „ersetzen“ betrifft das Löschen nur die Daten
    const sortiert = [...texte].sort((a, b) => Number(b.includes('"blickfeld-nord-noten"')) - Number(a.includes('"blickfeld-nord-noten"')));
    const meldungen: string[] = [];
    for (const t of sortiert) {
      const m = await backupEinlesen(t, ersetzen, this.auftritte());
      if (m === null) return meldungen.length ? meldungen.join(' · ') : null;
      meldungen.push(m);
    }
    if (meldungen.some((m) => m.startsWith('Backup übernommen'))) setTimeout(() => location.reload(), 1200);
    return meldungen.join(' · ');
  }

  protected ausDatei(event: Event, ersetzen: boolean): Promise<void> {
    const feld = event.target as HTMLInputElement;
    const dateien = [...(feld.files ?? [])];
    feld.value = '';
    if (!dateien.length) return Promise.resolve();
    return this.tun(async () => {
      try {
        return await this.einlesen(await Promise.all(dateien.map((d) => d.text())), ersetzen);
      } catch {
        throw new Error('Das ist kein Backup von Blickfeld Nord.');
      }
    });
  }

  // neuestes Backup (und Noten-Backup) aus dem synchronisierten Ordner – auch die früheren „Backstage“-Sicherungen
  protected ausOneDrive(): Promise<void> {
    return this.tun(async () => {
      await this.sync.jetzt();
      const o = await this.sync.lokal();
      if (!o) throw new Error('Kein Zugriff auf den lokalen Ordner – unter Synchronisation wählen.');
      const alle = await o.liste();
      const neuestes = (re: RegExp) => alle.filter((d) => re.test(d.pfad)).sort((a, b) => (b.pfad.slice(-15) + b.geaendert).localeCompare(a.pfad.slice(-15) + a.geaendert))[0];
      const gefunden = [neuestes(NOTEN_BACKUP), neuestes(DATEN_BACKUP)].filter((d) => !!d);
      if (!gefunden.length) throw new Error('Im OneDrive-Ordner liegt noch kein Backup.');
      const texte = await Promise.all(gefunden.map(async (d) => (await o.lesen(d.pfad)).text()));
      return this.einlesen(texte, false);
    });
  }
}
