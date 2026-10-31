import { wunschEinfuegen } from './buehne-wunsch';

const s = (t: string) => ({ title: t, artist: 'X' });
const namen = (l: ReturnType<typeof wunschEinfuegen>['liste']) => l.map((e) => ('pause' in e ? 'P' : e.title + ('wunsch' in e ? '♥' : '')));

describe('wunschEinfuegen', () => {
  it('fügt einen neuen Song an der aktuellen Stelle ein', () => {
    const r = wunschEinfuegen([s('A'), s('B'), { pause: true }, s('C')], 1, s('Neu'));
    expect(namen(r.liste)).toEqual(['A', 'Neu♥', 'B', 'P', 'C']);
    expect(r.ziel).toBe(1);
    expect([0, 1, 2, 3].map(r.abbild)).toEqual([0, 2, 3, 4]);
  });

  it('zieht einen späteren Song nach vorn an die aktuelle Stelle', () => {
    const r = wunschEinfuegen([s('A'), s('B'), s('C'), s('D')], 1, s('D'));
    expect(namen(r.liste)).toEqual(['A', 'D♥', 'B', 'C']);
    expect(r.verschoben).toBe(true);
    expect([0, 1, 2, 3].map(r.abbild)).toEqual([0, 2, 3, 1]);
  });

  it('zieht einen schon gespielten Song wieder heran', () => {
    const r = wunschEinfuegen([s('A'), s('B'), s('C')], 2, s('A'));
    expect(namen(r.liste)).toEqual(['B', 'A♥', 'C']);
    expect(r.ziel).toBe(1);
  });

  it('am Ende wird angehängt; der aktuelle Song bleibt, wie er ist', () => {
    expect(namen(wunschEinfuegen([s('A')], 1, s('B')).liste)).toEqual(['A', 'B♥']);
    expect(wunschEinfuegen([s('A')], 0, s('A')).verschoben).toBe(false);
  });
});
