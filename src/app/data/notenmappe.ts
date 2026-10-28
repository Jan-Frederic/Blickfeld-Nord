import { Akkordblatt, blattTransponieren, chordproLesen, griffbild, tonartVerschieben } from './chordpro';
import { notenDatei, pdfName, songNoten } from './noten';
import { fassungWaehlen, ladeWahl, pdfId } from './noten-wahl';
import { Entry, isPause } from './setlist-data';
import { gespielteTonart, songInfo } from './songinfo';

// Setlist-Notenmappe: alle Noten einer Setlist in Reihenfolge als ein PDF – zum Drucken oder fürs Tablet. Je Song
// die Fassung, die der Bühnen-Modus zeigen würde (eigene Wahl bzw. Vorliebe wie „Bass“): PDF-Seiten im eingestellten
// Bereich, Akkordblätter als Textseite in der Tonart der Band (mit Capo als Griffbild). Vorne ein Deckblatt mit der
// Setlist, Pausen als Trennseite. Entsteht nur auf dem Gerät (pdf-lib, erst bei Bedarf geladen) – nie im Repository.

export type SatzZeile = { art: 'akkord' | 'text' | 'abschnitt' | 'kommentar' | 'leer'; text: string };

/** Akkordblatt als Zeilen in fester Schriftbreite: Akkorde genau über der Silbe */
export function akkordSatz(blatt: Akkordblatt): SatzZeile[] {
  const out: SatzZeile[] = [];
  for (const z of blatt.zeilen) {
    if (z.art === 'text') {
      let akkorde = '';
      let text = '';
      for (const t of z.teile) {
        const breite = Math.max(t.text.length, t.akkord ? t.akkord.length + 1 : 0);
        akkorde += (t.akkord ?? '').padEnd(breite);
        text += t.text.padEnd(breite);
      }
      if (akkorde.trim()) out.push({ art: 'akkord', text: akkorde.trimEnd() });
      if (text.trim()) out.push({ art: 'text', text: text.trimEnd() });
    } else if (z.art === 'leer') out.push({ art: 'leer', text: '' });
    else out.push({ art: z.art, text: z.text });
  }
  return out;
}

/** Akkordblatt eines Songs in der Tonart der Band (wie im Bühnen-Modus) */
export function blattFuerBand(chordpro: string, title: string, artist: string): { blatt: Akkordblatt; griff: string } {
  const b = chordproLesen(chordpro);
  const info = songInfo(title, artist);
  const original = info?.tonart;
  const geschrieben = b.tonart ?? (original ? tonartVerschieben(original, -(b.capo ?? 0)) : undefined);
  const g = griffbild(geschrieben, gespielteTonart(info), info?.capo ?? 0);
  const blatt = blattTransponieren({ ...b, tonart: geschrieben }, g.schritte);
  return { blatt, griff: [blatt.tonart && `Griffe in ${blatt.tonart}`, info?.capo && `Capo ${info.capo}`].filter(Boolean).join(' · ') };
}

