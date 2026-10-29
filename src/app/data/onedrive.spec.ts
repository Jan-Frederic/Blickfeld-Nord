import { adresse, pfadKodieren } from './onedrive';
import { istAkkordblatt, istPdf } from './noten-import';

describe('OneDrive', () => {
  it('kodiert Ordnerpfade für Graph-Adressen', () => {
    expect(pfadKodieren(' Blickfeld Nord / Noten & Co/ ')).toBe('Blickfeld%20Nord/Noten%20%26%20Co');
    expect(pfadKodieren('')).toBe('');
  });

  it('adressiert eigene und geteilte Ordner', () => {
    expect(adresse({ pfad: '' })).toBe('/me/drive/root');
    expect(adresse({ pfad: 'Blickfeld Nord' }, 'Noten/a b.pdf')).toBe('/me/drive/root:/Blickfeld%20Nord/Noten/a%20b.pdf:');
    const wurzel = { drive: 'd1', item: 'i1', name: 'Sync' };
    expect(adresse({ pfad: '', wurzel })).toBe('/drives/d1/items/i1');
    expect(adresse({ pfad: 'Sheets', wurzel }, 'Iris.pdf')).toBe('/drives/d1/items/i1:/Sheets/Iris.pdf:');
  });

  it('erkennt Noten-Dateien', () => {
    expect(istPdf('Iris - Bass.PDF')).toBe(true);
    expect(istAkkordblatt('angels.chopro')).toBe(true);
    expect(istAkkordblatt('liesmich.md')).toBe(false);
  });
});
