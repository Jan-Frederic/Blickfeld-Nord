// Wer bin ich in der Band? (Backstage → Probe, einmal je Person gewählt, mit den Einstellungen gespiegelt.) Darauf bauen:
// – Zusagen zur Probe: jede Person schreibt ihre eigene Datei (bn-zusage-<datum>-<slug>), damit sich nie zwei Leute
//   dieselbe Datei teilen; die Probenseite zeigt, wer kommt.
// – „Unsicher bei“: die eigene „Wackelt noch“-Liste (persönlich) geht zusätzlich als bn-unsicher-<slug> an die Band;
//   Probenseite und Song-Dialog zeigen, wer bei welchem Song noch unsicher ist.
// Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.
export const ICH_KEY = 'bn-ich';
export const ZUSAGE_PREFIX = 'bn-zusage-';
export const UNSICHER_PREFIX = 'bn-unsicher-';

export interface Mitglied {
  slug: string;
  name: string;
  nickname?: string;
}

/** Rufname: Spitzname, sonst Vorname */
export const rufname = (m: Mitglied) => m.nickname ?? m.name.split(' ')[0];

const lesen = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const schreiben = (k: string, v: string | null): void => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    // ohne Speicher gilt es nur bis zum Neuladen
  }
};

export const ladeIch = (): string => lesen(ICH_KEY) ?? '';

/** Person wählen – teilt gleich die eigene „Wackelt noch“-Liste */
export function ichSetzen(slug: string, wackelt: Record<string, string>): void {
  schreiben(ICH_KEY, slug || null);
  if (slug) unsicherTeilen(slug, wackelt);
}

export interface Zusage {
  kommt: boolean;
  /** z. B. „komme 30 min später“ */
  notiz?: string;
}

export const zusageKey = (datum: string, slug: string) => `${ZUSAGE_PREFIX}${datum}-${slug}`;

export function zusageSetzen(datum: string, slug: string, z: Zusage | null): void {
  schreiben(zusageKey(datum, slug), z ? JSON.stringify({ kommt: z.kommt, ...(z.notiz?.trim() ? { notiz: z.notiz.trim().slice(0, 80) } : {}) }) : null);
}

/** Zusagen aller Mitglieder zu einer Probe (fehlt = noch keine Antwort) */
export function zusagen(datum: string, mitglieder: Mitglied[]): Map<string, Zusage> {
  const out = new Map<string, Zusage>();
  for (const m of mitglieder) {
    try {
      const z = JSON.parse(lesen(zusageKey(datum, m.slug)) ?? 'null') as Zusage | null;
      if (z && typeof z.kommt === 'boolean') out.set(m.slug, z);
    } catch {
      // kaputter Eintrag – wie keine Antwort
    }
  }
  return out;
}

/** „2 kommen, 1 offen“ */
export function zusagenText(z: Map<string, Zusage>, anzahl: number): string {
  const ja = [...z.values()].filter((x) => x.kommt).length;
  const nein = [...z.values()].filter((x) => !x.kommt).length;
  const offen = anzahl - ja - nein;
  return [ja && `${ja} ${ja === 1 ? 'kommt' : 'kommen'}`, nein && `${nein} ${nein === 1 ? 'sagt' : 'sagen'} ab`, offen && `${offen} offen`].filter(Boolean).join(', ');
}

/** eigene „Wackelt noch“-Liste für die Band sichtbar machen */
export function unsicherTeilen(slug: string, wackelt: Record<string, string>): void {
  const keys = Object.keys(wackelt).sort();
  schreiben(UNSICHER_PREFIX + slug, keys.length ? JSON.stringify(keys) : null);
}

/** je Song: wer ist noch unsicher (Rufnamen) */
export function unsicherJeSong(mitglieder: Mitglied[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const m of mitglieder) {
    try {
      for (const k of JSON.parse(lesen(UNSICHER_PREFIX + m.slug) ?? '[]') as string[]) out.set(k, [...(out.get(k) ?? []), rufname(m)]);
    } catch {
      // kaputter Eintrag
    }
  }
  return out;
}
