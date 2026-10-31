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
const concerts = [...sitemap.matchAll(/<loc>https:\/\/blickfeld-nord\.de(\/konzerte\/[^<]+)<\/loc>/g)].map((m) => m[1].replace(/\/$/, ""));

// Mikrofon zum Testen der Proben-Mitschnitte: Chromium liefert einen Testton, ohne nachzufragen
const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
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
  // Ein Klick auf die vorgerenderte Zeile vor dem Hydrieren geht ins Leere – bis zum Seitenwechsel wiederholen
  await until(async () => {
    if (!/\/konzerte\//.test(p.url())) await p.locator('app-tour tr.link td.mat-column-city').first().click().catch(() => {});
    return /\/konzerte\//.test(p.url());
  }, 'Konzertliste führt nicht zur Konzertseite');
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

test('Backstage: Songs – Filter nach Spotify-Liste, Symbole verlinken die Liste', async () => {
  const p = await page();
  await p.go('/backstage/songs/');
  const chips = p.locator('app-songs-liste .listen-chips button');
  await until(async () => (await chips.allInnerTexts()).join(' ').includes('Wunschliste'), 'Listen-Filter fehlen');
  await chips.filter({ hasText: 'Website' }).click();
  await until(async () => (await chips.filter({ hasText: 'Website' }).getAttribute('aria-pressed')) === 'true', 'Filter nicht gewählt');
  const link = p.locator('app-songs-liste tbody tr .listen-icons a').first();
  await until(async () => ((await link.getAttribute('href')) ?? '').startsWith('https://open.spotify.com/playlist/'), 'Symbol verlinkt nicht nach Spotify');
  await chips.filter({ hasText: 'Ohne Liste' }).click();
  await until(async () => (await p.locator('app-songs-liste tbody tr').first().innerText()).includes('Kein Song gefunden'), 'Ohne-Liste-Filter zeigt Songs');
  // alleinstehendes PDF „<Band> - <Titel> - <Fassung>.pdf“ wird ein Song ohne Liste
  await p.evaluate(() => new Promise((ok, fehler) => {
    const req = indexedDB.open('bn-noten', 2);
    req.onupgradeneeded = () => { for (const n of ['dateien', 'songs', 'markierungen']) if (!req.result.objectStoreNames.contains(n)) req.result.createObjectStore(n, n === 'dateien' ? { keyPath: 'id' } : undefined); };
    req.onsuccess = () => {
      const tx = req.result.transaction('dateien', 'readwrite');
      tx.objectStore('dateien').put({ id: 'e2e-frei', name: 'Testband - Eigener Song - Bass.pdf', daten: new ArrayBuffer(8), groesse: 8, hinzugefuegt: '2026-01-01' });
      tx.oncomplete = () => { req.result.close(); ok(); };
      tx.onerror = () => fehler(tx.error);
    };
  }));
  await p.reload({ waitUntil: 'networkidle' });
  await p.locator('app-songs-liste .listen-chips button', { hasText: 'Ohne Liste' }).click();
  await until(async () => /Eigener Song[\s\S]*Testband[\s\S]*PDF/.test(await p.locator('app-songs-liste tbody tr').first().innerText()), 'PDF ohne Liste fehlt als Song');
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
  // Song-Historie in der Tabelle (Auftritt vorbei → „gespielt“, kommend → „geplant“)
  await p.go('/backstage/songs/');
  await p.locator('app-backstage-songs input[type=search]').fill('Millionen');
  await until(async () => /gespielt|geplant/.test(await p.locator('app-backstage-songs tbody tr .hist').first().innerText().catch(() => '')), 'Song-Historie fehlt');
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
  // Lückenliste: Iris hat Akkorde und die Fassung „songbook“ → taucht bei „ohne …“ nicht auf
  await p.keyboard.press('Escape');
  const zeigen = p.locator('app-backstage-songs select.zeigen');
  for (const filter of ['akkorde', 'fassung:songbook', 'noten']) {
    await zeigen.selectOption(filter);
    await until(async () => (await p.locator('app-backstage-songs tbody').innerText()).includes('Kein Song gefunden'), `Filter „${filter}“ zeigt Iris trotzdem`);
  }
  await zeigen.selectOption('tonart');
  await zeigen.selectOption('');

  const id = concerts[concerts.length - 1].split('/')[2];
  await p.go(`/backstage/${id}/setlist`);
  for (const t of ['Iris', 'Angels']) {
    await p.locator('app-setlist .pick input[type=search]').fill(t);
    await p.locator('app-setlist .pick li button').first().click();
  }
  await until(async () => (await p.locator('app-setlist .list li .no').count()) === 2, 'Songs nicht in der Setlist');
  // Auftritt vorbereiten: Iris hat Noten (PDF S. 2–3), Angels nicht
  await p.locator('app-auftritt-vorbereiten button', { hasText: 'Auftritt vorbereiten' }).click();
  await until(async () => (await p.locator('app-auftritt-vorbereiten .summe').innerText().catch(() => '')).includes('1 von 2 Songs mit Noten'), async () => 'Prüfung meldet falsch: ' + (await p.locator('app-auftritt-vorbereiten').innerText()));
  const pruefung = await p.locator('app-auftritt-vorbereiten ul').innerText();
  expect(pruefung.includes('S. 2–3') && pruefung.includes('keine Noten auf diesem Gerät'), 'Prüfung je Song fehlt: ' + pruefung);
  // Notenmappe: Deckblatt + 2 Seiten Iris (Bereich 2–3) + Hinweisseite für Angels
  const [mappe] = await Promise.all([p.waitForEvent('download'), p.locator('app-auftritt-vorbereiten button', { hasText: 'Notenmappe' }).click()]);
  const mappenPdf = readFileSync(await mappe.path()).toString('latin1');
  expect(mappenPdf.startsWith('%PDF') && mappe.suggestedFilename().startsWith('Notenmappe'), 'Notenmappe ist kein PDF');
  const vorbereiten = () => p.locator('app-auftritt-vorbereiten').evaluate((e) => e.textContent);
  await until(async () => (await vorbereiten()).includes('4 Seiten'), async () => 'Notenmappe falsch: ' + (await vorbereiten()));
  expect((await vorbereiten()).includes('ohne Noten: Angels'), 'Notenmappe meldet fehlende Noten nicht');
  await p.getByRole('button', { name: /Bühnen-Modus/ }).first().click();
  await p.locator('app-setlist-buehne .noten-knopf').click();
  const kopf = p.locator('app-noten-anzeige header');
  await until(async () => (await kopf.innerText()).includes('Seite 1 / 2'), 'PDF-Seitenbereich wird nicht angezeigt');
  await until(async () => ((await p.locator('app-noten-anzeige .blattseite > canvas').first().boundingBox())?.width ?? 0) > 100, 'PDF-Seite wird nicht gezeichnet');
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
  // Mitscrollen: Pedal hält an und lässt weiterlaufen (statt zu blättern), Tempo je Song mit +
  const scroll = kopf.locator('button.mitscrollen');
  // das Test-Blatt ist kurz – länger machen, damit es etwas zu scrollen gibt
  await p.locator('app-noten-anzeige .blatt').evaluate((b) => (b.style.paddingBottom = '4000px'));
  await kopf.getByRole('button', { name: 'Schneller scrollen' }).click();
  await scroll.click();
  await until(async () => (await kopf.innerText()).includes('110 %'), 'Scroll-Tempo lässt sich nicht ändern');
  await p.keyboard.press('ArrowRight');
  await until(async () => (await scroll.innerText()).includes('Weiter'), 'Pedal hält das Mitscrollen nicht an');
  await p.keyboard.press('ArrowRight');
  await until(async () => (await scroll.getAttribute('aria-pressed')) === 'true', 'Pedal lässt das Mitscrollen nicht weiterlaufen');
  expect((await kopf.locator('.titel').innerText()) !== '', 'Pedal hat den Song gewechselt');
  await scroll.click();
  await p.keyboard.press('Escape');
  await until(async () => (await p.locator('app-noten-anzeige').count()) === 0, 'Escape schließt die Noten nicht');

  // Halbseiten-Blättern und eigene Pedal-Taste (in den Einstellungen festgelegt)
  await p.go('/backstage/einstellungen/');
  const buehne = p.locator('app-buehne-einstellungen');
  await buehne.locator('input[type=checkbox]').check();
  await buehne.locator('button.neu').first().click();
  await p.keyboard.press('b');
  await until(async () => (await buehne.innerText()).includes('B'), 'Pedal-Taste wird nicht aufgenommen');
  await p.go(`/backstage/${id}/setlist`);
  await p.getByRole('button', { name: /Bühnen-Modus/ }).first().click();
  await p.locator('app-setlist-buehne .noten-knopf').click();
  await kopf.locator('select.wahl').selectOption({ label: 'songbook' });
  await until(async () => (await kopf.innerText()).includes('Seite 1 / 2'), 'PDF erscheint nicht');
  await p.keyboard.press('b');
  await until(async () => (await kopf.innerText()).includes('Seite 1–2 / 2') && (await p.locator('app-noten-anzeige canvas.oben').count()) === 1, 'Halbseiten-Blättern zeigt die nächste Seite nicht oben');
  await p.keyboard.press('b');
  await until(async () => (await kopf.innerText()).includes('Seite 2 / 2') && (await p.locator('app-noten-anzeige canvas.oben').count()) === 0, 'Zweiter Tritt blättert nicht ganz um');
  // Markieren: Strich auf Seite 2 zeichnen – blättert nicht um, wird gespeichert
  await kopf.locator('button.stift').click();
  const box = await p.locator('app-noten-stift canvas').boundingBox();
  await p.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
  await p.mouse.down();
  await p.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4, { steps: 5 });
  await p.mouse.up();
  const markiert = () => p.evaluate(() => new Promise((ok) => {
    const req = indexedDB.open('bn-noten');
    req.onsuccess = () => {
      const k = req.result.transaction('markierungen').objectStore('markierungen').getAll();
      k.onsuccess = () => ok(k.result.flat().length);
    };
  }));
  await until(async () => (await markiert()) === 1, 'Markierung wird nicht gespeichert');
  expect((await kopf.innerText()).includes('Seite 2 / 2'), 'Zeichnen hat umgeblättert');
  await kopf.locator('button.stift').click();
  await kopf.locator('select.wahl').selectOption({ label: 'Akkorde' });
  await p.evaluate(() => ['bn-buehne-halbseite', 'bn-buehne-tasten'].forEach((k) => localStorage.removeItem(k)));

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
  expect((await q.evaluate(() => new Promise((ok) => {
    const req = indexedDB.open('bn-noten');
    req.onsuccess = () => {
      const k = req.result.transaction('markierungen').objectStore('markierungen').count();
      k.onsuccess = () => ok(k.result);
    };
  }))) === 1, 'Markierungen kommen nicht mit dem Notenpaket mit');
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

test('Backstage: Abgleich – Daten verwalten, vergangene Einträge aufräumen; Backup ersetzt alles; alles löschen', async () => {
  const p = await page();
  await p.go('/backstage/abgleich/');
  // ohne Berechtigung „Daten löschen“ keine Mülltonnen
  expect(!(await p.locator('app-backstage-daten button[aria-label$="löschen"]').count()) && !(await p.locator('app-backstage-aufraeumen').count()), 'Mülltonnen ohne Berechtigung sichtbar');
  // Berechtigung: angemeldet und Besitzer des Sync-Ordners (eigener Ordner, nicht geteilt)
  await p.evaluate(() => {
    localStorage.setItem('bn-sync-einstellungen', JSON.stringify({ cloud: 'Blickfeld Nord', lokal: 'app', richtung: 'beide', loeschen: true, auto: false }));
    localStorage.setItem('bn-onedrive-konto', 'test@example.com');
  });
  // ein vergangener Auftritt (aus der Sitemap), ein Auftritt, den es nicht gibt, und eine Einstellung
  const alt = concerts[0].split('/')[2];
  await p.evaluate((alt) => {
    for (const k of [`bn-setlist-${alt}`, `bn-packliste-${alt}`, `bn-vorort-${alt}`, 'bn-packliste-2019-01-01']) localStorage.setItem(k, '[{"title":"Iris","artist":"The Goo Goo Dolls"}]');
    localStorage.setItem('bn-buehne-zoom', '1.3');
  }, alt);
  await p.reload({ waitUntil: 'networkidle' });
  // Daten auf diesem Gerät: Einträge verständlich benannt, ändern im Editor, Auswahl löschen
  const daten = p.locator('app-backstage-daten');
  // Sync-Status: gespiegelte Einträge warten auf den Abgleich, Gerätedaten bleiben lokal; Kompass unten rechts
  await until(async () => /⟳ \d+ warten/.test(await daten.locator('.status').innerText().catch(() => '')), 'Sync-Status fehlt im Abgleich');
  // Sync-Kompass: vorhanden, aber ausgeblendet, solange nicht abgeglichen wird
  await until(async () => (await p.locator('app-sync-kompass a.kompass').count()) === 1, 'Sync-Kompass fehlt');
  expect(!(await p.locator('app-sync-kompass a.kompass').isVisible()), 'Sync-Kompass sichtbar, obwohl nicht abgeglichen wird');
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
  await until(async () => (await daten.locator('summary', { hasText: 'Packlisten' }).innerText()).includes('2 ·'), 'Übersicht zählt die Packlisten nicht');
  // Vergangenes (Standard: Packliste, Vor Ort, Werbeplan, Proben – Setlist bleibt)
  await box.locator('select').selectOption('0');
  await box.locator('button', { hasText: 'Einträge entfernen' }).click();
  await until(async () => (await p.evaluate((alt) => [localStorage.getItem(`bn-packliste-${alt}`), localStorage.getItem(`bn-vorort-${alt}`), !!localStorage.getItem(`bn-setlist-${alt}`)], alt)).join() === ',,true', 'Vergangene Einträge werden nicht (oder zu viel) entfernt');
  // Einstellungen → Backup → „Alles ersetzen“: ersetzt die Setlist durch die Datei
  await p.go('/backstage/einstellungen/');
  const backup = p.locator('app-backup-karte');
  await backup.locator('summary').click();
  const datei = JSON.stringify({ app: 'blickfeld-nord-backstage', version: 1, exported: '', data: { 'bn-probe-2099-02-02': { songs: [], notizen: 'neu', punkte: [] } } });
  await backup.locator('details input[type=file]').setInputFiles({ name: 'band.json', mimeType: 'application/json', buffer: Buffer.from(datei) });
  await until(async () => (await p.evaluate((alt) => [localStorage.getItem(`bn-setlist-${alt}`), !!localStorage.getItem('bn-probe-2099-02-02'), localStorage.getItem('bn-buehne-zoom')], alt).catch(() => [])).join() === ',true,1.1', 'Ersetzen übernimmt nicht genau den Stand der Datei');
  await p.waitForTimeout(1500);
  // alles löschen – nur mit eingetipptem LÖSCHEN
  await p.go('/backstage/abgleich/');
  p.promptAntwort = 'LÖSCHEN';
  await p.locator('app-backstage-aufraeumen button.gefahr').click();
  await until(async () => (await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('bn-')).length).catch(() => -1)) === 0, 'Alles löschen lässt Einträge zurück');
  return p;
});

