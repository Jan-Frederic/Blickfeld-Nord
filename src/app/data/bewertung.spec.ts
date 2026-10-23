import { bewerten, rangliste } from './bewertung';

describe('bewerten', () => {
  it('setzt, ändert und nimmt eine Bewertung mit derselben Zahl zurück', () => {
    const a = bewerten({}, 'A|X', 4);
    expect(a).toEqual({ 'A|X': 4 });
    expect(bewerten(a, 'A|X', 5)).toEqual({ 'A|X': 5 });
    expect(bewerten(a, 'A|X', 4)).toEqual({});
    expect(bewerten(a, 'B|Y', 0)).toEqual({ 'A|X': 4 });
  });
});

describe('rangliste', () => {
  it('sortiert nach Schnitt, gedämpft durch die Anzahl der Bewertungen', () => {
    const r = rangliste([
      { 'Einmal|A': 5, 'Oft|B': 5, 'Mies|C': 1 },
      { 'Oft|B': 5, 'Mies|C': 2 },
      { 'Oft|B': 4, 'Mittel|D': 3 },
    ]);
    expect(r.map((p) => p.title)).toEqual(['Oft', 'Einmal', 'Mittel', 'Mies']);
    expect(r[0]).toEqual(expect.objectContaining({ artist: 'B', anzahl: 3 }));
    expect(r[0].schnitt).toBeCloseTo(14 / 3);
  });

  it('ignoriert ungültige Werte und begrenzt auf max Plätze', () => {
    const viele = Object.fromEntries(Array.from({ length: 120 }, (_, i) => [`S${i}|X`, (i % 5) + 1]));
    expect(rangliste([viele]).length).toBe(100);
    expect(rangliste([{ 'A|X': 9, 'B|Y': 0 }])).toEqual([]);
  });
});
