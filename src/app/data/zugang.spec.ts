import { PRUEF_TAGE, ZUGANG_KEY, ladeZugang, zielAusUrl, zugangMerken, zugangStand, zugangZiel } from './zugang';

const band = { drive: 'abc', item: 'ORDNER1' };
const jetzt = Date.parse('2026-11-20T18:00:00Z');
const tag = 864e5;

describe('zugang', () => {
  beforeEach(() => localStorage.clear());

  it('ohne Band-Ordner keine Sperre', () => {
    expect(zugangStand(null, null, jetzt, true)).toBe('frei');
  });

  it('neues Gerät bzw. anderer Ordner → anmelden', () => {
    expect(zugangStand(band, null, jetzt, true)).toBe('anmelden');
    expect(zugangStand(band, { ordner: 'ANDERER', zeit: jetzt }, jetzt, true)).toBe('anmelden');
  });

  it('einmal reingelassen: offen, auch ohne Netz; nach 30 Tagen mit Netz neu prüfen', () => {
    const vorKurzem = { ordner: 'ORDNER1', zeit: jetzt - 2 * tag };
    const alt = { ordner: 'ORDNER1', zeit: jetzt - PRUEF_TAGE * tag };
    expect(zugangStand(band, vorKurzem, jetzt, true)).toBe('ok');
    expect(zugangStand(band, alt, jetzt, true)).toBe('ok-pruefen');
    expect(zugangStand(band, alt, jetzt, false)).toBe('ok');
  });

  it('merken und vergessen', () => {
    zugangMerken(band, jetzt);
    expect(ladeZugang()).toEqual({ ordner: 'ORDNER1', zeit: jetzt });
    zugangMerken(null);
    expect(localStorage.getItem(ZUGANG_KEY)).toBeNull();
    localStorage.setItem(ZUGANG_KEY, '{kaputt');
    expect(ladeZugang()).toBeNull();
  });

  it('Ziel nach der Anmeldung: nur Backstage-Seiten', () => {
    expect(zugangZiel('/backstage/probe/2026-11-20')).toBe('/backstage/probe/2026-11-20');
    expect(zugangZiel('/backstage')).toBe('/backstage');
    expect(zugangZiel('https://example.com')).toBe('/backstage');
    expect(zugangZiel('//example.com/backstage')).toBe('/backstage');
    expect(zugangZiel('/backstage/zugang')).toBe('/backstage');
    expect(zugangZiel(undefined)).toBe('/backstage');
  });

  it('Ziel aus der Backstage-Shell (Direktaufruf einer Unterseite)', () => {
    expect(zielAusUrl('/backstage?auftritt=termine')).toBe('/backstage/termine');
    expect(zielAusUrl('/backstage/?auftritt=probe&teil=2026-11-20')).toBe('/backstage/probe/2026-11-20');
    expect(zielAusUrl('/backstage/zahlen')).toBe('/backstage/zahlen');
    expect(zielAusUrl('/backstage?auftritt=<script>')).toBe('/backstage');
  });
});
