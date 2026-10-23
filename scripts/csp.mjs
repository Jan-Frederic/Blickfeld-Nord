#!/usr/bin/env node
// Content-Security-Policy für alle Seiten des Builds (als <meta>, GitHub Pages erlaubt keine eigenen Header).
// Erlaubt nur, was die Seite wirklich braucht: eigene Dateien, GoatCounter (Statistik), open-meteo (Wetter im
// Backstage), Instagram (eingebettete Beiträge/Reels, erst nach Klick) und GitHub-Rohdateien (Backstage erzeugt
// Dateien für GitHub). Inline-Skripte nur mit Prüfsumme – jede Seite bekommt genau die Hashes ihrer eigenen Skripte.
// Aufruf ganz am Ende des Builds (nach seo.mjs und SPA-Fallback):  node scripts/csp.mjs
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'blickfeld-nord', 'browser');
const sha = (s) => `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`;

const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.html') ? [p] : [];
  });

let pages = 0;
for (const file of files(DIST)) {
  let html = readFileSync(file, 'utf8').replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '');
  // ausführbare Inline-Skripte (ohne src, kein JSON) und Inline-Event-Handler wie onload="this.media='all'"
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/(?:ld\+)?json")[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const handlers = [...html.matchAll(/\son[a-z]+="([^"]*)"/g)].map((m) => m[1].replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
  const hashes = [...new Set([...scripts, ...handlers].map(sha))];
  const policy = [
    "default-src 'self'",
    `script-src 'self' https://gc.zgo.at ${handlers.length ? "'unsafe-hashes' " : ''}${hashes.join(' ')}`.trim(),
    // Angular-Komponenten bringen ihre Styles als <style> mit
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://gc.zgo.at https://blickfeld-nord.goatcounter.com",
    "font-src 'self' data:",
    "connect-src 'self' https://blickfeld-nord.goatcounter.com https://api.open-meteo.com https://raw.githubusercontent.com",
    'frame-src https://www.instagram.com',
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  html = html.replace(/<head>/, `<head><meta http-equiv="Content-Security-Policy" content="${policy}">`);
  writeFileSync(file, html);
  pages++;
}
console.log(`Content-Security-Policy in ${pages} Seiten gesetzt.`);
