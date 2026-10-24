// Öffentlicher Jahresrückblick (/jahr/<Jahr>): Zahlen, Stationen und Highlights eines Bandjahres – nur aus öffentlichen
// Angaben. Private Auftritte erscheinen nur unter ihrem öffentlichen Namen („Private Feier“ ohne publicName) und ohne Ort.
// Die Seite gibt es ab dem 15.12. des Jahres (vorher ist das Jahr noch nicht rum), für frühere Jahre immer.
// Ohne Angular-Abhängigkeiten, damit es auch in Node (Vorrendern, Sitemap) und in Tests läuft.
import type { HistoryEntry, Show } from './band.service';

/** ab diesem Tag (MM-TT) erscheint der Rückblick auf das laufende Jahr */
export const RUECKBLICK_AB = '12-15';

export interface Station {
  date: string;
  name: string;
  city?: string;
  /** Konzertseite (nur öffentliche Auftritte) */
  id?: string;
}

export interface Jahresrueckblick {
  jahr: number;
  auftritte: number;
  oeffentlich: number;
  orte: number;
  proben: number;
  stationen: Station[];
  highlights: HistoryEntry[];
  /** geklärte öffentliche Auftritte im Folgejahr */
  ausblick: number;
}

/** Jahre mit gespielten, geklärten Auftritten, für die es schon einen Rückblick gibt – neueste zuerst */
export function rueckblickJahre(shows: Show[], heute: string): number[] {
  const laufend = +heute.slice(0, 4);
  const fertig = heute.slice(5) >= RUECKBLICK_AB;
  const jahre = new Set(shows.filter((s) => s.confirmed && s.date < heute).map((s) => +s.date.slice(0, 4)));
  return [...jahre].filter((j) => j < laufend || (j === laufend && fertig)).sort((a, b) => b - a);
}

export function jahresrueckblick(
  jahr: number,
  heute: string,
  shows: Show[],
  proben: { date: string }[],
  history: HistoryEntry[],
  showId: (s: Show) => string,
): Jahresrueckblick {
  const imJahr = (d: string) => d.startsWith(`${jahr}-`) && d < heute;
  const gespielt = shows.filter((s) => s.confirmed && imJahr(s.date)).sort((a, b) => a.date.localeCompare(b.date));
  const stationen = gespielt.map(
    (s): Station =>
      s.private ? { date: s.date, name: s.publicName ?? 'Private Feier' } : { date: s.date, name: s.venue, city: s.city, id: showId(s) },
  );
  return {
    jahr,
    auftritte: gespielt.length,
    oeffentlich: gespielt.filter((s) => !s.private).length,
    // Orte: Spielstätten, private Feiern nach ihrem öffentlichen Namen
    orte: new Set(gespielt.map((s) => (s.private ? `privat|${s.publicName ?? s.date}` : `${s.venue}|${s.city ?? ''}`))).size,
    proben: proben.filter((p) => imJahr(p.date)).length,
    stationen,
    highlights: history.filter((h) => !h.example && imJahr(h.date)).sort((a, b) => a.date.localeCompare(b.date)),
    ausblick: shows.filter((s) => s.confirmed && !s.private && s.date.startsWith(`${jahr + 1}-`)).length,
  };
}
