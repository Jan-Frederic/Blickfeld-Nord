import { probeTipps } from './probe-vorschlag';

const s = (title: string) => ({ title, artist: 'X' });

describe('probeTipps', () => {
  it('findet schwache, lange nicht gespielte und nie gespielte Songs', () => {
    const tipps = probeTipps(
      [s('Schwach'), s('Alt'), s('Neu'), s('Gut')],
      new Map([['Schwach|X', 2.2], ['Gut|X', 4.5]]),
      new Map([['Schwach|X', '2026-10-01'], ['Alt|X', '2026-01-10'], ['Gut|X', '2026-10-01']]),
      '2026-10-24',
    );
    expect(tipps.map((t) => `${t.title}: ${t.grund}`)).toEqual(['Schwach: nur 2,2 Sterne', 'Alt: seit 9 Monaten nicht gespielt', 'Neu: noch auf keiner Setlist']);
  });

  it('„wackelt noch“ kommt zuerst', () => {
    const tipps = probeTipps([s('Schwach'), s('Wackel')], new Map([['Schwach|X', 2], ['Wackel|X', 2]]), new Map([['Schwach|X', '2026-10-01'], ['Wackel|X', '2026-10-01']]), '2026-10-24', 4, new Set(['Wackel|X']));
    expect(tipps.map((t) => `${t.title}: ${t.grund}`)).toEqual(['Wackel: wackelt noch', 'Schwach: nur 2 Sterne']);
  });

  it('nennt einen Song nur einmal', () => {
    const tipps = probeTipps([s('A')], new Map([['A|X', 1]]), new Map(), '2026-10-24');
    expect(tipps.length).toBe(1);
  });
});

describe('probeTipps – Probennotizen', () => {
  it('nimmt Songs mit Baustellen-Notiz gleich nach „wackelt noch“', () => {
    const r = probeTipps([], new Map(), new Map(), '2026-10-31', 4, new Set(), [], [{ song: { title: 'Iris', artist: 'X' }, notiz: 'Tempo zu schnell' }]);
    expect(r.map((t) => t.grund)).toEqual(['Probennotiz: Tempo zu schnell']);
  });
});

describe('probeTipps – Wunschliste', () => {
  it('nimmt bereite Wunschlisten-Songs gleich nach „wackelt noch“', () => {
    const r = probeTipps([{ title: 'A', artist: 'X' }], new Map(), new Map(), '2026-10-31', 4, new Set(['A|X']), [{ title: 'Neu', artist: 'Y' }]);
    expect(r.map((t) => t.grund)).toEqual(['wackelt noch', 'Wunschliste: Noten und Tonart da, noch nie geprobt']);
  });
});

describe('vorAuftritt', () => {
  it('Baustellen zuerst, dann ungeprobte Setlist-Songs, ohne Doppelte und ohne schon Geplante', async () => {
    const { vorAuftritt } = await import('./probe-vorschlag');
    const S = (title: string) => ({ title, artist: 'X' });
    const r = vorAuftritt([S('a')], [S('a'), S('b'), S('c'), S('d')], new Set(['c|X']), new Set(['d|X']));
    expect(r.map((t) => `${t.title}: ${t.grund}`)).toEqual(['a: Baustelle aus der letzten Probe', 'b: auf der Setlist, noch nie geprobt']);
  });
});

describe('probeTipps – Bühnenreife je Person', () => {
  it('Songs, die bei jemandem wackeln, zuerst – geringste Reife vorn; fast bühnenreife zum Festigen', () => {
    const reife = new Map([
      ['A|X', { wert: 0.6, wackeltBei: ['Fred'], ampel: 'baustelle' as const }],
      ['B|X', { wert: 0.2, wackeltBei: ['Fred', 'David'], ampel: 'baustelle' as const }],
      ['C|X', { wert: 0.8, wackeltBei: [], ampel: 'fast' as const }],
      ['D|X', { wert: 1, wackeltBei: [], ampel: 'buehnenreif' as const }],
    ]);
    const tipps = probeTipps([s('A'), s('B'), s('C'), s('D')], new Map(), new Map([['A|X', '2026-10-01'], ['B|X', '2026-10-01'], ['C|X', '2026-10-01'], ['D|X', '2026-10-01']]), '2026-10-24', 4, new Set(), [], [], reife);
    expect(tipps.map((t) => t.title)).toEqual(['B', 'A', 'C']);
    expect(tipps[0].grund).toBe('wackelt bei Fred, David · Bühnenreife 20 %');
    expect(tipps[2].grund).toContain('fast bühnenreif');
  });
});
