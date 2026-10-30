// Noten mit OneDrive spiegeln (Teil der Synchronisation, siehe spiegel.ts): je Song eine Datei „Noten/<Song>.json“
// mit Akkordblatt und den PDFs samt Fassung und Seitenbereich; Zeichnungen im Notenblatt für alle unter
// „Markierungen/Band/<PDF>.json“, die nur für mich gezeichneten unter „Markierungen/<Name>/<PDF>.json“. PDFs werden über Dateiname und Größe gefunden – die Datei-IDs sind je Gerät verschieden;
// fehlt ein PDF auf dem Gerät, wird es aus dem Sync-Ordner (z. B. „Sheets/“) übernommen.
import { NotenDateiInfo, SongNoten, Strich } from './noten';
import { hash } from './spiegel';

const sauber = (s: string) => s.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 90);

/** Dateipfad der Noten eines Songs („Titel|Interpret“) */
export const notenPfad = (key: string) => `Noten/${sauber(key.replace('|', ' - '))}-${hash(key).slice(0, 6)}.json`;
/** Ordner der Markierungen für alle */
export const BAND = 'Band';
/** Dateipfad der Markierungen einer PDF-Datei – für alle (BAND) bzw. nur für eine Person */
export const markPfad = (wer: string, d: { name: string; groesse: number }) => `Markierungen/${wer}/${sauber(d.name.replace(/\.pdf$/i, ''))}-${d.groesse}.json`;

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

/** Markierungen je PDF-Datei (Schlüssel „Datei-ID:Seite“) als Dateien: für alle unter BAND, private unter der Person */
export function markTexte(person: string, alle: Record<string, Strich[]>, dateien: Map<string, { name: string; groesse: number }>): Record<string, { text: string; key: string }> {
  const jeDatei = new Map<string, Record<string, Strich[]>>();
  for (const [k, striche] of Object.entries(alle)) {
    const i = k.lastIndexOf(':');
    const id = k.slice(0, i);
    if (!striche.length || !dateien.has(id)) continue;
    for (const privat of [false, true]) {
      const teil = striche.filter((s) => !!s.privat === privat).map(({ privat: _, ...s }) => s);
      if (!teil.length) continue;
      const ziel = `${privat ? 'p' : 'b'}:${id}`;
      jeDatei.set(ziel, { ...(jeDatei.get(ziel) ?? {}), [k.slice(i + 1)]: teil });
    }
  }
  const out: Record<string, { text: string; key: string }> = {};
  for (const [ziel, seiten] of jeDatei) {
    const d = dateien.get(ziel.slice(2))!;
    const sortiert = Object.fromEntries(Object.entries(seiten).sort(([a], [b]) => Number(a) - Number(b)));
    out[markPfad(ziel.startsWith('p') ? person : BAND, d)] = { text: JSON.stringify({ name: d.name, groesse: d.groesse, seiten: sortiert } satisfies MarkDateiInhalt), key: `${d.groesse}|${d.name}` };
  }
  return out;
}

/** Striche einer Seite nach dem Übernehmen einer Datei: die Art der Datei (für alle bzw. privat) wird ersetzt */
export function markZusammen(lokal: Strich[], ausDatei: Strich[], privat: boolean): Strich[] {
  const neu = ausDatei.map((s) => (privat ? { ...s, privat: true } : s));
  return privat ? [...lokal.filter((s) => !s.privat), ...neu] : [...neu, ...lokal.filter((s) => s.privat)];
}

/** gehört der Pfad zum Noten-Spiegel dieser Person? */
export const istNotenSpiegel = (pfad: string, person: string) =>
  (/^Noten\/[^/]+\.json$/.test(pfad) || pfad.startsWith(`Markierungen/${BAND}/`) || pfad.startsWith(`Markierungen/${person}/`)) && !pfad.includes('(Konflikt');

/** PDF auf dem Gerät über Name und Größe finden */
export function pdfFinden(name: string, groesse: number, lokal: NotenDateiInfo[]): NotenDateiInfo | undefined {
  return lokal.find((d) => d.name === name && d.groesse === groesse) ?? lokal.find((d) => d.name.toLowerCase() === name.toLowerCase() && d.groesse === groesse);
}
