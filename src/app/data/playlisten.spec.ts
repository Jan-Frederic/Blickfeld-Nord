import { abweichungen, gesamtDauer, pdfSong, pdfSongKey, songAbgleich, vergleichsKey } from './playlisten';

describe('playlisten', () => {
  it('vergleicht Titel ohne Zusatz und den ersten Interpreten', () => {
    expect(vergleichsKey('Angels - Remastered 2011', 'Robbie Williams')).toBe(vergleichsKey('Angels', 'Robbie Williams'));
    expect(vergleichsKey('Señorita (feat. X)', 'Shawn Mendes, Camila Cabello')).toBe(vergleichsKey('Senorita', 'Shawn Mendes'));
    expect(vergleichsKey('Iris', 'Goo Goo Dolls')).not.toBe(vergleichsKey('Iris', 'Ronan Keating'));
  });

  it('gleicht Listen ab, Schreibweise der ersten Liste gilt', () => {
    const songs = songAbgleich([
      { key: 'website', tracks: [{ title: 'Angels', artist: 'Robbie Williams' }, { title: 'Iris', artist: 'Goo Goo Dolls' }] },
      { key: 'probe', tracks: [{ title: 'Angels - Remastered', artist: 'Robbie Williams' }, { title: 'Zombie', artist: 'The Cranberries' }] },
      { key: 'archiv', tracks: [{ title: 'Zombie', artist: 'The Cranberries' }, { title: 'Angels', artist: 'Robbie Williams' }] },
    ]);
    expect(songs.map((s) => [s.key, s.listen.join(',')])).toEqual([
      ['Angels|Robbie Williams', 'website,probe,archiv'],
      ['Iris|Goo Goo Dolls', 'website'],
      ['Zombie|The Cranberries', 'probe,archiv'],
    ]);
  });

  it('listet Songs nur mit Noten ohne Liste', () => {
    const songs = songAbgleich([{ key: 'website', tracks: [{ title: 'Iris', artist: 'Goo Goo Dolls' }] }], ['Iris|Goo Goo Dolls', pdfSongKey('Toto - Africa.PDF'), pdfSongKey('Eigener Song.pdf')]);
    expect(songs).toEqual([
      { key: 'Africa|Toto', title: 'Africa', artist: 'Toto', listen: [] },
      { key: 'Eigener Song|', title: 'Eigener Song', artist: '', listen: [] },
      { key: 'Iris|Goo Goo Dolls', title: 'Iris', artist: 'Goo Goo Dolls', listen: ['website'] },
    ]);
  });

  it('liest „<Band> - <Titel>.pdf“, Rest ist die Fassung; passt der Song zu einer Liste, gilt deren Schlüssel', () => {
    expect(pdfSong('Toto - Africa - Bass.pdf')).toEqual({ artist: 'Toto', title: 'Africa', fassung: 'Bass' });
    expect(pdfSong('Brüker - Zwischen Den Zeilen.pdf')).toEqual({ artist: 'Brüker', title: 'Zwischen Den Zeilen', fassung: '' });
    expect(pdfSong('Brüker_-_Das_Alte_Bauernhaus.pdf')).toEqual({ artist: 'Brüker', title: 'Das Alte Bauernhaus', fassung: '' });
    expect(pdfSong('Ohne Band.pdf')).toEqual({ artist: '', title: 'Ohne Band', fassung: '' });
    const liste = songAbgleich([{ key: 'website', tracks: [{ title: 'Angels', artist: 'Robbie Williams' }] }]);
    expect(pdfSongKey('robbie williams - angels - Gitarre.pdf', liste)).toBe('Angels|Robbie Williams');
  });

  it('findet Abweichungen zwischen Setlist, Archiv und Website', () => {
    const songs = songAbgleich([
      { key: 'website', tracks: [{ title: 'A', artist: 'X' }, { title: 'B', artist: 'Y' }] },
      { key: 'setlist', tracks: [{ title: 'A', artist: 'X' }, { title: 'C', artist: 'Z' }] },
      { key: 'archiv', tracks: [{ title: 'B', artist: 'Y' }] },
    ]);
    const a = abweichungen(songs);
    expect(a.setlistOhneWebsite.map((s) => s.key)).toEqual(['C|Z']);
    expect(a.archivAufWebsite.map((s) => s.key)).toEqual(['B|Y']);
  });

  it('summiert die Dauer', () => {
    expect(gesamtDauer([{ title: 'A', artist: '' }, { title: 'B', artist: '' }], (s) => (s.title === 'A' ? 200 : undefined))).toEqual({ sekunden: 200, fehlend: 1 });
  });
});
