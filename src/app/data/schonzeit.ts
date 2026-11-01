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
