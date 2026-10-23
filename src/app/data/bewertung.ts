// Sternchen je Song und Auftritt (Bühnen-Modus): localStorage „bn-bewertung-<Auftritt>“ = { "Titel|Interpret": 1–5 }.
// Daraus die Rangliste im Backstage → Zahlen. Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.
export const BEWERTUNG_PREFIX = 'bn-bewertung-';
export type Bewertungen = Record<string, number>;
export interface Platz {
  title: string;
  artist: string;
  schnitt: number;
  anzahl: number;
  wert: number;
}

export const songKey = (s: { title: string; artist: string }) => `${s.title}|${s.artist}`;

export function ladeBewertungen(show: string): Bewertungen {
  try {
    return JSON.parse(localStorage.getItem(BEWERTUNG_PREFIX + show) ?? '{}') as Bewertungen;
  } catch {
    return {};
  }
}

/** Setzt 1–5 Sterne; dieselbe Zahl noch einmal (oder 0) nimmt die Bewertung zurück */
export function bewerten(alt: Bewertungen, key: string, sterne: number): Bewertungen {
  const { [key]: vorher, ...rest } = alt;
  return sterne >= 1 && sterne <= 5 && sterne !== vorher ? { ...rest, [key]: Math.round(sterne) } : rest;
}

// Ein einzelnes „5 Sterne“ soll nicht vor einem Song landen, der zehnmal 4,8 bekommen hat: der Schnitt wird
// mit zwei gedachten mittleren Bewertungen (3 Sterne) gemischt – je öfter bewertet, desto weniger zählt das.
const PRIOR_STERNE = 3;
const PRIOR_ANZAHL = 2;

/** Rangliste über alle Auftritte, beste zuerst, höchstens `max` Plätze */
export function rangliste(alle: Bewertungen[], max = 100): Platz[] {
  const summe = new Map<string, { summe: number; anzahl: number }>();
  for (const b of alle) {
    for (const [key, sterne] of Object.entries(b)) {
      if (!(sterne >= 1 && sterne <= 5)) continue;
      const s = summe.get(key) ?? { summe: 0, anzahl: 0 };
      s.summe += sterne;
      s.anzahl++;
      summe.set(key, s);
    }
  }
  return [...summe]
    .map(([key, s]) => {
      const [title, artist = ''] = key.split('|');
      return {
        title,
        artist,
        schnitt: s.summe / s.anzahl,
        anzahl: s.anzahl,
        wert: (s.summe + PRIOR_STERNE * PRIOR_ANZAHL) / (s.anzahl + PRIOR_ANZAHL),
      };
    })
    .sort((a, b) => b.wert - a.wert || b.anzahl - a.anzahl || a.title.localeCompare(b.title, 'de'))
    .slice(0, max);
}

/** Alle gespeicherten Sterne dieses Geräts, je Auftritt (`behalten` filtert z. B. gelöschte Auftritte heraus) */
export function alleBewertungen(behalten: (show: string) => boolean = () => true): Bewertungen[] {
  const alle: Bewertungen[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(BEWERTUNG_PREFIX) || !behalten(key.slice(BEWERTUNG_PREFIX.length))) continue;
      alle.push(JSON.parse(localStorage.getItem(key) ?? '{}') as Bewertungen);
    }
  } catch {
    // kein Zugriff auf localStorage – dann eben ohne Sterne
  }
  return alle;
}
