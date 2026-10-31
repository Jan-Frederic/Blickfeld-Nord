import { tempoKlasse, wunschPassung } from './wunsch-passung';

const S = (title: string, bpm?: number, tonart?: string, dauer?: number) => ({ title, artist: 'X', bpm, tonart, dauer });

describe('wunschPassung', () => {
  it('Tempo-Klassen', () => {
    expect([tempoKlasse(80), tempoKlasse(110), tempoKlasse(150)]).toEqual(['langsam', 'mittel', 'schnell']);
  });

  it('schlägt Songs vor, die das fehlende Tempo füllen und tonal passen', () => {
    const setlist = [S('a', 120, 'G'), S('b', 125, 'D'), S('c', 140, 'G'), S('d', 150, 'C'), S('e', 110, 'G'), S('f', 135, 'Em')];
    const wunsch = [S('schnell', 160, 'F#'), S('langsam', 76, 'G', 240), S('a', 120, 'G'), S('ohne')];
    const p = wunschPassung(setlist, wunsch);
    expect(p.fehlt).toBe('langsam');
    expect(p.vorschlaege[0].song.title).toBe('langsam');
    expect(p.vorschlaege[0].gruende.join(' ')).toContain('davon hat die Setlist wenig');
    expect(p.vorschlaege[0].gruende.join(' ')).toContain('Tonart G passt zu');
    expect(p.vorschlaege.map((v) => v.song.title)).not.toContain('a');
    expect(p.vorschlaege.find((v) => v.song.title === 'ohne')?.gruende).toEqual(['Tempo noch unbekannt']);
  });

  it('ausgewogene oder zu kleine Setlist: keine fehlende Klasse', () => {
    expect(wunschPassung([S('a', 80)], []).fehlt).toBeNull();
  });
});
