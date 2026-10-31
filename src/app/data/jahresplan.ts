import type { Abwesenheit, Rehearsal, Show } from './band.service';

// Jahresplanung (Backstage → Termine → Saison): je Monat Auftritte, Proben und Abwesenheiten – auf der Seite und als
// Ausdruck für die Bandbesprechung. Ohne Angular-Abhängigkeiten (Tests in jahresplan.spec.ts).
export type PlanArt = 'auftritt' | 'probe' | 'weg';

export interface PlanEintrag {
  datum: string;
  bis?: string;
  art: PlanArt;
  text: string;
  info?: string;
  offen?: boolean;
  privat?: boolean;
  /** Backstage-Link (Auftritt bzw. Probe) */
  link?: string;
}

export interface PlanMonat {
  monat: string;
  eintraege: PlanEintrag[];
}

const monatPlus = (jm: string, n: number) => {
  const [j, m] = jm.split('-').map(Number);
  return new Date(Date.UTC(j, m - 1 + n, 1)).toISOString().slice(0, 7);
};
const imMonat = (monat: string, von: string, bis = von) => von.slice(0, 7) <= monat && bis.slice(0, 7) >= monat;

export function jahresplan(
  daten: { shows: Show[]; proben: Rehearsal[]; weg: Abwesenheit[]; showId: (s: Show) => string },
  start: string,
  anzahl = 12,
): PlanMonat[] {
  return Array.from({ length: anzahl }, (_, i) => monatPlus(start.slice(0, 7), i)).map((monat) => ({
    monat,
    eintraege: [
      ...daten.shows
        .filter((s) => imMonat(monat, s.date, s.endDate))
        .map((s): PlanEintrag => ({
          datum: s.date,
          bis: s.endDate,
          art: 'auftritt',
          text: s.private ? s.publicName || s.venue : s.venue,
          info: [s.time && `${s.time} Uhr`, s.city].filter(Boolean).join(' · '),
          offen: !s.confirmed,
          privat: !!s.private,
          link: `/backstage/${daten.showId(s)}`,
        })),
      ...daten.proben
        .filter((p) => imMonat(monat, p.date))
        .map((p): PlanEintrag => ({ datum: p.date, art: 'probe', text: 'Probe', info: [p.time && `${p.time}${p.endTime ? '–' + p.endTime : ''} Uhr`, p.place].filter(Boolean).join(' · '), link: `/backstage/probe/${p.date}` })),
      ...daten.weg
        .filter((a) => imMonat(monat, a.von, a.bis))
        .map((a): PlanEintrag => ({ datum: a.von, bis: a.bis, art: 'weg', text: `${a.wer} nicht da`, info: a.grund })),
    ].sort((a, b) => a.datum.localeCompare(b.datum)),
  }));
}
