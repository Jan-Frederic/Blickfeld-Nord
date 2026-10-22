// Übernimmt im Backstage abgehakte Aufgaben in den Quelltext von aufgaben.ts: ergänzt `erledigt: true` bei den
// betroffenen Einträgen. Alles andere (Kommentare, Reihenfolge, übrige Aufgaben) bleibt zeichengenau erhalten.
// Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.

/** Markiert die Aufgaben mit den angegebenen ids als erledigt; missing = ids, die in der Datei nicht (mehr) stehen */
export function markErledigt(source: string, ids: string[]): { text: string; missing: string[] } {
  const missing: string[] = [];
  let text = source;
  for (const id of ids) {
    const start = text.indexOf(`    id: '${id}',\n`);
    if (start < 0) {
      missing.push(id);
      continue;
    }
    const close = text.indexOf('\n  },', start);
    if (/\n {4}erledigt: true,/.test(text.slice(start, close))) continue;
    text = text.slice(0, close) + '\n    erledigt: true,' + text.slice(close);
  }
  return { text, missing };
}
