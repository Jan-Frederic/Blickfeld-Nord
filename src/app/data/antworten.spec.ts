import { antwort } from './antworten';

describe('antwort', () => {
  it('setzt Name, Anlass und Datum ein', () => {
    const t = antwort('zusage', { name: 'Anna', anlass: 'euer Sommerfest', datum: '2027-06-12', absender: 'Fred' });
    expect(t).toContain('Hallo Anna,');
    expect(t).toContain('für euer Sommerfest am Samstag, 12.06.2027');
    expect(t).toContain('ca. 4 × 3 m');
    expect(t).toContain('Fred von Blickfeld Nord');
  });
  it('lässt Platzhalter, wo Angaben fehlen', () => {
    const t = antwort('absage', {});
    expect(t).toContain('Hallo [Name],');
    expect(t).toContain('vielen Dank für eure Anfrage! Leider');
    expect(t).toContain('/booking#verfuegbarkeit');
  });
});
