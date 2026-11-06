import { CHORDPRO_ENDUNGEN, dateiText } from './chordpro';
import { erkennen } from './erkennung';
import { NotenDateiInfo, doppelteVerweise, notenDatei, notenDateiSpeichern, songNoten, songNotenSetzen } from './noten';

// Viele Noten-Dateien auf einmal einlesen – von der Festplatte (Dateien/Ordner wählen) oder aus OneDrive.
// PDFs über Titel und Interpret im Dateinamen (der Rest ist die Fassung wie „Bass“) – kommen als weiteres PDF zum
// Song dazu. Hat der Song schon ein PDF gleichen Namens, wird es bei gleichem Inhalt nicht noch einmal angehängt und
// bei geändertem Inhalt ersetzt (auch bei gleicher Größe – verglichen wird der Inhalt). Akkordblätter ersetzen ein vorhandenes. Zuordnung: vorher gewählt (ziel)
// oder automatisch erkannt – Dateiname, Ordner („Goo Goo Dolls/Iris - Bass.pdf“), Inhalt, Tippfehler.

export interface NotenQuelle {
  name: string;
  /** Pfad mit Ordnern, sonst der Name */
  pfad: string;
  groesse: number;
  daten: () => Promise<ArrayBuffer>;
  /** schon festgelegter Song („Titel|Interpret“) und Fassung – sonst wird über den Namen zugeordnet */
  ziel?: { key: string; fassung?: string };
}

export interface NotenErgebnis {
  pdfs: number;
  /** vorhandene PDFs mit neuem Inhalt */
  aktualisiert: number;
  blaetter: number;
  ersetzt: number;
  doppelt: number;
  andere: number;
  ohne: string[];
}

export const istPdf = (name: string) => name.toLowerCase().endsWith('.pdf');
export const istAkkordblatt = (name: string) => CHORDPRO_ENDUNGEN.split(',').includes(name.slice(name.lastIndexOf('.')).toLowerCase());

/** Fortschritt: fertig von gesamt, gerade bearbeitete Datei */
export type NotenFortschritt = (fertig: number, gesamt: number, name: string) => void;

// ohne vorherige Auswahl: Titel und Interpret erkennen (Name, Ordner, Inhalt, Tippfehler – data/erkennung.ts);
// nur eindeutige Treffer, Unklares landet in „nicht zugeordnet“
async function automatisch(datei: NotenQuelle): Promise<{ key: string; fassung: string } | undefined> {
  const e = await erkennen(datei.name, datei.pfad, datei.daten);
  return e.key ? { key: e.key, fassung: e.fassung } : undefined;
}

export async function notenEinlesen(dateien: NotenQuelle[], bekannt: NotenDateiInfo[], fortschritt?: NotenFortschritt): Promise<NotenErgebnis> {
  const r: NotenErgebnis = { pdfs: 0, aktualisiert: 0, blaetter: 0, ersetzt: 0, doppelt: 0, andere: 0, ohne: [] };
  const vorhanden = [...bekannt];
  const liste = dateien.filter((d) => !d.name.startsWith('.'));
  let fertig = 0;
  for (const datei of liste) {
    fortschritt?.(fertig++, liste.length, datei.name);
    if (istPdf(datei.name)) {
      const z = datei.ziel ? { key: datei.ziel.key, fassung: datei.ziel.fassung ?? '' } : await automatisch(datei);
      if (!z) {
        r.ohne.push(datei.name);
        continue;
      }
      const key = z.key;
      const vorher = (await songNoten(key)) ?? {};
      const daten = await datei.daten();
      const gleicherName = (d: NotenDateiInfo) => d.name.toLowerCase() === datei.name.toLowerCase();
      // 1. der Song hat schon ein PDF dieses Namens: gleicher Inhalt → nichts tun, geänderter Inhalt → ersetzen
      const amSong = (vorher.pdfs ?? []).map((p) => vorhanden.find((d) => d.id === p.datei)).find((d): d is NotenDateiInfo => !!d && gleicherName(d));
      if (amSong) {
        if (await gleicherInhalt(amSong, daten)) r.doppelt++;
        else {
          await notenDateiSpeichern(amSong.name, daten, amSong.id);
          amSong.groesse = daten.byteLength;
          r.aktualisiert++;
        }
        continue;
      }
      // 2. dieselbe Datei liegt schon auf dem Gerät (z. B. bei einem anderen Song): wiederverwenden statt doppelt speichern
      let id: string | undefined;
      for (const d of vorhanden.filter((x) => gleicherName(x) && x.groesse === daten.byteLength)) {
        if (await gleicherInhalt(d, daten)) {
          id = d.id;
          break;
        }
      }
      if (!id) {
        id = await notenDateiSpeichern(datei.name, daten);
        vorhanden.push({ id, name: datei.name, groesse: daten.byteLength, hinzugefuegt: '' });
      }
      await songNotenSetzen(key, doppelteVerweise({ ...vorher, pdfs: [...(vorher.pdfs ?? []), { datei: id, name: z.fassung || undefined }] }, vorhanden));
      r.pdfs++;
    } else if (istAkkordblatt(datei.name)) {
      const text = dateiText(await datei.daten());
      const key = datei.ziel?.key ?? (await automatisch(datei))?.key;
      if (!key) {
        r.ohne.push(datei.name);
        continue;
      }
      const vorher = (await songNoten(key)) ?? {};
      if (vorher.chordpro?.trim()) r.ersetzt++;
      await songNotenSetzen(key, { ...vorher, chordpro: text });
      r.blaetter++;
    } else r.andere++;
  }
  fortschritt?.(liste.length, liste.length, '');
  return r;
}

/** gespeicherte Datei und neue Daten gleich? Erst die Größe, dann Byte für Byte */
async function gleicherInhalt(d: NotenDateiInfo, daten: ArrayBuffer): Promise<boolean> {
  if (d.groesse !== daten.byteLength) return false;
  const alt = (await notenDatei(d.id))?.daten;
  if (!alt || alt.byteLength !== daten.byteLength) return false;
  const a = new Uint8Array(alt);
  const b = new Uint8Array(daten);
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Meldung zum Ergebnis; fehler = nichts zugeordnet */
export function notenErgebnisText(r: NotenErgebnis): { text: string; fehler?: boolean } {
  const teile = [
    r.pdfs && `${r.pdfs} ${r.pdfs === 1 ? 'PDF' : 'PDFs'}`,
    r.aktualisiert && `${r.aktualisiert} ${r.aktualisiert === 1 ? 'PDF' : 'PDFs'} aktualisiert`,
    r.blaetter && `${r.blaetter} ${r.blaetter === 1 ? 'Akkordblatt' : 'Akkordblätter'}${r.ersetzt ? ` (${r.ersetzt} ersetzt)` : ''}`,
  ].filter(Boolean);
  const rest = [r.doppelt && `${r.doppelt} schon vorhanden`, r.andere && `${r.andere} andere Dateien übersprungen`].filter(Boolean).join(', ');
  return teile.length
    ? { text: `${teile.join(' und ')} eingelesen ✓${rest ? ` – ${rest}` : ''}` }
    : { text: `Keine Datei ließ sich einem Song zuordnen${rest ? ` (${rest})` : ''}.`, fehler: !r.doppelt };
}
