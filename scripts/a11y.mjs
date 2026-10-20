#!/usr/bin/env node
// Barrierefreiheits-Check (WCAG 2.1 A/AA) mit axe-core für alle Seiten der Sitemap, eine Konzertseite und den
// Backstage-Bereich. Schwere Verstöße (serious/critical) lassen den Build scheitern, leichtere werden nur gemeldet.
// Außerdem: Keine Seite darf auf einem schmalen Handy (360 px) breiter als der Bildschirm sein (seitliches Wegscrollen).
// Aufruf nach Build, seo.mjs und SPA-Fallback:  node scripts/a11y.mjs
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist', 'blickfeld-nord', 'browser');
const AXE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ics': 'text/calendar' };

// Mini-Server wie GitHub Pages: Ordner → index.html, sonst 404.html
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = join(DIST, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  const found = existsSync(file);
  res.writeHead(found ? 200 : 404, { 'Content-Type': found ? (TYPES[extname(file)] ?? 'application/octet-stream') : 'text/html' });
  res.end(readFileSync(found ? file : join(DIST, '404.html')));
}).listen(0);
const BASE = `http://127.0.0.1:${server.address().port}`;

const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
const pages = [...new Set([...sitemap.matchAll(/<loc>https:\/\/blickfeld-nord\.de([^<]*)<\/loc>/g)].map((m) => m[1] || '/'))];
const firstShow = pages.find((p) => p.startsWith('/konzerte/'))?.split('/')[2];
pages.push('/backstage/', ...(firstShow ? [`/backstage/${firstShow}`, `/backstage/${firstShow}/vorort`, `/backstage/${firstShow}/setlist`, `/backstage/${firstShow}/packliste`] : []), '/gibt-es-nicht');

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
// Zählpixel und externe Einbettungen spielen für den Check keine Rolle
await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
const page = await context.newPage();

let serious = 0;
let minor = 0;
for (const path of pages) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  // nach unten scrollen, damit per @defer nachgeladene Abschnitte erscheinen
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
  });
  await page.waitForTimeout(400);
  await page.addScriptTag({ content: AXE });
  const result = await page.evaluate(() =>
    // eslint-disable-next-line no-undef
    axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }),
  );
  for (const v of result.violations) {
    const bad = v.impact === 'serious' || v.impact === 'critical';
    bad ? serious++ : minor++;
    const where = v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ');
    console.log(`${bad ? '::error::' : '::warning::'}${path}: [${v.impact}] ${v.id} – ${v.help} (${v.nodes.length}×: ${where})`);
  }
}
// Handy-Breite: Seite darf nicht seitlich scrollen
const phone = await browser.newPage({ viewport: { width: 360, height: 780 } });
await phone.context().route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
for (const path of pages) {
  await phone.goto(BASE + path, { waitUntil: 'networkidle' });
  await phone.waitForTimeout(300);
  const width = await phone.evaluate(() => document.documentElement.scrollWidth);
  if (width > 360) {
    serious++;
    console.log(`::error::${path}: Seite ist auf dem Handy ${width} px breit statt 360 px (seitliches Scrollen)`);
  }
}

await browser.close();
server.close();

console.log(`Barrierefreiheit und Handy-Breite: ${pages.length} Seiten geprüft, ${serious} schwere und ${minor} leichte Verstöße.`);
process.exit(serious ? 1 : 0);
