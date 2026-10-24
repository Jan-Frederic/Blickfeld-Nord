import { Kandidat, adventszeit, vorschlagen } from './setlist-vorschlag';

const s = (title: string, extra: Partial<Kandidat> = {}): Kandidat => ({ title, artist: 'X', dauer: 240, ...extra });

describe('vorschlagen', () => {
  it('füllt die Sets bis zur gewünschten Länge und trennt sie mit Pausen', () => {
    const liste = vorschlagen(Array.from({ length: 30 }, (_, i) => s(`S${i}`)), 2, 20);
    expect(liste.filter((e) => 'pause' in e).length).toBe(1);
    // 20 min = 1200 s → 5 Songs à 4 min je Set
    expect(liste.filter((e) => 'title' in e).length).toBe(10);
  });

  it('nimmt die besten Songs, den besten ans Ende und den zweitbesten an den Anfang', () => {
    const liste = vorschlagen([s('Mies', { wert: 1.5 }), s('Top', { wert: 4.8 }), s('Gut', { wert: 4.2 }), s('Ok', { wert: 3.5 }), s('Neu')], 1, 16);
    expect(liste.map((e) => ('title' in e ? e.title : '–'))).toEqual(['Gut', 'Ok', 'Neu', 'Top']);
  });

  it('ohne Sterne zählen die häufig gespielten Songs zuerst', () => {
    const liste = vorschlagen([s('Selten', { gespielt: 1 }), s('Oft', { gespielt: 5 })], 1, 4);
    expect(liste).toEqual([{ title: 'Oft', artist: 'X' }]);
  });

  it('vermeidet zwei langsame Songs hintereinander', () => {
    const liste = vorschlagen(
      [s('A', { wert: 5 }), s('B', { wert: 4.9, bpm: 80 }), s('C', { wert: 4.8, bpm: 70 }), s('D', { wert: 4.7, bpm: 130 }), s('E', { wert: 4.6, bpm: 120 })],
      1,
      20,
    );
    expect(liste.map((e) => ('title' in e ? e.title : ''))).toEqual(['B', 'D', 'C', 'E', 'A']);
  });

  it('schlägt Weihnachtslieder nur in der Adventszeit vor – dann weit vorne', () => {
    const songs = [s('A', { wert: 4.8 }), s('B', { wert: 4 }), s('In der Weihnachtsbäckerei'), s('C', { wert: 3.5 })];
    const titel = (datum?: string) => vorschlagen(songs, 1, 16, datum).map((e) => ('title' in e ? e.title : ''));
    expect(titel('2026-06-20')).not.toContain('In der Weihnachtsbäckerei');
    expect(titel('2026-12-04')[0]).toBe('In der Weihnachtsbäckerei');
    expect(titel()).toContain('In der Weihnachtsbäckerei');
    expect(adventszeit('2026-11-14')).toBe(false);
    expect(adventszeit('2026-12-26')).toBe(true);
  });
});
