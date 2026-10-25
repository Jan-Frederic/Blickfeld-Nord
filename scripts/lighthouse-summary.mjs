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
// Kennzahlen des repräsentativen Laufs je Seite: wo die Zeit bis zum größten Inhalt (LCP) hingeht
const TEIL = { timeToFirstByte: 'Server', resourceLoadDelay: 'Warten aufs Bild', resourceLoadDuration: 'Bild laden', elementRenderDelay: 'Anzeigen' };
const ms = (v) => (v == null ? '–' : `${(v / 1000).toFixed(1)} s`);
const details = urls.map((url) => {
  const run = runs.find((x) => x.url === url && x.isRepresentativeRun) ?? runs.find((x) => x.url === url);
  let r;
  try {
    r = JSON.parse(readFileSync(run.jsonPath, 'utf8'));
  } catch {
    return `| ${new URL(url).pathname} | – | – | – | – | – |`;
  }
  const a = r.audits;
  // Aufteilung der Zeit bis zum größten Inhalt – neuere Lighthouse-Versionen: lcp-breakdown-insight (subparts),
  // ältere: largest-contentful-paint-element (phases)
  const neu = (a['lcp-breakdown-insight']?.details?.items ?? []).find((t) => t.items?.[0]?.subpart);
  const alt = (a['largest-contentful-paint-element']?.details?.items ?? []).find((t) => t.items?.[0]?.phase);
  const phasen = neu
    ? neu.items.map((p) => `${TEIL[p.subpart] ?? p.label} ${Math.round(p.duration)} ms`).join(', ')
    : (alt?.items ?? []).map((p) => `${p.phase} ${ms(p.timing)}`).join(', ');
  // Tempo des GitHub-Rechners (Lighthouse-BenchmarkIndex, höher = schneller): erklärt große Schwankungen bei gleichem Code
  const tempo = Math.round(r.environment?.benchmarkIndex ?? 0) || '–';
  return `| ${new URL(url).pathname} | ${ms(a['first-contentful-paint']?.numericValue)} | ${ms(a['largest-contentful-paint']?.numericValue)} | ${Math.round(a['total-blocking-time']?.numericValue ?? 0)} ms | ${tempo} | ${phasen || '–'} |`;
});
const md2 = ['| Seite | Erster Inhalt | LCP | Blockierzeit | Rechner-Tempo | LCP-Aufteilung |', '|---|---:|---:|---:|---:|---|', ...details].join('\n');
console.log(md);
console.log(md2);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Lighthouse (Median aus ${runs.length / urls.length} Läufen)\n\n${md}\n\n${md2}\n`);
