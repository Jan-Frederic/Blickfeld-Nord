import { Component, inject } from '@angular/core';
import { SyncService } from '../data/sync.service';
import { SyncEinstellungenSeite } from './sync-einstellungen';
import { BuehneEinstellungen } from './buehne-einstellungen';

// Backstage → Einstellungen: Synchronisation mit OneDrive (sync-einstellungen.ts) und Bühnen-Modus
// (Halbseiten-Blättern, Pedal-Tasten – buehne-einstellungen.ts)
@Component({
  selector: 'app-backstage-einstellungen',
  imports: [SyncEinstellungenSeite, BuehneEinstellungen],
  template: `
    <section class="section">
      <p class="kicker">Backstage</p>
      <h2>Einstel&shy;lungen</h2>
      <p class="lead">Gelten für dieses Gerät. Was hier gespeichert ist, steht auch unter Abgleich → Daten auf diesem Gerät.</p>
      <app-sync-einstellungen />
      <app-buehne-einstellungen />
    </section>
  `,
})
export class BackstageEinstellungen {
  constructor() {
    inject(SyncService).automatisch();
  }
}
