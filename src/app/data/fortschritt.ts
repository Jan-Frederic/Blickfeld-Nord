// Verlauf des Übe-Status je Person. Jede Person schreibt ihre eigene Datei (bn-fortschritt-<slug>, wird mit der Band
// gespiegelt – so ändern nie zwei Leute dieselbe Datei): je Song ein kurzer Verlauf der Status mit Datum und Quelle
// („liste“: Song-Dialog/Nachbereitung, „probe“: Probe-Modus mit Datum der Probe, „ueben“: Übe-Modus). Der aktuelle Status
// selbst steht im Karteikasten (data/uebe-status.ts); der Verlauf dient für „in 30 Tagen gefestigt“ (Bühnenreife) und
// die Stände einer Probe (Proben-Verlauf, Ergebnis). Ältere Einträge kennen nur „sitzt“ / „wackelt“ (Stufe mit „sicher“ =
// zweimal in Folge an verschiedenen Tagen sitzt) – daraus wird einmalig der neue Status (statusMigrieren).
// Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.
import { Mitglied } from './band-ich';

export const FORTSCHRITT_PREFIX = 'bn-fortschritt-';
/** so viele Einträge je Song und Person bleiben (ältere fallen weg) */
const VERLAUF_MAX = 20;

export type Stand = 'nicht' | 'ueben' | 'wackelt' | 'sitzt' | 'eingenordet';
export interface FortschrittEintrag {
  /** JJJJ-MM-TT */
  tag: string;
  stand: Stand;
  quelle: 'probe' | 'liste' | 'ueben';
}
/** je Song („Titel|Interpret“) der Verlauf, älteste zuerst */
export type Fortschritt = Record<string, FortschrittEintrag[]>;

/** alte Stufe (vor den fünf Übe-Status) */
export type Stufe = 'wackelt' | 'sitzt' | 'sicher';

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

/** alte Stufe aus dem Verlauf: zuletzt wackelt → wackelt; zuletzt sitzt → sitzt, an zwei Tagen in Folge → sicher */
export function stufe(verlauf: FortschrittEintrag[] | undefined): Stufe | undefined {
  if (!verlauf?.length) return undefined;
  const letzter = [...verlauf].sort((a, b) => a.tag.localeCompare(b.tag)).at(-1)!.stand;
  if (letzter === 'eingenordet') return 'sicher';
  if (letzter === 'ueben') return 'wackelt';
  if (letzter === 'nicht') return undefined;
  // je Tag zählt der letzte Eintrag; am selben Tag gilt Probe vor Übemodus vor Liste
  const rang = { liste: 0, ueben: 1, probe: 2 } as const;
  const jeTag = new Map<string, Stand>();
  for (const e of [...verlauf].sort((a, b) => a.tag.localeCompare(b.tag) || (rang[a.quelle] ?? 0) - (rang[b.quelle] ?? 0))) jeTag.set(e.tag, e.stand);
  const staende = [...jeTag.values()];
  if (staende.at(-1) === 'wackelt') return 'wackelt';
  return staende.length >= 2 && staende.at(-2) === 'sitzt' ? 'sicher' : 'sitzt';
}

/** Fortschritt aller Mitglieder (aus dem Speicher) */
export function alleFortschritte(mitglieder: Mitglied[]): Map<string, Fortschritt> {
  return new Map(mitglieder.map((m) => [m.slug, ladeFortschritt(m.slug)]));
}

/** Stände aus dem Probe-Modus für eine Probe: je Song der Status, den jede Person gesetzt hat */
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

/** Stand eines Songs in der Probe für die Band: „nochmal“, sobald er bei einer Person noch nicht sitzt; sonst „sitzt“ */
export function bandStand(staende: Map<string, Stand> | undefined): 'sitzt' | 'nochmal' | undefined {
  if (!staende?.size) return undefined;
  return [...staende.values()].every((s) => s === 'sitzt' || s === 'eingenordet') ? 'sitzt' : 'nochmal';
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
