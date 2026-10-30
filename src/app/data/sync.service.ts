import { Injectable, signal } from '@angular/core';
import { SpiegelZustand, hash, personOrdner, planNachher, planVorher, spiegelArt } from './spiegel';
import { letztesKonto, oneDriveAnmelden, oneDriveEingerichtet, oneDriveKonto, oneDriveStill } from './onedrive';
import { ordnerErlaubnis } from './ordner';
import { SyncOrdner, SyncStand, ergebnisText, synchronisieren } from './sync';
import { erkennen } from './erkennung';
import { NOTEN_GEAENDERT, NotenDateiInfo, NotenPdf, alleMarkierungen, alleSongNoten, markierungenSetzen, notenDateiSpeichern, notenDateien, songNotenSetzen } from './noten';
import { BAND, MarkDateiInhalt, NotenDateiInhalt, istNotenSpiegel, markTexte, markZusammen, notenPfad, notenText, pdfFinden } from './noten-spiegel';
import type { Strich } from './noten';
import type { SyncDatei } from './sync';
import { Mitschnitt, mitschnittAusPfad, mitschnittEndung, mitschnittGeteilt, mitschnittPfad, mitschnittPfade, mitschnittSpeichern } from './mitschnitte';
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
    addEventListener(NOTEN_GEAENDERT, () => !this.spiegelt && this.geaendert());
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
    // Noten (Zuordnung, Fassung, Seitenbereich, Akkordblatt) und eigene Markierungen
    const noten = await this.notenExport(person);
    for (const [pfad, { text, key }] of Object.entries(noten)) {
      const h = hash(text);
      if (z[pfad]?.hash === h) continue;
      const datei = await lokal.schreiben(pfad, new Blob([text], { type: 'application/json' }));
      z[pfad] = { hash: h, version: datei.version, ...(key ? { key } : {}) };
    }
    for (const pfad of Object.keys(z)) {
      // nicht löschen, was dieses Gerät gar nicht vollständig hat (PDF fehlt hier) – das wäre kein Löschen durch dich
      if (istNotenSpiegel(pfad, person) && !noten[pfad] && !z[pfad].teilweise) {
        await lokal.loeschen(pfad).catch(() => undefined);
        delete z[pfad];
      }
    }
    await spiegelZustandSetzen(z);
    this.spiegel.set(z);
  }

  /** Mitschnitt mit der Band teilen: in den Ordner „Mitschnitte/<Song>/“ des Sync-Ordners legen und abgleichen */
  async mitschnittTeilen(m: Mitschnitt): Promise<void> {
    const lokal = await this.lokal(true);
    if (!lokal) throw new Error('Kein Zugriff auf den Sync-Ordner – unter Einstellungen → Synchronisation wählen.');
    const pfad = mitschnittPfad(m, this.person(), mitschnittEndung(m));
    await lokal.schreiben(pfad.replace(/[^/]+$/, 'song.txt'), new Blob([m.song], { type: 'text/plain' }));
    await lokal.schreiben(pfad, m.daten);
    await mitschnittGeteilt(m, pfad);
    void this.jetzt();
  }

  // geteilte Mitschnitte der anderen beim Song übernehmen (einmal je Datei)
  private async mitschnitteNachher(lokal: SyncOrdner, liste: SyncDatei[]): Promise<number> {
    const bekannt = await mitschnittPfade();
    const songs = new Map<string, string>();
    let n = 0;
    for (const d of liste) {
      const info = mitschnittAusPfad(d.pfad);
      if (!info || bekannt.has(d.pfad)) continue;
      const ordner = d.pfad.replace(/[^/]+$/, '');
      if (!songs.has(ordner)) {
        const songDatei = liste.find((x) => x.pfad === ordner + 'song.txt');
        songs.set(ordner, songDatei ? (await (await lokal.lesen(songDatei.pfad)).text()).trim() : '');
      }
      const song = songs.get(ordner);
      if (!song) continue;
      await mitschnittSpeichern(song, await lokal.lesen(d.pfad), info.dauer, { datum: info.datum, von: info.von, pfad: d.pfad });
      n++;
    }
    return n;
  }

  private async notenExport(person: string): Promise<Record<string, { text: string; key?: string }>> {
    const infos = new Map((await notenDateien()).map((d) => [d.id, { name: d.name, groesse: d.groesse }]));
    const out: Record<string, { text: string; key?: string }> = {};
    for (const [key, n] of Object.entries(await alleSongNoten())) out[notenPfad(key)] = { text: notenText(key, n, infos), key };
    for (const [pfad, m] of Object.entries(markTexte(person, await alleMarkierungen(), infos))) out[pfad] = m;
    return out;
  }

  private async markierungenUebernehmen(datei: string, seiten: Record<string, Strich[]>, privat: boolean): Promise<void> {
    const alle = await alleMarkierungen();
    const nummern = new Set([...Object.keys(seiten), ...Object.keys(alle).filter((k) => k.startsWith(datei + ':')).map((k) => k.slice(datei.length + 1))]);
    for (const n of nummern) {
      const lokal = alle[`${datei}:${n}`] ?? [];
      const neu = markZusammen(lokal, seiten[n] ?? [], privat);
      if (JSON.stringify(neu) !== JSON.stringify(lokal)) await markierungenSetzen(datei, Number(n), neu);
    }
  }

  // Noten aus dem Sync-Ordner übernehmen: PDFs über Name und Größe finden, fehlende aus dem Ordner (z. B. Sheets/) holen
  private async notenNachher(lokal: SyncOrdner, person: string, liste: SyncDatei[]): Promise<number> {
    const z: SpiegelZustand = { ...(await spiegelZustandLaden()) };
    let infos: NotenDateiInfo[] = await notenDateien();
    const holen = async (name: string, groesse: number): Promise<NotenDateiInfo | undefined> => {
      const gefunden = pdfFinden(name, groesse, infos);
      if (gefunden) return gefunden;
      const quelle = liste.find((d) => d.groesse === groesse && d.pfad.split('/').at(-1)?.toLowerCase() === name.toLowerCase());
      if (!quelle) return undefined;
      await notenDateiSpeichern(name, await (await lokal.lesen(quelle.pfad)).arrayBuffer());
      infos = await notenDateien();
      return pdfFinden(name, groesse, infos);
    };
    let n = 0;
    this.spiegelt = true;
    try {
      const da = new Set<string>();
      for (const d of liste) {
        if (!istNotenSpiegel(d.pfad, person)) continue;
        da.add(d.pfad);
        // unvollständig Übernommenes (PDF fehlte) bei jedem Abgleich erneut versuchen – vielleicht ist es jetzt da
        if (z[d.pfad]?.version === d.version && !z[d.pfad]?.teilweise) continue;
        const text = await (await lokal.lesen(d.pfad)).text();
        if (d.pfad.startsWith('Noten/')) {
          const inhalt = JSON.parse(text) as NotenDateiInhalt;
          const pdfs: NotenPdf[] = [];
          for (const p of inhalt.pdfs ?? []) {
            const f = await holen(p.name, p.groesse);
            if (f) pdfs.push({ datei: f.id, ...(p.fassung ? { name: p.fassung } : {}), ...(p.von ? { von: p.von } : {}), ...(p.bis ? { bis: p.bis } : {}) });
          }
          await songNotenSetzen(inhalt.song, { pdfs, ...(inhalt.chordpro ? { chordpro: inhalt.chordpro } : {}) });
          // Stand = was dieses Gerät jetzt selbst schreiben würde – fehlt ein PDF hier, bleibt die Datei trotzdem unverändert
          const map = new Map(infos.map((x) => [x.id, { name: x.name, groesse: x.groesse }]));
          const teilweise = pdfs.length < (inhalt.pdfs ?? []).length;
          z[d.pfad] = { hash: hash(notenText(inhalt.song, { pdfs, chordpro: inhalt.chordpro }, map)), version: d.version, key: inhalt.song, ...(teilweise ? { teilweise } : {}) };
        } else {
          // Markierungen für alle (Band) bzw. die eigenen privaten: diese Art je Seite ersetzen, die andere bleibt
          const inhalt = JSON.parse(text) as MarkDateiInhalt;
          const f = await holen(inhalt.name, inhalt.groesse);
          if (f) await this.markierungenUebernehmen(f.id, inhalt.seiten ?? {}, !d.pfad.startsWith(`Markierungen/${BAND}/`));
          z[d.pfad] = { hash: hash(text), version: d.version, key: `${inhalt.groesse}|${inhalt.name}`, ...(f ? {} : { teilweise: true }) };
        }
        n++;
      }
      for (const [pfad, s] of Object.entries(z)) {
        if (!istNotenSpiegel(pfad, person) || da.has(pfad)) continue;
        if (pfad.startsWith('Noten/') && s.key) await songNotenSetzen(s.key, {});
        else if (pfad.startsWith('Markierungen/') && s.key) {
          // Datei verschwunden: diese Art Markierungen des PDFs entfernen
          const [groesse, ...name] = s.key.split('|');
          const f = pdfFinden(name.join('|'), Number(groesse), infos);
          if (f) await this.markierungenUebernehmen(f.id, {}, !pfad.startsWith(`Markierungen/${BAND}/`));
        }
        delete z[pfad];
        n++;
      }
    } finally {
      this.spiegelt = false;
    }
    await spiegelZustandSetzen(z);
    this.spiegel.set(z);
    return n;
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
      const nachListe = await lokal.liste();
      const notenSync = await this.notenNachher(lokal, person, nachListe);
      const aufnahmen = await this.mitschnitteNachher(lokal, nachListe).catch(() => 0);
      const daten = uebernommen + notenSync ? ` · ${uebernommen + notenSync} ${uebernommen + notenSync === 1 ? 'Eintrag' : 'Einträge'} übernommen` : '';
      const mit = aufnahmen ? ` · ${aufnahmen} ${aufnahmen === 1 ? 'Mitschnitt' : 'Mitschnitte'} der Band` : '';
      letzterSyncSetzen(ergebnisText(ergebnis) + daten + mit + noten + (ergebnis.fehler.length ? ` – ${ergebnis.fehler.slice(0, 3).join('; ')}` : ''), ergebnis.fehler.length > 0);
    } catch (err) {
      letzterSyncSetzen(`Abgebrochen: ${(err as Error).message || 'unbekannter Fehler'}`, true);
    } finally {
      this.letzter.set(letzterSync());
      this.stand.set(null);
      this.laeuft.set(false);
    }
  }
}
