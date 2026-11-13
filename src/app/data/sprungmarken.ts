// Sprungmarken je Spotify-Track (Übe- und Probe-Modus, Spotify-Steuerung): „Einsatz“, „Strophe“, „Refrain“ … an
// einer Stelle der Aufnahme – ein Tipp springt dorthin. „Einsatz“ ist besonders: ▶ beginnt den Song dort statt am
// Anfang (kein langes Intro beim Mitspielen). Gilt für die ganze Band: bn-sprungmarken wird mit OneDrive gespiegelt;
// ändern zwei gleichzeitig, führt der Abgleich je Track zusammen (spätere Änderung gewinnt, data/spiegel-merge.ts).
// Je Track, weil eine Marke zu genau einer Aufnahme passt. Ohne Angular-Abhängigkeiten, damit es in Node testbar ist.

export const SPRUNGMARKEN_KEY = 'bn-sprungmarken';
export const MARKEN_NAMEN = ['Einsatz', 'Strophe', 'Refrain', 'Bridge', 'Solo', 'Outro'] as const;
export const EINSATZ = 'Einsatz';

export interface Marke {
  /** Name, bei mehreren gleichen durchnummeriert („Strophe 2“) */
  n: string;
  /** Stelle in der Aufnahme (ms) */
  ms: number;
}
/** je Track: Marken und Zeitpunkt der letzten Änderung (ms seit 1970, für das Zusammenführen) */
export type AlleMarken = Record<string, { marken: Marke[]; zeit: number }>;

export function alleMarken(): AlleMarken {
  try {
    const v = JSON.parse(localStorage.getItem(SPRUNGMARKEN_KEY) ?? '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

/** Marken eines Tracks, nach Stelle sortiert */
export function marken(track: string | undefined, alle = alleMarken()): Marke[] {
  return track ? [...(alle[track]?.marken ?? [])].sort((a, b) => a.ms - b.ms) : [];
}

/** Stelle des Einsatzes (▶ beginnt dort), sonst 0 */
export const einsatz = (track: string | undefined): number => marken(track).find((m) => m.n === EINSATZ)?.ms ?? 0;

function speichern(track: string, liste: Marke[]): Marke[] {
  const alle = alleMarken();
  // auch eine leere Liste bleibt stehen (mit Zeit) – sonst brächte das Zusammenführen gelöschte Marken zurück
  alle[track] = { marken: liste, zeit: Date.now() };
  try {
    localStorage.setItem(SPRUNGMARKEN_KEY, JSON.stringify(alle));
  } catch {
    // ohne Speicher gilt die Marke nur bis zum Schließen
  }
  return marken(track, alle);
}

/** Marke setzen: „Einsatz“ gibt es einmal (wird versetzt), andere Namen werden durchnummeriert */
export function markeSetzen(track: string, name: string, ms: number): Marke[] {
  const liste = marken(track);
  const stelle = Math.max(0, Math.round(ms));
  if (name === EINSATZ) return speichern(track, [...liste.filter((m) => m.n !== EINSATZ), { n: EINSATZ, ms: stelle }]);
  const gleiche = liste.filter((m) => m.n === name || m.n.startsWith(`${name} `)).length;
  return speichern(track, [...liste, { n: gleiche ? `${name} ${gleiche + 1}` : name, ms: stelle }]);
}

export function markeLoeschen(track: string, name: string): Marke[] {
  return speichern(track, marken(track).filter((m) => m.n !== name));
}

/** Typ einer Marke ohne Nummer: „Strophe 2“ → „Strophe“ */
export const markenTyp = (n: string): string => n.replace(/ \d+$/, '');

/**
 * Typ einer Marke ändern (Marken bearbeiten: z. B. versehentlich „Refrain“ statt „Outro“) – die Stelle bleibt. Ist der
 * neue Typ „Einsatz“, ersetzt sie einen vorhandenen Einsatz. Danach werden der alte und der neue Typ nach der Zeit neu
 * durchnummeriert („Refrain“, „Refrain 2“ …), damit keine Lücken oder doppelten Namen bleiben.
 */
export function markeTypAendern(track: string, name: string, typ: string): Marke[] {
  const liste = marken(track);
  const m = liste.find((x) => x.n === name);
  if (!m || markenTyp(name) === typ) return liste;
  const alt = markenTyp(name);
  let rest = liste.filter((x) => x !== m);
  if (typ === EINSATZ) rest = rest.filter((x) => x.n !== EINSATZ);
  const neu = [...rest, { n: typ, ms: m.ms }].sort((a, b) => a.ms - b.ms);
  const zaehler = new Map<string, number>();
  const anzahl = (t: string) => neu.filter((x) => markenTyp(x.n) === t).length;
  return speichern(
    track,
    neu.map((x) => {
      const t = markenTyp(x.n);
      if (t === EINSATZ || (t !== alt && t !== typ)) return x;
      const i = (zaehler.get(t) ?? 0) + 1;
      zaehler.set(t, i);
      return { n: i === 1 || anzahl(t) === 1 ? t : `${t} ${i}`, ms: x.ms };
    }),
  );
}

/** Zusammenführen zweier Fassungen (Abgleich): je Track die später geänderte */
export function markenZusammenfuehren(eigen: AlleMarken, andere: AlleMarken): AlleMarken {
  const out: AlleMarken = { ...eigen };
  for (const [t, a] of Object.entries(andere)) if (!out[t] || (a?.zeit ?? 0) >= (out[t].zeit ?? 0)) out[t] = a;
  return out;
}
