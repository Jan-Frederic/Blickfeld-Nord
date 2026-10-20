import { BandService } from './band.service';
import { UEBERSETZUNGEN } from './uebersetzungen';
import { inhaltsTexte } from '../content';

// Prüft die Übersetzungstabelle. Fehlende Übersetzungen sind erlaubt (die Seite zeigt dann das deutsche
// Original mit Hinweis) – sie werden nur gemeldet, damit neue Inhalte nicht den Deploy blockieren.
describe('Übersetzungen', () => {
  it('sind vollständig ausgefüllt und eindeutig', () => {
    const seen = new Set<string>();
    for (const u of UEBERSETZUNGEN) {
      expect(u.de.trim(), 'leerer deutscher Text').not.toBe('');
      expect(u.en.trim(), `keine englische Übersetzung für „${u.de}“`).not.toBe('');
      expect(u.nl.trim(), `keine niederländische Übersetzung für „${u.de}“`).not.toBe('');
      expect(seen.has(u.de), `doppelter Eintrag „${u.de}“`).toBe(false);
      seen.add(u.de);
    }
  });

  it('melden Inhalte ohne Übersetzung', () => {
    const known = new Set(UEBERSETZUNGEN.map((u) => u.de));
    const missing = inhaltsTexte(new BandService()).filter((t) => !known.has(t));
    if (missing.length) console.warn(`${missing.length} Inhaltstext(e) noch ohne Übersetzung:\n- ${missing.join('\n- ')}`);
    expect(Array.isArray(missing)).toBe(true);
  });
});
