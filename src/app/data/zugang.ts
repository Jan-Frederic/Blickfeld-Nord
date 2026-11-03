// Sichtsperre fürs Backstage: reingelassen wird, wer den Band-Ordner in OneDrive sehen darf (ONEDRIVE.bandOrdner –
// geteilt mit der Band). Wer dazugehört, steuert also allein die OneDrive-Freigabe. Ein Gerät, das einmal
// reingelassen wurde, bleibt offen – auch ohne Netz (Bühnen-Modus!); nach 30 Tagen wird mit Netz im Hintergrund neu
// geprüft. Das ist eine Sichtsperre, kein Schutz der Daten: die liegen ohnehin nur auf den Geräten und im
// freigegebenen OneDrive-Ordner. Die Logik ohne Angular-Abhängigkeiten, damit sie auch in Node getestet werden kann.
export const ZUGANG_KEY = 'bn-zugang';
export const PRUEF_TAGE = 30;

export interface BandOrdner {
  drive: string;
  item: string;
}

export interface ZugangGemerkt {
  /** Kennung des Ordners, für den der Zugang galt */
  ordner: string;
  /** Zeitpunkt der letzten erfolgreichen Prüfung (ms) */
  zeit: number;
}

/** frei = keine Sperre eingerichtet; ok = darf rein; ok-pruefen = darf rein, aber neu prüfen; anmelden = Anmeldeseite */
export type ZugangStand = 'frei' | 'ok' | 'ok-pruefen' | 'anmelden';

export function zugangStand(band: BandOrdner | null, gemerkt: ZugangGemerkt | null, jetzt: number, online: boolean): ZugangStand {
  if (!band) return 'frei';
  if (!gemerkt || gemerkt.ordner !== band.item) return 'anmelden';
  return jetzt - gemerkt.zeit >= PRUEF_TAGE * 864e5 && online ? 'ok-pruefen' : 'ok';
}

export function ladeZugang(): ZugangGemerkt | null {
  try {
    const z = JSON.parse(localStorage.getItem(ZUGANG_KEY) ?? 'null') as ZugangGemerkt | null;
    return z && typeof z.ordner === 'string' && typeof z.zeit === 'number' ? z : null;
  } catch {
    return null;
  }
}

export function zugangMerken(band: BandOrdner | null, jetzt = Date.now()): void {
  try {
    if (band) localStorage.setItem(ZUGANG_KEY, JSON.stringify({ ordner: band.item, zeit: jetzt }));
    else localStorage.removeItem(ZUGANG_KEY);
  } catch {
    // ohne Speicher gilt der Zugang bis zum Neuladen
  }
}

/** Ziel nach der Anmeldung: nur Backstage-Adressen (keine fremden Seiten) */
export function zugangZiel(ziel: string | null | undefined): string {
  return ziel && /^\/backstage(\/|$|\?)/.test(ziel) && !ziel.startsWith('/backstage/zugang') ? ziel : '/backstage';
}

/**
 * Ziel aus der aufgerufenen Adresse: Unterseiten kommen beim ersten Aufruf über die Backstage-Shell
 * (/backstage?auftritt=<id>&teil=<teil>, scripts/spa-fallback.mjs) – daraus wieder /backstage/<id>/<teil> machen.
 */
export function zielAusUrl(url: string): string {
  const m = /^\/backstage\/?\?(.*)$/.exec(url);
  if (!m) return url;
  const q = new URLSearchParams(m[1]);
  const a = q.get('auftritt');
  if (!a || !/^[\w-]+$/.test(a)) return '/backstage';
  const t = q.get('teil');
  return `/backstage/${a}${t && /^[\w-]+$/.test(t) ? '/' + t : ''}`;
}
