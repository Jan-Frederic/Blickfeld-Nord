import { abwechslung, gleicherOrt, hierGespielt } from './abwechslung';
import type { Show } from './band.service';

const show = (date: string, venue: string, city = 'Dingden'): Show => ({ date, venue, city, confirmed: true });

describe('Hier schon gespielt', () => {
  const alt = show('2026-04-30', 'Café Lotti – Tanz in den Mai');
  const neu = show('2027-04-30', 'Café Lotti');
  const anders = show('2026-08-22', 'Gasthof Küpper');

  it('findet frühere Auftritte am selben Ort und ihre Songs', () => {
    expect(gleicherOrt(alt, neu)).toBe(true);
    expect(gleicherOrt(anders, neu)).toBe(false);
    const setlists = new Map<Show, { title: string; artist: string }[] | ({ title: string; artist: string } | { pause: true })[]>([[alt, [{ title: 'Iris', artist: 'X' }, { pause: true as const }]], [anders, [{ title: 'Angels', artist: 'Y' }]]]);
    const g = hierGespielt(neu, [alt, neu, anders], (s) => setlists.get(s) ?? []);
    expect([...g]).toEqual([['Iris|X', '2026-04-30']]);
  });

  it('tauscht gegen Songs mit ähnlichem Tempo, die dort noch nicht liefen', () => {
    const repertoire = [{ title: 'Iris', artist: 'X' }, { title: 'Schnell', artist: 'Z' }, { title: 'Langsam', artist: 'Z' }];
    const bpm = (s: { title: string }) => ({ Iris: 80, Schnell: 150, Langsam: 76 })[s.title as 'Iris'];
    const r = abwechslung([{ title: 'Iris', artist: 'X' }, { pause: true }], new Map([['Iris|X', '2026-04-30']]), repertoire, bpm);
    expect(r.getauscht).toBe(1);
    expect(r.entries[0]).toEqual({ title: 'Langsam', artist: 'Z' });
  });
});
