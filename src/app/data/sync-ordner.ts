import { CloudDatei, CloudOrt, CloudWurzel, cloudBaum, cloudLaden, cloudLoeschen, cloudSchreiben } from './onedrive';
import { OrdnerHandle } from './ordner';
import { Richtung, SyncDatei, SyncOrdner, Zustand } from './sync';
import type { SpiegelZustand } from './spiegel';

// Die beiden Seiten der Synchronisation (data/sync.ts) und was dazu gemerkt wird:
// - OneDrive-Ordner über Microsoft Graph
// - lokal: ein Ordner auf dem Computer (Chrome/Edge, File System Access) oder der Speicher der App im Browser
//   (IndexedDB – auf allen Geräten, auch iPhone/Android; offline verfügbar, aber nicht in der Dateien-App sichtbar)
// Einstellungen in localStorage („bn-sync-einstellungen“), Zustand, Dateien und Ordner-Handle in IndexedDB „bn-sync“.

export interface SyncEinstellungen {
  /** Pfad im OneDrive, z. B. „Blickfeld Nord/Noten“ – bei einem geteilten Ordner ab diesem */
  cloud: string;
  /** geteilter Ordner aus dem OneDrive eines anderen Band-Mitglieds */
  wurzel?: CloudWurzel;
  lokal: 'ordner' | 'app';
  richtung: Richtung;
  loeschen: boolean;
  /** beim Öffnen des Backstage und alle 15 Minuten */
  auto: boolean;
  /** neue/geänderte Noten-Dateien nach dem Abgleich gleich beim Song einlesen */
  notenAuto: boolean;
}

const EINSTELLUNGEN_KEY = 'bn-sync-einstellungen';
const LETZTER_KEY = 'bn-sync-letzter';
const STANDARD: SyncEinstellungen = { cloud: '', lokal: 'app', richtung: 'beide', loeschen: true, auto: true, notenAuto: true };
const OFFEN_KEY = 'bn-sync-offen';

