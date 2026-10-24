import { bandjahr } from './bandjahr';

describe('bandjahr', () => {
  it('zählt Auftritte, Proben, Orte und Songs eines Jahres', () => {
    const j = bandjahr(
      2026,
      '2026-12-31',
      [
        { id: 'a', date: '2026-03-01', venue: 'Café', city: 'X', confirmed: true },
        { id: 'b', date: '2026-05-01', venue: 'Café', city: 'X', confirmed: true, private: true },
        { id: 'c', date: '2025-05-01', venue: 'Alt', confirmed: true },
        { id: 'd', date: '2026-06-01', venue: 'Offen', confirmed: false },
      ],
      [{ date: '2026-02-01' }, { date: '2025-02-01' }],
      new Map([
        ['a', [{ title: 'A', artist: 'X' }, { pause: true }, { title: 'B', artist: 'Y' }]],
        ['b', [{ title: 'A', artist: 'X' }]],
      ]),
      new Map([['a', { 'B|Y': 5, 'A|X': 3 }]]),
    );
    expect(j).toEqual(
      expect.objectContaining({ auftritte: 2, oeffentlich: 1, proben: 1, orte: 1, songsGespielt: 3, verschiedeneSongs: 2 }),
    );
    expect(j.meistgespielt).toEqual({ title: 'A', artist: 'X', mal: 2 });
    expect(j.bestbewertet?.title).toBe('B');
  });
});
