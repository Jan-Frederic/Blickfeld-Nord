import { PDFDocument } from 'pdf-lib';
import { veranstalterPdf } from './veranstalter-pdf';

describe('veranstalterPdf', () => {
  it('eine Seite für wenig, weitere Seiten für viele Auftritte', async () => {
    const seiten = async (n: number) =>
      (
        await PDFDocument.load(
          await (
            await veranstalterPdf({
              ort: 'Café Nenna',
              stadt: 'Rhede',
              kontakt: [['Name', 'Anna']],
              bewertung: 'Technik gut',
              auftritte: Array.from({ length: n }, (_, i) => ({ titel: `Auftritt ${i + 1} 🎶`, setlist: Array(25).fill('Song – Band'), vorort: [['Strom', 'hinter der Theke']] as [string, string][] })),
              stand: '01.11.2026',
            })
          ).arrayBuffer(),
        )
      ).getPageCount();
    expect(await seiten(1)).toBe(1);
    expect(await seiten(12)).toBeGreaterThan(1);
  });
});