test('Backstage: Einstellungen – Synchronisation OneDrive ↔ lokal einrichten', async () => {
  const p = await page();
  await p.go('/backstage/abgleich/');
  expect((await p.locator('app-sync-status').innerText()).includes('In den Einstellungen einrichten'), 'Hinweis auf die Einstellungen fehlt');
  await p.locator('app-sync-status a', { hasText: 'Einstellungen' }).click();
  await p.waitForURL(/\/backstage\/einstellungen/);
  const box = p.locator('app-sync-einstellungen');
  // App-ID steht fest im Code → gleich „Anmelden“, kein Feld für die App-ID (Microsoft selbst ist im Test gesperrt)
  await until(async () => (await box.locator('button', { hasText: 'Mit Microsoft anmelden' }).count()) === 1, 'Anmelden wird nicht angeboten');
  expect(!(await box.locator('input[placeholder^="z. B. 1a2b"]').count()), 'Feld für die App-ID trotz fester App-ID');
  // Optionen bleiben gespeichert
  await box.locator('select').selectOption('runter');
  await box.locator('input[type=checkbox]').first().uncheck();
  await p.reload({ waitUntil: 'networkidle' });
  expect((await box.locator('select').inputValue()) === 'runter', 'Richtung nicht gespeichert');
  expect(!(await box.locator('input[type=checkbox]').first().isChecked()), 'Löschungen-Option nicht gespeichert');
  // Ordner auf dem Computer: Chromium kann das, die Wahl wird angeboten
  await box.locator('input[type=radio]').nth(1).check();
  await until(async () => (await box.locator('button', { hasText: 'Ordner wählen' }).count()) === 1, 'Ordnerwahl erscheint nicht');
  expect(!(await box.locator('button', { hasText: 'Jetzt synchronisieren' }).isEnabled()), 'Synchronisieren ohne Konto und Ordner möglich');
  // eingerichtet (Cloud-Ordner gewählt, Speicher der App): „Backup erstellen“ legt das Backup in den Sync-Ordner
  await p.evaluate(() => {
    localStorage.setItem('bn-sync-einstellungen', JSON.stringify({ cloud: 'Blickfeld Nord', lokal: 'app', richtung: 'beide', loeschen: true, auto: false }));
    localStorage.setItem('bn-probe-2099-04-04', JSON.stringify({ songs: [], notizen: 'x', punkte: [] }));
  });
  await p.reload({ waitUntil: 'networkidle' });
  await p.locator('app-backup-karte button', { hasText: 'Backup erstellen' }).click();
  await until(async () => (await p.evaluate(() => new Promise((ok) => {
    const req = indexedDB.open('bn-sync');
    req.onsuccess = () => {
      const k = req.result.transaction('dateien').objectStore('dateien').getAllKeys();
      k.onsuccess = () => ok(k.result.some((x) => String(x).startsWith('Backup/blickfeld-nord-backup-')));
      k.onerror = () => ok(false);
    };
    req.onerror = () => ok(false);
  }))), 'Backup erstellen legt keine Datei in den Sync-Ordner');
  await until(async () => (await p.locator('app-backup-karte').innerText()).includes('Letztes Backup:'), 'Letztes Backup wird nicht angezeigt');
  await p.go('/backstage/abgleich/');
  const status = p.locator('app-sync-status');
  // nach dem Abgleich nicht eindeutig erkannte Noten warten auf eine Zuordnung
  await p.evaluate(() => new Promise((ok) => {
    const req = indexedDB.open('bn-sync', 1);
    req.onsuccess = () => {
      const t = req.result.transaction('dateien', 'readwrite');
      t.objectStore('dateien').put({ inhalt: new Blob(['[C]x']), groesse: 4, geaendert: new Date().toISOString(), version: 'v1' }, 'Noten/Scan 7.pro');
      t.oncomplete = () => ok(null);
    };
  }));
  await p.evaluate(() => localStorage.setItem('bn-sync-offen', JSON.stringify(['Noten/Scan 7.pro'])));
  await p.reload({ waitUntil: 'networkidle' });
  await until(async () => (await status.innerText()).includes('1 Noten-Datei braucht eine Zuordnung'), 'Offene Zuordnung wird nicht gemeldet');
  await status.locator('button', { hasText: 'Zuordnen' }).click();
  const offen = status.locator('app-funde-liste li', { hasText: 'Scan 7.pro' });
  await offen.locator('select').selectOption('Angels|Robbie Williams');
  await status.locator('app-funde-liste button', { hasText: 'Einlesen' }).click();
  await until(async () => (await status.locator('app-funde-liste .meldung').innerText().catch(() => '')).includes('1 Akkordblatt'), 'Zuordnen liest nicht ein');
  await until(async () => !(await status.innerText()).includes('braucht eine Zuordnung'), 'Offene Zuordnung bleibt stehen');
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
  // neben der festen Vorlage „Weihnachtslieder“ die eben gespeicherte
  await until(async () => (await p.locator('app-setlist-vorlagen option').allInnerTexts()).some((t) => t.startsWith('Testvorlage · 5 Songs')), 'Vorlage nicht gespeichert');
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
  await q.go('/backstage/einstellungen/');
  await q.locator('app-backup-karte .knoepfe input[type=file]').setInputFiles(file);
  await q.waitForTimeout(1500);
  await q.go(`/backstage/${id}/vorort`);
  expect((await q.locator('app-vorort input').first().inputValue()) === 'Test Kontakt', 'Import hat die Vor-Ort-Angaben nicht übernommen');
  return p;
});

