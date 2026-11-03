import { steckbrief } from './song-steckbrief';

describe('song-steckbrief', () => {
  it('alle Werte', () => {
    expect(steckbrief({ title: 'Iris', artist: 'The Goo Goo Dolls' }, { tonart: 'D', spielTonart: 'E', capo: 2, bpm: 76, notiz: 'Intro leise' }, 'https://open.spotify.com/track/x')).toBe(
      '🎵 Iris – The Goo Goo Dolls\nTonart D (wir spielen E) · Capo 2 · 76 bpm\nNotiz: Intro leise\nSpotify: https://open.spotify.com/track/x',
    );
  });
  it('ohne Werte und ohne Link', () => {
    expect(steckbrief({ title: 'Neu', artist: '' }, {}, undefined)).toBe('🎵 Neu\nTonart und Tempo noch offen');
  });
});
