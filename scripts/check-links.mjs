#!/usr/bin/env node
// Linkcheck für den fertigen Build (nach `ng build`):
//  - interne Links, Bilder und Downloads in allen HTML-Seiten müssen existieren (Fehler → Abbruch)
//  - Bilder aus band.service.ts (Historie, Galerie) müssen im Build liegen (Fehler → Abbruch)
//  - externe Links werden mit --extern zusätzlich aufgerufen (nur Warnung: manche Seiten blocken Bots)
import { build } from 'esbuild';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist', 'blickfeld-nord', 'browser');
const SITE = 'https://blickfeld-nord.de';
const checkExternal = process.argv.includes('--extern');
const errors = [];
const external = new Map();

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return htmlFiles(p);
    return name.endsWith('.html') ? [p] : [];
  });
}

// Pfad relativ zur Website-Wurzel → Datei im Build
function exists(path) {
  const clean = decodeURIComponent(path.split(/[?#]/)[0]).replace(/^\/+/, '');
  if (clean === '') return true;
  const p = join(DIST, clean);
  return (existsSync(p) && statSync(p).isFile()) || existsSync(join(p, 'index.html'));
}

for (const file of htmlFiles(DIST)) {
  const page = '/' + relative(DIST, file).replace(/index\.html$/, '');
  const html = readFileSync(file, 'utf8');
  const urls = [];
  for (const [, , value] of html.matchAll(/\s(href|src)="([^"]*)"/g)) urls.push(value);
  for (const [, value] of html.matchAll(/\ssrcset="([^"]*)"/g)) urls.push(...value.split(',').map((s) => s.trim().split(/\s+/)[0]));
  for (const raw of urls) {
    const url = raw.replace(/&amp;/g, '&');
    if (!url || url.startsWith('#') || /^(mailto|tel|data|javascript):/.test(url)) continue;
    if (url.startsWith(SITE)) {
      if (!exists(url.slice(SITE.length))) errors.push(`${page}: ${url} fehlt`);
    } else if (/^https?:\/\//.test(url)) {
      if (!external.has(url)) external.set(url, page);
    } else if (!exists(url)) {
      // <base href="/"> → alle relativen Pfade beziehen sich auf die Wurzel
      errors.push(`${page}: ${url} fehlt`);
    }
  }
}

// Inhalte aus band.service.ts
const tmp = mkdtempSync(join(tmpdir(), 'bn-links-'));
const bundle = join(tmp, 'data.mjs');
await build({
  entryPoints: [join(ROOT, 'scripts', 'seo', 'data.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundle,
  alias: { '@angular/core': join(ROOT, 'scripts', 'seo', 'angular-core-stub.ts') },
  tsconfig: join(ROOT, 'tsconfig.json'),
  logLevel: 'warning',
});
const { history, photos } = await import(pathToFileURL(bundle).href);
rmSync(tmp, { recursive: true, force: true });
for (const e of history) {
  for (const img of e.images ?? []) if (!exists(img.src)) errors.push(`Historie ${e.date}: Bild ${img.src} fehlt`);
}
for (const p of photos) {
  for (const src of [p.src, p.thumb]) if (!exists(src)) errors.push(`Galerie: Bild ${src} fehlt`);
}

if (checkExternal) {
  const warnings = [];
  await Promise.all(
    [...external].map(async ([url, page]) => {
      try {
        const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(15000) });
        if (res.status >= 400 && ![403, 429, 999].includes(res.status)) warnings.push(`${page}: ${url} → HTTP ${res.status}`);
      } catch (err) {
        warnings.push(`${page}: ${url} → ${err.cause?.code ?? err.message}`);
      }
    }),
  );
  for (const w of warnings) console.log(`::warning::Externer Link: ${w}`);
  console.log(`${external.size} externe Links geprüft, ${warnings.length} Warnungen`);
}

if (errors.length) {
  for (const e of errors) console.log(`::error::${e}`);
  console.log(`Linkcheck fehlgeschlagen: ${errors.length} Fehler`);
  process.exit(1);
}
console.log(`Linkcheck ok: ${htmlFiles(DIST).length} Seiten, alle internen Links und Bilder vorhanden`);
