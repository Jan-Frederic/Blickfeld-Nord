import { STANDARD_TASTEN, tastenLesen } from './buehne-einstellungen';

describe('Tasten im Bühnen-Modus', () => {
  it('ohne eigene Belegung: Standard mit ↑/↓ für hoch und runter', () => {
    expect(tastenLesen(null)).toEqual(STANDARD_TASTEN);
    expect(STANDARD_TASTEN.hoch).toEqual(['ArrowUp']);
    expect(STANDARD_TASTEN.runter).toEqual(['ArrowDown']);
    expect([...STANDARD_TASTEN.weiter, ...STANDARD_TASTEN.zurueck]).not.toContain('ArrowDown');
  });
  it('ältere Belegung ohne hoch/runter: ↑/↓ wandern dorthin, eigene Tasten bleiben', () => {
    expect(tastenLesen({ weiter: ['ArrowDown', 'b'], zurueck: ['ArrowUp', 'a'] })).toEqual({ weiter: ['b'], zurueck: ['a'], hoch: ['ArrowUp'], runter: ['ArrowDown'] });
  });
  it('neue Belegung bleibt, wie sie ist – auch ohne Taste für hoch', () => {
    expect(tastenLesen({ weiter: ['b'], zurueck: ['a'], hoch: [], runter: ['ArrowDown'] })).toEqual({ weiter: ['b'], zurueck: ['a'], hoch: [], runter: ['ArrowDown'] });
  });
});
