// Notenblätter (PDF) und Akkordblätter (ChordPro) je Song – nur auf diesem Gerät, in der Browser-Datenbank
// (IndexedDB, Platz für mehrere hundert MB). Nie im Repository: Noten und Liedtexte sind urheberrechtlich geschützt.
// Weitergabe in der Band als Datei („Notenblätter an die Band“), die direkt von Gerät zu Gerät geht.

/** gespeicherte PDF-Datei – ein Songbook kann für mehrere Songs dienen */
export interface NotenDatei {
  id: string;
  name: string;
  daten: ArrayBuffer;
  groesse: number;
  hinzugefuegt: string;
}
export type NotenDateiInfo = Omit<NotenDatei, 'daten'>;

/** Noten eines Songs: PDF (ggf. nur bestimmte Seiten) und/oder Akkordblatt */
export interface SongNoten {
  pdf?: { datei: string; von?: number; bis?: number };
  chordpro?: string;
}

const DB = 'bn-noten';
const DATEIEN = 'dateien';
const SONGS = 'songs';

let offen: Promise<IDBDatabase> | undefined;
function db(): Promise<IDBDatabase> {
  offen ??= new Promise((ok, fehler) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DATEIEN, { keyPath: 'id' });
      req.result.createObjectStore(SONGS);
    };
    req.onsuccess = () => ok(req.result);
    req.onerror = () => {
      offen = undefined;
      fehler(req.error);
    };
  });
  return offen;
}

async function anfrage<T = unknown>(store: string, modus: IDBTransactionMode, tun: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const d = await db();
  return new Promise((ok, fehler) => {
    const req = tun(d.transaction(store, modus).objectStore(store));
    req.onsuccess = () => ok(req.result as T);
    req.onerror = () => fehler(req.error);
  });
}

/** alle Dateien ohne Inhalt (für Listen) */
export async function notenDateien(): Promise<NotenDateiInfo[]> {
  const alle = await anfrage<NotenDatei[]>(DATEIEN, 'readonly', (s) => s.getAll());
  return alle.map(({ daten: _, ...info }) => info).sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

export function notenDatei(id: string): Promise<NotenDatei | undefined> {
  return anfrage<NotenDatei | undefined>(DATEIEN, 'readonly', (s) => s.get(id));
}

export async function notenDateiSpeichern(name: string, daten: ArrayBuffer, id: string = crypto.randomUUID()): Promise<string> {
  await anfrage(DATEIEN, 'readwrite', (s) => s.put({ id, name, daten, groesse: daten.byteLength, hinzugefuegt: new Date().toISOString() } satisfies NotenDatei));
  // den Browser bitten, die Daten nicht bei Platzmangel zu löschen (iPhone/iPad: besser als App installieren)
  navigator.storage?.persist?.().catch(() => undefined);
  return id;
}

/** Datei löschen – Songs, die sie nutzen, verlieren ihr PDF */
export async function notenDateiLoeschen(id: string): Promise<void> {
  await anfrage(DATEIEN, 'readwrite', (s) => s.delete(id));
  const songs = await alleSongNoten();
  for (const [key, n] of Object.entries(songs)) if (n.pdf?.datei === id) await songNotenSetzen(key, { ...n, pdf: undefined });
}

export async function songNoten(key: string): Promise<SongNoten | undefined> {
  return anfrage<SongNoten | undefined>(SONGS, 'readonly', (s) => s.get(key));
}

/** Noten eines Songs setzen; ohne PDF und Akkordblatt wird der Eintrag entfernt */
export async function songNotenSetzen(key: string, noten: SongNoten): Promise<void> {
  const leer = !noten.pdf && !noten.chordpro?.trim();
  await anfrage(SONGS, 'readwrite', (s) => (leer ? s.delete(key) : s.put(noten, key)));
}

/** alle Songs mit Noten, Schlüssel „Titel|Interpret“ */
export async function alleSongNoten(): Promise<Record<string, SongNoten>> {
  const d = await db();
  return new Promise((ok, fehler) => {
    const out: Record<string, SongNoten> = {};
    const req = d.transaction(SONGS, 'readonly').objectStore(SONGS).openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (!c) return ok(out);
      out[String(c.key)] = c.value as SongNoten;
      c.continue();
    };
    req.onerror = () => fehler(req.error);
  });
}

// ---- Austausch in der Band ---------------------------------------------------------------------------------

export const NOTEN_APP = 'blickfeld-nord-noten';

interface NotenPaket {
  app: typeof NOTEN_APP;
  version: 1;
  exportiert: string;
  dateien: { id: string; name: string; base64: string }[];
  songs: Record<string, SongNoten>;
}

const zuBase64 = (b: ArrayBuffer) => {
  const bytes = new Uint8Array(b);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const ausBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer;

/** alle Noten dieses Geräts als Datei zum Teilen */
export async function notenExportieren(): Promise<File | null> {
  const songs = await alleSongNoten();
  if (!Object.keys(songs).length) return null;
  const genutzt = new Set(Object.values(songs).map((n) => n.pdf?.datei).filter(Boolean));
  const dateien: NotenPaket['dateien'] = [];
  for (const id of genutzt) {
    const d = await notenDatei(id!);
    if (d) dateien.push({ id: d.id, name: d.name, base64: zuBase64(d.daten) });
  }
  const paket: NotenPaket = { app: NOTEN_APP, version: 1, exportiert: new Date().toISOString(), dateien, songs };
  const name = `blickfeld-nord-noten-${new Date().toISOString().slice(0, 10)}.json`;
  return new File([JSON.stringify(paket)], name, { type: 'application/json' });
}

/** Noten-Datei einlesen: Dateien und Zuordnungen übernehmen (gleiche Songs werden ersetzt); Anzahl Songs */
export async function notenImportieren(text: string): Promise<number> {
  const paket = JSON.parse(text) as Partial<NotenPaket>;
  if (paket.app !== NOTEN_APP || !paket.songs) throw new Error('keine Noten-Datei');
  for (const d of paket.dateien ?? []) await notenDateiSpeichern(d.name, ausBase64(d.base64), d.id);
  for (const [key, n] of Object.entries(paket.songs)) await songNotenSetzen(key, n);
  return Object.keys(paket.songs).length;
}

/** pdf.js schon einmal laden, damit Noten auch offline angezeigt werden können (Service Worker merkt sich die Dateien) */
export function pdfjsVorladen(): void {
  for (const f of ['pdf.min.mjs', 'pdf.worker.min.mjs']) fetch(`/pdfjs/${f}`).catch(() => undefined);
}
