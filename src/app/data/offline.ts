import { pdfjsVorladen } from './noten';

// Offline-Check vor dem Auftritt („Bereit?“): Startet der Bühnen-Modus auf diesem Gerät auch ohne Netz?
// Dafür braucht es den Service Worker (steuert die Seite), die gespeicherte Backstage-Shell samt Skripten (beim
// ersten Besuch vorab gespeichert) und pdf.js für die Notenblätter (wird erst beim ersten Gebrauch geladen).
// Die Noten selbst liegen ohnehin im Gerät (IndexedDB) – das prüft „Noten auf diesem Gerät“.
export interface OfflineStand {
  /** Service Worker steuert die Seite */
  sw: boolean;
  /** Backstage-Shell im Speicher */
  shell: boolean;
  /** pdf.js im Speicher */
  pdfjs: boolean;
}

async function imSpeicher(prefix: string, url: string): Promise<boolean> {
  const namen = (await caches.keys()).filter((k) => k.startsWith(prefix));
  for (const n of namen) if (await (await caches.open(n)).match(url)) return true;
  return false;
}

/** undefined, wenn der Browser keinen Service Worker kann (dann gibt es nichts zu prüfen) */
export async function offlineStand(): Promise<OfflineStand | undefined> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || typeof caches === 'undefined') return undefined;
  try {
    return {
      sw: !!navigator.serviceWorker.controller,
      shell: await imSpeicher('bn-', '/backstage/index.html'),
      pdfjs: await imSpeicher('noten-pdfjs-', '/pdfjs/pdf.worker.min.mjs'),
    };
  } catch {
    return undefined;
  }
}

/** Fehlendes nachladen: Shell und pdf.js holen (der Service Worker merkt sich beides), dann neu prüfen */
export async function offlineVorladen(): Promise<OfflineStand | undefined> {
  pdfjsVorladen();
  await Promise.all(
    ['/backstage/index.html', '/pdfjs/pdf.min.mjs', '/pdfjs/pdf.worker.min.mjs'].map((u) => fetch(u).catch(() => undefined)),
  );
  // der Service Worker legt Antworten nach dem Ausliefern ab – kurz warten
  await new Promise((r) => setTimeout(r, 500));
  return offlineStand();
}

/** Was fehlt – für den Hinweis im Check */
export function offlineFehlt(s: OfflineStand): string[] {
  return [
    !s.sw && 'Seite einmal mit Netz neu laden (Offline-Speicher noch nicht aktiv)',
    s.sw && !s.shell && 'Backstage nicht gespeichert',
    s.sw && !s.pdfjs && 'Noten-Anzeige (pdf.js) nicht gespeichert',
  ].filter((x): x is string => !!x);
}
