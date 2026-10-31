import type { Show } from './band.service';
import { gleicherOrt } from './abwechslung';

// Saisonplanung (Backstage → Termine): die nächsten Monate auf einer Zeitleiste – Auftritte je Monat, freie Monate
// markiert – und Hinweise, wann bei Veranstaltern von vor einem Jahr wieder angefragt werden sollte (drei Monate vor
// dem Jahrestag, solange dort noch nichts Neues geplant ist). Ohne Angular-Abhängigkeiten (Tests in saison.spec.ts).

export interface SaisonMonat {
  /** JJJJ-MM */
  monat: string;
  shows: Show[];
}

const monatPlus = (jm: string, n: number) => {
  const [j, m] = jm.split('-').map(Number);
  const d = new Date(Date.UTC(j, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};

/** die nächsten `anzahl` Monate ab dem aktuellen, je Monat die geklärten und offenen Auftritte */
export function saison(shows: Show[], heute: string, anzahl = 12): SaisonMonat[] {
  const start = heute.slice(0, 7);
  return Array.from({ length: anzahl }, (_, i) => monatPlus(start, i)).map((monat) => ({
    monat,
    shows: shows.filter((s) => s.date.slice(0, 7) === monat || (s.endDate && s.date.slice(0, 7) < monat && s.endDate.slice(0, 7) >= monat)),
  }));
}

export interface AnfrageHinweis {
  show: Show;
  /** Jahrestag des letzten Auftritts dort */
  jahrestag: string;
  /** spätestens anfragen (drei Monate vorher) */
  bis: string;
}

/** Orte, an denen vor (knapp) einem Jahr gespielt wurde und noch nichts Neues geplant ist – fällig ab 4 Monate vorher */
export function wiederAnfragen(shows: Show[], heute: string): AnfrageHinweis[] {
  const plus = (d: string, monate: number) => {
    const x = new Date(`${d}T12:00:00Z`);
    x.setUTCMonth(x.getUTCMonth() + monate);
    return x.toISOString().slice(0, 10);
  };
  const vergangen = shows.filter((s) => s.confirmed && (s.endDate ?? s.date) < heute);
  const out: AnfrageHinweis[] = [];
  for (const s of vergangen) {
    const jahrestag = plus(s.date, 12);
    // nur der letzte Auftritt je Ort, und nur wenn der Jahrestag in den nächsten 4 Monaten liegt
    if (vergangen.some((x) => x !== s && x.date > s.date && gleicherOrt(x, s))) continue;
    if (jahrestag < heute || jahrestag > plus(heute, 4)) continue;
    if (shows.some((x) => x.date >= heute && gleicherOrt(x, s))) continue;
    out.push({ show: s, jahrestag, bis: plus(s.date, 9) });
  }
  return out.sort((a, b) => a.jahrestag.localeCompare(b.jahrestag));
}
