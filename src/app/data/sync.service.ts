import { Injectable, signal } from '@angular/core';
import { SpiegelZustand, hash, personOrdner, planNachher, planVorher, spiegelArt } from './spiegel';
import { letztesKonto, oneDriveAnmelden, oneDriveEingerichtet, oneDriveKonto, oneDriveStill } from './onedrive';
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
  spiegelZustandLaden,
  spiegelZustandSetzen,
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
  /** online (für die Anzeige unten rechts) */
  readonly online = signal(typeof navigator === 'undefined' || navigator.onLine);
  /** Stand der gespiegelten Einstellungen und Daten (data/spiegel.ts) – für den Sync-Status im Abgleich */
  readonly spiegel = signal<SpiegelZustand>({});
  /** Ordner der angemeldeten Person für persönliche Einstellungen */
  readonly person = signal(personOrdner(letztesKonto() ?? ''));
  /** Einträge, die seit dem letzten Abgleich geändert wurden */
  readonly ausstehend = signal(0);
  private spiegelt = false;
  private nachAenderung: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    if (typeof window === 'undefined') return;
    addEventListener('online', () => this.online.set(true));
    addEventListener('offline', () => this.online.set(false));
    spiegelZustandLaden()
      .then((z) => {
        this.spiegel.set(z);
        this.ausstehendZaehlen();
      })
      .catch(() => undefined);
    // jede Änderung an gespiegelten Einträgen (Setlist, Einstellungen …) wenige Sekunden später abgleichen
    const speicher = Storage.prototype as Storage & { __bnSync?: boolean };
    if (speicher.__bnSync) return;
    speicher.__bnSync = true;
    const setItem = speicher.setItem;
    const removeItem = speicher.removeItem;
    const melden = (key: string) => {
      if (!this.spiegelt && spiegelArt(key)) this.geaendert();
    };
    speicher.setItem = function (this: Storage, key: string, value: string) {
      setItem.call(this, key, value);
      if (this === window.localStorage) melden(key);
    };
    speicher.removeItem = function (this: Storage, key: string) {
      removeItem.call(this, key);
      if (this === window.localStorage) melden(key);
    };
  }

  /**
   * Berechtigung „Daten löschen“: nur wer angemeldet ist und den OneDrive-Ordner der Synchronisation besitzt (nicht
   * nur geteilt bekommen hat). Löschen wird mitsynchronisiert – es betrifft also die ganze Band.
   */
  darfLoeschen(): boolean {
    return this.bereit() && !!letztesKonto() && !syncEinstellungen().wurzel;
  }

  private geaendert(): void {
    this.ausstehendZaehlen();
    if (!this.bereit() || !syncEinstellungen().auto) return;
    clearTimeout(this.nachAenderung);
    this.nachAenderung = setTimeout(() => navigator.onLine && void this.jetzt(true), 5000);
  }

  /** gespiegelte Einträge, deren Inhalt sich seit dem letzten Spiegeln geändert hat */
  private ausstehendZaehlen(): void {
    try {
      const werte = this.werte();
      this.ausstehend.set(planVorher(werte, this.spiegel(), this.person()).schreiben.length);
    } catch {
      // ohne Speicher nichts zu zählen
    }
  }

  private werte(): Record<string, string> {
    const out: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (spiegelArt(k)) out[k] = localStorage.getItem(k) ?? '';
    }
    return out;
  }

  // vor dem Abgleich: geänderte Einträge als Dateien in den lokalen Sync-Ordner, gelöschte dort entfernen
  private async spiegelnVorher(lokal: SyncOrdner, person: string): Promise<void> {
    const z: SpiegelZustand = { ...(await spiegelZustandLaden()) };
    const plan = planVorher(this.werte(), z, person);
    for (const d of plan.schreiben) {
      const datei = await lokal.schreiben(d.pfad, new Blob([d.text], { type: 'application/json' }));
      z[d.pfad] = { hash: d.hash, version: datei.version };
    }
    for (const pfad of plan.loeschen) {
      await lokal.loeschen(pfad).catch(() => undefined);
      delete z[pfad];
    }
    await spiegelZustandSetzen(z);
    this.spiegel.set(z);
  }

  // nach dem Abgleich: neue/geänderte Dateien in localStorage übernehmen, verschwundene Einträge entfernen
  private async spiegelnNachher(lokal: SyncOrdner, person: string): Promise<number> {
    const z: SpiegelZustand = { ...(await spiegelZustandLaden()) };
    const plan = planNachher(await lokal.liste(), z, person);
    let n = 0;
    this.spiegelt = true;
    try {
      for (const d of plan.lesen) {
        const text = await (await lokal.lesen(d.pfad)).text();
        if (localStorage.getItem(d.key) !== text) {
          localStorage.setItem(d.key, text);
          n++;
        }
        z[d.pfad] = { hash: hash(text), version: d.version };
      }
      for (const d of plan.entfernen) {
        if (localStorage.getItem(d.key) !== null) {
          localStorage.removeItem(d.key);
          n++;
        }
        delete z[d.pfad];
      }
    } finally {
      this.spiegelt = false;
    }
    await spiegelZustandSetzen(z);
    this.spiegel.set(z);
    this.ausstehendZaehlen();
    return n;
  }

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
      const person = personOrdner(konto.username);
      this.person.set(person);
      this.stand.set({ text: 'Einstellungen und Daten vorbereiten …' });
      await this.spiegelnVorher(lokal, person);
      const zustand = await syncZustand();
      const lauf = () =>
        synchronisieren(cloudOrdner({ pfad: e.cloud, wurzel: e.wurzel }), lokal, zustand, e, {
          melden: (s) => this.stand.set(s),
          bestaetigen: (text) => !still && confirm(text),
          speichern: (z) => syncZustandSetzen(z).then(() => undefined),
        });
      const { ergebnis } = still ? await oneDriveStill(lauf) : await lauf();
      this.neu.set(ergebnis.neu);
      const uebernommen = await this.spiegelnNachher(lokal, person);
      const noten = e.notenAuto ? await this.notenEinlesen(lokal, ergebnis.neu) : '';
      const daten = uebernommen ? ` · ${uebernommen} ${uebernommen === 1 ? 'Eintrag' : 'Einträge'} übernommen` : '';
      letzterSyncSetzen(ergebnisText(ergebnis) + daten + noten + (ergebnis.fehler.length ? ` – ${ergebnis.fehler.slice(0, 3).join('; ')}` : ''), ergebnis.fehler.length > 0);
    } catch (err) {
      letzterSyncSetzen(`Abgebrochen: ${(err as Error).message || 'unbekannter Fehler'}`, true);
    } finally {
      this.letzter.set(letzterSync());
      this.stand.set(null);
      this.laeuft.set(false);
    }
  }
}
