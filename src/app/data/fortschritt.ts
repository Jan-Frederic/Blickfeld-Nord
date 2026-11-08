// Fortschritt je Person und Bühnenreife je Song. Jede Person schreibt ihre eigene Datei (bn-fortschritt-<slug>, wird
// mit der Band gespiegelt – so ändern nie zwei Leute dieselbe Datei): je Song ein kurzer Verlauf „sitzt“ / „wackelt“
// mit Datum und Quelle. Einträge entstehen über
// – „Wackelt noch“ (Songs-Dialog, Nachbereitung): an = wackelt, aus = sitzt („liste“),
// – den Probe-Modus: „Sitzt“ / „Nochmal“ gilt für die Person am Gerät („probe“, Datum der Probe),
// – den Übemodus (Karteikasten): „Sitzt“ / „Wackelt noch“ je Karte („ueben“, Tag des Übens).
// Daraus: Stufe je Person (wackelt, sitzt, sicher = zweimal in Folge an verschiedenen Tagen sitzt), Bühnenreife je Song
// (Schnitt über alle Musiker, ohne Angabe zählt neutral) und der Fortschritt je Person (was in den letzten Wochen
// gefestigt wurde bzw. neu wackelt). Übersicht: Backstage → Songs → Bühnenreife; der Probe-Vorschlag nimmt die Songs mit
// der geringsten Reife zuerst. Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.
import { Mitglied, rufname } from './band-ich';

export const FORTSCHRITT_PREFIX = 'bn-fortschritt-';
/** so viele Einträge je Song und Person bleiben (ältere fallen weg) */
const VERLAUF_MAX = 20;

export type Stand = 'sitzt' | 'wackelt';
export interface FortschrittEintrag {
  /** JJJJ-MM-TT */
  tag: string;
  stand: Stand;
  quelle: 'probe' | 'liste' | 'ueben';
}
/** je Song („Titel|Interpret“) der Verlauf, älteste zuerst */
export type Fortschritt = Record<string, FortschrittEintrag[]>;

export type Stufe = 'wackelt' | 'sitzt' | 'sicher';
/** Punkte je Stufe für die Bühnenreife; ohne Angabe zählt neutral */
const PUNKTE: Record<Stufe, number> = { wackelt: 0, sitzt: 0.7, sicher: 1 };
const OHNE_ANGABE = 0.5;

const lesen = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

export function ladeFortschritt(slug: string): Fortschritt {
  try {
    const f = JSON.parse(lesen(FORTSCHRITT_PREFIX + slug) ?? '{}');
    return f && typeof f === 'object' && !Array.isArray(f) ? f : {};
  } catch {
    return {};
  }
}

/** Eintrag hinzufügen (pure): am selben Tag aus derselben Quelle ersetzt der neue den alten */
export function mitEintrag(f: Fortschritt, key: string, eintrag: FortschrittEintrag): Fortschritt {
  const alt = (f[key] ?? []).filter((e) => !(e.tag === eintrag.tag && e.quelle === eintrag.quelle));
  const neu = [...alt, eintrag].sort((a, b) => a.tag.localeCompare(b.tag)).slice(-VERLAUF_MAX);
  return { ...f, [key]: neu };
}

/** Stand der Person zu einem Song festhalten (ohne gewählte Person geschieht nichts) */
export function fortschrittEintragen(slug: string, key: string, stand: Stand, quelle: FortschrittEintrag['quelle'], tag = new Date().toISOString().slice(0, 10)): void {
  if (!slug) return;
  try {
    localStorage.setItem(FORTSCHRITT_PREFIX + slug, JSON.stringify(mitEintrag(ladeFortschritt(slug), key, { tag, stand, quelle })));
  } catch {
    // ohne Speicher zählt es nicht
  }
}

/** Stufe aus dem Verlauf: zuletzt wackelt → wackelt; zuletzt sitzt → sitzt, an zwei Tagen in Folge → sicher */
export function stufe(verlauf: FortschrittEintrag[] | undefined): Stufe | undefined {
  if (!verlauf?.length) return undefined;
  // je Tag zählt der letzte Eintrag; am selben Tag gilt Probe vor Übemodus vor Liste
  const rang = { liste: 0, ueben: 1, probe: 2 } as const;
  const jeTag = new Map<string, Stand>();
  for (const e of [...verlauf].sort((a, b) => a.tag.localeCompare(b.tag) || (rang[a.quelle] ?? 0) - (rang[b.quelle] ?? 0))) jeTag.set(e.tag, e.stand);
  const staende = [...jeTag.values()];
  if (staende.at(-1) === 'wackelt') return 'wackelt';
  return staende.length >= 2 && staende.at(-2) === 'sitzt' ? 'sicher' : 'sitzt';
}

export interface Reife {
  /** 0–1: Schnitt über alle Musiker (wackelt 0, sitzt 0,7, sicher 1, ohne Angabe 0,5) */
  wert: number;
  /** Stufe je Person (slug), nur mit Angabe */
  personen: Map<string, Stufe>;
  /** Rufnamen, bei denen der Song wackelt */
  wackeltBei: string[];
  /** so viele Musiker haben eine Angabe */
  mitAngabe: number;
  ampel: 'buehnenreif' | 'fast' | 'baustelle' | 'offen';
}

