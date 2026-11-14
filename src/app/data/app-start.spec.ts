import { alsAppGestartet, istBandmitglied, startZiel, StartLage } from './app-start';

const band = { drive: 'D', item: 'D!1' };
const jetzt = Date.parse('2026-11-14T10:00:00Z');
const basis: StartLage = { pfad: '/', suche: '?app=1', imAppFenster: false, band, zugang: { ordner: 'D!1', zeit: jetzt - 864e5 }, konto: true, jetzt, online: true };

describe('App-Start im Backstage', () => {
  it('erkennt den Start als App (Manifest-Adresse oder Startseite im App-Fenster)', () => {
    expect(alsAppGestartet({ pfad: '/', suche: '?app=1', imAppFenster: false })).toBe(true);
    expect(alsAppGestartet({ pfad: '/', suche: '', imAppFenster: true })).toBe(true);
    expect(alsAppGestartet({ pfad: '/', suche: '', imAppFenster: false })).toBe(false);
    // gezielt geöffnete Seiten bleiben, auch in der App
    expect(alsAppGestartet({ pfad: '/konzerte/', suche: '?app=1', imAppFenster: true })).toBe(false);
    expect(alsAppGestartet({ pfad: '/en/', suche: '', imAppFenster: true })).toBe(false);
  });

  it('Bandmitglied: Zugang zum Band-Ordner gemerkt; ohne Sperre reicht die Microsoft-Anmeldung', () => {
    expect(istBandmitglied(basis)).toBe(true);
    expect(istBandmitglied({ ...basis, zugang: null })).toBe(false);
    expect(istBandmitglied({ ...basis, zugang: { ordner: 'anderer', zeit: jetzt } })).toBe(false);
    // nach 30 Tagen wird im Backstage neu geprüft – starten darf es trotzdem dort
    expect(istBandmitglied({ ...basis, zugang: { ordner: 'D!1', zeit: jetzt - 40 * 864e5 } })).toBe(true);
    expect(istBandmitglied({ ...basis, band: null, zugang: null, konto: true })).toBe(true);
    expect(istBandmitglied({ ...basis, band: null, zugang: null, konto: false })).toBe(false);
  });

  it('Ziel: Backstage für die Band, sonst die Startseite ohne ?app=1', () => {
    expect(startZiel(basis)).toBe('/backstage/');
    expect(startZiel({ ...basis, imAppFenster: true, suche: '' })).toBe('/backstage/');
    expect(startZiel({ ...basis, zugang: null })).toBe('/');
    expect(startZiel({ ...basis, zugang: null, suche: '?app=1&utm_source=x' })).toBe('/?utm_source=x');
    expect(startZiel({ ...basis, zugang: null, imAppFenster: true, suche: '' })).toBe(null);
    expect(startZiel({ ...basis, pfad: '/booking/' })).toBe(null);
  });
});
