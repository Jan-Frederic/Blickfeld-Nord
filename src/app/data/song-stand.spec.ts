import { songAbgleich } from './playlisten';
import { archivKandidaten, doppelte, gespieltNichtAufWebsite, probenStand } from './song-stand';

const songs = songAbgleich(
  [
    { key: 'website', tracks: [{ title: 'Angels', artist: 'Robbie Williams' }, { title: 'Iris', artist: 'Goo Goo Dolls' }, { title: 'Hallelujah', artist: 'Leonard Cohen' }] },
    { key: 'wunschliste', tracks: [{ title: 'Zombie', artist: 'The Cranberries' }, { title: 'Hallelujah', artist: 'Jeff Buckley' }] },
    { key: 'archiv', tracks: [{ title: 'Alt', artist: 'X' }] },
  ],
  ['Zombi|The Cranberies', 'Iris|'],
);

describe('song-stand', () => {
  it('zählt nur vergangene Proben', () => {
    const p = probenStand([{ tag: '2026-01-01', songs: [{ title: 'Iris', artist: 'Goo Goo Dolls' }] }, { tag: '2099-01-01', songs: [{ title: 'Iris', artist: 'Goo Goo Dolls' }] }], '2026-06-01');
    expect(p.get('Iris|Goo Goo Dolls')).toEqual({ anzahl: 1, zuletzt: '2026-01-01' });
  });

  it('schlägt lange Ungespieltes fürs Archiv vor, Neues und Archiviertes nicht', () => {
    const historie = new Map([
      ['Angels|Robbie Williams', { gespielt: 3, zuletzt: '2024-05-01', geplant: false }],
      ['Alt|X', { gespielt: 1, zuletzt: '2020-01-01', geplant: false }],
    ]);
    const proben = new Map([['Iris|Goo Goo Dolls', { anzahl: 1, zuletzt: '2026-05-01' }]]);
    expect(archivKandidaten(songs, historie, proben, '2026-10-31').map((x) => x.song.key)).toEqual(['Angels|Robbie Williams']);
    expect(gespieltNichtAufWebsite(songs, new Map([['Zombie|The Cranberries', { gespielt: 1, zuletzt: '2026-01-01', geplant: false }]])).map((s) => s.key)).toEqual(['Zombie|The Cranberries']);
  });

  it('findet Doppelte und führt eigenständige in den Listen-Song über', () => {
    const d = doppelte(songs);
    const text = d.map((x) => `${x.a.key} ~ ${x.b.key}: ${x.grund}${x.von ? ` → ${x.nach!.key}` : ''}`);
    expect(text).toContain('Hallelujah|Jeff Buckley ~ Hallelujah|Leonard Cohen: gleicher Titel, andere Band');
    expect(text).toContain('Iris| ~ Iris|Goo Goo Dolls: gleicher Titel, einmal ohne Band → Iris|Goo Goo Dolls');
    expect(text).toContain('Zombi|The Cranberies ~ Zombie|The Cranberries: fast gleich geschrieben → Zombie|The Cranberries');
  });
});
