import { ERINNERUNG_KEY, erinnerungKarten, faelligHeute, faelligkeiten, ladeErinnerung } from './erinnerung';

const heute = '2026-11-10';
beforeEach(() => localStorage.clear());

describe('Übe-Erinnerung', () => {
  it('zählt heute fällige, noch nicht geübte Karten; geübte erst ab morgen', () => {
    localStorage.setItem('bn-ueben', JSON.stringify({ a: { kasten: 1, faellig: '2026-11-09' }, b: { kasten: 2, faellig: heute }, c: { kasten: 4, faellig: '2026-11-17' } }));
    localStorage.setItem('bn-ueben-heute', JSON.stringify({ tag: heute, keys: ['b'] }));
    expect(faelligHeute(heute)).toBe(1);
    expect(faelligkeiten(heute).sort()).toEqual(['2026-11-09', '2026-11-11', '2026-11-17']);
  });
  it('Karten für die Meldung: Songtitel, am längsten fällige zuerst, dann niedrigerer Kasten', () => {
    localStorage.setItem('bn-ueben', JSON.stringify({
      'Wonderwall|Oasis': { kasten: 3, faellig: '2026-11-08' },
      'Angels|Robbie Williams': { kasten: 1, faellig: '2026-11-08' },
      'Hey Jude|The Beatles': { kasten: 2, faellig: '2026-11-10' },
      'Später|X': { kasten: 1, faellig: '2026-11-20' },
    }));
    localStorage.setItem('bn-ueben-heute', JSON.stringify({ tag: heute, keys: ['Hey Jude|The Beatles'] }));
    expect(erinnerungKarten(heute)).toEqual([
      { f: '2026-11-08', t: 'Angels' },
      { f: '2026-11-08', t: 'Wonderwall' },
      // heute schon geübt: erst ab morgen wieder dran
      { f: '2026-11-11', t: 'Hey Jude' },
      { f: '2026-11-20', t: 'Später' },
    ]);
  });
  it('Einstellung: Standard aus, 18 Uhr; ungültige Stunde fällt zurück', () => {
    expect(ladeErinnerung()).toEqual({ an: false, stunde: 18 });
    localStorage.setItem(ERINNERUNG_KEY, JSON.stringify({ an: true, stunde: 7 }));
    expect(ladeErinnerung()).toEqual({ an: true, stunde: 7 });
    localStorage.setItem(ERINNERUNG_KEY, JSON.stringify({ an: true, stunde: 30 }));
    expect(ladeErinnerung().stunde).toBe(18);
  });
});
