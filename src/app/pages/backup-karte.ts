import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { SyncService } from '../data/sync.service';
import { GESICHERT_KEY, backupDatei, backupEinlesen, backupGemerkt } from './backstage-sync';
import { mb } from '../data/aufraeumen';
import { BACKUP_BEHALTEN, BACKUP_ORDNER, DATEN_BACKUP, NOTEN_BACKUP, backupZeit, backupsSortiert, backupsZuLoeschen } from '../data/backup-regeln';

// Backstage → Einstellungen → Backup: alles dieses Geräts in einer Datei sichern und wiederherstellen – Backstage-Daten
// (Setlists, Packlisten, Vor Ort, Proben, Sterne, Werbeplan, Nachbereitungen, Songs-Entwurf …), Einstellungen und
// Notenblätter (PDFs, Akkordblätter, Markierungen). Mit eingerichteter Synchronisation landet das Backup im Unterordner
// „Backup“ des OneDrive-Ordners, sonst als Datei (Teilen bzw. Download). Dort bleiben Backups ein halbes Jahr, die
// letzten 5 aber immer (backup-regeln.ts); ältere werden beim nächsten Backup gelöscht.
const datum = (t: number) => (t ? new Date(t).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : '');

@Component({
  selector: 'app-backup-karte',
  imports: [MatIconModule],
  template: `
    <div class="box">
      <h3><mat-icon>backup</mat-icon> Backup</h3>
      <p>Immer alles in einer Datei: Backstage-Daten (Setlists, Packlisten, Vor Ort, Proben, Sterne, Werbeplan,
        Nachbereitungen …), Einstellungen und Notenblätter samt Markierungen. {{ sync.bereit() ? 'Landet im OneDrive-Ordner der Synchronisation unter „Backup“ – dort bleibt jedes Backup ein halbes Jahr, die letzten ' + behalten + ' immer.' : 'Ohne Synchronisation als Datei zum Teilen oder Speichern.' }}
        Proben-Mitschnitte gehören nicht dazu (zu groß).</p>
      <p class="zuletzt" [class.alt]="!zuletzt()">{{ zuletzt() ? 'Letztes Backup von diesem Gerät: ' + zuletzt() : 'Noch kein Backup auf diesem Gerät.' }}</p>
      @if (sync.bereit() && inOneDrive() !== undefined) {
        <p class="zuletzt" [class.alt]="!inOneDrive()">{{ inOneDrive() ? 'Neuestes Backup in OneDrive: ' + inOneDrive() : 'In OneDrive liegt noch kein Backup.' }}</p>
      }
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
      @if (sync.bereit() && vorhanden().length) {
        <details class="liste">
          <summary>Backups in OneDrive ({{ vorhanden().length }})</summary>
          <ul>
            @for (d of vorhanden(); track d.pfad) {
              <li>
                <span><b>{{ d.datum }}</b> {{ d.art }} <small>{{ d.name }} · {{ d.groesse }}</small></span>
                <button type="button" (click)="ausListe(d.pfad)" [disabled]="laeuft()"><mat-icon>restore</mat-icon> Wiederherstellen</button>
              </li>
            }
          </ul>
          <p class="klein">Ergänzt die Daten dieses Geräts – vorher zeigt eine Rückfrage, was neu ist und was sich ändert.</p>
        </details>
      }
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
    .liste ul { list-style: none; margin: 0 0 8px; padding: 0; display: grid; gap: 6px; }
    .liste li { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 12px; padding: 6px 0; border-bottom: 1px solid var(--bn-line); font-size: .86rem; }
    .liste li span { overflow-wrap: anywhere; } .liste small, .klein { color: var(--bn-fog); font-size: .8rem; }
    .meldung.fehler { color: #e07a5a; }
  `,
})
export class BackupKarte {
  protected readonly sync = inject(SyncService);
  private readonly band = inject(BandService);
  protected readonly laeuft = signal(false);
  protected readonly meldung = signal<{ text: string; fehler?: boolean } | null>(null);
  protected readonly zuletzt = signal(this.letztes());
  /** neuestes Backup im Ordner „Backup“ des Sync-Ordners (Datum, Dateiname); '' = keins; undefined = unbekannt */
  protected readonly inOneDrive = signal<string | undefined>(undefined);
  /** alle Backups im Ordner „Backup“ (auch frühere „Backstage“-Sicherungen und Notenpakete), neueste zuerst */
  protected readonly vorhanden = signal<{ pfad: string; name: string; art: string; datum: string; groesse: string }[]>([]);
  protected readonly behalten = BACKUP_BEHALTEN;

