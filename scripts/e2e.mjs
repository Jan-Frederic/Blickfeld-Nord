#!/usr/bin/env node
// Automatische Klicktests vor jedem Deploy: wichtige Abläufe wie ein echter Besucher durchklicken.
// Jeder Test läuft in einem frischen Browser (leerer Speicher). Ein Fehler stoppt den Deploy.
// Aufruf nach Build, seo.mjs, SPA-Fallback und build-sw.mjs:  node scripts/e2e.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
import { serve } from './lib/static-server.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist', 'blickfeld-nord', 'browser');
const { base: BASE, close } = serve(DIST);
const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
const concerts = [...sitemap.matchAll(/<loc>https:\/\/blickfeld-nord\.de(\/konzerte\/[^<]+)<\/loc>/g)].map((m) => m[1]);

const browser = await chromium.launch();
const tests = [];
const test = (name, fn, options = {}) => tests.push({ name, fn, options });
function expect(ok, message) {
  if (!ok) throw new Error(message);
}
// Bedingung bis zu 5 s lang wiederholt prüfen – Angular aktualisiert die Ansicht erst kurz nach dem Klick
async function until(check, message) {
  for (let i = 0; i < 50; i++) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(message);
}

async function page(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', acceptDownloads: true, locale: 'de-DE', ...options });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
  const p = await context.newPage();
  p.setDefaultTimeout(10_000);
  p.on('dialog', (d) => (d.type() === 'prompt' ? d.accept('Testvorlage') : d.accept()));
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.go = async (path) => {
    await p.goto(BASE + path, { waitUntil: 'networkidle' });
    await p.waitForTimeout(300);
  };
  p.errors = errors;
  return p;
}

// ---- Öffentliche Seiten ------------------------------------------------------------------------------

