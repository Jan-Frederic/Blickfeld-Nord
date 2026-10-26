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
// Die Prüfung wartet fast nur (Laden, Scrollen) – mehrere Tabs gleichzeitig verkürzen sie deutlich.
const TABS = 4;

/** jede Seite einmal durch `pruefe` schicken, mit TABS Tabs parallel; Ergebnisse in Seitenreihenfolge */
async function parallel(neuerTab, pruefe) {
  const ergebnis = new Array(pages.length);
  let naechste = 0;
  await Promise.all(
    Array.from({ length: TABS }, async () => {
      const tab = await neuerTab();
      while (naechste < pages.length) {
        const i = naechste++;
        ergebnis[i] = await pruefe(tab, pages[i]);
      }
    }),
  );
  return ergebnis;
}

async function scrollen(tab, pause) {
  // nach unten scrollen, damit per @defer nachgeladene Abschnitte erscheinen
  await tab.evaluate(async (pause) => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, pause));
    }
  }, pause);
}

// bypassCSP: axe wird als Skript in die Seite gelegt – das blockt die Content-Security-Policy der Seite sonst (zu Recht)
const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'de-DE', bypassCSP: true });
// Zählpixel und externe Einbettungen spielen für den Check keine Rolle
await desktop.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());

// WCAG-Prüfung mit axe-core
async function axePruefung(page, path) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await scrollen(page, 60);
  await page.waitForTimeout(400);
  await page.addScriptTag({ content: AXE });
  const result = await page.evaluate(() =>
    // eslint-disable-next-line no-undef
    axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }),
  );
  return result.violations.map((v) => {
    const bad = v.impact === 'serious' || v.impact === 'critical';
    const where = v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ');
    return { bad, text: `${bad ? '::error::' : '::warning::'}${path}: [${v.impact}] ${v.id} – ${v.help} (${v.nodes.length}×: ${where})` };
  });
}

// Handy-Breite: nichts darf über den rechten Rand ragen – auch nicht bei 15 % größerer Schrift (Textgröße im
// Handy-Browser) und mit aufgeklappten Listen. Gemessen wird am Element, weil html/body überstehendes ohnehin abschneiden.
// niederländischer Browser: deutsche Seiten zeigen dabei den Sprachhinweis – der darf auch nicht überstehen
const handy = await browser.newContext({ viewport: { width: 360, height: 780 }, locale: 'nl-NL', bypassCSP: true });
await handy.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
// GoatCounter-Zähler mit Beispielzahlen beantworten – sonst bleiben Besucher- und Kampagnen-Tabellen im Backstage leer
// und werden nie bei Handy-Breite geprüft
await handy.route(/goatcounter\.com\/counter\//, (route) =>
  route.fulfill({ contentType: 'application/json', body: JSON.stringify({ count: '1.234' }) }),
);

async function handyPruefung(phone, path) {
  await phone.goto(BASE + path, { waitUntil: 'networkidle' });
  await scrollen(phone, 40);
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
      // „Blätter“ (ohne Kind-Elemente) und Bedienelemente wie Auswahllisten, deren Kinder (option) nicht gezeichnet werden
      .filter((el) => (!el.children.length || ['SELECT', 'BUTTON', 'INPUT', 'TEXTAREA'].includes(el.tagName)))
      .filter((el) => el.getBoundingClientRect().right > vw + 1 && !clippedInside(el))
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()} „${el.textContent.trim().slice(0, 30)}“ bis ${Math.round(el.getBoundingClientRect().right)} px`);
  });
  return offenders.length ? [{ bad: true, text: `::error::${path}: ragt auf dem Handy (360 px, Schrift +15 %) über den Rand: ${offenders.join(' | ')}` }] : [];
}

// Desktop- und Handy-Prüfung laufen gleichzeitig
const [axeMeldungen, handyMeldungen] = await Promise.all([
  parallel(() => desktop.newPage(), axePruefung),
  parallel(() => handy.newPage(), handyPruefung),
]);
const meldungen = [...axeMeldungen.flat(), ...handyMeldungen.flat()];
for (const m of meldungen) console.log(m.text);
const serious = meldungen.filter((m) => m.bad).length;
const minor = meldungen.length - serious;

await browser.close();
close();

console.log(`Barrierefreiheit und Handy-Breite: ${pages.length} Seiten geprüft, ${serious} schwere und ${minor} leichte Verstöße.`);
process.exit(serious ? 1 : 0);
