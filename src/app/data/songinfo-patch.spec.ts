import { patchSongInfo } from './songinfo-patch';

const SOURCE = `// Kommentar bleibt
export interface SongInfo { title: string }

export const SONGINFO: SongInfo[] = [];

export function songInfo() {}
`;

describe('patchSongInfo', () => {
  it('schreibt die Liste mit einer Zeile je Song und lässt den Rest unverändert', () => {
    const text = patchSongInfo(SOURCE, [
      { title: '80 Millionen', artist: 'Max Giesinger', tonart: 'G', bpm: 120, notiz: 'Capo 2' },
      { title: 'Song’s „Titel“', artist: "O'Brien", bpm: 96 },
      { title: 'Leer', artist: 'Niemand' },
    ])!;
    expect(text).toContain("export const SONGINFO: SongInfo[] = [\n  { title: '80 Millionen', artist: 'Max Giesinger', tonart: 'G', bpm: 120, notiz: 'Capo 2' },\n");
    expect(text).toContain("artist: 'O\\'Brien', bpm: 96 },\n];");
    expect(text).not.toContain('Leer');
    expect(text.startsWith('// Kommentar bleibt')).toBe(true);
    expect(text.endsWith('export function songInfo() {}\n')).toBe(true);
  });

  it('schreibt Band-Tonart, Capo und Quelle mit', () => {
    const text = patchSongInfo(SOURCE, [{ title: 'Iris', artist: 'The Goo Goo Dolls', tonart: 'D', spielTonart: 'C', capo: 2, bpm: 155, quelle: "Musicnotes 'Original' D" }])!;
    expect(text).toContain("{ title: 'Iris', artist: 'The Goo Goo Dolls', tonart: 'D', spielTonart: 'C', capo: 2, bpm: 155, quelle: 'Musicnotes \\'Original\\' D' },");
  });

  it('lässt Songs weg, die nur eine Quelle, aber keine Angaben haben', () => {
    expect(patchSongInfo(SOURCE, [{ title: 'Leer', artist: 'Niemand', quelle: 'nichts gefunden' }])).toBe(SOURCE);
  });

  it('ergibt wieder die leere Liste, wenn nichts eingetragen ist', () => {
    expect(patchSongInfo(SOURCE, [])).toBe(SOURCE);
  });

  it('meldet null, wenn die Liste fehlt', () => {
    expect(patchSongInfo('// nichts', [])).toBeNull();
  });
});