// nur Zeichen, die die PDF-Standardschriften (Windows-1252) kennen
const WIN1252 = /[^\x20-\x7e\xa0-\xff€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g;
const sauber = (s: string) => s.replace(/\t/g, '  ').replace(WIN1252, '?');

export interface MappenStand {
  text: string;
  fertig?: number;
  gesamt?: number;
}

/** Notenmappe als PDF; ohne = Songs ohne Noten (stehen als Hinweisseite drin) */
export async function notenmappe(entries: Entry[], titel: string, melden?: (s: MappenStand) => void): Promise<{ pdf: Blob; ohne: string[]; seiten: number }> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const mappe = await PDFDocument.create();
  mappe.setTitle(`Notenmappe – ${titel}`);
  mappe.setCreator('Blickfeld Nord – Backstage');
  const mono = await mappe.embedFont(StandardFonts.Courier);
  const monoFett = await mappe.embedFont(StandardFonts.CourierBold);
  const kursiv = await mappe.embedFont(StandardFonts.CourierOblique);
  const fett = await mappe.embedFont(StandardFonts.HelveticaBold);
  const normal = await mappe.embedFont(StandardFonts.Helvetica);
  const [B, H, RAND] = [595.28, 841.89, 48];
  const orange = rgb(0.75, 0.38, 0.1);
  const grau = rgb(0.4, 0.4, 0.4);
  const wahl = ladeWahl();
  const ohne: string[] = [];

  const kopf = (seite: ReturnType<typeof mappe.addPage>, oben: string, unten = '') => {
    seite.drawText(sauber(oben), { x: RAND, y: H - RAND - 16, size: 18, font: fett });
    if (unten) seite.drawText(sauber(unten), { x: RAND, y: H - RAND - 34, size: 10, font: normal, color: grau });
  };

  // Deckblatt mit der Setlist
  const songs = entries.filter((e) => !isPause(e)) as { title: string; artist: string }[];
  {
    let seite = mappe.addPage([B, H]);
    kopf(seite, `Notenmappe – ${titel}`, `${songs.length} Songs · erstellt ${new Date().toLocaleDateString('de-DE')}`);
    let y = H - RAND - 70;
    let nr = 0;
    let set = 1;
    for (const e of entries) {
      if (y < RAND + 20) {
        seite = mappe.addPage([B, H]);
        y = H - RAND - 20;
      }
      if (isPause(e)) {
        set++;
        seite.drawText(`— Pause · Set ${set} —`, { x: RAND, y, size: 11, font: fett, color: orange });
      } else {
        const s = e as { title: string; artist: string };
        seite.drawText(sauber(`${String(++nr).padStart(2, ' ')}. ${s.title} – ${s.artist}`), { x: RAND, y, size: 11, font: normal });
      }
      y -= 17;
    }
  }

  let nr = 0;
  for (const e of entries) {
    if (isPause(e)) {
      const seite = mappe.addPage([B, H]);
      seite.drawText('Pause', { x: RAND, y: H / 2, size: 40, font: fett, color: orange });
      continue;
    }
    const s = e as { title: string; artist: string };
    const key = `${s.title}|${s.artist}`;
    melden?.({ text: `Mappe: ${s.title}`, fertig: nr, gesamt: songs.length });
    nr++;
    const n = await songNoten(key);
    const id = n ? fassungWaehlen(n, key, wahl) : '';
    const pdfs = n?.pdfs ?? [];
    const p = pdfs.find((x) => pdfId(x) === id);
    try {
      if (p) {
        const datei = await notenDatei(p.datei);
        if (!datei) throw new Error('PDF fehlt auf diesem Gerät');
        const quelle = await PDFDocument.load(datei.daten, { ignoreEncryption: true });
        const anzahl = quelle.getPageCount();
        const von = Math.min(Math.max(1, p.von ?? 1), anzahl);
        const bis = Math.min(Math.max(von, p.bis ?? anzahl), anzahl);
        const seiten = await mappe.copyPages(quelle, Array.from({ length: bis - von + 1 }, (_, i) => von - 1 + i));
        seiten.forEach((x) => mappe.addPage(x));
        continue;
      }
      if (id === 'akkorde' && n?.chordpro) {
        const { blatt, griff } = blattFuerBand(n.chordpro, s.title, s.artist);
        const GROESSE = 10.5;
        const ZEILE = 12.5;
        let seite = mappe.addPage([B, H]);
        kopf(seite, `${nr}. ${s.title}`, [s.artist, griff].filter(Boolean).join(' · '));
        let y = H - RAND - 62;
        for (const z of akkordSatz(blatt)) {
          if (y < RAND) {
            seite = mappe.addPage([B, H]);
            kopf(seite, `${s.title} (Forts.)`);
            y = H - RAND - 44;
          }
          if (z.art === 'leer') y -= ZEILE / 2;
          else {
            const font = z.art === 'akkord' || z.art === 'abschnitt' ? monoFett : z.art === 'kommentar' ? kursiv : mono;
            const farbe = z.art === 'akkord' ? orange : z.art === 'text' ? rgb(0, 0, 0) : grau;
            if (z.art === 'abschnitt') y -= ZEILE / 2;
            seite.drawText(sauber(z.art === 'abschnitt' ? z.text.toUpperCase() : z.text), { x: RAND, y, size: GROESSE, font, color: farbe, maxWidth: B - 2 * RAND });
            y -= z.art === 'akkord' ? ZEILE - 1 : ZEILE;
          }
        }
        continue;
      }
      throw new Error('keine Noten auf diesem Gerät');
    } catch (err) {
      ohne.push(s.title);
      const seite = mappe.addPage([B, H]);
      kopf(seite, `${nr}. ${s.title}`, s.artist);
      seite.drawText(sauber(`(${(err as Error).message})${pdfs.length ? ` – Fassungen: ${pdfs.map((x, i) => pdfName(x, i, pdfs)).join(', ')}` : ''}`), { x: RAND, y: H - RAND - 70, size: 11, font: normal, color: grau });
    }
  }
  melden?.({ text: 'PDF wird erstellt …', fertig: songs.length, gesamt: songs.length });
  const bytes = await mappe.save();
  return { pdf: new Blob([bytes as BlobPart], { type: 'application/pdf' }), ohne, seiten: mappe.getPageCount() };
}
