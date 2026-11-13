// Daten dieses Geräts dauerhaft speichern lassen (Storage API): Sonst darf der Browser bei Platzmangel – Safari auch
// nach Wochen ohne Besuch – alles löschen, was die App im Browser hält (Backstage-Daten, Noten, Sync-Kopie).
// Beim Öffnen des Backstage einmal still nachfragen: Chrome und Safari entscheiden ohne Rückfrage (installierte Apps
// bekommen es meist); Firefox fragt nach – dort nur, wenn die App installiert ist. Höchstens alle 30 Tage.
// Ohne Angular-Abhängigkeiten.
export const GEFRAGT_KEY = 'bn-speicher-gefragt';
const ABSTAND = 30 * 864e5;

export interface SpeicherUmgebung {
  storage?: Pick<StorageManager, 'persisted' | 'persist'>;
  installiert: boolean;
  firefox: boolean;
  zuletzt: number;
  merken: (zeit: number) => void;
}

/** true = dauerhaft, false = abgelehnt, undefined = nicht gefragt (geht nicht, zu früh oder würde eine Rückfrage zeigen) */
export async function dauerhaftAnfragen(u: SpeicherUmgebung, jetzt = Date.now()): Promise<boolean | undefined> {
  if (!u.storage?.persisted || !u.storage.persist) return undefined;
  if (await u.storage.persisted()) return true;
  if (u.firefox && !u.installiert) return undefined;
  if (u.zuletzt && jetzt - u.zuletzt < ABSTAND) return undefined;
  u.merken(jetzt);
  return u.storage.persist();
}

/** im Browser: mit der echten Umgebung */
export function dauerhaftImBrowser(): Promise<boolean | undefined> {
  if (typeof navigator === 'undefined') return Promise.resolve(undefined);
  let zuletzt = 0;
  try {
    zuletzt = Number(localStorage.getItem(GEFRAGT_KEY)) || 0;
  } catch {
    // ohne Speicher eben jedes Mal
  }
  return dauerhaftAnfragen({
    storage: navigator.storage,
    installiert: matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true,
    firefox: /Firefox\//.test(navigator.userAgent),
    zuletzt,
    merken: (t) => {
      try {
        localStorage.setItem(GEFRAGT_KEY, String(t));
      } catch {
        // egal
      }
    },
  }).catch(() => undefined);
}