/** Noten-Dateien aus dem Abgleich, die sich nicht eindeutig einem Song zuordnen ließen (Pfade im Sync-Ordner) */
export function offeneNoten(): string[] {
  try {
    return JSON.parse(localStorage.getItem(OFFEN_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function offeneNotenSetzen(pfade: string[]): void {
  try {
    if (pfade.length) localStorage.setItem(OFFEN_KEY, JSON.stringify([...new Set(pfade)]));
    else localStorage.removeItem(OFFEN_KEY);
  } catch {
    // egal
  }
}

export function syncEinstellungen(): SyncEinstellungen {
  try {
    return { ...STANDARD, ...(JSON.parse(localStorage.getItem(EINSTELLUNGEN_KEY) ?? '{}') as Partial<SyncEinstellungen>) };
  } catch {
    return STANDARD;
  }
}

export function syncEinstellungenSetzen(e: SyncEinstellungen): void {
  try {
    localStorage.setItem(EINSTELLUNGEN_KEY, JSON.stringify(e));
  } catch {
    // ohne Speicher keine Einstellung
  }
}

/** letzter Abgleich: Zeitpunkt und Ergebnis */
export function letzterSync(): { zeit: string; text: string; fehler?: boolean } | null {
  try {
    return JSON.parse(localStorage.getItem(LETZTER_KEY) ?? 'null');
  } catch {
    return null;
  }
}

export function letzterSyncSetzen(text: string, fehler = false): void {
  try {
    localStorage.setItem(LETZTER_KEY, JSON.stringify({ zeit: new Date().toISOString(), text, fehler }));
  } catch {
    // egal
  }
}

// ---- IndexedDB „bn-sync“ -----------------------------------------------------------------------------------

const DB = 'bn-sync';
function db(): Promise<IDBDatabase> {
  return new Promise((ok, fehler) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('dateien');
      req.result.createObjectStore('meta');
    };
    req.onsuccess = () => ok(req.result);
    req.onerror = () => fehler(req.error);
  });
}
async function idb<T>(store: string, modus: IDBTransactionMode, tun: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const d = await db();
  try {
    return await new Promise<T>((ok, fehler) => {
      const req = tun(d.transaction(store, modus).objectStore(store));
      req.onsuccess = () => ok(req.result as T);
      req.onerror = () => fehler(req.error);
    });
  } finally {
    d.close();
  }
}

export const syncZustand = async (): Promise<Zustand> => (await idb<Zustand | undefined>('meta', 'readonly', (s) => s.get('zustand'))) ?? {};
export const syncZustandSetzen = (z: Zustand) => idb('meta', 'readwrite', (s) => s.put(z, 'zustand'));
/** Zustand vergessen – nach dem Wechsel eines Ordners beginnt der Abgleich neu (Gleiches wird erkannt) */
export const syncZustandLoeschen = async () => {
  await idb('meta', 'readwrite', (s) => s.delete('zustand'));
  // gespiegelte Einstellungen beim nächsten Abgleich neu in den (anderen) Ordner schreiben
  await idb('meta', 'readwrite', (s) => s.delete('spiegel'));
};

/** Stand der gespiegelten Einstellungen (data/spiegel.ts) */
export const spiegelZustandLaden = async (): Promise<SpiegelZustand> => (await idb<SpiegelZustand | undefined>('meta', 'readonly', (s) => s.get('spiegel')).catch(() => undefined)) ?? {};
export const spiegelZustandSetzen = (z: SpiegelZustand) => idb('meta', 'readwrite', (s) => s.put(z, 'spiegel'));

export const lokalerOrdnerHandle = () => idb<OrdnerHandle | undefined>('meta', 'readonly', (s) => s.get('ordner')).catch(() => undefined);
export const lokalerOrdnerSetzen = (h: OrdnerHandle | null) => idb('meta', 'readwrite', (s) => (h ? s.put(h, 'ordner') : s.delete('ordner')));

export function syncSpeicherLoeschen(): Promise<void> {
  return new Promise((ok) => {
    const req = indexedDB.deleteDatabase(DB);
    req.onsuccess = req.onerror = req.onblocked = () => ok();
  });
}

// ---- Seiten ----------------------------------------------------------------------------------------------

/** OneDrive-Ordner gewählt (eigener Pfad oder geteilter Ordner)? */
export const cloudGewaehlt = (e: Pick<SyncEinstellungen, 'cloud' | 'wurzel'>) => !!e.cloud || !!e.wurzel;
/** „Blickfeld Nord/Noten“ bzw. „Sync (geteilt)/Noten“ */
export const cloudName = (e: Pick<SyncEinstellungen, 'cloud' | 'wurzel'>) => [e.wurzel && `${e.wurzel.name} (geteilt)`, e.cloud].filter(Boolean).join('/');

/** OneDrive-Ordner */
export function cloudOrdner(ort: CloudOrt): SyncOrdner {
  const dateien = new Map<string, CloudDatei>();
  return {
    name: cloudName({ cloud: ort.pfad, wurzel: ort.wurzel }) || 'OneDrive',
    async liste(gefunden) {
      const liste = await cloudBaum(ort, gefunden);
      dateien.clear();
      for (const d of liste) dateien.set(d.pfad, d);
      return liste;
    },
    lesen: (p) => cloudLaden(dateien.get(p)!),
    async schreiben(p, inhalt) {
      const d = await cloudSchreiben(ort, p, inhalt);
      dateien.set(p, d);
      return d;
    },
    async loeschen(p) {
      const d = dateien.get(p);
      if (d) await cloudLoeschen(d.id, d.drive);
      dateien.delete(p);
    },
  };
}

interface AppDatei {
  inhalt: Blob;
  groesse: number;
  geaendert: string;
  version: string;
}

/** Speicher der App (alle Geräte) */
export const appOrdner: SyncOrdner = {
  name: 'Speicher dieser App',
  async liste() {
    const d = await db();
    try {
      return await new Promise<SyncDatei[]>((ok, fehler) => {
        const out: SyncDatei[] = [];
        const req = d.transaction('dateien', 'readonly').objectStore('dateien').openCursor();
        req.onsuccess = () => {
          const c = req.result;
          if (!c) return ok(out);
          const v = c.value as AppDatei;
          out.push({ pfad: String(c.key), groesse: v.groesse, geaendert: v.geaendert, version: v.version });
          c.continue();
        };
        req.onerror = () => fehler(req.error);
      });
    } finally {
      d.close();
    }
  },
  async lesen(p) {
    return (await idb<AppDatei>('dateien', 'readonly', (s) => s.get(p))).inhalt;
  },
  async schreiben(p, inhalt) {
    const v: AppDatei = { inhalt, groesse: inhalt.size, geaendert: new Date().toISOString(), version: crypto.randomUUID() };
    await idb('dateien', 'readwrite', (s) => s.put(v, p));
    navigator.storage?.persist?.().catch(() => undefined);
    return { pfad: p, groesse: v.groesse, geaendert: v.geaendert, version: v.version };
  },
  async loeschen(p) {
    await idb('dateien', 'readwrite', (s) => s.delete(p));
  },
};

interface DateiHandle {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(d: Blob): Promise<void>; close(): Promise<void> }>;
}
type Ordner = OrdnerHandle & { removeEntry(name: string): Promise<void> };

/** Ordner auf dem Computer (Chrome/Edge) */
export function festplattenOrdner(h: OrdnerHandle): SyncOrdner {
  const teile = (p: string) => p.split('/').filter(Boolean);
  const ordnerVon = async (p: string, anlegen: boolean): Promise<Ordner> => {
    let o = h as Ordner;
    for (const t of teile(p).slice(0, -1)) o = (await o.getDirectoryHandle(t, { create: anlegen })) as Ordner;
    return o;
  };
  const alsSync = (pfad: string, f: File): SyncDatei => ({ pfad, groesse: f.size, geaendert: new Date(f.lastModified).toISOString(), version: `${f.size}-${f.lastModified}` });
  return {
    name: h.name,
    async liste(gefunden) {
      const out: SyncDatei[] = [];
      const lesen = async (o: OrdnerHandle, praefix: string): Promise<void> => {
        for await (const e of o.values()) {
          if (e.kind === 'directory') await lesen(e as OrdnerHandle, `${praefix}${e.name}/`);
          else out.push(alsSync(praefix + e.name, await (e as unknown as DateiHandle).getFile()));
        }
        gefunden?.(out.length);
      };
      await lesen(h, '');
      return out;
    },
    async lesen(p) {
      return ((await (await ordnerVon(p, false)).getFileHandle(teile(p).at(-1)!)) as unknown as DateiHandle).getFile();
    },
    async schreiben(p, inhalt) {
      const datei = (await (await ordnerVon(p, true)).getFileHandle(teile(p).at(-1)!, { create: true })) as unknown as DateiHandle;
      const w = await datei.createWritable();
      await w.write(inhalt);
      await w.close();
      return alsSync(p, await datei.getFile());
    },
    async loeschen(p) {
      await (await ordnerVon(p, false)).removeEntry(teile(p).at(-1)!);
    },
  };
}