test('Startseite: Konzertliste führt zur Konzertseite, Abo-Button vorhanden', async () => {
  const p = await page();
  await p.go('/');
  await p.locator('app-tour').scrollIntoViewIfNeeded();
  await p.locator('app-tour tr.link').first().waitFor();
  expect((await p.locator('app-abo-button a[mat-flat-button]').getAttribute('href'))?.startsWith('webcal://'), 'Abo-Link ist kein webcal://-Link');
  await p.locator('app-tour tr.link td.mat-column-city').first().click();
  await p.waitForURL(/\/konzerte\//);
  await p.locator('app-konzert h2').waitFor();
  expect((await p.locator('app-konzert .actions').innerText()).includes('Teilen'), 'Konzertseite ohne Teilen-Button');
  return p;
});

test('Konzertseite: vergangenes Konzert zeigt Rückblick', async () => {
  const p = await page();
  for (const c of concerts) {
    await p.go(c + '/');
    if (await p.locator('app-konzert .recap').count()) return p;
  }
  expect(false, 'keine Konzertseite mit Rückblick gefunden');
});

test('Booking: freier Tag im Kalender → Anfrage-Assistent in 3 Schritten', async () => {
  const p = await page();
  await p.go('/booking/');
  await p.locator('app-entfernung input').fill('Haldern');
  await until(async () => (await p.locator('app-entfernung .result').count()) && (await p.locator('app-entfernung .result').innerText()).includes('das passt'), 'Entfernungs-Check kennt den Ortsteil Haldern nicht');
  await p.locator('app-entfernung input').fill('Berlin');
  await until(async () => (await p.locator('app-entfernung .result').innerText()).includes('Tournee'), 'Entfernungs-Check antwortet bei Berlin nicht');
  const free = p.locator('app-availability button.day.free').first();
  await free.click();
  await until(async () => /^\d{4}-\d{2}-\d{2}$/.test(await p.locator('app-anfrage input[type=date]').inputValue()), 'Datum wurde nicht übernommen');
  const step = (n) => until(async () => (await p.locator('app-anfrage .steps li.active span').innerText()) === String(n), `Assistent kommt nicht zu Schritt ${n}`);
  const next = async () => {
    await until(() => p.locator('app-anfrage .nav .primary').isEnabled(), '„Weiter“ bleibt gesperrt');
    await p.locator('app-anfrage .nav .primary').click();
  };
  await p.locator('app-anfrage input').nth(2).fill('Festzelt, Bocholt');
  await next();
  await step(2);
  await p.locator('app-anfrage .chips button').first().click();
  await p.locator('app-anfrage input[type=number]').fill('150');
  await next();
  await step(3);
  await p.locator('app-anfrage input').first().fill('Test Veranstalter');
  await p.locator('app-anfrage input[type=email]').fill('test@example.org');
  const mail = await p.locator('app-anfrage pre.summary').innerText();
  expect(mail.includes('Festzelt, Bocholt') && mail.includes('ca. 150') && mail.includes('Test Veranstalter'), 'E-Mail-Vorschau unvollständig');
  expect(await p.locator('app-anfrage button[type=submit]').isEnabled(), '„E-Mail erstellen“ ist gesperrt');
  return p;
});

test('Booking NL: Entfernungs-Check und niederländische Anfrage', async () => {
  const p = await page();
  await p.go('/nl/booking/');
  await p.locator('app-entfernung input').fill('Winterswijk');
  await until(async () => (await p.locator('app-entfernung .result').count()) && (await p.locator('app-entfernung .result').innerText()).includes('dat past'), 'Entfernungs-Check meldet Winterswijk nicht als passend');
  await p.locator('app-entfernung input').fill('7091');
  await until(async () => (await p.locator('app-entfernung .result').innerText()).includes('Postcode 7091'), 'Entfernungs-Check erkennt die Postcode 7091 nicht');
  expect((await p.locator('app-anfrage h3').innerText()).toLowerCase().includes('offerte'), 'Anfrage nicht auf Niederländisch');
  expect((await p.locator('app-faq h3').innerText()).toLowerCase().includes('veelgestelde'), 'FAQ nicht auf Niederländisch');
  return p;
});

test('Sprachen: Umschalter wechselt auf dieselbe Seite in Englisch, alte Adresse leitet weiter', async () => {
  const p = await page();
  await p.go('/repertoire/');
  await p.locator('nav.languages a[hreflang=en]').click();
  await until(async () => new URL(p.url()).pathname.replace(/\/$/, '') === '/en/repertoire', 'Umschalter führt nicht zu /en/repertoire');
  await until(async () => (await p.locator('html').getAttribute('lang')) === 'en', 'Seite nicht auf Englisch (lang-Attribut)');
  await until(async () => (await p.locator('footer').innerText()).toLowerCase().includes('all rights reserved'), 'Fußzeile nicht auf Englisch');
  await p.go('/booking/en/');
  await until(async () => new URL(p.url()).pathname.replace(/\/$/, '') === '/en/booking', 'alte Adresse /booking/en leitet nicht weiter');
  return p;
});

test('Sprachhinweis: niederländischer Browser bekommt die niederländische Seite vorgeschlagen', async () => {
  const p = await page({ locale: 'nl-NL' });
  await p.go('/technik/');
  const hint = p.locator('app-sprach-hinweis aside');
  await until(async () => (await hint.count()) === 1, 'kein Sprachhinweis für niederländischen Browser');
  expect((await hint.getAttribute('lang')) === 'nl', 'Hinweis nicht auf Niederländisch');
  await hint.locator('a').click();
  await until(async () => new URL(p.url()).pathname.replace(/\/$/, '') === '/nl/technik', 'Hinweis führt nicht zu /nl/technik');
  await until(async () => (await hint.count()) === 0, 'Hinweis bleibt nach der Wahl stehen');
  await p.go('/');
  await p.waitForTimeout(500);
  expect((await hint.count()) === 0, 'Hinweis erscheint nach der Wahl erneut');
  return p;
});

test('Technik: Klick auf einen Musiker im Bühnenplan öffnet sein Setup', async () => {
  const p = await page();
  await p.go('/technik/');
  await p.locator('app-technik-aufbau g[aria-label^="Fred"]').click();
  const dialog = p.locator('app-hardware-dialog dialog[open]');
  await dialog.waitFor();
  await until(async () => (await dialog.innerText()).includes('Boss RC-5'), 'Setup-Dialog zeigt nicht Freds Pedalboard');
  await dialog.locator('button.close').click();
  await until(async () => (await dialog.count()) === 0, 'Setup-Dialog schließt nicht');
  await p.locator('app-technik-aufbau g[aria-label^="Matthias"]').click();
  await until(async () => (await dialog.innerText()).includes('Galgen'), 'Klick auf M öffnet nicht Matthias’ Setup');
  return p;
});

test('Repertoire: Suche findet Songs', async () => {
  const p = await page();
  await p.go('/repertoire/');
  const input = p.locator('app-repertoire input[type=search]');
  await input.fill('Hallelujah');
  await until(async () => (await p.locator('app-repertoire').innerText()).includes('Leonard Cohen'), 'Suche nach „Hallelujah“ ohne Treffer');
  return p;
});

test('Handy: Menü öffnet sich, Seite verschiebt sich nicht seitlich', async () => {
  const p = await page({ ...devices['Pixel 7'] });
  await p.go('/');
  await p.locator('button.mobile-nav').click();
  const menu = p.locator('#hauptmenue');
  await menu.locator('a, button').first().waitFor();
  await p.keyboard.press('Escape');
  await until(async () => !(await menu.isVisible()), 'Menü schließt nicht mit Esc');
  // Menüpunkt führt zur Seite und schließt das Menü
  await p.locator('button.mobile-nav').click();
  await menu.locator('a[href="/galerie"]').click();
  await p.waitForURL(/\/galerie/);
  await until(async () => !(await menu.isVisible()), 'Menü bleibt nach dem Klick offen');
  await p.mouse.wheel(300, 0);
  expect((await p.evaluate(() => scrollX)) === 0, 'Seite lässt sich seitlich verschieben');
  return p;
});

// ---- Backstage ---------------------------------------------------------------------------------------

test('Backstage: Übersetzung als passend markieren', async () => {
  const p = await page();
  await p.go('/backstage/uebersetzungen/');
  const first = p.locator('app-uebersetzungen-pruefen .list > li').first();
  await first.waitFor();
  const before = await p.locator('app-uebersetzungen-pruefen .progress').innerText();
  await first.locator('textarea').fill('Vocals and guitar');
  await first.locator('button.pass').click();
  await until(async () => (await p.locator('app-uebersetzungen-pruefen .progress').innerText()) !== before, 'Zähler ändert sich nicht');
  await until(async () => (await p.locator('app-uebersetzungen-pruefen .apply strong').innerText()) === '1', 'Entscheidung wird nicht gezählt');
  await p.reload({ waitUntil: 'networkidle' });
  await until(async () => (await p.locator('app-uebersetzungen-pruefen .apply strong').innerText()) === '1', 'Entscheidung nach Neuladen weg');
  return p;
});

test('Backstage: Übersicht führt in die Bereiche, Direktaufruf eines Bereichs klappt', async () => {
  const p = await page();
  await p.go('/backstage/');
  await p.locator('app-backstage .tiles a', { hasText: 'Material' }).click();
  await until(async () => new URL(p.url()).pathname.replace(/\/$/, '') === '/backstage/material', 'Kachel „Material“ führt nicht zu /backstage/material');
  await until(async () => (await p.locator('app-backstage-nav a.on').innerText()).includes('Material'), 'Navigation markiert den Bereich nicht');
  // Direktaufruf (z. B. Lesezeichen) geht über die Fehlerseite – muss im richtigen Bereich landen
  await p.go('/backstage/zahlen/');
  await until(async () => new URL(p.url()).pathname.replace(/\/$/, '') === '/backstage/zahlen', 'Direktaufruf /backstage/zahlen landet woanders');
  await p.locator('app-backstage-besucher').waitFor();
  return p;
});

test('Backstage: Aufgaben zeigen erkannte Punkte, Abhaken bleibt nach dem Neuladen', async () => {
  const p = await page();
  await p.go('/backstage/aufgaben/');
  await p.locator('app-backstage-aufgaben .item').first().waitFor();
  expect((await p.locator('app-backstage-aufgaben').innerText()).includes('offene Technik-Angaben'), 'Technik-Lücken werden nicht erkannt');
  const box = p.locator('app-backstage-aufgaben input[type=checkbox]:not([disabled])').first();
  await box.check();
  await p.reload({ waitUntil: 'networkidle' });
  await until(async () => await p.locator('app-backstage-aufgaben input[type=checkbox]:checked').count() >= 1, 'Häkchen nach Neuladen weg');
  return p;
});

test('Backstage: Probe planen – Song und Punkt bleiben nach dem Neuladen', async () => {
  const p = await page();
  await p.go('/backstage/termine/');
  await p.locator('a.row-link', { hasText: 'Probe' }).first().click();
  await p.waitForURL(/\/backstage\/probe\//);
  await p.locator('app-backstage-probe input[type=search]').fill('Millionen');
  await p.locator('app-backstage-probe .hits button').first().click();
  await p.locator('app-backstage-probe form.add input').fill('Kabel besorgen');
  await p.locator('app-backstage-probe form.add button').click();
  await p.reload({ waitUntil: 'networkidle' });
  await until(async () => (await p.locator('app-backstage-probe .list li').count()) === 2, 'Song und Punkt nach Neuladen weg');
  return p;
});

test('Backstage: Filter kombinieren, sortieren, Auftritt öffnen', async () => {
  const p = await page();
  await p.go('/backstage/termine/');
  const rows = () => p.locator('tr.mat-mdc-row').count();
  const filter = (t) => p.locator('.filters button', { hasText: t });
  for (const t of ['Ausstehende', 'Probe', 'Vergangene']) if ((await filter(t).getAttribute('aria-pressed')) !== 'true') await filter(t).click();
  await until(async () => (await p.locator('.filters button[aria-pressed=true]').count()) === 3, 'Filter lassen sich nicht alle aktivieren');
  const all = await rows();
  await filter('Probe').click();
  await until(async () => (await rows()) < all, 'Filter „Probetermine“ ändert nichts');
  await p.locator('button.sort', { hasText: 'Status' }).click();
  await until(async () => (await p.locator('th[aria-sort]').innerText()).includes('Status'), 'Sortierung nach Status nicht aktiv');
  await p.locator('button.sort', { hasText: 'Datum' }).click();
  await p.locator('tr.link td.mat-column-status').first().click();
  await p.waitForURL(/\/backstage\/\d{4}-\d{2}-\d{2}/);
  await p.locator('.tools a').first().waitFor();
  return p;
});

test('Backstage: Setlist mit Spieldauer, Vorlage, Laufzettel', async () => {
  const p = await page();
  const id = concerts[concerts.length - 1].split('/')[2];
  await p.go(`/backstage/${id}/setlist`);
  const add = p.locator('app-setlist .pick li button');
  for (let i = 0; i < 4; i++) await add.first().click();
  await p.locator('app-setlist button', { hasText: 'Pause' }).click();
  await add.first().click();
  await until(async () => /\d+ min/.test(await p.locator('app-setlist .count').innerText()), 'keine Spieldauer in der Setlist');
  expect((await p.locator('app-setlist .pause-label').innerText()).includes('Set davor'), 'Pause ohne Set-Dauer');
  await p.locator('app-setlist-vorlagen button', { hasText: 'Als Vorlage speichern' }).click();
  await until(async () => (await p.locator('app-setlist-vorlagen option').count()) === 1, 'Vorlage nicht gespeichert');
  await p.go(`/backstage/${id}`);
  const [win] = await Promise.all([p.context().waitForEvent('page'), p.locator('button', { hasText: 'Laufzettel' }).click()]);
  await win.waitForLoadState();
  expect((await win.title()).startsWith('Laufzettel'), 'Laufzettel öffnet sich nicht');
  expect((await win.locator('.set').count()) === 2, 'Laufzettel ohne die zwei Sets');
  return p;
});

test('Backstage: Vor Ort berechnet Abfahrt, Daten lassen sich exportieren und importieren', async () => {
  const p = await page();
  const id = concerts[concerts.length - 1].split('/')[2];
  await p.go(`/backstage/${id}/vorort`);
  await p.locator('app-vorort input').first().fill('Test Kontakt');
  await p.locator('app-vorort input').nth(2).fill('15:30');
  await p.locator('app-vorort .trip input[type=number]').first().fill('25');
  await until(async () => (await p.locator('app-vorort .departure').innerText()).includes('14:50'), 'Abfahrtszeit falsch berechnet');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('app-backstage-sync button').click()]);
  const file = await dl.path();
  const q = await page();
  await q.go('/backstage/abgleich/');
  await q.locator('app-backstage-sync input[type=file]').setInputFiles(file);
  await q.waitForTimeout(1500);
  await q.go(`/backstage/${id}/vorort`);
  expect((await q.locator('app-vorort input').first().inputValue()) === 'Test Kontakt', 'Import hat die Vor-Ort-Angaben nicht übernommen');
  return p;
});

