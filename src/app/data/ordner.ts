import { Quelle } from './einlesen';

// Ordner auf dem Gerät (z. B. der OneDrive-Ordner, den die OneDrive-App abgleicht) – ohne Anmeldung bei Microsoft.
// In Chrome/Edge am Computer per File System Access API: einmal verbinden, der Ordner wird gemerkt (IndexedDB
// „bn-ordner“), danach lesen und schreiben (der Browser fragt je Sitzung einmal nach). Andere Browser und
// Handys wählen Ordner bzw. Dateien jedes Mal neu (siehe backstage-ordner.ts).

type Erlaubnis = 'granted' | 'denied' | 'prompt';
interface Eintrag {
  kind: 'file' | 'directory';
  name: string;
}
export interface OrdnerHandle extends Eintrag {
  kind: 'directory';
  values(): AsyncIterable<Eintrag>;
  getDirectoryHandle(name: string, o?: { create?: boolean }): Promise<OrdnerHandle>;
  getFileHandle(name: string, o?: { create?: boolean }): Promise<DateiHandle>;
  queryPermission?(o: { mode: 'read' | 'readwrite' }): Promise<Erlaubnis>;
  requestPermission?(o: { mode: 'read' | 'readwrite' }): Promise<Erlaubnis>;
}
interface DateiHandle extends Eintrag {
  kind: 'file';
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(d: Blob): Promise<void>; close(): Promise<void> }>;
}

const picker = () => (globalThis as unknown as { showDirectoryPicker?: (o?: object) => Promise<OrdnerHandle> }).showDirectoryPicker;
/** kann dieser Browser einen Ordner dauerhaft verbinden (Chrome/Edge am Computer)? */
export const ordnerVerbindbar = () => typeof picker() === 'function';

const DB = 'bn-ordner';
function db(): Promise<IDBDatabase> {
  return new Promise((ok, fehler) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('handles');
    req.onsuccess = () => ok(req.result);
    req.onerror = () => fehler(req.error);
  });
}
async function speicher<T>(modus: IDBTransactionMode, tun: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const d = await db();
  return new Promise((ok, fehler) => {
    const req = tun(d.transaction('handles', modus).objectStore('handles'));
    req.onsuccess = () => ok(req.result as T);
    req.onerror = () => fehler(req.error);
  }).finally(() => d.close()) as Promise<T>;
}

/** gemerkter Ordner (ohne nach Erlaubnis zu fragen) */
export async function gemerkterOrdner(): Promise<OrdnerHandle | undefined> {
  try {
    return await speicher<OrdnerHandle | undefined>('readonly', (s) => s.get('ordner'));
  } catch {
    return undefined;
  }
}

/** Ordner auswählen und merken */
export async function ordnerVerbinden(): Promise<OrdnerHandle> {
  const h = await picker()!({ id: 'blickfeld-nord', mode: 'readwrite' });
  await speicher('readwrite', (s) => s.put(h, 'ordner'));
  return h;
}

export async function ordnerTrennen(): Promise<void> {
  await speicher('readwrite', (s) => s.delete('ordner'));
}

/** Erlaubnis für den Ordner (fragt den Browser bei Bedarf – nur nach einem Klick möglich) */
export async function ordnerErlaubnis(h: OrdnerHandle, schreiben = false): Promise<boolean> {
  const mode = schreiben ? 'readwrite' : 'read';
  if (!h.queryPermission) return true;
  if ((await h.queryPermission({ mode })) === 'granted') return true;
  return (await h.requestPermission?.({ mode })) === 'granted';
}

/** alle Dateien im Ordner und seinen Unterordnern (bis 4 Ebenen, höchstens 3000) */
export async function ordnerDateien(h: OrdnerHandle, gefunden?: (anzahl: number, ordner: string) => void): Promise<Quelle[]> {
  const out: Quelle[] = [];
  const lesen = async (ordner: OrdnerHandle, praefix: string, tiefe: number): Promise<void> => {
    for await (const e of ordner.values()) {
      if (out.length >= 3000 || e.name.startsWith('.')) continue;
      if (e.kind === 'directory' && tiefe < 4) await lesen(e as OrdnerHandle, `${praefix}${e.name}/`, tiefe + 1);
      else if (e.kind === 'file') {
        const datei = await (e as DateiHandle).getFile();
        out.push({ name: e.name, pfad: praefix + e.name, groesse: datei.size, geaendert: new Date(datei.lastModified).toISOString(), laden: () => datei.arrayBuffer() });
        gefunden?.(out.length, praefix || h.name);
      }
    }
  };
  await lesen(h, '', 0);
  return out;
}

/** Datei in einen Unterordner schreiben (wird angelegt; gleichnamige Datei wird ersetzt) */
export async function ordnerSchreiben(h: OrdnerHandle, unterordner: string, name: string, inhalt: Blob): Promise<void> {
  const ziel = unterordner ? await h.getDirectoryHandle(unterordner, { create: true }) : h;
  const w = await (await ziel.getFileHandle(name, { create: true })).createWritable();
  await w.write(inhalt);
  await w.close();
}

/** ausgewählte Dateien (Ordner- oder Dateiauswahl) als Quellen */
export function dateienAlsQuellen(dateien: File[]): Quelle[] {
  return dateien.map((d) => ({
    name: d.name,
    pfad: (d as File & { webkitRelativePath?: string }).webkitRelativePath?.split('/').slice(1).join('/') || d.name,
    groesse: d.size,
    geaendert: new Date(d.lastModified).toISOString(),
    laden: () => d.arrayBuffer(),
  }));
}

/** gemerkten Ordner beim Zurücksetzen vergessen */
export function ordnerSpeicherLoeschen(): Promise<void> {
  return new Promise((ok) => {
    const req = indexedDB.deleteDatabase(DB);
    req.onsuccess = req.onerror = req.onblocked = () => ok();
  });
}
