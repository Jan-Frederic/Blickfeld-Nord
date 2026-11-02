import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SyncService } from '../data/sync.service';
import { ONEDRIVE } from '../data/onedrive-config';
import { syncEinstellungen } from '../data/sync-ordner';

// Backstage → Einstellungen → Band-Ordner (nur Besitzer des Sync-Ordners): Kennung des OneDrive-Ordners für die
// Sichtsperre (data/zugang.ts). Die Kennung kommt in src/app/data/onedrive-config.ts bei bandOrdner.
@Component({
  selector: 'app-band-ordner',
  imports: [MatIconModule],
  template: `
    @if (sync.darfLoeschen()) {
      <div class="box band-ordner">
        <h3><mat-icon>lock</mat-icon> Band-Ordner (Sichtsperre)</h3>
        <p>Das Backstage öffnet sich nur für Konten, die den Band-Ordner in OneDrive sehen dürfen – wer dazugehört, steuerst du
          über die Freigabe des Ordners. {{ aktiv ? 'Die Sichtsperre ist aktiv.' : 'Noch nicht eingerichtet – das Backstage ist für alle offen, die die Adresse kennen.' }}</p>
        <button type="button" (click)="ermitteln()" [disabled]="laeuft()"><mat-icon>fingerprint</mat-icon> Diesen Sync-Ordner als Band-Ordner festlegen</button>
        @if (kennung(); as k) {
          <p>Kennung von „{{ ordnerName }}“ – in <code>src/app/data/onedrive-config.ts</code> bei <code>bandOrdner</code> eintragen
            (oder an Claude schicken):</p>
          <pre>bandOrdner: {{ k }},</pre>
          <button type="button" (click)="kopieren(k)"><mat-icon>{{ kopiert() ? 'check' : 'content_copy' }}</mat-icon> {{ kopiert() ? 'Kopiert' : 'Kopieren' }}</button>
          @if (gleich()) { <p class="ok">Das ist schon der eingetragene Band-Ordner ✓</p> }
        }
        @if (fehler(); as f) { <p class="fehler" role="status">{{ f }}</p> }
      </div>
    }
  `,
})
export class BandOrdner {
  protected readonly sync = inject(SyncService);
  protected readonly aktiv = !!ONEDRIVE.bandOrdner;
  private readonly e = syncEinstellungen();
  protected readonly ordnerName = this.e.wurzel?.name ?? this.e.cloud ?? 'OneDrive';
  protected readonly kennung = signal('');
  protected readonly gleich = signal(false);
  protected readonly fehler = signal('');
  protected readonly laeuft = signal(false);
  protected readonly kopiert = signal(false);

  protected async ermitteln(): Promise<void> {
    this.laeuft.set(true);
    this.fehler.set('');
    try {
      const o = await import('../data/onedrive');
      if (!(await o.oneDriveAnmelden())) throw new Error('Nicht angemeldet');
      const k = await o.ordnerKennung({ pfad: this.e.cloud, wurzel: this.e.wurzel });
      this.kennung.set(`{ drive: '${k.drive}', item: '${k.item}' }`);
      this.gleich.set(ONEDRIVE.bandOrdner?.drive === k.drive && ONEDRIVE.bandOrdner?.item === k.item);
    } catch (err) {
      this.fehler.set(`Kennung nicht ermittelt: ${(err as Error).message || 'unbekannter Fehler'}`);
    } finally {
      this.laeuft.set(false);
    }
  }

  protected async kopieren(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(`bandOrdner: ${text},`);
      this.kopiert.set(true);
      setTimeout(() => this.kopiert.set(false), 2000);
    } catch {
      window.prompt('Kopieren:', `bandOrdner: ${text},`);
    }
  }
}
