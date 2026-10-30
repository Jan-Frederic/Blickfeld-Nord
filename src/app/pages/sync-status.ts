import { Component, inject, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Fund, sichten } from '../data/einlesen';
import { mb } from '../data/aufraeumen';
import { SyncDatei } from '../data/sync';
import { SyncService } from '../data/sync.service';
import { cloudName, syncEinstellungen } from '../data/sync-ordner';
import { Fortschritt } from './fortschritt';
import { FundeListe } from './funde-liste';
import { SyncKonflikte } from './sync-konflikte';

// Backstage → Abgleich → Synchronisation: Stand des letzten Abgleichs OneDrive ↔ lokal, „Jetzt synchronisieren“
// mit Fortschritt, die lokalen Dateien (zum Öffnen, auch offline) und das Einlesen der synchronisierten Dateien
// (Backups, Notenpakete, PDFs, .pro). Eingerichtet wird unter Backstage → Einstellungen, das Backup ebenfalls dort.
@Component({
  selector: 'app-sync-status',
  imports: [RouterLink, MatIconModule, Fortschritt, FundeListe, SyncKonflikte],
  template: `
    <div class="box">
      <h3><mat-icon>sync</mat-icon> Synchronisation OneDrive ↔ lokal</h3>
      @if (!sync.bereit()) {
        <p>Einen OneDrive-Ordner mit einem lokalen Ordner abgleichen – in beide Richtungen, automatisch.
          <a routerLink="/backstage/einstellungen">In den Einstellungen einrichten</a>.</p>
      } @else {
        <p>OneDrive „{{ cloudName(e) }}“ ↔ {{ e.lokal === 'app' ? 'Speicher dieser App' : 'Ordner auf diesem Computer' }}
          · {{ e.richtung === 'beide' ? 'beide Richtungen' : e.richtung === 'runter' ? 'nur herunter' : 'nur hoch' }}{{ e.auto ? ' · automatisch' : '' }}
          · <a routerLink="/backstage/einstellungen">ändern</a></p>
        @if (sync.letzter(); as l) { <p class="letzter" [class.fehler]="l.fehler">Zuletzt {{ zeit(l.zeit) }}: {{ l.text }}</p> }
        <div class="knoepfe">
          <button type="button" class="primaer" (click)="sync.jetzt()" [disabled]="sync.laeuft()"><mat-icon>sync</mat-icon> Jetzt synchronisieren</button>
          <button type="button" (click)="dateienZeigen()" [disabled]="sync.laeuft()"><mat-icon>folder_open</mat-icon> Lokale Dateien</button>
          <button type="button" (click)="einlesen()" [disabled]="sync.laeuft()"><mat-icon>download</mat-icon> Synchronisierte Dateien einlesen</button>
        </div>
        @if (sync.stand(); as s) { <app-fortschritt [stand]="s" /> }
        <app-sync-konflikte (geaendert)="geaendert.emit()" />
        @if (sync.offen().length) {
          <p class="offen"><mat-icon>help_outline</mat-icon> {{ sync.offen().length }} {{ sync.offen().length === 1 ? 'Noten-Datei braucht' : 'Noten-Dateien brauchen' }} eine Zuordnung zum Song.
            <button type="button" (click)="zuordnen()" [disabled]="sync.laeuft()">Zuordnen</button>
            <button type="button" class="link" (click)="sync.offenErledigt(sync.offen())">ignorieren</button></p>
        }
        @if (dateien(); as d) {
          <ul class="dateien">
            @for (x of d; track x.pfad) {
              <li><button type="button" class="link" (click)="oeffnen(x.pfad)">{{ x.pfad }}</button> <small>{{ mb(x.groesse) }}</small></li>
            } @empty { <li class="klein">Noch keine Dateien.</li> }
          </ul>
        }
        @if (funde(); as f) { <app-funde-liste [funde]="f" (geaendert)="eingelesen(f)" /> }
        @if (meldung(); as m) { <p [class.fehler]="m.fehler" [class.letzter]="!m.fehler" role="status">{{ m.text }}</p> }
      }
    </div>
  `,
  styles: `
    .box { margin-top: 20px; padding: 20px 24px; border-radius: 12px; border: 1px solid var(--bn-line); }
    h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; font-family: var(--bn-wide); font-weight: 400; text-transform: uppercase; letter-spacing: .14em; font-size: .85rem; }
    p { margin: 0 0 10px; max-width: 720px; font-size: .88rem; line-height: 1.55; color: var(--bn-fog); overflow-wrap: anywhere; }
    a { color: var(--bn-sunset); }
    .letzter { color: #5fb88a; }
    .offen { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; color: #e8a46a; }
    .fehler { color: #e07a5a; }
    .knoepfe { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
    .check { display: inline-flex; align-items: center; gap: 8px; font-size: .88rem; }
    .check input { accent-color: var(--bn-sunset); }
    button { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; font-size: .86rem; cursor: pointer; }
    button:hover:not(:disabled) { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    button:disabled { opacity: .4; cursor: default; }
    button.primaer { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    button.link { padding: 0; border: 0; text-align: left; text-decoration: underline; overflow-wrap: anywhere; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .dateien { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 4px; max-height: 320px; overflow: auto; font-size: .86rem; }
    small, .klein { color: var(--bn-fog); }
  `,
})
export class SyncStatus {
  protected readonly cloudName = cloudName;
  readonly geaendert = output<void>();
  protected readonly sync = inject(SyncService);
  protected readonly e = syncEinstellungen();
  protected readonly mb = mb;
  protected readonly dateien = signal<SyncDatei[] | null>(null);
  protected readonly funde = signal<Fund[] | null>(null);
  protected readonly meldung = signal<{ text: string; fehler?: boolean } | null>(null);