test('Backstage: Notiz je Auftritt und Einzählen im Bühnen-Modus, „Bereit?“-Check', async () => {
  const p = await page();
  const id = '2028-08-19';
  await p.go(`/backstage/${id}/setlist`);
  await p.locator('app-setlist .search input').fill('Wonderwall');
  await p.locator('app-setlist .pick li button').first().click();
  p.promptAntwort = 'Schluss zweimal';
  await p.getByRole('button', { name: 'Notiz für diesen Auftritt' }).click();
  await until(async () => (await p.locator('app-setlist .list').innerText()).includes('✎ Schluss zweimal'), 'Notiz nicht in der Setlist');
  await p.getByRole('button', { name: /Bühnen-Modus/ }).first().click();
  expect((await p.locator('app-setlist-buehne main').innerText()).includes('Schluss zweimal'), 'Notiz nicht im Bühnen-Modus');
  await p.getByRole('button', { name: 'Einzählen' }).click();
  await until(async () => (await p.locator('app-setlist-buehne .einzaehlen').count()) === 1, 'Einzählen zeigt nichts');
  await until(async () => (await p.locator('app-setlist-buehne .einzaehlen').count()) === 0, 'Einzählen hört nicht auf');
  await p.keyboard.press('Escape');
  // Seite des Auftritts: Setlist steht, Vor-Ort-Angaben fehlen noch
  await p.go(`/backstage/${id}`);
  const bereit = p.locator('app-bereitschaft');
  expect(await bereit.locator('li.ok', { hasText: 'Setlist steht' }).count(), '„Setlist steht“ nicht abgehakt');
  expect((await bereit.locator('li:not(.ok)', { hasText: 'Vor Ort geklärt' }).innerText()).includes('Ansprechpartner'), 'fehlende Vor-Ort-Angaben nicht gemeldet');
  await p.go('/backstage/');
  expect((await p.locator('app-bereitschaft summary').innerText()).includes('bereit'), 'kein „Bereit?“ für den nächsten Auftritt in der Übersicht');
  return p;
});

