// „Wackelt noch“: Songs, bei denen man selbst noch unsicher ist – je Gerät, also je Musiker. Markiert unter
// Backstage → Songs (Dialog) oder in der Nachbereitung eines Auftritts; der Probe-Vorschlag nimmt sie zuerst,
// unter Songs zeigt „Zeigen → wackelt noch“ die Liste. Gespeichert als „Titel|Interpret“ → Datum der Markierung.
export const WACKELT_KEY = 'bn-wackelt';

export function ladeWackelt(): Record<string, string> {
  try {
    return typeof localStorage === 'undefined' ? {} : JSON.parse(localStorage.getItem(WACKELT_KEY) ?? '{}');
  } catch {
    return {};
  }
}

/** markiert bzw. entfernt einen Song und gibt die neue Liste zurück */
export function wackeltSetzen(key: string, an: boolean, heute = new Date().toISOString().slice(0, 10)): Record<string, string> {
  const { [key]: _, ...rest } = ladeWackelt();
  const neu = an ? { ...rest, [key]: heute } : rest;
  try {
    if (Object.keys(neu).length) localStorage.setItem(WACKELT_KEY, JSON.stringify(neu));
    else localStorage.removeItem(WACKELT_KEY);
  } catch {
    // ohne Speicher gilt die Markierung nicht
  }
  return neu;
}
