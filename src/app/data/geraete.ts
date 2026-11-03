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
export function geraetMeldung(person: string, jetzt = new Date()): { pfad: string; text: string } | null {
  const id = geraetId();
  const name = geraetName() || standardName(typeof navigator === 'undefined' ? '' : navigator.userAgent);
  let alt: { name?: string; zeit?: number } = {};
  try {
    alt = JSON.parse(lesen(GEMELDET_KEY) ?? '{}');
  } catch {
    // neu melden
  }
  if (alt.name === name && alt.zeit && jetzt.getTime() - alt.zeit < ABSTAND) return null;
  schreiben(GEMELDET_KEY, JSON.stringify({ name, zeit: jetzt.getTime() }));
  const e: GeraetEintrag = { id, name, person, zeit: jetzt.toISOString() };
  return { pfad: geraetPfad(id), text: JSON.stringify(e) };
}

/** Geräte-Dateien aus dem Sync-Ordner lesen – neueste zuerst, Ungültiges fällt weg */
export function geraeteListe(texte: string[]): GeraetEintrag[] {
  const out: GeraetEintrag[] = [];
  for (const t of texte) {
    try {
      const e = JSON.parse(t) as Partial<GeraetEintrag>;
      if (typeof e.id === 'string' && typeof e.name === 'string' && typeof e.zeit === 'string' && !Number.isNaN(Date.parse(e.zeit)))
        out.push({ id: e.id, name: e.name.slice(0, 40), person: typeof e.person === 'string' ? e.person : '', zeit: e.zeit });
    } catch {
      // kaputte Datei überspringen
    }
  }
  return out.sort((a, b) => b.zeit.localeCompare(a.zeit));
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
