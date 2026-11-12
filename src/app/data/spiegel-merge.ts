// Zwei Fassungen eines gespiegelten Eintrags zusammenführen – für die Übe-Daten, bei denen beide Seiten etwas
// beitragen können (Karteikasten, geteilter Kasten, Verlauf, Notizen, „unsicher bei“, heute geübt). Genutzt beim ersten
// Abgleich eines neu aufgesetzten Geräts (sync.service.ts) und unter Abgleich → Konflikte („Zusammenführen“).
// Bei Gleichstand gilt die Fassung aus OneDrive („andere“), sonst die mit dem späteren Datum.
// Ohne Angular-Abhängigkeiten, damit es in Node testbar ist.
import { AlleMarken, SPRUNGMARKEN_KEY, markenZusammenfuehren } from './sprungmarken';

type Obj = Record<string, unknown>;
const istObj = (x: unknown): x is Obj => !!x && typeof x === 'object' && !Array.isArray(x);
const lesen = (t: string): unknown => {
  try {
    return JSON.parse(t);
  } catch {
    return undefined;
  }
};
const spaeter = (a?: string, b?: string) => ((a ?? '') > (b ?? '') ? a : b);

/** Karteikasten (bn-ueben): je Song die Karte mit dem späteren „zuletzt“, sonst die andere */
function karten(eigen: Obj, andere: Obj): Obj {
  const out: Obj = { ...eigen };
  for (const [k, v] of Object.entries(andere)) {
    const e = eigen[k] as { zuletzt?: string } | undefined;
    const a = v as { zuletzt?: string };
    out[k] = e && (e.zuletzt ?? '') > (a?.zuletzt ?? '') ? e : v;
  }
  return out;
}

/** geteilter Kasten (bn-kasten-<Person>): Kästen wie beim Karteikasten (nach „zuletzt“ des Ganzen), Eingenordete vereint */
function kasten(eigen: Obj, andere: Obj): Obj {
  const eigenNeuer = (eigen['zuletzt'] as string | undefined ?? '') > (andere['zuletzt'] as string | undefined ?? '');
  const [vorne, hinten] = eigenNeuer ? [eigen, andere] : [andere, eigen];
  const ob = (o: Obj, k: string) => (istObj(o[k]) ? (o[k] as Obj) : {});
  return {
    ...hinten,
    ...vorne,
    v: Math.max(Number(eigen['v']) || 0, Number(andere['v']) || 0) || undefined,
    kaesten: { ...ob(hinten, 'kaesten'), ...ob(vorne, 'kaesten') },
    eingenordet: { ...ob(hinten, 'eingenordet'), ...ob(vorne, 'eingenordet') },
    gelernt: { ...ob(hinten, 'gelernt'), ...ob(vorne, 'gelernt') },
    zuletzt: spaeter(eigen['zuletzt'] as string | undefined, andere['zuletzt'] as string | undefined),
  };
}

/** Verlauf (bn-fortschritt-<Person>): je Song alle Einträge beider Seiten, gleicher Tag und gleiche Quelle nur einmal */
function verlauf(eigen: Obj, andere: Obj): Obj {
  const out: Obj = { ...eigen };
  for (const [k, v] of Object.entries(andere)) {
    const liste = [...(Array.isArray(eigen[k]) ? (eigen[k] as { tag: string; quelle: string }[]) : []), ...(Array.isArray(v) ? (v as { tag: string; quelle: string }[]) : [])];
    const je = new Map<string, unknown>();
    // die andere Seite (später in der Liste) gewinnt bei gleichem Tag und gleicher Quelle
    for (const e of liste) je.set(`${e.tag}|${e.quelle}`, e);
    out[k] = [...je.values()].sort((a, b) => String((a as { tag: string }).tag).localeCompare(String((b as { tag: string }).tag)));
  }
  return out;
}

/** zweistufig vereinen (z. B. Probe-Notizen je Datum und Song), die andere Seite gewinnt */
function tief(eigen: Obj, andere: Obj): Obj {
  const out: Obj = { ...eigen };
  for (const [k, v] of Object.entries(andere)) out[k] = istObj(eigen[k]) && istObj(v) ? { ...(eigen[k] as Obj), ...v } : v;
  return out;
}

/** heute geübt (bn-ueben-heute): am selben Tag die Songs beider Seiten, sonst der spätere Tag */
function heute(eigen: Obj, andere: Obj): Obj {
  if (eigen['tag'] !== andere['tag']) return (eigen['tag'] as string ?? '') > (andere['tag'] as string ?? '') ? eigen : andere;
  const keys = [...new Set([...(Array.isArray(eigen['keys']) ? eigen['keys'] : []), ...(Array.isArray(andere['keys']) ? andere['keys'] : [])])];
  return { ...andere, keys };
}

const REGELN: [(key: string) => boolean, (eigen: Obj, andere: Obj) => Obj][] = [
  [(k) => k === 'bn-ueben', karten],
  [(k) => k === 'bn-ueben-heute', heute],
  [(k) => k.startsWith('bn-kasten-'), kasten],
  [(k) => k.startsWith('bn-fortschritt-'), verlauf],
  [(k) => k.startsWith('bn-probenotiz-'), tief],
  [(k) => k.startsWith('bn-unsicher-'), (e, a) => ({ ...e, ...a })],
  // Sprungmarken der Band: je Spotify-Track die später geänderte Fassung
  [(k) => k === SPRUNGMARKEN_KEY, (e, a) => markenZusammenfuehren(e as AlleMarken, a as AlleMarken) as Obj],
];

/** lassen sich zwei Fassungen dieses Eintrags zusammenführen? */
export const zusammenfuehrbar = (key: string) => REGELN.some(([passt]) => passt(key));

/**
 * eigene Fassung (dieses Gerät) und andere (OneDrive bzw. Konfliktkopie) zusammenführen. Nicht zusammenführbare Einträge
 * oder kaputtes JSON: die andere Fassung gilt (bzw. die eigene, wenn die andere fehlt).
 */
export function zusammenfuehren(key: string, eigen: string | null, andere: string | null): string {
  if (eigen === null || eigen === '') return andere ?? '';
  if (andere === null || andere === '') return eigen;
  const regel = REGELN.find(([passt]) => passt(key))?.[1];
  const e = lesen(eigen);
  const a = lesen(andere);
  if (!regel || !istObj(e) || !istObj(a)) return andere;
  return JSON.stringify(regel(e, a));
}
