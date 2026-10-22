import { markErledigt } from './aufgaben-patch';

const SOURCE = `// Kommentar bleibt
export const AUFGABEN: Aufgabe[] = [
  {
    id: 'erste',
    bereich: 'Technik',
    text: 'Erste Aufgabe',
    art: 'muss',
  },
  {
    id: 'zweite',
    bereich: 'Inhalte',
    text: 'Zweite Aufgabe',
    art: 'kann',
    erledigt: true,
  },
];
`;

describe('markErledigt', () => {
  it('ergänzt erledigt: true nur bei der abgehakten Aufgabe', () => {
    const { text, missing } = markErledigt(SOURCE, ['erste']);
    expect(missing).toEqual([]);
    expect(text).toContain("    art: 'muss',\n    erledigt: true,\n  },");
    expect(text.startsWith('// Kommentar bleibt')).toBe(true);
    expect(text.match(/erledigt: true/g)?.length).toBe(2);
  });

  it('lässt bereits erledigte Aufgaben unverändert und meldet unbekannte ids', () => {
    const { text, missing } = markErledigt(SOURCE, ['zweite', 'gibt-es-nicht']);
    expect(text).toBe(SOURCE);
    expect(missing).toEqual(['gibt-es-nicht']);
  });
});