test('Kalender-Dateien und Service Worker sind vorhanden', async () => {
  const p = await page();
  for (const f of ['/konzerte.ics', '/en/konzerte.ics', '/nl/konzerte.ics', '/backstage/kalender.ics', '/sw.js', '/site.webmanifest']) {
    const res = await p.request.get(BASE + f);
    expect(res.ok(), `${f} fehlt`);
  }
  const ics = await (await p.request.get(BASE + '/backstage/kalender.ics')).text();
  expect(ics.includes('Probe Blickfeld Nord'), 'Backstage-Kalender ohne Proben');
  const nl = await (await p.request.get(BASE + '/nl/konzerte.ics')).text();
  expect(nl.includes('X-WR-CALNAME:Blickfeld Nord – Optredens') && nl.includes('blickfeld-nord.de/nl'), 'Kalender-Abo nicht auf Niederländisch');
  return p;
});

// ---- Ausführen ---------------------------------------------------------------------------------------

let failed = 0;
for (const t of tests) {
  const start = Date.now();
  try {
    const p = await t.fn();
    if (p?.errors?.length) throw new Error('JavaScript-Fehler: ' + p.errors[0]);
    console.log(`✓ ${t.name} (${((Date.now() - start) / 1000).toFixed(1)} s)`);
  } catch (e) {
    failed++;
    console.log(`::error::✗ ${t.name}: ${e.message.split('\n')[0]}`);
  }
}
await browser.close();
close();
console.log(`Klicktests: ${tests.length - failed} von ${tests.length} bestanden.`);
process.exit(failed ? 1 : 0);
