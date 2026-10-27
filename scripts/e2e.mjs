#!/usr/bin/env node
// Automatische Klicktests vor jedem Deploy: wichtige Abläufe wie ein echter Besucher durchklicken.
// Jeder Test läuft in einem frischen Browser (leerer Speicher). Ein Fehler stoppt den Deploy.
// Aufruf nach Build, seo.mjs, SPA-Fallback und build-sw.mjs:  node scripts/e2e.mjs
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
  throw new Error(typeof message === 'function' ? await message() : message);
}

async function page(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', acceptDownloads: true, locale: 'de-DE', ...options });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
  const p = await context.newPage();
  p.setDefaultTimeout(10_000);
  p.on('dialog', (d) => (d.type() === 'prompt' ? d.accept(p.promptAntwort ?? 'Testvorlage') : d.accept()));
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  // von der Content-Security-Policy blockierte Skripte, Styles oder Verbindungen sind ebenfalls Fehler
  p.on('console', (m) => m.type() === 'error' && /Content Security Policy/i.test(m.text()) && errors.push(m.text()));
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

test('Herkunft: QR-Code-Vermerk ?ref= und Kampagne werden gezählt und aus der Adresse entfernt', async () => {
  const p = await page();
  // GoatCounter nachstellen: Aufrufe samt Adresse merken statt senden (count.js schickt location.search als „q“ mit –
  // daraus liest GoatCounter ref und utm_campaign)
  await p.route('https://gc.zgo.at/count.js', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: 'window.goatcounter = { count: (v) => (window.__gc = window.__gc || []).push({ ...v, q: location.search }) };' }),
  );
  const id = concerts[0].split('/').filter(Boolean).pop();
  await p.go(`${concerts[0]}?ref=plakat&utm_campaign=konzert-${id}`);
  await until(async () => (await p.evaluate(() => (window.__gc || []).length)) >= 2, 'GoatCounter wurde nicht aufgerufen');
  const calls = await p.evaluate(() => window.__gc);
  expect(calls.some((c) => c.path === 'von-plakat' && c.event), `kein Herkunfts-Ereignis: ${JSON.stringify(calls)}`);
  expect(
    calls.some((c) => !c.event && c.q.includes('ref=plakat') && c.q.includes(`utm_campaign=konzert-${id}`)),
    `Seitenaufruf ohne ref/utm_campaign in der Adresse: ${JSON.stringify(calls)}`,
  );
  expect(calls.some((c) => c.path === `kampagne-konzert-${id}-plakat` && c.event), `kein Kampagnen-Ereignis: ${JSON.stringify(calls)}`);
  expect(!calls.some((c) => !c.event && c.path.includes('ref=')), 'Seitenaufruf mit Vermerk im Pfad gezählt');
  await until(async () => !p.url().includes('ref=') && !p.url().includes('utm_campaign'), `Vermerk bleibt in der Adresse: ${p.url()}`);
  // unbekannter Vermerk: kein Ereignis, Adresse trotzdem bereinigt
  await p.go('/?ref=irgendwas');
  await until(async () => !p.url().includes('ref='), 'unbekannter Vermerk bleibt in der Adresse');
  const nachher = await p.evaluate(() => window.__gc);
  expect(!nachher.some((c) => c.path === 'von-irgendwas'), 'unbekannter Vermerk wurde gezählt');
  // Booking-Anfrage per Mail-Link zählt – mit der Herkunft dieses Besuchs (Plakat)
  await p.go('/booking');
  await p.locator('app-booking p.mail a').click();
  await until(async () => (await p.evaluate(() => window.__gc)).some((c) => c.path === 'anfrage-mail'), 'Anfrage nicht gezählt');
  expect((await p.evaluate(() => window.__gc)).some((c) => c.path === 'anfrage-von-plakat'), 'Anfrage ohne Herkunft gezählt');
  // Fehlerseite zählt – gesamt und mit der aufgerufenen Adresse
  await p.go('/gibt-es-nicht');
  await until(async () => (await p.evaluate(() => window.__gc)).some((c) => c.path === '404:/gibt-es-nicht'), 'Fehlerseite nicht gezählt');
  expect((await p.evaluate(() => window.__gc)).some((c) => c.path === 'fehlerseite'), 'Fehlerseite ohne Summe gezählt');
  return p;
});

