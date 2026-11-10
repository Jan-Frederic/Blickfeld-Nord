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

/** Person wählen – teilt gleich die angegebenen unsicheren Songs (ohne Angabe bleibt „unsicher bei“, wie es ist) */
export function ichSetzen(slug: string, wackelt?: Record<string, string>): void {
  schreiben(ICH_KEY, slug || null);
  // von Hand gewählt: das Microsoft-Konto überschreibt die Wahl nicht mehr („– wählen –“ gibt sie wieder frei)
  schreiben(ICH_QUELLE_KEY, slug ? 'hand' : null);
  if (slug && wackelt) unsicherTeilen(slug, wackelt);
}

// „Ich bin …“ aus dem Microsoft-Konto: Name (z. B. „Jan-Frederic Overbeck“, auch „Overbeck, Jan-Frederic“) bzw. der
// Teil der Adresse vor dem @ (z. B. „jan-frederic.overbeck“) gegen die Namen der Mitglieder. Es wird nichts
// gespeichert außer dem Ergebnis – keine Adresse im Code, nur zur Laufzeit verglichen. Nur ein eindeutiger Treffer zählt.
export const ICH_QUELLE_KEY = 'bn-ich-quelle';
export const ichQuelle = (): 'konto' | 'hand' | '' => (lesen(ICH_QUELLE_KEY) as 'konto' | 'hand' | null) ?? '';

const woerter = (t: string): string[] =>
  t
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** Mitglied zum Microsoft-Konto – null, wenn keiner oder mehrere passen */
export function mitgliedZuKonto(mitglieder: Mitglied[], konto: { name?: string; username?: string } | null | undefined): string | null {
  if (!konto) return null;
  const kontoName = new Set(woerter(konto.name ?? ''));
  const adresse = woerter((konto.username ?? '').split('@')[0]);
  const passt = (m: Mitglied) => {
    const w = woerter(m.name);
    if (!w.length) return false;
    // alle Teile des Namens im Kontonamen oder vor dem @
    return w.every((x) => kontoName.has(x)) || w.every((x) => adresse.includes(x));
  };
  const treffer = mitglieder.filter(passt);
  return treffer.length === 1 ? treffer[0].slug : null;
}

/**
 * Nach der Microsoft-Anmeldung: „Ich bin …“ setzen, wenn noch niemand gewählt ist oder die Wahl schon vom Konto kam
 * (anderes Konto → andere Person). Eine Wahl von Hand bleibt. Gibt true zurück, wenn sich etwas geändert hat.
 */
export function ichAusKonto(mitglieder: Mitglied[], konto: { name?: string; username?: string } | null | undefined): boolean {
  if (ichQuelle() === 'hand' && ladeIch()) return false;
  const slug = mitgliedZuKonto(mitglieder, konto);
  if (!slug || slug === ladeIch()) return false;
  schreiben(ICH_KEY, slug);
  schreiben(ICH_QUELLE_KEY, 'konto');
  return true;
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
