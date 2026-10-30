import { hash, keyAusPfad, konfliktVon, personOrdner, planNachher, planVorher, spiegelArt, spiegelPfad, syncStatusVon } from './spiegel';

describe('Spiegel (Einstellungen ↔ OneDrive)', () => {
  it('teilt Band-Daten, persönliche Einstellungen und Gerätedaten', () => {
    expect(spiegelArt('bn-setlist-2026-12-04')).toBe('band');
    expect(spiegelArt('bn-noten-wahl')).toBe('person');
    expect(spiegelArt('bn-sync-einstellungen')).toBeNull();
    expect(spiegelArt('bn-onedrive-konto')).toBeNull();
    expect(personOrdner('fred.muster@outlook.de')).toBe('fred.muster');
    expect(spiegelPfad('bn-buehne-zoom', 'Fred')).toBe('Einstellungen/Fred/bn-buehne-zoom.json');
    expect(spiegelPfad('bn-vorort-2026-12-04', 'Fred')).toBe('Daten/bn-vorort-2026-12-04.json');
  });

  it('liest nur eigene Dateien, keine anderer Personen und keine Konfliktkopien', () => {
    expect(keyAusPfad('Daten/bn-setlist-x.json', 'Fred')).toBe('bn-setlist-x');
    expect(keyAusPfad('Einstellungen/Fred/bn-buehne-zoom.json', 'Fred')).toBe('bn-buehne-zoom');
    expect(keyAusPfad('Einstellungen/David/bn-buehne-zoom.json', 'Fred')).toBeNull();
    expect(keyAusPfad('Daten/bn-setlist-x (Konflikt Gerät 2026-10-29).json', 'Fred')).toBeNull();
    expect(keyAusPfad('Daten/bn-buehne-zoom.json', 'Fred')).toBeNull();
    expect(keyAusPfad('Sheets/Iris.pdf', 'Fred')).toBeNull();
  });

  it('schreibt nur Geändertes und löscht Entferntes', () => {
    const zustand = { 'Daten/bn-setlist-a.json': { hash: hash('[1]'), version: 'v1' }, 'Daten/bn-setlist-weg.json': { hash: hash('[]'), version: 'v1' } };
    const p = planVorher({ 'bn-setlist-a': '[1]', 'bn-buehne-zoom': '1.2', 'bn-sync-einstellungen': '{}' }, zustand, 'Fred');
    expect(p.schreiben.map((x) => x.pfad)).toEqual(['Einstellungen/Fred/bn-buehne-zoom.json']);
    expect(p.loeschen).toEqual(['Daten/bn-setlist-weg.json']);
  });

  it('übernimmt neue und geänderte Dateien, entfernt verschwundene', () => {
    const zustand = { 'Daten/bn-setlist-a.json': { hash: 'x', version: 'v1' }, 'Daten/bn-setlist-weg.json': { hash: 'y', version: 'v1' } };
    const d = (pfad: string, version: string) => ({ pfad, version, groesse: 1, geaendert: '' });
    const p = planNachher([d('Daten/bn-setlist-a.json', 'v1'), d('Daten/bn-probe-2026-11-01.json', 'v7'), d('Einstellungen/David/bn-buehne-zoom.json', 'v2')], zustand, 'Fred');
    expect(p.lesen).toEqual([{ pfad: 'Daten/bn-probe-2026-11-01.json', key: 'bn-probe-2026-11-01', version: 'v7' }]);
    expect(p.entfernen).toEqual([{ pfad: 'Daten/bn-setlist-weg.json', key: 'bn-setlist-weg' }]);
  });

  it('zeigt an, ob ein Eintrag synchron ist', () => {
    const zustand = { 'Daten/bn-setlist-a.json': { hash: hash('[1]'), version: 'v1' } };
    expect(syncStatusVon('bn-setlist-a', '[1]', zustand, 'Fred')).toBe('synchron');
    expect(syncStatusVon('bn-setlist-a', '[1,2]', zustand, 'Fred')).toBe('wartet');
    expect(syncStatusVon('bn-sync-letzter', '{}', zustand, 'Fred')).toBe('lokal');
  });

  it('erkennt Konfliktkopien und ihr Original', () => {
    expect(konfliktVon('Daten/bn-setlist-x (Konflikt Gerät 2026-10-30).json')).toEqual({ original: 'Daten/bn-setlist-x.json', seite: 'Gerät', datum: '2026-10-30' });
    expect(konfliktVon('Daten/bn-setlist-x.json')).toBeNull();
  });
});
