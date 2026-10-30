// Proben-Mitschnitte je Song: am Handy aufnehmen, die Aufnahme bleibt beim Song auf diesem Gerät (IndexedDB
// „bn-mitschnitte“) – zum Nachhören zu Hause. Nie im Repository und nicht im Backup (zu groß);
// weitergeben über „Teilen“ oder „Mit der Band“ (Ordner „Mitschnitte/“ der OneDrive-Synchronisation, bei den anderen
// erscheint er dann beim Song). Gelöscht wird je Aufnahme oder unter Abgleich → Aufräumen.
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
  /** mit der Band geteilt: Pfad im Sync-Ordner (Mitschnitte/…) */
  pfad?: string;
  /** von wem (bei geteilten Mitschnitten anderer) */
  von?: string;
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

export async function mitschnittSpeichern(song: string, daten: Blob, dauer: number, mehr: Partial<Mitschnitt> = {}): Promise<Mitschnitt> {
  const m: Mitschnitt = { id: crypto.randomUUID(), song, datum: new Date().toISOString(), dauer, daten, ...mehr };
  await anfrage('readwrite', (s) => s.put(m));
  navigator.storage?.persist?.().catch(() => undefined);
  return m;
}

/** Pfade der schon geteilten bzw. übernommenen Mitschnitte (Sync-Ordner) */
export async function mitschnittPfade(): Promise<Set<string>> {
  const alle = await anfrage<Mitschnitt[]>('readonly', (s) => s.getAll());
  return new Set(alle.flatMap((m) => (m.pfad ? [m.pfad] : [])));
}

/** Mitschnitt als geteilt markieren */
export async function mitschnittGeteilt(m: Mitschnitt, pfad: string): Promise<void> {
  await anfrage('readwrite', (s) => s.put({ ...m, pfad }));
}

/** Pfad im Sync-Ordner für einen geteilten Mitschnitt: Ordner je Song, Datei mit Datum, Person und Länge */
export function mitschnittPfad(m: Mitschnitt, person: string, endung: string): string {
  const ordner = m.song.replace('|', ' - ').replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
  return `Mitschnitte/${ordner}/${m.datum.slice(0, 16).replace(/[:T]/g, '-')} ${person} ${m.dauer}s.${endung}`;
}

/** aus dem Pfad eines geteilten Mitschnitts: Datum, Person, Länge */
export function mitschnittAusPfad(pfad: string): { datum: string; von: string; dauer: number } | null {
  const m = /^Mitschnitte\/[^/]+\/(\d{4}-\d{2}-\d{2})-(\d{2})-(\d{2}) (.+) (\d+)s\.(?:webm|m4a|ogg)$/.exec(pfad);
  return m ? { datum: `${m[1]}T${m[2]}:${m[3]}:00Z`, von: m[4], dauer: Number(m[5]) } : null;
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
export const mitschnittEndung = (m: Mitschnitt) => (/mp4|aac|m4a/.test(m.daten.type) ? 'm4a' : /ogg/.test(m.daten.type) ? 'ogg' : 'webm');

export function mitschnittName(m: Mitschnitt, titel: string): string {
  const endung = mitschnittEndung(m);
  return `${titel.replace(/[\\/:*?"<>|]/g, '')} ${m.datum.slice(0, 10)} ${m.datum.slice(11, 16).replace(':', '-')}.${endung}`;
}
