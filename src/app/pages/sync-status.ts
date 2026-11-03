import { Component, inject, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Fund, sichten } from '../data/einlesen';
import { eigenstaendigGemerkt } from '../data/erkennung';
import { mb } from '../data/aufraeumen';
import { SyncDatei } from '../data/sync';
import { SyncService } from '../data/sync.service';
import { cloudName, syncEinstellungen } from '../data/sync-ordner';
import { Fortschritt } from './fortschritt';
import { KNOPF_HILFE, KNOPF_NAME, Knopf, wasPassiert } from '../data/sync-hilfe';
import { geraetId, geraetName, geraetNameSetzen, seitText, standardName } from '../data/geraete';
import { FundeListe } from './funde-liste';
import { SyncKonflikte } from './sync-konflikte';

// Backstage → Abgleich → Synchronisation: Stand des letzten Abgleichs OneDrive ↔ lokal, „Jetzt synchronisieren“
// mit Fortschritt, die lokalen Dateien (zum Öffnen, auch offline) und das Einlesen der synchronisierten Dateien
// (Backups, Notenpakete, PDFs, .pro). Eingerichtet wird unter Backstage → Einstellungen, das Backup ebenfalls dort.
@Component({
  selector: 'app-sync-status',
  imports: [RouterLink, NgTemplateOutlet, MatIconModule, Fortschritt, FundeListe, SyncKonflikte],
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
          <span class="paar"><button type="button" class="primaer" (click)="sync.jetzt()" [disabled]="sync.laeuft()"><mat-icon>sync</mat-icon> Jetzt synchronisieren</button>
            <ng-container *ngTemplateOutlet="info; context: { $implicit: 'jetzt' }" /></span>
          <span class="paar"><button type="button" (click)="dateienZeigen()" [disabled]="sync.laeuft()"><mat-icon>folder_open</mat-icon> Lokale Dateien</button>
            <ng-container *ngTemplateOutlet="info; context: { $implicit: 'dateien' }" /></span>
          <span class="paar"><button type="button" (click)="einlesen()" [disabled]="sync.laeuft()"><mat-icon>download</mat-icon> Synchronisierte Dateien einlesen</button>
            <ng-container *ngTemplateOutlet="info; context: { $implicit: 'einlesen' }" /></span>
        </div>
        <ng-template #info let-k>
          <button type="button" class="info" [class.an]="hilfe() === k" (click)="hilfe.set(hilfe() === k ? null : k)" [attr.aria-expanded]="hilfe() === k" [attr.aria-label]="'Was macht „' + knopfName[k] + '“?'"><mat-icon>info</mat-icon></button>
        </ng-template>
        @if (hilfe(); as k) { <p class="hilfe" role="note">{{ hilfeText[k] }}</p> }
        @if (sync.stand(); as s) {
          <app-fortschritt [stand]="s" />
          <p class="passiert" aria-live="polite"><b>Was passiert gerade?</b> {{ wasPassiert(s.text) }}</p>
        }
        <app-sync-konflikte (geaendert)="geaendert.emit()" />
        @if (sync.offen().length) {
          <p class="offen"><mat-icon>help_outline</mat-icon> {{ sync.offen().length }} {{ sync.offen().length === 1 ? 'Noten-Datei braucht' : 'Noten-Dateien brauchen' }} eine Zuordnung zum Song.
            <button type="button" (click)="zuordnen()" [disabled]="sync.laeuft()">Zuordnen</button>
            <ng-container *ngTemplateOutlet="info; context: { $implicit: 'zuordnen' }" />
            <button type="button" class="link" (click)="sync.offenErledigt(sync.offen())">ignorieren</button>
            <ng-container *ngTemplateOutlet="info; context: { $implicit: 'ignorieren' }" /></p>
        }
        <details class="geraete">
          <summary><mat-icon>devices</mat-icon> Geräte · dieses: {{ name() || vorschlag }}</summary>
          <label class="geraet-name">Name dieses Geräts
            <input [value]="name()" [placeholder]="vorschlag + ' (z. B. „Freds Handy“)'" maxlength="40" (change)="nameSetzen($any($event.target).value)" />
          </label>
          @if (sync.geraete().length) {
            <ul>
              @for (g of sync.geraete(); track g.id) {
                <li [class.ich]="g.id === meineId">{{ g.name }}{{ g.id === meineId ? ' (dieses)' : '' }} <small>{{ g.person }} · {{ seit(g.zeit) }} abgeglichen</small></li>
              }
            </ul>
          } @else { <p class="klein">Noch keine Geräte gemeldet – nach dem nächsten Abgleich steht hier, welches Gerät wann zuletzt abgeglichen hat.</p> }
        </details>
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

  protected readonly hilfe = signal<Knopf | null>(null);
  protected readonly hilfeText: Record<string, string> = KNOPF_HILFE;
  protected readonly knopfName: Record<string, string> = KNOPF_NAME;
  protected readonly wasPassiert = wasPassiert;
  protected readonly name = signal(geraetName());
  protected readonly vorschlag = standardName(typeof navigator === 'undefined' ? '' : navigator.userAgent);
  protected readonly meineId = geraetId();
  protected seit(iso: string): string {
    return seitText(iso);
  }

  constructor() {
    this.sync.automatisch();
    if (this.sync.bereit()) {
      void this.sync.geraeteLesen().catch(() => undefined);
      void this.eigenstaendigeEinlesen();
    }
  }

  /** offene Noten, die schon als „eigenständig“ zugeordnet sind, ohne Rückfrage einlesen */
  private async eigenstaendigeEinlesen(): Promise<number> {
    const n = await this.sync.eigenstaendigeOffeneEinlesen().catch(() => 0);
    if (n) {
      this.meldung.set({ text: `${n} schon eigenständig zugeordnete ${n === 1 ? 'Noten-Datei' : 'Noten-Dateien'} eingelesen ✓` });
      this.geaendert.emit();
    }
    return n;
  }

  protected nameSetzen(wert: string): void {
    geraetNameSetzen(wert);
    this.name.set(geraetName());
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
  protected async zuordnen(): Promise<void> {
    await this.eigenstaendigeEinlesen();
    if (this.sync.offen().length) await this.einlesen(new Set(this.sync.offen()));
  }

  protected async einlesen(nur?: Set<string>): Promise<void> {
    try {
      const o = await this.lokal();
      // schon als „eigenständig“ eingelesene Noten nicht noch einmal anbieten
      const alle = (await o.liste()).filter((d) => !nur || nur.has(d.pfad));
      const liste = alle.filter((d) => !eigenstaendigGemerkt(d.pfad.split('/').at(-1)!));
      const funde = await sichten(
        liste.map((d) => ({ name: d.pfad.split('/').at(-1)!, pfad: d.pfad, groesse: d.groesse, geaendert: d.geaendert, laden: async () => (await o.lesen(d.pfad)).arrayBuffer() })),
        (s) => this.sync.stand.set(s),
      );
      // Backups und Notenpakete stehen unter Einstellungen → Backup
      this.funde.set(funde.filter((f) => f.art !== 'backstage' && f.art !== 'noten'));
      const eigen = alle.length - liste.length;
      const backups = funde.length - this.funde()!.length;
      this.meldung.set(
        eigen || backups
          ? {
              text: [eigen && `${eigen} schon eigenständig eingelesene ${eigen === 1 ? 'Noten-Datei' : 'Noten-Dateien'} ausgeblendet`, backups && `${backups} ${backups === 1 ? 'Backup' : 'Backups'} unter Einstellungen → Backup`]
                .filter(Boolean)
                .join(' · '),
            }
          : null,
      );
    } catch (err) {
      this.meldung.set({ text: (err as Error).message, fehler: true });
    } finally {
      this.sync.stand.set(null);
    }
  }
}
