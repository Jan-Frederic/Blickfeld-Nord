// Übe-Status je Person und Song – die eine Quelle für Song-Dialog, Probe-Modus, Übe-Modus, „Wackelt noch“-Filter,
// Probe-Vorschlag und Bühnenreife. Fünf Stufen, eng mit dem Karteikasten (data/ueben.ts) verbunden:
//   Nicht gelernt – kein Übe-Status (neue Songs und alle ohne Angabe), nicht im Karteikasten
//   Üben          – Kasten 1
//   Wackelt noch  – Kasten 2 und 3
//   Sitzt         – Kasten 4 und 5
//   Eingenordet   – fällt aus dem Karteikasten heraus (früher „sicher“)
// Gespeichert: eigene Kästen mit Fälligkeit (bn-ueben, Einstellungen der Person) und für die Band je Person
// bn-kasten-<Person> (Kästen + eingenordete Songs, Version 2). Jede Änderung landet zusätzlich als Verlauf im Fortschritt
// (bn-fortschritt-<Person>, für „in 30 Tagen gefestigt“ und die Stände einer Probe) und als „unsicher bei“
// (bn-unsicher-<Person>: Üben und Wackelt noch).
// Ohne Angular-Abhängigkeiten, damit es in Node testbar ist.
import { Mitglied, UNSICHER_PREFIX, ladeIch, rufname, unsicherTeilen } from './band-ich';
import { FORTSCHRITT_PREFIX, Fortschritt, fortschrittEintragen, ladeFortschritt, stufe } from './fortschritt';
import { HEUTE_KEY, KASTEN_PREFIX, KASTEN_TAGE, KastenGeteilt, UEBEN_KEY, UebenStand, bewerten, ladeKastenGeteilt, ladeUeben, speichereUeben } from './ueben';

export type UebeStatus = 'nicht' | 'ueben' | 'wackelt' | 'sitzt' | 'eingenordet';

export const STATUS: readonly { id: UebeStatus; label: string; zeichen: string; punkte: number }[] = [
  { id: 'nicht', label: 'Nicht gelernt', zeichen: '○', punkte: 0 },
  { id: 'ueben', label: 'Üben', zeichen: '✎', punkte: 0.15 },
  { id: 'wackelt', label: 'Wackelt noch', zeichen: '↻', punkte: 0.4 },
  { id: 'sitzt', label: 'Sitzt', zeichen: '✓', punkte: 0.75 },
  { id: 'eingenordet', label: 'Eingenordet', zeichen: '✓✓', punkte: 1 },
];
export const statusInfo = (s: UebeStatus) => STATUS.find((x) => x.id === s)!;
export const statusLabel = (s: UebeStatus) => statusInfo(s).label;

/** Kasten → Status: 1 Üben, 2–3 Wackelt noch, 4–5 Sitzt */
export const statusAusKasten = (k: number): UebeStatus => (k <= 1 ? 'ueben' : k <= 3 ? 'wackelt' : 'sitzt');
/** Status → Kasten beim direkten Setzen (Song-Dialog, Probe-Modus) */
const KASTEN_FUER: Partial<Record<UebeStatus, number>> = { ueben: 1, wackelt: 2, sitzt: 4 };
/** noch zu üben (für „unsicher bei“, Probe-Vorschlag, „Nochmal“ in der Probe) */
export const unsicher = (s: UebeStatus | undefined) => s === 'ueben' || s === 'wackelt';

