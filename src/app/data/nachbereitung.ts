// Nachbereitung eines Auftritts (Backstage-Seite eines vergangenen Auftritts): wie lief es, was ging schief, was ist
// zu tun. Gespeichert je Auftritt in „bn-nachbereitung-<Auftritt>“; Sterne gehen in die gewohnten Bewertungen
// (bn-bewertung-…), unsichere Songs auf die „Wackelt noch“-Liste. Offene Punkte erscheinen unter Backstage → Aufgaben.
// Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.
export const NACHBEREITUNG_PREFIX = 'bn-nachbereitung-';

export interface Merkpunkt {
  text: string;
  erledigt?: boolean;
}

export interface Nachbereitung {
  gut: string;
  schief: string;
  punkte: Merkpunkt[];
}

export const leereNachbereitung = (): Nachbereitung => ({ gut: '', schief: '', punkte: [] });

export function ladeNachbereitung(show: string): Nachbereitung {
  try {
    return { ...leereNachbereitung(), ...JSON.parse(localStorage.getItem(NACHBEREITUNG_PREFIX + show) ?? '{}') };
  } catch {
    return leereNachbereitung();
  }
}

export function nachbereitungSpeichern(show: string, n: Nachbereitung): void {
  const leer = !n.gut.trim() && !n.schief.trim() && !n.punkte.length;
  try {
    if (leer) localStorage.removeItem(NACHBEREITUNG_PREFIX + show);
    else localStorage.setItem(NACHBEREITUNG_PREFIX + show, JSON.stringify(n));
  } catch {
    // ohne Speicher gilt die Nachbereitung bis zum Neuladen
  }
}

/** Merkpunkte aus einem Textfeld: eine Zeile je Punkt, Aufzählungszeichen am Anfang werden entfernt */
export function punkteAusText(text: string): string[] {
  return text
    .split('\n')
    .map((z) => z.replace(/^\s*(?:[-*•–]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}

/** offene Merkpunkte aller Auftritte (für Backstage → Aufgaben), neueste Auftritte zuerst */
export function offeneMerkpunkte(alle: { show: string; n: Nachbereitung }[]): { show: string; index: number; text: string }[] {
  return [...alle]
    .sort((a, b) => b.show.localeCompare(a.show))
    .flatMap(({ show, n }) => n.punkte.map((p, index) => ({ show, index, text: p.text, erledigt: p.erledigt })).filter((p) => !p.erledigt))
    .map(({ show, index, text }) => ({ show, index, text }));
}

/** alle gespeicherten Nachbereitungen dieses Geräts */
export function alleNachbereitungen(): { show: string; n: Nachbereitung }[] {
  const out: { show: string; n: Nachbereitung }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (k.startsWith(NACHBEREITUNG_PREFIX)) out.push({ show: k.slice(NACHBEREITUNG_PREFIX.length), n: ladeNachbereitung(k.slice(NACHBEREITUNG_PREFIX.length)) });
    }
  } catch {
    // ohne Speicher nichts
  }
  return out;
}
