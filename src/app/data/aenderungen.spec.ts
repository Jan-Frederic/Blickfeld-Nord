import { AENDERUNGEN } from './aenderungen';

describe('Change-Log', () => {
  it('je Tag ein Eintrag, neueste zuerst, gültige Daten, nichts leer', () => {
    expect(AENDERUNGEN.length).toBeGreaterThan(0);
    for (let i = 0; i < AENDERUNGEN.length; i++) {
      const a = AENDERUNGEN[i];
      expect(a.datum, a.datum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(a.datum)), a.datum).toBe(false);
      expect(a.punkte.length, a.datum).toBeGreaterThan(0);
      for (const p of a.punkte) expect(p.trim().length, a.datum).toBeGreaterThan(10);
      if (i > 0) expect(a.datum < AENDERUNGEN[i - 1].datum, `${a.datum} nach ${AENDERUNGEN[i - 1].datum}`).toBe(true);
    }
  });
});
