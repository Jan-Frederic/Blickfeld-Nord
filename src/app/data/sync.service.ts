import { Injectable, signal } from '@angular/core';
import { SpiegelZustand, hash, personOrdner, planNachher, planVorher, spiegelArt, spiegelPfad } from './spiegel';
import { zusammenfuehren } from './spiegel-merge';
import { letztesKonto, oneDriveAnmelden, oneDriveEingerichtet, oneDriveKonto, oneDriveStill } from './onedrive';
import { ordnerErlaubnis } from './ordner';
import { SyncOrdner, SyncStand, ergebnisText, istDatenPfad, synchronisieren } from './sync';
import { eigenstaendigerSong, erkennen } from './erkennung';
import { NOTEN_GEAENDERT, NotenDateiInfo, NotenPdf, alleDoppeltenVerweiseEntfernen, alleMarkierungen, alleSongNoten, markierungenSetzen, notenDateiLoeschen, notenDateiSpeichern, notenDateien, songNoten, songNotenSetzen } from './noten';
import { BAND, MarkDateiInhalt, NotenDateiInhalt, istNotenSpiegel, markTexte, markZusammen, notenPfad, notenText, pdfFinden } from './noten-spiegel';
import type { Strich } from './noten';
import type { SyncDatei } from './sync';
import { Mitschnitt, mitschnittAusPfad, mitschnittEndung, mitschnittGeteilt, mitschnittPfad, mitschnittPfade, mitschnittSpeichern } from './mitschnitte';
import { geloeschtMerken, giltLoeschung, ladeGeloescht } from './noten-geloescht';
import { GERAETE_ORDNER, GeraetEintrag, geraetImFehler, geraetMeldung, geraeteListe } from './geraete';
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
/** schnell: nur Einstellungen und Daten; voll: alles (PDFs, Mitschnitte …) */
export type SyncArt = 'schnell' | 'voll';

@Injectable({ providedIn: 'root' })
export class SyncService {
  readonly laeuft = signal(false);
  readonly stand = signal<SyncStand | null>(null);
  readonly letzter = signal(letzterSync());
  /** zuletzt heruntergeladene Dateien (zum Einlesen anbieten) */
  readonly neu = signal<string[]>([]);
  private timer: ReturnType<typeof setInterval> | undefined;
  /** zählt hoch, wenn ein Abgleich Daten anderer Geräte übernommen hat – offene Seiten bauen sich dann neu auf */
  readonly neueDaten = signal(0);
  private letzterLauf = 0;
  /** letzter voller Abgleich (mit PDFs, Mitschnitten …) */
  private letzterVoll = 0;
  /** während eines Laufs angefordert: danach gleich noch einmal (schnell bzw. voll) */
  private nochmal: SyncArt | null = null;
  /** gelesene Geräte-Dateien je Version – nur Geänderte neu lesen */
  private readonly geraeteTexte = new Map<string, { version: string; text: string }>();
  /** online (für die Anzeige unten rechts) */
  readonly online = signal(typeof navigator === 'undefined' || navigator.onLine);
  /** Stand der gespiegelten Einstellungen und Daten (data/spiegel.ts) – für den Sync-Status im Abgleich */
  readonly spiegel = signal<SpiegelZustand>({});
  /** Ordner der angemeldeten Person für persönliche Einstellungen */
  readonly person = signal(personOrdner(letztesKonto() ?? ''));
  /** Einträge, die seit dem letzten Abgleich geändert wurden */
  readonly ausstehend = signal(0);
  /** Geräte, die zuletzt abgeglichen haben (Geraete/*.json im Sync-Ordner), neueste zuerst */
  readonly geraete = signal<GeraetEintrag[]>([]);
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
    // eigene Änderung (Häkchen, Setlist …): nur Einstellungen und Daten abgleichen – das geht in Sekunden
    this.nachAenderung = setTimeout(() => navigator.onLine && void this.jetzt(true, 'schnell'), 5000);
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

