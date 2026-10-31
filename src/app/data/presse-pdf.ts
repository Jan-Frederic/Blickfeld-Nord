import type { Show } from './band.service';

// Pressekit je Konzert als ein PDF (zum Anhängen an eine E-Mail): Seite 1 Eckdaten und Plakat, dann die fertigen
// Texte, zuletzt die Songliste. Im Browser mit pdf-lib erzeugt; Standardschrift Helvetica (ohne Emojis – die kann
// sie nicht darstellen, sie werden entfernt).
export interface PressePdfDaten {
  show: Show;
  titel: string;
  eckdaten: [string, string][];
  plakat: Blob;
  texte: { titel: string; text: string }[];
  songs: string[];
  labels: { texte: string; songs: string; link: string };
  link: string;
}

/** nur Zeichen, die die Standardschrift (WinAnsi) kennt – Emojis und Sonderzeichen fallen weg */
export const pdfText = (s: string) =>
  s
    .replace(/[‘’]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\x0A\x20-\x7E\xA0-\xFF€]/g, '')
    .replace(/^ +/gm, '');

export async function pressePdf(d: PressePdfDaten): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  pdf.setTitle(pdfText(d.titel));
  pdf.setAuthor('Blickfeld Nord');
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const fett = await pdf.embedFont(StandardFonts.HelveticaBold);
  const [W, H, M] = [595.28, 841.89, 50];
  const dunkel = rgb(0.1, 0.1, 0.12);
  const grau = rgb(0.4, 0.4, 0.45);
  const orange = rgb(0.76, 0.48, 0.24);
  let seite = pdf.addPage([W, H]);
  let y = H - M;

  const neueSeite = () => {
    seite = pdf.addPage([W, H]);
    y = H - M;
  };
  const zeile = (text: string, size: number, font = normal, farbe = dunkel, x = M, breite = W - 2 * M) => {
    for (const absatz of pdfText(text).split('\n')) {
      const woerter = absatz.split(' ');
      let z = '';
      const raus = (t: string) => {
        if (y < M + size) neueSeite();
        seite.drawText(t, { x, y, size, font, color: farbe });
        y -= size * 1.4;
      };
      if (!absatz.trim()) {
        y -= size * 0.7;
        continue;
      }
      for (const w of woerter) {
        const probe = z ? `${z} ${w}` : w;
        if (font.widthOfTextAtSize(probe, size) > breite && z) {
          raus(z);
          z = w;
        } else z = probe;
      }
      if (z) raus(z);
    }
  };

  // Seite 1: Kopf, Eckdaten, Plakat
  zeile('BLICKFELD NORD', 10, fett, orange);
  y -= 4;
  zeile(d.titel, 22, fett);
  y -= 8;
  for (const [k, v] of d.eckdaten) {
    seite.drawText(pdfText(k), { x: M, y, size: 10, font: fett, color: grau });
    zeile(v, 11, normal, dunkel, M + 110, W - 2 * M - 110);
  }
  y -= 6;
  zeile(`${d.labels.link}: ${d.link}`, 10, normal, orange);
  y -= 10;
  const bild = await pdf.embedPng(await d.plakat.arrayBuffer());
  const f = Math.min((W - 2 * M) / bild.width, (y - M) / bild.height);
  seite.drawImage(bild, { x: (W - bild.width * f) / 2, y: y - bild.height * f, width: bild.width * f, height: bild.height * f });

  // Texte
  neueSeite();
  zeile(d.labels.texte, 16, fett);
  y -= 6;
  for (const t of d.texte) {
    if (y < M + 120) neueSeite();
    zeile(t.titel, 12, fett, orange);
    zeile(t.text, 10);
    y -= 12;
  }

  // Songliste in zwei Spalten
  neueSeite();
  zeile(d.labels.songs, 16, fett);
  y -= 6;
  // je Seite zwei Spalten mit so vielen Zeilen, wie Platz ist – lange Listen gehen auf der nächsten Seite weiter
  for (let ab = 0; ab < d.songs.length; ) {
    if (ab) neueSeite();
    const start = y;
    const proSpalte = Math.max(1, Math.floor((start - M) / 14) + 1);
    const block = d.songs.slice(ab, ab + 2 * proSpalte);
    const halb = Math.ceil(block.length / 2);
    block.forEach((s, j) => {
      const spalte = j < halb ? 0 : 1;
      let t = pdfText(`${ab + j + 1}. ${s}`);
      while (normal.widthOfTextAtSize(t, 9) > (W - 2 * M) / 2 - 10) t = t.slice(0, -2) + '.';
      seite.drawText(t, { x: M + spalte * ((W - 2 * M) / 2), y: start - (j % halb) * 14, size: 9, font: normal, color: dunkel });
    });
    ab += block.length;
  }
  return new Blob([(await pdf.save()) as BlobPart], { type: 'application/pdf' });
}
