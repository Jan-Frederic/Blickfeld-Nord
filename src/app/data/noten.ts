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

/** ein PDF eines Songs (ggf. nur bestimmte Seiten eines Songbooks), name = Fassung, z. B. „Bass“ oder „Gitarre v2“ */
export interface NotenPdf {
  datei: string;
  von?: number;
  bis?: number;
  name?: string;
}

/** Noten eines Songs: beliebig viele PDFs (Bass, Gitarre, Fassungen) und/oder ein Akkordblatt */
export interface SongNoten {
  pdfs?: NotenPdf[];
  chordpro?: string;
  /** frühere Form mit nur einem PDF – wird beim Lesen zu pdfs */
  pdf?: NotenPdf;
}

/** frühere Einträge ({pdf}) in die heutige Form ({pdfs}) bringen */
export function notenNormal(n: SongNoten): SongNoten {
  const { pdf, pdfs, ...rest } = n;
  const liste = pdfs ?? (pdf ? [pdf] : []);
  return liste.length ? { ...rest, pdfs: liste } : rest;
}

/** Anzeigename eines PDFs: Fassung, sonst Nummer */
export const pdfName = (p: NotenPdf, i: number, alle: NotenPdf[]) => p.name?.trim() || (alle.length > 1 ? `PDF ${i + 1}` : 'PDF');

const DB = 'bn-noten';
const DATEIEN = 'dateien';
const SONGS = 'songs';
const MARKIERUNGEN = 'markierungen';

let offen: Promise<IDBDatabase> | undefined;
function db(): Promise<IDBDatabase> {
  offen ??= new Promise((ok, fehler) => {
    const req = indexedDB.open(DB, 2);
    // Version 1: Dateien und Songs; Version 2: Markierungen je PDF-Seite (vorhandene Daten bleiben)
    req.onupgradeneeded = () => {
      const namen = req.result.objectStoreNames;
      if (!namen.contains(DATEIEN)) req.result.createObjectStore(DATEIEN, { keyPath: 'id' });
      if (!namen.contains(SONGS)) req.result.createObjectStore(SONGS);
      if (!namen.contains(MARKIERUNGEN)) req.result.createObjectStore(MARKIERUNGEN);
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

/** Datei löschen – Songs, die sie nutzen, verlieren ihr PDF, die Markierungen gehen mit */
export async function notenDateiLoeschen(id: string): Promise<void> {
  await anfrage(DATEIEN, 'readwrite', (s) => s.delete(id));
  await anfrage(MARKIERUNGEN, 'readwrite', (s) => s.delete(IDBKeyRange.bound(`${id}:`, `${id}:\uffff`)));
  const songs = await alleSongNoten();
  for (const [key, n] of Object.entries(songs)) {
    if (n.pdfs?.some((p) => p.datei === id)) await songNotenSetzen(key, { ...n, pdfs: n.pdfs.filter((p) => p.datei !== id) });
  }
}

export async function songNoten(key: string): Promise<SongNoten | undefined> {
  const n = await anfrage<SongNoten | undefined>(SONGS, 'readonly', (s) => s.get(key));
  return n && notenNormal(n);
}

/** Noten eines Songs setzen; ohne PDF und Akkordblatt wird der Eintrag entfernt */
export async function songNotenSetzen(key: string, noten: SongNoten): Promise<void> {
  const n = notenNormal(noten);
  const leer = !n.pdfs?.length && !n.chordpro?.trim();
  await anfrage(SONGS, 'readwrite', (s) => (leer ? s.delete(key) : s.put(n, key)));
  gemeldet();
}

/** Noten geändert (Zuordnung, Akkordblatt, Markierung, neue Datei) – die Synchronisation gleicht dann ab */
export const NOTEN_GEAENDERT = 'bn-noten-geaendert';
function gemeldet(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(NOTEN_GEAENDERT));
}

/** alle Markierungen (Schlüssel „Datei-ID:Seite“) – für die Synchronisation */
export async function alleMarkierungen(): Promise<Record<string, Strich[]>> {
  const d = await db();
  return new Promise((ok, fehler) => {
    const out: Record<string, Strich[]> = {};
    const req = d.transaction(MARKIERUNGEN, 'readonly').objectStore(MARKIERUNGEN).openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (!c) return ok(out);
      out[String(c.key)] = c.value as Strich[];
      c.continue();
    };
    req.onerror = () => fehler(req.error);
  });
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
      out[String(c.key)] = notenNormal(c.value as SongNoten);
      c.continue();
    };
    req.onerror = () => fehler(req.error);
  });
}

// ---- Markierungen (Zeichnungen im Notenblatt, je PDF-Datei und Seite) ----------------------------------------

/** ein Strich: Farbe, Breite (Anteil der Seitenbreite), Punkte als x,y-Paare von 0 bis 1 */
export interface Strich {
  farbe: string;
  breite: number;
  punkte: number[];
  /** nur für mich – sonst gilt die Markierung für alle (Synchronisation) */
  privat?: boolean;
}

