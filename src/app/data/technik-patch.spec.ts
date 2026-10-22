import { aufbauZeile, patchAufbau } from './technik-patch';
import technik from './technik.json';

describe('patchAufbau', () => {
  const source = `{
  "stand": "2026-10-22",
  "aufbau": [
    { "id": "a", "x": 1, "y": 2 },
    { "id": "b", "x": 3, "y": 1, "arm": [2.2, 0.36] }
  ],
  "kanaele": []
}
`;

  it('ersetzt nur die Positionen im Abschnitt „aufbau“', () => {
    const text = patchAufbau(source, [{ id: 'a', x: 1.5, y: 2 }, { id: 'b', x: 3, y: 1, arm: [2.5, 0.4] }]);
    expect(text).toBe(source.replace('"x": 1,', '"x": 1.5,').replace('[2.2, 0.36]', '[2.5, 0.4]'));
  });

  it('schreibt die echte Datei unverändert zurück, wenn nichts verschoben wurde', () => {
    const zeilen = technik.aufbau.map((i) => aufbauZeile(i)).join(',\n');
    expect(zeilen.split('\n').length).toBe(technik.aufbau.length);
    expect(JSON.parse(patchAufbau(JSON.stringify(technik, null, 2), technik.aufbau)!)).toEqual(technik);
  });

  it('meldet null, wenn der Abschnitt fehlt', () => {
    expect(patchAufbau('{}', [])).toBeNull();
  });
});
