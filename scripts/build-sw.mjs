#!/usr/bin/env node
// Erzeugt dist/…/sw.js für den Offline-Backstage: alle Skripte, Styles, Schriften und die Backstage-Shell
// werden beim ersten Backstage-Besuch gespeichert. Die Version ändert sich mit jedem Build, damit Geräte
// nach einem Deploy die neuen Dateien holen. Aufruf nach dem SPA-Fallback (backstage/index.html muss existieren).
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist', 'blickfeld-nord', 'browser');

const top = readdirSync(DIST).filter((f) => /\.(js|css)$/.test(f) && f !== 'sw.js');
const fonts = readdirSync(join(DIST, 'fonts')).map((f) => `fonts/${f}`);
// Seiten: Backstage-Shell und Startseite (Fallback), dazu Icons für den Homescreen
const files = ['/', '/backstage/index.html', ...top.map((f) => `/${f}`), ...fonts.map((f) => `/${f}`), '/site.webmanifest', '/favicon.svg', '/icon-192.png'];

const hash = createHash('sha256');
for (const f of files) hash.update(f === '/' ? readFileSync(join(DIST, 'index.html')) : readFileSync(join(DIST, f)));
const version = hash.digest('hex').slice(0, 12);

// Schriften im Seitenkopf mit ?v=… (Cache-Busting) – genau diese URLs vorhalten
const html = readFileSync(join(DIST, 'backstage', 'index.html'), 'utf8');
const versioned = [...html.matchAll(/(?:href|src)="\/?(fonts\/[^"?]+\?v=[^"]+)"/g)].map((m) => `/${m[1]}`);

const sw = readFileSync(join(ROOT, 'scripts', 'sw', 'sw-template.js'), 'utf8')
  .replace('__VERSION__', version)
  .replace('__FILES__', JSON.stringify([...new Set([...files, ...versioned])]));
writeFileSync(join(DIST, 'sw.js'), sw);
console.log(`Service Worker ${version}: ${files.length + versioned.length} Dateien für den Offline-Backstage.`);
