import { historieText, songHistorie } from './song-historie';

describe('Song-Historie', () => {
  const iris = { title: 'Iris', artist: 'The Goo Goo Dolls' };
  const angels = { title: 'Angels', artist: 'Robbie Williams' };
  const h = songHistorie(
    [
      { tag: '2025-05-01', setlist: [iris, { pause: true }, iris] },
      { tag: '2025-12-04', setlist: [iris, angels] },
      { tag: '2026-12-04', setlist: [angels] },
    ],
    '2026-10-28',
  );

  it('zählt vergangene Auftritte je Song einmal und merkt den letzten', () => {
    expect(h.get('Iris|The Goo Goo Dolls')).toEqual({ gespielt: 2, zuletzt: '2025-12-04', geplant: false });
    expect(h.get('Angels|Robbie Williams')).toEqual({ gespielt: 1, zuletzt: '2025-12-04', geplant: true });
  });

  it('beschreibt die Historie', () => {
    expect(historieText(h.get('Angels|Robbie Williams'))).toBe('1× gespielt, zuletzt 04.12.2025 · geplant');
    expect(historieText(undefined)).toBe('noch nie gespielt');
  });
});
