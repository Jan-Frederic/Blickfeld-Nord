import { NOCHMAL_NOTIZ, durchlauf, ergebnis, letzteNotiz, markieren, minutenText, naechsteProbe, notizSetzen, probenDauer, uebertragen, zeitDazu, zeitJeSong } from './probe-modus';
import { probenVerlauf } from './song-stand';

const A = { title: 'Iris', artist: 'The Goo Goo Dolls' };
const B = { title: 'Africa', artist: 'Toto' };
const plan = () => ({ songs: [{ ...A, done: false }, { ...B, done: false }], notizen: '', punkte: [] });

describe('probe-modus', () => {
  it('Sitzt und Nochmal: geprobt, „nochmal üben“ nur ohne eigene Notiz', () => {
    let p = markieren(plan(), A, 'nochmal');
    expect(p.songs[0]).toMatchObject({ done: true, stand: 'nochmal', notiz: NOCHMAL_NOTIZ });
    p = markieren(p, A, 'sitzt');
    expect(p.songs[0]).toMatchObject({ done: true, stand: 'sitzt', notiz: undefined });
    p = markieren(notizSetzen(p, B, 'Bridge wackelt'), B, 'nochmal');
    expect(p.songs[1].notiz).toBe('Bridge wackelt');
  });

  it('Durchläufe und Zeit', () => {
    let p = durchlauf(durchlauf(plan(), A), A);
    expect(p.songs[0].durchlaeufe).toBe(2);
    p = durchlauf(durchlauf(p, A, -1), A, -1);
    expect(p.songs[0].durchlaeufe).toBeUndefined();
    p = zeitDazu(zeitDazu(zeitDazu(p, A, 90), A, 3), A, 30);
    expect(p.songs[0].zeit).toBe(120);
    // Song, der nicht auf dem Plan steht, bekommt keine Zeit
    expect(zeitDazu(p, { title: 'X', artist: 'Y' }, 60).songs.length).toBe(2);
  });

  it('Ergebnis und Übertragen auf die nächste Probe', () => {
    const p = markieren(markieren(plan(), A, 'sitzt'), B, 'nochmal');
    const e = ergebnis({ ...p, songs: [...p.songs, { title: 'Neu', artist: 'Z', done: false }] });
    expect([e.sitzt.length, e.nochmal.length, e.offen.length]).toEqual([1, 1, 1]);
    const ziel = { songs: [{ ...B, done: false }], notizen: '', punkte: [] };
    const r = uebertragen(ziel, [...e.nochmal, ...e.offen]);
    expect(r.neu).toBe(1);
    expect(r.plan.songs.map((s) => s.title)).toEqual(['Africa', 'Neu']);
    expect(r.plan.songs.every((s) => !s.done)).toBe(true);
  });

  it('nächste Probe, Dauer, Zeit je Song, Texte', () => {
    expect(naechsteProbe([{ date: '2027-01-15' }, { date: '2026-12-11' }, { date: '2026-10-23' }], '2026-11-20')?.date).toBe('2026-12-11');
    expect(probenDauer({ time: '18:00', endTime: '21:00' })).toBe(3 * 3600);
    expect(probenDauer({ time: '20:00' })).toBe(3 * 3600);
    expect(probenDauer({})).toBe(0);
    expect(zeitJeSong(3600, 4)).toBe(900);
    expect(zeitJeSong(-10, 4)).toBeUndefined();
    expect(minutenText(65 * 60)).toBe('1 h 5 min');
  });

  it('letzte Notiz aus einer früheren Probe', () => {
    const plaene = [
      { tag: '2026-10-23', songs: [{ ...A, notiz: 'Tempo zu schnell' }] },
      { tag: '2026-11-20', songs: [{ ...A, notiz: 'heute' }] },
      { tag: '2026-09-01', songs: [{ ...A, notiz: 'alt' }] },
    ];
    expect(letzteNotiz(plaene, A, '2026-11-20')).toEqual({ tag: '2026-10-23', notiz: 'Tempo zu schnell' });
  });

  it('Proben-Verlauf: Sitzt/Nochmal aus dem Probe-Modus gehen vor der Notiz', () => {
    const plaene = [
      { tag: '2026-10-23', songs: [{ ...A, done: true, stand: 'nochmal' as const, notiz: 'klappt' }] },
      { tag: '2026-11-20', songs: [{ ...A, done: true, stand: 'sitzt' as const, notiz: 'Tempo war noch wackelig' }] },
    ];
    expect(probenVerlauf(plaene, 'Iris|The Goo Goo Dolls', '2026-12-01').map((p) => p.stufe)).toEqual(['baustelle', 'sitzt']);
  });
});
