import { ICH_KEY, ichSetzen, ladeIch, rufname, unsicherJeSong, zusageSetzen, zusagen, zusagenText } from './band-ich';
import { wackeltSetzen } from './wackelt';

const band = [
  { slug: 'david', name: 'David Bröker' },
  { slug: 'fred', name: 'Jan-Frederic Overbeck', nickname: 'Fred' },
  { slug: 'matthias', name: 'Matthias W.' },
];

describe('band-ich', () => {
  beforeEach(() => localStorage.clear());

  it('Rufname: Spitzname, sonst Vorname', () => {
    expect(band.map(rufname)).toEqual(['David', 'Fred', 'Matthias']);
  });

  it('Zusagen je Person in eigener Datei', () => {
    zusageSetzen('2026-11-20', 'fred', { kommt: true, notiz: ' komme später ' });
    zusageSetzen('2026-11-20', 'david', { kommt: false });
    expect(localStorage.getItem('bn-zusage-2026-11-20-fred')).toBe('{"kommt":true,"notiz":"komme später"}');
    const z = zusagen('2026-11-20', band);
    expect(z.get('fred')).toEqual({ kommt: true, notiz: 'komme später' });
    expect(zusagenText(z, band.length)).toBe('1 kommt, 1 sagt ab, 1 offen');
    zusageSetzen('2026-11-20', 'david', null);
    expect(zusagen('2026-11-20', band).has('david')).toBe(false);
  });

  it('„Wackelt noch“ wird nach „Ich bin …“ für die Band sichtbar', () => {
    wackeltSetzen('Iris|The Goo Goo Dolls', true, '2026-11-01');
    expect(unsicherJeSong(band).size).toBe(0);
    ichSetzen('fred', { 'Iris|The Goo Goo Dolls': '2026-11-01' });
    expect(ladeIch()).toBe('fred');
    expect(localStorage.getItem(ICH_KEY)).toBe('fred');
    wackeltSetzen('Africa|TOTO', true, '2026-11-02');
    localStorage.setItem('bn-unsicher-david', JSON.stringify(['Africa|TOTO']));
    const u = unsicherJeSong(band);
    expect(u.get('Africa|TOTO')).toEqual(['David', 'Fred']);
    expect(u.get('Iris|The Goo Goo Dolls')).toEqual(['Fred']);
    wackeltSetzen('Iris|The Goo Goo Dolls', false);
    expect(unsicherJeSong(band).has('Iris|The Goo Goo Dolls')).toBe(false);
  });
});
