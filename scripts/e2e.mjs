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
import { BAND_ORDNER_ITEM, zugangFreischalten } from './lib/zugang-test.mjs';

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
async function until(check, message, ms = 5000) {
  for (let i = 0; i < ms / 100; i++) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(typeof message === 'function' ? await message() : message);
}

/** Song-Dialog über die erste Zeile der Songliste öffnen – direkt nach dem Laden geht ein Klick gelegentlich verloren
 *  (die Liste baut sich noch auf), deshalb klicken, bis der Dialog da ist */
async function songDialogOeffnen(p) {
  const dialog = p.locator('app-song-dialog dialog[open]');
  await until(async () => {
    if (await dialog.count()) return true;
    await p.locator('app-backstage-songs tbody tr').first().click().catch(() => {});
    await p.waitForTimeout(300);
    return (await dialog.count()) > 0;
  }, 'Song-Dialog öffnet sich nicht', 10000);
}

/** Schritt mit Namen: scheitert er, steht der Name in der Meldung (statt nur „locator.click: Timeout“) */
async function schritt(name, fn) {
  try {
    return await fn();
  } catch (e) {
    throw new Error(`${name}: ${String(e.message).split('\n')[0]}`);
  }
}

async function page(options = {}) {
  const { ohneZugang, ...rest } = options;
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', acceptDownloads: true, locale: 'de-DE', ...rest });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
  if (!ohneZugang) await zugangFreischalten(context);
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
  // im laufenden Monat ist wegen Abwesenheiten und Schonzeit evtl. nichts frei – über die Chips „freie Wochen“ springen
  if (!(await p.locator('app-availability button.day.free').count())) await p.locator('app-availability .samstage button').first().click();
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

test('Pressekit: anstehende Konzerte über dem Pressetext, Unterseite mit Plakat, Story, Texten und Songliste', async () => {
  const p = await page();
  await p.go('/presse/');
  const termin = p.locator('app-presse-termine a').first();
  await termin.waitFor();
  expect(!(await p.locator('app-presse app-referenzen').count()), 'Referenzen stehen noch im Pressekit');
  const reihe = await p.evaluate(() => {
    const t = document.querySelector('app-presse-termine').getBoundingClientRect().top;
    const h = [...document.querySelectorAll('app-presse h3')].find((x) => /Pressetext/.test(x.textContent ?? '')).getBoundingClientRect().top;
    return t < h;
  });
  expect(reihe, 'Konzerte stehen nicht über dem Pressetext');
  await termin.click();
  await p.waitForURL(/\/presse\/\d{4}-/);
  const seite = p.locator('app-presse-konzert');
  await until(async () => (await seite.locator('figure img').count()) === 2, 'Plakat und Story werden nicht gezeichnet');
  await until(async () => (await seite.locator('.texte pre').count()) >= 4, 'Texte fehlen');
  await until(async () => (await seite.locator('.songs li').count()) > 20, 'Songliste fehlt');
  expect(((await seite.locator('figure a[download]').first().getAttribute('download')) ?? '').endsWith('.png'), 'Download des Plakats fehlt');
  // Alles als PDF (Eckdaten, Plakat, Texte, Songliste)
  const [alles] = await Promise.all([p.waitForEvent('download'), seite.locator('button', { hasText: 'Alles als PDF' }).click()]);
  expect(alles.suggestedFilename().startsWith('blickfeld-nord-pressekit-'), 'Pressekit-PDF des Konzerts fehlt');
  expect((await import('node:fs')).readFileSync(await alles.path()).subarray(0, 5).toString() === '%PDF-', 'Pressekit-PDF ist kein PDF');
  // Teilen: Link zur Pressekit-Seite mit Herkunft „presse-geteilt“
  await p.evaluate(() => { window.__geteilt = null; navigator.share = async (d) => { window.__geteilt = d; }; });
  await seite.getByRole('button', { name: 'Teilen' }).click();
  await until(async () => /\/presse\/\d{4}-\d{2}-\d{2}[^/]*\/\?ref=presse-geteilt/.test((await p.evaluate(() => window.__geteilt?.url)) ?? ''), 'Teilen des Pressekits fehlt');
  expect(/Pressekit Blickfeld Nord/.test(await p.evaluate(() => window.__geteilt.text)), 'Text beim Teilen fehlt');
  // Plakat zum Drucken (PDF), Was wir vor Ort brauchen
  const [pdf] = await Promise.all([p.waitForEvent('download'), seite.locator('.druck button').first().click()]);
  expect(pdf.suggestedFilename().endsWith('-a4.pdf'), 'Druck-PDF fehlt');
  expect((await seite.locator('.vor-ort li').count()) >= 4, 'Was wir vor Ort brauchen fehlt');
  // englische Seite: Texte auf Englisch
  await p.go(new URL(p.url()).pathname.replace('/presse/', '/en/presse/'));
  await until(async () => (await p.locator('app-presse-konzert .texte pre').first().innerText().catch(() => '')).includes('Free entry') || (await p.locator('app-presse-konzert .texte pre').first().innerText().catch(() => '')).includes('from '), 'Englische Texte fehlen');
  // Konzertseite: Story mit Countdown teilen, Termine: Saisonplanung
  await p.go(new URL(p.url()).pathname.replace('/en/presse/', '/konzerte/'));
  await until(async () => (await p.locator('app-konzert button', { hasText: 'Als Story teilen' }).count()) === 1, 'Story-Knopf auf der Konzertseite fehlt');
  await p.go('/backstage/termine/');
  await until(async () => /Saisonplanung/.test(await p.locator('app-saison-planung').innerText().catch(() => '')), 'Saisonplanung fehlt');
  // eigene Seite Termine → Saison mit Auftritten und Proben
  await p.locator('app-saison-planung summary').click();
  await p.locator('app-saison-planung .mehr a').first().click();
  await p.waitForURL(/\/backstage\/termine\/saison/);
  await until(async () => (await p.locator('app-termine-saison article').count()) === 12, 'Saison-Seite zeigt keine 12 Monate');
  await until(async () => (await p.locator('app-termine-saison li.probe').count()) > 0, 'Proben fehlen in der Saison');
  const [bild] = await Promise.all([p.waitForEvent('download'), p.locator('app-termine-saison button', { hasText: 'Als Bild teilen' }).click()]);
  expect(bild.suggestedFilename().startsWith('blickfeld-nord-saison-'), 'Saison-Bild fehlt');
  // Kontakte: neuen Veranstalter anlegen
  await p.go('/backstage/termine/kontakte/');
  const neu = p.locator('app-termine-kontakte details.neu');
  await neu.locator('summary').click();
  await neu.locator('input').nth(0).fill('Testclub');
  await neu.locator('input').nth(1).fill('Bocholt');
  await neu.locator('input').nth(2).fill('Ben');
  await neu.locator('button[type=submit]').click();
  await until(async () => /Testclub[\s\S]*Ben/.test(await p.locator('app-termine-kontakte .kontakte').innerText()), 'Neuer Kontakt fehlt in der Liste');
  // Zusage → Auftritt: Formular mit Location und Ort vorbelegt
  await p.locator('app-termine-kontakte li', { hasText: 'Testclub' }).locator('button', { hasText: 'Zusage' }).click();
  await p.waitForURL(/\/backstage\/termine\?neu=auftritt/);
  await until(async () => (await p.locator('app-termin-formular label', { hasText: 'Location' }).locator('input').inputValue().catch(() => '')) === 'Testclub', 'Formular nicht vorbelegt');
  // Ansprechpartner beim Auftritt bleibt gespeichert und gilt am selben Ort
  await p.go(`/backstage/${new URL(BASE + concerts[0]).pathname.split('/')[2]}`);
  const kontakt = p.locator('app-kontakt-karte');
  await kontakt.locator('summary').click();
  await kontakt.locator('input').first().fill('Anna');
  await kontakt.locator('input').first().blur();
  await until(async () => (await p.evaluate(() => localStorage.getItem('bn-kontakte') ?? '')).includes('Anna'), 'Kontakt wird nicht gespeichert');
  // Booking: freie Wochen je Monat
  await p.go('/booking/');
  await until(async () => (await p.locator('app-availability .samstage button').count()) > 0, 'Freie Wochen fehlen im Booking');
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

test('Backstage: Übersicht ohne Kacheln, Bereich im Menü markiert, Direktaufruf eines Bereichs klappt', async () => {
  const p = await page();
  await p.go('/backstage/');
  expect(!(await p.locator('app-backstage .tiles').count()), 'Kacheln stehen noch in der Übersicht');
  await p.go('/backstage/material/');
  await until(async () => ((await p.locator('#hauptmenue a.on').textContent()) ?? '').includes('Material'), 'Navigation markiert den Bereich nicht');
  // Direktaufruf (z. B. Lesezeichen) geht über die Fehlerseite – muss im richtigen Bereich landen
  await p.go('/backstage/zahlen/');
  await until(async () => new URL(p.url()).pathname.replace(/\/$/, '') === '/backstage/zahlen', 'Direktaufruf /backstage/zahlen landet woanders');
  await p.locator('app-backstage-besucher').waitFor();
  return p;
});

test('Backstage: Suche über alles, Übersicht ohne „Zahlen und Songs“', async () => {
  const p = await page();
  await p.go('/backstage/');
  const suche = p.locator('app-backstage-suche input');
  await suche.fill('Nenna');
  const auftritt = p.locator('app-backstage-suche li a', { hasText: 'Café Nenna' }).first();
  await auftritt.waitFor();
  await auftritt.click();
  await until(async () => new URL(p.url()).pathname.replace(/\/$/, '') === '/backstage/2027-02-19', () => `Treffer führt nach ${p.url()}`);
  // Song-Treffer öffnet die Songs-Liste mit der Suche
  await p.go('/backstage/');
  await p.locator('app-backstage-suche input').fill('small things');
  await p.locator('app-backstage-suche li a', { hasText: 'All The Small Things' }).first().click();
  await until(async () => (await p.locator('input[aria-label="Songs durchsuchen"]').inputValue().catch(() => '')) === 'All The Small Things', 'Songs-Liste ohne vorbelegte Suche');
  // Sammlung finden → ihre Seite unter Songs → Sammlungen
  await p.go('/backstage/');
  await p.locator('app-backstage-suche input').fill('Weihnachtslieder');
  await p.locator('app-backstage-suche li a', { hasText: 'Sammlung' }).first().click();
  await until(async () => (await p.locator('app-songs-sammlungen h3').innerText().catch(() => '')).toLowerCase().includes('weihnachtslieder'), 'Sammlung aus der Suche öffnet nicht ihre Seite');
  // „Zahlen und Songs“ steht nicht mehr in der Übersicht (eigene Unterseite Zahlen)
  await p.go('/backstage/');
  expect(!(await p.locator('app-backstage details.zahlen').count()), '„Zahlen und Songs“ steht noch in der Übersicht');
  return p;
});

test('Backstage: Veranstalter bewerten – Kurzfassung in den Kontakten', async () => {
  const p = await page();
  await p.go('/backstage/2027-02-19/');
  const karte = p.locator('app-kontakt-karte');
  await karte.locator('summary').first().click();
  await karte.locator('input[type=tel]').fill('0171 1234567');
  await karte.locator('input[type=tel]').dispatchEvent('change');
  await karte.locator('[aria-label="Technik"] button', { hasText: 'gut' }).click();
  await karte.locator('[aria-label="Bezahlung"] button', { hasText: 'pünktlich' }).click();
  await until(async () => ((await karte.locator('summary').first().textContent()) ?? '').includes('Technik gut · Geld pünktlich'), 'Bewertung fehlt im Kopf der Karte');
  await p.go('/backstage/termine/kontakte/');
  await until(async () => ((await p.locator('app-termine-kontakte .bewerten summary').first().textContent()) ?? '').includes('Technik gut'), 'Bewertung fehlt in den Kontakten');
  return p;
});

test('Backstage: Bereit? prüft den Bühnen-Modus ohne Netz und lädt fehlende Teile nach', async () => {
  // echter Service Worker (sonst überall gesperrt), Datum eine Woche vor dem Weihnachtsmarkt
  const p = await page({ serviceWorkers: 'allow' });
  await p.clock.setFixedTime(new Date('2026-11-30T10:00:00'));
  await p.go('/backstage/2026-12-04/');
  await p.evaluate(() => navigator.serviceWorker.ready);
  await until(async () => p.evaluate(() => !!navigator.serviceWorker.controller), 'Service Worker übernimmt die Seite nicht');
  await p.go('/backstage/2026-12-04/');
  const bereit = p.locator('app-bereitschaft').first();
  if ((await bereit.locator('details').getAttribute('open')) === null) await bereit.locator('summary').click();
  const punkt = bereit.locator('li', { hasText: 'Bühnen-Modus ohne Netz' });
  await punkt.waitFor();
  expect(!(await punkt.getAttribute('class'))?.includes('ok'), 'pdf.js ist vor dem Vorladen schon gespeichert – Test prüft nichts');
  await punkt.getByRole('button', { name: 'Jetzt vorladen' }).click();
  await until(async () => ((await punkt.getAttribute('class')) ?? '').includes('ok'), async () => `nach dem Vorladen nicht bereit: ${await punkt.textContent()}`);
  return p;
});

test('Backstage: Tap-Tempo und Status in der Songliste, Veranstalter-Mappe als PDF', async () => {
  const p = await page();
  await p.go('/backstage/songs/');
  await p.locator('app-songs-liste .filter label', { hasText: 'schnell eintragen' }).locator('input').check();
  // nur unsichere bzw. automatisch ermittelte Werte
  await p.locator('app-songs-liste .filter select').first().selectOption('unsicher');
  await until(async () => (await p.locator('app-songs-liste tbody tr .status').count()) > 0, 'Filter „unsicher“ zeigt nichts');
  const zeile = p.locator('app-songs-liste tbody tr').first();
  const tap = zeile.locator('.schnell .tap');
  for (let i = 0; i < 5; i++) {
    await tap.click();
    await p.waitForTimeout(500);
  }
  await until(async () => Math.abs(Number(await zeile.locator('.schnell input').inputValue().catch(() => '0')) - 120) <= 6, async () => `Tap-Tempo trägt nichts ein: ${await zeile.locator('.schnell input').inputValue()}`);
  await until(async () => (await p.locator('app-songs-liste .apply').innerText().catch(() => '')).includes('geändert'), 'Tap-Tempo landet nicht im Entwurf');
  // Mappe eines neuen Veranstalters
  await p.go('/backstage/termine/kontakte/');
  await p.locator('app-termine-kontakte details.neu summary').click();
  await p.locator('app-termine-kontakte form label', { hasText: 'Ort' }).locator('input').fill('Testhalle');
  await p.locator('app-termine-kontakte form label', { hasText: 'Stadt' }).locator('input').fill('Rhede');
  await p.locator('app-termine-kontakte form button[type=submit]').click();
  const [pdf] = await Promise.all([p.waitForEvent('download'), p.locator('app-termine-kontakte li', { hasText: 'Testhalle' }).getByRole('button', { name: /Mappe/ }).click()]);
  expect(pdf.suggestedFilename() === 'Mappe Testhalle.pdf', `Mappe heißt ${pdf.suggestedFilename()}`);
  return p;
}, { allein: true });

test('Woche vor dem Konzert: „Noch … Tage“-Leiste auf Unterseiten, nicht auf der Startseite', async () => {
  const p = await page();
  await p.clock.setFixedTime(new Date('2026-11-30T10:00:00'));
  await p.go('/booking/');
  await until(async () => /Noch 4 Tage/.test((await p.locator('app-bald-leiste').innerText().catch(() => '')) ?? ''), 'Leiste fehlt auf /booking');
  await p.locator('app-bald-leiste a').click();
  await until(async () => new URL(p.url()).pathname.startsWith('/konzerte/2026-12-04'), () => `Leiste führt nach ${p.url()}`);
  expect(!(await p.locator('app-bald-leiste .bald').count()), 'Leiste auf der eigenen Konzertseite');
  await p.go('/');
  await p.waitForTimeout(500);
  expect(!(await p.locator('app-bald-leiste .bald').count()), 'Leiste auf der Startseite');
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
  // click statt check: der Eintrag verschwindet mit dem Haken – check() wartete dann vergeblich auf den angehakten Zustand
  await eintrag.locator('input[type=checkbox]').click();
  await until(async () => (await p.locator('app-heute-faellig li', { hasText: 'Erste Story' }).count()) === 0, 'Schritt bleibt nach dem Abhaken in „Heute fällig“');
  await p.go(`/backstage/${id}/`);
  await until(async () => await p.locator('#wp-story-1').isChecked(), 'Haken fehlt im Werbeplan des Auftritts');
  // „Story teilen“ im Werbeplan: Bild mit Countdown (am Rechner als Download), Text mit Herkunft in der Zwischenablage, abgehakt
  // Bild ist meist schon vorbereitet (ein Tipp); sonst erscheint „Jetzt teilen“ für den zweiten Tipp
  const storyKnopf = p.locator('app-werbeplan button[aria-label$="Story für „Eine Woche vorher“ teilen"]');
  const [story] = await Promise.all([
    p.waitForEvent('download'),
    (async () => {
      await storyKnopf.click();
      await until(async () => (await p.evaluate(() => document.querySelector('app-werbeplan')?.textContent ?? '')).length > 0 && !(await storyKnopf.isDisabled()), 'Story wird nicht vorbereitet');
      if (/^Jetzt teilen/.test((await storyKnopf.getAttribute('aria-label')) ?? '')) await storyKnopf.click();
    })(),
  ]);
  expect(story.suggestedFilename().endsWith('.png'), 'Story-Bild fehlt');
  await until(async () => await p.locator('#wp-woche').isChecked(), 'Geteilter Schritt wird nicht abgehakt');
  expect(/^https:\/\/blickfeld-nord\.de\/konzerte\/[^ ]*ref=story-woche&utm_campaign=konzert-/.test(await p.evaluate(() => navigator.clipboard.readText())), 'Link für den Link-Sticker fehlt in der Zwischenablage');
  await until(async () => (await p.locator('app-werbeplan .meldung').innerText().catch(() => '')).includes('abgehakt'), 'Meldung nach dem Teilen fehlt');
  // Kachel „Instagram“: Beitrag, Story, Reel, Highlight-Cover – Highlight-Cover teilen (am Rechner Download)
  const ig = p.locator('app-instagram-formate');
  await until(async () => (await ig.locator('li').count()) === 4, 'Instagram-Formate fehlen');
  const cover = ig.getByRole('button', { name: /Highlight-Cover$/ });
  const [bild] = await Promise.all([
    p.waitForEvent('download'),
    (async () => {
      await cover.click();
      await until(async () => !(await cover.isDisabled()), 'Highlight-Cover wird nicht vorbereitet');
      if (/^Jetzt teilen/.test((await cover.getAttribute('aria-label')) ?? '')) await cover.click();
    })(),
  ]);
  expect(bild.suggestedFilename().startsWith('blickfeld-nord-highlight-'), 'Highlight-Cover fehlt');
  // Kampagne: Summen mit Einzelzahlen (ohne GoatCounter im Test: Hinweis statt Zahlen)
  // mit nachgestellten GoatCounter-Zahlen: Summe je Gruppe und Einzelzahlen
  const zahlen = { [`kampagne-konzert-${id}-story-1`]: 2, [`kampagne-konzert-${id}-story-woche`]: 3, [`kampagne-konzert-${id}-geteilt`]: 4, [`/konzerte/${id}`]: 10, [`/en/konzerte/${id}`]: 1 };
  await p.route(/goatcounter\.com\/counter\//, (route) => {
    const pfad = decodeURIComponent(new URL(route.request().url()).pathname.replace(/^\/counter\//, '').replace(/\.json$/, ''));
    return zahlen[pfad] ? route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ count: String(zahlen[pfad]) }) }) : route.fulfill({ status: 404, headers: { 'access-control-allow-origin': '*' }, body: '' });
  });
  await p.reload({ waitUntil: 'networkidle' });
  const kachel = p.locator('app-konzert-kampagne');
  // Kachel lädt erst im sichtbaren Bereich (@defer on viewport)
  await until(async () => (await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)), (await kachel.count()) > 0), 'Kampagnen-Kachel wird nicht geladen');
  await kachel.scrollIntoViewIfNeeded();
  await until(async () => /11\s*Aufrufe der Konzertseite[\s\S]*DE 10[\s\S]*EN 1/.test(await kachel.innerText().catch(() => '')), async () => 'Konzertseite ohne Summe und Sprachen: ' + (await kachel.innerText().catch(() => '')));
  const kText = await kachel.innerText();
  expect(/9\s*über die Werbung insgesamt/.test(kText), 'Summe aller Wege fehlt: ' + kText);
  expect(/5\s*über Stories[\s\S]*2 Wochen vorher 2[\s\S]*1 Woche vorher 3/.test(kText), 'Stories ohne Summe und Einzelzahlen: ' + kText);
  await p.go('/backstage/aufgaben/');
  await p.locator('app-backstage-aufgaben .item').first().waitFor();
  expect(!(await p.locator('app-backstage-aufgaben').innerText()).includes('Erste Story'), 'abgehakter Schritt steht noch unter Aufgaben');
  return p;
}, { allein: true });

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

