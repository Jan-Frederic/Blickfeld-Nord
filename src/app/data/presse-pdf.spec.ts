import { pdfText } from './presse-pdf';

describe('pdfText', () => {
  it('entfernt Emojis, behält Umlaute und Euro', () => {
    expect(pdfText('🎶 Blickfeld Nord live! 🎶\n📍 Café Nenna, Rhede – Eintritt 5 €')).toBe('Blickfeld Nord live! \nCafé Nenna, Rhede - Eintritt 5 €');
  });
});
