import { geraetVorschlag, nachAnmeldung } from './einrichtung';
import { aufDemWeg, gleicherOrdner, istBandOrdner, syncMitOrdner } from '../pages/backstage-einrichtung';

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

  it('erkennt den Ordner der Band nur am Ende des Pfads – geteilt oder im eigenen OneDrive', () => {
    expect(istBandOrdner('BlickfeldNord (geteilt)/Sync')).toBe(true);
    expect(istBandOrdner('Dokumente/Bands/BlickfeldNord/Sync')).toBe(true);
    expect(istBandOrdner('Blickfeld Nord (geteilt)/Sync')).toBe(true);
    expect(istBandOrdner('Dokumente/Bands/BlickfeldNord')).toBe(false);
    expect(istBandOrdner('BlickfeldNord (geteilt)/Sync/Daten')).toBe(false);
    expect(istBandOrdner('AlteBlickfeldNord/Sync')).toBe(false);
    expect(istBandOrdner('')).toBe(false);
    expect(aufDemWeg('BlickfeldNord (geteilt)')).toBe(true);
    expect(aufDemWeg('Dokumente/Bands/BlickfeldNord')).toBe(true);
    expect(aufDemWeg('Dokumente/Bands')).toBe(false);
  });
});
