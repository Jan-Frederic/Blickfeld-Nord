import { bogenAbweichung, kurve, spannungsbogen } from './set-bogen';

const S = (title: string) => ({ title, artist: 'X' });
const BPM: Record<string, number> = { a: 70, b: 90, c: 110, d: 130, e: 150, f: 80 };
const bpm = (s: { title: string }) => BPM[s.title];
const tonart = () => 'C';

describe('spannungsbogen', () => {
  it('Kurve: schwungvoll, Tal, Höhepunkt am Ende', () => {
    expect(kurve(0)).toBeGreaterThan(kurve(0.6));
    expect(kurve(1)).toBe(1);
  });

  it('schnellster Song zum Schluss, Pausen und Sets bleiben', () => {
    const vorher = [S('e'), S('a'), S('d'), S('f'), { pause: true as const }, S('c'), S('b'), S('a')];
    const neu = spannungsbogen(vorher, bpm, tonart);
    expect(neu).toHaveLength(vorher.length);
    expect(neu[4]).toEqual({ pause: true });
    expect((neu[3] as { title: string }).title).toBe('e');
    expect(new Set(neu.slice(0, 4).map((e) => (e as { title: string }).title))).toEqual(new Set(['a', 'd', 'e', 'f']));
    expect((neu[7] as { title: string }).title).toBe('c');
    expect(bogenAbweichung(neu, bpm)).toBeLessThanOrEqual(bogenAbweichung(vorher, bpm));
  });

  it('kurze Sets und Sets ohne Tempo bleiben unverändert', () => {
    const kurz = [S('a'), S('b')];
    expect(spannungsbogen(kurz, bpm, tonart)).toEqual(kurz);
    const ohne = [S('x'), S('y'), S('z')];
    expect(spannungsbogen(ohne, bpm, tonart)).toEqual(ohne);
  });
});
