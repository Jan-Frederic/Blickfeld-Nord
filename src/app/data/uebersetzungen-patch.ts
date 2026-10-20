// Übernimmt Entscheidungen aus „Übersetzungen prüfen“ (Backstage) in den Quelltext von uebersetzungen.ts.
// Ersetzt nur die betroffenen Einträge – Kommentare, Reihenfolge und alle anderen Einträge bleiben zeichengenau erhalten.
// Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.
export type Sprache = 'en' | 'nl';
export type Entscheidung = { text: string; ok: boolean };
export type Pruefung = Record<Sprache, Record<string, Entscheidung>>;

const q = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** Ersetzt in der Quelldatei die Einträge mit Entscheidung – Kommentare und Reihenfolge bleiben erhalten */
export function patchSource(source: string, pruefung: Pruefung): { text: string; missing: string[] } {
  const missing: string[] = [];
  const keys = new Set([...Object.keys(pruefung.en), ...Object.keys(pruefung.nl)]);
  let text = source;
  for (const de of keys) {
    const start = text.indexOf(`    de: ${q(de)},\n`);
    if (start < 0) {
      missing.push(de);
      continue;
    }
    const open = text.lastIndexOf('  {\n', start);
    const close = text.indexOf('\n  },', start);
    const block = text.slice(open, close);
    const value = (lang: Sprache) => block.match(new RegExp(`\\n    ${lang}: '((?:[^'\\\\]|\\\\.)*)',`))?.[1] ?? '';
    const flags = block.match(/\n {4}geprueft: \{([^}]*)\},/)?.[1] ?? '';
    const was = (lang: Sprache) => new RegExp(`${lang}: true`).test(flags);
    const lines = [`  {`, `    de: ${q(de)},`];
    const ok: Sprache[] = [];
    for (const lang of ['en', 'nl'] as const) {
      const d = pruefung[lang][de];
      lines.push(`    ${lang}: ${d ? q(d.text) : `'${value(lang)}'`},`);
      if (d ? d.ok : was(lang)) ok.push(lang);
    }
    if (ok.length) lines.push(`    geprueft: { ${ok.map((l) => `${l}: true`).join(', ')} },`);
    text = text.slice(0, open) + lines.join('\n') + text.slice(close);
  }
  return { text, missing };
}
