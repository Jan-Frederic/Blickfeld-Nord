import { browserVollbild } from './vollbild';

describe('browserVollbild', () => {
  const mit = (...an: string[]) => (a: string) => an.includes(a);
  it('fordert im Browser-Tab das Vollbild an – am Computer und auf dem Handy', () => {
    expect(browserVollbild(mit(), false)).toBe(true);
    expect(browserVollbild(mit('(pointer: coarse)'), false)).toBe(true);
  });
  it('lässt es in der installierten App auf Handy und Tablet', () => {
    expect(browserVollbild(mit('(display-mode: standalone)', '(pointer: coarse)'), false)).toBe(false);
    expect(browserVollbild(mit('(display-mode: fullscreen)', '(pointer: coarse)'), false)).toBe(false);
    expect(browserVollbild(mit('(pointer: coarse)'), true)).toBe(false);
  });
  it('bleibt in der installierten App am Computer beim Vollbild', () => {
    expect(browserVollbild(mit('(display-mode: standalone)'), false)).toBe(true);
  });
});
