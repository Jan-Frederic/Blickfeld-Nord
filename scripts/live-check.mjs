#!/usr/bin/env node
// Check der echten Website (nicht des Builds): ruft blickfeld-nord.de so auf, wie Besucher sie sehen.
//  - jede Seite aus der sitemap.xml antwortet mit 200 und ist eine Seite der Band (Titel, App)
//  - Downloads und Dateien, auf die die Seiten verweisen (PDFs, Kalender, Bilder, Skripte), sind erreichbar
//  - Service Worker, Manifest und Backstage sind da, unbekannte Adressen liefern die 404-Seite
//  - der letzte Deploy ist höchstens 3 Tage alt (täglich um 04:17 UTC wird neu gebaut – sonst hängt etwas)
// Probleme landen mit --bericht <datei> als Markdown-Liste in der Datei (für das wöchentliche Issue).
// Lokal: node scripts/live-check.mjs [--basis http://localhost:4200]
import { writeFileSync } from 'node:fs';

const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);
const BASIS = (arg('--basis') ?? 'https://blickfeld-nord.de').replace(/\/$/, '');
const bericht = arg('--bericht');
const probleme = [];

async function holen(url, { methode = 'GET', versuche = 2 } = {}) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { method: methode, redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'blickfeld-nord-live-check' } });
      return { status: res.status, text: methode === 'GET' ? await res.text() : '', headers: res.headers };
    } catch (e) {
      if (i >= versuche) return { status: 0, text: '', fehler: e.message, headers: new Headers() };
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

// mehrere Abrufe gleichzeitig, aber nicht alle auf einmal
async function parallel(liste, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < liste.length) await fn(liste[i++]); }));
}

const pfad = (url) => url.replace(BASIS, '') || '/';

// 1. Seiten aus der Sitemap
const sitemap = await holen(`${BASIS}/sitemap.xml`);
const seiten = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace('https://blickfeld-nord.de', BASIS));
if (sitemap.status !== 200 || !seiten.length) probleme.push(`sitemap.xml nicht lesbar (Status ${sitemap.status})`);

const dateien = new Set();
await parallel(seiten, 6, async (url) => {
  const r = await holen(url);
  if (r.status !== 200) return probleme.push(`Seite ${pfad(url)}: Status ${r.status || r.fehler}`);
  if (!/<title>[^<]*Blickfeld Nord/i.test(r.text) || !r.text.includes('<app-root')) return probleme.push(`Seite ${pfad(url)}: sieht nicht nach unserer Seite aus (Titel oder App fehlt)`);
  // Dateien, auf die die Seite verweist (eigene Adresse): Downloads, Kalender, Bilder, Skripte, Styles
  // (Pfade ohne führenden „/“ gelten ab der Wurzel – die Seiten haben <base href="/">)
  for (const m of r.text.matchAll(/(?:href|src)="(?![a-z]+:|\/\/|#)\/?([^"#?]+\.(?:pdf|ics|webp|jpe?g|png|svg|js|css|webmanifest))"/g)) dateien.add('/' + m[1]);
});

// 2. Dateien – einmal je Adresse, nur der Kopf
await parallel([...dateien], 8, async (p) => {
  const r = await holen(BASIS + p, { methode: 'HEAD' });
  if (r.status !== 200) probleme.push(`Datei ${p}: Status ${r.status || r.fehler}`);
});

// 3. Feste Adressen
for (const [p, erwartet] of [['/sw.js', 200], ['/site.webmanifest', 200], ['/backstage/', 200], ['/robots.txt', 200], ['/gibt-es-nicht-live-check', 404]]) {
  const r = await holen(BASIS + p);
  if (r.status !== erwartet) probleme.push(`${p}: Status ${r.status || r.fehler} statt ${erwartet}`);
}

// 4. Stand des Deploys
const start = await holen(`${BASIS}/`, { methode: 'HEAD' });
const geaendert = Date.parse(start.headers.get('last-modified') ?? '');
if (geaendert) {
  const tage = (Date.now() - geaendert) / 864e5;
  if (tage > 3) probleme.push(`Letzter Deploy ist ${Math.floor(tage)} Tage alt – der tägliche Deploy läuft offenbar nicht (Actions → Deploy to GitHub Pages)`);
}

console.log(`Live-Check ${BASIS}: ${seiten.length} Seiten, ${dateien.size} Dateien geprüft – ${probleme.length ? probleme.length + ' Probleme' : 'alles erreichbar'}.`);
for (const p of probleme) console.log(`  ✗ ${p}`);
if (bericht) writeFileSync(bericht, probleme.map((p) => `- ${p}`).join('\n') + (probleme.length ? '\n' : ''));
if (!bericht && probleme.length) process.exit(1);
