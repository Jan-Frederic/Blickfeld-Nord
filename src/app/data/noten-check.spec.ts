import { notenCheck, zusammenfuehren } from './noten-check';

const d = (id: string, name: string, groesse = 100, hinzugefuegt = '2026-01-0' + id.length) => ({ id, name, groesse, hinzugefuegt });

describe('noten-check', () => {
  const dateien = [d('a', 'Iris.pdf'), d('bb', 'iris.pdf'), d('c', 'Africa.pdf', 200), d('dddd', 'Los.pdf', 50)];
  const songs = {
    'Iris|Goo Goo Dolls': { pdfs: [{ datei: 'bb', name: 'Bass' }] },
    'Iris (Live)|Goo Goo Dolls': { pdfs: [{ datei: 'a' }, { datei: 'bb' }] },
    'Africa|Toto': { pdfs: [{ datei: 'c' }] },
  };

  it('findet doppelte und Dateien ohne Song', () => {
    const c = notenCheck(dateien, songs);
    expect(c.ohneSong.map((x) => x.id)).toEqual(['dddd']);
    expect(c.doppelt.length).toBe(1);
    // bb hat zwei Verweise → bleibt
    expect(c.doppelt[0].behalten.id).toBe('bb');
    expect(c.doppelt[0].weitere.map((x) => x.id)).toEqual(['a']);
    expect(c.doppelt[0].songs).toEqual(['Iris (Live)|Goo Goo Dolls', 'Iris|Goo Goo Dolls']);
  });

  it('gleicher Name, andere Größe ist nicht doppelt', () => {
    expect(notenCheck([d('a', 'X.pdf', 1), d('b', 'X.pdf', 2)], {}).doppelt).toEqual([]);
  });

  it('zusammenführen: Verweise umbiegen, doppelte Einträge fallen weg', () => {
    const g = notenCheck(dateien, songs).doppelt[0];
    const neu = zusammenfuehren(songs, g);
    expect(Object.keys(neu)).toEqual(['Iris (Live)|Goo Goo Dolls']);
    expect(neu['Iris (Live)|Goo Goo Dolls'].pdfs).toEqual([{ datei: 'bb' }]);
  });
});
