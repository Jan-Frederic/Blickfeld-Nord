// Aufräumen im Backstage (Abgleich): was liegt im Browser dieses Geräts, und was davon kann weg? Alle Backstage-Daten
// stehen in localStorage unter „bn-…“, Noten in IndexedDB (data/noten.ts), Seiten für unterwegs im Cache des
// Service Workers. Je Auftritt gespeicherte Bereiche tragen die Auftritts-ID (Datum, ggf. „-2“) im Schlüssel.

export interface Bereich {
  id: string;
  label: string;
  hinweis?: string;
  /** Schlüssel-Präfix; bei jeAuftritt folgt die Auftritts-ID bzw. bei Proben das Datum */
  praefixe: string[];
  jeAuftritt?: boolean;
  probe?: boolean;
}

export const BEREICHE: Bereich[] = [
  { id: 'setlist', label: 'Setlists', praefixe: ['bn-setlist-'], jeAuftritt: true, hinweis: 'für Rückblick und Songs → Setlists' },
  { id: 'bewertung', label: 'Song-Sterne', praefixe: ['bn-bewertung-'], jeAuftritt: true, hinweis: 'für die Top 100 und den Setlist-Vorschlag' },
  { id: 'packliste', label: 'Packlisten', praefixe: ['bn-packliste-'], jeAuftritt: true },
  { id: 'vorort', label: 'Vor-Ort-Angaben', praefixe: ['bn-vorort-'], jeAuftritt: true },
  { id: 'werbeplan', label: 'Werbeplan-Häkchen', praefixe: ['bn-werbeplan-'], jeAuftritt: true },
  { id: 'probe', label: 'Probenplanung', praefixe: ['bn-probe-'], probe: true },
  { id: 'songinfo', label: 'Songs-Entwurf', praefixe: ['bn-songinfo-entwurf'], hinweis: 'Tonart/Tempo, noch nicht auf GitHub' },
  { id: 'aufgaben', label: 'Aufgaben und Prüf-Häkchen', praefixe: ['bn-aufgaben', 'bn-ui-geprueft', 'bn-uebersetzung-pruefung'] },
  {
    id: 'einstellungen',
    label: 'Einstellungen',
    hinweis: 'Schriftgröße, Klick-Ton, Noten-Ansicht, Filter, Sprache',
    praefixe: ['bn-buehne-', 'bn-noten-', 'bn-backstage-filter', 'bn-sprache', 'bn-gesichert', 'bn-chunk-reload'],
  },
];

/** alle Schlüssel dieser Website im localStorage */
export function alleSchluessel(): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (k.startsWith('bn-')) out.push(k);
    }
  } catch {
    // ohne Speicher nichts zu tun
  }
  return out.sort();
}

export const bereichVon = (k: string): Bereich | undefined => BEREICHE.find((b) => b.praefixe.some((p) => k.startsWith(p)));

/** Größe in Bytes (UTF-16, wie der Browser zählt) */
export function groesse(keys: string[]): number {
  let n = 0;
  for (const k of keys) n += (k.length + (localStorage.getItem(k)?.length ?? 0)) * 2;
  return n;
}

export function uebersicht(): { bereich: Bereich; keys: string[]; bytes: number }[] {
  const alle = alleSchluessel();
  const rest = alle.filter((k) => !bereichVon(k));
  const liste = BEREICHE.map((bereich) => {
    const keys = alle.filter((k) => bereichVon(k) === bereich);
    return { bereich, keys, bytes: groesse(keys) };
  });
  // unbekannte bn-Einträge (ältere Versionen) zählen bei den Einstellungen mit
  const e = liste.find((x) => x.bereich.id === 'einstellungen')!;
  e.keys.push(...rest);
  e.bytes += groesse(rest);
  return liste;
}

/** Auftritts-ID bzw. Probedatum aus dem Schlüssel */
export function idVon(k: string): string | undefined {
  const b = bereichVon(k);
  if (!b || (!b.jeAuftritt && !b.probe)) return undefined;
  return k.slice(b.praefixe.find((p) => k.startsWith(p))!.length);
}

/**
 * Schlüssel vergangener Auftritte/Proben: letzter Tag vor „bis“ (YYYY-MM-DD). Der letzte Tag kommt aus den Auftritten
 * (endDate bei mehrtägigen), sonst aus der ID selbst.
 */
export function vergangene(bis: string, bereiche: Set<string>, letzterTag: Map<string, string>): string[] {
  return alleSchluessel().filter((k) => {
    const b = bereichVon(k);
    const id = idVon(k);
    if (!b || !id || !bereiche.has(b.id)) return false;
    const tag = letzterTag.get(id) ?? id.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(tag) && tag < bis;
  });
}

/** Daten zu Auftritten, die es nicht (mehr) gibt – z. B. abgesagt oder auf einen anderen Tag verschoben */
export function verwaist(auftritte: Set<string>): string[] {
  return alleSchluessel().filter((k) => bereichVon(k)?.jeAuftritt && !auftritte.has(idVon(k)!));
}

export function entfernen(keys: string[]): number {
  let n = 0;
  for (const k of keys) {
    try {
      localStorage.removeItem(k);
      n++;
    } catch {
      // weiter mit dem nächsten
    }
  }
  return n;
}

/** Seiten für unterwegs (Cache des Service Workers) leeren; Anzahl geleerter Caches */
export async function cacheLeeren(): Promise<number> {
  if (typeof caches === 'undefined') return 0;
  const namen = await caches.keys();
  await Promise.all(namen.map((n) => caches.delete(n)));
  return namen.length;
}

export const mb = (bytes: number) =>
  bytes >= 1e6 ? `${(bytes / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB` : bytes ? `${Math.max(1, Math.round(bytes / 1e3))} kB` : '–';