  constructor() {
    void this.oneDriveStand();
  }

  private async oneDriveStand(): Promise<void> {
    if (!this.sync.bereit()) return;
    try {
      const o = await this.sync.lokal();
      if (!o) return;
      const alle = backupsSortiert(await o.liste());
      // frühere Backups: Daten und Notenblätter getrennt; heutige (mit Uhrzeit im Namen) enthalten alles
      const art = (pfad: string) => (NOTEN_BACKUP.test(pfad) ? 'nur Notenblätter (früher)' : /-\d{4}\.json$/.test(pfad) ? 'alles' : 'nur Daten (früher)');
      this.vorhanden.set(alle.map((x) => ({ pfad: x.pfad, name: x.pfad.split('/').at(-1)!, art: art(x.pfad), datum: datum(backupZeit(x)), groesse: mb(x.groesse) })));
      const d = alle.find((x) => DATEN_BACKUP.test(x.pfad));
      this.inOneDrive.set(d ? `${datum(backupZeit(d))} (${d.pfad.split('/').at(-1)})` : '');
    } catch {
      // ohne Zugriff auf den Ordner bleibt es unbekannt
    }
  }

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
      void this.oneDriveStand();
    }
  }

  private async dateien(): Promise<File[]> {
    this.meldung.set({ text: 'Backup wird zusammengestellt …' });
    const { datei } = await backupDatei();
    if (!datei) throw new Error('Noch nichts gespeichert, was sich sichern ließe.');
    return [datei];
  }

  // mit Synchronisation: in den Ordner „Backup“ legen und gleich abgleichen; sonst als Datei
  protected erstellen(): Promise<void> {
    if (!this.sync.bereit()) return this.alsDatei();
    return this.tun(async () => {
      const o = await this.sync.lokal(true);
      if (!o) throw new Error('Kein Zugriff auf den lokalen Ordner – unter Synchronisation wählen.');
      const liste = await this.dateien();
      for (const f of liste) await o.schreiben(`${BACKUP_ORDNER}/${f.name}`, f);
      // Aufbewahrung: älter als ein halbes Jahr weg, die letzten 5 bleiben immer (Löschen geht beim Abgleich mit)
      const weg = backupsZuLoeschen(await o.liste());
      for (const alt of weg) await o.loeschen(alt.pfad);
      backupGemerkt();
      this.zuletzt.set(this.letztes());
      void this.oneDriveStand();
      this.meldung.set({ text: 'Backup erstellt – wird jetzt mit OneDrive abgeglichen …' });
      await this.sync.jetzt();
      return `Backup erstellt und in OneDrive unter „Backup“ abgelegt ✓${weg.length ? ` · ${weg.length} ${weg.length === 1 ? 'altes Backup' : 'alte Backups'} (über ein halbes Jahr) gelöscht` : ''}`;
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
    // frühere getrennte Backups: Notenpaket zuerst, dann die Daten – bei „ersetzen“ betrifft das Löschen nur die Daten
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

  /** ein bestimmtes Backup aus der Liste (ergänzen, mit Vorschau-Rückfrage) */
  protected ausListe(pfad: string): Promise<void> {
    return this.tun(async () => {
      const o = await this.sync.lokal();
      if (!o) throw new Error('Kein Zugriff auf den lokalen Ordner – unter Synchronisation wählen.');
      return this.einlesen([await (await o.lesen(pfad)).text()], false);
    });
  }

  // neuestes Backup aus dem synchronisierten Ordner (bei früheren, getrennten Backups dazu das neueste Notenpaket)
  protected ausOneDrive(): Promise<void> {
    return this.tun(async () => {
      await this.sync.jetzt();
      const o = await this.sync.lokal();
      if (!o) throw new Error('Kein Zugriff auf den lokalen Ordner – unter Synchronisation wählen.');
      const alle = backupsSortiert(await o.liste());
      const daten = alle.find((d) => DATEN_BACKUP.test(d.pfad));
      const noten = daten && /-\d{4}\.json$/.test(daten.pfad) ? undefined : alle.find((d) => NOTEN_BACKUP.test(d.pfad));
      const gefunden = [noten, daten].filter((d) => !!d);
      if (!gefunden.length) throw new Error('Im OneDrive-Ordner liegt noch kein Backup.');
      const texte = await Promise.all(gefunden.map(async (d) => (await o.lesen(d.pfad)).text()));
      return this.einlesen(texte, false);
    });
  }
}
