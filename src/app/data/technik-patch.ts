// Übernimmt im Backstage verschobene Positionen in den Quelltext von technik.json: ersetzt nur den Abschnitt
// „aufbau“ (eine Zeile je Element, wie bisher) – alles andere bleibt zeichengenau erhalten.
// Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.

/** Ein Element im Stil der Datei: { "id": "drums", "x": 2, "arm": [2.2, 0.36] } */
export function aufbauZeile(item: object): string {
  const wert = (v: unknown): string => (Array.isArray(v) ? `[${v.map(wert).join(', ')}]` : JSON.stringify(v));
  return `    { ${Object.entries(item)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `"${k}": ${wert(v)}`)
    .join(', ')} }`;
}

/** Ersetzt den Abschnitt "aufbau" – null, wenn er in der Datei nicht zu finden ist */
export function patchAufbau(source: string, items: object[]): string | null {
  const re = /( {2}"aufbau": \[\n)[\s\S]*?(\n {2}\],\n)/;
  if (!re.test(source)) return null;
  return source.replace(re, (_, start: string, end: string) => start + items.map(aufbauZeile).join(',\n') + end);
}