  constructor() {
    this.sync.automatisch();
  }

  protected zeit(iso: string): string {
    return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
  }

  private async lokal(schreiben = false) {
    const o = await this.sync.lokal(schreiben);
    if (!o) throw new Error('Kein Zugriff auf den lokalen Ordner – in den Einstellungen wählen.');
    return o;
  }

  protected async dateienZeigen(): Promise<void> {
    try {
      this.dateien.set((await (await this.lokal()).liste()).sort((a, b) => a.pfad.localeCompare(b.pfad, 'de')));
    } catch (err) {
      this.meldung.set({ text: (err as Error).message, fehler: true });
    }
  }

  protected async oeffnen(pfad: string): Promise<void> {
    const blob = await (await this.lokal()).lesen(pfad);
    const typ = pfad.toLowerCase().endsWith('.pdf') ? 'application/pdf' : blob.type || 'text/plain';
    const url = URL.createObjectURL(new Blob([blob], { type: typ }));
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  protected eingelesen(f: Fund[]): void {
    this.sync.offenErledigt(f.map((d) => d.pfad));
    this.geaendert.emit();
  }

  /** nur die offenen Noten-Dateien zur Zuordnung anzeigen */
  protected zuordnen(): Promise<void> {
    return this.einlesen(new Set(this.sync.offen()));
  }

  protected async einlesen(nur?: Set<string>): Promise<void> {
    try {
      const o = await this.lokal();
      const liste = (await o.liste()).filter((d) => !nur || nur.has(d.pfad));
      this.funde.set(
        await sichten(
          liste.map((d) => ({ name: d.pfad.split('/').at(-1)!, pfad: d.pfad, groesse: d.groesse, geaendert: d.geaendert, laden: async () => (await o.lesen(d.pfad)).arrayBuffer() })),
          (s) => this.sync.stand.set(s),
        ),
      );
    } catch (err) {
      this.meldung.set({ text: (err as Error).message, fehler: true });
    } finally {
      this.sync.stand.set(null);
    }
  }
}