const markKey = (datei: string, seite: number) => `${datei}:${seite}`;

export async function markierungen(datei: string, seite: number): Promise<Strich[]> {
  return (await anfrage<Strich[] | undefined>(MARKIERUNGEN, 'readonly', (s) => s.get(markKey(datei, seite)))) ?? [];
}

export async function markierungenSetzen(datei: string, seite: number, striche: Strich[]): Promise<void> {
  await anfrage(MARKIERUNGEN, 'readwrite', (s) => (striche.length ? s.put(striche, markKey(datei, seite)) : s.delete(markKey(datei, seite))));
  gemeldet();
}

/** alle Markierungen der genannten Dateien (für das Notenpaket) */
async function markierungenVon(dateien: Set<string>): Promise<Record<string, Strich[]>> {
  const d = await db();
  return new Promise((ok, fehler) => {
    const out: Record<string, Strich[]> = {};
    const req = d.transaction(MARKIERUNGEN, 'readonly').objectStore(MARKIERUNGEN).openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (!c) return ok(out);
      if (dateien.has(String(c.key).split(':')[0])) out[String(c.key)] = c.value as Strich[];
      c.continue();
    };
    req.onerror = () => fehler(req.error);
  });
}

// ---- Aufräumen (Backstage → Abgleich) ---------------------------------------------------------------------

/** leere Noten-Einträge von Songs, die in keiner Liste (mehr) stehen, und PDFs, die kein Song nutzt – Songs mit
 *  PDF oder Akkordblatt bleiben: sie stehen unter Songs auch ohne Spotify-Titel */
export async function notenVerwaist(repertoire: Set<string>): Promise<{ songs: string[]; dateien: NotenDateiInfo[] }> {
  const songs = await alleSongNoten();
  const weg = Object.keys(songs).filter((k) => !repertoire.has(k) && !songs[k].pdfs?.length && !songs[k].chordpro);
  const genutzt = new Set(Object.entries(songs).filter(([k]) => !weg.includes(k)).flatMap(([, n]) => (n.pdfs ?? []).map((p) => p.datei)));
  return { songs: weg, dateien: (await notenDateien()).filter((d) => !genutzt.has(d.id)) };
}

export async function notenEntfernen(songs: string[], dateien: string[]): Promise<void> {
  for (const k of songs) await anfrage(SONGS, 'readwrite', (s) => s.delete(k));
  for (const id of dateien) await anfrage(DATEIEN, 'readwrite', (s) => s.delete(id));
}

/** alle Noten auf diesem Gerät löschen (die ganze Datenbank) */
export async function notenAllesLoeschen(): Promise<void> {
  if (offen) {
    (await offen.catch(() => undefined))?.close();
    offen = undefined;
  }
  await new Promise<void>((ok) => {
    const req = indexedDB.deleteDatabase(DB);
    req.onsuccess = req.onerror = req.onblocked = () => ok();
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
  /** Zeichnungen je „Datei-ID:Seite“ (ab Version mit Markierungen; ältere Pakete haben keine) */
  markierungen?: Record<string, Strich[]>;
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
  const genutzt = new Set(Object.values(songs).flatMap((n) => (n.pdfs ?? []).map((p) => p.datei)));
  const dateien: NotenPaket['dateien'] = [];
  for (const id of genutzt) {
    const d = await notenDatei(id);
    if (d) dateien.push({ id: d.id, name: d.name, base64: zuBase64(d.daten) });
  }
  const paket: NotenPaket = { app: NOTEN_APP, version: 1, exportiert: new Date().toISOString(), dateien, songs, markierungen: await markierungenVon(genutzt) };
  const name = `blickfeld-nord-noten-${new Date().toISOString().slice(0, 10)}.json`;
  return new File([JSON.stringify(paket)], name, { type: 'application/json' });
}

/** Noten-Datei einlesen: Dateien und Zuordnungen übernehmen (gleiche Songs werden ersetzt); Anzahl Songs */
export async function notenImportieren(text: string): Promise<number> {
  const paket = JSON.parse(text) as Partial<NotenPaket>;
  if (paket.app !== NOTEN_APP || !paket.songs) throw new Error('keine Noten-Datei');
  for (const d of paket.dateien ?? []) await notenDateiSpeichern(d.name, ausBase64(d.base64), d.id);
  for (const [key, n] of Object.entries(paket.songs)) await songNotenSetzen(key, n);
  for (const [key, striche] of Object.entries(paket.markierungen ?? {})) await anfrage(MARKIERUNGEN, 'readwrite', (s) => s.put(striche, key));
  return Object.keys(paket.songs).length;
}

/** pdf.js schon einmal laden, damit Noten auch offline angezeigt werden können (Service Worker merkt sich die Dateien) */
export function pdfjsVorladen(): void {
  for (const f of ['pdf.min.mjs', 'pdf.worker.min.mjs']) fetch(`/pdfjs/${f}`).catch(() => undefined);
}
