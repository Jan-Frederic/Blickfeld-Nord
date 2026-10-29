import { Component, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { BackstageDaten } from './backstage-daten';
import { ordnerSpeicherLoeschen } from '../data/ordner';
import { SyncStatus } from './sync-status';
import { offlineReady } from '../pwa';

// Backstage → Abgleich: Synchronisation mit OneDrive (sync-status.ts) und alle Daten des Geräts verwalten und
// aufräumen (backstage-daten.ts mit backstage-aufraeumen.ts). Backup und Wiederherstellen: Einstellungen → Backup.
@Component({
  selector: 'app-backstage-abgleich',
  imports: [MatIconModule, RouterLink, BackstageDaten, SyncStatus],
  template: `
    <section class="section">
      <p class="kicker">Backstage</p>
      <h2>Abgleich</h2>
      <p class="lead">Abgleich mit OneDrive und alles, was auf diesem Gerät gespeichert ist. Das Backup steht unter
        <a routerLink="/backstage/einstellungen">Einstellungen</a>.</p>
      @if (offline()) {
        <p class="offline"><mat-icon>offline_pin</mat-icon> Backstage ist auf diesem Gerät auch ohne Netz verfügbar.</p>
      }
      <app-sync-status (geaendert)="version.set(version() + 1)" />
      <app-backstage-daten [version]="version()" (geaendert)="version.set(version() + 1)" />
    </section>
  `,
  styles: `
    .lead a { color: var(--bn-sunset); }
    .offline { display: flex; align-items: flex-start; gap: 6px; margin: 0 0 14px; color: #5fb88a; font-size: .9rem; line-height: 1.4; }
    .offline mat-icon { font-size: 18px; width: 18px; height: 18px; margin-top: 1px; }
  `,
})
export class BackstageAbgleich {
  protected readonly offline = offlineReady;
  /** Änderungen in einem Bereich der Seite → die anderen lesen neu */
  protected readonly version = signal(0);

  constructor() {
    // „Ordner auf dem Gerät“ gibt es nicht mehr (die Synchronisation kann es mit) – gemerkten Ordner vergessen
    void ordnerSpeicherLoeschen();
  }
}
