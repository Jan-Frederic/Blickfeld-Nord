import { Entry } from './setlist-data';
import { glaetten, istSprung, quintAbstand, quintPosition, spruenge, ueberleitung } from './tonart-uebergang';

const tonarten: Record<string, string> = { A: 'C', B: 'F#', C: 'G', D: 'Am', E: 'Ab', F: 'E' };
const song = (title: string) => ({ title, artist: 'X' });
const tonart = (s: { title: string }) => tonarten[s.title];

describe('Tonart-Übergänge', () => {
  it('liest Dur, Moll und Vorzeichen', () => {
    expect(quintPosition('C')).toBe(0);
    expect(quintPosition('G')).toBe(1);
    expect(quintPosition('F')).toBe(11);
    expect(quintPosition('Am')).toBe(0);
    expect(quintPosition('F#m')).toBe(quintPosition('A'));
    expect(quintPosition('Bb')).toBe(quintPosition('A#'));
    expect(quintPosition('H')).toBe(5);
    expect(quintPosition('')).toBeUndefined();
    expect(quintPosition('X')).toBeUndefined();
  });

  it('misst den Abstand im Quintenzirkel', () => {
    expect(quintAbstand('C', 'G')).toBe(1);
    expect(quintAbstand('C', 'F#')).toBe(6);
    expect(quintAbstand('Am', 'C')).toBe(0);
    expect(quintAbstand('Ab', 'E')).toBe(4);
    expect(quintAbstand('C', undefined)).toBeUndefined();
    expect(istSprung('Ab', 'E')).toBe(true);
    expect(istSprung('G', 'D')).toBe(false);
  });

  it('schlägt den Dominantseptakkord der Zieltonart als Überleitung vor', () => {
    expect(ueberleitung('E')).toBe('H7');
    expect(ueberleitung('C')).toBe('G7');
    expect(ueberleitung('Am')).toBe('E7');
    expect(ueberleitung('Ab')).toBe('Eb7');
    expect(ueberleitung('F')).toBe('C7');
    expect(ueberleitung('F#m')).toBe('C#7');
    expect(ueberleitung('Gb')).toBe('Db7');
    expect(ueberleitung('C#m')).toBe('G#7');
    expect(ueberleitung('Hm')).toBe('F#7');
    expect(ueberleitung('X')).toBeUndefined();
  });

  it('zählt Sprünge nur innerhalb eines Sets', () => {
    expect(spruenge([song('A'), song('B'), { pause: true }, song('E'), song('F')], tonart)).toBe(2);
    expect(spruenge([song('A'), { pause: true }, song('B')], tonart)).toBe(0);
  });

  it('glättet die Reihenfolge, Opener, Schluss und Pausen bleiben', () => {
    const vorher: Entry[] = [song('A'), song('B'), song('D'), song('C'), song('F'), { pause: true }, song('E')];
    const nachher = glaetten(vorher, tonart);
    // F# liegt nur nahe bei E – ein Sprung bleibt unvermeidlich
    expect(spruenge(vorher, tonart)).toBe(2);
    expect(spruenge(nachher, tonart)).toBe(1);
    const titel = nachher.map((e) => ('pause' in e ? '|' : e.title)).join('');
    expect(titel.startsWith('A')).toBe(true);
    expect(titel.endsWith('F|E')).toBe(true);
    expect([...titel].sort().join('')).toBe([...'ABDCF|E'].sort().join(''));
  });

  it('findet auch Folgen, die schrittweises Weitergehen verpasst', () => {
    // F, Ab, A, E, C, C: der nächstgelegene Schritt von F aus (C) führt in zwei Sprünge, optimal ist einer
    const t: Record<string, string> = { a: 'F', b: 'Ab', c: 'A', d: 'E', e: 'C', f: 'C' };
    const vorher: Entry[] = [...'abcdef'].map(song);
    const nachher = glaetten(vorher, (s) => t[s.title]);
    expect(spruenge(nachher, (s) => t[s.title])).toBe(1);
  });

  it('glättet auch große Sets schrittweise', () => {
    const ks = ['C', 'F#', 'G', 'Db', 'D', 'Ab', 'A', 'Eb', 'E', 'Bb', 'H', 'F', 'C', 'F#', 'G'];
    const vorher: Entry[] = ks.map((_, i) => song(String(i)));
    const t = (s: { title: string }) => ks[Number(s.title)];
    expect(spruenge(glaetten(vorher, t), t)).toBeLessThan(spruenge(vorher, t));
  });

  it('lässt die Reihenfolge, wenn nichts besser wird', () => {
    const t: Record<string, string> = { a: 'C', b: 'G', c: 'D', d: 'A' };
    const vorher: Entry[] = [...'abcd'].map(song);
    expect(glaetten(vorher, (s) => t[s.title])).toEqual(vorher);
  });
});
