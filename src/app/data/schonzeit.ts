// Schonzeit der Band: Sobald ein Auftritt geklärt ist, sind die Woche des Auftritts und die drei vollen Wochen
// (Montag bis Sonntag) davor und danach für weitere Auftritte reserviert – zusammen sieben Wochen am Stück. Bestehende Auftritte bleiben,
// auch wenn sie in die Schonzeit eines anderen fallen. Proben sind nicht betroffen (Sperren für „Band“ gelten nur für
// Auftritte). Ohne Angular-Abhängigkeiten.
import type { Abwesenheit, Show } from './band.service';

export const SCHONZEIT_WOCHEN = 3;
export const SCHONZEIT_GRUND = 'Schonzeit';

const tag = (iso: string) => new Date(`${iso}T12:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const plus = (d: Date, tage: number) => new Date(d.getTime() + tage * 864e5);
/** Montag der Woche eines Datums */
export const montag = (datum: string) => {
  const d = tag(datum);
  return plus(d, -((d.getUTCDay() + 6) % 7));
};

/** Schonzeiten aller geklärten Auftritte als Sperren der ganzen Band */
export function schonzeiten(shows: Pick<Show, 'date' | 'endDate' | 'confirmed'>[], wochen = SCHONZEIT_WOCHEN): Abwesenheit[] {
  return shows
    .filter((s) => s.confirmed)
    .map((s) => ({
      wer: 'Band',
      von: iso(plus(montag(s.date), -7 * wochen)),
      bis: iso(plus(montag(s.endDate ?? s.date), 7 * (wochen + 1) - 1)),
      grund: SCHONZEIT_GRUND,
    }));
}

/** liegt ein Datum in einer Sperre? (Auftrittstage selbst zählen nicht – bestehende Auftritte bleiben) */
export function gesperrt(datum: string, sperren: Abwesenheit[]): Abwesenheit[] {
  return sperren.filter((a) => a.von <= datum && datum <= (a.bis ?? a.von));
}

/**
 * Ist ein Monat (JJJJ-MM) komplett gesperrt – kein Tag mehr frei für einen Auftritt (Schonzeit, Abwesenheit der
 * ganzen Band oder schon ein Auftritt)? Liefert die Gründe (z. B. ['Schonzeit', 'privat verhindert']) oder null.
 * Abwesenheiten einzelner Musiker zählen nicht – an solchen Tagen ist ein Auftritt notfalls möglich.
 */
export function monatGesperrt(jm: string, sperren: Abwesenheit[], shows: Pick<Show, 'date' | 'endDate'>[]): string[] | null {
  const [j, m] = jm.split('-').map(Number);
  const tage = new Date(Date.UTC(j, m, 0)).getUTCDate();
  const gruende = new Set<string>();
  for (let t = 1; t <= tage; t++) {
    const d = `${jm}-${String(t).padStart(2, '0')}`;
    if (shows.some((s) => s.date <= d && d <= (s.endDate ?? s.date))) {
      gruende.add('Auftritt');
      continue;
    }
    const treffer = sperren.filter((a) => a.wer === 'Band' && a.von <= d && d <= (a.bis ?? a.von));
    if (!treffer.length) return null;
    // Schonzeit zuerst nennen, sonst den eingetragenen Grund
    gruende.add(treffer.some((a) => a.grund === SCHONZEIT_GRUND) ? SCHONZEIT_GRUND : (treffer[0].grund ?? 'Band verhindert'));
  }
  gruende.delete('Auftritt');
  return [...gruende];
}
