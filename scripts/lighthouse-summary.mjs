#!/usr/bin/env node
// Fasst die Lighthouse-Läufe nach dem Deploy zusammen: Median je Seite und Kategorie als Tabelle im Log und in der
// Zusammenfassung des GitHub-Laufs. So ist sichtbar, wie viel Abstand zu den Schwellen in lighthouserc.json bleibt.
// Aufruf nach `lhci autorun` (Berichte in lighthouse-berichte/):  node scripts/lighthouse-summary.mjs
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const FILE = 'lighthouse-berichte/manifest.json';
if (!existsSync(FILE)) {
  console.log('Keine Lighthouse-Berichte gefunden.');
  process.exit(0);
}
const runs = JSON.parse(readFileSync(FILE, 'utf8'));
const KAT = [['performance', 'Leistung'], ['accessibility', 'Barrierefreiheit'], ['best-practices', 'Best Practices'], ['seo', 'SEO']];
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const urls = [...new Set(runs.map((r) => r.url))];
const zeilen = urls.map((url) => {
  const r = runs.filter((x) => x.url === url);
  return [new URL(url).pathname, ...KAT.map(([k]) => median(r.map((x) => x.summary[k])).toFixed(2))];
});
const md = [`| Seite | ${KAT.map(([, n]) => n).join(' | ')} |`, `|---|${KAT.map(() => '---:').join('|')}|`, ...zeilen.map((z) => `| ${z.join(' | ')} |`)].join('\n');
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Lighthouse (Median aus ${runs.length / urls.length} Läufen)\n\n${md}\n`);
