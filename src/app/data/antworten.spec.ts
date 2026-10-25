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

describe('antwort – Sprachen', () => {
  it('Englisch mit englischen Links', () => {
    const t = antwort('zusage', { name: 'Tom', datum: '2027-06-12' }, 'en');
    expect(t).toContain('Hi Tom,');
    expect(t).toContain('on Saturday, 12/06/2027');
    expect(t).toContain('https://blickfeld-nord.de/en/technik');
  });
  it('Niederländisch mit niederländischen Links', () => {
    const t = antwort('absage', { name: 'Sanne' }, 'nl');
    expect(t).toContain('Hallo Sanne,');
    expect(t).toContain('al geboekt');
    expect(t).toContain('https://blickfeld-nord.de/nl/booking#verfuegbarkeit');
  });
});
