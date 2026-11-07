import { FESTE_SAMMLUNGEN, alleSammlungen, anhaengen, verschieben } from './sammlungen';
import type { Entry } from './setlist-data';

const s = (title: string): Entry => ({ title, artist: 'X' });

describe('Sammlungen', () => {
  it('hängt an, ohne Songs doppelt zu nehmen; Pausen nicht an den Rand', () => {
    const r = anhaengen([s('A'), s('B')], [{ pause: true }, s('B'), s('C'), { pause: true }, { pause: true }, s('D'), { pause: true }]);
    expect(r.entries).toEqual([s('A'), s('B'), { pause: true }, s('C'), { pause: true }, s('D')]);
    expect(r).toMatchObject({ neu: 2, doppelt: 1 });
    expect(anhaengen([], [{ pause: true }, s('A')]).entries).toEqual([s('A')]);
  });

  it('Wunsch und Notiz des Auftritts kommen nicht mit', () => {
    expect(anhaengen([], [{ title: 'A', artist: 'X', wunsch: 'Tom', notiz: 'laut' }]).entries).toEqual([s('A')]);
  });

  it('eine bearbeitete feste Sammlung ersetzt die feste, bleibt aber als fest markiert', () => {
    const eigen = [{ name: 'Weihnachtslieder', entries: [s('A')], saved: '' }, { name: 'Kneipe', entries: [], saved: '' }];
    const alle = alleSammlungen(eigen, FESTE_SAMMLUNGEN);
    expect(alle.map((x) => x.name)).toEqual(['Kneipe', 'Weihnachtslieder']);
    expect(alle[1]).toMatchObject({ fest: true, entries: [s('A')] });
    expect(alleSammlungen([], FESTE_SAMMLUNGEN)[0].entries.length).toBe(3);
  });

  it('verschiebt über Pausen hinweg', () => {
    expect(verschieben([s('A'), { pause: true }, s('B')], 'B|X', -1)).toEqual([s('B'), { pause: true }, s('A')]);
    expect(verschieben([s('A'), s('B')], 'A|X', -1)).toEqual([s('A'), s('B')]);
  });
});
