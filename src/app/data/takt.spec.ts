import { einzaehlFolge, einzaehlText, einzaehlUnterteilung, schlaegeJeTakt, taktHinweis } from './takt';

describe('Taktart', () => {
  it('zählt Grundschläge je Takt', () => {
    expect(schlaegeJeTakt()).toBe(4);
    expect(schlaegeJeTakt('3/4')).toBe(3);
    expect(schlaegeJeTakt('6/8')).toBe(2);
    expect(schlaegeJeTakt('12/8')).toBe(4);
    expect(schlaegeJeTakt('7/8')).toBe(7);
    expect(schlaegeJeTakt('quatsch')).toBe(4);
  });

  it('zählt im 3/4-Takt zwei Takte ein, im 4/4-Takt einen', () => {
    expect(einzaehlFolge('3/4')).toEqual([1, 2, 3, 1, 2, 3]);
    expect(einzaehlFolge(undefined)).toEqual([1, 2, 3, 4]);
    expect(einzaehlFolge('6/8')).toEqual([1, 2, 3, 4, 5, 6]);
    expect(einzaehlUnterteilung('6/8')).toBe(3);
    expect(einzaehlUnterteilung('7/8')).toBe(1);
    expect(einzaehlUnterteilung('3/4')).toBe(1);
    expect(einzaehlText('6/8')).toBe('1-2-3-4-5-6');
    expect(einzaehlText('3/4')).toBe('1-2-3 · 1-2-3');
    expect(einzaehlText('4/4')).toBe('1-2-3-4');
    expect(einzaehlText('5/4')).toBe('1-2-3-4-5');
  });

  it('zeigt nur abweichende Taktarten an', () => {
    expect(taktHinweis('4/4')).toBe('');
    expect(taktHinweis(undefined)).toBe('');
    expect(taktHinweis('3/4')).toBe('3/4');
  });
});
