// Start der installierten App: Bandmitglieder landen direkt im Backstage statt auf der Startseite der Website.
// „Als App gestartet“ heißt: Startadresse aus dem Manifest (site.webmanifest: "start_url": "/?app=1") oder – für
// ältere Installationen, die sich noch "/" gemerkt haben (iPhone übernimmt Manifest-Änderungen nie) – die Startseite im
// App-Fenster (Vollbild/Standalone). Bandmitglied heißt: das Gerät wurde schon ins Backstage gelassen (Sichtsperre,
// data/zugang.ts); ohne eingerichtete Sperre reicht die Microsoft-Anmeldung der Synchronisation. Geprüft wird in
// main.ts vor dem Start von Angular – die vorgerenderte Backstage-Seite lädt dann direkt (kein Umweg über die Startseite).
import { BandOrdner, ZugangGemerkt, zugangStand } from './zugang';

export const APP_PARAM = 'app';

export interface StartLage {
  pfad: string;
  suche: string;
  /** läuft im App-Fenster (display-mode fullscreen/standalone oder iPhone navigator.standalone) */
  imAppFenster: boolean;
  band: BandOrdner | null;
  zugang: ZugangGemerkt | null;
  /** Microsoft-Konto der Synchronisation gemerkt (bn-onedrive-konto) */
  konto: boolean;
  jetzt: number;
  online: boolean;
}

/** nur die Startseite ohne Sprache – wer in der App gezielt eine andere Seite öffnet (Link, Teilen), bleibt dort */
export function alsAppGestartet(l: Pick<StartLage, 'pfad' | 'suche' | 'imAppFenster'>): boolean {
  if (l.pfad !== '/' && l.pfad !== '/index.html') return false;
  return new URLSearchParams(l.suche).has(APP_PARAM) || l.imAppFenster;
}

export function istBandmitglied(l: Pick<StartLage, 'band' | 'zugang' | 'konto' | 'jetzt' | 'online'>): boolean {
  const stand = zugangStand(l.band, l.zugang, l.jetzt, l.online);
  return stand === 'frei' ? l.konto : stand !== 'anmelden';
}

/** wohin beim Start: '/backstage/', die bereinigte Startadresse (ohne ?app=1) oder null (bleiben, wie es ist) */
export function startZiel(l: StartLage): string | null {
  if (!alsAppGestartet(l)) return null;
  if (istBandmitglied(l)) return '/backstage/';
  const p = new URLSearchParams(l.suche);
  if (!p.has(APP_PARAM)) return null;
  p.delete(APP_PARAM);
  const rest = p.toString();
  return l.pfad + (rest ? '?' + rest : '');
}
