// Prüft, dass jeder im Code verwendete localStorage-Schlüssel „bn-…“ unter Abgleich → Daten auf diesem Gerät
// verständlich benannt ist (data/aufraeumen.ts: Bereich mit eigenem Präfix oder Eintrag in EINSTELLUNGEN) – sonst
// erscheint dort nur der technische Name. Namen von IndexedDB-Datenbanken, sessionStorage und Caches stehen in AUSNAHMEN.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const AUSNAHMEN = new Set([
  'bn-ordner', 'bn-mitschnitte', 'bn-sync', 'bn-noten', // IndexedDB
  'bn-modus-sitzung', 'bn-herkunft', 'bn-bald-zu', // sessionStorage
]);
const BESCHREIBER = ['bn-fortschritt-', 'bn-kasten-', 'bn-probenotiz-', 'bn-unsicher-', 'bn-zusage-'];

const quelle = readFileSync('src/app/data/aufraeumen.ts', 'utf8');
const bereiche = [...quelle.matchAll(/\{\s*id: '([a-z]+)'[\s\S]*?praefixe: \[([^\]]*)\]/g)].map((m) => ({ id: m[1], praefixe: [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]) }));
const eigene = bereiche.filter((b) => b.id !== 'einstellungen').flatMap((b) => b.praefixe);
const allgemein = bereiche.find((b) => b.id === 'einstellungen')?.praefixe ?? [];
const einstellungen = new Set([...quelle.slice(quelle.indexOf('const EINSTELLUNGEN')).matchAll(/^\s*'(bn-[^']+)':/gm)].map((m) => m[1]));

const dateien = [];
const sammeln = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) sammeln(p);
    else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) dateien.push(p);
  }
};
sammeln('src/app');

const fehlt = new Map();
for (const p of dateien) {
  for (const [, k] of readFileSync(p, 'utf8').matchAll(/['`](bn-[a-z0-9-]+)['`$]/g)) {
    if (AUSNAHMEN.has(k) || einstellungen.has(k)) continue;
    if ([...eigene, ...BESCHREIBER].some((x) => k.startsWith(x))) continue;
    if (k.endsWith('-') && allgemein.includes(k)) continue; // nur ein Präfix
    if (/^bn-[0-9a-f]+$/.test(k)) continue;
    fehlt.set(k, p);
  }
}
if (fehlt.size) {
  console.error(`Schlüssel ohne Beschriftung (in src/app/data/aufraeumen.ts unter EINSTELLUNGEN oder als Bereich ergänzen):`);
  for (const [k, p] of fehlt) console.error(`  ${k}  (${p})`);
  process.exit(1);
}
console.log(`Schlüssel: alle ${dateien.length} Dateien geprüft, jeder Schlüssel ist beschriftet.`);
