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
  { id: 'nachbereitung', label: 'Nachbereitungen', praefixe: ['bn-nachbereitung-'], jeAuftritt: true, hinweis: 'Merkpunkte erscheinen unter Aufgaben' },
  { id: 'probe', label: 'Probenplanung', praefixe: ['bn-probe-'], probe: true },
  { id: 'songinfo', label: 'Songs-Entwurf', praefixe: ['bn-songinfo-entwurf'], hinweis: 'Tonart/Tempo, noch nicht auf GitHub' },
  { id: 'wackelt', label: '„Wackelt noch“-Liste', praefixe: ['bn-wackelt'], hinweis: 'deine Übe-Liste für den Probe-Vorschlag' },
  { id: 'aufgaben', label: 'Aufgaben und Prüf-Häkchen', praefixe: ['bn-aufgaben', 'bn-ui-geprueft', 'bn-uebersetzung-pruefung'] },
  {
    id: 'einstellungen',
    label: 'Einstellungen',
    hinweis: 'Schriftgröße, Klick-Ton, Noten-Ansicht, Filter, Sprache',
    praefixe: ['bn-buehne-', 'bn-noten-', 'bn-backstage-filter', 'bn-sprache', 'bn-gesichert', 'bn-chunk-reload', 'bn-onedrive-', 'bn-sync-'],
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

// ---- Einzelne Einträge verständlich beschreiben (Abgleich → Daten auf diesem Gerät) ----------------------------

const EINSTELLUNGEN: Record<string, string> = {
  'bn-buehne-zoom': 'Schriftgröße im Bühnen-Modus',
  'bn-buehne-ton': 'Klick-Ton im Bühnen-Modus',
  'bn-buehne-tasten': 'Pedal-Tasten im Bühnen-Modus',
  'bn-buehne-halbseite': 'Halbseiten-Blättern',
  'bn-noten-wahl': 'Gewählte Noten-Fassungen',
  'bn-noten-zuordnungen': 'Gemerkte Zuordnungen beim Einlesen',
  'bn-noten-breite': 'Noten in voller Breite',
  'bn-noten-ansicht': 'Noten-Ansicht (frühere Version)',
  'bn-noten-scrolltempo': 'Mitscroll-Tempo je Song',
  'bn-noten-transpose': 'Akkorde von Hand verschoben (je Song)',
  'bn-backstage-filter': 'Filter unter Termine',
  'bn-sprache': 'Gewählte Sprache',
  'bn-gesichert': 'Letztes Backup',
  'bn-chunk-reload': 'Neuladen nach Update',
  'bn-onedrive-client': 'OneDrive: App-ID',
  'bn-onedrive-konto': 'OneDrive: zuletzt angemeldetes Konto',
  'bn-sync-einstellungen': 'Synchronisation: Einstellungen',
  'bn-sync-letzter': 'Synchronisation: letzter Abgleich',
  'bn-songinfo-entwurf': 'Songs-Entwurf (Tonart, Tempo, Notiz)',
  'bn-wackelt': '„Wackelt noch“-Liste',
  'bn-aufgaben': 'Aufgaben-Häkchen',
  'bn-ui-geprueft': 'Geprüfte Oberflächentexte',
  'bn-uebersetzung-pruefung': 'Geprüfte Übersetzungen',
};

const ZIEL: Record<string, (id: string) => string> = {
  setlist: (id) => `/backstage/${id}/setlist`,
  packliste: (id) => `/backstage/${id}/packliste`,
  vorort: (id) => `/backstage/${id}/vorort`,
  werbeplan: (id) => `/backstage/${id}`,
  nachbereitung: (id) => `/backstage/${id}`,
  bewertung: () => '/backstage/zahlen',
  probe: (id) => `/backstage/probe/${id}`,
};
const ZIEL_FEST: Record<string, string> = {
  'bn-songinfo-entwurf': '/backstage/songs',
  'bn-wackelt': '/backstage/songs',
  'bn-aufgaben': '/backstage/aufgaben',
  'bn-ui-geprueft': '/backstage/uebersetzungen',
  'bn-uebersetzung-pruefung': '/backstage/uebersetzungen',
};

const SINGULAR: Record<string, string> = {
  setlist: 'Setlist', bewertung: 'Sterne', packliste: 'Packliste', vorort: 'Vor Ort', werbeplan: 'Werbeplan', nachbereitung: 'Nachbereitung', probe: 'Probe',
};

const datum = (id: string) => (/^\d{4}-\d{2}-\d{2}/.test(id) ? `${id.slice(8, 10)}.${id.slice(5, 7)}.${id.slice(0, 4)}` : id);
const anzahl = (n: number, eins: string, viele: string) => `${n} ${n === 1 ? eins : viele}`;

/** kurze Inhaltsangabe eines gespeicherten Werts */
function inhalt(bereich: string | undefined, v: unknown): string {
  if (bereich === 'setlist' && Array.isArray(v)) {
    const songs = v.filter((e) => !(e as { pause?: boolean })?.pause).length;
    const pausen = v.length - songs;
    return anzahl(songs, 'Song', 'Songs') + (pausen ? `, ${anzahl(pausen, 'Pause', 'Pausen')}` : '');
  }
  if (bereich === 'packliste' && v && typeof v === 'object') {
    const p = v as { checked?: unknown[]; custom?: unknown[] };
    return `${p.checked?.length ?? 0} abgehakt${p.custom?.length ? `, ${anzahl(p.custom.length, 'eigener Punkt', 'eigene Punkte')}` : ''}`;
  }
  if (bereich === 'bewertung' && v && typeof v === 'object') return anzahl(Object.keys(v).length, 'Song bewertet', 'Songs bewertet');
  if (bereich === 'werbeplan' && Array.isArray(v)) return anzahl(v.length, 'Schritt erledigt', 'Schritte erledigt');
  if (bereich === 'probe' && v && typeof v === 'object') {
    const p = v as { songs?: unknown[]; punkte?: unknown[] };
    return `${anzahl(p.songs?.length ?? 0, 'Song', 'Songs')}, ${anzahl(p.punkte?.length ?? 0, 'Punkt', 'Punkte')}`;
  }
  if (bereich === 'vorort' && v && typeof v === 'object') return anzahl(Object.values(v).filter(Boolean).length, 'Angabe', 'Angaben');
  if (Array.isArray(v)) return anzahl(v.length, 'Eintrag', 'Einträge');
  if (v && typeof v === 'object') return anzahl(Object.keys(v).length, 'Eintrag', 'Einträge');
  const s = String(v);
  return s.length > 40 ? s.slice(0, 40) + ' …' : s;
}

export interface Eintrag {
  key: string;
  bereich: Bereich;
  titel: string;
  details: string;
  link?: string;
  bytes: number;
  /** gehört zu einem Auftritt, den es nicht mehr gibt */
  verwaist?: boolean;
}

/** alle Einträge mit Titel, Inhaltsangabe und Ziel-Seite; auftritte: ID → „Ort“ */
/** einen Eintrag beschreiben (Titel, Inhaltsangabe, Ziel-Seite); roh = gespeicherter Text */
export function eintragBeschreiben(key: string, roh: string, auftritte: Map<string, string>): Eintrag {
  const bereich = bereichVon(key) ?? BEREICHE.find((b) => b.id === 'einstellungen')!;
  let wert: unknown = roh;
  try {
    wert = JSON.parse(roh);
  } catch {
    // einfacher Text
  }
  const id = idVon(key);
  const bytes = (key.length + roh.length) * 2;
  if (id !== undefined) {
    const ort = auftritte.get(id);
    const verwaist = !!bereich.jeAuftritt && ort === undefined;
    return {
      key, bereich, bytes, verwaist,
      titel: `${SINGULAR[bereich.id] ?? bereich.label} · ${datum(id)}${ort ? ' · ' + ort : bereich.jeAuftritt ? ' · Auftritt gibt es nicht mehr' : ''}`,
      details: inhalt(bereich.id, wert),
      link: verwaist ? undefined : ZIEL[bereich.id]?.(id),
    };
  }
  return { key, bereich, bytes, titel: EINSTELLUNGEN[key] ?? key, details: inhalt(undefined, wert), link: ZIEL_FEST[key] };
}

/** alle Einträge mit Titel, Inhaltsangabe und Ziel-Seite; auftritte: ID → „Ort“ */
export function eintraege(auftritte: Map<string, string>): Eintrag[] {
  return alleSchluessel().map((key) => eintragBeschreiben(key, localStorage.getItem(key) ?? '', auftritte));
}

// ---- Vorschau vor dem Übernehmen eines Backups -----------------------------------------------------------

export interface Vorschau {
  neu: Eintrag[];
  geaendert: (Eintrag & { was: string })[];
  gleich: number;
}

const songsVon = (v: unknown) =>
  Array.isArray(v) ? v.filter((e) => e && !(e as { pause?: boolean }).pause).map((e) => `${(e as { title: string }).title}|${(e as { artist: string }).artist}`) : [];

/** was ändert sich, wenn diese Einträge übernommen werden? (Vergleich mit dem Stand auf diesem Gerät) */
export function vorschau(eintraege: [string, unknown][], auftritte: Map<string, string>): Vorschau {
  const v: Vorschau = { neu: [], geaendert: [], gleich: 0 };
  for (const [key, wert] of eintraege) {
    const roh = JSON.stringify(wert);
    const alt = localStorage.getItem(key);
    const e = eintragBeschreiben(key, roh, auftritte);
    if (alt === null) v.neu.push(e);
    else if (JSON.stringify(JSON.parse(alt)) === roh) v.gleich++;
    else {
      let was = 'geändert';
      if (key.startsWith('bn-setlist-')) {
        const a = songsVon(JSON.parse(alt));
        const b = songsVon(wert);
        const anders = b.filter((s) => !a.includes(s)).length + a.filter((s) => !b.includes(s)).length;
        was = anders ? `${anders} ${anders === 1 ? 'Song' : 'Songs'} anders` : 'Reihenfolge anders';
      } else if (key.startsWith('bn-bewertung-')) was = 'Sterne werden zusammengeführt';
      v.geaendert.push({ ...e, was });
    }
  }
  return v;
}

/** „2 neu, 1 geändert, 5 gleich“ */
export const vorschauText = (v: Vorschau) =>
  [v.neu.length && `${v.neu.length} neu`, v.geaendert.length && `${v.geaendert.length} geändert`, v.gleich && `${v.gleich} gleich`].filter(Boolean).join(', ') || 'nichts';
