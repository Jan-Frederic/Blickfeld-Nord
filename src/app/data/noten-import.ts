import data from './repertoire.json';
import { CHORDPRO_ENDUNGEN, chordproLesen, dateiText, dateinameZuordnen, songZuordnen } from './chordpro';
import { NotenDateiInfo, notenDateiSpeichern, songNoten, songNotenSetzen } from './noten';

// Viele Noten-Dateien auf einmal einlesen – von der Festplatte (Dateien/Ordner wählen) oder aus OneDrive.
// PDFs über Titel und Interpret im Dateinamen (der Rest ist die Fassung wie „Bass“) – kommen als weiteres PDF zum
// Song dazu, dieselbe Datei nicht doppelt. Akkordblätter über {title:}/{artist:} oder den Dateinamen (ersetzt ein
// vorhandenes). Unterordner helfen bei der Zuordnung („Goo Goo Dolls/Iris - Bass.pdf“).

export interface NotenQuelle {
  name: string;
  /** Pfad mit Ordnern, sonst der Name */
  pfad: string;
  groesse: number;
  daten: () => Promise<ArrayBuffer>;
}

export interface NotenErgebnis {
  pdfs: number;
  blaetter: number;
  ersetzt: number;
  doppelt: number;
  andere: number;
  ohne: string[];
}

export const istPdf = (name: string) => name.toLowerCase().endsWith('.pdf');
export const istAkkordblatt = (name: string) => CHORDPRO_ENDUNGEN.split(',').includes(name.slice(name.lastIndexOf('.')).toLowerCase());

export async function notenEinlesen(dateien: NotenQuelle[], bekannt: NotenDateiInfo[]): Promise<NotenErgebnis> {
  const r: NotenErgebnis = { pdfs: 0, blaetter: 0, ersetzt: 0, doppelt: 0, andere: 0, ohne: [] };
  const vorhanden = [...bekannt];
  for (const datei of dateien.filter((d) => !d.name.startsWith('.'))) {
    if (istPdf(datei.name)) {
      const z = dateinameZuordnen(datei.name, data.tracks) ?? dateinameZuordnen(datei.pfad, data.tracks);
      if (!z) {
        r.ohne.push(datei.name);
        continue;
      }
      const key = `${z.song.title}|${z.song.artist}`;
      const vorher = (await songNoten(key)) ?? {};
      let id = vorhanden.find((d) => d.name === datei.name && d.groesse === datei.groesse)?.id;
      if (!id) {
        id = await notenDateiSpeichern(datei.name, await datei.daten());
        vorhanden.push({ id, name: datei.name, groesse: datei.groesse, hinzugefuegt: '' });
      }
      if (vorher.pdfs?.some((p) => p.datei === id)) {
        r.doppelt++;
        continue;
      }
      await songNotenSetzen(key, { ...vorher, pdfs: [...(vorher.pdfs ?? []), { datei: id, name: z.fassung || undefined }] });
      r.pdfs++;
    } else if (istAkkordblatt(datei.name)) {
      const text = dateiText(await datei.daten());
      const song = songZuordnen(datei.name, chordproLesen(text), data.tracks) ?? dateinameZuordnen(datei.pfad, data.tracks)?.song;
      if (!song) {
        r.ohne.push(datei.name);
        continue;
      }
      const key = `${song.title}|${song.artist}`;
      const vorher = (await songNoten(key)) ?? {};
      if (vorher.chordpro?.trim()) r.ersetzt++;
      await songNotenSetzen(key, { ...vorher, chordpro: text });
      r.blaetter++;
    } else r.andere++;
  }
  return r;
}

/** Meldung zum Ergebnis; fehler = nichts zugeordnet */
export function notenErgebnisText(r: NotenErgebnis): { text: string; fehler?: boolean } {
  const teile = [
    r.pdfs && `${r.pdfs} ${r.pdfs === 1 ? 'PDF' : 'PDFs'}`,
    r.blaetter && `${r.blaetter} ${r.blaetter === 1 ? 'Akkordblatt' : 'Akkordblätter'}${r.ersetzt ? ` (${r.ersetzt} ersetzt)` : ''}`,
  ].filter(Boolean);
  const rest = [r.doppelt && `${r.doppelt} schon vorhanden`, r.andere && `${r.andere} andere Dateien übersprungen`].filter(Boolean).join(', ');
  return teile.length
    ? { text: `${teile.join(' und ')} eingelesen ✓${rest ? ` – ${rest}` : ''}` }
    : { text: `Keine Datei ließ sich einem Song zuordnen${rest ? ` (${rest})` : ''}.`, fehler: !r.doppelt };
}
