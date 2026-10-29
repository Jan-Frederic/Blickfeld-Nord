// Proben-Mitschnitte je Song: am Handy aufnehmen, die Aufnahme bleibt beim Song auf diesem Gerät (IndexedDB
// „bn-mitschnitte“) – zum Nachhören zu Hause. Nie im Repository und nicht im Backup (zu groß);
// weitergeben über „Teilen“. Gelöscht wird je Aufnahme oder unter Abgleich → Aufräumen.
const DB = 'bn-mitschnitte';
const AUFNAHMEN = 'aufnahmen';

export interface Mitschnitt {
  id: string;
  /** „Titel|Interpret“ */
  song: string;
  /** ISO-Zeitpunkt der Aufnahme */
  datum: string;
  /** Länge in Sekunden */
  dauer: number;
  daten: Blob;
}

let offen: Promise<IDBDatabase> | undefined;
function db(): Promise<IDBDatabase> {
  offen ??= new Promise((ok, fehler) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(AUFNAHMEN, { keyPath: 'id' }).createIndex('song', 'song');
    req.onsuccess = () => ok(req.result);
    req.onerror = () => {
      offen = undefined;
      fehler(req.error);
    };
  });
  return offen;
}

async function anfrage<T>(modus: IDBTransactionMode, tun: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const d = await db();
  return new Promise((ok, fehler) => {
    const req = tun(d.transaction(AUFNAHMEN, modus).objectStore(AUFNAHMEN));
    req.onsuccess = () => ok(req.result as T);
    req.onerror = () => fehler(req.error);
  });
}

/** Aufnahmen eines Songs, neueste zuerst */
export async function mitschnitte(song: string): Promise<Mitschnitt[]> {
  const liste = await anfrage<Mitschnitt[]>('readonly', (s) => s.index('song').getAll(song));
  return liste.sort((a, b) => b.datum.localeCompare(a.datum));
}

export async function mitschnittSpeichern(song: string, daten: Blob, dauer: number): Promise<Mitschnitt> {
  const m: Mitschnitt = { id: crypto.randomUUID(), song, datum: new Date().toISOString(), dauer, daten };
  await anfrage('readwrite', (s) => s.put(m));
  navigator.storage?.persist?.().catch(() => undefined);
  return m;
}

export function mitschnittLoeschen(id: string): Promise<void> {
  return anfrage('readwrite', (s) => s.delete(id));
}

/** Anzahl, Songs und Größe aller Aufnahmen (für Abgleich → Aufräumen) */
export async function mitschnittUebersicht(): Promise<{ anzahl: number; songs: number; bytes: number }> {
  const alle = await anfrage<Mitschnitt[]>('readonly', (s) => s.getAll());
  return { anzahl: alle.length, songs: new Set(alle.map((m) => m.song)).size, bytes: alle.reduce((n, m) => n + m.daten.size, 0) };
}

export async function mitschnitteAllesLoeschen(): Promise<void> {
  if (offen) {
    (await offen.catch(() => undefined))?.close();
    offen = undefined;
  }
  await new Promise<void>((ok) => {
    const req = indexedDB.deleteDatabase(DB);
    req.onsuccess = req.onerror = req.onblocked = () => ok();
  });
}

/** Dateiname zum Teilen, z. B. „Wonderwall 2026-11-03 19-42.webm“ */
export function mitschnittName(m: Mitschnitt, titel: string): string {
  const endung = /mp4|aac|m4a/.test(m.daten.type) ? 'm4a' : /ogg/.test(m.daten.type) ? 'ogg' : 'webm';
  return `${titel.replace(/[\\/:*?"<>|]/g, '')} ${m.datum.slice(0, 10)} ${m.datum.slice(11, 16).replace(':', '-')}.${endung}`;
}
