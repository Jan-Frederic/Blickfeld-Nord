import { saison, wiederAnfragen } from './saison';

const show = (date: string, venue: string, extra = {}) => ({ date, venue, city: 'Rhede', confirmed: true, ...extra });

describe('saison', () => {
  it('verteilt Auftritte auf die nächsten Monate, freie Monate bleiben leer', () => {
    const m = saison([show('2026-12-04', 'Weihnachtsmarkt'), show('2027-02-19', 'Café Nenna')], '2026-11-15', 4);
    expect(m.map((x) => `${x.monat}:${x.shows.length}`)).toEqual(['2026-11:0', '2026-12:1', '2027-01:0', '2027-02:1']);
  });

  it('schlägt Orte von vor einem Jahr zum erneuten Anfragen vor – nicht, wenn dort schon wieder etwas geplant ist', () => {
    const shows = [show('2026-01-16', 'Lauftreff'), show('2026-02-10', 'Café Nenna'), show('2027-02-19', 'Café Nenna'), show('2025-06-01', 'Alt')];
    const h = wiederAnfragen(shows, '2026-11-01');
    expect(h.map((x) => `${x.show.venue} ${x.jahrestag} bis ${x.bis}`)).toEqual(['Lauftreff 2027-01-16 bis 2026-10-16']);
  });
});
