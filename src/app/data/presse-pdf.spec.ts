import { PDFDocument } from 'pdf-lib';
import { pdfText, pressePdf, type PressePdfDaten } from './presse-pdf';

describe('pdfText', () => {
  it('entfernt Emojis, behält Umlaute und Euro', () => {
    expect(pdfText('🎶 Blickfeld Nord live! 🎶\n📍 Café Nenna, Rhede – Eintritt 5 €')).toBe('Blickfeld Nord live! \nCafé Nenna, Rhede - Eintritt 5 €');
  });
});

// 1 × 1 Pixel als Plakat
const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP43+ECAARVAcz19wCpAAAAAElFTkSuQmCC'), (c) => c.charCodeAt(0));
const daten = (songs: number, texte = 2): PressePdfDaten => ({
  show: { date: '2027-02-19', time: '18:00', venue: 'Café Nenna', city: 'Rhede', confirmed: true },
  titel: 'Blickfeld Nord – Café Nenna 🎶',
  eckdaten: [['Datum', 'Freitag, 19. Februar 2027'], ['Ort', 'Café Nenna, Rhede']],
  plakat: new Blob([PNG], { type: 'image/png' }),
  texte: Array.from({ length: texte }, (_, i) => ({ titel: `Text ${i + 1}`, text: 'Live und laut im Café. '.repeat(40) })),
  songs: Array.from({ length: songs }, (_, i) => `Song ${i + 1} – Band`),
  labels: { texte: 'Texte', songs: 'Songs', link: 'Seite' },
  link: 'https://blickfeld-nord.de/presse/2027-02-19/',
});
const seiten = async (d: PressePdfDaten) => (await PDFDocument.load(await (await pressePdf(d)).arrayBuffer())).getPageCount();

describe('pressePdf', () => {
  it('Eckdaten und Plakat, Texte, Songliste – je eine Seite', async () => {
    expect(await seiten(daten(30))).toBe(3);
  });

  it('lange Songlisten und viele Texte gehen auf weiteren Seiten weiter', async () => {
    expect(await seiten(daten(160))).toBe(4);
    expect(await seiten(daten(30, 12))).toBeGreaterThan(3);
  });
});