  /**
   * vor dem Abgleich: geänderte Einträge als Dateien in den lokalen Sync-Ordner, gelöschte dort entfernen.
   * Neu aufgesetztes Gerät (noch nie gespiegelt): nichts hochschreiben – was es schon hat (z. B. ein leerer Karteikasten
   * nach „Ich bin …“), würde sonst als neuere Fassung den Stand der Band überschreiben und eine Konfliktkopie erzeugen.
   * Diese Einträge kommen nach dem Abgleich dran (spiegelnNachher): mit OneDrive zusammengeführt bzw. dann hochgeladen.
   * Gibt die zurückgestellten Schlüssel zurück.
   */
  private async spiegelnVorher(lokal: SyncOrdner, person: string): Promise<string[]> {
    const z: SpiegelZustand = { ...(await spiegelZustandLaden()) };
    const neuesGeraet = !Object.keys(z).length;
    const werte = this.werte();
    const zurueck = neuesGeraet ? Object.keys(werte).filter((k) => spiegelPfad(k, person)) : [];
    const plan = planVorher(neuesGeraet ? {} : werte, z, person);
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
    return zurueck;
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

  /** true, wenn sich dadurch etwas geändert hat */
  private async markierungenUebernehmen(datei: string, seiten: Record<string, Strich[]>, privat: boolean): Promise<boolean> {
    const alle = await alleMarkierungen();
    const nummern = new Set([...Object.keys(seiten), ...Object.keys(alle).filter((k) => k.startsWith(datei + ':')).map((k) => k.slice(datei.length + 1))]);
    let geaendert = false;
    for (const n of nummern) {
      const lokal = alle[`${datei}:${n}`] ?? [];
      const neu = markZusammen(lokal, seiten[n] ?? [], privat);
      if (JSON.stringify(neu) !== JSON.stringify(lokal)) {
        await markierungenSetzen(datei, Number(n), neu);
        geaendert = true;
      }
    }
    return geaendert;
  }

  // Noten aus dem Sync-Ordner übernehmen: PDFs über Name und Größe finden, fehlende aus dem Ordner (z. B. Sheets/) holen
  private async notenNachher(lokal: SyncOrdner, person: string, liste: SyncDatei[]): Promise<number> {
    const z: SpiegelZustand = { ...(await spiegelZustandLaden()) };
    let infos: NotenDateiInfo[] = await notenDateien();
    const weg = ladeGeloescht();
    const holen = async (name: string, groesse: number, song?: string): Promise<NotenDateiInfo | undefined> => {
      const gefunden = pdfFinden(name, groesse, infos);
      if (gefunden) return gefunden;
      const quelle = liste.find((d) => d.groesse === groesse && d.pfad.split('/').at(-1)?.toLowerCase() === name.toLowerCase());
      if (!quelle) return undefined;
      // für alle gelöscht (und die Datei hier ist nicht neuer): nicht wieder einlesen
      if (giltLoeschung(weg, { name, groesse, zeit: quelle.geaendert })) return undefined;
      // der Song hat hier schon ein PDF dieses Namens (ältere Fassung): ersetzen statt eine zweite Kopie zu speichern
      const ids = new Set(((song && (await songNoten(song))?.pdfs) || []).map((p) => p.datei));
      const alt = infos.find((d) => ids.has(d.id) && d.name.toLowerCase() === name.toLowerCase());
      await notenDateiSpeichern(alt?.name ?? name, await (await lokal.lesen(quelle.pfad)).arrayBuffer(), alt?.id);
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
            const f = await holen(p.name, p.groesse, inhalt.song);
            if (f) pdfs.push({ datei: f.id, ...(p.fassung ? { name: p.fassung } : {}), ...(p.von ? { von: p.von } : {}), ...(p.bis ? { bis: p.bis } : {}) });
          }
          // nur zählen, wenn sich am Song wirklich etwas ändert – erneute Versuche (PDF fehlt noch) sind keine neuen Daten
          const vorher = JSON.stringify((await songNoten(inhalt.song)) ?? {});
          await songNotenSetzen(inhalt.song, { pdfs, ...(inhalt.chordpro ? { chordpro: inhalt.chordpro } : {}) });
          if (JSON.stringify((await songNoten(inhalt.song)) ?? {}) !== vorher) n++;
          // Stand = was dieses Gerät jetzt selbst schreiben würde – fehlt ein PDF hier, bleibt die Datei trotzdem unverändert
          const map = new Map(infos.map((x) => [x.id, { name: x.name, groesse: x.groesse }]));
          const teilweise = pdfs.length < (inhalt.pdfs ?? []).length;
          z[d.pfad] = { hash: hash(notenText(inhalt.song, { pdfs, chordpro: inhalt.chordpro }, map)), version: d.version, key: inhalt.song, ...(teilweise ? { teilweise } : {}) };
        } else {
          // Markierungen für alle (Band) bzw. die eigenen privaten: diese Art je Seite ersetzen, die andere bleibt
          const inhalt = JSON.parse(text) as MarkDateiInhalt;
          const f = await holen(inhalt.name, inhalt.groesse);
          if (f && (await this.markierungenUebernehmen(f.id, inhalt.seiten ?? {}, !d.pfad.startsWith(`Markierungen/${BAND}/`)))) n++;
          z[d.pfad] = { hash: hash(text), version: d.version, key: `${inhalt.groesse}|${inhalt.name}`, ...(f ? {} : { teilweise: true }) };
        }
      }
      for (const [pfad, s] of Object.entries(z)) {
        if (!istNotenSpiegel(pfad, person) || da.has(pfad)) continue;
        if (pfad.startsWith('Noten/') && s.key) {
          if (await songNoten(s.key)) n++;
          await songNotenSetzen(s.key, {});
        } else if (pfad.startsWith('Markierungen/') && s.key) {
          // Datei verschwunden: diese Art Markierungen des PDFs entfernen
          const [groesse, ...name] = s.key.split('|');
          const f = pdfFinden(name.join('|'), Number(groesse), infos);
          if (f && (await this.markierungenUebernehmen(f.id, {}, !pfad.startsWith(`Markierungen/${BAND}/`)))) n++;
        }
        delete z[pfad];
      }
    } finally {
      this.spiegelt = false;
    }
    await spiegelZustandSetzen(z);
    this.spiegel.set(z);
    return n;
  }

  // nach dem Abgleich: neue/geänderte Dateien in localStorage übernehmen, verschwundene Einträge entfernen
  // zurueck: Einträge eines neu aufgesetzten Geräts (spiegelnVorher) – liegt die Datei schon in OneDrive, gilt deren
  // Stand (Übe-Daten zusammengeführt, data/spiegel-merge.ts), sonst wird der Eintrag jetzt geschrieben. true in
  // hochladen: es muss gleich noch ein schneller Abgleich laufen.
  private hochladen = false;
  private async spiegelnNachher(lokal: SyncOrdner, person: string, liste: SyncDatei[], zurueck: string[] = []): Promise<number> {
    const z: SpiegelZustand = { ...(await spiegelZustandLaden()) };
    const dateien = new Map(liste.map((d) => [d.pfad, d]));
    let n = 0;
    this.spiegelt = true;
    try {
      for (const key of zurueck) {
        const pfad = spiegelPfad(key, person);
        const eigen = localStorage.getItem(key);
        if (!pfad || eigen === null) continue;
        const d = dateien.get(pfad);
        const andere = d ? await (await lokal.lesen(pfad)).text() : null;
        const text = zusammenfuehren(key, eigen, andere);
        if (text !== eigen) {
          localStorage.setItem(key, text);
          n++;
        }
        if (d && text === andere) z[pfad] = { hash: hash(text), version: d.version };
        else {
          // nur hier vorhanden oder zusammengeführt: als Datei ablegen, der nächste Abgleich lädt sie hoch
          const datei = await lokal.schreiben(pfad, new Blob([text], { type: 'application/json' }));
          z[pfad] = { hash: hash(text), version: datei.version };
          this.hochladen = true;
        }
      }
    } finally {
      this.spiegelt = false;
    }
    const plan = planNachher(liste, z, person);
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
  private async notenEinlesen(lokal: SyncOrdner, neu: string[], liste: SyncDatei[]): Promise<string> {
    const weg = ladeGeloescht();
    const info = new Map(liste.map((d) => [d.pfad, d]));
    // für alle Gelöschtes nicht wieder einlesen (kommt es z. B. von einem Gerät, das die Löschung noch nicht kennt)
    const pfade = neu.filter((p) => (istPdf(p) || istAkkordblatt(p)) && !(info.get(p) && giltLoeschung(weg, { name: p, groesse: info.get(p)!.groesse, zeit: info.get(p)!.geaendert })));
    if (!pfade.length) return '';
    const groesse = new Map(liste.map((d) => [d.pfad, d.groesse]));
    const eindeutig: NotenQuelle[] = [];
    const offen: string[] = [];
    for (const [i, pfad] of pfade.entries()) {
      const name = pfad.split('/').at(-1)!;
      this.stand.set({ text: `Noten erkennen: ${name}`, fertig: i, gesamt: pfade.length });
      const daten = async () => (await lokal.lesen(pfad)).arrayBuffer();
      // schon einmal als „eigenständig“ eingelesen (Song in keiner Spotify-Liste): gleich wieder dorthin
      const e = eigenstaendigerSong(name) ?? (await erkennen(name, pfad, daten));
      if (e.key) eindeutig.push({ name, pfad, groesse: groesse.get(pfad) ?? 0, daten, ziel: { key: e.key, fassung: e.fassung } });
      else offen.push(pfad);
    }
    const r = await notenEinlesen(eindeutig, await notenDateien(), (fertig, gesamt, name) => this.stand.set({ text: `Noten einlesen: ${name}`, fertig, gesamt }));
    offeneNotenSetzen([...offeneNoten().filter((p) => !pfade.includes(p)), ...offen]);
    this.offen.set(offeneNoten());
    const n = r.pdfs + r.aktualisiert + r.blaetter;
    return [n && ` · ${n} Noten eingelesen`, offen.length && ` · ${offen.length} Noten brauchen eine Zuordnung`].filter(Boolean).join('');
  }

  /**
   * Offene Noten, die inzwischen als „eigenständig“ zugeordnet sind (z. B. auf einem anderen Gerät, gemerkt über die
   * gespiegelten Zuordnungen), direkt einlesen – sie brauchen keine Zuordnung von Hand mehr. Zahl der eingelesenen.
   */
  async eigenstaendigeOffeneEinlesen(): Promise<number> {
    const pfade = offeneNoten().filter((p) => eigenstaendigerSong(p.split('/').at(-1)!));
    if (!pfade.length) return 0;
    const lokal = await this.lokal();
    if (!lokal) return 0;
    const da = new Map((await lokal.liste()).map((d) => [d.pfad, d.groesse]));
    const quellen: NotenQuelle[] = pfade
      .filter((p) => da.has(p))
      .map((pfad) => {
        const name = pfad.split('/').at(-1)!;
        return { name, pfad, groesse: da.get(pfad) ?? 0, daten: async () => (await lokal.lesen(pfad)).arrayBuffer(), ziel: eigenstaendigerSong(name)! };
      });
    if (quellen.length) await notenEinlesen(quellen, await notenDateien(), () => undefined);
    this.offenErledigt(pfade);
    return quellen.length;
  }

  /** offene Zuordnungen erledigt (eingelesen oder verworfen) */
  offenErledigt(pfade: string[]): void {
    offeneNotenSetzen(offeneNoten().filter((p) => !pfade.includes(p)));
    this.offen.set(offeneNoten());
  }

  /** Geräte-Liste aus dem Sync-Ordner lesen (ohne Liste: Ordner selbst lesen, ohne nach Erlaubnis zu fragen) */
  async geraeteLesen(lokal?: SyncOrdner | null, liste?: SyncDatei[]): Promise<void> {
    lokal ??= await this.lokal();
    if (!lokal) return;
    liste ??= await lokal.liste();
    const dateien = liste.filter((d) => d.pfad.startsWith(GERAETE_ORDNER + '/') && d.pfad.endsWith('.json') && !d.pfad.includes('(Konflikt') && d.groesse < 10_000);
    const texte = await Promise.all(
      dateien.map(async (d) => {
        const alt = this.geraeteTexte.get(d.pfad);
        if (alt?.version === d.version) return alt.text;
        const text = await (await lokal!.lesen(d.pfad)).text();
        this.geraeteTexte.set(d.pfad, { version: d.version, text });
        return text;
      }),
    );
    this.geraete.set(geraeteListe(texte));
  }

  /**
   * Dateien (gleicher Name und gleiche Größe) aus dem lokalen Sync-Ordner löschen und gleich abgleichen – damit auch
   * aus OneDrive. Nur mit Berechtigung „Daten löschen“; Zahl der gelöschten Dateien.
   */
  async ausOneDriveLoeschen(dateien: { name: string; groesse: number }[]): Promise<number> {
    if (!this.darfLoeschen()) throw new Error('Keine Berechtigung „Daten löschen“.');
    const lokal = await this.lokal(true);
    if (!lokal) throw new Error('Kein Zugriff auf den Sync-Ordner – unter Einstellungen → Synchronisation wählen.');
    // für alle merken: jedes Gerät entfernt die Datei beim nächsten Abgleich – auch die eingelesene Kopie
    geloeschtMerken(dateien);
    const passt = new Set(dateien.map((d) => `${d.name.toLocaleLowerCase('de')}|${d.groesse}`));
    let n = 0;
    for (const x of await lokal.liste())
      if (passt.has(`${x.pfad.split('/').at(-1)!.toLocaleLowerCase('de')}|${x.groesse}`)) {
        await lokal.loeschen(x.pfad);
        n++;
      }
    void this.jetzt();
    return n;
  }

  /**
   * Für alle gelöschte Noten-Dateien (data/noten-geloescht.ts) auf diesem Gerät entfernen: aus dem Sync-Ordner, aus
   * OneDrive (falls ein Gerät sie inzwischen wieder hochgeladen hat) und aus dem Noten-Speicher. Zahl der Dateien.
   */
  private async geloeschteAnwenden(lokal: SyncOrdner, cloud: SyncOrdner, liste: SyncDatei[]): Promise<number> {
    const weg = ladeGeloescht();
    if (!weg.length) return 0;
    let n = 0;
    for (const d of liste) {
      if (!/\.pdf$/i.test(d.pfad) || !giltLoeschung(weg, { name: d.pfad, groesse: d.groesse, zeit: d.geaendert })) continue;
      await lokal.loeschen(d.pfad).catch(() => undefined);
      await cloud.loeschen(d.pfad).catch(() => undefined);
      n++;
    }
    for (const f of await notenDateien())
      if (giltLoeschung(weg, { name: f.name, groesse: f.groesse, zeit: f.hinzugefuegt })) {
        await notenDateiLoeschen(f.id);
        n++;
      }
    return n;
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
    const los = (art: SyncArt) => {
      if (syncEinstellungen().auto && this.bereit() && navigator.onLine && !document.hidden) void this.jetzt(true, art);
    };
    // beim Öffnen: erst die Daten (schnell sichtbar), Neues darüber hinaus lädt der Schnellabgleich gleich nach
    setTimeout(() => los(this.vollFaellig() ? 'voll' : 'schnell'), 3000);
    this.timer = setInterval(() => los('voll'), VOLL_ALLE_MS);
    addEventListener('online', () => los('schnell'));
    // App wieder im Vordergrund (Handy entsperrt, Tab gewechselt): gleich die Daten abgleichen statt bis zu 15 Minuten zu warten
    document.addEventListener('visibilitychange', () => !document.hidden && Date.now() - this.letzterLauf > 60_000 && los(this.vollFaellig() ? 'voll' : 'schnell'));
  }

  private vollFaellig(): boolean {
    return Date.now() - this.letzterVoll > VOLL_ALLE_MS;
  }

  /**
   * Jetzt abgleichen. still=true (automatisch): keine Rückfragen, kein Popup – fehlt die Anmeldung oder die
   * Erlaubnis für den Ordner, wird es beim nächsten Klick auf „Jetzt synchronisieren“ nachgeholt.
   * art 'schnell': nur Einstellungen und Daten (JSON in Daten/, Einstellungen/, Noten/, Markierungen/, Geraete/) –
   * liegen in OneDrive neue PDFs oder Mitschnitte, folgt gleich danach der volle Abgleich.
   */
  async jetzt(still = false, art: SyncArt = 'voll'): Promise<void> {
    if (!this.bereit()) return;
    if (this.laeuft()) {
      // nicht verlieren: nach dem laufenden Abgleich noch einmal
      if (art === 'voll' || !this.nochmal) this.nochmal = art;
      return;
    }
    const e = syncEinstellungen();
    const schnell = art === 'schnell';
    this.laeuft.set(true);
    this.letzterLauf = Date.now();
    let danach: SyncArt | null = null;
    try {
      const konto = (await oneDriveKonto()) ?? (await oneDriveAnmelden(still));
      if (!konto) {
        // keine Anmeldung zustande gekommen (automatisch: ohne Rückfrage nicht möglich) – sagen statt still nichts zu tun
        letzterSyncSetzen(
          still
            ? 'Automatischer Abgleich übersprungen: Anmeldung bei OneDrive nötig – „Jetzt synchronisieren“ antippen'
            : 'Abgebrochen: nicht bei OneDrive angemeldet – „Jetzt synchronisieren“ antippen und anmelden',
          true,
        );
        return;
      }
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
      const zurueck = await this.spiegelnVorher(lokal, person);
      // dieses Gerät als „zuletzt abgeglichen“ melden (höchstens stündlich eine neue Datei)
      const g = geraetMeldung(person);
      if (g) await lokal.schreiben(g.pfad, new Blob([g.text], { type: 'application/json' })).catch(() => undefined);
      const zustand = await syncZustand();
      const cloud = cloudOrdner({ pfad: e.cloud, wurzel: e.wurzel });
      const lauf = () =>
        synchronisieren(cloud, lokal, zustand, { ...e, gewollt: gewollteLoeschung, ...(schnell ? { nur: istDatenPfad } : {}) }, {
          melden: (s) => this.stand.set(s),
          bestaetigen: (text) => !still && confirm(text),
          speichern: (z) => syncZustandSetzen(z).then(() => undefined),
        });
      const { ergebnis, lokal: nachListe } = still ? await oneDriveStill(lauf) : await lauf();
      this.neu.set(ergebnis.neu);
      // die Liste nach dem Abgleich kommt aus dem Abgleich selbst – der Ordner muss nicht noch einmal gelesen werden
      this.hochladen = false;
      const uebernommen = await this.spiegelnNachher(lokal, person, nachListe, zurueck);
      const noten = !schnell && e.notenAuto ? await this.notenEinlesen(lokal, ergebnis.neu, nachListe) : '';
      const notenSync = await this.notenNachher(lokal, person, nachListe);
      const aufnahmen = schnell ? 0 : await this.mitschnitteNachher(lokal, nachListe).catch(() => 0);
      const weg = schnell ? 0 : await this.geloeschteAnwenden(lokal, cloud, nachListe).catch(() => 0);
      await this.geraeteLesen(lokal, nachListe).catch(() => undefined);
      // doppelte PDF-Verweise an Songs (aus früheren Abgleichen) aufräumen
      const bereinigt = schnell ? 0 : await alleDoppeltenVerweiseEntfernen().catch(() => 0);
      if (!schnell) this.letzterVoll = Date.now();
      const daten = uebernommen + notenSync ? ` · ${uebernommen + notenSync} ${uebernommen + notenSync === 1 ? 'Eintrag' : 'Einträge'} übernommen` : '';
      const mit = (aufnahmen ? ` · ${aufnahmen} ${aufnahmen === 1 ? 'Mitschnitt' : 'Mitschnitte'} der Band` : '') + (weg ? ` · ${weg} für alle gelöschte ${weg === 1 ? 'Noten-Datei' : 'Noten-Dateien'} entfernt` : '');
      const offen = ergebnis.ausstehend?.dateien ? ` · ${ausstehendText(ergebnis.ausstehend)} werden geladen` : '';
      if (offen || (schnell && this.vollFaellig())) danach = 'voll';
      // neu aufgesetztes Gerät: eigene bzw. zusammengeführte Einträge gleich hochladen
      else if (this.hochladen) danach = 'schnell';
      letzterSyncSetzen((schnell ? 'Daten: ' : '') + ergebnisText(ergebnis) + daten + mit + noten + offen + (ergebnis.fehler.length ? ` – ${ergebnis.fehler.slice(0, 3).map((f) => geraetImFehler(f, this.geraete())).join('; ')}` : '') + (ergebnis.hinweise?.length ? ` · Geräteliste: ${ergebnis.hinweise.length === 1 ? 'ein Eintrag' : `${ergebnis.hinweise.length} Einträge`} nicht lesbar (${ergebnis.hinweise.slice(0, 3).map((f) => geraetImFehler(f, this.geraete()).replace(/:.*$/, '')).join('; ')}) – wird wiederholt` : ''), ergebnis.fehler.length > 0);
      // Daten anderer Geräte übernommen: offene Seiten neu aufbauen lassen (sync-kompass.ts)
      if (uebernommen + notenSync + aufnahmen + weg + bereinigt + (noten ? 1 : 0) > 0) this.neueDaten.update((n) => n + 1);
    } catch (err) {
      letzterSyncSetzen(`Abgebrochen: ${(err as Error).message || 'unbekannter Fehler'}`, true);
    } finally {
      this.letzter.set(letzterSync());
      this.stand.set(null);
      this.laeuft.set(false);
    }
    // angefordert während des Laufs oder PDFs warten: gleich weiter (still – ohne Rückfragen)
    const weiter = this.nochmal === 'voll' || danach === 'voll' ? 'voll' : (this.nochmal ?? danach);
    this.nochmal = null;
    if (weiter && navigator.onLine) void this.jetzt(true, weiter);
  }
}

/** in OneDrive bzw. im Sync-Ordner verschwundene PDF, die die Band „für alle gelöscht“ hat – kein Grund zur Rückfrage */
function gewollteLoeschung(d: SyncDatei): boolean {
  return /\.pdf$/i.test(d.pfad) && giltLoeschung(ladeGeloescht(), { name: d.pfad, groesse: d.groesse });
}

/** voller Abgleich (PDFs, Mitschnitte …) automatisch höchstens so oft – Daten gehen nach jeder Änderung sofort */
const VOLL_ALLE_MS = 15 * 60_000;

/** „3 Dateien (12 MB)“ */
function ausstehendText(a: { dateien: number; bytes: number }): string {
  const mb = a.bytes / 1e6;
  const groesse = a.bytes ? ` (${mb < 1 ? '< 1' : Math.round(mb).toLocaleString('de-DE')} MB)` : '';
  return `${a.dateien} ${a.dateien === 1 ? 'Datei' : 'Dateien'}${groesse}`;
}

