import { streichVorschlag, ueberzug } from './kuerzen';

describe('Set zu lang', () => {
  const rest = [
    { index: 4, title: 'Gut', dauer: 200, sterne: 5 },
    { index: 5, title: 'Mittel', dauer: 180, sterne: 3 },
    { index: 6, title: 'Schwach', dauer: 240, sterne: 2 },
    { index: 7, title: 'Wunsch', dauer: 300, sterne: 1, wunsch: true },
  ];

  it('streicht die schwächsten Songs, bis die Zeit passt – Wünsche bleiben', () => {
    expect(ueberzug(1800, 920, 2400)).toBe(320);
    expect(streichVorschlag(rest, 320).map((s) => s.title)).toEqual(['Mittel', 'Schwach']);
    expect(streichVorschlag(rest, 200).map((s) => s.title)).toEqual(['Schwach']);
  });

  it('nichts bei kleinem Überzug oder wenn es nicht reicht', () => {
    expect(streichVorschlag(rest, 50)).toEqual([]);
    expect(streichVorschlag(rest, 2000)).toEqual([]);
  });
});
