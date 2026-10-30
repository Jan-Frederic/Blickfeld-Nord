// Noten mit OneDrive spiegeln (Teil der Synchronisation, siehe spiegel.ts): je Song eine Datei „Noten/<Song>.json“
// mit Akkordblatt und den PDFs samt Fassung und Seitenbereich, je Person „Markierungen/<Name>/<PDF>.json“ mit den
// Zeichnungen im Notenblatt. PDFs werden über Dateiname und Größe gefunden – die Datei-IDs sind je Gerät verschieden;
// fehlt ein PDF auf dem Gerät, wird es aus dem Sync-Ordner (z. B. „Sheets/“) übernommen.
import { NotenDateiInfo, SongNoten, Strich } from './noten';
import { hash } from './spiegel';

const sauber = (s: string) => s.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 90);

/** Dateipfad der Noten eines Songs („Titel|Interpret“) */
export const notenPfad = (key: string) => `Noten/${sauber(key.replace('|', ' - '))}-${hash(key).slice(0, 6)}.json`;
/** Dateipfad der Markierungen einer PDF-Datei für eine Person */
export const markPfad = (person: string, d: { name: string; groesse: number }) => `Markierungen/${person}/${sauber(d.name.replace(/\.pdf$/i, ''))}-${d.groesse}.json`;

export interface NotenDateiInhalt {
  song: string;
  chordpro?: string;
  pdfs: { name: string; groesse: number; fassung?: string; von?: number; bis?: number }[];
}

/** Inhalt der Noten-Datei eines Songs – stabil sortiert, damit gleicher Inhalt gleichen Text ergibt */
export function notenText(key: string, n: SongNoten, dateien: Map<string, { name: string; groesse: number }>): string {
  const pdfs = (n.pdfs ?? []).flatMap((p) => {
    const d = dateien.get(p.datei);
    return d ? [{ name: d.name, groesse: d.groesse, ...(p.name ? { fassung: p.name } : {}), ...(p.von ? { von: p.von } : {}), ...(p.bis ? { bis: p.bis } : {}) }] : [];
  });
  const inhalt: NotenDateiInhalt = { song: key, ...(n.chordpro?.trim() ? { chordpro: n.chordpro } : {}), pdfs };
  return JSON.stringify(inhalt, null, 1);
}

export interface MarkDateiInhalt {
  name: string;
  groesse: number;
  seiten: Record<string, Strich[]>;
}

/** Markierungen je PDF-Datei (Schlüssel „Datei-ID:Seite“) als Dateien einer Person */
export function markTexte(person: string, alle: Record<string, Strich[]>, dateien: Map<string, { name: string; groesse: number }>): Record<string, string> {
  const jeDatei = new Map<string, Record<string, Strich[]>>();
  for (const [k, striche] of Object.entries(alle)) {
    const i = k.lastIndexOf(':');
    const id = k.slice(0, i);
    if (!striche.length || !dateien.has(id)) continue;
    jeDatei.set(id, { ...(jeDatei.get(id) ?? {}), [k.slice(i + 1)]: striche });
  }
  const out: Record<string, string> = {};
  for (const [id, seiten] of jeDatei) {
    const d = dateien.get(id)!;
    const sortiert = Object.fromEntries(Object.entries(seiten).sort(([a], [b]) => Number(a) - Number(b)));
    out[markPfad(person, d)] = JSON.stringify({ name: d.name, groesse: d.groesse, seiten: sortiert } satisfies MarkDateiInhalt);
  }
  return out;
}

/** gehört der Pfad zum Noten-Spiegel dieser Person? */
export const istNotenSpiegel = (pfad: string, person: string) =>
  (/^Noten\/[^/]+\.json$/.test(pfad) || pfad.startsWith(`Markierungen/${person}/`)) && !pfad.includes('(Konflikt');

/** PDF auf dem Gerät über Name und Größe finden */
export function pdfFinden(name: string, groesse: number, lokal: NotenDateiInfo[]): NotenDateiInfo | undefined {
  return lokal.find((d) => d.name === name && d.groesse === groesse) ?? lokal.find((d) => d.name.toLowerCase() === name.toLowerCase() && d.groesse === groesse);
}
