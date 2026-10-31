import { anfrageText, nachrichtLink, ortKey, waNummer } from './kontakte';

describe('kontakte', () => {
  it('gleicher Ort auch bei Varianten', () => {
    expect(ortKey({ venue: 'Café Lotti – Tanz in den Mai', city: 'Dingden' })).toBe(ortKey({ venue: 'Café Lotti', city: 'Dingden' }));
  });

  it('WhatsApp-Nummer und Links', () => {
    expect(waNummer('0171 123 45-67')).toBe('491711234567');
    expect(waNummer('+31 6 1234')).toBe('3161234');
    expect(nachrichtLink({ telefon: '0171 1' }, 'B', 'Hallo du')).toBe('https://wa.me/491711?text=Hallo%20du');
    expect(nachrichtLink({ mail: 'a@b.de' }, 'Betreff', 'x')).toBe('mailto:a@b.de?subject=Betreff&body=x');
    expect(nachrichtLink(undefined, 'B', 'x')).toBeNull();
  });

  it('Anfrage mit Name und freien Monaten', () => {
    const t = anfrageText({ venue: 'Café Nenna', date: '2026-02-10' }, { name: 'Anna' }, ['März', 'Juli', 'September']);
    expect(t).toContain('Hallo Anna,');
    expect(t).toContain('am 10.02.2026');
    expect(t).toContain('März, Juli und September');
  });
});
