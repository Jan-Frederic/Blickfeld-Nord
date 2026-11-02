// Für Klicktests, Barrierefreiheits-Check und Screenshots: die Testbrowser verhalten sich wie ein Gerät, das schon
// einmal ins Backstage gelassen wurde (Sichtsperre, src/app/data/zugang.ts) – mit der Ordner-Kennung aus
// src/app/data/onedrive-config.ts. Ohne eingetragenen Band-Ordner passiert nichts.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const config = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'app', 'data', 'onedrive-config.ts'), 'utf8');
export const BAND_ORDNER_ITEM = /bandOrdner:\s*\{[^}]*item:\s*'([^']+)'/.exec(config)?.[1] ?? null;

/** im Browser vor jeder Seite: Zugang als „schon geprüft“ merken, falls (noch) nicht da */
export async function zugangFreischalten(context) {
  if (!BAND_ORDNER_ITEM) return;
  await context.addInitScript((item) => {
    try {
      if (!localStorage.getItem('bn-zugang')) localStorage.setItem('bn-zugang', JSON.stringify({ ordner: item, zeit: Date.now() }));
    } catch {
      // ohne Speicher keine Freischaltung
    }
  }, BAND_ORDNER_ITEM);
}
