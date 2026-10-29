import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SyncService } from '../data/sync.service';

// Sync-Anzeige unten rechts im Backstage: ein Kompass (public/kompass-sync.svg, transparent), der nur erscheint,
// solange mit OneDrive abgeglichen wird – er blendet sich ein, dreht sich und blendet sich danach wieder aus.
// Antippen öffnet den Abgleich. Ohne Synchronisation oder offline gibt es ihn nicht.
@Component({
  selector: 'app-sync-kompass',
  imports: [RouterLink],
  template: `
    @if (sync.bereit() && sync.online()) {
      <a class="kompass" routerLink="/backstage/abgleich" [class.an]="sync.laeuft()" [attr.aria-hidden]="!sync.laeuft()"
        [attr.tabindex]="sync.laeuft() ? null : -1" [attr.aria-label]="text()" [title]="text()">
        <img src="kompass-sync.svg" alt="" width="56" height="56" />
      </a>
      <span class="sr" role="status">{{ sync.laeuft() ? text() : '' }}</span>
    }
  `,
  styles: `
    .kompass {
      position: fixed; right: max(14px, env(safe-area-inset-right)); bottom: max(14px, env(safe-area-inset-bottom)); z-index: 900;
      display: block; width: 56px; height: 56px; opacity: 0; visibility: hidden; pointer-events: none;
      transition: opacity .6s ease, visibility 0s linear .6s;
    }
    .kompass.an { opacity: 1; visibility: visible; pointer-events: auto; transition: opacity .6s ease, visibility 0s; }
    img { display: block; width: 100%; height: 100%; filter: drop-shadow(0 1px 3px rgba(0, 0, 0, .7)); animation: drehen 2.4s linear infinite; animation-play-state: paused; }
    .an img { animation-play-state: running; }
    @keyframes drehen { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { img { animation-duration: 8s; } }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  `,
})
export class SyncKompass {
  protected readonly sync = inject(SyncService);
  protected readonly text = computed(() => {
    const s = this.sync.stand();
    return s?.gesamt ? `Wird mit OneDrive abgeglichen – ${s.fertig ?? 0} von ${s.gesamt}` : 'Wird mit OneDrive abgeglichen …';
  });

  constructor() {
    this.sync.automatisch();
  }
}
