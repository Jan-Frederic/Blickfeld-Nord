import { Injectable, signal } from '@angular/core';
import { oneDriveAnmelden, oneDriveEingerichtet, oneDriveKonto, oneDriveStill } from './onedrive';
import { ordnerErlaubnis } from './ordner';
import { SyncOrdner, SyncStand, ergebnisText, synchronisieren } from './sync';
import {
  appOrdner,
  cloudOrdner,
  festplattenOrdner,
  letzterSync,
  letzterSyncSetzen,
  lokalerOrdnerHandle,
  syncEinstellungen,
  syncZustand,
  syncZustandSetzen,
} from './sync-ordner';

// Führt die Synchronisation OneDrive ↔ lokal aus (Backstage → Einstellungen legt fest, was womit): nie zweimal
// gleichzeitig, automatisch beim Öffnen des Backstage und alle 15 Minuten, solange eine Backstage-Seite offen ist.
// Fortschritt und letztes Ergebnis als Signale für die Anzeige im Abgleich.
@Injectable({ providedIn: 'root' })
export class SyncService {
  readonly laeuft = signal(false);
  readonly stand = signal<SyncStand | null>(null);
  readonly letzter = signal(letzterSync());
  /** zuletzt heruntergeladene Dateien (zum Einlesen anbieten) */
  readonly neu = signal<string[]>([]);
  private timer: ReturnType<typeof setInterval> | undefined;

  /** eingerichtet: Microsoft-App, Cloud-Ordner gewählt */
  bereit(): boolean {
    return oneDriveEingerichtet() && !!syncEinstellungen().cloud;
  }

  /** die lokale Seite laut Einstellungen (ohne nach Erlaubnis zu fragen) – zum Ansehen und Einlesen */
  async lokal(schreiben = false): Promise<SyncOrdner | null> {
    if (syncEinstellungen().lokal === 'app') return appOrdner;
    const h = await lokalerOrdnerHandle();
    return h && (await ordnerErlaubnis(h, schreiben)) ? festplattenOrdner(h) : null;
  }

  /** automatische Synchronisation starten (mehrfacher Aufruf schadet nicht) */
  automatisch(): void {
    if (this.timer || typeof window === 'undefined') return;
    const los = () => {
      if (syncEinstellungen().auto && this.bereit() && navigator.onLine && !document.hidden) void this.jetzt(true);
    };
    setTimeout(los, 3000);
    this.timer = setInterval(los, 15 * 60_000);
    addEventListener('online', los);
  }

  /**
   * Jetzt abgleichen. still=true (automatisch): keine Rückfragen, kein Popup – fehlt die Anmeldung oder die
   * Erlaubnis für den Ordner, wird es beim nächsten Klick auf „Jetzt synchronisieren“ nachgeholt.
   */
  async jetzt(still = false): Promise<void> {
    if (this.laeuft() || !this.bereit()) return;
    const e = syncEinstellungen();
    this.laeuft.set(true);
    try {
      const konto = (await oneDriveKonto()) ?? (await oneDriveAnmelden(still));
      if (!konto) return;
      let lokal = appOrdner;
      if (e.lokal === 'ordner') {
        const h = await lokalerOrdnerHandle();
        if (!h) throw new Error('Kein lokaler Ordner gewählt (Einstellungen)');
        // ohne Klick darf der Browser nicht nach der Erlaubnis fragen
        if (still && h.queryPermission && (await h.queryPermission({ mode: 'readwrite' })) !== 'granted') return;
        if (!(await ordnerErlaubnis(h, true))) throw new Error('Zugriff auf den lokalen Ordner nicht erlaubt');
        lokal = festplattenOrdner(h);
      }
      const zustand = await syncZustand();
      const lauf = () =>
        synchronisieren(cloudOrdner(e.cloud), lokal, zustand, e, {
          melden: (s) => this.stand.set(s),
          bestaetigen: (text) => !still && confirm(text),
          speichern: (z) => syncZustandSetzen(z).then(() => undefined),
        });
      const { ergebnis } = still ? await oneDriveStill(lauf) : await lauf();
      this.neu.set(ergebnis.neu);
      letzterSyncSetzen(ergebnisText(ergebnis) + (ergebnis.fehler.length ? ` – ${ergebnis.fehler.slice(0, 3).join('; ')}` : ''), ergebnis.fehler.length > 0);
    } catch (err) {
      letzterSyncSetzen(`Abgebrochen: ${(err as Error).message || 'unbekannter Fehler'}`, true);
    } finally {
      this.letzter.set(letzterSync());
      this.stand.set(null);
      this.laeuft.set(false);
    }
  }
}
