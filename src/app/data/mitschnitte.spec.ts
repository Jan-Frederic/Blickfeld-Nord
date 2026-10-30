import { mitschnittAusPfad, mitschnittPfad } from './mitschnitte';

describe('Mitschnitte teilen', () => {
  it('Pfad im Sync-Ordner hin und zurück', () => {
    const m = { id: 'x', song: 'Iris|The Goo Goo Dolls', datum: '2026-11-03T19:42:10.000Z', dauer: 215, daten: new Blob() };
    const pfad = mitschnittPfad(m, 'fred', 'webm');
    expect(pfad).toBe('Mitschnitte/Iris - The Goo Goo Dolls/2026-11-03-19-42 fred 215s.webm');
    expect(mitschnittAusPfad(pfad)).toEqual({ datum: '2026-11-03T19:42:00Z', von: 'fred', dauer: 215 });
    expect(mitschnittAusPfad('Mitschnitte/x/song.txt')).toBeNull();
  });
});
