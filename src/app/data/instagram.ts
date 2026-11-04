// Instagram-Formate auseinanderhalten – jedes hat eigene Maße, eigene verdeckte Bereiche und einen anderen Umgang mit
// Text und Link. Zeichnen: data/poster.ts. Teilen: Teilen-Menü des Handys (Instagram wählt dann selbst Beitrag, Story
// oder Reel), am Rechner Download.
//
// Teilen darf der Browser nur direkt nach einem Tipp (Safari besonders streng). Zeichnen dauert auf dem Handy aber
// ein bis drei Sekunden – deshalb liegen die Bilder in einem Vorrat: im Hintergrund vorbereitet, sobald die Seite offen
// ist; ist eins beim Tippen noch nicht fertig, zeigt die Oberfläche „Jetzt teilen“ für einen zweiten Tipp.

export type IgFormat = 'beitrag' | 'story' | 'reel' | 'highlight';

export interface IgInfo {
  format: IgFormat;
  titel: string;
  masse: string;
  /** was in die Zwischenablage kommt */
  text: string;
  tipp: string;
}

export const IG_FORMATE: Record<IgFormat, IgInfo> = {
  beitrag: {
    format: 'beitrag',
    titel: 'Beitrag (Feed)',
    masse: '1080 × 1350 (4:5) – im Profil-Raster als 3:4 angeschnitten, das Wichtige steht mittig',
    text: 'Bildunterschrift mit Datum, Ort, Hashtags und Link (im Beitrag nicht klickbar – „Link in Bio“)',
    tipp: 'Bleibt im Profil stehen: 3–4 Wochen vorher posten, Veranstalter markieren, Ort hinzufügen.',
  },
  story: {
    format: 'story',
    titel: 'Story',
    masse: '1080 × 1920 (9:16) – oben ~220 px und unten ~340 px verdeckt Instagram, dort steht nichts',
    text: 'nur der Link – in Instagram als Link-Sticker in die freie Fläche unten einfügen',
    tipp: 'Verschwindet nach 24 h: mehrmals posten (2 Wochen, 1 Woche, morgen, heute). Dazu den Countdown-Sticker von Instagram aufs Datum setzen – Follower bekommen dann eine Erinnerung.',
  },
  reel: {
    format: 'reel',
    titel: 'Reel (Video)',
    masse: '8 s, 9:16 (720 × 1280), MP4 ohne Ton – unten ~420 px und rechts ~120 px verdecken die Knöpfe',
    text: 'kurze Bildunterschrift mit Hashtags („Link in Bio“)',
    tipp: 'Erreicht auch Leute, die euch nicht folgen: in Instagram einen passenden Song drunterlegen, als Titelbild die Story nehmen.',
  },
  highlight: {
    format: 'highlight',
    titel: 'Highlight-Cover',
    masse: '1080 × 1920 – sichtbar ist nur der runde Ausschnitt in der Mitte',
    text: '–',
    tipp: 'Einmalig: Stories eines Auftritts im Profil unter einem Highlight sammeln („LIVE 2026“) und dieses Bild als Cover wählen.',
  },
};

/** Vorrat vorbereiteter Dateien (Bilder, Videos) – gemeinsam für Werbeplan und Auftrittsseite */
const vorrat = new Map<string, Promise<Blob>>();
const fertig = new Map<string, Blob>();

/** Datei vorbereiten (einmal je Schlüssel) */
export function vorbereiten(schluessel: string, machen: () => Promise<Blob>): Promise<Blob> {
  let p = vorrat.get(schluessel);
  if (!p) {
    p = machen().then((b) => (fertig.set(schluessel, b), b));
    p.catch(() => vorrat.delete(schluessel));
    vorrat.set(schluessel, p);
  }
  return p;
}

/** schon fertig vorbereitet? Dann kann direkt (noch im Tipp) geteilt werden */
export const bereit = (schluessel: string): Blob | undefined => fertig.get(schluessel);

/** im Leerlauf vorbereiten, ohne die Seite zu bremsen */
export function imLeerlauf(fn: () => void): void {
  const ric = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (ric) ric(fn, { timeout: 2500 });
  else setTimeout(fn, 600);
}
