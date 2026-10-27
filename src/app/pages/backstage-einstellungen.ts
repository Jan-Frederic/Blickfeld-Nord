import { Component, inject } from '@angular/core';
import { SyncService } from '../data/sync.service';
import { SyncEinstellungenSeite } from './sync-einstellungen';

// Backstage → Einstellungen: zurzeit die Synchronisation mit OneDrive (sync-einstellungen.ts)
@Component({
  selector: 'app-backstage-einstellungen',
  imports: [SyncEinstellungenSeite],
  template: `
    <section class="section">
      <p class="kicker">Backstage</p>
      <h2>Einstel&shy;lungen</h2>
      <p class="lead">Gelten für dieses Gerät. Was hier gespeichert ist, steht auch unter Abgleich → Daten auf diesem Gerät.</p>
      <app-sync-einstellungen />
    </section>
  `,
})
export class BackstageEinstellungen {
  constructor() {
    inject(SyncService).automatisch();
  }
}