test('Backstage: „Wackelt noch“ und Proben-Mitschnitt im Song, Nachbereitung mit Merkpunkten', async () => {
  const p = await page({ permissions: ['microphone'] });
  await p.go('/backstage/songs/');
  await p.locator('app-backstage-songs input[type=search]').fill('Millionen');
  await p.locator('app-backstage-songs tbody tr .oeffnen').first().click();
  const dialog = p.locator('app-song-dialog dialog[open]');
  await dialog.getByRole('button', { name: 'Sitzt' }).click();
  await until(async () => (await dialog.locator('.wackelt').innerText()).includes('Wackelt noch'), '„Wackelt noch“ lässt sich nicht setzen');
  await dialog.getByRole('button', { name: 'Aufnehmen' }).click();
  await p.waitForTimeout(1500);
  await dialog.getByRole('button', { name: /Stopp/ }).click();
  await until(async () => (await dialog.locator('app-song-mitschnitte audio').count()) === 1, 'Mitschnitt nicht gespeichert');
  // Üben: Schleife und Tempo
  await dialog.getByRole('button', { name: 'Üben: Schleife und Tempo' }).click();
  await until(async () => (await dialog.locator('.ueben select').count()) === 1, 'Üben-Leiste fehlt');
  await p.keyboard.press('Escape');
  await p.locator('app-backstage-songs input[type=search]').fill('');
  await p.locator('select.zeigen').selectOption('wackelt');
  await until(async () => (await p.locator('app-backstage-songs tbody tr').count()) === 1, 'Filter „wackelt noch“ zeigt nicht genau den Song');
  // Probe-Vorschlag nimmt den Song zuerst
  await p.go('/backstage/termine/');
  await p.locator('a.row-link', { hasText: 'Probe' }).first().click();
  await until(async () => (await p.locator('app-probe-vorschlag li').first().innerText()).includes('wackelt noch'), 'Probe-Vorschlag ohne „wackelt noch“');
  // Abgleich: Mitschnitte zählen mit
  await p.go('/backstage/abgleich/');
  await until(async () => (await p.locator('app-backstage-daten summary', { hasText: 'Proben-Mitschnitte' }).innerText().catch(() => '')).includes('1 ·'), 'Mitschnitt fehlt unter Daten auf diesem Gerät');

  // Nachbereitung eines vergangenen Auftritts
  const id = '2026-08-22';
  await p.go(`/backstage/${id}/setlist`);
  await p.locator('app-setlist .pick li button').first().click();
  await p.go(`/backstage/${id}`);
  await p.locator('app-nachbereitung summary').click();
  await p.locator('app-nachbereitung .sterne button').nth(3).click();
  await p.locator('app-nachbereitung textarea').first().fill('Alle haben mitgesungen');
  await p.locator('app-nachbereitung .neu textarea').fill('- Kabel für Keys kaufen\n- Monitor Gesang lauter');
  await p.getByRole('button', { name: 'Hinzufügen' }).click();
  await until(async () => (await p.locator('app-nachbereitung .punkte li').count()) === 2, 'Merkpunkte nicht übernommen');
  await until(async () => (await p.locator('app-nachbereitung summary').innerText()).includes('1 von 1 Songs bewertet'), 'Sterne nicht gezählt');
  await p.locator('app-rueckblick-formular summary').click();
  await p.locator('app-rueckblick-formular button', { hasText: 'aus der Nachbereitung' }).click();
  await until(async () => (await p.locator('app-rueckblick-formular textarea').first().inputValue()) === 'Alle haben mitgesungen', '„Was lief gut“ nicht in den Rückblick übernommen');
  await p.go('/backstage/aufgaben/');
  await until(async () => (await p.locator('app-backstage-aufgaben').innerText()).includes('2 offene Merkpunkte aus der Nachbereitung'), 'Merkpunkte fehlen unter Aufgaben');
  return p;
});

