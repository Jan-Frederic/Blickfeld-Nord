import { presseText } from './presse-texte';

const s = { date: '2027-02-19', time: '18:00', venue: 'Café Nenna', city: 'Rhede', confirmed: true, price: 0 };
const links = { text: 'https://x/t', story: 'https://x/s' };

describe('presseText', () => {
  it('schreibt Englisch und Niederländisch mit Datum, Ort, Eintritt und Link', () => {
    const en = presseText('beitrag', s, 'en', links);
    expect(en).toContain('Friday, 19/02/2027 · from 18:00');
    expect(en).toContain('📍 Café Nenna, Rhede');
    expect(en).toContain('Free entry');
    expect(en).toContain('👉 https://x/t');
    const nl = presseText('morgen', s, 'nl', links);
    expect(nl).toContain('Morgen spelen we');
    expect(nl).toContain('vanaf 18:00 uur');
    expect(nl).toContain('👉 https://x/s');
  });

  it('Deutsch wie im Werbeplan', () => {
    expect(presseText('heute', s, 'de', links)).toContain('Heute Abend live');
  });
});
