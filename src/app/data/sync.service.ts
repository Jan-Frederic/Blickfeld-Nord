import { Injectable, signal } from '@angular/core';
import { oneDriveAnmelden, oneDriveEingerichtet, oneDriveKonto, oneDriveStill } from './onedrive';
import { ordnerErlaubnis } from './ordner';
import { SyncOrdner, SyncStand, ergebnisText, synchronisieren } from './sync';
import { erkennen } from './erkennung';
import { notenDateien } from './noten';
import { NotenQuelle, istAkkordblatt, istPdf, notenEinlesen } from './noten-import';
import {
  appOrdner,
  offeneNoten,
  offeneNotenSetzen,
  cloudGewaehlt,
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
    return oneDriveEingerichtet() && cloudGewaehlt(syncEinstellungen());
  }

  /** Noten-Dateien, die zugeordnet werden müssen (nach dem Abgleich nicht eindeutig erkannt) */
  readonly offen = signal(offeneNoten());

  // neue/geänderte Noten-Dateien aus dem Abgleich gleich beim Song einlesen: eindeutig Erkanntes direkt, der Rest
  // wartet in der Sync-Karte auf eine Zuordnung von Hand. Ergebnis als Zusatz für „letzter Abgleich“.
  private async notenEinlesen(lokal: SyncOrdner, neu: string[]): Promise<string> {
    const pfade = neu.filter((p) => istPdf(p) || istAkkordblatt(p));
    if (!pfade.length) return '';
    const groesse = new Map((await lokal.liste()).map((d) => [d.pfad, d.groesse]));
    const eindeutig: NotenQuelle[] = [];
    const offen: string[] = [];
    for (const [i, pfad] of pfade.entries()) {
      const name = pfad.split('/').at(-1)!;
      this.stand.set({ text: `Noten erkennen: ${name}`, fertig: i, gesamt: pfade.length });
      const daten = async () => (await lokal.lesen(pfad)).arrayBuffer();
      const e = await erkennen(name, pfad, daten);
      if (e.key) eindeutig.push({ name, pfad, groesse: groesse.get(pfad) ?? 0, daten, ziel: { key: e.key, fassung: e.fassung } });
      else offen.push(pfad);
    }
    const r = await notenEinlesen(eindeutig, await notenDateien(), (fertig, gesamt, name) => this.stand.set({ text: `Noten einlesen: ${name}`, fertig, gesamt }));
    offeneNotenSetzen([...offeneNoten().filter((p) => !pfade.includes(p)), ...offen]);
    this.offen.set(offeneNoten());
    const n = r.pdfs + r.aktualisiert + r.blaetter;
    return [n && ` · ${n} Noten eingelesen`, offen.length && ` · ${offen.length} Noten brauchen eine Zuordnung`].filter(Boolean).join('');
  }

  /** offene Zuordnungen erledigt (eingelesen oder verworfen) */
  offenErledigt(pfade: string[]): void {
    offeneNotenSetzen(offeneNoten().filter((p) => !pfade.includes(p)));
    this.offen.set(offeneNoten());
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
        synchronisieren(cloudOrdner({ pfad: e.cloud, wurzel: e.wurzel }), lokal, zustand, e, {
          melden: (s) => this.stand.set(s),
          bestaetigen: (text) => !still && confirm(text),
          speichern: (z) => syncZustandSetzen(z).then(() => undefined),
        });
      const { ergebnis } = still ? await oneDriveStill(lauf) : await lauf();
      this.neu.set(ergebnis.neu);
      const noten = e.notenAuto ? await this.notenEinlesen(lokal, ergebnis.neu) : '';
      letzterSyncSetzen(ergebnisText(ergebnis) + noten + (ergebnis.fehler.length ? ` – ${ergebnis.fehler.slice(0, 3).join('; ')}` : ''), ergebnis.fehler.length > 0);
    } catch (err) {
      letzterSyncSetzen(`Abgebrochen: ${(err as Error).message || 'unbekannter Fehler'}`, true);
    } finally {
      this.letzter.set(letzterSync());
      this.stand.set(null);
      this.laeuft.set(false);
    }
  }
}
