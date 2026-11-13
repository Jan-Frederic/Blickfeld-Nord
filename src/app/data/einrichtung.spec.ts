import { geraetVorschlag, nachAnmeldung } from './einrichtung';
import { gleicherOrdner, syncMitOrdner } from '../pages/backstage-einrichtung';

describe('Einrichtung', () => {
  it('erste Anmeldung führt über den Assistenten zum Ziel, danach direkt', () => {
    expect(nachAnmeldung('/backstage/termine', false)).toBe('/backstage/einrichtung?ziel=%2Fbackstage%2Ftermine');
    expect(nachAnmeldung('/backstage/termine', true)).toBe('/backstage/termine');
  });

  it('schlägt einen Gerätenamen vor', () => {
    expect(geraetVorschlag('Fred', 'iPhone')).toBe('Freds iPhone');
    expect(geraetVorschlag('Jens', 'Mac')).toBe('Jens’ Mac');
    expect(geraetVorschlag('', 'Android-Handy')).toBe('Android-Handy');
  });

  it('gewählter Ordner mit den Standards (lokal: Speicher der App) und Vergleich', () => {
    const geteilt = { pfad: 'Sync', wurzel: { drive: 'D', item: 'I', name: 'Blickfeld Nord' } };
    const e = syncMitOrdner(geteilt);
    expect(e).toEqual({ cloud: 'Sync', wurzel: geteilt.wurzel, lokal: 'app', richtung: 'beide', loeschen: true, auto: true, notenAuto: true });
    expect(gleicherOrdner(e, geteilt)).toBe(true);
    expect(gleicherOrdner({ cloud: 'Blickfeld Nord/Sync' }, geteilt)).toBe(false);
    expect(gleicherOrdner({ cloud: 'Blickfeld Nord/Sync' }, { pfad: 'Blickfeld Nord/Sync' })).toBe(true);
    expect(gleicherOrdner({ cloud: '', wurzel: geteilt.wurzel }, { pfad: 'Blickfeld Nord/Sync' })).toBe(false);
  });
});
