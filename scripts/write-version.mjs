#!/usr/bin/env node
// Schreibt die aktuelle Release-Version (letzter Git-Tag v*, von semantic-release angelegt) nach
// src/app/data/version.json – angezeigt im Footer. Läuft beim Deploy vor dem Build.
// Ohne Tag (z. B. lokal ohne `git fetch --tags`) bleibt die Version leer und der Footer zeigt nichts an.
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', 'data', 'version.json');

let tag = null;
try {
  tag = execSync('git describe --tags --abbrev=0 --match "v[0-9]*"', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch {
  // kein Tag vorhanden
}
const version = tag ? tag.replace(/^v/, '') : null;
writeFileSync(OUT, JSON.stringify({ version }, null, 2) + '\n');
console.log(`Version: ${version ?? '(keine)'}`);
