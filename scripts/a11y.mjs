#!/usr/bin/env node
// Barrierefreiheits-Check (WCAG 2.1 A/AA) mit axe-core für alle Seiten der Sitemap, eine Konzertseite und den
// Backstage-Bereich. Schwere Verstöße (serious/critical) lassen den Build scheitern, leichtere werden nur gemeldet.
// Außerdem: Keine Seite darf auf einem schmalen Handy (360 px) breiter als der Bildschirm sein (seitliches Wegscrollen).
// Aufruf nach Build, seo.mjs und SPA-Fallback:  node scripts/a11y.mjs
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { serve } from './lib/static-server.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist', 'blickfeld-nord', 'browser');
const AXE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const { base: BASE, close } = serve(DIST);

const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
const pages = [...new Set([...sitemap.matchAll(/<loc>https:\/\/blickfeld-nord\.de([^<]*)<\/loc>/g)].map((m) => m[1] || '/'))];
const firstShow = pages.find((p) => p.startsWith('/konzerte/'))?.split('/')[2];
// erste eingetragene Probe (für die Seite „Probe planen“)
const firstProbe = readFileSync(join(ROOT, 'src', 'app', 'data', 'band.service.ts'), 'utf8').match(/readonly rehearsals: Rehearsal\[\] = \[\s*\{ date: '([\d-]+)'/)?.[1];
pages.push('/backstage/', '/backstage/termine/', '/backstage/zahlen/', '/backstage/uebersetzungen/', '/backstage/material/', '/backstage/abgleich/', '/backstage/aufgaben/', '/backstage/buehnenplan/', '/backstage/songs/', ...(firstProbe ? [`/backstage/probe/${firstProbe}`] : []), ...(firstShow ? [`/backstage/${firstShow}`, `/backstage/${firstShow}/vorort`, `/backstage/${firstShow}/setlist`, `/backstage/${firstShow}/packliste`] : []), '/wunsch', '/gibt-es-nicht');

const browser = await chromium.launch();
// bypassCSP: axe wird als Skript in die Seite gelegt – das blockt die Content-Security-Policy der Seite sonst (zu Recht)
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'de-DE', bypassCSP: true });
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
// Handy-Breite: nichts darf über den rechten Rand ragen – auch nicht bei 15 % größerer Schrift (Textgröße im
// Handy-Browser) und mit aufgeklappten Listen. Gemessen wird am Element, weil html/body überstehendes ohnehin abschneiden.
// niederländischer Browser: deutsche Seiten zeigen dabei den Sprachhinweis – der darf auch nicht überstehen
const phone = await browser.newPage({ viewport: { width: 360, height: 780 }, locale: 'nl-NL', bypassCSP: true });
await phone.context().route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
for (const path of pages) {
  await phone.goto(BASE + path, { waitUntil: 'networkidle' });
  await phone.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
  });
  await phone.waitForTimeout(300);
  const offenders = await phone.evaluate(() => {
    document.querySelectorAll('details').forEach((d) => (d.open = true));
    const els = [...document.querySelectorAll('body *')].filter((el) => el.tagName !== 'MAT-ICON');
    const sizes = els.map((el) => parseFloat(getComputedStyle(el).fontSize));
    els.forEach((el, i) => (el.style.fontSize = sizes[i] * 1.15 + 'px'));
    const vw = document.documentElement.clientWidth;
    const clippedInside = (el) => {
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        if (['auto', 'hidden', 'scroll', 'clip'].includes(getComputedStyle(a).overflowX)) return true;
      }
      return false;
    };
    return els
      .filter((el) => !el.children.length && el.getBoundingClientRect().right > vw + 1 && !clippedInside(el))
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()} „${el.textContent.trim().slice(0, 30)}“ bis ${Math.round(el.getBoundingClientRect().right)} px`);
  });
  if (offenders.length) {
    serious++;
    console.log(`::error::${path}: ragt auf dem Handy (360 px, Schrift +15 %) über den Rand: ${offenders.join(' | ')}`);
  }
}

await browser.close();
close();

console.log(`Barrierefreiheit und Handy-Breite: ${pages.length} Seiten geprüft, ${serious} schwere und ${minor} leichte Verstöße.`);
process.exit(serious ? 1 : 0);