test('Jahresrückblick: Zahlen und Stationen, private Feiern nur mit öffentlichem Namen', async () => {
  const p = await page();
  await p.clock.setFixedTime(new Date('2026-12-20T12:00:00+01:00'));
  await p.go('/jahr/2026');
  await p.locator('app-jahr h2').waitFor();
  expect((await p.locator('app-jahr h2').innerText()).includes('2026'), 'Überschrift ohne Jahr');
  expect((await p.locator('app-jahr .zahlen li').count()) >= 3, 'Zahlen fehlen');
  const stationen = await p.locator('app-jahr .stationen').innerText();
  expect(stationen.includes('Weihnachtsmarkt'), 'öffentlicher Auftritt fehlt in den Stationen');
  expect((await p.locator('app-jahr .stationen a').count()) > 0, 'keine Links zu Konzertseiten');
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

test('Booking NL: Entfernungs-Check, niederländische Anfrage und FAQ-Seite', async () => {
  const p = await page();
  await p.go('/nl/booking/');
  await p.locator('app-entfernung input').fill('Winterswijk');
  await until(async () => (await p.locator('app-entfernung .result').count()) && (await p.locator('app-entfernung .result').innerText()).includes('dat past'), 'Entfernungs-Check meldet Winterswijk nicht als passend');
  await p.locator('app-entfernung input').fill('7091');
  await until(async () => (await p.locator('app-entfernung .result').innerText()).includes('Postcode 7091'), 'Entfernungs-Check erkennt die Postcode 7091 nicht');
  expect((await p.locator('app-anfrage h3').innerText()).toLowerCase().includes('offerte'), 'Anfrage nicht auf Niederländisch');
  await p.locator('app-booking .faq-hinweis a').click();
  await until(async () => (await p.locator('app-faq-page h2').count()) && (await p.locator('app-faq-page h2').innerText()).toLowerCase().includes('veelgestelde'), 'FAQ-Seite nicht auf Niederländisch');
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
  await until(async () => ((await p.locator('#hauptmenue a.on').textContent()) ?? '').includes('Material'), 'Navigation markiert den Bereich nicht');
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

test('Backstage: Werbeplan – „Heute fällig“ kopiert den Text mit Kampagne, Abhaken gilt überall', async () => {
  // Uhr auf 14 Tage vor ein öffentliches Konzert stellen: dann ist „Erste Story“ fällig
  const id = concerts[0].split('/').filter(Boolean).pop();
  const tag = new Date(`${id.slice(0, 10)}T10:00:00`);
  tag.setDate(tag.getDate() - 14);
  const p = await page({ permissions: ['clipboard-read', 'clipboard-write'] });
  await p.clock.setFixedTime(tag);
  await p.go('/backstage/');
  const eintrag = p.locator('app-heute-faellig li', { hasText: 'Erste Story' }).first();
  await eintrag.waitFor();
  await eintrag.locator('button').click();
  await until(async () => (await p.evaluate(() => navigator.clipboard.readText())).includes('In zwei Wochen'), 'Story-Text nicht kopiert');
  const text = await p.evaluate(() => navigator.clipboard.readText());
  expect(text.includes(`utm_campaign=konzert-${id}`) && text.includes('ref=text'), `Link ohne Herkunft/Kampagne: ${text}`);
  await eintrag.locator('input[type=checkbox]').check();
  await until(async () => (await p.locator('app-heute-faellig li', { hasText: 'Erste Story' }).count()) === 0, 'Schritt bleibt nach dem Abhaken in „Heute fällig“');
  await p.go(`/backstage/${id}/`);
  await until(async () => await p.locator('#wp-story-1').isChecked(), 'Haken fehlt im Werbeplan des Auftritts');
  await p.go('/backstage/aufgaben/');
  await p.locator('app-backstage-aufgaben .item').first().waitFor();
  expect(!(await p.locator('app-backstage-aufgaben').innerText()).includes('Erste Story'), 'abgehakter Schritt steht noch unter Aufgaben');
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

test('Backstage: Bühnenplan – Gerät per Ziehen und Pfeiltaste verschieben', async () => {
  const p = await page();
  await p.go('/backstage/buehnenplan/');
  const amp = p.locator('app-technik-aufbau g[aria-label^="Bass-Amp"], app-technik-aufbau g[aria-label^="Bassverstärker"]').first();
  const box = await amp.boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down();
  await p.mouse.move(box.x + box.width / 2 - 60, box.y + box.height / 2 + 20, { steps: 5 });
  await p.mouse.up();
  await until(async () => (await p.locator('app-backstage-buehnenplan .apply').innerText()).includes('Bassverstärker'), 'Ziehen verschiebt nichts');
  await p.locator('app-technik-aufbau g[aria-label^="Mischpult"]').focus();
  await p.keyboard.press('ArrowRight');
  await until(async () => (await p.locator('app-backstage-buehnenplan .apply').innerText()).includes('Mischpult'), 'Pfeiltaste verschiebt nichts');
  return p;
});

test('Backstage: Songs – Tonart und Tempo bleiben als Entwurf erhalten', async () => {
  const p = await page();
  await p.go('/backstage/songs/');
  await p.locator('app-backstage-songs input[type=search]').fill('Millionen');
  // Zeile der Tabelle anklicken öffnet den Dialog
  await p.locator('app-backstage-songs tbody tr').first().click();
  const zeile = p.locator('app-song-dialog dialog[open]');
  await zeile.locator('select').first().selectOption('G');
  await zeile.locator('input[type=number]').fill('120');
  await zeile.locator('input[type=number]').blur();
  await until(async () => (await p.locator('app-backstage-songs .apply').innerText()).includes('1 Song geändert'), 'Änderung wird nicht gezählt');
  await p.reload({ waitUntil: 'networkidle' });
  await p.locator('app-backstage-songs input[type=search]').fill('Millionen');
  await until(async () => (await p.locator('app-backstage-songs tbody tr').first().innerText()).includes('120 bpm'), 'Entwurf nach Neuladen nicht in der Tabelle');
  await p.locator('app-backstage-songs tbody tr .oeffnen').first().click();
  await until(async () => (await zeile.locator('select').first().inputValue()) === 'G', 'Entwurf nach Neuladen weg');
  // der Entwurf gilt auf diesem Gerät sofort im Bühnen-Modus
  const id = concerts[concerts.length - 1].split('/')[2];
  await p.go(`/backstage/${id}/setlist`);
  await p.locator('app-setlist .pick input[type=search]').fill('Millionen');
  await p.locator('app-setlist .pick li button').first().click();
  // auf dem Handy darf die Zeile mit Tonart/Tempo den Titel nicht zusammenquetschen
  await p.setViewportSize({ width: 360, height: 780 });
  await until(async () => (await p.locator('app-setlist .list li .info').innerText().catch(() => '')).includes('120 bpm'), 'Tonart/Tempo fehlen in der Setlist');
  const breite = (await p.locator('app-setlist .list li .song').first().boundingBox())?.width ?? 0;
  expect(breite > 120, `Titelspalte der Setlist auf ${Math.round(breite)} px zusammengequetscht`);
  await p.setViewportSize({ width: 1280, height: 900 });
  await p.getByRole('button', { name: /Bühnen-Modus/ }).first().click();
  await until(async () => (await p.locator('app-setlist-buehne .key').innerText().catch(() => '')) === 'G', 'Tonart aus dem Entwurf fehlt im Bühnen-Modus');
  expect((await p.locator('app-setlist-buehne .bpm').innerText()).includes('120 bpm'), 'Tempo aus dem Entwurf fehlt im Bühnen-Modus');
  // Klick blinkt zunächst ohne Ton; der Ton ist eigens zuschaltbar
  await p.locator('app-setlist-buehne .bpm').click();
  await until(async () => (await p.locator('app-setlist-buehne .ton[aria-pressed]').getAttribute('aria-pressed').catch(() => null)) === 'false', 'Klick startet nicht stumm');
  await p.locator('app-setlist-buehne .ton[aria-pressed]').click();
  await until(async () => (await p.locator('app-setlist-buehne .ton[aria-pressed]').getAttribute('aria-pressed')) === 'true', 'Ton lässt sich nicht zuschalten');
  // Tempo-Trainer: 100 → 90 % macht aus 120 bpm 108 bpm
  await p.locator('app-setlist-buehne .tempo').click();
  await until(async () => (await p.locator('app-setlist-buehne .bpm').innerText()).includes('108 bpm'), 'Übungstempo 90 % wird nicht übernommen');
  // Songs → Setlists listet die Setlist dieses Auftritts mit Tonart und Tempo
  await p.keyboard.press('Escape');
  await p.go('/backstage/songs/setlists/');
  await until(async () => (await p.locator('app-songs-setlists article').first().innerText().catch(() => '')).includes('G · 120 bpm'), 'Setlist fehlt unter Songs → Setlists');
  return p;
});

test('Backstage: Songs – Tap-Tempo, Band-Tonart mit Capo; Setlist glättet Tonartsprünge, feste Vorlage', async () => {
  const p = await page();
  await p.go('/backstage/songs/');
  await p.locator('app-backstage-songs input[type=search]').fill('Iris');
  await p.locator('app-backstage-songs tbody tr').first().click();
  const zeile = p.locator('app-song-dialog dialog[open]');
  await until(async () => (await zeile.count()) === 1, 'Dialog öffnet nicht');
  expect((await zeile.innerText()).includes('Recherche:'), 'Quelle der recherchierten Werte fehlt');
  await zeile.locator('select').nth(1).selectOption('C');
  await zeile.locator('select').nth(2).selectOption('2');
  // fünfmal im Abstand von 500 ms tippen = 120 bpm
  for (let i = 0; i < 5; i++) {
    await zeile.locator('button.tap').click();
    await p.waitForTimeout(500);
  }
  const bpm = Number(await zeile.locator('input[type=number]').inputValue());
  expect(bpm >= 105 && bpm <= 135, `Tap-Tempo ergibt ${bpm} statt etwa 120 bpm`);
  // aus dem Dialog in den Bühnen-Modus und zurück in den Dialog
  await zeile.locator('button', { hasText: 'Bühnen-Modus' }).click();
  await until(async () => (await p.locator('app-setlist-buehne .key').innerText().catch(() => '')) === 'C', 'Bühnen-Modus aus dem Dialog zeigt nicht den Song');
  await p.keyboard.press('Escape');
  await p.keyboard.press('Escape');
  await until(async () => (await p.locator('app-setlist-buehne').count()) === 0 && (await zeile.count()) === 1, 'Nach dem Bühnen-Modus geht es nicht zurück in den Dialog');

  const id = concerts[concerts.length - 1].split('/')[2];
  await p.go(`/backstage/${id}/setlist`);
  const hinzu = async (titel) => {
    await p.locator('app-setlist .pick input[type=search]').fill(titel);
    const vorher = await p.locator('app-setlist .list li .no').count();
    await p.locator('app-setlist .pick li button').first().click();
    await until(async () => (await p.locator('app-setlist .list li .no').count()) === vorher + 1, `${titel} nicht hinzugefügt`);
  };
  for (const t of ['Hey Jude', 'Perfect', 'Chasing Cars', 'Angels', 'Let It Be', 'Iris']) await hinzu(t);
  await until(async () => (await p.locator('app-setlist .list li .info').last().innerText()).startsWith('C · Capo 2'), 'Band-Tonart mit Capo fehlt in der Setlist');
  await until(async () => (await p.locator('app-setlist .sprung').count()) >= 2, 'Tonartsprünge werden nicht markiert');
  expect(/Überleitung [A-H][#b]?7/.test(await p.locator('app-setlist .sprung').first().innerText()), 'Überleitungsakkord fehlt beim Tonartsprung');
  const vorher = await p.locator('app-setlist .sprung').count();
  await p.locator('app-setlist .uebergaenge button').click();
  await until(async () => (await p.locator('app-setlist .sprung').count()) < vorher, 'Glätten verringert die Tonartsprünge nicht');
  expect((await p.locator('app-setlist .list li .t').first().innerText()) === 'Hey Jude', 'Opener wurde beim Glätten verschoben');
  // feste Vorlage „Weihnachtslieder“ ist auf jedem Gerät da
  await p.locator('app-setlist-vorlagen select').selectOption({ label: /Weihnachtslieder \(fest\)/ }).catch(async () => {
    const i = await p.locator('app-setlist-vorlagen option').evaluateAll((o) => o.findIndex((x) => x.textContent.includes('Weihnachtslieder')));
    await p.locator('app-setlist-vorlagen select').selectOption(String(i));
  });
  await p.locator('app-setlist-vorlagen button', { hasText: 'Übernehmen' }).click();
  await until(async () => (await p.locator('app-setlist .list li .t').allInnerTexts()).join('|') === 'In der Weihnachtsbäckerei|Kleine Kinder, große Kinder (Das Adventskalenderlied)|Weihnacht, was bist du', 'Vorlage „Weihnachtslieder“ fehlt');
  // „Letztes Set auffüllen“ ergänzt bis zur gewählten Länge (45 min), die Vorlage bleibt vorn
  await p.locator('app-setlist-vorschlag button', { hasText: 'auffüllen' }).click();
  await until(async () => (await p.locator('app-setlist .list li .no').count()) >= 8, 'Auffüllen ergänzt das Set nicht');
  expect((await p.locator('app-setlist .list li .t').first().innerText()) === 'In der Weihnachtsbäckerei', 'Auffüllen hat die vorhandenen Songs verändert');
  return p;
});

test('Backstage: Noten – PDF mit Seitenbereich und Akkordblatt im Bühnen-Modus, Weitergabe an ein zweites Gerät', async () => {
  const p = await page();
  await p.go('/backstage/songs/');
  await p.locator('app-backstage-songs input[type=search]').fill('Iris');
  await p.locator('app-backstage-songs tbody tr').first().click();
  const zeile = p.locator('app-song-dialog dialog[open]');
  await zeile.locator('select').nth(1).selectOption('E');
  // Pressekit (mehrseitig) als Notenblatt, davon Seite 2–3
  await zeile.locator('app-noten-editor input[type=file][accept*=pdf]').setInputFiles({ name: 'songbook.pdf', mimeType: 'application/pdf', buffer: readFileSync(join(DIST, 'presse', 'blickfeld-nord-pressekit.pdf')) });
  await until(async () => (await zeile.locator('app-noten-editor .meldung').innerText().catch(() => '')).includes('songbook.pdf'), 'PDF wird nicht gespeichert');
  await zeile.locator('app-noten-editor input[type=number]').first().fill('2');
  await zeile.locator('app-noten-editor input[type=number]').first().blur();
  await zeile.locator('app-noten-editor input[type=number]').nth(1).fill('3');
  await zeile.locator('app-noten-editor input[type=number]').nth(1).blur();
  await zeile.locator('app-noten-editor textarea').fill('{key: D}\n[D]Iris [G/H]Text');
  await zeile.locator('app-noten-editor textarea').blur();
  await until(async () => (await zeile.locator('app-noten-editor .pruefung').innerText().catch(() => '')).includes('2 Akkorde'), 'Akkordblatt wird nicht erkannt');
  await until(async () => (await p.locator('app-backstage-songs tbody tr .noten .tag').allInnerTexts()).join(' ') === 'PDF Akkorde', 'Tabelle zeigt die Noten nicht an');

  const id = concerts[concerts.length - 1].split('/')[2];
  await p.go(`/backstage/${id}/setlist`);
  for (const t of ['Iris', 'Angels']) {
    await p.locator('app-setlist .pick input[type=search]').fill(t);
    await p.locator('app-setlist .pick li button').first().click();
  }
  await until(async () => (await p.locator('app-setlist .list li .no').count()) === 2, 'Songs nicht in der Setlist');
  await p.getByRole('button', { name: /Bühnen-Modus/ }).first().click();
  await p.locator('app-setlist-buehne .noten-knopf').click();
  const kopf = p.locator('app-noten-anzeige header');
  await until(async () => (await kopf.innerText()).includes('Seite 1 / 2'), 'PDF-Seitenbereich wird nicht angezeigt');
  await until(async () => ((await p.locator('app-noten-anzeige canvas').boundingBox())?.width ?? 0) > 100, 'PDF-Seite wird nicht gezeichnet');
  // Pedal/Pfeiltaste: erst die zweite Seite, dann der nächste Song (ohne Noten)
  await p.keyboard.press('ArrowRight');
  await until(async () => (await kopf.innerText()).includes('Seite 2 / 2'), 'Blättern zur zweiten Seite klappt nicht');
  await p.keyboard.press('ArrowRight');
  await until(async () => (await kopf.innerText()).includes('Angels'), 'Am Ende des Blatts geht es nicht zum nächsten Song');
  await p.keyboard.press('ArrowLeft');
  await until(async () => (await kopf.innerText()).includes('Seite 2 / 2'), 'Zurück landet nicht auf der letzten Seite des vorigen Songs');
  // Akkordblatt: geschrieben in D, die Band spielt in E → zwei Halbtöne höher
  await kopf.locator('select.wahl').selectOption({ label: 'Akkorde' });
  await until(async () => (await p.locator('app-noten-anzeige .teil b').allInnerTexts()).join(' ') === 'E A/C#', 'Akkorde werden nicht in die Band-Tonart transponiert');
  expect((await kopf.innerText()).includes('Griffe in E'), 'Griffbild fehlt');
  await p.keyboard.press('Escape');
  await until(async () => (await p.locator('app-noten-anzeige').count()) === 0, 'Escape schließt die Noten nicht');

  // Kontrolle aus Backstage → Songs: ▶ startet den Bühnen-Modus ab diesem Song mit offenen Noten; die zuletzt
  // gewählte Ansicht (Akkorde) bleibt – auch nach dem nächsten Song und zurück
  await p.go('/backstage/songs/');
  await p.locator('app-backstage-songs tbody tr', { hasText: 'Iris' }).locator('.start button').click();
  await until(async () => (await kopf.innerText().catch(() => '')).includes('Iris'), 'Bühnen-Modus startet nicht beim gewählten Song');
  await until(async () => (await p.locator('app-noten-anzeige .teil b').count()) > 0, 'gewählte Ansicht (Akkorde) wird nicht beibehalten');
  await p.keyboard.press('ArrowRight');
  await until(async () => !(await kopf.innerText()).includes('Iris'), 'Pfeiltaste blättert nicht zum nächsten Song der Liste');
  await p.keyboard.press('ArrowLeft');
  await until(async () => (await kopf.innerText()).includes('Iris') && (await p.locator('app-noten-anzeige .teil b').count()) > 0, 'Beim Zurückblättern wechselt die Ansicht');
  await p.keyboard.press('Escape');
  await p.keyboard.press('Escape');
  await until(async () => (await p.locator('app-setlist-buehne').count()) === 0, 'Bühnen-Modus lässt sich nicht schließen');

  // Weitergabe: Datei exportieren und auf einem zweiten Gerät importieren
  await p.go('/backstage/songs/noten/');
  const [download] = await Promise.all([p.waitForEvent('download'), p.locator('app-noten-verwaltung button', { hasText: 'an die Band' }).click()]);
  const datei = readFileSync(await download.path());
  const q = await page();
  await q.go('/backstage/songs/noten/');
  await q.locator('app-noten-verwaltung input[type=file][accept*=json]').setInputFiles({ name: 'noten.json', mimeType: 'application/json', buffer: datei });
  await until(async () => (await q.locator('app-noten-verwaltung .meldung').innerText().catch(() => '')).includes('1 Song'), 'Import auf dem zweiten Gerät klappt nicht');
  expect((await q.locator('app-noten-verwaltung li').innerText()).includes('songbook.pdf'), 'PDF fehlt nach dem Import');
  // .pro-Dateien gesammelt einlesen: Zuordnung über {title:}, Unbekanntes wird gemeldet
  await q.locator('app-noten-verwaltung input.dateien').setInputFiles([
    { name: 'angels.pro', mimeType: 'text/plain', buffer: Buffer.from('{title: Angels}\n{artist: Robbie Williams}\n{key: E}\n[E]I sit and wait') },
    { name: 'gibt-es-nicht.pro', mimeType: 'text/plain', buffer: Buffer.from('{title: Gibt es nicht}\n[C]x') },
  ]);
  await until(async () => (await q.locator('app-noten-verwaltung .meldung').first().innerText().catch(() => '')).includes('1 Akkordblatt eingelesen'), '.pro-Dateien werden nicht eingelesen');
  expect((await q.locator('app-noten-verwaltung').innerText()).includes('gibt-es-nicht.pro'), 'Nicht zugeordnete Datei wird nicht gemeldet');
  // ganzer Ordner: PDFs je Fassung über Titel und Interpret im Dateinamen, Unterordner, Fremdes wird übersprungen
  const ordner = mkdtempSync(join(tmpdir(), 'noten-'));
  mkdirSync(join(ordner, 'Goo Goo Dolls'));
  const pdf = join(DIST, 'presse', 'blickfeld-nord-pressekit.pdf');
  copyFileSync(pdf, join(ordner, 'Iris - The Goo Goo Dolls - Bass.pdf'));
  copyFileSync(pdf, join(ordner, 'Goo Goo Dolls', 'Iris_GooGooDolls_(Gitarre v2).pdf'));
  writeFileSync(join(ordner, 'liesmich.md'), 'x');
  await q.locator('app-noten-verwaltung input.ordner').setInputFiles(ordner);
  await until(async () => (await q.locator('app-noten-verwaltung .meldung').first().innerText().catch(() => '')).includes('2 PDFs eingelesen'), async () => 'Ordner wird nicht eingelesen: ' + (await q.locator('app-noten-verwaltung .meldung').first().innerText().catch(() => '')));
  // Setlists aller Auftritte als eigene Unterseite
  await q.locator('app-backstage-songs nav a', { hasText: 'Setlists' }).click();
  await until(async () => (await q.locator('app-songs-setlists').count()) === 1, 'Unterseite Setlists fehlt');
  await q.locator('app-backstage-songs nav a', { hasText: 'Liste' }).click();
  // drei PDFs bei Iris; im Bühnen-Modus die Fassung „Bass“ wählen – bleibt beim Weiter- und Zurückblättern
  await q.locator('app-backstage-songs input[type=search]').fill('Iris');
  await until(async () => (await q.locator('app-backstage-songs tbody tr .noten .tag').first().innerText().catch(() => '')) === '3 PDFs', 'Mehrere PDFs werden in der Tabelle nicht gezählt');
  await q.locator('app-backstage-songs input[type=search]').fill('');
  await q.locator('app-backstage-songs tbody tr', { hasText: 'Iris' }).locator('.start button').click();
  const wahl = q.locator('app-noten-anzeige select.wahl');
  await until(async () => (await wahl.locator('option').allInnerTexts()).join('|') === 'songbook|Bass|Gitarre v2|Akkorde', async () => 'Fassungen fehlen: ' + (await wahl.locator('option').allInnerTexts().catch(() => [])).join('|'));
  await wahl.selectOption({ label: 'Bass' });
  await until(async () => (await q.locator('app-noten-anzeige header').innerText()).includes('Seite 1 /'), 'Fassung „Bass“ (ganzes PDF) wird nicht angezeigt');
  // durch alle Seiten der Fassung bis zum nächsten Song
  for (let i = 0; i < 20 && (await q.locator('app-noten-anzeige header').innerText()).includes('Iris'); i++) {
    await q.keyboard.press('ArrowRight');
    await q.waitForTimeout(250);
  }
  expect(!(await q.locator('app-noten-anzeige header').innerText()).includes('Iris'), 'Pfeiltaste blättert nicht zum nächsten Song (Auswahlfeld behält den Fokus?)');
  await q.keyboard.press('ArrowLeft');
  await until(async () => (await wahl.inputValue().catch(() => '')) !== '' && (await wahl.locator('option:checked').innerText()) === 'Bass', 'Gewählte Fassung geht beim Zurückblättern verloren');
  await q.keyboard.press('Escape');
  await q.keyboard.press('Escape');
  // einzelne Datei beim Song, ältere Windows-Kodierung mit Umlaut
  await q.locator('app-backstage-songs input[type=search]').fill('Angels');
  await until(async () => (await q.locator('app-backstage-songs tbody tr .noten').first().innerText()).includes('Akkorde'), 'Sammel-Import kennzeichnet den Song nicht');
  await q.locator('app-backstage-songs tbody tr').first().click();
  const engel = q.locator('app-song-dialog dialog[open]');
  await until(async () => (await engel.locator('app-noten-editor textarea').inputValue()).includes('I sit and wait'), 'Akkordblatt aus der .pro-Datei fehlt beim Song');
  await engel.locator('app-noten-editor input[type=file][accept*=".pro"]').setInputFiles({ name: 'angels.cho', mimeType: 'text/plain', buffer: Buffer.from('{title: Angels}\n[E]Grüße', 'latin1') });
  await until(async () => (await engel.locator('app-noten-editor textarea').inputValue()).includes('Grüße'), 'Einzelne .pro-Datei (Windows-Kodierung) wird nicht übernommen');
  for (const x of [p, q]) expect(!x.errors.length, 'Fehler auf der Seite: ' + x.errors.join(' | '));
  return q;
});

test('Backstage: Abgleich – Daten verwalten, vergangene und verwaiste Einträge aufräumen, Stand ersetzen, alles löschen', async () => {
  const p = await page();
  await p.go('/backstage/abgleich/');
  // ein vergangener Auftritt (aus der Sitemap), ein Auftritt, den es nicht gibt, und eine Einstellung
  const alt = concerts[0].split('/')[2];
  await p.evaluate((alt) => {
    for (const k of [`bn-setlist-${alt}`, `bn-packliste-${alt}`, `bn-vorort-${alt}`, 'bn-packliste-2019-01-01']) localStorage.setItem(k, '[{"title":"Iris","artist":"The Goo Goo Dolls"}]');
    localStorage.setItem('bn-buehne-zoom', '1.3');
  }, alt);
  await p.reload({ waitUntil: 'networkidle' });
  // Daten auf diesem Gerät: Einträge verständlich benannt, ändern im Editor, Auswahl löschen
  const daten = p.locator('app-backstage-daten');
  await daten.locator('input[type=search]').fill('vor ort');
  await until(async () => (await daten.locator('li').first().innerText().catch(() => '')).includes('Vor Ort ·'), 'Daten-Übersicht findet den Vor-Ort-Eintrag nicht');
  await daten.locator('input[type=search]').fill('Schriftgröße');
  await daten.locator('li button[aria-label*="ändern"]').first().click();
  const editor = p.locator('app-daten-editor dialog[open]');
  await editor.locator('textarea').fill('1.1');
  await editor.locator('button', { hasText: 'Speichern' }).click();
  await until(async () => (await p.evaluate(() => localStorage.getItem('bn-buehne-zoom'))) === '1.1', 'Editor speichert nicht');
  await daten.locator('input[type=search]').fill('2019');
  await daten.locator('.leiste input[type=checkbox]').check();
  await daten.locator('.leiste button', { hasText: 'löschen' }).click();
  await until(async () => (await p.evaluate(() => localStorage.getItem('bn-packliste-2019-01-01'))) === null, 'Auswahl wird nicht gelöscht');
  await daten.locator('input[type=search]').fill('');
  await p.evaluate(() => localStorage.setItem('bn-packliste-2019-01-01', '{"checked":[],"custom":[]}'));
  await p.reload({ waitUntil: 'networkidle' });
  const box = p.locator('app-backstage-aufraeumen');
  await until(async () => (await box.locator('tr', { hasText: 'Packlisten' }).locator('td').first().innerText()) === '2', 'Übersicht zählt die Packlisten nicht');
  // Vergangenes (Standard: Packliste, Vor Ort, Werbeplan, Proben – Setlist bleibt)
  await box.locator('select').selectOption('0');
  await box.locator('button', { hasText: 'Einträge entfernen' }).click();
  await until(async () => (await p.evaluate((alt) => [localStorage.getItem(`bn-packliste-${alt}`), localStorage.getItem(`bn-vorort-${alt}`), !!localStorage.getItem(`bn-setlist-${alt}`)], alt)).join() === ',,true', 'Vergangene Einträge werden nicht (oder zu viel) entfernt');
  // verwaist: Packliste vom 01.01.2019 war schon vergangen; neuer Eintrag für einen Termin, den es nicht gibt
  await p.evaluate(() => localStorage.setItem('bn-werbeplan-2099-01-01', '{}'));
  await p.reload({ waitUntil: 'networkidle' });
  await box.locator('button', { hasText: /Eintrag entfernen|Einträge.*entfernen$/ }).last().click();
  await until(async () => (await p.evaluate(() => localStorage.getItem('bn-werbeplan-2099-01-01'))) === null, 'Verwaister Eintrag bleibt');
  // Stand der Band übernehmen: ersetzt die Setlist durch die Datei
  const datei = JSON.stringify({ app: 'blickfeld-nord-backstage', version: 1, exported: '', data: { 'bn-probe-2099-02-02': { songs: [], notizen: 'neu', punkte: [] } } });
  await box.locator('input[type=file]').setInputFiles({ name: 'band.json', mimeType: 'application/json', buffer: Buffer.from(datei) });
  await p.waitForLoadState('networkidle');
  await until(async () => (await p.evaluate((alt) => [localStorage.getItem(`bn-setlist-${alt}`), !!localStorage.getItem('bn-probe-2099-02-02'), localStorage.getItem('bn-buehne-zoom')], alt).catch(() => [])).join() === ',true,1.1', 'Ersetzen übernimmt nicht genau den Stand der Datei');
  // alles löschen – nur mit eingetipptem LÖSCHEN
  p.promptAntwort = 'LÖSCHEN';
  await p.locator('app-backstage-aufraeumen button.gefahr').click();
  await until(async () => (await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('bn-')).length).catch(() => -1)) === 0, 'Alles löschen lässt Einträge zurück');
  return p;
});

test('Backstage: Abgleich – Ordner auf dem Gerät (z. B. OneDrive) verbinden, einlesen und sichern; Auswahl am Handy', async () => {
  const backstage = JSON.stringify({ app: 'blickfeld-nord-backstage', version: 1, exported: '', data: { 'bn-probe-2099-03-03': { songs: [], notizen: 'aus OneDrive', punkte: [] } } });
  const pdf = readFileSync(join(DIST, 'presse', 'blickfeld-nord-pressekit.pdf'));
  // Chrome/Edge am Computer: der Ordner-Dialog liefert hier einen Ordner im privaten Browser-Speicher (OPFS)
  const p = await page();
  await p.addInitScript(() => {
    window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle('OneDrive', { create: true });
  });
  await p.go('/backstage/abgleich/');
  await p.evaluate(async ({ backstage, pdf }) => {
    const wurzel = await (await navigator.storage.getDirectory()).getDirectoryHandle('OneDrive', { create: true });
    const schreiben = async (ordner, name, inhalt) => {
      const w = await (await ordner.getFileHandle(name, { create: true })).createWritable();
      await w.write(inhalt);
      await w.close();
    };
    await schreiben(wurzel, 'sicherung.json', backstage);
    await schreiben(await wurzel.getDirectoryHandle('Goo Goo Dolls', { create: true }), 'Iris - Bass.pdf', new Uint8Array(pdf));
  }, { backstage, pdf: [...pdf] });
  const box = p.locator('app-backstage-ordner');
  // Fortschrittsanzeige: merken, ob ein Balken mit „x / y“ erschienen ist (die Abläufe sind hier sehr schnell)
  await p.evaluate(() => {
    window.__balken = [];
    new MutationObserver(() => {
      for (const f of document.querySelectorAll('app-fortschritt')) if (f.querySelector('progress[max]')) window.__balken.push(f.textContent.trim());
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
  });
  await box.locator('button', { hasText: 'Ordner verbinden' }).click();
  await box.locator('button', { hasText: 'Ordner durchsuchen' }).click();
  await until(async () => (await box.locator('app-funde-liste').innerText().catch(() => '')).includes('1 PDF'), 'Ordner wird nicht durchsucht');
  await box.locator('app-funde-liste button', { hasText: 'Einlesen' }).click();
  await until(async () => (await box.locator('app-funde-liste .meldung').innerText().catch(() => '')).includes('1 PDF eingelesen'), async () => 'Einlesen aus dem Ordner klappt nicht: ' + (await box.locator('app-funde-liste').innerText()));
  expect((await p.evaluate(() => localStorage.getItem('bn-probe-2099-03-03'))).includes('aus OneDrive'), 'Backstage-Datei aus dem Ordner fehlt');
  const balken = await p.evaluate(() => window.__balken);
  expect(balken.some((t) => t.startsWith('Sichten:')) && balken.some((t) => /^Noten: Iris - Bass\.pdf.*1 \/ 1|^Noten: .*0 \/ 1/.test(t)), 'Fortschrittsanzeige erscheint nicht: ' + [...new Set(balken)].join(' | '));
  // gemerkt nach dem Neuladen, Sichern schreibt nach Backstage/
  await p.reload({ waitUntil: 'networkidle' });
  await box.locator('button', { hasText: 'Stand dort sichern' }).click();
  await until(async () => (await p.evaluate(async () => {
    const b = await (await (await navigator.storage.getDirectory()).getDirectoryHandle('OneDrive')).getDirectoryHandle('Backstage').catch(() => null);
    if (!b) return false;
    for await (const e of b.values()) if (e.name.startsWith('blickfeld-nord-backstage-alle-')) return true;
    return false;
  })), 'Sichern in den Ordner klappt nicht');

  // Safari, Firefox, Handys: Ordner bzw. Dateien wählen
  const q = await page();
  await q.addInitScript(() => delete window.showDirectoryPicker);
  await q.go('/backstage/abgleich/');
  await q.locator('app-backstage-ordner input.dateien').setInputFiles([
    { name: 'sicherung.json', mimeType: 'application/json', buffer: Buffer.from(backstage) },
    { name: 'Iris - The Goo Goo Dolls - Gitarre.pdf', mimeType: 'application/pdf', buffer: pdf },
    // Interpret zuerst, mit Tippfehler
    { name: 'Robbie Wiliams - Angels - Keys.pdf', mimeType: 'application/pdf', buffer: Buffer.concat([pdf, Buffer.from('2')]) },
    // nicht zu erkennen → von Hand wählen
    { name: 'Scan 0042.pdf', mimeType: 'application/pdf', buffer: Buffer.concat([pdf, Buffer.from('3')]) },
  ]);
  const funde = q.locator('app-backstage-ordner app-funde-liste');
  await until(async () => (await funde.innerText().catch(() => '')).includes('Backstage · sicherung.json'), 'Dateiauswahl wird nicht gesichtet');
  const zeile = (name) => funde.locator('li', { hasText: name });
  expect((await funde.innerText()).includes('2 von 3 erkannt'), 'Erkennung zählt nicht: ' + (await funde.locator('.kopf').innerText()));
  expect((await zeile('Robbie Wiliams').locator('select').inputValue()) === 'Angels|Robbie Williams', 'Interpret vor Titel mit Tippfehler nicht erkannt');
  expect((await zeile('Robbie Wiliams').locator('input.fassung').inputValue()) === 'Keys', 'Fassung nicht erkannt');
  expect((await zeile('Scan 0042').innerText()).includes('nicht erkannt'), 'Nicht Erkanntes wird nicht gezeigt');
  await zeile('Scan 0042').locator('select').selectOption('Hey Jude|The Beatles');
  await zeile('Scan 0042').locator('input.fassung').fill('Chor');
  await zeile('Scan 0042').locator('input.fassung').blur();
  await funde.locator('button', { hasText: 'Einlesen' }).click();
  await until(async () => (await funde.locator('.meldung').innerText().catch(() => '')).includes('1 Backstage-Eintrag'), 'Einlesen der gewählten Dateien klappt nicht');
  expect((await funde.locator('.meldung').innerText()).includes('3 PDFs'), 'Nicht alle PDFs eingelesen: ' + (await funde.locator('.meldung').innerText()));
  for (const x of [p, q]) expect(!x.errors.length, 'Fehler auf der Seite: ' + x.errors.join(' | '));
  return q;
});

test('Backstage: Einstellungen – Synchronisation OneDrive ↔ lokal einrichten', async () => {
  const p = await page();
  await p.go('/backstage/abgleich/');
  expect((await p.locator('app-sync-status').innerText()).includes('In den Einstellungen einrichten'), 'Hinweis auf die Einstellungen fehlt');
  await p.locator('app-sync-status a', { hasText: 'Einstellungen' }).click();
  await p.waitForURL(/\/backstage\/einstellungen/);
  const box = p.locator('app-sync-einstellungen');
  // App-ID auf diesem Gerät eintragen → Anmelden wird angeboten (Microsoft selbst ist im Test gesperrt)
  await box.locator('input[placeholder^="z. B. 1a2b"]').fill('00000000-1111-2222-3333-444444444444');
  await box.locator('input[placeholder^="z. B. 1a2b"]').blur();
  await until(async () => (await box.locator('button', { hasText: 'Mit Microsoft anmelden' }).count()) === 1, 'Anmelden erscheint nach dem Eintragen der App-ID nicht');
  // Optionen bleiben gespeichert
  await box.locator('select').selectOption('runter');
  await box.locator('input[type=checkbox]').first().uncheck();
  await p.reload({ waitUntil: 'networkidle' });
  expect((await box.locator('select').inputValue()) === 'runter', 'Richtung nicht gespeichert');
  expect(!(await box.locator('input[type=checkbox]').first().isChecked()), 'Löschungen-Option nicht gespeichert');
  expect((await p.evaluate(() => localStorage.getItem('bn-onedrive-client'))) === '00000000-1111-2222-3333-444444444444', 'App-ID nicht gespeichert');
  // Ordner auf dem Computer: Chromium kann das, die Wahl wird angeboten
  await box.locator('input[type=radio]').nth(1).check();
  await until(async () => (await box.locator('button', { hasText: 'Ordner wählen' }).count()) === 1, 'Ordnerwahl erscheint nicht');
  expect(!(await box.locator('button', { hasText: 'Jetzt synchronisieren' }).isEnabled()), 'Synchronisieren ohne Konto und Ordner möglich');
  // eingerichtet (Cloud-Ordner gewählt, Speicher der App): „Stand sichern“ legt die Sicherung in den Sync-Ordner
  await p.evaluate(() => {
    localStorage.setItem('bn-sync-einstellungen', JSON.stringify({ cloud: 'Blickfeld Nord', lokal: 'app', richtung: 'beide', loeschen: true, auto: false }));
    localStorage.setItem('bn-probe-2099-04-04', JSON.stringify({ songs: [], notizen: 'x', punkte: [] }));
  });
  await p.go('/backstage/abgleich/');
  const status = p.locator('app-sync-status');
  await status.locator('button', { hasText: 'Stand sichern' }).click();
  await until(async () => (await p.evaluate(() => new Promise((ok) => {
    const req = indexedDB.open('bn-sync');
    req.onsuccess = () => {
      const k = req.result.transaction('dateien').objectStore('dateien').getAllKeys();
      k.onsuccess = () => ok(k.result.some((x) => String(x).startsWith('Backstage/blickfeld-nord-backstage-alle-')));
      k.onerror = () => ok(false);
    };
    req.onerror = () => ok(false);
  }))), 'Stand sichern legt keine Datei in den Sync-Ordner');
  return p;
});

test('Backstage: Setlist als Link – ein zweites Gerät übernimmt sie', async () => {
  const id = concerts[concerts.length - 1].split('/')[2];
  const p = await page({ permissions: ['clipboard-read', 'clipboard-write'] });
  await p.go(`/backstage/${id}/setlist`);
  const add = p.locator('app-setlist .pick li button');
  const songs = (x) => x.locator('app-setlist .list li .no').count();
  // nach jedem Klick warten, bis die Liste nachgezogen hat – sonst trifft der nächste Klick denselben Song
  for (let i = 1; i <= 4; i++) {
    if (i === 4) await p.locator('app-setlist button', { hasText: 'Pause' }).click();
    await add.first().click();
    await until(async () => (await songs(p)) === i, `Song ${i} nicht hinzugefügt`);
  }
  await p.locator('app-setlist button', { hasText: 'Als Link' }).click();
  await until(async () => (await p.evaluate(() => navigator.clipboard.readText())).includes('#liste='), 'kein Link kopiert');
  const link = (await p.evaluate(() => navigator.clipboard.readText())).replace(/^https?:\/\/[^/]+/, '');
  // zweites Gerät: frischer Browser ohne gespeicherte Setlist
  const q = await page();
  const konsole = [];
  q.on('console', (m) => konsole.push(`${m.type()}: ${m.text().slice(0, 160)}`));
  // jede Adressänderung mit Aufrufstelle mitschreiben – zeigt, wer den Teil hinter „#“ entfernt
  await q.addInitScript(() => {
    const log = (window.__adressen = [`start ${location.pathname}${location.hash}`]);
    for (const fn of ['pushState', 'replaceState']) {
      const orig = history[fn].bind(history);
      history[fn] = (s, t, u) => {
        log.push(`${fn} ${u} ← ${(new Error().stack ?? '').split('\n').slice(2, 5).map((z) => z.trim().replace(/https?:\/\/[^/]+\//, '')).join(' | ')}`);
        return orig(s, t, u);
      };
    }
    addEventListener('hashchange', () => log.push(`hashchange ${location.hash}`));
  });
  await q.go(link);
  await until(async () => (await songs(q)) === 4, async () =>
    `Setlist aus dem Link nicht übernommen (${await songs(q)} Songs, Link ${link}, jetzt ${q.url()}, gespeichert ${await q.evaluate((k) => localStorage.getItem(k), 'bn-setlist-' + id)}, ` +
    `Fehler ${JSON.stringify(q.errors)}, Konsole ${JSON.stringify(konsole)}, Adressen ${JSON.stringify(await q.evaluate(() => window.__adressen))}, Seite „${(await q.locator('main').innerText()).slice(0, 300).replace(/\s+/g, ' ')}“)`);
  expect((await q.locator('app-setlist .pause-label').count()) === 1, 'Pause fehlt');
  expect(!q.url().includes('#liste='), 'Liste bleibt in der Adresse stehen');
  return q;
});

test('Backstage: Rückblick-Formular erzeugt den Historie-Block', async () => {
  const p = await page();
  const vergangen = concerts.map((c) => c.split('/')[2]).filter((id) => id < new Date().toISOString().slice(0, 10))[0];
  await p.go(`/backstage/${vergangen}/`);
  await p.evaluate((id) => {
    localStorage.setItem('bn-setlist-' + id, JSON.stringify([{ title: 'Angels', artist: 'Robbie Williams' }, { pause: true }, { title: "Blowin' in the Wind", artist: 'Bob Dylan' }]));
    localStorage.setItem('bn-bewertung-' + id, JSON.stringify({ "Blowin' in the Wind|Bob Dylan": 5, 'Angels|Robbie Williams': 3 }));
  }, vergangen);
  await p.reload();
  await p.locator('app-rueckblick-formular summary').click();
  await p.locator('app-rueckblick-formular input[maxlength="100"]').fill("Ein Abend im Café");
  await p.locator('app-rueckblick-formular textarea').fill("Erster Absatz mit Matthias' Solo.\n\nZweiter Absatz.");
  await p.locator('app-rueckblick-formular button', { hasText: 'Foto hinzufügen' }).click();
  await p.locator('app-rueckblick-formular .foto input').nth(0).fill('2026-04-30-cafe.webp');
  await p.locator('app-rueckblick-formular .foto input').nth(1).fill('Die Band im Café');
  const code = await p.locator('app-rueckblick-formular pre.code').innerText();
  expect(code.includes(`date: '${vergangen}'`) && code.includes("Matthias’ Solo") && code.includes("src: 'historie/2026-04-30-cafe.webp'"), 'Block unvollständig: ' + code);
  expect(code.includes("{ title: 'Angels', artist: 'Robbie Williams' },") && code.includes("highlight: 'Blowin\\' in the Wind'"), 'Setlist oder Song des Abends fehlen: ' + code);
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

test('Backstage: Setlist mit Spieldauer, Vorlage, Sternen, Laufzettel', async () => {
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
  await p.locator('app-setlist-vorschlag button', { hasText: 'vorschlagen' }).click();
  await until(async () => (await p.locator('app-setlist .pause-label').count()) === 1 && (await p.locator('app-setlist .list li .no').count()) > 10, 'Setlist-Vorschlag ohne zwei Sets');
  await p.getByRole('button', { name: /Bühnen-Modus/ }).first().click();
  await p.getByRole('button', { name: '4 Sterne' }).click();
  await p.keyboard.press('Escape');
  await p.go('/backstage/zahlen');
  await until(async () => (await p.locator('app-song-rangliste .top li').count()) === 1, 'Sterne aus dem Bühnen-Modus fehlen in der Rangliste');
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
for (const t of tests.filter((x) => !process.env.NUR || x.name.includes(process.env.NUR))) {
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
