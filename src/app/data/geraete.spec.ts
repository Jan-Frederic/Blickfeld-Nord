import { GERAET_NAME_KEY, geraetImFehler, geraetMeldung, geraeteListe, geraetePflege, seitText, standardName } from './geraete';

describe('geraete', () => {
  beforeEach(() => localStorage.clear());

  it('Namensvorschlag aus dem Browser', () => {
    expect(standardName('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('iPhone');
    expect(standardName('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari')).toBe('Android-Handy');
    expect(standardName('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Windows-PC');
  });

  it('meldet höchstens stündlich, bei neuem Namen sofort', () => {
    localStorage.setItem(GERAET_NAME_KEY, 'Freds Handy');
    const t = new Date('2026-11-01T10:00:00Z');
    const m = geraetMeldung('fred', t)!;
    expect(m.pfad).toMatch(/^Geraete\/[0-9a-f-]{8}\.json$/);
    expect(JSON.parse(m.text)).toMatchObject({ name: 'Freds Handy', person: 'fred', zeit: t.toISOString() });
    expect(geraetMeldung('fred', new Date('2026-11-01T10:30:00Z'))).toBeNull();
    localStorage.setItem(GERAET_NAME_KEY, 'Freds Tablet');
    expect(geraetMeldung('fred', new Date('2026-11-01T10:31:00Z'))).not.toBeNull();
    expect(geraetMeldung('fred', new Date('2026-11-01T11:40:00Z'))).not.toBeNull();
  });

  it('Liste: neueste zuerst, Kaputtes fällt weg', () => {
    const l = geraeteListe([
      JSON.stringify({ id: 'a', name: 'Alt', person: 'x', zeit: '2026-10-01T10:00:00Z' }),
      'kaputt',
      JSON.stringify({ id: 'b', name: 'Neu', person: 'y', zeit: '2026-10-30T10:00:00Z' }),
      JSON.stringify({ id: 'c', name: 'ohne Zeit' }),
    ]);
    expect(l.map((g) => g.name)).toEqual(['Neu', 'Alt']);
  });

  it('seitText', () => {
    const jetzt = Date.parse('2026-11-01T12:00:00Z');
    expect(seitText('2026-11-01T11:59:30Z', jetzt)).toBe('gerade eben');
    expect(seitText('2026-11-01T09:00:00Z', jetzt)).toBe('vor 3 Std.');
    expect(seitText('2026-10-31T12:00:00Z', jetzt)).toBe('gestern');
    expect(seitText('2026-10-27T12:00:00Z', jetzt)).toBe('vor 5 Tagen');
  });

  it('nennt in Fehlermeldungen den Namen des Geräts zur Kennung', () => {
    const geraete = [{ id: 'dd2a1f3a', name: 'Edge-Laptop', person: 'Fred', zeit: '2026-11-12T20:00:00Z' }];
    expect(geraetImFehler('Geraete/dd2a1f3a.json: Herunterladen nicht möglich', geraete)).toBe('Geraete/dd2a1f3a.json (Gerät „Edge-Laptop“, Fred): Herunterladen nicht möglich');
    expect(geraetImFehler('Geraete/ffffffff.json: weg', geraete)).toBe('Geraete/ffffffff.json: weg');
    expect(geraetImFehler('Daten/bn-ueben.json: weg', geraete)).toBe('Daten/bn-ueben.json: weg');
  });
});

describe('Geräteliste aufräumen', () => {
  const STD = 3600_000;
  const TAG = 24 * STD;
  const jetzt = Date.parse('2026-11-13T12:00:00Z');
  const g = (id: string, tage: number) => ({ id, name: id, person: 'p', zeit: new Date(jetzt - tage * TAG).toISOString() });

  it('nicht lesbar: erst nach drei Abgleichen und einem Tag entfernen', () => {
    let z = geraetePflege([], ['dd2a1f3a'], {}, jetzt - 2 * TAG, 'ich');
    expect(z.entfernen).toEqual([]);
    z = geraetePflege([], ['dd2a1f3a'], z.zaehler, jetzt - TAG, 'ich');
    expect(z.entfernen).toEqual([]);
    z = geraetePflege([], ['dd2a1f3a'], z.zaehler, jetzt, 'ich');
    expect(z.entfernen).toEqual([{ id: 'dd2a1f3a', grund: 'unlesbar' }]);
    // drei schnelle Abgleiche innerhalb einer Stunde reichen nicht
    let s = geraetePflege([], ['x'], {}, jetzt, 'ich');
    s = geraetePflege([], ['x'], s.zaehler, jetzt + STD / 2, 'ich');
    s = geraetePflege([], ['x'], s.zaehler, jetzt + STD, 'ich');
    expect(s.entfernen).toEqual([]);
  });

  it('wieder lesbar: Zähler fällt weg', () => {
    const z = geraetePflege([], [], { dd2a1f3a: { seit: 0, n: 5 } }, jetzt, 'ich');
    expect(z.zaehler).toEqual({});
    expect(z.entfernen).toEqual([]);
  });

  it('ein halbes Jahr nicht abgeglichen: entfernen – nie das eigene Gerät', () => {
    const z = geraetePflege([g('alt', 200), g('neu', 3), g('ich', 400)], ['ich'], { ich: { seit: 0, n: 9 } }, jetzt, 'ich');
    expect(z.entfernen).toEqual([{ id: 'alt', grund: 'veraltet' }]);
  });
});
