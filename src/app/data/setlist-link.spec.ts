import { setlistAusHash, setlistKodieren, setlistLink } from './setlist-link';

const tracks = [
  { title: 'A', artist: 'X' },
  { title: 'B', artist: 'Y' },
  { title: 'C', artist: 'Z' },
];

describe('setlist-link', () => {
  it('Hin und zurück mit Pause und Wunsch (ohne Namen)', () => {
    const entries = [{ title: 'C', artist: 'Z' }, { pause: true as const }, { title: 'A', artist: 'X', wunsch: 'Steven' }];
    const link = setlistLink('https://blickfeld-nord.de', '2026-12-04', entries, tracks);
    expect(link).toContain('/backstage/2026-12-04/setlist#liste=');
    expect(link).not.toContain('Steven');
    expect(setlistAusHash(link.slice(link.indexOf('#')), tracks)).toEqual([
      { title: 'C', artist: 'Z' },
      { pause: true },
      { title: 'A', artist: 'X', wunsch: '' },
    ]);
  });

  it('findet Songs wieder, wenn sich die Reihenfolge des Repertoires geändert hat', () => {
    const code = setlistKodieren([{ title: 'B', artist: 'Y' }], tracks);
    const umsortiert = [tracks[2], tracks[0], tracks[1]]; // „B“ steht jetzt an Stelle 3 statt 2
    expect(setlistAusHash('#liste=' + code, umsortiert)).toEqual([{ title: 'B', artist: 'Y' }]);
  });

  it('Notiz für den Auftritt reist mit – auch mit Komma und Umlauten', () => {
    const entries = [{ title: 'A', artist: 'X', notiz: 'Schluss zweimal, dann Ö-Ende' }, { title: 'B', artist: 'Y' }];
    const link = setlistLink('https://blickfeld-nord.de', '2026-12-04', entries, tracks);
    expect(setlistAusHash(link.slice(link.indexOf('#')), tracks)).toEqual(entries);
  });

  it('ohne Liste im Link: null', () => {
    expect(setlistAusHash('#anderes=1', tracks)).toBeNull();
  });
});
