#!/usr/bin/env node
// Liefert den fertigen Build wie GitHub Pages aus – für den Screenshot-Vergleich (playwright.config.mjs)
// Aufruf: node scripts/serve-dist.mjs [port]
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './lib/static-server.mjs';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'blickfeld-nord', 'browser');
const { base } = serve(dist, Number(process.argv[2] ?? 4173));
console.log(`Build unter ${base}`);
