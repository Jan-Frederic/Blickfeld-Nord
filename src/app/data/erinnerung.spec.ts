import { ERINNERUNG_KEY, faelligHeute, faelligkeiten, ladeErinnerung } from './erinnerung';

const heute = '2026-11-10';
beforeEach(() => localStorage.clear());

describe('Übe-Erinnerung', () => {
  it('zählt heute fällige, noch nicht geübte Karten; geübte erst ab morgen', () => {
    localStorage.setItem('bn-ueben', JSON.stringify({ a: { kasten: 1, faellig: '2026-11-09' }, b: { kasten: 2, faellig: heute }, c: { kasten: 4, faellig: '2026-11-17' } }));
    localStorage.setItem('bn-ueben-heute', JSON.stringify({ tag: heute, keys: ['b'] }));
    expect(faelligHeute(heute)).toBe(1);
    expect(faelligkeiten(heute).sort()).toEqual(['2026-11-09', '2026-11-11', '2026-11-17']);
  });
  it('Einstellung: Standard aus, 18 Uhr; ungültige Stunde fällt zurück', () => {
    expect(ladeErinnerung()).toEqual({ an: false, stunde: 18 });
    localStorage.setItem(ERINNERUNG_KEY, JSON.stringify({ an: true, stunde: 7 }));
    expect(ladeErinnerung()).toEqual({ an: true, stunde: 7 });
    localStorage.setItem(ERINNERUNG_KEY, JSON.stringify({ an: true, stunde: 30 }));
    expect(ladeErinnerung().stunde).toBe(18);
  });
});
