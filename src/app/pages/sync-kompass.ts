import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SyncService } from '../data/sync.service';

// Sync-Anzeige unten rechts im Backstage (nur mit eingerichteter Synchronisation und online): der Blickfeld-Nord-
// Kompass dreht sich, solange abgeglichen wird; ein Punkt zeigt wartende Änderungen (orange) bzw. einen Fehler beim
// letzten Abgleich (rot). Antippen öffnet den Abgleich.
@Component({
  selector: 'app-sync-kompass',
  imports: [RouterLink],
  template: `
    @if (sync.bereit() && sync.online()) {
      <a class="kompass" routerLink="/backstage/abgleich" [class.laeuft]="sync.laeuft()" [attr.aria-label]="text()" [title]="text()">
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="30" fill="#15171c" />
          <g class="nadel">
            <circle cx="32" cy="32" r="24" fill="none" stroke="#efece6" stroke-width="3" />
            <polygon points="34.97,32.85 45.93,21.89 46.85,17.15 42.11,18.07 31.15,29.03" fill="#efece6" />
            <polygon points="31.15,34.97 42.11,45.93 46.85,46.85 45.93,42.11 34.97,31.15" fill="#efece6" />
            <polygon points="27.60,32.00 36.40,32.00 32.00,54.00" fill="#9a9790" />
            <polygon points="32.00,10.00 36.40,32.00 27.60,32.00" fill="#e8a46a" />
            <circle cx="32" cy="32" r="3.6" fill="#15171c" stroke="#ffffff" stroke-width="2" />
          </g>
        </svg>
        @if (punkt(); as p) { <span class="punkt" [class]="'punkt ' + p"></span> }
      </a>
    }
  `,
  styles: `
    .kompass { position: fixed; right: max(14px, env(safe-area-inset-right)); bottom: max(14px, env(safe-area-inset-bottom)); z-index: 900; display: block; width: 44px; height: 44px; border-radius: 50%; box-shadow: 0 2px 10px rgba(0, 0, 0, .5); }
    svg { display: block; width: 100%; height: 100%; }
    .nadel { transform-origin: 32px 32px; }
    .laeuft .nadel { animation: drehen 1.6s linear infinite; }
    @keyframes drehen { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .laeuft .nadel { animation-duration: 6s; } }
    .punkt { position: absolute; top: 0; right: 0; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #15171c; }
    .punkt.wartet { background: #e8a46a; }
    .punkt.fehler { background: #e07a5a; }
  `,
})
export class SyncKompass {
  protected readonly sync = inject(SyncService);
  protected readonly punkt = computed(() => (this.sync.laeuft() ? '' : this.sync.letzter()?.fehler ? 'fehler' : this.sync.ausstehend() ? 'wartet' : ''));
  protected readonly text = computed(() => {
    if (this.sync.laeuft()) return 'Wird mit OneDrive abgeglichen …';
    const l = this.sync.letzter();
    if (l?.fehler) return `Letzter Abgleich mit Fehler: ${l.text}`;
    const n = this.sync.ausstehend();
    if (n) return `${n} ${n === 1 ? 'Änderung wartet' : 'Änderungen warten'} auf den Abgleich`;
    return l ? `Synchron mit OneDrive (${new Date(l.zeit).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })})` : 'Noch nicht abgeglichen';
  });

  constructor() {
    this.sync.automatisch();
  }
}
