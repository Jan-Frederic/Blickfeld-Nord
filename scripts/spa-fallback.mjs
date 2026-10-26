#!/usr/bin/env node
// SPA-Fallback für GitHub Pages – derselbe Schritt in CI und bei der Prüfung auf dem eigenen Rechner.
// Öffentliche Seiten sind vorgerendert (eigene index.html je Route). Unbekannte Pfade bekommen die vorgerenderte
// Fehlerseite (404.html), die Backstage die clientseitige Shell (backstage/index.html).
// Backstage-Unterseiten (/backstage/<id>[/<teil>]) haben keine eigene Datei: Die Fehlerseite leitet sie zur
// Backstage-Shell weiter (/backstage/?auftritt=<id>[&teil=<teil>]), der Teil hinter „#“ (z. B. eine geteilte
// Setlist) bleibt erhalten. Die Shell navigiert dann zur eigentlichen Unterseite.
// Aufruf nach ng build und seo.mjs, vor csp.mjs:  node scripts/spa-fallback.mjs
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'blickfeld-nord', 'browser');

const WEITERLEITUNG =
  '<script>var p=location.pathname.split("/");if(p[1]=="backstage")if(p[2])' +
  'location.replace("/backstage/?auftritt="+p[2]+(p[3]?"\\x26teil="+p[3]:"")+location.hash)</script>';

copyFileSync(join(DIST, '404', 'index.html'), join(DIST, '404.html'));
mkdirSync(join(DIST, 'backstage'), { recursive: true });
copyFileSync(join(DIST, 'index.csr.html'), join(DIST, 'backstage', 'index.html'));

const datei = join(DIST, '404.html');
writeFileSync(datei, readFileSync(datei, 'utf8').replace('<head>', '<head>' + WEITERLEITUNG));
console.log('SPA-Fallback: 404.html mit Backstage-Weiterleitung, backstage/index.html als Shell.');
