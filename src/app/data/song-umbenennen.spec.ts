import { wertUmbenennen } from './song-umbenennen';

describe('song-umbenennen', () => {
  it('ersetzt Einträge und Schlüssel, anderes bleibt', () => {
    const alt = { title: 'Br ker - Lied', artist: '' };
    const neu = { title: 'Lied', artist: 'Brüker' };
    const wert = { entries: [{ title: 'Br ker - Lied', artist: '', notiz: 'x' }, { title: 'Iris', artist: 'Goo Goo Dolls' }], 'Br ker - Lied|': { bpm: 90 }, songs: ['Br ker - Lied|'] };
    expect(wertUmbenennen(wert, alt, neu)).toEqual({
      entries: [{ title: 'Lied', artist: 'Brüker', notiz: 'x' }, { title: 'Iris', artist: 'Goo Goo Dolls' }],
      'Lied|Brüker': { bpm: 90 },
      songs: ['Lied|Brüker'],
    });
  });
});
