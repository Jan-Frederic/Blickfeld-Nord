// Noten-Check (Backstage → Abgleich → Daten auf diesem Gerät): welche Noten-Dateien auf diesem Gerät zu keinem Song
// gehören und welche doppelt da sind (gleicher Name, gleiche Größe). Doppelte lassen sich zusammenführen: alle Songs
// zeigen dann auf eine Kopie, die übrigen Kopien verschwinden von diesem Gerät. Gelöscht wird hier nichts in OneDrive –
// das macht ihr dort selbst. Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.
import type { NotenDateiInfo, SongNoten } from './noten';

export interface DoppelGruppe {
  /** diese Kopie bleibt (die mit den meisten Verweisen, sonst die älteste) */
  behalten: NotenDateiInfo;
  weitere: NotenDateiInfo[];
  /** Songs, die auf eine der Kopien zeigen */
  songs: string[];
}

export interface NotenCheck {
  ohneSong: NotenDateiInfo[];
  doppelt: DoppelGruppe[];
}

function verweise(songs: Record<string, SongNoten>): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const [key, n] of Object.entries(songs))
    for (const p of n.pdfs ?? (n.pdf ? [n.pdf] : [])) {
      if (!out.has(p.datei)) out.set(p.datei, new Set());
      out.get(p.datei)!.add(key);
    }
  return out;
}

export function notenCheck(dateien: NotenDateiInfo[], songs: Record<string, SongNoten>): NotenCheck {
  const v = verweise(songs);
  const gruppen = new Map<string, NotenDateiInfo[]>();
  for (const d of dateien) {
    const k = `${d.name.toLocaleLowerCase('de')}|${d.groesse}`;
    gruppen.set(k, [...(gruppen.get(k) ?? []), d]);
  }
  const doppelt: DoppelGruppe[] = [];
  const inGruppe = new Set<string>();
  for (const g of gruppen.values()) {
    if (g.length < 2) continue;
    const sortiert = [...g].sort((a, b) => (v.get(b.id)?.size ?? 0) - (v.get(a.id)?.size ?? 0) || a.hinzugefuegt.localeCompare(b.hinzugefuegt));
    sortiert.forEach((d) => inGruppe.add(d.id));
    const songsDa = new Set(sortiert.flatMap((d) => [...(v.get(d.id) ?? [])]));
    doppelt.push({ behalten: sortiert[0], weitere: sortiert.slice(1), songs: [...songsDa].sort() });
  }
  const ohneSong = dateien.filter((d) => !v.has(d.id) && !inGruppe.has(d.id)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  return { ohneSong, doppelt: doppelt.sort((a, b) => a.behalten.name.localeCompare(b.behalten.name, 'de')) };
}

/** Songs, die sich durchs Zusammenführen ändern: Verweise auf die weiteren Kopien zeigen auf die behaltene, doppelte
 *  Einträge (gleiche Datei, gleiche Seiten, gleiche Fassung) fallen weg */
export function zusammenfuehren(songs: Record<string, SongNoten>, g: DoppelGruppe): Record<string, SongNoten> {
  const weg = new Set(g.weitere.map((d) => d.id));
  const out: Record<string, SongNoten> = {};
  for (const [key, n] of Object.entries(songs)) {
    const pdfs = n.pdfs ?? (n.pdf ? [n.pdf] : []);
    if (!pdfs.some((p) => weg.has(p.datei))) continue;
    const gesehen = new Set<string>();
    const neu = pdfs
      .map((p) => (weg.has(p.datei) ? { ...p, datei: g.behalten.id } : p))
      .filter((p) => {
        const k = `${p.datei}|${p.von ?? ''}|${p.bis ?? ''}|${p.name ?? ''}`;
        if (gesehen.has(k)) return false;
        gesehen.add(k);
        return true;
      });
    const { pdf: _alt, ...rest } = n;
    out[key] = { ...rest, pdfs: neu };
  }
  return out;
}
