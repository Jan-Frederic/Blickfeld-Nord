// Übemodus (Backstage → Übersicht → Üben): die Songs, die bei mir noch wackeln, als Karteikarten (Leitner-System).
// Jede Karte liegt in einem von fünf Kästen; „Sitzt“ schiebt sie einen Kasten weiter (seltener wieder dran),
// „Wackelt noch“ zurück in Kasten 1 (gleich wieder dran). Sitzt eine Karte im letzten Kasten noch einmal, ist der Song
// gelernt: er verschwindet aus „Wackelt noch“ und zählt im Fortschritt als „sitzt“.
// Persönlich: je Person ein Stand (bn-ueben, mit den Einstellungen der Person gespiegelt), Grundlage ist die eigene
// „Wackelt noch“-Liste und der eigene Fortschritt (data/wackelt.ts, data/fortschritt.ts). Jede Bewertung zählt im
// Fortschritt (Quelle „ueben“) und damit in der Bühnenreife; je Tag höchstens so viele Karten wie eingestellt
// (Einstellungen → Ich bin …, Standard 10).
// Ohne Angular-Abhängigkeiten, damit es in Node testbar ist.
import { Fortschritt, stufe } from './fortschritt';

export const UEBEN_KEY = 'bn-ueben';
/** Karten je Tag (Einstellung je Person) und heute schon geübte Karten – beide mit den Einstellungen gespiegelt */
export const TAGESZIEL_KEY = 'bn-ueben-tagesziel';
export const HEUTE_KEY = 'bn-ueben-heute';
export const TAGESZIEL_STANDARD = 10;
/** Tage bis zur nächsten Wiederholung je Kasten (Kasten 1 = sofort) */
export const KASTEN_TAGE = [0, 1, 3, 7, 14] as const;
export const KAESTEN = KASTEN_TAGE.length;

export interface KartenStand {
  kasten: number;
  /** wieder dran ab (JJJJ-MM-TT) */
  faellig: string;
  /** zuletzt geübt */
  zuletzt?: string;
}
export type UebenStand = Record<string, KartenStand>;

export interface Karte {
  key: string;
  title: string;
  artist: string;
  kasten: number;
  faellig: string;
  zuletzt?: string;
  /** heute (oder früher) dran */
  dran: boolean;
  /** nächster Auftritt, auf dessen Setlist der Song steht */
  auftritt?: string;
  /** seit wann er wackelt (Markierung) */
  seit?: string;
}

const plusTage = (tag: string, n: number) => {
  const d = new Date(`${tag}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function ladeUeben(): UebenStand {
  try {
    const v = JSON.parse(localStorage.getItem(UEBEN_KEY) ?? '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}
export function speichereUeben(stand: UebenStand): void {
  try {
    if (Object.keys(stand).length) localStorage.setItem(UEBEN_KEY, JSON.stringify(stand));
    else localStorage.removeItem(UEBEN_KEY);
  } catch {
    // ohne Speicher gilt der Stand bis zum Neuladen
  }
}

export function ladeTagesziel(): number {
  try {
    const n = Number(localStorage.getItem(TAGESZIEL_KEY));
    return n >= 1 && n <= 100 ? Math.round(n) : TAGESZIEL_STANDARD;
  } catch {
    return TAGESZIEL_STANDARD;
  }
}
export function speichereTagesziel(n: number): void {
  try {
    localStorage.setItem(TAGESZIEL_KEY, String(Math.min(100, Math.max(1, Math.round(n)))));
  } catch {
    // ohne Speicher gilt der Standard
  }
}
/** heute schon geübte Karten (Song-Keys) – von einem anderen Tag zählt nichts */
export function heuteGeuebt(heute: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(HEUTE_KEY) ?? 'null') as { tag?: string; keys?: string[] } | null;
    return v?.tag === heute && Array.isArray(v.keys) ? v.keys : [];
  } catch {
    return [];
  }
}
export function alsGeuebtMerken(key: string, heute: string): string[] {
  const keys = [...new Set([...heuteGeuebt(heute), key])];
  try {
    localStorage.setItem(HEUTE_KEY, JSON.stringify({ tag: heute, keys }));
  } catch {
    // ohne Speicher zählt es nicht
  }
  return keys;
}
/** wie viele Karten heute noch gehen (Tagesziel minus schon geübte, nie unter 0) */
export const nochHeute = (ziel: number, geuebt: number) => Math.max(0, ziel - geuebt);

/**
 * Karten: alle Songs aus „Wackelt noch“ und alle, die im eigenen Fortschritt zuletzt wackelten. Reihenfolge: heute dran
 * zuerst, darin die Songs des nächsten Auftritts vorn, dann der niedrigste Kasten, dann die am längsten wackelnden.
 */
export function karten(wackelt: Record<string, string>, fortschritt: Fortschritt, stand: UebenStand, auftritte: Map<string, string>, heute: string): Karte[] {
  // dazu Karten, die schon im Kasten liegen (bleiben bis „gelernt“, auch wenn der Fortschritt zwischendurch „sitzt“ zeigt)
  const keys = new Set([...Object.keys(wackelt), ...Object.keys(fortschritt).filter((k) => stufe(fortschritt[k]) === 'wackelt'), ...Object.keys(stand)]);
  const out = [...keys].map((key): Karte => {
    const i = key.lastIndexOf('|');
    const s = stand[key];
    const faellig = s?.faellig ?? heute;
    return { key, title: key.slice(0, i), artist: key.slice(i + 1), kasten: s?.kasten ?? 1, faellig, zuletzt: s?.zuletzt, dran: faellig <= heute, auftritt: auftritte.get(key), seit: wackelt[key] };
  });
  return out.sort(
    (a, b) =>
      Number(b.dran) - Number(a.dran) ||
      (a.auftritt ?? '9999').localeCompare(b.auftritt ?? '9999') ||
      a.kasten - b.kasten ||
      (a.seit ?? '9999').localeCompare(b.seit ?? '9999') ||
      a.title.localeCompare(b.title, 'de'),
  );
}

/** Karte bewerten: sitzt → nächster Kasten (im letzten: gelernt), wackelt → Kasten 1, gleich wieder dran */
export function bewerten(stand: UebenStand, key: string, sitzt: boolean, heute: string): { stand: UebenStand; gelernt: boolean } {
  const alt = stand[key]?.kasten ?? 1;
  if (sitzt && alt >= KAESTEN) {
    const { [key]: _, ...rest } = stand;
    return { stand: rest, gelernt: true };
  }
  const kasten = sitzt ? alt + 1 : 1;
  return { stand: { ...stand, [key]: { kasten, faellig: plusTage(heute, KASTEN_TAGE[kasten - 1]), zuletzt: heute } }, gelernt: false };
}

/** Anzahl Karten je Kasten (Index 0 = Kasten 1) */
export function jeKasten(k: Karte[]): number[] {
  return KASTEN_TAGE.map((_, i) => k.filter((x) => x.kasten === i + 1).length);
}