/** Bühnenreife eines Songs über alle Mitglieder */
export function reife(key: string, mitglieder: Mitglied[], alle: Map<string, Fortschritt>): Reife {
  const personen = new Map<string, Stufe>();
  let summe = 0;
  for (const m of mitglieder) {
    const s = stufe(alle.get(m.slug)?.[key]);
    if (s) personen.set(m.slug, s);
    summe += s ? PUNKTE[s] : OHNE_ANGABE;
  }
  const wert = mitglieder.length ? summe / mitglieder.length : 0;
  const wackeltBei = mitglieder.filter((m) => personen.get(m.slug) === 'wackelt').map(rufname);
  const ampel = !personen.size ? 'offen' : wackeltBei.length ? 'baustelle' : personen.size === mitglieder.length && wert >= 0.9 ? 'buehnenreif' : wert >= 0.6 ? 'fast' : 'baustelle';
  return { wert, personen, wackeltBei, mitAngabe: personen.size, ampel };
}

/** Fortschritt aller Mitglieder (aus dem Speicher) */
export function alleFortschritte(mitglieder: Mitglied[]): Map<string, Fortschritt> {
  return new Map(mitglieder.map((m) => [m.slug, ladeFortschritt(m.slug)]));
}

export interface PersonFortschritt {
  slug: string;
  name: string;
  sicher: number;
  sitzt: number;
  wackelt: number;
  /** in den letzten `tage` Tagen von „wackelt“ zu „sitzt“ gekommen */
  gefestigt: string[];
  /** in den letzten `tage` Tagen neu „wackelt“ */
  neuWackelig: string[];
  /** letzter Eintrag */
  zuletzt?: string;
}

/** Fortschritt einer Person: Stufen über alle Songs und was sich in den letzten Wochen bewegt hat */
export function personFortschritt(m: Mitglied, f: Fortschritt, heute: string, tage = 30): PersonFortschritt {
  const grenze = new Date(Date.parse(heute) - tage * 864e5).toISOString().slice(0, 10);
  const out: PersonFortschritt = { slug: m.slug, name: rufname(m), sicher: 0, sitzt: 0, wackelt: 0, gefestigt: [], neuWackelig: [] };
  for (const [key, verlauf] of Object.entries(f)) {
    const s = stufe(verlauf);
    if (!s) continue;
    out[s]++;
    const vorher = stufe(verlauf.filter((e) => e.tag < grenze));
    const titel = key.slice(0, key.lastIndexOf('|'));
    if (s !== 'wackelt' && vorher === 'wackelt') out.gefestigt.push(titel);
    if (s === 'wackelt' && vorher !== 'wackelt') out.neuWackelig.push(titel);
    const letzter = verlauf.at(-1)?.tag;
    if (letzter && (!out.zuletzt || letzter > out.zuletzt)) out.zuletzt = letzter;
  }
  return out;
}

/** Stände aus dem Probe-Modus für eine Probe: je Song, wer „sitzt“ bzw. „nochmal“ gedrückt hat */
export function probeStaende(datum: string, mitglieder: Mitglied[], alle: Map<string, Fortschritt>): Map<string, Map<string, Stand>> {
  const out = new Map<string, Map<string, Stand>>();
  for (const m of mitglieder) {
    for (const [key, verlauf] of Object.entries(alle.get(m.slug) ?? {})) {
      const e = verlauf.find((x) => x.tag === datum && x.quelle === 'probe');
      if (!e) continue;
      if (!out.has(key)) out.set(key, new Map());
      out.get(key)!.set(m.slug, e.stand);
    }
  }
  return out;
}

/** Stand eines Songs in der Probe für die Band: „nochmal“, sobald eine Person nochmal will; sonst „sitzt“ */
export function bandStand(staende: Map<string, Stand> | undefined): 'sitzt' | 'nochmal' | undefined {
  if (!staende?.size) return undefined;
  return [...staende.values()].includes('wackelt') ? 'nochmal' : 'sitzt';
}

/** Probenpläne mit dem Stand der Band aus den Fortschritten (für Proben-Verlauf und Ergebnis) */
export function plaeneMitStaenden<S extends { title: string; artist: string; done?: boolean; stand?: 'sitzt' | 'nochmal' }>(
  plaene: { tag: string; songs: S[] }[],
  mitglieder: Mitglied[],
  alle: Map<string, Fortschritt>,
): { tag: string; songs: S[] }[] {
  return plaene.map((p) => {
    const staende = probeStaende(p.tag, mitglieder, alle);
    if (!staende.size) return p;
    return { ...p, songs: p.songs.map((s) => { const b = bandStand(staende.get(`${s.title}|${s.artist}`)); return b ? { ...s, stand: b, done: true } : s; }) };
  });
}

/** „73 %“ */
export const prozent = (wert: number) => `${Math.round(wert * 100)} %`;
