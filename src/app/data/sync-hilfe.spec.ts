import { KNOPF_HILFE, wasPassiert } from './sync-hilfe';

describe('sync-hilfe', () => {
  it('jeder Knopf hat eine Erklärung', () => {
    for (const t of Object.values(KNOPF_HILFE)) expect(t.length).toBeGreaterThan(40);
  });
  it('erklärt die Phasen', () => {
    expect(wasPassiert('Einstellungen und Daten vorbereiten …')).toContain('Sync-Ordner');
    expect(wasPassiert('OneDrive: 120 Dateien gefunden')).toContain('OneDrive');
    expect(wasPassiert('Hochladen: Daten/bn-setlist-x.json')).toContain('nach OneDrive');
    expect(wasPassiert('Herunterladen: Noten/Iris.pdf')).toContain('auf dieses Gerät');
    expect(wasPassiert('Noten erkennen: Iris.pdf')).toContain('Song');
    expect(wasPassiert('irgendwas')).toContain('läuft');
  });
});
