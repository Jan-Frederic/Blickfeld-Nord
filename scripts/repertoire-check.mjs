#!/usr/bin/env node
// Repertoire-Check nach dem Spotify-Abgleich (Workflow „Repertoire aktualisieren“): was ist neu, was ist aus allen Listen
// verschwunden, welche neuen Songs haben noch keine Tonart/Tempo, und welche Einträge in songinfo.ts gehören zu keinem
// Song mehr. Schreibt eine Zusammenfassung in den Workflow-Lauf ($GITHUB_STEP_SUMMARY), sonst auf die Konsole.
// Bricht nie ab – verwaiste Einträge zeigt zusätzlich Backstage → Aufgaben.
import { execSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = 'src/app/data';
const jetzt = (f) => JSON.parse(readFileSync(join(ROOT, DATA, f), 'utf8'));
const vorher = (f) => {
  try {
    return JSON.parse(execSync(`git show HEAD:${DATA}/${f}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch {
    return null;
  }
};
const key = (t) => `${t.title}|${t.artist}`;
const alle = (rep, pl) => {
  const m = new Map();
  for (const t of rep?.tracks ?? []) m.set(key(t), t);
  for (const l of pl?.listen ?? []) for (const t of l.tracks) m.set(key(t), t);
  return m;
};

const neuJetzt = alle(jetzt('repertoire.json'), jetzt('playlisten.json'));
const altRep = vorher('repertoire.json');
const altPl = vorher('playlisten.json');
const alt = altRep || altPl ? alle(altRep, altPl) : new Map();

// songinfo.ts: Einträge „{ title: '…', artist: '…', … }“
const songinfo = readFileSync(join(ROOT, DATA, 'songinfo.ts'), 'utf8');
const str = `(['"])((?:(?!\\1)[^\\\\]|\\\\.)*)\\1`;
const eintraege = [...songinfo.matchAll(new RegExp(`\\{\\s*title:\\s*${str},\\s*artist:\\s*${str.replaceAll('\\1', '\\3')}([^}]*)\\}`, 'g'))].map((m) => ({
  title: m[2].replace(/\\(['"])/g, '$1'),
  artist: m[4].replace(/\\(['"])/g, '$1'),
  werte: /tonart:|bpm:/.test(m[5]),
}));
const mitWerten = new Set(eintraege.filter((e) => e.werte).map(key));

const neu = [...neuJetzt.keys()].filter((k) => alt.size && !alt.has(k));
const weg = [...alt.keys()].filter((k) => !neuJetzt.has(k));
const neuOhne = neu.filter((k) => !mitWerten.has(k));
const verwaist = eintraege.filter((e) => !neuJetzt.has(key(e))).map(key);

const zeile = (k) => `- ${k.replace('|', ' – ')}`;
const teile = [
  '## Repertoire-Check',
  neu.length ? `### Neu (${neu.length})\n${neu.map(zeile).join('\n')}` : 'Keine neuen Songs.',
  weg.length ? `### Aus allen Listen verschwunden (${weg.length})\n${weg.map(zeile).join('\n')}` : '',
  neuOhne.length ? `### Neu, noch ohne Tonart/Tempo (${neuOhne.length})\nIm Backstage unter Songs eintragen.\n${neuOhne.map(zeile).join('\n')}` : '',
  verwaist.length
    ? `### Tonart/Tempo ohne Song (${verwaist.length})\nStehen in songinfo.ts, aber in keiner Spotify-Liste – Song wieder aufnehmen oder Eintrag löschen (Backstage → Aufgaben zeigt sie auch).\n${verwaist.map(zeile).join('\n')}`
    : '',
].filter(Boolean);
const text = teile.join('\n\n') + '\n';
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
console.log(text);
