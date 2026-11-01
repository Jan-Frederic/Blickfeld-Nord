import { TapTempo } from './tap-tempo';

describe('TapTempo', () => {
  it('ab dem 4. Tippen 120 bpm, Pause beginnt neu', () => {
    const t = new TapTempo();
    expect([0, 500, 1000].map((z) => t.tippen(z))).toEqual([null, null, null]);
    expect(t.tippen(1500)).toBe(120);
    expect(t.tippen(5000)).toBeNull();
    expect(t.zahl).toBe(1);
  });
});