test('Backstage: Probe-Modus – Übe-Status mit fünf Stufen, Notiz je Person, Rest auf die nächste Probe', async () => {
  const p = await page();
  await p.go('/backstage/termine/');
  await p.locator('a.row-link', { hasText: 'Probe' }).first().click();
  await p.waitForURL(/\/backstage\/probe\//);
  const datum = p.url().match(/probe\/(\d{4}-\d{2}-\d{2})/)[1];
  await p.evaluate((d) => {
    localStorage.setItem('bn-probe-' + d, JSON.stringify({ songs: [{ title: 'Iris', artist: 'The Goo Goo Dolls', done: false }, { title: 'Africa', artist: 'TOTO', done: false }, { title: 'Angels', artist: 'Robbie Williams', done: false }], notizen: '', punkte: [] }));
    localStorage.setItem('bn-ich', 'jan-frederic-overbeck');
  }, datum);
  // Spotify im Übe- und Probe-Modus: Standard aus; in den Einstellungen wählbar (eingebetteter Player / Fernsteuerung)
  const probeSeite = p.url();
  await p.go('/backstage/einstellungen/');
  const spotifyWahl = p.locator('app-spotify-einstellung select');
  expect((await spotifyWahl.inputValue()) === 'aus', 'Spotify ist nicht standardmäßig aus');
  // Fernsteuerung: „Diagnose“ zeigt das Protokoll mit den Einstellungen dieses Geräts
  await spotifyWahl.selectOption('fern');
  await p.locator('app-spotify-einstellung details.diagnose summary').click();
  await until(async () => /Spotify-Protokoll[\s\S]*Einstellung: fern · verbunden: nein[\s\S]*noch nichts aufgezeichnet/.test(await p.locator('app-spotify-einstellung pre').innerText().catch(() => '')), 'Diagnose zeigt das Spotify-Protokoll nicht');
  await spotifyWahl.selectOption('vorschau');
  await until(async () => (await p.evaluate(() => localStorage.getItem('bn-spotify-modus'))) === '"vorschau"', 'Spotify-Einstellung wird nicht gespeichert');
  await p.goto(probeSeite, { waitUntil: 'networkidle' });
  // Probe-Modus starten steht ganz oben, vor „Wer kommt?“
  expect(await p.locator('app-backstage-probe').evaluate((el) => { const b = el.querySelector('.probe-start.oben'); const h = [...el.querySelectorAll('h3')].find((x) => x.textContent.includes('Wer kommt')); return !!b && !!h && !!(b.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING); }), 'Probe-Modus starten steht nicht oben');
  await p.locator('app-backstage-probe button', { hasText: 'Probe-Modus starten' }).click();
  const buehne = p.locator('app-setlist-buehne');
  await until(async () => /probe[\s\S]*song 1 \/ 3/i.test(await buehne.locator('header .set').innerText().catch(() => '')), 'Probe-Modus startet nicht');
  // Spotify-Player (Iris steht in den Spotify-Listen): erst auf Knopfdruck, mit der Einbett-Adresse des Tracks
  expect((await buehne.locator('.spotify-player iframe').count()) === 0, 'Spotify-Player lädt ohne Knopfdruck');
  await buehne.locator('button.spotify-knopf').click();
  await until(async () => /open\.spotify\.com\/embed\/track\/6Qyc6fS4DsZjB2mRW9DsQs/.test((await buehne.locator('.spotify-player iframe').getAttribute('src').catch(() => '')) ?? ''), 'Spotify-Player erscheint nicht');
  await buehne.locator('button.spotify-knopf').click();
  // Einstellung „Fernsteuerung“: Probe-Modus neu öffnen – ohne Verbindung nur „Spotify verbinden“, keine Vorschau;
  // verbunden spielt ▶ den ganzen Song in der Spotify-App
  expect((await buehne.locator('app-spotify-steuerung').count()) === 0, 'Fernsteuerung erscheint ohne die Einstellung');
  await buehne.locator('button[aria-label="Probe-Modus beenden"]').first().click();
  await until(async () => (await buehne.count()) === 0, 'Probe-Modus schließt nicht');
  await p.evaluate(() => localStorage.setItem('bn-spotify-modus', '"fern"'));
  await p.locator('app-backstage-probe button', { hasText: 'Probe-Modus starten' }).click();
  await until(async () => (await buehne.locator('app-spotify-steuerung button.verbinden').count()) === 1, '„Spotify verbinden“ fehlt');
  expect((await buehne.locator('button.spotify-knopf').count()) === 0, 'Vorschau erscheint trotz Einstellung „Fernsteuerung“');
  const gespielt = [];
  let spotifySpielt = false;
  let pausen = 0;
  let abfragenNachStart = 0;
  let keinGeraet = true;
  // 'gut' · 'kaputt': die Abfrage des Stands scheitert · 'ende': der Song ist durchgelaufen (spielt nicht, Stelle 0) ·
  // 'schlaeft': Spotify nimmt Befehle an, das Gerät spielt aber nichts
  let standArt = 'gut';
  let zuletztTrack = '6Qyc6fS4DsZjB2mRW9DsQs';
  await p.route('https://api.spotify.com/**', async (route) => {
    const r = route.request();
    const pfad = new URL(r.url()).pathname;
    if (pfad.endsWith('/me/player/devices')) return route.fulfill({ json: { devices: keinGeraet ? [] : [{ id: 'd1', name: 'Handy', type: 'Smartphone', is_active: true }] } });
    if (pfad.endsWith('/me/player/play')) {
      gespielt.push(r.url() + ' ' + (r.postData() ?? ''));
      spotifySpielt = true;
      zuletztTrack = /spotify:track:(\w+)/.exec(r.postData() ?? '')?.[1] ?? zuletztTrack;
      // wie bei Spotify: Erfolg mit einem Text, der kein JSON ist
      return route.fulfill({ status: 200, contentType: 'application/json', body: 'kein-json-AbC123' });
    }
    if (pfad.endsWith('/me/player/pause')) {
      spotifySpielt = false;
      pausen++;
      return route.fulfill({ status: 204 });
    }
    // direkt nach dem Start meldet Spotify noch „spielt nicht“ – die Anzeige darf nicht auf ▶ zurückfallen
    if (pfad.endsWith('/me/player') && spotifySpielt && abfragenNachStart++ === 0) return route.fulfill({ json: { is_playing: false, progress_ms: 0, item: null, device: { id: 'd1', name: 'Handy' } } });
    if (pfad.endsWith('/me/player') && standArt === 'kaputt') return route.fulfill({ status: 403, body: 'nein' });
    // wie auf dem Handy, wenn die Spotify-App im Hintergrund den Befehl annimmt, aber nichts spielt
    if (pfad.endsWith('/me/player') && standArt === 'schlaeft') return route.fulfill({ json: { is_playing: false, progress_ms: 0, item: null, currently_playing_type: 'unknown', device: { id: 'd1', name: 'Handy' } } });
    if (pfad.endsWith('/me/player') && standArt === 'ende') return route.fulfill({ json: { is_playing: false, progress_ms: 0, item: { id: zuletztTrack, duration_ms: 200000 }, device: { id: 'd1', name: 'Handy' } } });
    if (pfad.endsWith('/me/player')) return route.fulfill({ json: { is_playing: spotifySpielt, progress_ms: 5000, item: { id: zuletztTrack, duration_ms: 200000 }, device: { id: 'd1', name: 'Handy' } } });
    return route.fulfill({ status: 204 });
  });
  await p.evaluate(() => localStorage.setItem('bn-spotify-token', JSON.stringify({ access: 'test', refresh: 'test', bis: 9e15 })));
  // Steuerung neu aufbauen (liest die Verbindung beim Erscheinen): einen Song weiter und zurück
  await buehne.focus();
  await p.keyboard.press('ArrowRight');
  await until(async () => (await buehne.locator('h1').innerText()).includes('Africa'), 'Weiter zu Africa klappt nicht');
  await p.keyboard.press('ArrowLeft');
  await until(async () => (await buehne.locator('h1').innerText()).includes('Iris'), 'Zurück zu Iris klappt nicht');
  // Spotify läuft auf keinem Gerät: sichtbare Meldung mit „Spotify öffnen“ (auch über der Notenansicht), nichts wird gestartet
  await buehne.locator('app-spotify-steuerung button[aria-label="Auf Spotify abspielen"]').click();
  await until(async () => /Spotify läuft auf keinem Gerät/.test(await buehne.locator('.spotify-hinweis').innerText().catch(() => '')), 'Meldung „kein Gerät“ fehlt');
  expect(((await buehne.locator('.spotify-hinweis a').getAttribute('href')) ?? '').includes('open.spotify.com/track/6Qyc6fS4DsZjB2mRW9DsQs') && !gespielt.length, '„Spotify öffnen“ fehlt oder es wurde trotzdem gestartet');
  keinGeraet = false;
  await buehne.locator('app-spotify-steuerung button[aria-label="Auf Spotify abspielen"]').click();
  await until(async () => (await buehne.locator('.spotify-hinweis').count()) === 0, 'Meldung bleibt nach erfolgreichem Start stehen');
  await until(async () => gespielt.some((x) => x.includes('device_id=d1') && x.includes('spotify:track:6Qyc6fS4DsZjB2mRW9DsQs')), () => `▶ spielt den Song nicht über Spotify: ${gespielt.join(' | ')}`);
  await until(async () => (await buehne.locator('app-spotify-steuerung button[aria-label="Pause"]').count()) === 1, 'nach ▶ kein ⏸');
  // Fortschritt kommt von Spotify (5 s von 3:20), obwohl die erste Abfrage noch den alten Stand meldete; kein Fehlerhinweis
  await until(async () => /0:0[5-9] \/ 3:20/.test(await buehne.locator('app-spotify-steuerung .zeit').innerText().catch(() => '')), async () => `Fortschritt fehlt: ${await buehne.locator('app-spotify-steuerung .zeit').innerText().catch(() => '')}`);
  expect((await buehne.locator('app-spotify-steuerung button[aria-label="Pause"]').count()) === 1 && (await buehne.locator('app-spotify-steuerung .hinweis').count()) === 0, 'Steuerung fällt nach dem Start zurück oder meldet einen Fehler');
  // Spotifys Rückmeldung fällt aus (die Abfrage scheitert): Der Fortschritt läuft mit der eigenen Uhr weiter, der Balken wächst
  standArt = 'kaputt';
  const spZeit = async () => {
    const m = /(\d+):(\d\d) \//.exec(await buehne.locator('app-spotify-steuerung .zeit').innerText().catch(() => ''));
    return m ? Number(m[1]) * 60 + Number(m[2]) : -1;
  };
  const spKnopf = (name) => buehne.locator(`app-spotify-steuerung button[aria-label="${name}"]`);
  const zeit0 = await spZeit();
  await until(async () => (await spZeit()) >= zeit0 + 2, async () => `Fortschritt bleibt ohne Spotifys Rückmeldung stehen (${zeit0} → ${await spZeit()})`);
  expect((await buehne.locator('app-spotify-steuerung input.balken').evaluate((el) => Number(el.value) || 0)) > 0, 'Fortschrittsbalken zeigt keinen Fortschritt');
  expect((await spKnopf('Pause').count()) === 1, 'Steuerung fällt ohne Spotifys Rückmeldung auf ▶ zurück');
  // ⏸, danach listet Spotify das Gerät nicht mehr: ▶ setzt trotzdem fort – auf dem gemerkten Gerät, ohne Meldung
  await spKnopf('Pause').click();
  await until(async () => pausen >= 1 && (await spKnopf('Auf Spotify abspielen').count()) === 1, 'Pause klappt nicht');
  keinGeraet = true;
  const startsVorWeiter = gespielt.length;
  await spKnopf('Auf Spotify abspielen').click();
  await until(async () => gespielt.length === startsVorWeiter + 1 && gespielt.at(-1).includes('device_id=d1') && !gespielt.at(-1).includes('spotify:track'), () => `▶ nach der Pause setzt nicht auf dem gemerkten Gerät fort: ${gespielt.slice(startsVorWeiter).join(' | ')}`);
  await until(async () => (await spKnopf('Pause').count()) === 1, 'nach dem Fortsetzen kein ⏸');
  expect((await buehne.locator('.spotify-hinweis').count()) === 0, 'Fortsetzen meldet „kein Gerät“, obwohl das gemerkte Gerät antwortet');
  // gespielt wird immer der angezeigte Song: Africa steht in keiner Spotify-Liste → Pause; beim nächsten Song mit
  // Track (Angels) startet er wieder von selbst – auch ohne Geräteliste und ohne Rückmeldung
  const zu = async (taste, titel) => {
    await buehne.focus();
    await p.keyboard.press(taste);
    await until(async () => (await buehne.locator('h1').innerText()).includes(titel), `Blättern zu ${titel} klappt nicht`);
  };
  const pausenVorher = pausen;
  // Tippen neben die Spotify-Knöpfe blättert (rechts: weiter) – die Box der Steuerung fängt es nicht mehr ab
  const spBox = await buehne.locator('app-spotify-steuerung').boundingBox();
  await p.mouse.click(spBox.x + spBox.width - 3, spBox.y + 3);
  await until(async () => (await buehne.locator('h1').innerText()).includes('Africa'), 'Tippen neben die Spotify-Knöpfe blättert nicht weiter');
  await until(async () => pausen === pausenVorher + 1, () => `Beim Wechsel zu einem Song ohne Spotify-Track läuft der alte weiter (${pausen} Pausen)`);
  await zu('ArrowRight', 'Angels');
  await until(async () => gespielt.length === startsVorWeiter + 2 && gespielt.at(-1).includes('device_id=d1') && gespielt.at(-1).includes('spotify:track:1M2nd8jNUkkwrc1dgBPTJz'), () => `Beim Weiterblättern startet der nächste Song nicht: ${gespielt.slice(startsVorWeiter).join(' | ')}`);
  await until(async () => (await spKnopf('Pause').count()) === 1, 'nach dem Weiterblättern kein ⏸');
  // Song ist durchgelaufen (Spotify meldet: spielt nicht, Stelle 0): ▶ erscheint – und beim Blättern startet trotzdem der nächste
  standArt = 'ende';
  await until(async () => (await spKnopf('Auf Spotify abspielen').count()) === 1, 'nach dem Ende des Songs bleibt ⏸ stehen', 12000);
  standArt = 'gut';
  await zu('ArrowLeft', 'Africa');
  await zu('ArrowLeft', 'Iris');
  await until(async () => gespielt.length === startsVorWeiter + 3 && gespielt.at(-1).includes('spotify:track:6Qyc6fS4DsZjB2mRW9DsQs'), () => `Nach einem durchgelaufenen Song startet der nächste beim Blättern nicht: ${gespielt.slice(startsVorWeiter).join(' | ')}`);
  await until(async () => (await spKnopf('Pause').count()) === 1, 'nach dem Blättern kein ⏸');
  // selbst ⏸ gedrückt: beim Weiterblättern wird nichts vorgespielt, bis wieder ▶ gedrückt wird
  await spKnopf('Pause').click();
  await until(async () => (await spKnopf('Auf Spotify abspielen').count()) === 1, 'Pause klappt nicht');
  await zu('ArrowRight', 'Africa');
  await zu('ArrowRight', 'Angels');
  await p.waitForTimeout(700);
  expect(gespielt.length === startsVorWeiter + 3 && (await spKnopf('Auf Spotify abspielen').count()) === 1, 'nach eigener Pause spielt das Weiterblättern von selbst los');
  await zu('ArrowLeft', 'Africa');
  await zu('ArrowLeft', 'Iris');
  // Spotify nimmt ▶ an (204), das Handy spielt aber nichts (App im Hintergrund): kein vorgetäuschter Fortschritt,
  // sondern „startet …“, dann ein Hinweis mit „Spotify öffnen“ – und nach der Rückkehr in die App stimmt der Stand
  standArt = 'schlaeft';
  const startsVorSchlaf = gespielt.length;
  await spKnopf('Auf Spotify abspielen').click();
  await until(async () => gespielt.length === startsVorSchlaf + 1 && (await spKnopf('Spotify startet …').count()) === 1, 'nach ▶ wartet die Steuerung nicht auf Spotifys Bestätigung');
  await until(async () => /angenommen, spielt aber nicht/.test(await buehne.locator('.spotify-hinweis').innerText().catch(() => '')), 'Hinweis „angenommen, spielt aber nicht“ fehlt', 9000);
  expect((await spKnopf('Auf Spotify abspielen').count()) === 1 && (await buehne.locator('.spotify-hinweis a').count()) === 1 && /^0:00 /.test(await buehne.locator('app-spotify-steuerung .zeit').innerText()), 'nicht gestarteter Song wird als laufend gezeigt oder „Spotify öffnen“ fehlt');
  standArt = 'gut';
  await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await until(async () => (await spKnopf('Pause').count()) === 1 && (await buehne.locator('.spotify-hinweis').count()) === 0, 'nach der Rückkehr aus der Spotify-App stimmt der Stand nicht');
  expect(gespielt.length === startsVorSchlaf + 1, 'läuft der Song nach der Rückkehr schon, wird er nicht noch einmal gestartet');
  await spKnopf('Pause').click();
  await until(async () => (await spKnopf('Auf Spotify abspielen').count()) === 1, 'Pause klappt nicht');
  // Diagnose: Befehle und Antworten stehen im Protokoll dieses Geräts – ohne den Zugangsschlüssel, Geräte-ID gekürzt
  const spProtokoll = await p.evaluate(() => JSON.parse(localStorage.getItem('bn-spotify-protokoll') ?? '[]').join('\n'));
  expect(/PUT \/me\/player\/play\?device_id=d1 .*spotify:track:6Qyc6fS4DsZjB2mRW9DsQs.* → 200/.test(spProtokoll) && spProtokoll.includes('PUT /me/player/pause → 204') && /Songwechsel → 1M2nd8jNUkkwrc1dgBPTJz/.test(spProtokoll) && spProtokoll.includes('keine Geräte') && /Knopf ▶/.test(spProtokoll), `Spotify-Protokoll unvollständig: ${spProtokoll.split("\n").filter((z) => !z.includes("GET /me/player →") || z.includes("403")).join(" ¦ ")}`);
  expect(!/Bearer|"access"|refresh/.test(spProtokoll), 'Spotify-Protokoll enthält den Zugang');
  await p.unroute('https://api.spotify.com/**');
  await p.evaluate(() => localStorage.removeItem('bn-spotify-token'));
  const leiste = buehne.locator('app-probe-leiste');
  // fünf Stufen statt Sitzt/Nochmal; Durchlauf und Übergang gibt es nicht mehr
  expect((await leiste.locator('app-status-schalter button').evaluateAll((b) => b.map((x) => x.getAttribute('aria-label')))).join('|') === 'Nicht gelernt|Üben|Wackelt noch|Sitzt|Eingenordet', 'Status-Umschalter hat nicht die fünf Stufen');
  expect((await leiste.getByRole('button', { name: /Durchlauf|Übergang/ }).count()) === 0, 'Durchlauf/Übergang sind noch da');
  // Song 1: Wackelt noch und eigene Notiz – Tippen in die Notiz blättert nicht
  await leiste.getByRole('button', { name: 'Wackelt noch', exact: true }).click();
  await until(async () => (await leiste.getByRole('button', { name: 'Wackelt noch', exact: true }).getAttribute('aria-pressed')) === 'true', 'Status wird nicht angezeigt');
  await leiste.locator('input.notiz').fill('Bridge wackelt');
  await leiste.locator('input.notiz').press('ArrowLeft');
  await leiste.locator('input.notiz').dispatchEvent('change');
  expect((await buehne.locator('h1').innerText()).includes('Iris'), 'Tippen in die Notiz hat geblättert');
  await buehne.focus();
  await p.keyboard.press('ArrowRight');
  await until(async () => (await buehne.locator('h1').innerText()).includes('Africa'), 'Weiter zum zweiten Song klappt nicht');
  // Song 2: Sitzt
  await leiste.getByRole('button', { name: 'Sitzt', exact: true }).click();
  // ans Ende: Zusammenfassung, Angels kam nicht dran
  await buehne.focus();
  await p.keyboard.press('ArrowRight');
  await p.keyboard.press('ArrowRight');
  const ende = buehne.locator('app-probe-ende');
  await until(async () => /Sitzt \(1\)[\s\S]*Nochmal \(1\): Iris \(Fred: Wackelt noch\)[\s\S]*Nicht drangekommen \(1\)/.test(await ende.innerText().catch(() => '')), 'Zusammenfassung am Ende fehlt');
  await ende.locator('button', { hasText: 'auf die nächste Probe' }).click();
  await until(async () => /2 Songs stehen jetzt auf dem Plan/.test(await ende.innerText()), 'Offene Songs gehen nicht auf die nächste Probe');
  await ende.locator('button', { hasText: 'Probe-Modus beenden' }).click();
  // Probenseite zeigt das Ergebnis und die Notiz der Person
  const liste = p.locator('app-backstage-probe .list').first();
  await until(async () => /Iris[\s\S]*nochmal[\s\S]*Fred: Bridge wackelt/.test(await liste.innerText()), 'Ergebnis oder Notiz fehlt auf der Probenseite');
  const d = await p.evaluate((dt) => ({ plan: JSON.parse(localStorage.getItem('bn-probe-' + dt)), notiz: JSON.parse(localStorage.getItem('bn-probenotiz-jan-frederic-overbeck') ?? '{}'), ueben: JSON.parse(localStorage.getItem('bn-ueben') ?? '{}') }), datum);
  expect(d.notiz[datum]?.['Iris|The Goo Goo Dolls'] === 'Bridge wackelt', 'Notiz nicht in der eigenen Datei');
  expect(d.plan.songs[0].done && d.plan.songs[0].notiz !== 'Bridge wackelt', 'Notiz landet im gemeinsamen Plan');
  expect(d.ueben['Iris|The Goo Goo Dolls']?.kasten === 2 && d.ueben['Africa|TOTO']?.kasten === 4, `Status nicht im Karteikasten: ${JSON.stringify(d.ueben)}`);
  return p;
});

// nachgebauter Spotify-Player (Web Playback SDK) für die vierte Fassung „Im Browser abspielen“
const FAKE_SPOTIFY_SDK = `(() => {
  const calls = (window.__spCalls = []);
  let stand = null;
  class Player {
    constructor(o) { this.o = o; this.l = {}; this.n = 0; window.__sp = this; window.__spNeu = (window.__spNeu ?? 0) + 1; }
    addListener(e, f) { (this.l[e] ??= []).push(f); return true; }
    emit(e, d) { (this.l[e] || []).forEach((f) => f(d)); }
    connect() { calls.push('connect'); const id = 'web' + ++this.n; this.o.getOAuthToken((t) => { window.__spToken = t; }); setTimeout(() => this.emit('ready', { device_id: id }), 30); return Promise.resolve(true); }
    disconnect() { calls.push('disconnect'); }
    getCurrentState() { return Promise.resolve(stand); }
    setzen(s) { stand = s; this.emit('player_state_changed', s); }
    spielen(id, ab) { this.setzen({ paused: false, position: ab, duration: 200000, track_window: { current_track: { id, uri: 'spotify:track:' + id, duration_ms: 200000 } } }); }
    pause() { calls.push('pause'); if (stand) this.setzen({ ...stand, paused: true }); return Promise.resolve(); }
    resume() { calls.push('resume'); if (stand) this.setzen({ ...stand, paused: false }); return Promise.resolve(); }
    seek(ms) { calls.push('seek ' + ms); if (stand) this.setzen({ ...stand, position: ms }); return Promise.resolve(); }
    setVolume(v) { calls.push('volume ' + v); return Promise.resolve(); }
    activateElement() { calls.push('activate'); return Promise.resolve(); }
  }
  window.Spotify = { Player };
  window.onSpotifyWebPlaybackSDKReady?.();
})();`;

test('Backstage: Spotify im Browser abspielen – Übe-Modus mit allen Bedienelementen, abgedockt über den Noten', async () => {
  const p = await page();
  await p.go('/backstage/');
  await p.evaluate(() => {
    localStorage.setItem('bn-ich', 'jan-frederic-overbeck');
    localStorage.setItem('bn-wackelt', JSON.stringify({ 'Iris|The Goo Goo Dolls': '2026-10-01', 'Angels|Robbie Williams': '2026-10-02' }));
    localStorage.setItem('bn-spotify-modus', '"browser"');
    // Zugang aus der Fernsteuerung: ohne das Recht, im Browser abzuspielen
    localStorage.setItem('bn-spotify-token', JSON.stringify({ access: 'test', refresh: 'test', bis: 9e15, scope: 'user-read-playback-state user-modify-playback-state' }));
  });
  // Wochenrückblick in der Übersicht: geübte Karten der letzten 7 Tage
  await p.evaluate(() => localStorage.setItem('bn-fortschritt-jan-frederic-overbeck', JSON.stringify({ 'Iris|The Goo Goo Dolls': [{ tag: new Date().toLocaleDateString('sv-SE'), stand: 'wackelt', quelle: 'ueben' }] })));
  // … steht als Grafik unter Zahlen (nicht mehr in der Übersicht)
  await p.go('/backstage/zahlen/');
  const wochen = p.locator('app-uebe-wochen');
  await until(async () => /du\s*1\s*diese Woche/.test(await wochen.locator('.legende').innerText().catch(() => '')), async () => `Grafik „Üben je Woche“ fehlt: ${await wochen.innerText().catch(() => '–')}`);
  expect((await wochen.locator('.woche').count()) === 8 && /KW \d+/.test(await wochen.locator('.info').innerText()) && (await wochen.locator('.woche').last().locator('.bar').evaluateAll((els) => els.some((el) => parseFloat(el.style.height) > 0))), 'Balken der laufenden Woche fehlen');
  await wochen.locator('.woche').first().click();
  await until(async () => /KW \d+\s*\(\d\d\.\d\d\.–\d\d\.\d\d\.\)/.test(await wochen.locator('.info').innerText()), async () => `Antippen einer Woche zeigt ihre Zahlen nicht: ${await wochen.locator('.info').innerText()}`);
  await p.go('/backstage/');
  expect((await p.locator('app-backstage .wochenrueckblick').count()) === 0, 'Wochenrückblick steht noch in der Übersicht');
  await p.go('/backstage/einstellungen/');
  const einstellung = p.locator('app-spotify-einstellung');
  expect((await einstellung.locator('select').inputValue()) === 'browser', 'Einstellung „Im Browser abspielen“ fehlt');
  await until(async () => /neu verbinden – fürs Abspielen im Browser/.test(await einstellung.locator('button.verbinden').innerText().catch(() => '')), 'ohne Recht zum Abspielen im Browser fehlt „neu verbinden“');
  await p.evaluate(() => localStorage.setItem('bn-spotify-token', JSON.stringify({ access: 'test', refresh: 'test', bis: 9e15, scope: 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state' })));
  const gespielt = [];
  const geholt = [];
  // Spotify kennt das Gerät nicht: '' nein · 'weich': bis die Wiedergabe dorthin geholt wurde · 'hart': web1 gar nicht mehr
  let unbekannt = '';
  await p.route('https://sdk.scdn.co/spotify-player.js', (route) => route.fulfill({ contentType: 'application/javascript', body: FAKE_SPOTIFY_SDK }));
  await p.route('https://api.spotify.com/**', async (route) => {
    const r = route.request();
    const url = new URL(r.url());
    const geraet = url.searchParams.get('device_id') ?? JSON.parse(r.postData() ?? '{}').device_ids?.[0];
    const fehlt = (unbekannt === 'weich' && !geholt.includes(geraet)) || (unbekannt === 'hart' && geraet === 'web1');
    if (url.pathname.endsWith('/me/player/devices')) return route.fulfill({ json: { devices: [] } });
    if (url.pathname.endsWith('/me/player') && r.method() === 'PUT') {
      geholt.push(geraet);
      return fehlt && unbekannt === 'hart' ? route.fulfill({ status: 404, json: { error: { status: 404, message: 'Device not found' } } }) : route.fulfill({ status: 204 });
    }
    if (url.pathname.endsWith('/me/player/play') && r.method() === 'PUT') {
      gespielt.push(r.url() + ' ' + (r.postData() ?? ''));
      if (fehlt) return route.fulfill({ status: 404, json: { error: { status: 404, message: 'Device not found' } } });
      const d = JSON.parse(r.postData() ?? '{}');
      const id = /spotify:track:(\w+)/.exec(d.uris?.[0] ?? '')?.[1];
      if (id) await p.evaluate(([i, ab]) => window.__sp.spielen(i, ab), [id, d.position_ms ?? 0]);
      return route.fulfill({ status: 204 });
    }
    // alles andere (Stand, Pause …) geht im Browser-Player nicht über die Web-API
    return route.fulfill({ status: 500, body: 'nicht erwartet' });
  });
  // Checkliste zum Einrichten: verbunden ✓, „Jetzt prüfen“ fragt Spotify (Konto freigeschaltet) und meldet den Browser-Player an
  await p.go('/backstage/einstellungen/');
  const liste = p.locator('app-spotify-checkliste');
  await until(async () => /✓\s*Verbunden/.test(await liste.innerText().catch(() => '')) && /○\s*Erster Song/.test(await liste.innerText()), async () => `Checkliste falsch: ${await liste.innerText().catch(() => '')}`);
  await liste.getByRole('button', { name: 'Jetzt prüfen' }).click();
  await until(async () => /✓\s*Konto freigeschaltet[\s\S]*✓\s*Dieser Browser spielt ab/.test(await liste.innerText()), async () => `„Jetzt prüfen“ klappt nicht: ${await liste.innerText()}`);
  // Verhalten der Steuerung steht in den Einstellungen: mitspielen (Standard an), Übergänge proben (Standard aus → einschalten)
  expect((await einstellung.locator('input.mitspielen').isChecked()) && !(await einstellung.locator('input.uebergang').isChecked()), 'Standard für „mitspielen“/„Übergänge proben“ stimmt nicht');
  await einstellung.locator('input.uebergang').check();
  await until(async () => (await p.evaluate(() => localStorage.getItem('bn-spotify-uebergang'))) === 'true', '„Übergänge proben“ wird nicht gespeichert');
  // Einladung an die anderen: Anleitung mit Link zu den Spotify-Einstellungen (Teilen-Menü, Zwischenablage oder zum Markieren)
  await einstellung.getByRole('button', { name: 'Anleitung teilen' }).click();
  await until(async () => /kopiert|Geteilt/.test(await einstellung.locator('.knoepfe [role=status]').last().innerText().catch(() => '')) || /backstage\/einstellungen\/#spotify/.test(await einstellung.locator('textarea.teil-text').inputValue().catch(() => '')), 'Anleitung teilen tut nichts');
  expect(!/@/.test(await einstellung.locator('textarea.teil-text').inputValue().catch(() => '')), 'Anleitung enthält eine E-Mail-Adresse');
  await p.go('/backstage/ueben/');
  const ueben = p.locator('app-backstage-ueben');
  await ueben.getByRole('button', { name: 'Übe-Modus', exact: true }).click();
  const buehne = p.locator('app-setlist-buehne');
  const kopf = buehne.locator('app-noten-anzeige header');
  // Notenansicht: ♫ ▶, ↺10 (erst wenn der Song läuft) und Abdocken in der Kopfleiste
  const spielen = kopf.locator('button[aria-label="Auf Spotify abspielen"]');
  await spielen.waitFor();
  // Herunterwischen (zur Titelanzeige) lädt die Seite nie neu: kein „Zum Aktualisieren ziehen“, Notenblatt reicht nichts weiter
  // ↑/↓ wie Wischen: Notenansicht → volle Notenansicht → zurück → Titelanzeige → wieder Noten
  await buehne.focus();
  await p.keyboard.press('ArrowUp');
  await until(async () => (await buehne.locator('app-noten-anzeige .noten.weg').count()) === 1, '↑ blendet die Kopfleiste nicht aus (volle Notenansicht)');
  await p.keyboard.press('ArrowDown');
  await until(async () => (await buehne.locator('app-noten-anzeige .noten.weg').count()) === 0, '↓ holt die Kopfleiste nicht zurück');
  await p.keyboard.press('ArrowDown');
  await until(async () => (await buehne.locator('app-noten-anzeige').count()) === 0, '↓ führt nicht zur Titelanzeige');
  await p.keyboard.press('ArrowUp');
  await until(async () => (await buehne.locator('app-noten-anzeige').count()) === 1, '↑ öffnet die Notenansicht nicht');
  await spielen.waitFor();
  expect(await p.evaluate(() => getComputedStyle(document.documentElement).overscrollBehaviorY === 'none' && getComputedStyle(document.body).overscrollBehaviorY === 'none' && getComputedStyle(document.querySelector('app-noten-anzeige .flaeche')).overscrollBehaviorY === 'contain'), 'Herunterwischen kann die Seite neu laden (overscroll-behavior fehlt)');
  expect(await kopf.locator('button[aria-label="Spotify: 10 Sekunden zurück"]').isDisabled(), '↺10 ist bedienbar, bevor ein Song läuft');
  await until(async () => (await p.evaluate(() => window.__spToken)) === 'test', 'Browser-Player bekommt keinen Zugang');
  const titel = async () => (await kopf.locator('.titel').innerText()).trim();
  const erster = await titel();
  await spielen.click();
  await until(async () => gespielt.length === 1 && gespielt[0].includes('device_id=web1') && /spotify:track:\w+/.test(gespielt[0]), () => `▶ spielt nicht im Browser-Player: ${gespielt.join(' | ')}`);
  await until(async () => (await kopf.locator('button[aria-label="Spotify: Pause"]').count()) === 1, 'nach ▶ kein ⏸ in der Kopfleiste');
  expect((await p.evaluate(() => window.__spCalls)).includes('activate'), 'Browser-Player wird im Klick nicht freigeschaltet (Ton auf Mobil-Browsern)');
  await kopf.locator('button[aria-label="Spotify: 10 Sekunden zurück"]').click();
  await until(async () => (await p.evaluate(() => window.__spCalls)).includes('seek 0'), '↺10 in der Kopfleiste springt nicht');
  // abdocken: die ganze Steuerung als Feld über den Noten, die Kopfleiste zeigt nur noch den Knopf zum Andocken
  await kopf.locator('button.dock').click();
  const dock = buehne.locator('.spotify-dock');
  await dock.waitFor();
  expect((await kopf.locator('button[aria-label="Spotify: Pause"]').count()) === 0 && (await p.evaluate(() => localStorage.getItem('bn-spotify-abgedockt'))) === 'true', 'Abdocken lässt die Knöpfe in der Kopfleiste oder wird nicht gemerkt');
  const steuerung = dock.locator('app-spotify-steuerung');
  await until(async () => (await steuerung.locator('button[aria-label="Pause"]').count()) === 1, 'abgedockte Steuerung zeigt nicht, dass der Song läuft');
  expect((await steuerung.locator('.geraet').innerText()).includes('dieser Browser') && (await steuerung.locator('select[aria-label="Spotify-Gerät"]').count()) === 0, 'Browser-Player zeigt eine Gerätewahl');
  expect((await steuerung.getByRole('button', { name: 'Spotify trennen' }).count()) === 0 && (await steuerung.locator('input[type=checkbox]').count()) === 0, '„Trennen“ bzw. „mitspielen“ stehen noch in der Steuerung');
  // Fortschritt bestimmen: am Balken auf 1:00 ziehen, 10 s vor, Lautstärke
  await steuerung.locator('input.balken').evaluate((el) => {
    el.value = '60000';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await until(async () => (await p.evaluate(() => window.__spCalls)).includes('seek 60000') && /^1:0\d \/ 3:20/.test(await steuerung.locator('.zeit').innerText()), async () => `Springen am Balken klappt nicht: ${await steuerung.locator('.zeit').innerText()}`);
  await steuerung.locator('button[aria-label="10 Sekunden vor"]').click();
  await until(async () => (await p.evaluate(() => window.__spCalls)).some((c) => /^seek 7\d{4}$/.test(c)), '10↻ springt nicht');
  await steuerung.locator('.laut input').evaluate((el) => {
    el.value = '0.5';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await until(async () => (await p.evaluate(() => window.__spCalls)).includes('volume 0.5') && (await p.evaluate(() => localStorage.getItem('bn-spotify-lautstaerke'))) === '0.5', 'Lautstärke wird nicht gesetzt');
  // Sprungmarke an der aktuellen Stelle (für die Band gespeichert), antippen springt dorthin
  await steuerung.locator('select.neu-marke').selectOption('Refrain');
  const refrain = steuerung.locator('.marke button', { hasText: 'Refrain' });
  await refrain.waitFor();
  expect((await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('bn-sprungmarken') ?? '{}'))[0]?.marken?.[0]?.n)) === 'Refrain' && (await steuerung.locator('.spur .tick').count()) === 1, 'Sprungmarke wird nicht gespeichert oder nicht am Balken gezeigt');
  const markeMs = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('bn-sprungmarken')))[0].marken[0].ms);
  await steuerung.locator('button[aria-label="10 Sekunden vor"]').click();
  await refrain.click();
  await until(async () => (await p.evaluate(() => window.__spCalls)).includes('seek ' + markeMs), () => `Marke antippen springt nicht dorthin (${markeMs})`);
  // Schleife: Anfang, gut 2 s später Ende – dann springt es von selbst zurück an den Anfang; ✕ hebt sie auf
  const schleife = steuerung.locator('button.schleife:not(.uebergang)');
  await schleife.click();
  await p.waitForTimeout(2300);
  const seeksVorher = (await p.evaluate(() => window.__spCalls)).filter((c) => c.startsWith('seek')).length;
  await schleife.click();
  await until(async () => /⟲ \d:\d\d–\d:\d\d/.test(await schleife.innerText()), async () => `Schleife zeigt keinen Abschnitt: ${await schleife.innerText()}`);
  await until(async () => (await p.evaluate(() => window.__spCalls)).filter((c) => c.startsWith('seek')).length > seeksVorher, 'Schleife springt am Ende nicht zurück', 4000);
  await steuerung.locator('button[aria-label="Schleife aufheben"]').click();
  await until(async () => (await schleife.innerText()) === '⟲ A–B', 'Schleife lässt sich nicht aufheben');
  // Übergang zum nächsten Song: springt auf die letzten 15 s (hier 3:05 von 3:20); ⏸ beendet ihn
  const uebergang = steuerung.locator('button.uebergang');
  await until(async () => /Übergang zu \S/.test(await uebergang.innerText().catch(() => '')), 'Knopf „Übergang zum nächsten Song“ fehlt');
  await uebergang.click();
  await until(async () => (await p.evaluate(() => window.__spCalls)).includes('seek 185000') && (await uebergang.evaluate((el) => el.classList.contains('an'))), 'Übergang springt nicht auf die letzten 15 Sekunden');
  await steuerung.locator('button[aria-label="Pause"]').click();
  await until(async () => !(await uebergang.evaluate((el) => el.classList.contains('an'))), '⏸ beendet den Übergang nicht');
  await steuerung.locator('button[aria-label="Auf Spotify abspielen"]').click();
  await until(async () => (await steuerung.locator('button[aria-label="Pause"]').count()) === 1, 'nach dem Übergang lässt sich nicht weiterspielen');
  // Feld am Griff verschieben: die Stelle wird gemerkt; Tippen ins Feld blättert nicht
  const griff = await dock.locator('.griff').boundingBox();
  await p.mouse.move(griff.x + griff.width / 2, griff.y + griff.height / 2);
  await p.mouse.down();
  await p.mouse.move(griff.x - 300, griff.y - 200, { steps: 5 });
  await p.mouse.up();
  await until(async () => !!(await p.evaluate(() => localStorage.getItem('bn-spotify-dock'))) && (await dock.evaluate((el) => !!el.style.left)), 'abgedocktes Feld lässt sich nicht verschieben');
  await dock.locator('.dock-kopf span').click();
  await p.waitForTimeout(300);
  expect((await titel()) === erster, 'Tippen ins abgedockte Feld blättert');
  await steuerung.locator('button[aria-label="Pause"]').click();
  await until(async () => (await p.evaluate(() => window.__spCalls)).includes('pause') && (await steuerung.locator('button[aria-label="Auf Spotify abspielen"]').count()) === 1, 'Pause im Browser-Player klappt nicht');
  await steuerung.locator('button[aria-label="Auf Spotify abspielen"]').click();
  await until(async () => (await p.evaluate(() => window.__spCalls)).includes('resume') && gespielt.length === 1, 'Fortsetzen im Browser-Player klappt nicht');
  // andocken: Feld weg, Knöpfe wieder in der Kopfleiste
  await dock.locator('button[aria-label="Spotify-Steuerung andocken"]').click();
  await until(async () => (await dock.count()) === 0 && (await kopf.locator('button[aria-label="Spotify: Pause"]').count()) === 1, 'Andocken klappt nicht');
  // Modus verlassen: anhalten, der Player bleibt angemeldet – beim nächsten Öffnen kein neuer Player, kein neues Gerät
  const anzahl = async (c) => (await p.evaluate(() => window.__spCalls)).filter((x) => x === c).length;
  const pausenVorher = await anzahl('pause');
  await kopf.locator('button[aria-label="Übe-Modus beenden"]').click();
  await until(async () => (await anzahl('pause')) > pausenVorher, 'Browser-Player hält beim Verlassen nicht an');
  expect((await anzahl('disconnect')) === 0, 'Browser-Player wird beim Verlassen abgemeldet (neues Gerät bei jedem Öffnen)');
  const wiederOeffnen = async () => {
    await ueben.getByRole('button', { name: 'Übe-Modus', exact: true }).click();
    await kopf.locator('button[aria-label="Auf Spotify abspielen"]').waitFor();
  };
  await wiederOeffnen();
  await kopf.locator('button[aria-label="Auf Spotify abspielen"]').click();
  await until(async () => gespielt.at(-1).includes('device_id=web1') && (await kopf.locator('button[aria-label="Spotify: Pause"]').count()) === 1, () => `nach erneutem Öffnen spielt der Browser-Player nicht: ${gespielt.slice(-2).join(' | ')}`);
  expect((await p.evaluate(() => window.__spNeu)) === 1 && (await anzahl('connect')) === 1, 'beim erneuten Öffnen wird ein neuer Player angemeldet');
  // Spotify kennt das Gerät nicht mehr („Device not found“): erst die Wiedergabe dorthin holen …
  await kopf.locator('button[aria-label="Übe-Modus beenden"]').click();
  unbekannt = 'weich';
  await wiederOeffnen();
  await kopf.locator('button[aria-label="Auf Spotify abspielen"]').click();
  await until(async () => (await kopf.locator('button[aria-label="Spotify: Pause"]').count()) === 1 && geholt.includes('web1'), () => `„Device not found“ wird nicht durch Herholen der Wiedergabe behoben: ${gespielt.slice(-3).join(' | ')}`, 8000);
  // … und hilft das nicht, den Player neu verbinden (neue Geräte-ID)
  await kopf.locator('button[aria-label="Übe-Modus beenden"]').click();
  unbekannt = 'hart';
  await wiederOeffnen();
  await kopf.locator('button[aria-label="Auf Spotify abspielen"]').click();
  await until(async () => (await kopf.locator('button[aria-label="Spotify: Pause"]').count()) === 1 && gespielt.at(-1).includes('device_id=web2'), () => `„Device not found“ wird nicht durch neues Verbinden behoben: ${gespielt.slice(-3).join(' | ')}`, 12000);
  expect((await anzahl('disconnect')) === 1 && (await p.evaluate(() => window.__spNeu)) === 1, 'Neu verbinden legt einen zweiten Player an');
  expect((await buehne.locator('.spotify-hinweis').count()) === 0, 'nach der Reparatur bleibt ein Hinweis stehen');
  return p;
});
test('Backstage: Übe-Status je Person – Probe-Modus, Status der anderen, Bühnenreife-Übersicht, Probe-Vorschlag', async () => {
  const p = await page();
  await p.go('/backstage/termine/');
  await p.locator('a.row-link', { hasText: 'Probe' }).first().click();
  await p.waitForURL(/\/backstage\/probe\//);
  const datum = p.url().match(/probe\/(\d{4}-\d{2}-\d{2})/)[1];
  // Fred am Gerät; David hat im Probe-Modus auf seinem Gerät bei Africa „Nochmal“ gedrückt (alter Stand, gespiegelte Datei)
  await p.evaluate((d) => {
    localStorage.setItem('bn-probe-' + d, JSON.stringify({ songs: [{ title: 'Iris', artist: 'The Goo Goo Dolls', done: false }, { title: 'Africa', artist: 'TOTO', done: false }], notizen: '', punkte: [] }));
    localStorage.setItem('bn-ich', 'jan-frederic-overbeck');
    localStorage.setItem('bn-fortschritt-david-broeker', JSON.stringify({ 'Africa|TOTO': [{ tag: d, stand: 'wackelt', quelle: 'probe' }] }));
  }, datum);
  await p.reload({ waitUntil: 'networkidle' });
  await p.locator('app-backstage-probe button', { hasText: 'Probe-Modus starten' }).click();
  const buehne = p.locator('app-setlist-buehne');
  const leiste = buehne.locator('app-probe-leiste');
  await until(async () => (await leiste.count()) === 1, 'Probe-Modus startet nicht');
  // Iris: „Üben“ gilt für Fred – Verlauf und Karteikasten, im Plan nur „geprobt“
  await leiste.getByRole('button', { name: 'Üben', exact: true }).click();
  await until(async () => (await leiste.getByRole('button', { name: 'Üben', exact: true }).getAttribute('aria-pressed')) === 'true', '„Üben“ wird nicht für mich angezeigt');
  const daten = await p.evaluate((d) => ({ f: JSON.parse(localStorage.getItem('bn-fortschritt-jan-frederic-overbeck') ?? '{}'), k: JSON.parse(localStorage.getItem('bn-kasten-jan-frederic-overbeck') ?? '{}'), plan: JSON.parse(localStorage.getItem('bn-probe-' + d)) }), datum);
  expect(daten.f['Iris|The Goo Goo Dolls']?.at(-1)?.stand === 'ueben' && daten.f['Iris|The Goo Goo Dolls'].at(-1).tag === datum, 'Status fehlt im Verlauf');
  expect(daten.k.v === 2 && daten.k.kaesten['Iris|The Goo Goo Dolls'] === 1, `„Üben“ liegt nicht in Kasten 1: ${JSON.stringify(daten.k)}`);
  expect(daten.plan.songs[0].done && !daten.plan.songs[0].stand, 'Plan bekommt einen Stand für alle');
  // Africa: Fred sitzt, bei David wackelt er – die Leiste zeigt David, die Zusammenfassung nennt die Namen
  await buehne.focus();
  await p.keyboard.press('ArrowRight');
  await until(async () => (await buehne.locator('h1').innerText()).includes('Africa'), 'Weiter zum zweiten Song klappt nicht');
  // die anderen als Zeichen mit Namen (↻ David), der Status als Text für Screenreader und im Tooltip
  await until(async () => (await leiste.locator('.andere .wer.wackelt[title="David: Wackelt noch"]').count()) === 1, 'Status der anderen fehlt');
  expect((await leiste.locator('.andere .wer.wackelt .z').innerText()) === '↻', 'Status der anderen ohne Zeichen');
  await leiste.getByRole('button', { name: 'Sitzt', exact: true }).click();
  await p.keyboard.press('ArrowRight');
  const ende = buehne.locator('app-probe-ende');
  await until(async () => /Nochmal \(2\): Iris \(Fred: Üben\), Africa \(David: Wackelt noch\)/.test(await ende.innerText().catch(() => '')), 'Zusammenfassung nennt nicht, bei wem es noch nicht sitzt');
  // Ergebnis an die Band (ohne Teilen-Menü: Zwischenablage)
  await ende.locator('button.an-band').click();
  await until(async () => /Kopiert|Geschickt/.test(await ende.locator('button.an-band').innerText()), 'Ergebnis an die Band meldet nichts');
  await ende.locator('button', { hasText: 'Probe-Modus beenden' }).click();
  // Vorschlag (für eine Probe ohne diese Songs): was bei jemandem wackelt, zuerst – mit Namen
  await p.evaluate((d) => localStorage.setItem('bn-probe-' + d, JSON.stringify({ songs: [], notizen: '', punkte: [] })), datum);
  await p.reload({ waitUntil: 'networkidle' });
  // Probe füllen: die wackelnden Songs kommen nach Probendauer auf den Plan
  await p.locator('app-backstage-probe button.fuellen').click();
  await until(async () => /Probe gefüllt: \d+ Songs? dazu \([^)]*(Iris|Africa)/.test(await p.locator('app-backstage-probe .teilen-meldung').innerText().catch(() => '')), 'Probe füllen nimmt die wackelnden Songs nicht');
  await p.evaluate((d) => localStorage.setItem('bn-probe-' + d, JSON.stringify({ songs: [], notizen: '', punkte: [] })), datum);
  await p.reload({ waitUntil: 'networkidle' });
  // Vorschläge sind eingeklappt
  await p.locator('app-backstage-probe details.vorschlaege summary').click();
  await until(async () => /wackelt bei Fred/.test(await p.locator('app-probe-vorschlag').innerText().catch(() => '')), 'Vorschlag nutzt die Bühnenreife nicht');
  // Übersicht: Fred mit einem Song in „Üben“ und einem, der sitzt; Iris als Baustelle
  await p.go('/backstage/songs/reife/');
  const reife = p.locator('app-songs-reife');
  await until(async () => /✎ 1[\s\S]*✓ 1/.test(await reife.locator('.person').filter({ hasText: 'Fred' }).innerText().catch(() => '')), 'Übe-Status je Person fehlt');
  await reife.getByRole('button', { name: /^Baustellen/ }).click();
  await until(async () => /Iris[\s\S]*Fred ✎/.test(await reife.locator('.songs').innerText()), 'Bühnenreife je Song fehlt');
  // Song-Dialog: eigener Status als Auswahl mit den fünf Stufen
  await p.go('/backstage/songs/');
  await p.locator('app-backstage-songs input[type=search]').fill('Iris');
  await songDialogOeffnen(p);
  const status = p.locator('app-song-dialog dialog[open] header select');
  expect((await status.inputValue()) === 'ueben', 'Song-Dialog zeigt den eigenen Status nicht');
  expect((await status.locator('option').allInnerTexts()).join('|').replace(/[^A-Za-zÜü|ä ]/g, '').trim().split('|').map((t) => t.trim()).join('|') === 'Nicht gelernt|Üben|Wackelt noch|Sitzt|Eingenordet', 'Auswahl hat nicht die fünf Status');
  await status.selectOption('eingenordet');
  await until(async () => JSON.parse((await p.evaluate(() => localStorage.getItem('bn-kasten-jan-frederic-overbeck'))) ?? '{}').eingenordet?.['Iris|The Goo Goo Dolls'], 'Eingenordet aus dem Dialog fehlt');
  await until(async () => /Bühnenreife[\s\S]*Fred Eingenordet/.test(await p.locator('app-song-dialog dialog[open] .reife').innerText().catch(() => '')), 'Bühnenreife im Dialog zieht nicht nach');
  expect(p.errors.length === 0, p.errors.join('\n'));
  return p;
});
test('Backstage: Songs → Noten – Suche; Löschen vom Gerät, als Besitzer auch aus OneDrive', async () => {
  const p = await page();
  await p.go('/backstage/songs/noten/');
  const datei = (id, name) => ({ id, name, daten: new ArrayBuffer(7), groesse: 7, hinzugefuegt: '2026-01-01' });
  await p.evaluate((dateien) => Promise.all([
    new Promise((ok) => {
      const req = indexedDB.open('bn-noten', 2);
      req.onupgradeneeded = () => {
        for (const n of ['dateien', 'songs', 'markierungen']) if (!req.result.objectStoreNames.contains(n)) req.result.createObjectStore(n, n === 'dateien' ? { keyPath: 'id' } : undefined);
      };
      req.onsuccess = () => {
        const t = req.result.transaction('dateien', 'readwrite');
        for (const d of dateien) t.objectStore('dateien').put(d);
        t.oncomplete = () => { req.result.close(); ok(null); };
      };
    }),
    new Promise((ok) => {
      const req = indexedDB.open('bn-sync', 1);
      req.onupgradeneeded = () => { for (const n of ['dateien', 'meta']) if (!req.result.objectStoreNames.contains(n)) req.result.createObjectStore(n); };
      req.onsuccess = () => {
        const t = req.result.transaction('dateien', 'readwrite');
        t.objectStore('dateien').put({ inhalt: new Blob(['%PDF-12']), groesse: 7, geaendert: new Date().toISOString(), version: 'v1' }, 'Noten/Toto - Africa.pdf');
        t.oncomplete = () => { req.result.close(); ok(null); };
      };
    }),
  ]), [datei('a', 'Toto - Africa.pdf'), datei('b', 'Robbie_Williams-Angels.pdf')]);
  await p.reload({ waitUntil: 'networkidle' });
  const v = p.locator('app-noten-verwaltung');
  await until(async () => (await v.locator('li').count()) === 2, 'Noten-Liste fehlt');
  // Suche (Unterstriche und Bindestriche zählen als Leerzeichen)
  await v.locator('input[type=search]').fill('robbie angels');
  await until(async () => (await v.locator('li').count()) === 1 && (await v.locator('.suche small').innerText()).includes('1 von 2'), 'Suche filtert nicht');
  // ohne Berechtigung: nur vom Gerät, ohne Rückfrage nach OneDrive
  await v.getByRole('button', { name: 'Robbie_Williams-Angels.pdf löschen' }).click();
  await until(async () => (await v.locator('.meldung').innerText().catch(() => '')).includes('nur auf diesem Gerät'), 'Löschen vom Gerät klappt nicht');
  await v.locator('input[type=search]').fill('');
  await until(async () => (await v.locator('li').count()) === 1, 'Datei bleibt nach dem Löschen stehen');
  // Besitzer des OneDrive-Ordners: Wahl „Nur vom Gerät“ / „Auch aus OneDrive“
  await p.evaluate(() => {
    localStorage.setItem('bn-sync-einstellungen', JSON.stringify({ cloud: 'Blickfeld Nord', lokal: 'app', richtung: 'beide', loeschen: true, auto: false }));
    localStorage.setItem('bn-onedrive-konto', 'test@example.com');
  });
  await p.reload({ waitUntil: 'networkidle' });
  await v.getByRole('button', { name: 'Toto - Africa.pdf löschen' }).click();
  await until(async () => (await v.locator('.frage button').count()) === 3, 'Besitzer wird nicht gefragt');
  await v.getByRole('button', { name: 'Auch aus OneDrive' }).click();
  await until(async () => (await v.locator('.meldung').innerText().catch(() => '')).includes('auch aus OneDrive'), 'Löschen aus OneDrive meldet nichts');
  // für die Band vermerkt: die anderen Geräte entfernen ihre Kopie beim nächsten Abgleich
  expect((await p.evaluate(() => JSON.parse(localStorage.getItem('bn-noten-geloescht') ?? '[]'))).some((g) => g.name === 'Toto - Africa.pdf' && g.groesse === 7), 'Löschung wird nicht für die Band vermerkt');
  await until(async () => !(await v.locator('ul').innerText().catch(() => '')).includes('Toto - Africa.pdf'), 'Datei steht nach dem Löschen noch in der Liste');
  expect(!(await p.evaluate(() => new Promise((ok) => {
    const req = indexedDB.open('bn-sync');
    req.onsuccess = () => {
      const k = req.result.transaction('dateien').objectStore('dateien').getAllKeys();
      k.onsuccess = () => ok(k.result.includes('Noten/Toto - Africa.pdf'));
    };
  }))), 'Datei liegt noch im Sync-Ordner');
  return p;
});

test('Backstage: Probe – wer kommt, unsicher bei, Plan an die Band, Generalprobe', async () => {
  const p = await page();
  await p.go('/backstage/termine/');
  await p.locator('a.row-link', { hasText: 'Probe' }).first().click();
  await p.waitForURL(/\/backstage\/probe\//);
  const datum = p.url().match(/probe\/(\d{4}-\d{2}-\d{2})/)[1];
  const auftritt = concerts.map((c) => c.split('/')[2]).filter((id) => id >= datum).sort()[0];
  await p.evaluate(({ d, a }) => {
    localStorage.setItem('bn-probe-' + d, JSON.stringify({ songs: [{ title: 'Iris', artist: 'The Goo Goo Dolls', done: false }], notizen: '', punkte: [{ text: 'Kabel besorgen', done: false }] }));
    localStorage.setItem('bn-unsicher-david-broeker', JSON.stringify(['Iris|The Goo Goo Dolls']));
    localStorage.setItem('bn-setlist-' + a, JSON.stringify([{ title: 'Africa', artist: 'TOTO' }, { title: 'Iris', artist: 'The Goo Goo Dolls' }, { pause: true }, { title: 'Angels', artist: 'Robbie Williams' }]));
  }, { d: datum, a: auftritt });
  await p.reload({ waitUntil: 'networkidle' });
  const seite = p.locator('app-backstage-probe');
  // wer kommt
  const zusagen = seite.locator('app-probe-zusagen');
  // „Ich bin …“ steht unter Einstellungen – die Probe verweist dorthin
  expect((await zusagen.innerText()).includes('Einstellungen'), 'Probe verweist nicht auf „Ich bin …“ in den Einstellungen');
  await p.go('/backstage/einstellungen/');
  await p.locator('app-ich-einstellung select[aria-label="Ich bin"]').selectOption('jan-frederic-overbeck');
  await p.go('/backstage/probe/' + datum);
  await zusagen.getByRole('button', { name: 'Ich komme' }).click();
  await until(async () => (await zusagen.innerText()).includes('1 kommt, 2 offen'), 'Zusage wird nicht gezählt');
  expect((await p.evaluate((d) => localStorage.getItem('bn-zusage-' + d + '-jan-frederic-overbeck'), datum)) === '{"kommt":true}', 'Zusage nicht in eigener Datei');
  // unsicher bei
  await until(async () => (await seite.locator('.info.unsicher').innerText().catch(() => '')).includes('David'), '„unsicher: David“ fehlt');
  // Plan an die Band (ohne Teilen-Menü: in die Zwischenablage bzw. zum Kopieren)
  await seite.getByRole('button', { name: 'Plan an die Band' }).click();
  await until(async () => /Plan (kopiert|geteilt)/.test(await seite.locator('.teilen-meldung').innerText().catch(() => '')), 'Plan an die Band meldet nichts');
  expect(!!(await p.evaluate((d) => JSON.parse(localStorage.getItem('bn-probe-' + d)).geschickt, datum)), '„geschickt“ wird nicht gemerkt');
  // Generalprobe: Setlist des nächsten Auftritts in Reihenfolge, Probe-Modus mit Sets
  await seite.locator('details.vorschlaege summary').click();
  await seite.locator('button.general').click();
  await until(async () => /Africa[\s\S]*Iris[\s\S]*Angels/.test(await seite.locator('.list').first().innerText()), 'Generalprobe übernimmt die Setlist nicht');
  await seite.getByRole('button', { name: 'Probe-Modus starten' }).click();
  const buehne = p.locator('app-setlist-buehne');
  // was bei jemandem noch wackelt, kommt vorher einzeln (eigener Zähler), danach die Sets wie auf der Bühne
  const vorab = await seite.locator('.general-vorab').count();
  await until(async () => (vorab ? /generalprobe[\s\S]*einzeln 1 \/ \d/i : /generalprobe[\s\S]*set 1 \/ 2/i).test(await buehne.locator('header .set').innerText().catch(() => '')), async () => `Generalprobe zeigt keine Sets: ${await buehne.locator('header .set').innerText().catch(() => '')}`);
  await until(async () => (await buehne.locator('app-probe-leiste app-status-schalter button').count()) === 5, 'Status-Umschalter fehlt in der Generalprobe');
  return p;
});

test('Backstage: Sichtsperre – Anmeldeseite; mit Band-Ordner landet ein neues Gerät dort', async () => {
  const p = await page({ ohneZugang: true });
  await p.go('/backstage/zugang/');
  const seite = p.locator('app-backstage-zugang');
  await until(async () => /nur für die band/i.test(await seite.innerText().catch(() => '')), 'Anmeldeseite fehlt');
  expect(await seite.getByRole('button', { name: 'Mit Microsoft anmelden' }).isVisible(), 'Anmelden-Knopf fehlt');
  if (!BAND_ORDNER_ITEM) {
    // ohne eingetragenen Band-Ordner keine Sperre: weiter ins Backstage
    await seite.getByRole('button', { name: 'Mit Microsoft anmelden' }).click();
    await until(async () => new URL(p.url()).pathname.replace(/\/$/, '') === '/backstage', 'Ohne Band-Ordner geht es nicht weiter');
  } else {
    // blockiertes Anmelde-Fenster: von selbst weiter ohne Pop-up (Weiterleitung zu Microsoft) …
    await p.evaluate(() => {
      window.open = () => null;
    });
    const weiter = p.waitForRequest(/login\.microsoftonline\.com\/.*authorize/, { timeout: 15_000 }).then(() => true, () => false);
    await seite.getByRole('button', { name: 'Mit Microsoft anmelden' }).click();
    expect(await weiter, 'Nach blockiertem Fenster keine Weiterleitung zur Anmeldung ohne Pop-up');
    // … aber höchstens einmal in 5 Minuten: beim zweiten Mal die Meldung und „Ohne Pop-up anmelden“ (statt stumm zu bleiben)
    await p.go('/backstage/zugang/');
    await p.evaluate(() => {
      window.open = () => null;
    });
    await seite.getByRole('button', { name: 'Mit Microsoft anmelden' }).click();
    await until(async () => /Anmelde-Fenster wurde blockiert/.test(await seite.innerText().catch(() => '')), async () => `Keine Meldung zum blockierten Fenster: ${await seite.innerText().catch(() => '–')}`);
    expect(await seite.getByRole('button', { name: 'Ohne Pop-up anmelden' }).isVisible(), 'Weiterleitung wird nicht angeboten');
    // Fenster selbst geschlossen: nach wenigen Sekunden „abgebrochen“ statt minutenlang „Anmelde-Fenster offen …“
    await p.reload({ waitUntil: 'networkidle' });
    const [fenster] = await Promise.all([p.waitForEvent('popup'), seite.getByRole('button', { name: 'Mit Microsoft anmelden' }).click()]);
    await until(async () => /Anmelde-Fenster offen/.test(await seite.innerText().catch(() => '')), 'Kein Hinweis, dass das Anmelde-Fenster offen ist');
    await fenster.close();
    await until(async () => /Anmeldung abgebrochen/.test(await seite.innerText().catch(() => '')), async () => `Geschlossenes Fenster nicht erkannt: ${await seite.innerText().catch(() => '–')}`, 12_000);
    // neues Gerät: jede Backstage-Seite führt zur Anmeldeseite und merkt sich das Ziel
    await p.go('/backstage/termine/');
    await until(async () => decodeURIComponent(p.url()).includes('/backstage/zugang?ziel=/backstage/termine'), async () => 'Keine Umleitung zur Anmeldeseite: ' + p.url());
    // schon geprüftes Gerät: kommt direkt rein
    await p.evaluate((item) => localStorage.setItem('bn-zugang', JSON.stringify({ ordner: item, zeit: Date.now() })), BAND_ORDNER_ITEM);
    await p.go('/backstage/termine/');
    await until(async () => new URL(p.url()).pathname.startsWith('/backstage/termine'), 'Freigeschaltetes Gerät kommt nicht rein');
  }
  return p;
});

test('Backstage: kein Zoomen per Geste (Website bleibt zoombar), Eingabefelder auf dem Handy ab 16 px', async () => {
  const p = await page({ ...devices['Pixel 7'] });
  const lage = () => p.evaluate(() => ({
    klasse: document.documentElement.classList.contains('backstage'),
    body: getComputedStyle(document.body).touchAction,
    feld: document.querySelector('input:not([type=checkbox]):not([type=radio])') ? parseFloat(getComputedStyle(document.querySelector('input:not([type=checkbox]):not([type=radio])')).fontSize) : 16,
  }));
  await p.go('/');
  let l = await lage();
  expect(!l.klasse && l.body === 'auto', `Website darf zoombar bleiben: ${JSON.stringify(l)}`);
  await p.go('/backstage/abgleich/');
  await until(async () => (l = await lage()).klasse && l.body === 'pan-x pan-y', async () => `Backstage lässt sich zoomen: ${JSON.stringify(l)}`);
  expect(l.feld >= 16, `Eingabefeld unter 16 px (iPhone zoomt beim Antippen): ${l.feld}`);
  // eigene Regeln behalten Vorrang (Noten-Stift, Ziehen) – hier: die Notenfläche nur senkrecht
  const eigen = await p.evaluate(() => {
    const d = document.createElement('div');
    d.style.touchAction = 'none';
    document.body.append(d);
    const t = getComputedStyle(d).touchAction;
    d.remove();
    return t;
  });
  expect(eigen === 'none', `eigene touch-action wird überschrieben: ${eigen}`);
  return p;
});

test('Backstage: Einrichtungsassistent – Schritt für Schritt mit den Standards', async () => {
  const p = await page();
  await p.go('/backstage/einrichtung/?ziel=/backstage/termine');
  const seite = p.locator('app-backstage-einrichtung');
  await until(async () => /Willkommen im Backstage/i.test(await seite.innerText().catch(() => '')), 'Assistent fehlt');
  const weiter = () => seite.getByRole('button', { name: 'Weiter' }).click();
  // 1. Ich bin
  await seite.locator('select').selectOption({ index: 1 });
  await weiter();
  // 2. Gerätename mit Vorschlag
  const name = seite.locator('input');
  await until(async () => (await name.inputValue().catch(() => '')).length > 0, 'Kein Vorschlag für den Gerätenamen');
  await name.fill('Testgerät');
  await weiter();
  // 3. Synchronisation: Ordner selbst wählen, Hinweis auf den Ordner der Band (ohne Microsoft-Konto: nur ansehen)
  await until(async () => /Synchronisation mit OneDrive/i.test(await seite.innerText()), 'Sync-Schritt fehlt');
  expect(/endet auf BlickfeldNord \(geteilt\)\/Sync/.test(await seite.innerText()) && (await seite.locator('.tipp.passt').count()) === 0, 'Hinweis auf den Ordner der Band fehlt');
  expect(/Speicher der App, in beide Richtungen/.test(await seite.innerText()), 'Standards der Synchronisation fehlen');
  expect((await p.evaluate(() => localStorage.getItem('bn-sync-einstellungen'))) === null, 'Sync-Ordner wurde ohne Auswahl eingetragen');
  await weiter();
  // 4. Spotify: „Im Browser abspielen“ ist vorgewählt
  await until(async () => /Songs anhören mit Spotify/i.test(await seite.innerText()), 'Spotify-Schritt fehlt');
  expect(await seite.getByRole('radio', { name: /Im Browser abspielen/ }).isChecked(), 'Spotify im Browser ist nicht vorgewählt');
  await weiter();
  // 5. Fertig: Standards, dann weiter zum Ziel
  await until(async () => /Fertig eingerichtet/i.test(await seite.innerText()), 'Abschluss fehlt');
  await seite.getByRole('button', { name: 'Los geht’s' }).click();
  await until(async () => new URL(p.url()).pathname.startsWith('/backstage/termine'), async () => 'Nicht zum Ziel weitergeleitet: ' + p.url());
  const st = await p.evaluate(() => ({ e: localStorage.getItem('bn-einrichtung'), s: localStorage.getItem('bn-spotify-modus'), g: localStorage.getItem('bn-geraet-name'), i: localStorage.getItem('bn-ich') }));
  expect(/"fertig"/.test(st.e ?? '') && st.s === '"browser"' && st.g === 'Testgerät' && !!st.i, `Einstellungen nicht übernommen: ${JSON.stringify(st)}`);
  // schon mit dem Ordner der Band eingerichtet (im eigenen OneDrive, beliebiger vorderer Teil): Hinweis wird grün
  await p.evaluate(() => localStorage.setItem('bn-sync-einstellungen', JSON.stringify({ cloud: 'Dokumente/Bands/BlickfeldNord/Sync', lokal: 'app', richtung: 'beide', loeschen: true, auto: false })));
  await p.go('/backstage/einrichtung/?schritt=sync');
  await until(async () => /Richtiger Ordner/.test(await seite.locator('.tipp.passt').innerText().catch(() => '')), 'Hinweis wird beim Ordner der Band nicht grün');
  await p.evaluate(() => localStorage.removeItem('bn-sync-einstellungen'));
  // in den Einstellungen erneut aufrufbar
  await p.go('/backstage/einstellungen/');
  expect(await p.getByRole('link', { name: 'Einrichtung durchgehen' }).isVisible(), 'Kein Weg zurück in die Einrichtung');
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
  const zeile = p.locator('app-song-dialog dialog[open]');
  // Klick öffnet den Dialog – direkt nach dem Laden kann ein Klick verpuffen (Seite noch nicht ganz bereit): bis er offen ist
  const oeffnen = (ziel) =>
    until(async () => {
      if (await zeile.count()) return true;
      await ziel.click().catch(() => {});
      await p.waitForTimeout(300);
      return (await zeile.count()) > 0;
    }, 'Song-Dialog öffnet sich nicht');
  // Zeile der Tabelle anklicken öffnet den Dialog
  await oeffnen(p.locator('app-backstage-songs tbody tr').first());
  await zeile.locator('.felder select').first().selectOption('G');
  await zeile.locator('input[type=number]').fill('120');
  await zeile.locator('input[type=number]').blur();
  await until(async () => (await p.locator('app-backstage-songs .apply').innerText()).includes('1 Song geändert'), 'Änderung wird nicht gezählt');
  await p.reload({ waitUntil: 'networkidle' });
  await p.locator('app-backstage-songs input[type=search]').fill('Millionen');
  await until(async () => (await p.locator('app-backstage-songs tbody tr').first().innerText()).includes('120 bpm'), 'Entwurf nach Neuladen nicht in der Tabelle');
  await oeffnen(p.locator('app-backstage-songs tbody tr .oeffnen').first());
  await until(async () => (await zeile.locator('.felder select').first().inputValue({ timeout: 2000 }).catch(() => '')) === 'G', 'Entwurf nach Neuladen weg');
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
  // zugeklappt: nur der Kopf; ⌄ zeigt die Songs
  await p.locator('app-songs-setlists article').first().waitFor();
  expect(!(await p.locator('app-songs-setlists article ol').count()), 'Setlists sind nicht zugeklappt');
  await p.locator('app-songs-setlists article button.auf').first().click();
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
  await songDialogOeffnen(p);
  const zeile = p.locator('app-song-dialog dialog[open]');
  await until(async () => (await zeile.count()) === 1, 'Dialog öffnet nicht');
  expect((await zeile.innerText()).includes('Recherche:'), 'Quelle der recherchierten Werte fehlt');
  await zeile.locator('.felder select').nth(1).selectOption('C');
  await zeile.locator('.felder select').nth(2).selectOption('2');
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
  // feste Sammlung „Weihnachtslieder“ ist auf jedem Gerät da: erst anhängen (hinter die 6 Songs), dann ersetzen
  const weihnacht = async () => {
    const i = await p.locator('app-setlist-sammlungen option').evaluateAll((o) => o.findIndex((x) => x.textContent.includes('Weihnachtslieder')));
    await p.locator('app-setlist-sammlungen select').selectOption(String(i));
  };
  await weihnacht();
  await p.locator('app-setlist-sammlungen button', { hasText: 'Anhängen' }).click();
  await until(async () => (await p.locator('app-setlist .list li .no').count()) === 9, 'Sammlung wird nicht angehängt');
  expect((await p.locator('app-setlist .list li .t').first().innerText()) === 'Hey Jude', 'Anhängen hat die Setlist ersetzt');
  await p.locator('app-setlist-sammlungen button', { hasText: 'Anhängen' }).click();
  await until(async () => (await p.locator('app-setlist-sammlungen .meldung').innerText().catch(() => '')).includes('3 schon in der Setlist'), 'Anhängen nimmt Songs doppelt');
  await p.locator('app-setlist-sammlungen button', { hasText: 'Ersetzen' }).click();
  await until(async () => (await p.locator('app-setlist .list li .t').allInnerTexts()).join('|') === 'In der Weihnachtsbäckerei|Kleine Kinder, große Kinder (Das Adventskalenderlied)|Weihnacht, was bist du', 'Sammlung „Weihnachtslieder“ ersetzt die Setlist nicht');
  // „Letztes Set auffüllen“ ergänzt bis zur gewählten Länge (45 min), die Vorlage bleibt vorn
  await p.locator('app-setlist-vorschlag button', { hasText: 'auffüllen' }).click();
  await until(async () => (await p.locator('app-setlist .list li .no').count()) >= 8, 'Auffüllen ergänzt das Set nicht');
  expect((await p.locator('app-setlist .list li .t').first().innerText()) === 'In der Weihnachtsbäckerei', 'Auffüllen hat die vorhandenen Songs verändert');
  return p;
}, { allein: true });

test('Backstage: Noten – PDF mit Seitenbereich und Akkordblatt im Bühnen-Modus, Weitergabe an ein zweites Gerät', async () => {
  const p = await page();
  await p.go('/backstage/songs/');
  await p.locator('app-backstage-songs input[type=search]').fill('Iris');
  await songDialogOeffnen(p);
  const zeile = p.locator('app-song-dialog dialog[open]');
  await zeile.waitFor();
  // „Wir spielen E“ – erst weiter, wenn der Entwurf wirklich gespeichert ist (sonst bleibt das Akkordblatt später in D)
  await until(async () => {
    await zeile.locator('.felder select').nth(1).selectOption('E');
    return p.evaluate(() => JSON.parse(localStorage.getItem('bn-songinfo-entwurf') ?? '{}')['Iris|The Goo Goo Dolls']?.spielTonart === 'E');
  }, '„Wir spielen E“ wird nicht gespeichert');
  // Pressekit (mehrseitig) als Notenblatt, davon Seite 2–3
  await zeile.locator('app-noten-editor input[type=file][accept*=pdf]').setInputFiles({ name: 'songbook.pdf', mimeType: 'application/pdf', buffer: readFileSync(join(DIST, 'presse', 'blickfeld-nord-pressekit.pdf')) });
  await until(async () => (await zeile.locator('app-noten-editor .meldung').innerText().catch(() => '')).includes('songbook.pdf'), 'PDF wird nicht gespeichert');
  await zeile.locator('app-noten-editor input[type=number]').first().fill('2');
  await zeile.locator('app-noten-editor input[type=number]').first().blur();
  await zeile.locator('app-noten-editor input[type=number]').nth(1).fill('3');
  await zeile.locator('app-noten-editor input[type=number]').nth(1).blur();
  // „Akkorde über dem Text“ per Knopf in ChordPro umwandeln – mit Titel/Interpret vom Song und Tonart aus dem Text
  await zeile.locator('app-noten-editor textarea').fill('Key: D\n[Chorus]\nD        G\nAnd I dont want');
  await zeile.locator('app-noten-editor textarea').blur();
  await zeile.locator('app-noten-editor button', { hasText: 'Text in ChordPro umwandeln' }).click();
  await until(async () => (await zeile.locator('app-noten-editor textarea').inputValue()) === '{title: Iris}\n{artist: The Goo Goo Dolls}\n{key: D}\n\n{comment: Refrain}\n[D]And I don[G]t want', async () => 'Umwandlung in ChordPro stimmt nicht: ' + JSON.stringify(await zeile.locator('app-noten-editor textarea').inputValue()));
  await until(async () => (await zeile.locator('app-noten-editor .meldung').innerText()).includes('In ChordPro umgewandelt'), 'Meldung nach dem Umwandeln fehlt');
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
  // nach oben wischen blendet die Einstellungen aus, nach unten wieder ein – blättert dabei nicht um
  const flaeche = await p.locator('app-noten-anzeige .flaeche').boundingBox();
  const wisch = async (von, bis) => {
    await p.mouse.move(flaeche.x + flaeche.width / 2, flaeche.y + von);
    await p.mouse.down();
    await p.mouse.move(flaeche.x + flaeche.width / 2, flaeche.y + bis, { steps: 5 });
    await p.mouse.up();
  };
  await wisch(300, 120);
  await until(async () => (await p.locator('app-noten-anzeige .noten.weg').count()) === 1, 'Nach oben wischen blendet die Einstellungen nicht aus');
  expect((await kopf.innerText()).includes('Seite 1 / 2'), 'Wischen nach oben hat umgeblättert');
  await wisch(120, 300);
  await until(async () => (await p.locator('app-noten-anzeige .noten.weg').count()) === 0, 'Nach unten wischen holt die Einstellungen nicht zurück');
  await wisch(300, 120);
  await p.locator('app-noten-anzeige .kopf-zurueck').click();
  await until(async () => (await p.locator('app-noten-anzeige .noten.weg').count()) === 0, 'Tippen auf das Schild holt die Einstellungen nicht zurück');
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
  await buehne.locator('input[type=checkbox]').first().check();
  await buehne.locator('button.neu').first().click();
  await p.keyboard.press('b');
  await until(async () => (await buehne.innerText()).includes('B'), 'Pedal-Taste wird nicht aufgenommen');
  // vier Aktionen: Weiter, Zurück, Hoch (↑), Runter (↓) – eine Taste gehört nur zu einer Aktion
  const zeilen = buehne.locator('.tasten');
  expect((await zeilen.count()) === 4 && /hoch/i.test(await zeilen.nth(2).innerText()) && (await zeilen.nth(2).innerText()).includes('↑') && (await zeilen.nth(3).innerText()).includes('↓') && !(await zeilen.nth(0).locator('.taste').allInnerTexts()).some((x) => x.startsWith('↓')), 'Tasten für Hoch/Runter fehlen in den Einstellungen');
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
  // Schrift: „T“, auf die Stelle tippen, Text eingeben – blättert nicht um
  await p.locator('app-noten-stift').getByRole('button', { name: 'Schrift einfügen' }).click();
  await p.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.7);
  // mehrzeilig: Enter macht eine neue Zeile (blättert nicht), „Übernehmen“ speichert
  const feld = p.locator('app-noten-stift .schrift textarea');
  await until(async () => await feld.isVisible().catch(() => false), 'Eingabefeld für Schrift erscheint nicht');
  await feld.type('Bridge leise');
  await feld.press('Enter');
  await feld.type('ab Takt 9');
  expect((await kopf.innerText()).includes('Seite 2 / 2'), 'Enter im Schriftfeld hat geblättert');
  await p.locator('app-noten-stift .schrift').getByRole('button', { name: 'Übernehmen' }).click();
  const texte = () => p.evaluate(() => new Promise((ok) => {
    const req = indexedDB.open('bn-noten');
    req.onsuccess = () => {
      const k = req.result.transaction('markierungen').objectStore('markierungen').getAll();
      k.onsuccess = () => ok(k.result.flat().filter((x) => x.text).map((x) => x.text));
    };
  }));
  await until(async () => (await texte()).includes('Bridge leise\nab Takt 9'), async () => 'Mehrzeilige Schrift wird nicht gespeichert: ' + JSON.stringify(await texte()));
  expect((await kopf.innerText()).includes('Seite 2 / 2'), 'Schreiben hat umgeblättert');
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
  // Noten-Knopf bleibt in der Notenansicht: noch einmal drücken → zurück zur Titelanzeige; das X beendet den Bühnen-Modus
  await p.locator('app-noten-anzeige').getByRole('button', { name: 'Zurück zur Titelanzeige' }).click();
  await until(async () => (await p.locator('app-noten-anzeige').count()) === 0 && (await p.locator('app-setlist-buehne').count()) === 1, 'Noten-Knopf führt nicht zurück zur Titelanzeige');
  await p.locator('app-setlist-buehne .noten-knopf').click();
  await p.locator('app-noten-anzeige').getByRole('button', { name: 'Bühnen-Modus beenden' }).click();
  await until(async () => (await p.locator('app-setlist-buehne').count()) === 0, 'X in der Notenansicht beendet den Bühnen-Modus nicht');

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
  // noch einmal einlesen: Unverändertes wird nicht doppelt angehängt, eine geänderte Datei gleichen Namens ersetzt die alte
  const meldungNoten = () => q.locator('app-noten-verwaltung .meldung').first().innerText().catch(() => '');
  await q.locator('app-noten-verwaltung input.ordner').setInputFiles(ordner);
  await until(async () => (await meldungNoten()).includes('2 schon vorhanden'), async () => 'Unveränderte Dateien werden erneut angehängt: ' + (await meldungNoten()));
  copyFileSync(join(DIST, 'presse', 'blickfeld-nord-buehnenplan.pdf'), join(ordner, 'Iris - The Goo Goo Dolls - Bass.pdf'));
  await q.locator('app-noten-verwaltung input.ordner').setInputFiles(ordner);
  await until(async () => (await meldungNoten()).includes('1 PDF aktualisiert'), async () => 'Geänderte Datei gleichen Namens wird nicht ersetzt: ' + (await meldungNoten()));
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
  // die Notenansicht lädt erst die drei frisch eingelesenen PDFs – auf einem ausgelasteten Rechner dauert das länger
  await wahl.waitFor({ timeout: 15000 }).catch(() => undefined);
  await until(async () => (await wahl.locator('option').allInnerTexts()).join('|') === 'songbook|Bass|Gitarre v2|Akkorde', async () => 'Fassungen fehlen: ' + (await wahl.locator('option').allInnerTexts().catch(() => [])).join('|') + ((await q.locator('app-noten-anzeige').count()) ? '' : ' (Notenansicht nicht offen)'));
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
  await songDialogOeffnen(q);
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
  // Noten-Check: eine Datei ohne Song, auf dem Gerät und im Sync-Ordner → „Auch aus OneDrive“ löscht beides
  await p.evaluate(() => Promise.all([
    new Promise((ok) => {
      const req = indexedDB.open('bn-noten', 2);
      req.onupgradeneeded = () => {
        for (const n of ['dateien', 'songs', 'markierungen']) if (!req.result.objectStoreNames.contains(n)) req.result.createObjectStore(n, n === 'dateien' ? { keyPath: 'id' } : undefined);
      };
      req.onsuccess = () => {
        const t = req.result.transaction('dateien', 'readwrite');
        t.objectStore('dateien').put({ id: 'waise', name: 'Waise.pdf', daten: new ArrayBuffer(5), groesse: 5, hinzugefuegt: '2026-01-01' });
        t.oncomplete = () => { req.result.close(); ok(null); };
      };
    }),
    new Promise((ok) => {
      const req = indexedDB.open('bn-sync', 1);
      req.onupgradeneeded = () => { for (const n of ['dateien', 'meta']) if (!req.result.objectStoreNames.contains(n)) req.result.createObjectStore(n); };
      req.onsuccess = () => {
        if (!req.result.objectStoreNames.contains('dateien')) return ok(null);
        const t = req.result.transaction('dateien', 'readwrite');
        t.objectStore('dateien').put({ inhalt: new Blob(['%PDF-']), groesse: 5, geaendert: new Date().toISOString(), version: 'v1' }, 'Noten/Waise.pdf');
        t.oncomplete = () => { req.result.close(); ok(null); };
      };
    }),
  ]));
  await p.reload({ waitUntil: 'networkidle' });
  const check = p.locator('app-noten-check');
  await until(async () => (await check.innerText().catch(() => '')).includes('1 ohne Song'), 'Noten-Check zeigt die Datei ohne Song nicht');
  await check.locator('summary').click();
  await check.getByRole('button', { name: 'Waise.pdf auch aus OneDrive löschen' }).click();
  await until(async () => (await check.innerText().catch(() => '')).includes('und aus dem Sync-Ordner (1)') || !(await check.locator('details').count()), 'Löschen aus OneDrive meldet nichts');
  expect(!(await p.evaluate(() => new Promise((ok) => {
    const req = indexedDB.open('bn-sync');
    req.onsuccess = () => {
      const k = req.result.transaction('dateien').objectStore('dateien').getAllKeys();
      k.onsuccess = () => ok(k.result.includes('Noten/Waise.pdf'));
    };
  }))), 'Datei liegt noch im Sync-Ordner');
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
    localStorage.setItem('bn-wackelt', JSON.stringify({ 'Iris|Goo Goo Dolls': 1 }));
  });
  // sechs alte Backups (vor über einem halben Jahr) liegen schon im Sync-Ordner
  await p.evaluate(() => new Promise((ok) => {
    const req = indexedDB.open('bn-sync', 1);
    req.onupgradeneeded = () => { req.result.createObjectStore('dateien'); req.result.createObjectStore('meta'); };
    req.onsuccess = () => {
      const t = req.result.transaction('dateien', 'readwrite');
      for (let m = 1; m <= 6; m++) t.objectStore('dateien').put({ inhalt: new Blob(['{}']), groesse: 2, geaendert: '', version: 'v' + m }, `Backup/blickfeld-nord-backup-2025-0${m}-01.json`);
      t.oncomplete = () => ok(null);
    };
  }));
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
  // eine Datei mit allem (auch Einstellungen); von den alten bleiben nur so viele, dass es die letzten 5 sind
  const backupsLesen = () => p.evaluate(() => new Promise((ok) => {
    const req = indexedDB.open('bn-sync');
    req.onsuccess = () => {
      const st = req.result.transaction('dateien').objectStore('dateien');
      const k = st.getAllKeys();
      k.onsuccess = async () => {
        const namen = k.result.map(String).filter((x) => x.startsWith('Backup/')).sort();
        const neu = namen.find((x) => /-\d{4}\.json$/.test(x));
        const g = st.get(neu);
        g.onsuccess = async () => ok({ namen, inhalt: JSON.parse(await g.result.inhalt.text()) });
      };
    };
  }));
  let backups;
  await until(async () => (backups = await backupsLesen()).namen.length === 5, 'alte Backups werden nicht gelöscht').catch(() => undefined);
  expect(backups.namen.length === 5 && !backups.namen.includes('Backup/blickfeld-nord-backup-2025-01-01.json') && !backups.namen.includes('Backup/blickfeld-nord-backup-2025-02-01.json'), `Aufbewahrung stimmt nicht: ${backups.namen.join(', ')}`);
  expect(backups.inhalt.data['bn-probe-2099-04-04'] && backups.inhalt.data['bn-wackelt'], 'Backup enthält nicht alles (Daten und Einstellungen)');
  await until(async () => (await p.locator('app-backup-karte').innerText()).includes('Letztes Backup von diesem Gerät:'), 'Letztes Backup wird nicht angezeigt');
  await until(async () => (await p.locator('app-backup-karte').innerText()).includes('Neuestes Backup in OneDrive:'), 'Backup in OneDrive wird nicht angezeigt');
  // alle Backups aus OneDrive als Liste in den Einstellungen
  await until(async () => /Backups in OneDrive \(\d+\)/.test(await p.locator('app-backup-karte').innerText()), 'Liste der Backups in OneDrive fehlt');
  await p.locator('app-backup-karte details.liste summary').click();
  expect(await p.locator('app-backup-karte details.liste li button', { hasText: 'Wiederherstellen' }).first().isVisible(), 'Backup in der Liste lässt sich nicht wiederherstellen');
  // letzter Abgleich mit Fehler: „Kopieren“ legt die Meldung in die Zwischenablage
  await p.evaluate(() => localStorage.setItem('bn-sync-letzter', JSON.stringify({ zeit: new Date().toISOString(), text: '1 Fehler – Geraete/x.json: Herunterladen nicht möglich', fehler: true })));
  await p.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await p.go('/backstage/abgleich/');
  const status = p.locator('app-sync-status');
  await status.locator('.letzter button.kopieren').click();
  await until(async () => (await p.evaluate(() => navigator.clipboard.readText())).includes('Geraete/x.json: Herunterladen nicht möglich') && (await status.locator('.letzter button.kopieren').innerText()).includes('Kopiert'), 'Fehlermeldung lässt sich nicht kopieren');
  // Daten auf diesem Gerät → „Diagnose kopieren“: alles in einem Text, ohne E-Mail-Adresse
  await p.locator('app-daten-geraet .diagnose button').click();
  await until(async () => /Blickfeld Nord – Diagnose[\s\S]*App-Stand[\s\S]*Synchronisation: eingerichtet ja[\s\S]*Letzter Abgleich/.test(await p.evaluate(() => navigator.clipboard.readText())), async () => `Diagnose fehlt in der Zwischenablage: ${(await p.evaluate(() => navigator.clipboard.readText())).slice(0, 300)}`);
  expect(!/@/.test(await p.evaluate(() => navigator.clipboard.readText())), 'Diagnose enthält eine E-Mail-Adresse');
  // ohne Microsoft-Konto kann der automatische Abgleich nicht laufen: oben „Anmeldung nötig“ mit „Neu anmelden“
  const autoSetzen = (an) => p.evaluate((an) => localStorage.setItem('bn-sync-einstellungen', JSON.stringify({ ...JSON.parse(localStorage.getItem('bn-sync-einstellungen')), auto: an })), an);
  await autoSetzen(true);
  await p.reload({ waitUntil: 'networkidle' });
  const anmelden = p.locator('app-sync-kompass .anmelden');
  await until(async () => (await anmelden.count()) === 1 && /Neu anmelden/.test(await anmelden.innerText()), 'Kein Hinweis „Neu anmelden“, obwohl der Abgleich ohne Anmeldung ruht', 25_000);
  await anmelden.getByRole('button', { name: 'Hinweis ausblenden' }).click();
  await until(async () => (await anmelden.count()) === 0, 'Hinweis lässt sich nicht ausblenden');
  await autoSetzen(false);
  // (i) erklärt den Knopf; Gerät benennen
  await status.getByRole('button', { name: 'Was macht „Jetzt synchronisieren“?' }).click();
  await until(async () => (await status.locator('.hilfe').innerText().catch(() => '')).includes('Gleicht OneDrive und dieses Gerät ab'), '(i) erklärt „Jetzt synchronisieren“ nicht');
  await status.locator('.geraete summary').click();
  await status.locator('.geraet-name input').fill('Freds Handy');
  await status.locator('.geraet-name input').dispatchEvent('change');
  await until(async () => (await status.locator('.geraete summary').innerText()).includes('dieses: Freds Handy'), 'Gerätename wird nicht übernommen');
  expect((await p.evaluate(() => localStorage.getItem('bn-geraet-name'))) === 'Freds Handy', 'Gerätename nicht gespeichert');
  // Daten auf diesem Gerät → Geräte: Einträge aus dem Sync-Ordner (mit Kennung) und nicht lesbare
  await p.evaluate(() => new Promise((ok) => {
    localStorage.setItem('bn-sync-geraete-unlesbar', JSON.stringify(['dd2a1f3a']));
    const req = indexedDB.open('bn-sync', 1);
    req.onsuccess = () => {
      const t = req.result.transaction('dateien', 'readwrite');
      const text = JSON.stringify({ id: 'ab12cd34', name: 'Davids Laptop', person: 'david', zeit: new Date().toISOString(), app: '0000beef' });
      t.objectStore('dateien').put({ inhalt: new Blob([text]), groesse: text.length, geaendert: new Date().toISOString(), version: 'g1' }, 'Geraete/ab12cd34.json');
      t.oncomplete = () => ok(null);
    };
  }));
  await p.reload({ waitUntil: 'networkidle' });
  const geraeteGruppe = p.locator('app-backstage-daten .geraete-gruppe');
  await geraeteGruppe.locator('summary').click();
  await until(async () => /Davids Laptop[\s\S]*Kennung ab12cd34 · App-Stand 0000beef[\s\S]*Unbekanntes Gerät[\s\S]*Kennung dd2a1f3a/.test(await geraeteGruppe.innerText().catch(() => '')), async () => `Geräte fehlen unter „Daten auf diesem Gerät“: ${await geraeteGruppe.innerText().catch(() => '–')}`);
  // weitere Bereiche: Speicherplatz, Sync-Kopie (je Ordner), Spotify (Protokoll leeren), Backup; neue Schlüssel beschriftet
  await p.evaluate(() => {
    localStorage.setItem('bn-spotify-modus', JSON.stringify('fern'));
    localStorage.setItem('bn-spotify-protokoll', JSON.stringify(['12:00:00.0 Test', '12:00:01.0 Test']));
    localStorage.setItem('bn-sprungmarken', JSON.stringify({ 'Song|Band': { marken: [], zeit: 1 } }));
    localStorage.setItem('bn-setlist-vorlagen', JSON.stringify([]));
  });
  await p.reload({ waitUntil: 'networkidle' });
  const daten = p.locator('app-backstage-daten');
  const summaries = async () => (await daten.locator('summary').allInnerTexts()).join(' | ');
  await until(async () => /Speicherplatz[\s\S]*Backup/.test(await summaries()), async () => `Speicherplatz/Backup fehlen: ${await summaries()}`);
  expect(/Sprungmarken/.test(await summaries()) && /Sammlungen/.test(await summaries()), `Sprungmarken/Sammlungen nicht als eigene Bereiche: ${await summaries()}`);
  expect(!/Setlist · vorlagen/.test(await daten.innerText()), 'Sammlungen noch als Setlist eines Auftritts beschriftet');
  const kopie = daten.locator('.kopie-gruppe');
  await kopie.locator('summary').click();
  await until(async () => /Geraete[\s\S]*1 Datei/.test(await kopie.innerText().catch(() => '')), async () => `Sync-Kopie zeigt den Ordner nicht: ${await kopie.innerText().catch(() => '–')}`);
  const spotify = daten.locator('.spotify-gruppe');
  await spotify.locator('summary').click();
  await until(async () => /2 Zeilen/.test(await spotify.innerText().catch(() => '')), async () => `Spotify-Bereich fehlt: ${await spotify.innerText().catch(() => '–')}`);
  await spotify.getByRole('button', { name: /Leeren/ }).click();
  await until(async () => /0 Zeilen/.test(await spotify.innerText().catch(() => '')), async () => `Protokoll nicht geleert: ${await spotify.innerText().catch(() => '–')}`);
  expect((await p.evaluate(() => localStorage.getItem('bn-spotify-protokoll'))) === null, 'Protokoll bleibt gespeichert');
  await p.evaluate(() => ['bn-spotify-modus', 'bn-sprungmarken', 'bn-setlist-vorlagen'].forEach((k) => localStorage.removeItem(k)));
  // nach dem Abgleich nicht eindeutig erkannte Noten warten auf eine Zuordnung
  await p.evaluate(() => new Promise((ok) => {
    const req = indexedDB.open('bn-sync', 1);
    req.onsuccess = () => {
      const t = req.result.transaction('dateien', 'readwrite');
      t.objectStore('dateien').put({ inhalt: new Blob(['[C]x']), groesse: 4, geaendert: new Date().toISOString(), version: 'v1' }, 'Noten/Scan 7.pro');
      t.objectStore('dateien').put({ inhalt: new Blob(['[G]y']), groesse: 4, geaendert: new Date().toISOString(), version: 'v1' }, 'Noten/Testband_-_Eigenes_Lied.pro');
      t.oncomplete = () => ok(null);
    };
  }));
  await p.evaluate(() => localStorage.setItem('bn-sync-offen', JSON.stringify(['Noten/Scan 7.pro', 'Noten/Testband_-_Eigenes_Lied.pro'])));
  await p.reload({ waitUntil: 'networkidle' });
  await until(async () => (await status.innerText()).includes('2 Noten-Dateien brauchen eine Zuordnung'), 'Offene Zuordnung wird nicht gemeldet');
  await status.locator('button', { hasText: 'Zuordnen' }).click();
  const offen = status.locator('app-funde-liste li', { hasText: 'Scan 7.pro' });
  await offen.locator('select').selectOption('Angels|Robbie Williams');
  // eigenständig: Song aus dem Dateinamen „<Band> - <Titel>“, ohne Spotify-Liste
  const eigen = status.locator('app-funde-liste li', { hasText: 'Eigenes_Lied' });
  await until(async () => (await eigen.locator('select').innerText()).includes('Eigenständig: Eigenes Lied – Testband'), 'Option „Eigenständig“ fehlt');
  await eigen.locator('select').selectOption('__eigen');
  await status.locator('app-funde-liste button', { hasText: 'Einlesen' }).click();
  await until(async () => (await status.locator('app-funde-liste .meldung').innerText().catch(() => '')).includes('2 Akkordblätter'), 'Zuordnen liest nicht ein');
  await until(async () => !(await status.innerText()).includes('eine Zuordnung'), 'Offene Zuordnung bleibt stehen');
  // „Synchronisierte Dateien einlesen“: eigenständig Eingelesenes und Backups werden nicht mehr angeboten
  await status.locator('button', { hasText: 'Synchronisierte Dateien einlesen' }).click();
  await until(async () => /eigenständig eingelesene Noten-Datei ausgeblendet[\s\S]*unter Einstellungen → Backup/.test(await status.innerText()), async () => 'Hinweis auf ausgeblendete Dateien fehlt: ' + (await status.innerText()).slice(-300));
  const funde = await status.locator('app-funde-liste').innerText();
  expect(!funde.includes('Eigenes_Lied') && !/Backup ·/.test(funde) && funde.includes('Scan 7.pro'), 'Eigenständiges oder Backup wird trotzdem angeboten: ' + funde.slice(0, 300));
  // kommt eine schon eigenständig zugeordnete Datei wieder als offen an (anderes Gerät, neue Fassung): ohne Rückfrage einlesen
  await p.evaluate(() => localStorage.setItem('bn-sync-offen', JSON.stringify(['Noten/Testband_-_Eigenes_Lied.pro'])));
  await p.reload({ waitUntil: 'networkidle' });
  await until(async () => (await status.innerText()).includes('1 schon eigenständig zugeordnete Noten-Datei eingelesen'), 'Eigenständig Zugeordnetes wartet weiter auf eine Zuordnung');
  expect(!(await status.innerText()).includes('eine Zuordnung'), 'Zuordnung wird trotzdem verlangt');
  await p.go('/backstage/songs/');
  await p.locator('app-songs-liste .listen-chips button', { hasText: 'Ohne Liste' }).click();
  await until(async () => /Eigenes Lied[\s\S]*Testband[\s\S]*Akkorde/.test(await p.locator('app-songs-liste tbody').innerText()), 'Eigenständiger Song fehlt unter „Ohne Liste“');
  return p;
});

test('Backstage: Songs → Sammlungen – anlegen, eigene Seite bearbeiten, in der Setlist anhängen', async () => {
  const p = await page();
  await p.go('/backstage/songs/');
  expect(!(await p.locator('app-songs-liste .sammlung-chips').count()), 'Sammlungen stehen noch in der Songs-Liste');
  await schritt('Reiter Sammlungen', () => p.locator('app-backstage-songs .tabs a', { hasText: 'Sammlungen' }).click());
  const seite = p.locator('app-songs-sammlungen');
  await schritt('Übersicht der Sammlungen', () => seite.locator('.karten').waitFor({ timeout: 20000 }));
  expect((await seite.locator('.karten li', { hasText: 'Weihnachtslieder' }).count()) === 1, 'feste Sammlung fehlt in der Übersicht');
  await seite.locator('.neu input').fill('Kneipe Test');
  await schritt('Anlegen', () => seite.locator('.neu button').click());
  // eigene Seite je Sammlung (…/sammlungen?name=…), bearbeitet wie eine Setlist
  await until(async () => new URL(p.url()).searchParams.get('name') === 'Kneipe Test', 'Neue Sammlung öffnet nicht ihre Seite');
  await schritt('Chip Alle', () => seite.locator('.listen-chips button', { hasText: 'Alle' }).click());
  const titel = [];
  for (let i = 0; i < 3; i++) {
    const knopf = seite.locator('.songs li button').first();
    titel.push((await knopf.locator('.t').innerText()).trim());
    await schritt(`Song ${i + 1} hinzufügen`, () => knopf.click());
    await until(async () => (await seite.locator('.list li .t').count()) === i + 1, `Song ${i + 1} kommt nicht in die Sammlung`);
  }
  const zeilen = () => seite.locator('.list li .t').allInnerTexts();
  expect((await zeilen()).join('|') === titel.join('|'), 'Reihenfolge stimmt nicht');
  await schritt('Nach unten', () => seite.locator('.list li').first().getByRole('button', { name: 'Nach unten' }).click());
  await until(async () => (await zeilen()).join('|') === [titel[1], titel[0], titel[2]].join('|'), 'Umsortieren in der Sammlung klappt nicht');
  await schritt('Entfernen', () => seite.locator('.list li').last().getByRole('button', { name: 'Entfernen' }).click());
  await until(async () => (await zeilen()).length === 2, 'Entfernen aus der Sammlung klappt nicht');
  // zurück zur Übersicht: Karte mit 2 Songs
  await schritt('Zurück zur Übersicht', () => seite.locator('app-zurueck a').click());
  await until(async () => (await seite.locator('.karten li', { hasText: 'Kneipe Test' }).innerText().catch(() => '')).includes('2 Songs'), 'Übersicht zeigt die Sammlung nicht');
  // in der Setlist eines Auftritts anhängen
  const id = concerts[concerts.length - 1].split('/')[2];
  await p.go(`/backstage/${id}/setlist`);
  const i = await p.locator('app-setlist-sammlungen option').evaluateAll((o) => o.findIndex((x) => x.textContent.startsWith('Kneipe Test · 2 Songs')));
  expect(i >= 0, 'Bearbeitete Sammlung fehlt in der Setlist');
  await p.locator('app-setlist-sammlungen select').selectOption(String(i));
  await p.locator('app-setlist-sammlungen button', { hasText: 'Anhängen' }).click();
  await until(async () => (await p.locator('app-setlist .list li .t').allInnerTexts()).join('|') === [titel[1], titel[0]].join('|'), 'Sammlung wird nicht in ihrer Reihenfolge angehängt');
  return p;
});

test('Backstage: Setlist – Songs aus allen Spotify-Listen per Filter', async () => {
  const id = concerts[concerts.length - 1].split('/')[2];
  const p = await page();
  await p.go(`/backstage/${id}/setlist`);
  const chips = p.locator('app-setlist .pick .listen-chips button');
  await chips.filter({ hasText: 'Archiv' }).click();
  const erster = p.locator('app-setlist .pick li button').first();
  await until(async () => (await erster.locator('mat-icon.liste').allInnerTexts()).includes('inventory_2'), 'Archiv-Filter zeigt keine Archiv-Songs');
  const titel = (await erster.locator('.t').innerText()).trim();
  await erster.click();
  await until(async () => (await p.locator('app-setlist .list').innerText()).includes(titel), 'Song aus dem Archiv landet nicht auf der Setlist');
  // fehlt in der Spotify-Liste „Setlist“ → Hinweis; Track-Links für Spotify
  await until(async () => (await p.locator('app-setlist .spotify-hinweis.fehlt').innerText().catch(() => '')).includes(titel), 'Hinweis „nicht in der Spotify-Liste Setlist“ fehlt');
  await p.locator('app-setlist button', { hasText: 'Für Spotify kopieren' }).click();
  await until(async () => /Track-Links kopiert|Für keinen Song/.test(await p.locator('app-setlist .spotify-hinweis').first().innerText().catch(() => '')), 'Spotify-Export meldet nichts');
  return p;
});

test('Backstage: Spotify-Listen übernehmen (Probe, Setlist), Dauer und Abweichungen unter Songs', async () => {
  const p = await page();
  await p.go('/backstage/termine/');
  await p.locator('a.row-link', { hasText: 'Probe' }).first().click();
  await p.waitForURL(/\/backstage\/probe\//);
  const seite = p.locator('app-backstage-probe');
  // Hinzufügen steht über der Liste; kein eigener Spotify-Knopf mehr – die Suche findet die Spotify-Liste „Probe“
  expect((await seite.locator('button.aus-liste').count()) === 0, 'alter Knopf „aus der Spotify-Liste übernehmen“ ist noch da');
  await until(async () => /Spotify-Liste „Probe“: \d+ Songs? fehl/.test(await seite.locator('.spotify-diff').innerText().catch(() => '')), 'Differenz zur Spotify-Liste fehlt');
  await seite.locator('input[type=search]').fill('Probe');
  const hit = seite.locator('.hits button.liste-hit', { hasText: 'Spotify-Liste' }).first();
  const zahl = Number(/(\d+) von/.exec(await hit.innerText())[1]);
  await hit.click();
  await until(async () => (await seite.locator('.list li label').count()) >= zahl, 'Spotify-Liste „Probe“ wird nicht übernommen');
  await until(async () => (await seite.locator('.spotify-diff').innerText()).includes('identisch'), 'nach dem Übernehmen nicht identisch');
  // Liste komplett leeren
  await seite.locator('button.leeren').click();
  await until(async () => (await seite.locator('.list li label').count()) === 0, 'Liste leeren klappt nicht');
  const id = concerts[concerts.length - 1].split('/')[2];
  await p.go(`/backstage/${id}/setlist`);
  await p.locator('app-setlist .pick .listen-chips button', { hasText: 'Setlist' }).click();
  await p.locator('app-setlist button.aus-liste').click();
  await until(async () => (await p.locator('app-setlist .list li .no').count()) > 20, 'Spotify-Setlist wird nicht übernommen');
  await p.go('/backstage/songs/');
  await p.locator('app-songs-liste .listen-chips button', { hasText: 'Setlist' }).click();
  await until(async () => /\d+ Songs · \d/.test(await p.locator('app-songs-liste .listen-info').innerText()), 'Dauer der Liste fehlt');
  await p.locator('app-songs-liste .listen-chips button', { hasText: 'Wunschliste' }).click();
  await until(async () => (await p.locator('app-songs-liste .wunsch-stand').count()) > 0, 'Stand der Wunschliste fehlt');
  // Fortschritt je Filter: Text und Gesamtzahl folgen dem gewählten Chip
  await until(async () => /^Wunschliste: Angaben bei \d+ von \d+ Songs/.test(await p.locator('app-songs-liste .fortschritt-text').innerText()), 'Fortschritt folgt nicht dem Filter Wunschliste');
  const wunschGesamt = Number(/von (\d+)/.exec(await p.locator('app-songs-liste .fortschritt-text').innerText())[1]);
  const wunschChip = Number(await p.locator('app-songs-liste .listen-chips button', { hasText: 'Wunschliste' }).locator('.n').innerText());
  expect(wunschGesamt === wunschChip, `Fortschritt zählt ${wunschGesamt} Songs, die Wunschliste hat ${wunschChip}`);
  // Reihenfolge wie in Spotify, Schnell-Eintragen von Tonart/Tempo, Hinweise zu den Listen
  await p.locator('app-songs-liste .listen-chips button', { hasText: 'Setlist' }).click();
  await p.locator('app-songs-liste .filter select').nth(1).selectOption('spotify');
  await p.locator('app-songs-liste .filter label', { hasText: 'schnell eintragen' }).locator('input').check();
  const zeile = p.locator('app-songs-liste tbody tr').first();
  await zeile.locator('.schnell input').fill('111');
  await zeile.locator('.schnell input').blur();
  await until(async () => (await p.locator('app-songs-liste .apply').innerText()).includes('1 Song geändert'), 'Schnell-Eintragen speichert nicht');
  await until(async () => /Hinweise zu den Listen/.test(await p.locator('app-songs-liste').innerText()), 'Hinweise zu den Listen fehlen');
  // Ziel-Spielzeit der Setlist
  await p.go(`/backstage/${id}/setlist`);
  await p.locator('app-setlist .spielzeit input').fill('600');
  await p.locator('app-setlist .spielzeit input').blur();
  await until(async () => /noch .* frei/.test(await p.locator('app-setlist .spielzeit').innerText()), 'Spielzeit zeigt nichts Freies');
  await until(async () => (await p.locator('app-setlist .spielzeit button').count()) > 0, 'Keine Songs zum Auffüllen vorgeschlagen');
  return p;
});

test('Backstage: Bühnen-Modus – Lupe holt Wünsche an die aktuelle Stelle, Balken springt', async () => {
  const id = concerts[concerts.length - 1].split('/')[2];
  const p = await page();
  await p.go(`/backstage/${id}/setlist`);
  await p.locator('app-setlist .pick .listen-chips button', { hasText: 'Setlist' }).click();
  await p.locator('app-setlist button.aus-liste').click();
  await until(async () => (await p.locator('app-setlist .list li .no').count()) > 20, 'Spotify-Setlist wird nicht übernommen');
  const zehnter = (await p.locator('app-setlist .list li .t').nth(9).innerText()).trim();
  await p.locator('app-setlist button', { hasText: 'Bühnen-Modus' }).first().click();
  const buehne = p.locator('app-setlist-buehne');
  const titel = buehne.locator('main h1');
  // der Bühnen-Modus wird nachgeladen – auf einem ausgelasteten Rechner dauert das
  await schritt('Bühnen-Modus erscheint', () => titel.waitFor({ timeout: 20000 }));
  const erster = (await titel.innerText()).trim();
  // Song, der schon drinsteht, wird an die aktuelle Stelle gezogen
  await buehne.locator('button.lupe').click();
  // echte Tastenanschläge (Laptop): das Suchfeld hat den Fokus, die Blätter-Tasten des Bühnen-Modus fangen nichts ab
  await until(() => buehne.locator('.suche input').evaluate((el) => el === document.activeElement), 'Suchfeld bekommt keinen Fokus');
  await p.keyboard.type(zehnter, { delay: 20 });
  await until(async () => (await buehne.locator('.suche input').inputValue()) === zehnter, 'Tastatur erreicht das Suchfeld nicht');
  await buehne.locator('.suche li button').first().click();
  await until(async () => (await titel.innerText()).trim() === zehnter, 'Gezogener Song ist nicht dran');
  await until(async () => (await buehne.locator('footer .next').innerText()).includes(erster), 'Bisheriger Song folgt nicht danach');
  // Fortschrittsbalken: Standard nur Anzeige – Tippen darauf springt nicht ans Ende (höchstens ein Song weiter wie überall)
  const balken = buehne.locator('footer .progress');
  expect((await balken.getAttribute('role')) === 'progressbar', 'Fortschrittsbalken ist ohne Einstellung antippbar');
  let box = await balken.boundingBox();
  await p.mouse.click(box.x + box.width * 0.95, box.y + box.height / 2);
  await p.waitForTimeout(400);
  expect(Number(await buehne.locator('main .no').innerText().catch(() => '0')) < 5, 'Tippen auf den Balken springt ohne Einstellung');
  await buehne.locator('button[aria-label="Bühnen-Modus beenden"]').click();
  // mit der Einstellung (Einstellungen → Bühnen-Modus): antippen springt, Sets sind markiert
  await p.go('/backstage/einstellungen/');
  await p.locator('app-buehne-einstellungen input.balken-tippen').check();
  await until(async () => (await p.evaluate(() => localStorage.getItem('bn-buehne-balken-tippen'))) === '1', 'Einstellung „Balken antippen“ wird nicht gespeichert');
  await p.go(`/backstage/${id}/setlist`);
  await p.locator('app-setlist button', { hasText: 'Bühnen-Modus' }).first().click();
  await schritt('Bühnen-Modus erscheint wieder', () => titel.waitFor({ timeout: 20000 }));
  box = await balken.boundingBox();
  await p.mouse.click(box.x + box.width * 0.95, box.y + box.height / 2);
  await until(async () => Number(await buehne.locator('main .no').innerText().catch(() => '0')) > 20 || (await buehne.innerText()).includes('Pause'), 'Balken springt nicht');
  await buehne.locator('button[aria-label="Bühnen-Modus beenden"]').click();
  await until(async () => (await p.locator('app-setlist .list li .t').first().innerText()).trim() === zehnter, 'Wunsch landet nicht in der gespeicherten Setlist');
  return p;
});

test('Backstage: „Als Nächstes“ startet Bühnen-Modus mit Song-Liste, Aufgaben zeigen „Bereit?“ je Auftritt', async () => {
  const p = await page();
  await p.clock.setFixedTime(new Date('2026-11-30T10:00:00'));
  await p.go('/backstage/');
  const termine = p.locator('app-backstage ol.next li');
  await termine.first().waitFor();
  expect((await termine.count()) === (await p.locator('app-backstage ol.next li .modus').count()), 'nicht jeder Termin hat Bühnen- bzw. Probe-Modus');
  expect(!/Geklärt|Offen/.test(await p.locator('app-backstage ol.next').innerText()), '„Geklärt/Offen“ steht noch bei den Terminen');
  expect((await p.locator('app-backstage app-bereitschaft').count()) === 0, '„Bereit?“ steht noch in der Übersicht');
  // Setlist für den ersten Auftritt anlegen, dann von der Übersicht aus den Bühnen-Modus starten
  const modus = p.locator('app-backstage ol.next li .modus', { hasText: 'Bühnen-Modus' }).first();
  const id = (await modus.getAttribute('href')).split('/')[2];
  await p.evaluate((id) => localStorage.setItem('bn-setlist-' + id, JSON.stringify([
    { title: 'Iris', artist: 'Goo Goo Dolls' }, { title: 'Perfect', artist: 'Ed Sheeran' }, { pause: true }, { title: 'Hallelujah', artist: 'Leonard Cohen' },
  ])), id);
  await modus.click();
  const buehne = p.locator('app-setlist-buehne');
  await schritt('Bühnen-Modus öffnet direkt', () => buehne.locator('main h1').waitFor({ timeout: 20000 }));
  expect((await buehne.locator('header .anlass').innerText()).trim().length > 2, 'kein Name des Auftritts links oben');
  // Song-Liste rechts: alle Songs, antippen springt
  await buehne.locator('button.liste-knopf').click();
  await until(async () => (await buehne.locator('.navi li button').count()) === 3, 'Song-Liste zeigt nicht alle Songs');
  await buehne.locator('.navi li button', { hasText: 'Hallelujah' }).click();
  await until(async () => (await buehne.locator('main h1').innerText()).trim() === 'Hallelujah', 'Sprung aus der Song-Liste geht nicht');
  expect((await buehne.locator('header .set').innerText()).toLowerCase().includes('set 2'), 'Set-Nummer folgt nicht dem Sprung');
  await p.keyboard.press('Escape');
  await p.keyboard.press('Escape');
  // Schließen führt dorthin zurück, woher der Bühnen-Modus kam: in die Übersicht
  await until(async () => new URL(p.url()).pathname.replace(/\/$/, '') === '/backstage', () => `Schließen führt nach ${p.url()} statt in die Übersicht`);
  // Aufgaben: „Bereit?“ je kommendem Auftritt, zugeklappt mit Haken-Reihe
  await p.go('/backstage/aufgaben/');
  const listen = p.locator('app-backstage-aufgaben app-bereitschaft');
  await listen.first().waitFor();
  expect((await listen.count()) >= 2, 'nicht jeder kommende Auftritt hat eine To-do-Liste');
  expect((await listen.first().locator('summary .haken-reihe mat-icon').count()) > 2, 'zugeklappt keine Haken-Reihe');
  await listen.first().locator('summary').click();
  await until(async () => (await listen.first().locator('summary .haken-reihe').count()) === 0, 'Haken-Reihe bleibt aufgeklappt stehen');
  return p;
});

test('Backstage: Zurück führt zur vorigen Seite, Üben mit Karteikasten und Übe-Modus', async () => {
  const p = await page();
  await p.go('/backstage/');
  await p.locator('app-backstage-suche input').fill('Nenna');
  await p.locator('app-backstage-suche li a', { hasText: 'Café Nenna' }).first().click();
  await p.locator('app-backstage-show app-zurueck').waitFor();
  expect((await p.locator('app-backstage-show app-zurueck').innerText()).includes('Backstage'), 'Zurück nennt nicht die vorige Seite');
  await p.locator('app-backstage-show app-zurueck a').click();
  await until(async () => new URL(p.url()).pathname.replace(/\/$/, '') === '/backstage', () => `Zurück führt nach ${p.url()} statt in die Übersicht`);
  // Üben: persönlich – mit „Ich bin …“ und drei Songs aus der alten „Wackelt noch“-Liste (werden auf Kasten 2 umgestellt)
  await p.evaluate(() => {
    localStorage.setItem('bn-ich', 'jan-frederic-overbeck');
    localStorage.setItem('bn-wackelt', JSON.stringify({ 'Iris|The Goo Goo Dolls': '2026-10-01', 'Angels|Robbie Williams': '2026-10-02', 'Africa|TOTO': '2026-10-03' }));
  });
  // Tagesziel in den Einstellungen: 2 Karten am Tag (nur eine Empfehlung)
  await p.go('/backstage/einstellungen/');
  await p.locator('app-ich-einstellung input[type=number]').fill('2');
  await p.locator('app-ich-einstellung input[type=number]').dispatchEvent('change');
  await until(async () => (await p.evaluate(() => localStorage.getItem('bn-ueben-tagesziel'))) === '2', 'Tagesziel wird nicht gespeichert');
  await p.go('/backstage/');
  const karte = p.locator('app-backstage a.ueben-karte');
  const karteText = await karte.innerText();
  expect(karteText.includes('3 Songs im Karteikasten · 3 heute dran'), 'Üben-Karte zählt nicht: ' + karteText);
  // „Heute fällig“ kennt den Karteikasten und führt direkt in den Übe-Modus
  await until(async () => /3 Karteikarten fällig – Übe-Modus starten/.test(await p.locator('app-heute-faellig').innerText().catch(() => '')), '„Heute fällig“ nennt die fälligen Karteikarten nicht');
  expect((await p.locator('app-heute-faellig a', { hasText: 'Karteikarten fällig' }).getAttribute('href')).includes('modus=1'), 'Link führt nicht in den Übe-Modus');
  await karte.click();
  const ueben = p.locator('app-backstage-ueben');
  await ueben.locator('.liste li select').first().waitFor();
  // nur noch ein Knopf: Übe-Modus (keine Lernkarte, kein „Üben starten“ / „Alle üben“)
  expect((await ueben.locator('button').filter({ hasText: /Üben starten|Alle \d+ üben|Aufdecken/ }).count()) === 0, 'alte Knöpfe sind noch da');
  expect((await ueben.locator('.kaesten li').nth(1).locator('.n').innerText()) === '3', 'alte Liste nicht in Kasten 2 umgestellt');
  expect((await ueben.locator('.kaesten li').nth(0).locator('.s').innerText()) === 'Üben' && (await ueben.locator('.kaesten li').nth(3).locator('.s').innerText()) === 'Sitzt', 'Kästen nennen den Status nicht');
  expect((await ueben.locator('.tagesziel').innerText()).includes('Empfehlung: 2 Karten'), 'Tagesziel nicht als Empfehlung');
  // Band-Übe-Board: je Musiker eine Zeile, die eigene hervorgehoben; gemeinsame Songs mit „Ich auch“
  await p.evaluate(() => localStorage.setItem('bn-kasten-david-broeker', JSON.stringify({ v: 2, kaesten: { 'Iris|The Goo Goo Dolls': 1, 'Hey Jude|The Beatles': 2 }, gelernt: {}, eingenordet: {} })));
  await p.reload({ waitUntil: 'networkidle' });
  await until(async () => (await ueben.locator('.board li').count()) >= 3 && (await ueben.locator('.board li.ich').count()) === 1, 'Band-Übe-Board fehlt');
  await until(async () => /Iris[\s\S]*David: Üben/.test(await ueben.locator('.gemeinsam').innerText().catch(() => '')), 'Gemeinsam geübte Songs fehlen');
  // Status direkt ändern: Angels eingenordet → fällt aus dem Kasten, bleibt aber bis zum nächsten Besuch an seinem Platz
  // in der Liste (die Reihenfolge ändert sich erst beim nächsten Besuch); über die Suche wieder zum Üben (Kasten 1)
  const reihenfolge = () => ueben.locator('.liste li .song-start .t').allInnerTexts();
  const vorher = await reihenfolge();
  await ueben.locator('.liste li', { hasText: 'Angels' }).locator('select').selectOption('eingenordet');
  await until(async () => (await ueben.locator('.liste li.raus', { hasText: 'Angels' }).count()) === 1, 'Eingenordeter Song verschwindet sofort aus der Liste');
  expect(JSON.stringify(await reihenfolge()) === JSON.stringify(vorher), 'Status-Wahl verschiebt die Songs in der Liste');
  // die Suche filtert auch die eigenen Karten
  await ueben.locator('.suche input').fill('Iris');
  await until(async () => (await ueben.locator('ul.liste:not(.gemeinsam) > li').count()) === 1 && (await ueben.locator('.filter-hinweis').innerText()).includes('1 von 3'), async () => `Suche filtert die eigenen Karten nicht: ${(await reihenfolge()).join(', ')} / ${await ueben.locator('.filter-hinweis').innerText().catch(() => '–')} / ${await ueben.locator('ul.liste:not(.gemeinsam) > li').count()}`);
  await ueben.locator('.suche input').fill('');
  await until(async () => (await ueben.locator('.aussen.eingenordet .n').innerText().catch(() => '')) === '1', 'Eingenordet wird nicht gezählt');
  // Kästen mit Status-Symbol im Rahmen „Karteikasten“; Nicht gelernt und Eingenordet stehen außerhalb
  expect((await ueben.locator('.kartei .kaesten li .sym').allInnerTexts()).join(' ') === '✎ ↻ ↻ ✓ ✓', 'Kästen ohne Status-Symbole');
  expect((await ueben.locator('.kartei .aussen').count()) === 0 && (await ueben.locator('.kartei-system > .aussen').count()) === 2, 'Nicht gelernt / Eingenordet nicht außerhalb des Karteikastens');
  expect((await ueben.locator('.wege li').count()) === 5, 'Erklärung, wohin ein Status-Klick führt, fehlt');
  await ueben.locator('.suche input').fill('Angels');
  await ueben.locator('.treffer button', { hasText: 'Eingenordet' }).first().click();
  await until(async () => (await ueben.locator('.kaesten li').nth(0).locator('.n').innerText()) === '1', 'Hinzufügen legt nicht in Kasten 1');
  // ganze Sammlung zum Üben: Songs ohne Status kommen in Kasten 1
  await ueben.locator('.suche input').fill('Weihnachts');
  await ueben.locator('.treffer button.liste-treffer', { hasText: 'Weihnachtslieder' }).click();
  await until(async () => (await ueben.locator('.meldung').innerText().catch(() => '')).includes('3 Songs zum Üben dazu'), 'Sammlung wird nicht zum Üben dazugenommen');
  await until(async () => (await ueben.locator('.kaesten li').nth(0).locator('.n').innerText()) === '4', 'Sammlung nicht in Kasten 1');
  for (const k of ['In der Weihnachtsbäckerei', 'Kleine Kinder', 'Weihnacht, was bist du']) await ueben.locator('.liste li', { hasText: k }).locator('select').selectOption('nicht');
  // „Nicht gelernt“: bleibt bis zum nächsten Besuch stehen, dann ist es aus der Liste
  await until(async () => (await ueben.locator('.liste li.raus').count()) === 3, 'Nicht gelernt wird nicht als „nicht mehr im Karteikasten“ gezeigt');
  await p.reload({ waitUntil: 'networkidle' });
  await until(async () => (await ueben.locator('.liste li select').count()) === 3, 'Nicht gelernt bleibt nach dem neuen Besuch im Karteikasten');
  // Klick auf einen Song der Liste: Übe-Modus genau dort; Song-Liste auch in der Kopfleiste der Noten
  const zweiter = (await ueben.locator('.liste li .song-start .t').nth(1).innerText()).trim();
  await ueben.locator('.liste li .song-start').nth(1).click();
  const notenA = p.locator('app-setlist-buehne app-noten-anzeige');
  await until(async () => (await notenA.locator('header .titel').innerText().catch(() => '')).includes(zweiter), 'Klick auf den Song startet nicht an dieser Stelle');
  await notenA.locator('header .liste-knopf').click();
  await until(async () => (await p.locator('app-setlist-buehne .navi li').count()) >= 3, 'Song-Liste öffnet sich nicht aus der Kopfleiste');
  await p.keyboard.press('Escape');
  await p.locator('app-setlist-buehne header button[aria-label="Übe-Modus beenden"]').click().catch(async () => { await p.keyboard.press('Escape'); });
  await until(async () => (await p.locator('app-setlist-buehne').count()) === 0, 'Übe-Modus schließt nicht');
  // Übe-Modus: Notenansicht mit „Wackelt noch“ / „Sitzt“ oben rechts, weiter zur nächsten Karte
  await ueben.getByRole('button', { name: 'Übe-Modus', exact: true }).click();
  const noten = p.locator('app-setlist-buehne app-noten-anzeige');
  await schritt('Übe-Modus öffnet die Notenansicht', () => noten.locator('header .wertung.sitzt').waitFor({ timeout: 20000 }));
  // „Zurück“ des Handys (Wischen vom Rand) beendet den Übe-Modus nicht versehentlich: einmal zurück zeigt nur einen Hinweis
  await p.evaluate(() => history.back());
  await until(async () => (await p.locator('app-setlist-buehne .zurueck-hinweis').count()) === 1, 'Hinweis nach „Zurück“ fehlt');
  expect((await noten.count()) === 1 && new URL(p.url()).pathname.includes('/backstage/ueben'), '„Zurück“ beendet den Übe-Modus sofort');
  // Seite lädt neu (Handy hat sie im Hintergrund verworfen): der Übe-Modus öffnet sich wieder
  await p.reload({ waitUntil: 'networkidle' });
  await schritt('Übe-Modus öffnet sich nach dem Neuladen wieder', () => noten.locator('header .wertung.sitzt').waitFor({ timeout: 20000 }));
  // zweimal „Zurück“ kurz hintereinander beendet ihn – die Üben-Seite bleibt, danach wieder öffnen
  await p.evaluate(() => history.back());
  await p.locator('app-setlist-buehne .zurueck-hinweis').waitFor();
  await p.evaluate(() => history.back());
  await until(async () => (await p.locator('app-setlist-buehne').count()) === 0 && new URL(p.url()).pathname.includes('/backstage/ueben'), 'Zweimal „Zurück“ beendet den Übe-Modus nicht');
  await ueben.getByRole('button', { name: 'Übe-Modus', exact: true }).click();
  await schritt('Übe-Modus öffnet sich erneut', () => noten.locator('header .wertung.sitzt').waitFor({ timeout: 20000 }));
  // Mitschnitte des Songs zum Mitspielen
  await noten.locator('header .mitschnitt-knopf').click();
  await noten.locator('.mitschnitt-panel app-song-mitschnitte').waitFor();
  await noten.locator('header .mitschnitt-knopf').click();
  // fünf Status statt „Wackelt noch“ / „Sitzt“; der aktuelle ist hervorgehoben
  expect((await noten.locator('header app-status-schalter button').count()) === 5, 'Übe-Modus hat nicht die fünf Status');
  expect((await noten.locator('header .wertung.an').count()) === 1, 'aktueller Status nicht hervorgehoben');
  const songA = (await noten.locator('header .titel').innerText()).trim();
  // „Üben“: kommt in dieser Runde noch einmal dran
  const standVorher = await p.evaluate(() => localStorage.getItem('bn-ueben'));
  // der gewählte Status leuchtet kurz auf – und die Karte bleibt stehen (weiter per Wischen, Tippen, Pedal)
  await p.evaluate(() => {
    const o = new MutationObserver(() => {
      if (document.querySelector('app-noten-anzeige header .wertung.ueben.blitz.an')) {
        window.__blitzTitel = document.querySelector('app-noten-anzeige header .titel')?.innerText?.trim();
        o.disconnect();
      }
    });
    o.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  await noten.locator('header .wertung.ueben').click();
  await until(async () => (await p.evaluate(() => window.__blitzTitel)) === songA, async () => `Status leuchtet nicht auf (beim Aufleuchten: ${await p.evaluate(() => window.__blitzTitel)}, erwartet: ${songA})`);
  await p.waitForTimeout(900);
  expect((await noten.locator('header .titel').innerText()).trim() === songA, 'Übe-Modus wechselt nach dem Status zur nächsten Karte');
  // ein zweiter Tipp auf derselben Karte ersetzt die erste Wertung (kein doppeltes Weiterschieben im Karteikasten)
  const standEinmal = await p.evaluate(() => localStorage.getItem('bn-ueben'));
  await noten.locator('header .wertung.ueben').click();
  await p.waitForTimeout(300);
  expect((await p.evaluate(() => localStorage.getItem('bn-ueben'))) === standEinmal, 'zweiter Tipp auf derselben Karte zählt doppelt');
  // „Rückgängig“: Karteikasten wie vorher, die Karte bleibt – dann noch einmal „Üben“
  await p.locator('app-setlist-buehne button.rueckgaengig').click();
  await until(async () => (await p.evaluate(() => localStorage.getItem('bn-ueben'))) === standVorher, 'Rückgängig stellt den Karteikasten nicht wieder her');
  expect((await noten.locator('header .titel').innerText()).trim() === songA, 'Rückgängig verlässt die Karte');
  await until(async () => (await p.locator('app-setlist-buehne button.rueckgaengig').count()) === 0, 'Rückgängig-Knopf bleibt stehen');
  await noten.locator('header .wertung.ueben').click();
  // weiter von Hand (Pfeiltaste wie das Pedal)
  const weiter = async () => {
    await p.locator('app-setlist-buehne').focus();
    await p.keyboard.press('ArrowRight');
  };
  await weiter();
  await until(async () => (await noten.locator('header .titel').innerText()).trim() !== songA, 'Weiterblättern nach dem Status klappt nicht');
  // alle Karten „Sitzt“, jeweils von Hand weiter – am Ende den Modus schließen
  for (let i = 0; i < 10 && (await noten.count()); i++) {
    await noten.locator('header .wertung.sitzt').click().catch(() => {});
    await p.waitForTimeout(300);
    await weiter();
    await p.waitForTimeout(300);
  }
  expect((await p.locator('app-setlist-buehne').count()) === 0, 'Weiterblättern nach der letzten Karte beendet den Übe-Modus nicht');
  await until(async () => (await ueben.locator('.ergebnis').innerText().catch(() => '')).includes('Sitzt'), 'Übe-Ergebnis fehlt');
  const stand = await p.evaluate(() => JSON.parse(localStorage.getItem('bn-ueben')));
  expect(Object.values(stand).every((k) => k.kasten >= 4), `Sitzt setzt nicht auf Kasten 4/5: ${JSON.stringify(stand)}`);
  const f = await p.evaluate(() => JSON.parse(localStorage.getItem('bn-fortschritt-jan-frederic-overbeck')));
  expect(Object.values(f).flat().filter((e) => e.quelle === 'ueben').length >= 3, `Übe-Modus fehlt im Verlauf: ${JSON.stringify(f)}`);
  // Tagesziel erreicht – der Übe-Modus geht trotzdem, aus der Übersicht und zurück dorthin
  await p.go('/backstage/');
  expect((await p.locator('app-backstage .ueben-karte').innerText()).includes('Tagesziel geschafft'), 'Tagesziel nicht als geschafft gemeldet');
  await p.locator('app-backstage .ueben-reihe a.modus').click();
  await schritt('Übe-Modus öffnet trotz Tagesziel', () => noten.locator('header .wertung.sitzt').waitFor({ timeout: 20000 }));
  // Herunterwischen (Kopfleiste da, Blatt oben): Notenansicht gleitet heraus, Titelanzeige mit demselben Umschalter
  const ziehen = async (vonY, nachY) => {
    await p.waitForTimeout(400); // Ein-/Ausgleiten abwarten
    await p.mouse.move(400, vonY);
    await p.mouse.down();
    await p.mouse.move(400, (vonY + nachY) / 2, { steps: 4 });
    await p.mouse.move(400, nachY, { steps: 4 });
    await p.mouse.up();
  };
  await ziehen(300, 600);
  await until(async () => (await noten.count()) === 0, 'Herunterwischen führt nicht zur Titelanzeige');
  const titel = p.locator('app-setlist-buehne');
  expect((await titel.locator('.ueben-status app-status-schalter button').count()) === 5, 'Titelanzeige im Übe-Modus ohne Status-Umschalter');
  expect((await titel.locator('header .lupe').count()) === 0, 'Wunsch-Suche gehört nicht in den Übe-Modus');
  expect((await titel.locator('header .liste-knopf').count()) === 1, 'Song-Liste fehlt im Übe-Modus');
  // Tempo-Training: Klick startet bei 70 %, „Sitzt“ erst bei vollem Tempo
  if (await titel.locator('button.bpm').count()) {
    await titel.locator('button.bpm').click();
    await until(async () => (await titel.locator('button.tempo').innerText().catch(() => '')).includes('70 %'), 'Tempo-Training startet nicht bei 70 %');
    expect(await titel.locator('.ueben-status button[aria-label="Sitzt"]').isDisabled(), '„Sitzt“ ist unter 100 % wählbar');
    for (let i = 0; i < 3; i++) await titel.locator('button.tempo').click();
    await until(async () => !(await titel.locator('.ueben-status button[aria-label="Sitzt"]').isDisabled()), '„Sitzt“ bei 100 % nicht wählbar');
    await titel.locator('button.bpm').click();
  }
  // Hochwischen: Notenansicht wieder herein
  await ziehen(600, 250);
  await schritt('Hochwischen holt die Notenansicht', () => noten.locator('header .wertung.sitzt').waitFor({ timeout: 5000 }));
  for (let i = 0; i < 6 && (await noten.count()); i++) {
    await noten.locator('header .wertung.sitzt').click().catch(() => {});
    await p.waitForTimeout(300);
    await weiter().catch(() => {});
    await p.waitForTimeout(300);
  }
  await until(async () => new URL(p.url()).pathname.replace(/\/$/, '') === '/backstage', () => `Übe-Modus endet nicht in der Übersicht: ${p.url()}`);
  // mit der Band geteilt: Übe-Statistik unter Bühnenreife
  expect((await p.evaluate(() => JSON.parse(localStorage.getItem('bn-kasten-jan-frederic-overbeck') ?? '{}').v)) === 2, 'Karteikasten wird nicht mit der Band geteilt');
  await p.go('/backstage/songs/reife/');
  await until(async () => (await p.locator('app-songs-reife .person.ich .kasten span').count()) === 5, 'Übe-Statistik (Karteikasten) fehlt unter Bühnenreife');
  return p;
});
test('Backstage: Anleitung – Links oben in der Übersicht, drei Modi im Vergleich', async () => {
  const p = await page();
  await p.go('/backstage/');
  await p.locator('app-backstage app-doku-link a', { hasText: 'Übe-, Probe- und Bühnen-Modus' }).click();
  await until(async () => new URL(p.url()).pathname.replace(/\/$/, '') === '/backstage/anleitung/modi', () => `Anleitung öffnet nicht: ${p.url()}`);
  const seite = p.locator('app-backstage-anleitung');
  expect((await seite.locator('.vergleich thead th').allTextContents()).join('|').includes('Bühnen-Modus|Probe-Modus|Übe-Modus'), 'Vergleichstabelle fehlt');
  expect((await seite.locator('.status li').count()) === 5, 'die fünf Übe-Status fehlen');
  expect((await seite.locator('.begriffe dt').allInnerTexts()).includes('Akkordblatt'), 'Begriffe fehlen');
  await seite.locator('.alle a').click();
  await until(async () => (await p.locator('app-backstage-anleitungen .themen a').count()) >= 20, 'Alle Anleitungen fehlen');
  return p;
});

test('Backstage: jede Unterseite hat oben ihre Anleitung, und die Anleitung öffnet', async () => {
  const p = await page();
  const seiten = [
    ['/backstage/termine/', 'Termine'], ['/backstage/termine/saison/', 'Saison'], ['/backstage/termine/kontakte/', 'Kontakte'],
    ['/backstage/songs/', 'Songs'], ['/backstage/songs/setlists/', 'Setlists'], ['/backstage/songs/sammlungen/', 'Sammlungen'],
    ['/backstage/songs/noten/', 'Noten'], ['/backstage/songs/reife/', 'Bühnenreife'], ['/backstage/ueben/', 'Üben'],
    ['/backstage/aufgaben/', 'Aufgaben'], ['/backstage/buehnenplan/', 'Technik'], ['/backstage/material/', 'Material'],
    ['/backstage/uebersetzungen/', 'Sprachen'], ['/backstage/zahlen/', 'Zahlen'], ['/backstage/abgleich/', 'Abgleich'],
    ['/backstage/einstellungen/', 'Einstellungen'], ['/backstage/einrichtung/', 'Einrichtung'],
  ];
  for (const [pfad, titel] of seiten) {
    await p.go(pfad);
    const link = p.locator('app-doku-link a').first();
    await until(async () => (await link.innerText().catch(() => '')).includes(`Anleitung: ${titel}`), async () => `${pfad}: kein Link „Anleitung: ${titel}“ oben (${await link.innerText().catch(() => '–')})`);
    // oben: vor allem anderen Inhalt der Seite, direkt unter der Überschrift
    const oben = await p.evaluate(() => {
      const l = document.querySelector('app-doku-link');
      const h = l?.closest('section')?.querySelector('h2');
      return !!l && !!h && (h.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 && l.getBoundingClientRect().top - h.getBoundingClientRect().bottom < 120;
    });
    expect(oben, `${pfad}: Anleitung steht nicht oben unter der Überschrift`);
  }
  // eine Anleitung öffnen: Abschnitte, „Zur Seite“, „Siehe auch“
  await p.go('/backstage/termine/');
  await p.locator('app-doku-link a').first().click();
  const doku = p.locator('app-backstage-doku');
  await until(async () => (await doku.locator('h3').count()) >= 3, async () => `Anleitung Termine ohne Abschnitte: ${p.url()}`);
  expect(/Siehe auch/i.test(await doku.innerText()), 'Siehe auch fehlt');
  expect((await p.title()).startsWith('Anleitung: Termine'), `Seitentitel: ${await p.title()}`);
  await doku.locator('.wege a', { hasText: 'Zur Seite' }).click();
  await until(async () => new URL(p.url()).pathname.replace(/\/$/, '') === '/backstage/termine', 'Zur Seite führt nicht zurück');
  // unbekanntes Thema
  await p.go('/backstage/anleitung/gibtsnicht/');
  await until(async () => /Anleitung nicht gefunden/i.test(await p.locator('app-backstage-doku').innerText().catch(() => '')), 'unbekanntes Thema ohne Hinweis');
  return p;
});

test('Backstage: Besucher-Verlauf mit Zeitlinie und Ereignissen', async () => {
  const p = await page();
  await p.context().route(/goatcounter\.com\/counter\//, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"count":"12"}' }));
  await p.go('/backstage/zahlen/');
  const verlauf = p.locator('app-besucher-verlauf');
  await verlauf.waitFor();
  expect((await verlauf.locator('.einheiten button[aria-pressed=true]').innerText()).trim() === 'Monat', 'Standard ist nicht Monat');
  await until(async () => (await verlauf.locator('path.balken').count()) === 12, 'keine 12 Monatsbalken');
  await verlauf.locator('.einheiten button', { hasText: 'Woche' }).click();
  await until(async () => (await verlauf.locator('path.balken').count()) === 16, 'keine 16 Wochenbalken');
  await verlauf.locator('.einheiten button', { hasText: 'Jahr' }).click();
  await until(async () => (await verlauf.locator('.m-auftritt').count()) > 1, 'keine Auftritte auf der Zeitlinie');
  // Wirkung der Werbemaßnahmen: auf Knopfdruck je Maßnahme vorher/danach
  await verlauf.getByRole('button', { name: 'Wirkung berechnen' }).click();
  await until(async () => (await verlauf.locator('.wirkung').innerText()).includes('Am meisten gebracht'), 'Wirkung der Werbemaßnahmen fehlt');
  return p;
});

test('Backstage: Setlist als Link – ein zweites Gerät übernimmt sie', async () => {
  const id = concerts[concerts.length - 1].split('/')[2];
  const p = await page({ permissions: ['clipboard-read', 'clipboard-write'] });
  await p.go(`/backstage/${id}/setlist`);
  await p.locator('app-setlist .pick .listen-chips button', { hasText: 'Alle' }).click();
  const add = p.locator('app-setlist .pick li button');
  const songs = (x) => x.locator('app-setlist .list li .no').count();
  // nach jedem Klick warten, bis die Liste nachgezogen hat – sonst trifft der nächste Klick denselben Song
  for (let i = 1; i <= 4; i++) {
    if (i === 4) await p.locator('app-setlist button', { hasText: 'Pause einfügen' }).click();
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
}, { allein: true });

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
  // vorgefüllt: Überschrift mit Ort, Text-Entwurf mit Datum
  expect((await p.locator('app-rueckblick-formular input[maxlength="100"]').inputValue()).length > 0, 'Überschrift nicht vorgefüllt');
  await until(async () => (await p.locator('app-rueckblick-formular textarea').inputValue()).startsWith('Am '), 'Text-Entwurf fehlt');
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
  // einzelne Songs erst nach Wahl einer Liste (oder Suche) – die Setlist bleibt übersichtlich
  expect((await p.locator('app-setlist .pick li button').count()) === 0, 'Songliste ist ohne Suche oder Liste sichtbar');
  await p.locator('app-setlist .pick .listen-chips button', { hasText: 'Alle' }).click();
  const add = p.locator('app-setlist .pick li button');
  // nach jedem Klick warten, bis die Setlist nachgezogen hat
  const nummern = () => p.locator('app-setlist .list li .no').count();
  for (let i = 1; i <= 5; i++) {
    if (i === 5) await schritt('Pause einfügen', () => p.locator('app-setlist button', { hasText: 'Pause einfügen' }).click());
    await schritt(`Song ${i} hinzufügen`, () => add.first().click());
    await until(async () => (await nummern()) === i, `Song ${i} nicht hinzugefügt`);
  }
  await until(async () => /\d+ min/.test(await p.locator('app-setlist .count').innerText()), 'keine Spieldauer in der Setlist');
  expect((await p.locator('app-setlist .pause-label').innerText()).includes('Set davor'), 'Pause ohne Set-Dauer');
  await p.locator('app-setlist-sammlungen button', { hasText: 'Als Sammlung speichern' }).click();
  // neben der festen Sammlung „Weihnachtslieder“ die eben gespeicherte
  await until(async () => (await p.locator('app-setlist-sammlungen option').allInnerTexts()).some((t) => t.startsWith('Testvorlage · 5 Songs')), 'Sammlung nicht gespeichert');
  await p.locator('app-setlist-vorschlag button', { hasText: 'vorschlagen' }).click();
  await until(async () => (await p.locator('app-setlist .pause-label').count()) === 1 && (await p.locator('app-setlist .list li .no').count()) > 10, 'Setlist-Vorschlag ohne zwei Sets');
  // Pausen nach Wunsch-Länge: kurze Sets → mehr Pausen; die Songs bleiben
  const songsVorher = await p.locator('app-setlist .list li .no').count();
  await p.locator('app-setlist .pausen input').fill('20');
  await p.locator('app-setlist .pausen input').blur();
  await p.locator('app-setlist .pausen button', { hasText: 'Pausen neu setzen' }).click();
  await until(async () => (await p.locator('app-setlist .pause-label').count()) >= 2, 'Pausen werden nicht nach der Set-Länge gesetzt');
  expect((await p.locator('app-setlist .list li .no').count()) === songsVorher, 'Pausen neu setzen verändert die Songs');
  expect(/\d+ Sets: /.test(await p.locator('app-setlist .pausen .meldung').innerText()), 'Set-Längen werden nicht gemeldet');
  await p.locator('app-setlist .pausen input').fill('120');
  await p.locator('app-setlist .pausen input').blur();
  await p.locator('app-setlist .pausen button', { hasText: 'Pausen neu setzen' }).click();
  await until(async () => (await p.locator('app-setlist .pause-label').count()) <= 1, 'Längere Sets verringern die Pausen nicht');
  await p.locator('app-setlist-vorschlag button', { hasText: 'vorschlagen' }).click();
  await until(async () => (await p.locator('app-setlist .pause-label').count()) === 1, 'Setlist-Vorschlag ohne zwei Sets');
  await schritt('Bühnen-Modus öffnen', () => p.getByRole('button', { name: /Bühnen-Modus/ }).first().click());
  // der Bühnen-Modus wird erst beim Öffnen nachgeladen (@defer) – auf einem ausgelasteten Rechner dauert das
  await schritt('Sterne im Bühnen-Modus', () => p.getByRole('button', { name: '4 Sterne' }).click({ timeout: 20000 }));
  await p.keyboard.press('Escape');
  await p.go('/backstage/zahlen');
  await until(async () => (await p.locator('app-song-rangliste .top li').count()) === 1, 'Sterne aus dem Bühnen-Modus fehlen in der Rangliste');
  await p.go(`/backstage/${id}`);
  const [win] = await schritt('Laufzettel öffnen', () => Promise.all([p.context().waitForEvent('page', { timeout: 20000 }), p.locator('button', { hasText: 'Laufzettel' }).click({ timeout: 20000 })]));
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
  // der Bühnen-Modus wird erst beim Öffnen nachgeladen (@defer) – kurz warten
  await until(async () => ((await p.locator('app-setlist-buehne main').innerText().catch(() => '')) ?? '').includes('Schluss zweimal'), 'Notiz nicht im Bühnen-Modus');
  await p.getByRole('button', { name: 'Einzählen' }).click();
  await until(async () => (await p.locator('app-setlist-buehne .einzaehlen').count()) === 1, 'Einzählen zeigt nichts');
  await until(async () => (await p.locator('app-setlist-buehne .einzaehlen').count()) === 0, 'Einzählen hört nicht auf');
  await p.keyboard.press('Escape');
  // Taktart des Songs: im 3/4-Takt „1-2-3 · 1-2-3“ – nie bis 4; Klick zeigt den Takt
  const titel = (await p.locator('app-setlist .list li .t').first().innerText()).trim();
  const interpret = (await p.locator('app-setlist .list li .a').first().innerText()).trim();
  await p.evaluate(([k]) => localStorage.setItem('bn-songinfo-entwurf', JSON.stringify({ [k]: { bpm: 180, takt: '3/4' } })), [`${titel}|${interpret}`]);
  await p.reload({ waitUntil: 'networkidle' });
  await p.getByRole('button', { name: /Bühnen-Modus/ }).first().click();
  const zaehlKnopf = p.getByRole('button', { name: 'Einzählen 3/4' });
  await until(async () => (await zaehlKnopf.innerText().catch(() => '')).trim() === '1-2-3 · 1-2-3', 'Einzähl-Knopf zeigt den 3/4-Takt nicht');
  expect((await p.locator('app-setlist-buehne button.bpm').innerText()).includes('3/4'), 'Klick-Knopf zeigt den Takt nicht');
  const gezaehlt = new Set();
  await zaehlKnopf.click();
  for (let i = 0; i < 40 && (gezaehlt.size === 0 || (await p.locator('app-setlist-buehne .einzaehlen').count())); i++) {
    const z = (await p.locator('app-setlist-buehne .einzaehlen').innerText().catch(() => '')).trim();
    if (z) gezaehlt.add(z);
    await p.waitForTimeout(50);
  }
  expect([...gezaehlt].sort().join() === '1,2,3', `Im 3/4-Takt gezählt: ${[...gezaehlt].join(',')}`);
  await p.keyboard.press('Escape');
  // Seite des Auftritts: Setlist steht, Vor-Ort-Angaben fehlen noch
  await p.go(`/backstage/${id}`);
  const bereit = p.locator('app-bereitschaft');
  expect(await bereit.locator('li.ok', { hasText: 'Setlist steht' }).count(), '„Setlist steht“ nicht abgehakt');
  expect((await bereit.locator('li:not(.ok)', { hasText: 'Vor Ort geklärt' }).innerText()).includes('Ansprechpartner'), 'fehlende Vor-Ort-Angaben nicht gemeldet');
  await p.go('/backstage/aufgaben/');
  expect((await p.locator('app-bereitschaft summary').first().innerText()).includes('bereit'), 'kein „Bereit?“ für den nächsten Auftritt unter Aufgaben');
  return p;
});

test('Backstage: Übe-Status „Wackelt noch“ und Proben-Mitschnitt im Song, Nachbereitung mit Merkpunkten', async () => {
  const p = await page({ permissions: ['microphone'] });
  await p.go('/backstage/');
  await p.evaluate(() => localStorage.setItem('bn-ich', 'jan-frederic-overbeck'));
  await p.go('/backstage/songs/');
  await p.locator('app-backstage-songs input[type=search]').fill('Millionen');
  await p.locator('app-backstage-songs tbody tr .oeffnen').first().click();
  const dialog = p.locator('app-song-dialog dialog[open]');
  await dialog.locator('header select').selectOption('wackelt');
  await until(async () => (await dialog.locator('header select').getAttribute('class'))?.includes('wackelt'), '„Wackelt noch“ lässt sich nicht setzen');
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
  // gleiche Antwort über den genauen Status; Gruppen im Filter
  await p.locator('select.zeigen').selectOption('status:wackelt');
  await until(async () => (await p.locator('app-backstage-songs tbody tr').count()) === 1, 'Filter „Mein Übe-Status: Wackelt noch“ zeigt nicht genau den Song');
  expect((await p.locator('select.zeigen optgroup').evaluateAll((g) => g.map((x) => x.getAttribute('label')))).join('|') === 'Tonart und Tempo|Noten (auf diesem Gerät)|Mein Übe-Status|Bühnenreife der Band|Live gespielt', 'Filtergruppen fehlen');
  await p.locator('select.zeigen').selectOption('wackelt');
  // Probe-Vorschlag nimmt den Song zuerst
  await p.go('/backstage/termine/');
  await p.locator('a.row-link', { hasText: 'Probe' }).first().click();
  await p.locator('app-backstage-probe details.vorschlaege summary').click();
  await until(async () => /wackelt bei Fred/.test(await p.locator('app-probe-vorschlag li').first().innerText()), 'Probe-Vorschlag ohne „wackelt bei Fred“');
  // Abgleich: Mitschnitte zählen mit
  await p.go('/backstage/abgleich/');
  await until(async () => (await p.locator('app-backstage-daten summary', { hasText: 'Proben-Mitschnitte' }).innerText().catch(() => '')).includes('1 ·'), 'Mitschnitt fehlt unter Daten auf diesem Gerät');

  // Nachbereitung eines vergangenen Auftritts
  const id = '2026-08-22';
  await p.go(`/backstage/${id}/setlist`);
  await p.locator('app-setlist .pick .listen-chips button', { hasText: 'Alle' }).click();
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
  await until(async () => (await p.locator('app-rueckblick-formular textarea').first().inputValue()).includes('Alle haben mitgesungen'), '„Was lief gut“ nicht in den Rückblick-Entwurf übernommen');
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
  for (const f of ['/konzerte.ics', '/en/konzerte.ics', '/nl/konzerte.ics', '/backstage/kalender.ics', '/sw.js', '/site.webmanifest', '/badge-96.png', '/icon-maskable-512.png']) {
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
// NUR="Teil des Namens" (mehrere mit |): nur diese Tests – zum schnellen Nachprüfen einer Änderung
const filter = (process.env.NUR ?? '').split('|').map((x) => x.trim()).filter(Boolean);
const auswahl = tests.filter((x) => !filter.length || filter.some((f) => x.name.includes(f)));
if (filter.length && !auswahl.length) {
  console.log(`::error::Kein Klicktest passt zu NUR="${process.env.NUR}"`);
  failed++;
}
// Parallel in mehreren Browser-Tabs (eigene Kontexte, leerer Speicher je Test): PARALLEL=n (Standard 3, 1 = nacheinander).
// Tests mit { allein: true } (zeitkritisch, z. B. Tap-Tempo) laufen danach einzeln, damit Last sie nicht verfälscht.
const PARALLEL = Math.max(1, Number(process.env.PARALLEL ?? 3) || 1);
async function lauf(t) {
  const start = Date.now();
  let p;
  try {
    p = await t.fn();
    if (p?.errors?.length) throw new Error('JavaScript-Fehler: ' + p.errors[0]);
    console.log(`✓ ${t.name} (${((Date.now() - start) / 1000).toFixed(1)} s)`);
  } catch (e) {
    failed++;
    console.log(`::error::✗ ${t.name}: ${e.message.split("\n")[0]}`); if (process.env.STACK) console.log(e.stack);
  } finally {
    // Kontext des Tests schließen – sonst wachsen Speicher und CPU-Last mit jedem Test
    await p?.context?.().close().catch(() => {});
  }
}
const gesamtStart = Date.now();
const warteschlange = auswahl.filter((t) => !t.options.allein);
await Promise.all(Array.from({ length: Math.min(PARALLEL, warteschlange.length) }, async () => {
  for (let t = warteschlange.shift(); t; t = warteschlange.shift()) await lauf(t);
}));
for (const t of auswahl.filter((x) => x.options.allein)) await lauf(t);
console.log(`Laufzeit: ${((Date.now() - gesamtStart) / 1000).toFixed(0)} s (${PARALLEL} parallel)`);
await browser.close();
close();
console.log(`Klicktests: ${auswahl.length - failed} von ${auswahl.length} bestanden${filter.length ? ` (Auswahl NUR, insgesamt ${tests.length})` : ''}.`);
process.exit(failed ? 1 : 0);
