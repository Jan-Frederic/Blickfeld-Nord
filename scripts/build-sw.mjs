#!/usr/bin/env node
// Erzeugt dist/…/sw.js für die Progressive Web App: Startseite, Backstage-Shell, Skripte, Styles, Schriften und
// Icons werden beim ersten Besuch gespeichert; weitere Seiten und Bilder, sobald sie einmal aufgerufen wurden.
// Die Version ändert sich mit jedem Build, damit Geräte nach einem Deploy die neuen Dateien holen. Aufruf nach dem SPA-Fallback (backstage/index.html muss existieren).
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist', 'blickfeld-nord', 'browser');

// ohne die Microsoft-Anmeldebibliothek (OneDrive im Backstage): rund 300 kB, nur mit Netz sinnvoll – wird beim
// ersten Verbinden geladen und dann wie andere Dateien mit Hash gemerkt
const msal = (f) => f.endsWith('.js') && readFileSync(join(DIST, f), 'utf8').includes('msal.js.browser');
const top = readdirSync(DIST).filter((f) => /\.(js|css)$/.test(f) && f !== 'sw.js' && !msal(f));
const fonts = readdirSync(join(DIST, 'fonts')).map((f) => `fonts/${f}`);
// Textschriften (von Angular mit Hash nach media/ kopiert)
const media = readdirSync(join(DIST, 'media')).filter((f) => f.endsWith('.woff2')).map((f) => `media/${f}`);
const assets = ['/site.webmanifest', '/favicon.svg', '/icon-192.png', '/icon-512.png', '/hero-800.webp', '/kompass-440.webp'];
// Seiten selbst landen erst beim Aufruf im Speicher (spart Datenvolumen beim ersten Besuch)
const files = ['/', '/backstage/index.html', ...top.map((f) => `/${f}`), ...fonts.map((f) => `/${f}`), ...media.map((f) => `/${f}`), ...assets];

const hash = createHash('sha256');
for (const f of files) hash.update(readFileSync(join(DIST, f.endsWith('/') ? f + 'index.html' : f)));
const version = hash.digest('hex').slice(0, 12);

// Schriften im Seitenkopf mit ?v=… (Cache-Busting) – genau diese URLs vorhalten
const html = readFileSync(join(DIST, 'backstage', 'index.html'), 'utf8');
const versioned = [...html.matchAll(/(?:href|src)="\/?(fonts\/[^"?]+\?v=[^"]+)"/g)].map((m) => `/${m[1]}`);

// pdf.js-Version für den eigenen Notenblatt-Speicher (siehe sw-template.js)
const pdfjs = JSON.parse(readFileSync(join(ROOT, 'node_modules', 'pdfjs-dist', 'package.json'), 'utf8')).version;

const sw = readFileSync(join(ROOT, 'scripts', 'sw', 'sw-template.js'), 'utf8')
  .replace('__VERSION__', version)
  .replace('__PDFJS__', pdfjs)
  .replace('__FILES__', JSON.stringify([...new Set([...files, ...versioned])]));
writeFileSync(join(DIST, 'sw.js'), sw);
console.log(`Service Worker ${version}: ${files.length + versioned.length} Dateien vorab gespeichert, Seiten und Bilder beim Aufruf.`);
