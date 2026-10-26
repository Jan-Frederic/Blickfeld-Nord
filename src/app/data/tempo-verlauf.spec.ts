import { langsameStrecken } from './tempo-verlauf';

describe('langsameStrecken', () => {
  it('findet drei langsame Songs in Folge', () => {
    expect(langsameStrecken([120, 80, 90, 70, 130])).toEqual([{ von: 1, bis: 3 }]);
  });
  it('zwei langsame reichen nicht, Lücken ohne Tempo unterbrechen', () => {
    expect(langsameStrecken([80, 90, 120, 80, undefined, 85, 70])).toEqual([]);
  });
  it('Strecke bis zum Set-Ende', () => {
    expect(langsameStrecken([128, 88, 76, 92, 60])).toEqual([{ von: 1, bis: 4 }]);
  });
});
