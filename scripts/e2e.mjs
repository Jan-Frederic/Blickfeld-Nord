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
  throw new Error(typeof message === 'function' ? await message() : message);
}

async function page(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', acceptDownloads: true, locale: 'de-DE', ...options });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
  const p = await context.newPage();
  p.setDefaultTimeout(10_000);
  p.on('dialog', (d) => (d.type() === 'prompt' ? d.accept('Testvorlage') : d.accept()));
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
  const zeile = p.locator('app-backstage-songs .list li').first();
  await zeile.locator('select').first().selectOption('G');
  await zeile.locator('input[type=number]').fill('120');
  await zeile.locator('input[type=number]').blur();
  await until(async () => (await p.locator('app-backstage-songs .apply').innerText()).includes('1 Song geändert'), 'Änderung wird nicht gezählt');
  await p.reload({ waitUntil: 'networkidle' });
  await p.locator('app-backstage-songs input[type=search]').fill('Millionen');
  await until(async () => (await p.locator('app-backstage-songs .list li select').first().inputValue()) === 'G', 'Entwurf nach Neuladen weg');
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
  await until(async () => (await p.locator('app-setlist-buehne .ton').getAttribute('aria-pressed').catch(() => null)) === 'false', 'Klick startet nicht stumm');
  await p.locator('app-setlist-buehne .ton').click();
  await until(async () => (await p.locator('app-setlist-buehne .ton').getAttribute('aria-pressed')) === 'true', 'Ton lässt sich nicht zuschalten');
  return p;
});

test('Backstage: Songs – Tap-Tempo, Band-Tonart mit Capo; Setlist glättet Tonartsprünge, feste Vorlage', async () => {
  const p = await page();
  await p.go('/backstage/songs/');
  await p.locator('app-backstage-songs input[type=search]').fill('Iris');
  const zeile = p.locator('app-backstage-songs .list li').first();
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
  await p.locator('app-setlist-vorschlag button').click();
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
