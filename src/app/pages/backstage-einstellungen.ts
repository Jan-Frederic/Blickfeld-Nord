import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SyncService } from '../data/sync.service';
import { SyncEinstellungenSeite } from './sync-einstellungen';
import { BuehneEinstellungen } from './buehne-einstellungen';
import { BackupKarte } from './backup-karte';
import { BandOrdner } from './band-ordner';
import { IchEinstellung } from './ich-einstellung';
import { SpotifyEinstellung } from './spotify-einstellung';
import { DokuLink } from './doku-link';

// Backstage → Einstellungen: „Ich bin …“ (ich-einstellung.ts), Synchronisation mit OneDrive (sync-einstellungen.ts), Backup (backup-karte.ts) und Bühnen-Modus
// (Halbseiten-Blättern, Pedal-Tasten – buehne-einstellungen.ts), Spotify im Übe- und Probe-Modus (spotify-einstellung.ts)
@Component({
  selector: 'app-backstage-einstellungen',
  imports: [DokuLink, RouterLink, IchEinstellung, SpotifyEinstellung, SyncEinstellungenSeite, BandOrdner, BackupKarte, BuehneEinstellungen],
  template: `
    <section class="section">
      <p class="kicker">Backstage</p>
      <h2>Einstel&shy;lungen</h2>
      <app-doku-link thema="einstellungen" />
      <p class="lead">Gelten für dieses Gerät. Was hier gespeichert ist, steht auch unter Abgleich → Daten auf diesem Gerät.
        Alles Wichtige Schritt für Schritt: <a routerLink="/backstage/einrichtung">Einrichtung durchgehen</a>.</p>
      <app-ich-einstellung />
      <app-sync-einstellungen />
      <app-band-ordner />
      <app-backup-karte />
      <app-buehne-einstellungen />
      <app-spotify-einstellung />
    </section>
  `,
})
export class BackstageEinstellungen {
  constructor() {
    inject(SyncService).automatisch();
  }
}
