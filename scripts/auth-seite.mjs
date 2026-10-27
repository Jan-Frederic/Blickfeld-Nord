#!/usr/bin/env node
// Erzeugt /auth/ – die Antwortseite der Microsoft-Anmeldung für OneDrive im Backstage (Popup und stilles
// Anmelden). Bewusst ohne Angular: nur das kleine Skript, das die Antwort an die Backstage-Seite weitergibt.
// Aufruf nach dem SPA-Fallback, vor csp.mjs:  node scripts/auth-seite.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ZIEL = join(ROOT, 'dist', 'blickfeld-nord', 'browser', 'auth');
mkdirSync(ZIEL, { recursive: true });
await build({ entryPoints: [join(ROOT, 'scripts', 'auth', 'bridge.js')], bundle: true, minify: true, format: 'esm', target: 'es2022', outfile: join(ZIEL, 'bridge.js'), logLevel: 'warning' });
writeFileSync(
  join(ZIEL, 'index.html'),
  `<!doctype html>
<html lang="de">
<head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Anmeldung – Blickfeld Nord</title></head>
<body style="background:#111;color:#ccc;font:16px system-ui,sans-serif;padding:24px">Anmeldung …<script type="module" src="/auth/bridge.js"></script></body>
</html>
`,
);
console.log('Anmelde-Antwortseite /auth/ erzeugt.');
