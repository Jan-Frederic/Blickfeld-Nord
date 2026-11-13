// Gerätevergleich (Backstage → Abgleich): jedes Gerät bekommt einen Namen („Freds Handy“) und legt beim Abgleich eine
// kleine Datei „Geraete/<id>.json“ in den Sync-Ordner – Name, Person und Zeitpunkt. So sieht man im Abgleich, welche
// Geräte zuletzt wann abgeglichen haben. Name und Kennung bleiben auf dem Gerät (werden nicht gespiegelt).
// Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.
export const GERAET_NAME_KEY = 'bn-geraet-name';
export const GERAET_ID_KEY = 'bn-geraet-id';
const GEMELDET_KEY = 'bn-geraet-gemeldet';
export const GERAETE_ORDNER = 'Geraete';
/** höchstens so oft eine neue Geräte-Datei (sonst lädt jeder automatische Abgleich etwas hoch) */
const ABSTAND = 60 * 60_000;

export interface GeraetEintrag {
  id: string;
  name: string;
  person: string;
  /** ISO-Zeitpunkt des Abgleichs */
  zeit: string;
  /** App-Stand des Geräts (data/app-stand.ts) – fehlt bei Einträgen älterer Versionen */
  app?: string;
}

/** Vorschlag für den Namen aus dem Browser: „iPhone“, „Android-Handy“, „iPad“, „Mac“, „Windows-PC“ … */
export function standardName(ua: string): string {
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android-Handy' : 'Android-Tablet';
  if (/Macintosh|Mac OS X/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows-PC';
  if (/Linux/.test(ua)) return 'Linux-Rechner';
  return 'Gerät';
}

const lesen = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const schreiben = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    // ohne Speicher eben ohne Namen
  }
};

export function geraetId(): string {
  let id = lesen(GERAET_ID_KEY);
  if (!id) {
    id = crypto.randomUUID().slice(0, 8);
    schreiben(GERAET_ID_KEY, id);
  }
  return id;
}

/** eigener Name des Geräts; leer = noch nicht vergeben */
export const geraetName = (): string => lesen(GERAET_NAME_KEY)?.trim() ?? '';

export function geraetNameSetzen(name: string): void {
  schreiben(GERAET_NAME_KEY, name.trim().slice(0, 40));
}

export const geraetPfad = (id: string) => `${GERAETE_ORDNER}/${id}.json`;

/** Geräte-Datei für den Abgleich – null, wenn sie seit dem letzten Mal (unter einer Stunde, gleicher Name) reicht */
export function geraetMeldung(person: string, jetzt = new Date(), app = ''): { pfad: string; text: string } | null {
  const id = geraetId();
  const name = geraetName() || standardName(typeof navigator === 'undefined' ? '' : navigator.userAgent);
  let alt: { name?: string; zeit?: number; app?: string } = {};
  try {
    alt = JSON.parse(lesen(GEMELDET_KEY) ?? '{}');
  } catch {
    // neu melden
  }
  // neu melden: stündlich, bei neuem Namen und bei neuem App-Stand (damit die Liste gleich „aktuell“ zeigt)
  if (alt.name === name && (alt.app ?? '') === app && alt.zeit && jetzt.getTime() - alt.zeit < ABSTAND) return null;
  schreiben(GEMELDET_KEY, JSON.stringify({ name, zeit: jetzt.getTime(), ...(app ? { app } : {}) }));
  const e: GeraetEintrag = { id, name, person, zeit: jetzt.toISOString(), ...(app ? { app } : {}) };
  return { pfad: geraetPfad(id), text: JSON.stringify(e) };
}

/** Geräte-Dateien aus dem Sync-Ordner lesen – neueste zuerst, Ungültiges fällt weg */
export function geraeteListe(texte: string[]): GeraetEintrag[] {
  const out: GeraetEintrag[] = [];
  for (const t of texte) {
    try {
      const e = JSON.parse(t) as Partial<GeraetEintrag>;
      if (typeof e.id === 'string' && typeof e.name === 'string' && typeof e.zeit === 'string' && !Number.isNaN(Date.parse(e.zeit)))
        out.push({
          id: e.id,
          name: e.name.slice(0, 40),
          person: typeof e.person === 'string' ? e.person : '',
          zeit: e.zeit,
          ...(typeof e.app === 'string' && /^[0-9a-f]{6,12}$/.test(e.app) ? { app: e.app } : {}),
        });
    } catch {
      // kaputte Datei überspringen
    }
  }
  return out.sort((a, b) => b.zeit.localeCompare(a.zeit));
}

// ---- Aufräumen der Geräteliste (für jeden Eintrag gleich, ohne Handarbeit) -------------------------------------
// Ein Eintrag, der sich über mehrere Abgleiche und mindestens einen Tag nicht lesen lässt, oder ein Gerät, das seit
// einem halben Jahr nicht abgeglichen hat, wird vom Gerät mit „Daten löschen“ entfernt. Gefahrlos: Ein Gerät, das
// noch genutzt wird, legt seinen Eintrag beim nächsten Abgleich (höchstens stündlich) neu an.
export const UNLESBAR_ABGLEICHE = 3;
export const UNLESBAR_STUNDEN = 24;
export const VERALTET_TAGE = 180;
/** lange nicht gesehen – in der Liste vermerkt */
export const LANGE_NICHT_TAGE = 60;
export type UnlesbarZaehler = Record<string, { seit: number; n: number }>;

export function geraetePflege(
  geraete: GeraetEintrag[],
  unlesbar: string[],
  alt: UnlesbarZaehler,
  jetzt: number,
  eigeneId: string,
): { zaehler: UnlesbarZaehler; entfernen: { id: string; grund: 'unlesbar' | 'veraltet' }[] } {
  const zaehler: UnlesbarZaehler = {};
  const entfernen: { id: string; grund: 'unlesbar' | 'veraltet' }[] = [];
  for (const id of new Set(unlesbar)) {
    const z = { seit: alt[id]?.seit ?? jetzt, n: (alt[id]?.n ?? 0) + 1 };
    zaehler[id] = z;
    if (id !== eigeneId && z.n >= UNLESBAR_ABGLEICHE && jetzt - z.seit >= UNLESBAR_STUNDEN * 3600_000) entfernen.push({ id, grund: 'unlesbar' });
  }
  for (const g of geraete)
    if (g.id !== eigeneId && jetzt - Date.parse(g.zeit) > VERALTET_TAGE * 864e5) entfernen.push({ id: g.id, grund: 'veraltet' });
  return { zaehler, entfernen };
}

/** „gerade eben“, „vor 3 Std.“, „gestern“, „vor 5 Tagen“ */
export function seitText(iso: string, jetzt = Date.now()): string {
  const min = Math.round((jetzt - Date.parse(iso)) / 60_000);
  if (min < 2) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  const std = Math.round(min / 60);
  if (std < 24) return `vor ${std} Std.`;
  const tage = Math.round(std / 24);
  return tage === 1 ? 'gestern' : `vor ${tage} Tagen`;
}

/** Fehlermeldung des Abgleichs lesbar machen: „Geraete/<Kennung>.json: …“ bekommt den Namen des Geräts dazu */
export function geraetImFehler(fehler: string, geraete: GeraetEintrag[]): string {
  return fehler.replace(new RegExp(`^${GERAETE_ORDNER}/([^/.]+)\\.json:`), (ganz, id: string) => {
    const g = geraete.find((x) => x.id === id);
    return g ? `${GERAETE_ORDNER}/${id}.json (Gerät „${g.name}“${g.person ? `, ${g.person}` : ''}):` : ganz;
  });
}
