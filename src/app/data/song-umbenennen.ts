import { songNoten, songNotenSetzen } from './noten';
import { mitschnitteUmbenennen } from './mitschnitte';

// Eigenständigen Song umbenennen (Titel/Band, wenn der Dateiname es nicht hergab): alles, was am Schlüssel
// „Titel|Interpret“ hängt, zieht mit – Noten, Mitschnitte und in allen Backstage-Einträgen (localStorage „bn-…“)
// Setlists, Proben, Entwurf von Tonart/Tempo, „Wackelt noch“ usw.

type Song = { title: string; artist: string };

/** in einem gespeicherten Wert: Einträge {title, artist} und Schlüssel „Titel|Interpret“ ersetzen */
export function wertUmbenennen(wert: unknown, alt: Song, neu: Song): unknown {
  const altKey = `${alt.title}|${alt.artist}`;
  const neuKey = `${neu.title}|${neu.artist}`;
  const gehen = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(gehen);
    if (typeof x === 'string') return x === altKey ? neuKey : x;
    if (!x || typeof x !== 'object') return x;
    const o = x as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) out[k === altKey ? neuKey : k] = gehen(v);
    if (o['title'] === alt.title && o['artist'] === alt.artist) Object.assign(out, { title: neu.title, artist: neu.artist });
    return out;
  };
  return gehen(wert);
}

export async function songUmbenennen(alt: Song, neu: Song): Promise<number> {
  const altKey = `${alt.title}|${alt.artist}`;
  const neuKey = `${neu.title}|${neu.artist}`;
  if (altKey === neuKey) return 0;
  let n = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (!k.startsWith('bn-')) continue;
    const roh = localStorage.getItem(k) ?? '';
    if (!roh.includes(alt.title)) continue;
    try {
      const neuText = JSON.stringify(wertUmbenennen(JSON.parse(roh), alt, neu));
      if (neuText !== roh) {
        localStorage.setItem(k, neuText);
        n++;
      }
    } catch {
      // kein JSON – bleibt
    }
  }
  const noten = await songNoten(altKey);
  if (noten) {
    const ziel = (await songNoten(neuKey)) ?? {};
    await songNotenSetzen(neuKey, { ...noten, ...ziel, pdfs: [...(ziel.pdfs ?? []), ...(noten.pdfs ?? [])], chordpro: ziel.chordpro ?? noten.chordpro });
    await songNotenSetzen(altKey, {});
  }
  await mitschnitteUmbenennen(altKey, neuKey).catch(() => undefined);
  return n;
}
