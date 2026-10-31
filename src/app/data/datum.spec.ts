import { datumText, monatText, tageZwischen } from './datum';

describe('datum', () => {
  it('formatiert Datum und Monat', () => {
    expect(datumText('2027-02-19')).toBe('19.02.2027');
    expect(datumText('2027-02-19', '/')).toBe('19/02/2027');
    expect(monatText('2027-02')).toBe('Februar 2027');
    expect(monatText('2027-02', true)).toBe('Feb 27');
    expect(tageZwischen('2027-03-28', '2027-03-29')).toBe(1);
  });
});
