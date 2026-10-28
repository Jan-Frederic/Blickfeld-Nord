// Ordner auf dem Computer (Chrome/Edge, File System Access API) – für die Synchronisation mit einem Ordner auf der
// Festplatte (data/sync-ordner.ts). Die frühere Abgleich-Karte „Ordner auf dem Gerät“ merkte sich ihren Ordner in
// IndexedDB „bn-ordner“; ordnerSpeicherLoeschen räumt das weg.

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

/** Erlaubnis für den Ordner (fragt den Browser bei Bedarf – nur nach einem Klick möglich) */
export async function ordnerErlaubnis(h: OrdnerHandle, schreiben = false): Promise<boolean> {
  const mode = schreiben ? 'readwrite' : 'read';
  if (!h.queryPermission) return true;
  if ((await h.queryPermission({ mode })) === 'granted') return true;
  return (await h.requestPermission?.({ mode })) === 'granted';
}

/** alten gemerkten Ordner („bn-ordner“) vergessen */
export function ordnerSpeicherLoeschen(): Promise<void> {
  return new Promise((ok) => {
    const req = indexedDB.deleteDatabase(DB);
    req.onsuccess = req.onerror = req.onblocked = () => ok();
  });
}
