import { pfadKodieren } from './onedrive';
import { istAkkordblatt, istPdf } from './noten-import';

describe('OneDrive', () => {
  it('kodiert Ordnerpfade für Graph-Adressen', () => {
    expect(pfadKodieren(' Blickfeld Nord / Noten & Co/ ')).toBe('Blickfeld%20Nord/Noten%20%26%20Co');
    expect(pfadKodieren('')).toBe('');
  });

  it('erkennt Noten-Dateien', () => {
    expect(istPdf('Iris - Bass.PDF')).toBe(true);
    expect(istAkkordblatt('angels.chopro')).toBe(true);
    expect(istAkkordblatt('liesmich.md')).toBe(false);
  });
});
