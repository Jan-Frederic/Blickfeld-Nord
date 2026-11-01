import { pdfText } from './presse-pdf';

// Veranstalter-Mappe (Termine → Kontakte): alles zu einem Ort auf ein paar Seiten – Ansprechpartner, Bewertung und
// jeder Auftritt dort mit Setlist und Vor-Ort-Angaben. Nur für die Band (wird auf dem Gerät erzeugt, nie hochgeladen).
export interface MappeDaten {
  ort: string;
  stadt?: string;
  kontakt: [string, string][];
  bewertung: string;
  auftritte: { titel: string; setlist: string[]; vorort: [string, string][] }[];
  stand: string;
}

export async function veranstalterPdf(d: MappeDaten): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  pdf.setTitle(pdfText(`Veranstalter-Mappe ${d.ort}`));
  pdf.setAuthor('Blickfeld Nord');
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const fett = await pdf.embedFont(StandardFonts.HelveticaBold);
  const [W, H, M] = [595.28, 841.89, 50];
  const dunkel = rgb(0.1, 0.1, 0.12);
  const grau = rgb(0.4, 0.4, 0.45);
  const orange = rgb(0.76, 0.48, 0.24);
  let seite = pdf.addPage([W, H]);
  let y = H - M;
  const zeile = (text: string, size: number, font = normal, farbe = dunkel, x = M) => {
    const breite = W - M - x;
    for (const absatz of pdfText(text).split('\n')) {
      let z = '';
      const raus = (t: string) => {
        if (y < M + size) {
          seite = pdf.addPage([W, H]);
          y = H - M;
        }
        seite.drawText(t, { x, y, size, font, color: farbe });
        y -= size * 1.4;
      };
      for (const w of absatz.split(' ')) {
        const probe = z ? `${z} ${w}` : w;
        if (font.widthOfTextAtSize(probe, size) > breite && z) {
          raus(z);
          z = w;
        } else z = probe;
      }
      raus(z);
    }
  };
  const paar = (k: string, v: string) => {
    if (y < M + 12) {
      seite = pdf.addPage([W, H]);
      y = H - M;
    }
    seite.drawText(pdfText(k), { x: M, y, size: 9, font: fett, color: grau });
    zeile(v, 10, normal, dunkel, M + 120);
  };

  zeile('BLICKFELD NORD · NUR FÜR DIE BAND', 9, fett, orange);
  y -= 2;
  zeile(d.ort + (d.stadt ? `, ${d.stadt}` : ''), 22, fett);
  zeile(`Stand ${d.stand}`, 9, normal, grau);
  y -= 8;
  zeile('Ansprechpartner', 13, fett);
  if (d.kontakt.length) for (const [k, v] of d.kontakt) paar(k, v);
  else zeile('noch nicht eingetragen', 10, normal, grau);
  y -= 6;
  zeile('Wie war es dort?', 13, fett);
  zeile(d.bewertung || 'noch nicht bewertet', 10, normal, d.bewertung ? dunkel : grau);
  y -= 6;
  zeile(`Auftritte (${d.auftritte.length})`, 13, fett);
  if (!d.auftritte.length) zeile('noch kein Auftritt', 10, normal, grau);
  for (const a of d.auftritte) {
    y -= 6;
    zeile(a.titel, 11, fett, orange);
    for (const [k, v] of a.vorort) paar(k, v);
    if (a.setlist.length) paar('Setlist', a.setlist.map((s, i) => `${i + 1}. ${s}`).join('  '));
  }
  return new Blob([(await pdf.save()) as BlobPart], { type: 'application/pdf' });
}
