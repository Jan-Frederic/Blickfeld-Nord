// App-Stand: Kennung der laufenden Version (die ersten 8 Zeichen der Service-Worker-Version, scripts/build-sw.mjs) –
// für Rückfragen, die Diagnose und die Geräteliste („veraltet“). Ohne Angular-Abhängigkeiten.

const kurz = (v: string) => v.slice(0, 8);

/** Version, mit der der Service Worker diese Seite ausliefert; sonst aus dem Speicher „bn-<Version>“; '' = unbekannt */
export async function appStand(): Promise<string> {
  const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker?.controller : null;
  if (sw) {
    const antwort = await new Promise<string>((ok) => {
      const kanal = new MessageChannel();
      const zeit = setTimeout(() => ok(''), 1000);
      kanal.port1.onmessage = (e) => {
        clearTimeout(zeit);
        ok(typeof e.data === 'string' ? e.data : '');
      };
      sw.postMessage('app-stand', [kanal.port2]);
    });
    if (/^[0-9a-f]{6,}$/.test(antwort)) return kurz(antwort);
  }
  if (typeof caches === 'undefined') return '';
  const namen = (await caches.keys().catch(() => [] as string[])).filter((n) => /^bn-[0-9a-f]{6,}$/.test(n));
  // nur eindeutig: mitten in einem Update gibt es kurz zwei
  return namen.length === 1 ? kurz(namen[0].slice(3)) : '';
}

/** veröffentlichte Version (aus /sw.js, am Browser-Cache vorbei); '' = offline oder unbekannt */
export async function neuesterStand(laden: typeof fetch = fetch): Promise<string> {
  try {
    const text = await (await laden('/sw.js', { cache: 'no-store' })).text();
    const v = /const VERSION = '([0-9a-f]{6,})'/.exec(text)?.[1];
    return v ? kurz(v) : '';
  } catch {
    return '';
  }
}

/** Vergleich für die Geräteliste: aktuell, veraltet oder unbekannt (Gerät meldet noch keinen bzw. nichts veröffentlicht bekannt) */
export function standVergleich(geraet: string | undefined, neuester: string): 'aktuell' | 'veraltet' | 'unbekannt' {
  if (!geraet || !neuester) return 'unbekannt';
  return geraet === neuester ? 'aktuell' : 'veraltet';
}
