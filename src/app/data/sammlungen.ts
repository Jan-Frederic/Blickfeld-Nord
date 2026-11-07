import { signal } from '@angular/core';
import type { Entry, Song } from './setlist-data';

// Sammlungen (früher „Vorlagen“): benannte Songfolgen – eine bewährte Setlist, die Weihnachtslieder, ein Kneipen-Set.
// In der Setlist eines Auftritts ersetzen sie die ganze Setlist oder werden hinten angehängt; unter Songs → Liste
// lassen sie sich als Chip wählen und bearbeiten (Songs hinzufügen, entfernen, umsortieren, umbenennen).
// Gespeichert unter „bn-setlist-vorlagen“ (alter Name, damit vorhandene Vorlagen bleiben) – wird wie alle Band-Daten
// mit OneDrive gespiegelt und beim „An die Band schicken“ mit ausgetauscht.

export interface Sammlung {
  name: string;
  entries: Entry[];
  saved: string;
  /** feste Sammlung aus dem Code – auf jedem Gerät da; bearbeitet wird eine eigene Kopie gleichen Namens */
  fest?: boolean;
}

export const SAMMLUNGEN_KEY = 'bn-setlist-vorlagen';

// Feste Sammlungen: Ausgangspunkt für wiederkehrende Anlässe, z. B. den Weihnachtsmarkt
export const FESTE_SAMMLUNGEN: Sammlung[] = [
  {
    name: 'Weihnachtslieder',
    fest: true,
    saved: '2026-10-26',
    entries: [
      { title: 'In der Weihnachtsbäckerei', artist: 'Rolf Zuckowski' },
      { title: 'Kleine Kinder, große Kinder (Das Adventskalenderlied)', artist: 'Rolf Zuckowski' },
      { title: 'Weihnacht, was bist du', artist: 'Rolf Zuckowski' },
    ],
  },
];

const istPause = (e: Entry): e is { pause: true } => 'pause' in e;
export const songKey = (s: Pick<Song, 'title' | 'artist'>) => `${s.title}|${s.artist}`;
/** nur Titel und Interpret – Wunsch und Notiz gehören zum Auftritt, nicht zur Sammlung */
const nurSong = (s: Song): Song => ({ title: s.title, artist: s.artist });

function eigeneLaden(): Sammlung[] {
  try {
    const l = JSON.parse(localStorage.getItem(SAMMLUNGEN_KEY) ?? '[]') as Sammlung[];
    return Array.isArray(l) ? l.filter((s) => s && typeof s.name === 'string' && Array.isArray(s.entries)) : [];
  } catch {
    return [];
  }
}

/** eigene Sammlungen dieses Geräts (gespiegelt) – Signal, damit Setlist und Songs-Liste gleich aktuell sind */
const eigene = signal<Sammlung[]>(eigeneLaden());

/** feste und eigene zusammen; eine eigene gleichen Namens ersetzt die feste (bearbeitete Fassung) */
export function alleSammlungen(liste: Sammlung[] = eigene(), feste: Sammlung[] = FESTE_SAMMLUNGEN): Sammlung[] {
  const namen = new Set(liste.map((s) => s.name.toLowerCase()));
  const fest = new Set(feste.map((s) => s.name.toLowerCase()));
  return [
    ...feste.filter((f) => !namen.has(f.name.toLowerCase())),
    ...liste.map((s) => (fest.has(s.name.toLowerCase()) ? { ...s, fest: true } : s)),
  ].sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

/** Signal-Zugriff für Komponenten */
export const sammlungen = () => alleSammlungen(eigene());

/** nach einem Abgleich o. Ä. neu aus dem Speicher lesen */
export function sammlungenNeuLaden(): void {
  eigene.set(eigeneLaden());
}

function speichern(liste: Sammlung[]): void {
  eigene.set(liste);
  try {
    localStorage.setItem(SAMMLUNGEN_KEY, JSON.stringify(liste));
  } catch {
    // ohne Speicher gilt die Änderung bis zum Neuladen
  }
}

/** Sammlung anlegen oder ersetzen (gleicher Name) */
export function sammlungSetzen(name: string, entries: Entry[]): void {
  const s: Sammlung = { name, entries: entries.map((e) => (istPause(e) ? e : nurSong(e))), saved: new Date().toISOString() };
  const rest = eigene().filter((x) => x.name.toLowerCase() !== name.toLowerCase());
  speichern([...rest, s].sort((a, b) => a.name.localeCompare(b.name, 'de')));
}

/** eigene Sammlung löschen (bei einer festen: die bearbeitete Fassung verwerfen – die feste bleibt) */
export function sammlungLoeschen(name: string): void {
  speichern(eigene().filter((x) => x.name.toLowerCase() !== name.toLowerCase()));
}

export function sammlungUmbenennen(alt: string, neu: string): void {
  const s = alleSammlungen().find((x) => x.name === alt);
  if (!s) return;
  sammlungLoeschen(alt);
  sammlungSetzen(neu, s.entries);
}

/** Song in die Sammlung bzw. wieder heraus */
export function songUmschalten(name: string, song: Song): void {
  const s = alleSammlungen().find((x) => x.name === name);
  if (!s) return;
  const k = songKey(song);
  const drin = s.entries.some((e) => !istPause(e) && songKey(e) === k);
  sammlungSetzen(name, drin ? s.entries.filter((e) => istPause(e) || songKey(e) !== k) : [...s.entries, nurSong(song)]);
}

/** Song innerhalb der Sammlung verschieben (richtung -1 = nach vorn) */
export function songVerschieben(name: string, song: Song, richtung: -1 | 1): void {
  const s = alleSammlungen().find((x) => x.name === name);
  if (!s) return;
  sammlungSetzen(name, verschieben(s.entries, songKey(song), richtung));
}

/** reine Hilfe: Song mit dem nächsten Song (über Pausen hinweg) tauschen */
export function verschieben(entries: Entry[], key: string, richtung: -1 | 1): Entry[] {
  const i = entries.findIndex((e) => !istPause(e) && songKey(e) === key);
  if (i < 0) return entries;
  let j = i + richtung;
  while (j >= 0 && j < entries.length && istPause(entries[j])) j += richtung;
  if (j < 0 || j >= entries.length) return entries;
  const neu = [...entries];
  [neu[i], neu[j]] = [neu[j], neu[i]];
  return neu;
}

/**
 * Sammlung hinten an die Setlist hängen: Songs, die schon drin sind, nicht doppelt; Pausen der Sammlung bleiben,
 * nur nicht am Anfang oder Ende und nicht zwei hintereinander.
 */
export function anhaengen(setlist: Entry[], sammlung: Entry[]): { entries: Entry[]; neu: number; doppelt: number } {
  const da = new Set(setlist.filter((e) => !istPause(e)).map((e) => songKey(e as Song)));
  const out: Entry[] = [...setlist];
  let neu = 0;
  let doppelt = 0;
  for (const e of sammlung) {
    if (istPause(e)) {
      if (out.length && !istPause(out[out.length - 1])) out.push({ pause: true });
      continue;
    }
    if (da.has(songKey(e))) {
      doppelt++;
      continue;
    }
    da.add(songKey(e));
    out.push(nurSong(e));
    neu++;
  }
  while (out.length && istPause(out[out.length - 1])) out.pop();
  return { entries: out, neu, doppelt };
}

/** Songs einer Sammlung (ohne Pausen) */
export const sammlungSongs = (s: Sammlung): Song[] => s.entries.filter((e): e is Song => !istPause(e));