const plusTage = (tag: string, n: number) => {
  const d = new Date(`${tag}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Status aus dem geteilten Kasten (Version 2) */
export function statusAusGeteilt(g: KastenGeteilt): Map<string, UebeStatus> {
  const out = new Map<string, UebeStatus>();
  for (const [k, kasten] of Object.entries(g.kaesten)) out.set(k, statusAusKasten(kasten));
  const eingenordet = g.v === 2 ? (g.eingenordet ?? {}) : { ...g.gelernt, ...(g.eingenordet ?? {}) };
  for (const k of Object.keys(eingenordet)) if (!g.kaesten[k]) out.set(k, 'eingenordet');
  return out;
}

/** Status aus den alten Angaben (vor Version 2): Fortschritt (sicher/sitzt/wackelt), „unsicher bei“, Kästen */
export function statusAusAlt(f: Fortschritt, unsicherKeys: string[], g: KastenGeteilt): Map<string, UebeStatus> {
  const out = new Map<string, UebeStatus>();
  for (const [k, verlauf] of Object.entries(f)) {
    const s = stufe(verlauf);
    if (s) out.set(k, s === 'sicher' ? 'eingenordet' : s);
  }
  for (const k of unsicherKeys) if (!out.has(k) || out.get(k) === 'sitzt') out.set(k, 'wackelt');
  for (const [k, s] of statusAusGeteilt(g)) out.set(k, s);
  return out;
}

const lesen = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const unsicherVon = (slug: string): string[] => {
  try {
    const v = JSON.parse(lesen('bn-unsicher-' + slug) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

/** Übe-Status einer Person (Song-Key → Status; fehlt = Nicht gelernt) */
export function statusVonPerson(slug: string): Map<string, UebeStatus> {
  const g = ladeKastenGeteilt(slug);
  return g.v === 2 ? statusAusGeteilt(g) : statusAusAlt(ladeFortschritt(slug), unsicherVon(slug), g);
}
export function alleStatus(mitglieder: Mitglied[]): Map<string, Map<string, UebeStatus>> {
  return new Map(mitglieder.map((m) => [m.slug, statusVonPerson(m.slug)]));
}

/** eigener Status (Person am Gerät; ohne „Ich bin …“ aus dem Kasten dieses Geräts) */
export function eigeneStatus(): Map<string, UebeStatus> {
  const ich = ladeIch();
  if (ich) return statusVonPerson(ich);
  const out = new Map<string, UebeStatus>(alteWackeltListe().map((k) => [k, 'wackelt']));
  for (const [k, s] of Object.entries(ladeUeben())) out.set(k, statusAusKasten(s.kasten));
  return out;
}
export const eigenerStatus = (key: string): UebeStatus => eigeneStatus().get(key) ?? 'nicht';

/** alte eigene „Wackelt noch“-Liste (bn-wackelt, vor den fünf Status) */
const ALTE_LISTE = 'bn-wackelt';
function alteWackeltListe(): string[] {
  try {
    const v = JSON.parse(lesen(ALTE_LISTE) ?? '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v) : [];
  } catch {
    return [];
  }
}
function ausAlterListe(key: string): void {
  try {
    const v = JSON.parse(lesen(ALTE_LISTE) ?? '{}') as Record<string, string>;
    if (!(key in v)) return;
    delete v[key];
    if (Object.keys(v).length) localStorage.setItem(ALTE_LISTE, JSON.stringify(v));
    else localStorage.removeItem(ALTE_LISTE);
  } catch {
    // ohne alte Liste
  }
}

/** eigenen Stand für die Band schreiben (Version 2) und „unsicher bei“ nachziehen */
function teilen(slug: string, stand: UebenStand, eingenordet: Record<string, string>, zuletzt?: string): void {
  if (!slug) return;
  const alt = ladeKastenGeteilt(slug);
  const neu: KastenGeteilt = {
    v: 2,
    kaesten: Object.fromEntries(Object.entries(stand).map(([k, s]) => [k, s.kasten])),
    // der alte Stand „gelernt“ ist mit Version 2 in „eingenordet“ aufgegangen
    gelernt: {},
    eingenordet,
    zuletzt: zuletzt ?? alt.zuletzt,
  };
  try {
    localStorage.setItem(KASTEN_PREFIX + slug, JSON.stringify(neu));
  } catch {
    // ohne Speicher sieht die Band es nicht
  }
  unsicherTeilen(slug, Object.fromEntries(Object.entries(stand).filter(([, s]) => s.kasten <= 3).map(([k]) => [k, ''])));
}

function eingenordetVon(slug: string): Record<string, string> {
  if (!slug) return {};
  const g = ladeKastenGeteilt(slug);
  return { ...(g.v === 2 ? {} : g.gelernt), ...(g.eingenordet ?? {}) };
}

/** Status direkt setzen (Song-Dialog, Probe-Modus, Nachbereitung): Kasten passend, Verlauf, Band */
export function statusSetzen(key: string, status: UebeStatus, quelle: 'liste' | 'probe' | 'ueben', tag = new Date().toISOString().slice(0, 10)): void {
  statusMigrieren();
  const ich = ladeIch();
  const stand = { ...ladeUeben() };
  const eingenordet = eingenordetVon(ich);
  delete eingenordet[key];
  if (status === 'nicht' || status === 'eingenordet') delete stand[key];
  if (status === 'eingenordet') eingenordet[key] = tag;
  const kasten = KASTEN_FUER[status];
  if (kasten) {
    // gleicher Status wie bisher: der Kasten bleibt (z. B. Kasten 3 bleibt „Wackelt noch“ in Kasten 3), wieder dran
    // nach dessen Abstand
    const alt = stand[key];
    const k = alt && statusAusKasten(alt.kasten) === status ? alt.kasten : kasten;
    stand[key] = { kasten: k, faellig: plusTage(tag, KASTEN_TAGE[k - 1]), zuletzt: tag };
  }
  speichereUeben(stand);
  ausAlterListe(key);
  teilen(ich, stand, eingenordet);
  if (ich) fortschrittEintragen(ich, key, status, quelle, tag);
}

/** Karteikarte im Übe-Modus bewerten (Leitner): sitzt → nächster Kasten, im letzten eingenordet; wackelt → Kasten 1 */
export function karteBewerten(key: string, sitzt: boolean, tag: string): { eingenordet: boolean; status: UebeStatus } {
  statusMigrieren();
  const ich = ladeIch();
  const r = bewerten(ladeUeben(), key, sitzt, tag);
  speichereUeben(r.stand);
  const eingenordet = eingenordetVon(ich);
  if (r.gelernt) eingenordet[key] = tag;
  teilen(ich, r.stand, eingenordet, tag);
  const status: UebeStatus = r.gelernt ? 'eingenordet' : statusAusKasten(r.stand[key].kasten);
  if (ich) fortschrittEintragen(ich, key, status, 'ueben', tag);
  return { eingenordet: r.gelernt, status };
}

/**
 * Übe-Modus: Status für die aktuelle Karte. Gleicher Status wie bisher schiebt die Karte innerhalb ihres Status einen
 * Kasten weiter: „Wackelt noch“ 2 → 3 (wieder dran nach 3 statt 1 Tag), „Sitzt“ 4 → 5 (nach 14 statt 7 Tagen). Im
 * letzten Kasten eines Status bleibt sie dort (Wackelt noch in 3, Sitzt in 5) – eingenordet wird ein Song nur, wenn
 * man ausdrücklich „Eingenordet“ wählt. Sonst gilt der gewählte Status direkt (Üben = Kasten 1, gleich wieder dran;
 * Wackelt noch = Kasten 2; Sitzt = Kasten 4). Gibt den neuen Status zurück.
 */
export function uebeWertung(key: string, status: UebeStatus, tag: string): UebeStatus {
  const kasten = ladeUeben()[key]?.kasten;
  if ((status === 'wackelt' && kasten === 2) || (status === 'sitzt' && kasten === 4)) return karteBewerten(key, true, tag).status;
  statusSetzen(key, status, 'ueben', tag);
  return status;
}

/**
 * Einmal je Person auf Version 2 umstellen: aus Fortschritt (sicher → Eingenordet, sitzt → Kasten 4, wackelt → Kasten 2),
 * alter „Wackelt noch“-Liste (→ Kasten 2) und gelernten Karten (→ Eingenordet). Vorhandene Kästen bleiben.
 */
export function statusMigrieren(heute = new Date().toISOString().slice(0, 10)): void {
  const ich = ladeIch();
  if (!ich || ladeKastenGeteilt(ich).v === 2) return;
  const stand = { ...ladeUeben() };
  const alt = statusAusAlt(ladeFortschritt(ich), [...unsicherVon(ich), ...alteWackeltListe()], ladeKastenGeteilt(ich));
  const eingenordet: Record<string, string> = {};
  for (const [k, s] of alt) {
    if (stand[k]) continue;
    if (s === 'eingenordet') eingenordet[k] = heute;
    else if (KASTEN_FUER[s]) stand[k] = { kasten: KASTEN_FUER[s]!, faellig: heute };
  }
  speichereUeben(stand);
  teilen(ich, stand, { ...ladeKastenGeteilt(ich).gelernt, ...eingenordet });
}

// ---- Bühnenreife eines Songs aus dem Status aller Musiker ----
export interface Reife {
  /** 0–1: Schnitt über alle Musiker (Nicht gelernt 0, Üben 15 %, Wackelt noch 40 %, Sitzt 75 %, Eingenordet 100 %) */
  wert: number;
  /** Status je Person (slug), nur mit Angabe */
  personen: Map<string, UebeStatus>;
  /** Rufnamen, bei denen der Song noch geübt wird oder wackelt */
  wackeltBei: string[];
  mitAngabe: number;
  /** bühnenreif: alle eingenordet · fast: alle mindestens „Sitzt“ · Baustelle: sonst · offen: niemand hat eine Angabe */
  ampel: 'buehnenreif' | 'fast' | 'baustelle' | 'offen';
}

export function buehnenreife(key: string, mitglieder: Mitglied[], alle: Map<string, Map<string, UebeStatus>>): Reife {
  const personen = new Map<string, UebeStatus>();
  for (const m of mitglieder) {
    const s = alle.get(m.slug)?.get(key);
    if (s && s !== 'nicht') personen.set(m.slug, s);
  }
  const status = mitglieder.map((m) => personen.get(m.slug) ?? 'nicht');
  const wert = mitglieder.length ? status.reduce((n, s) => n + statusInfo(s).punkte, 0) / mitglieder.length : 0;
  const wackeltBei = mitglieder.filter((m) => unsicher(personen.get(m.slug))).map(rufname);
  const ampel = !personen.size
    ? 'offen'
    : status.every((s) => s === 'eingenordet')
      ? 'buehnenreif'
      : status.every((s) => s === 'sitzt' || s === 'eingenordet')
        ? 'fast'
        : 'baustelle';
  return { wert, personen, wackeltBei, mitAngabe: personen.size, ampel };
}

/** Übersicht je Person: Songs je Status und was sich in `tage` Tagen bewegt hat (aus dem Verlauf im Fortschritt) */
export function personUebersicht(
  m: Mitglied,
  status: Map<string, UebeStatus>,
  f: Fortschritt,
  heute: string,
  tage = 30,
): { slug: string; name: string; je: Record<UebeStatus, number>; gefestigt: string[]; neuWackelig: string[]; zuletzt?: string } {
  const grenze = new Date(Date.parse(heute) - tage * 864e5).toISOString().slice(0, 10);
  const je: Record<UebeStatus, number> = { nicht: 0, ueben: 0, wackelt: 0, sitzt: 0, eingenordet: 0 };
  const gefestigt: string[] = [];
  const neuWackelig: string[] = [];
  let zuletzt: string | undefined;
  for (const [key, s] of status) {
    je[s]++;
    const vorher = [...(f[key] ?? [])].filter((e) => e.tag < grenze).at(-1)?.stand;
    const titel = key.slice(0, key.lastIndexOf('|'));
    const warUnsicher = vorher === 'wackelt' || vorher === 'ueben';
    if ((s === 'sitzt' || s === 'eingenordet') && warUnsicher) gefestigt.push(titel);
    if (unsicher(s) && vorher !== undefined && !warUnsicher) neuWackelig.push(titel);
    const letzter = f[key]?.at(-1)?.tag;
    if (letzter && (!zuletzt || letzter > zuletzt)) zuletzt = letzter;
  }
  return { slug: m.slug, name: rufname(m), je, gefestigt, neuWackelig, zuletzt };
}

/**
 * Übe-Woche einer Person: Tage am Stück mit Übe-Modus (bis heute bzw. gestern), Karten der letzten 7 Tage und was in
 * dieser Zeit eingenordet wurde (aus Verlauf und geteiltem Karteikasten).
 */
export function uebeWoche(f: Fortschritt, g: KastenGeteilt, heute: string): { serie: number; karten: number; eingenordet: string[] } {
  const tag = (n: number) => new Date(Date.parse(`${heute}T12:00:00Z`) - n * 864e5).toISOString().slice(0, 10);
  const tage = new Set<string>();
  let karten = 0;
  for (const verlauf of Object.values(f))
    for (const e of verlauf) {
      if (e.quelle !== 'ueben') continue;
      tage.add(e.tag);
      if (e.tag > tag(7) && e.tag <= heute) karten++;
    }
  // Serie: heute noch nicht geübt zählt nicht als Abbruch
  let n = tage.has(heute) ? 0 : 1;
  let serie = 0;
  while (tage.has(tag(n))) {
    serie++;
    n++;
  }
  const eingenordet = Object.entries(g.eingenordet ?? {})
    .filter(([, t]) => t > tag(7))
    .map(([k]) => k.slice(0, k.lastIndexOf('|')));
  return { serie, karten, eingenordet };
}

/** Songs, an denen mehrere gerade arbeiten (Üben oder Wackelt noch bei mindestens `ab` Personen) – meiste zuerst */
export function gemeinsamDran(
  mitglieder: Mitglied[],
  alle: Map<string, Map<string, UebeStatus>>,
  ab = 2,
): { key: string; title: string; artist: string; wer: { slug: string; name: string; status: UebeStatus }[] }[] {
  const je = new Map<string, { slug: string; name: string; status: UebeStatus }[]>();
  for (const m of mitglieder)
    for (const [k, st] of alle.get(m.slug) ?? []) if (unsicher(st)) je.set(k, [...(je.get(k) ?? []), { slug: m.slug, name: rufname(m), status: st }]);
  return [...je]
    .filter(([, w]) => w.length >= ab)
    .map(([key, wer]) => ({ key, title: key.slice(0, key.lastIndexOf('|')), artist: key.slice(key.lastIndexOf('|') + 1), wer }))
    .sort((a, b) => b.wer.length - a.wer.length || a.title.localeCompare(b.title, 'de'));
}

/**
 * „Rückgängig“ im Übe-Modus: alles, was eine Status-Wahl der eigenen Person ändert (Karteikasten, geteilter Kasten,
 * Verlauf, „unsicher bei“, alte Liste, heute geübt), vorher merken. Die zurückgegebene Funktion stellt genau diesen
 * Stand wieder her – über localStorage, damit auch der Abgleich die Rücknahme mitbekommt.
 */
export function uebeSchnappschuss(): () => void {
  const ich = ladeIch();
  const keys = [UEBEN_KEY, ALTE_LISTE, HEUTE_KEY, ...(ich ? [KASTEN_PREFIX + ich, FORTSCHRITT_PREFIX + ich, UNSICHER_PREFIX + ich] : [])];
  const vorher = keys.map((k) => {
    try {
      return [k, localStorage.getItem(k)] as const;
    } catch {
      return [k, null] as const;
    }
  });
  return () => {
    for (const [k, v] of vorher) {
      try {
        if (v === null) localStorage.removeItem(k);
        else localStorage.setItem(k, v);
      } catch {
        // ohne Speicher nichts zurückzunehmen
      }
    }
  };
}
