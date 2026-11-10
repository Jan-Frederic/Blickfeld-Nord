// Übe-Erinnerung. Zwei Teile, beide ohne Server:
// – App-Symbol: Zahl der heute fälligen Karteikarten als Badge (installierte App, Chrome/Edge/Safari, wo möglich).
// – Benachrichtigung (einstellbar unter Einstellungen → Ich bin): höchstens einmal am Tag ab der gewählten Stunde
//   „5 Karten heute fällig“. Der Service Worker (scripts/sw/sw-template.js, „periodicsync“) liest dafür die Fälligkeiten
//   aus dem Speicher ERINNERUNG_CACHE – die Seite legt sie bei jeder Änderung dort ab. Periodische Hintergrund-
//   Synchronisation gibt es nur in der installierten App auf Android (Chrome/Edge); sonst bleibt es beim Badge.
// Einstellung je Person (bn-ueben-erinnerung, mit den Einstellungen gespiegelt); die Erlaubnis gilt je Gerät.
import { HEUTE_KEY, ladeUeben } from './ueben';

export const ERINNERUNG_KEY = 'bn-ueben-erinnerung';
export const ERINNERUNG_CACHE = 'ueben-erinnerung';
export const ERINNERUNG_URL = '/__ueben-erinnerung.json';
export const ERINNERUNG_TAG = 'bn-ueben';

export interface Erinnerung {
  an: boolean;
  /** ab dieser Stunde (0–23) erinnern */
  stunde: number;
}
export const ERINNERUNG_STANDARD: Erinnerung = { an: false, stunde: 18 };

export function ladeErinnerung(): Erinnerung {
  try {
    const v = JSON.parse(localStorage.getItem(ERINNERUNG_KEY) ?? 'null') as Partial<Erinnerung> | null;
    const stunde = Number(v?.stunde);
    return { an: v?.an === true, stunde: Number.isInteger(stunde) && stunde >= 0 && stunde <= 23 ? stunde : ERINNERUNG_STANDARD.stunde };
  } catch {
    return { ...ERINNERUNG_STANDARD };
  }
}

/** heute fällig und heute noch nicht geübt */
export function faelligHeute(heute: string): number {
  let geuebt: string[] = [];
  try {
    const v = JSON.parse(localStorage.getItem(HEUTE_KEY) ?? 'null') as { tag?: string; keys?: string[] } | null;
    if (v?.tag === heute && Array.isArray(v.keys)) geuebt = v.keys;
  } catch {
    // ohne Speicher zählt alles
  }
  return Object.entries(ladeUeben()).filter(([k, s]) => s.faellig <= heute && !geuebt.includes(k)).length;
}

/** Fälligkeiten für den Service Worker: je Karte das Datum, ab dem sie dran ist (heute geübte erst ab morgen) */
export function faelligkeiten(heute: string): string[] {
  let geuebt: string[] = [];
  try {
    const v = JSON.parse(localStorage.getItem(HEUTE_KEY) ?? 'null') as { tag?: string; keys?: string[] } | null;
    if (v?.tag === heute && Array.isArray(v.keys)) geuebt = v.keys;
  } catch {
    // ohne Speicher zählt alles
  }
  const morgen = new Date(`${heute}T12:00:00Z`);
  morgen.setUTCDate(morgen.getUTCDate() + 1);
  const m = morgen.toISOString().slice(0, 10);
  return Object.entries(ladeUeben()).map(([k, s]) => (geuebt.includes(k) && s.faellig <= heute ? m : s.faellig));
}

/** Badge und Daten für den Service Worker auf den aktuellen Stand bringen (nach jeder Änderung am Karteikasten) */
export async function erinnerungAktualisieren(heute = new Date().toLocaleDateString('sv-SE')): Promise<void> {
  if (typeof navigator === 'undefined') return;
  const n = faelligHeute(heute);
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  try {
    if (n > 0) await nav.setAppBadge?.(n);
    else await nav.clearAppBadge?.();
  } catch {
    // Badge nicht erlaubt oder nicht unterstützt
  }
  if (typeof caches === 'undefined') return;
  try {
    const e = ladeErinnerung();
    const cache = await caches.open(ERINNERUNG_CACHE);
    const alt = (await (await cache.match(ERINNERUNG_URL))?.json().catch(() => null)) as { gemeldet?: string } | null;
    const daten = { an: e.an, stunde: e.stunde, faellig: faelligkeiten(heute), gemeldet: alt?.gemeldet ?? '' };
    await cache.put(ERINNERUNG_URL, new Response(JSON.stringify(daten), { headers: { 'Content-Type': 'application/json' } }));
  } catch {
    // ohne Cache Storage keine Hintergrund-Erinnerung
  }
}

export type ErinnerungErgebnis = 'an' | 'aus' | 'keine-erlaubnis' | 'nur-badge';

/** Erinnerung ein-/ausschalten: fragt die Erlaubnis für Benachrichtigungen und meldet die periodische Prüfung an */
export async function erinnerungSetzen(e: Erinnerung): Promise<ErinnerungErgebnis> {
  try {
    localStorage.setItem(ERINNERUNG_KEY, JSON.stringify(e));
  } catch {
    // ohne Speicher gilt es nur jetzt
  }
  let ergebnis: ErinnerungErgebnis = e.an ? 'an' : 'aus';
  const reg = typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration().catch(() => undefined) : undefined;
  const sync = (reg as (ServiceWorkerRegistration & { periodicSync?: { register(t: string, o: { minInterval: number }): Promise<void>; unregister(t: string): Promise<void> } }) | undefined)?.periodicSync;
  if (e.an) {
    const erlaubt = typeof Notification !== 'undefined' && (Notification.permission === 'granted' || (await Notification.requestPermission()) === 'granted');
    if (!erlaubt) ergebnis = 'keine-erlaubnis';
    else if (!sync) ergebnis = 'nur-badge';
    else await sync.register(ERINNERUNG_TAG, { minInterval: 3 * 3600_000 }).catch(() => (ergebnis = 'nur-badge'));
  } else {
    await sync?.unregister(ERINNERUNG_TAG).catch(() => undefined);
  }
  await erinnerungAktualisieren();
  return ergebnis;
}
