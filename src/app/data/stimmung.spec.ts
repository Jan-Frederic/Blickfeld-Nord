import { tonVon, tonhoehe } from './stimmung';

const sinus = (hz: number, rate = 44100, n = 4096) => Float32Array.from({ length: n }, (_, i) => 0.5 * Math.sin((2 * Math.PI * hz * i) / rate) + 0.2 * Math.sin((4 * Math.PI * hz * i) / rate));

describe('Stimmgerät', () => {
  it('erkennt die Tonhöhe von Gitarren- und Basssaiten', () => {
    for (const hz of [41.2, 82.41, 110, 196, 329.63]) {
      const f = tonhoehe(sinus(hz, 44100, 8192), 44100)!;
      expect(Math.abs(f - hz) / hz).toBeLessThan(0.005);
    }
    expect(tonhoehe(new Float32Array(4096), 44100)).toBeNull();
  });

  it('benennt den nächsten Ton mit Abweichung in Cent', () => {
    expect(tonVon(440)).toEqual({ name: 'A', oktave: 4, cent: 0, ziel: 440 });
    expect(tonVon(82.41)).toMatchObject({ name: 'E', oktave: 2, cent: 0 });
    expect(tonVon(246.94)).toMatchObject({ name: 'H', oktave: 3 });
    expect(tonVon(445).cent).toBe(20);
    expect(tonVon(116.54)).toMatchObject({ name: 'B', oktave: 2 });
  });
});
