import { offeneMerkpunkte, punkteAusText } from './nachbereitung';

describe('nachbereitung', () => {
  it('macht aus Zeilen Merkpunkte und entfernt Aufzählungszeichen', () => {
    expect(punkteAusText('- Kabel für Keys kaufen\n\n2) Ansage vor Hey Jude üben\n• Monitor lauter ')).toEqual([
      'Kabel für Keys kaufen',
      'Ansage vor Hey Jude üben',
      'Monitor lauter',
    ]);
  });

  it('listet nur offene Punkte, neueste Auftritte zuerst, mit ihrer Position', () => {
    const offen = offeneMerkpunkte([
      { show: '2026-08-22', n: { gut: '', schief: '', punkte: [{ text: 'alt' }] } },
      { show: '2026-12-04', n: { gut: '', schief: '', punkte: [{ text: 'fertig', erledigt: true }, { text: 'neu' }] } },
    ]);
    expect(offen).toEqual([
      { show: '2026-12-04', index: 1, text: 'neu' },
      { show: '2026-08-22', index: 0, text: 'alt' },
    ]);
  });
});