test('Backstage: Hier schon gespielt, Stimmgerät und Probe-Aufnahme', async () => {
  const p = await page({ permissions: ['microphone'] });
  // Café Lotti 2026 (Tanz in den Mai) und 2027: gleicher Ort
  await p.go('/backstage/');
  await p.evaluate(() => localStorage.setItem('bn-setlist-2026-04-30', JSON.stringify([{ title: 'Iris', artist: 'The Goo Goo Dolls' }])));
  await p.go('/backstage/2027-04-30/setlist');
  await p.locator('app-setlist .search input').fill('Iris');
  await p.locator('app-setlist .pick li button').first().click();
  await until(async () => (await p.locator('app-setlist .list').innerText()).includes('hier schon am 30.04.2026 gespielt'), '„Hier schon gespielt“ fehlt');
  await p.getByRole('button', { name: /Für Abwechslung tauschen/ }).click();
  await until(async () => !(await p.locator('app-setlist .list').innerText()).includes('Iris'), 'Abwechslung tauscht den Song nicht');
  // Probe: Stimmgerät und Aufnahme der ganzen Probe
  await p.go('/backstage/termine/');
  await p.locator('a.row-link', { hasText: 'Probe' }).first().click();
  await p.waitForURL(/\/backstage\/probe\//);
  await p.getByRole('button', { name: /Stimmgerät starten/ }).click();
  await until(async () => (await p.locator('app-stimmgeraet').innerText()).match(/Ton anspielen|Cent/), 'Stimmgerät startet nicht');
  expect(!(await p.locator('app-stimmgeraet').innerText()).includes('Kein Zugriff'), 'Stimmgerät bekommt kein Mikrofon');
  await p.getByRole('button', { name: 'Stimmgerät schließen' }).click();
  expect(await p.locator('app-backstage-probe app-song-mitschnitte').count(), 'Aufnahme der ganzen Probe fehlt');
  return p;
});

test('Navigation: angemeldet Sprachen im Untermenü und Backstage-Zugang an letzter Stelle', async () => {
  const p = await page();
  await p.go('/');
  expect(!(await p.locator('header a[href="/backstage"]').count()), 'Backstage-Zugang ohne Anmeldung sichtbar');
  await p.evaluate(() => localStorage.setItem('bn-onedrive-konto', 'test@example.com'));
  await p.reload({ waitUntil: 'networkidle' });
  await until(async () => (await p.locator('.desktop-nav a').last().innerText()) === 'BACKSTAGE' || (await p.locator('.desktop-nav a').last().innerText()) === 'Backstage', 'Backstage nicht an letzter Stelle');
  expect(!(await p.locator('nav.languages').count()), 'Sprachen stehen noch einzeln in der Leiste');
  await p.locator('.sprachwahl summary').click();
  await p.locator('.sprachliste a[hreflang=en]').click();
  await p.waitForURL(/\/en\/?$/);
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
    console.log(`::error::✗ ${t.name}: ${e.message.split("\n")[0]}`); if (process.env.STACK) console.log(e.stack);
  }
}
await browser.close();
close();
console.log(`Klicktests: ${tests.length - failed} von ${tests.length} bestanden.`);
process.exit(failed ? 1 : 0);
