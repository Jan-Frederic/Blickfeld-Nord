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
