import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BackstageNav } from './backstage-nav';
import { BackstageSync } from './backstage-sync';
import { offlineReady } from '../pwa';

// Backstage → Abgleich: Gerätedaten (Setlists, Packlisten, Vor-Ort-Angaben) als Datei mit der Band teilen
@Component({
  selector: 'app-backstage-abgleich',
  imports: [MatIconModule, BackstageNav, BackstageSync],
  template: `
    <section class="section">
      <app-backstage-nav />
      <p class="kicker">Backstage</p>
      <h2>Abgleich</h2>
      <div class="exchange">
        <h3>Mit der Band abgleichen</h3>
        <p>Setlists, Packlisten und Vor-Ort-Angaben werden nur auf diesem Gerät gespeichert. Schickt sie als Datei
          (z. B. in die WhatsApp-Gruppe) und importiert sie auf den anderen Handys – dann haben alle denselben Stand.</p>
        <app-backstage-sync />
        @if (offline()) {
          <p class="offline"><mat-icon>offline_pin</mat-icon> Backstage ist auf diesem Gerät auch ohne Netz verfügbar.</p>
        }
      </div>
    </section>
  `,
  styles: `
    .exchange { padding: 20px 24px; border-radius: 12px; border: 1px solid var(--bn-line); }
    .exchange h3 { margin: 0 0 6px; font-family: var(--bn-wide); font-weight: 400; text-transform: uppercase; letter-spacing: .14em; font-size: .85rem; }
    .exchange p { margin: 0 0 14px; max-width: 720px; font-size: .9rem; line-height: 1.6; color: var(--bn-fog); }
    .exchange .offline { display: flex; align-items: flex-start; gap: 6px; margin: 14px 0 0; color: #5fb88a; line-height: 1.4; }
    .offline mat-icon { font-size: 18px; width: 18px; height: 18px; margin-top: 1px; }
  `,
})
export class BackstageAbgleich {
  protected readonly offline = offlineReady;
}
