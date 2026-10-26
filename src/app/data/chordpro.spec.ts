import { akkordTransponieren, blattTransponieren, chordproLesen, griffbild, halbtoene, tonartVerschieben } from './chordpro';

const BLATT = `{title: 80 Millionen}
{key: C}
# Kommentar wird ignoriert
{c: Intro 2x}
[C]Einer von [G]80 Mil[Am]lionen

{soc}
[F]Refrain [G/H]ohne Text am Ende [C]
{eoc}`;

describe('ChordPro', () => {
  it('liest Titel, Tonart, Kommentare, Abschnitte und Akkorde', () => {
    const b = chordproLesen(BLATT);
    expect(b.titel).toBe('80 Millionen');
    expect(b.tonart).toBe('C');
    expect(b.zeilen[0]).toEqual({ art: 'kommentar', text: 'Intro 2x' });
    expect(b.zeilen[1]).toEqual({
      art: 'text',
      teile: [{ akkord: 'C', text: 'Einer von ' }, { akkord: 'G', text: '80 Mil' }, { akkord: 'Am', text: 'lionen' }],
    });
    expect(b.zeilen[2]).toEqual({ art: 'leer' });
    expect(b.zeilen[3]).toEqual({ art: 'abschnitt', text: 'Refrain' });
    const letzte = b.zeilen[4];
    expect(letzte.art === 'text' && letzte.teile.at(-1)).toEqual({ akkord: 'C', text: '' });
  });

  it('Text vor dem ersten Akkord bleibt erhalten', () => {
    expect(chordproLesen('Ein [D]Lied').zeilen[0]).toEqual({ art: 'text', teile: [{ text: 'Ein ' }, { akkord: 'D', text: 'Lied' }] });
  });

  it('transponiert Akkorde mit Bass und Zusätzen', () => {
    expect(akkordTransponieren('C', 2, false)).toBe('D');
    expect(akkordTransponieren('Am7', 3, false)).toBe('Cm7');
    expect(akkordTransponieren('G/H', 2, false)).toBe('A/C#');
    expect(akkordTransponieren('G/B', 2, false)).toBe('A/C#');
    expect(akkordTransponieren('E', 1, true)).toBe('F');
    expect(akkordTransponieren('D', -1, true)).toBe('Db');
    expect(akkordTransponieren('N.C.', 3, false)).toBe('N.C.');
  });

  it('rechnet Abstände und Zieltonarten', () => {
    expect(halbtoene('C', 'D')).toBe(2);
    expect(halbtoene('G', 'C')).toBe(5);
    expect(halbtoene('C', 'A')).toBe(-3);
    expect(tonartVerschieben('C', -2)).toBe('Bb');
    expect(tonartVerschieben('Em', 2)).toBe('F#m');
  });

  it('Griffbild: Band spielt in E mit Capo 2, Blatt in C → Griffe in D', () => {
    expect(griffbild('C', 'E', 2)).toEqual({ schritte: 2, griffTonart: 'D' });
    expect(griffbild('C', 'C', 0)).toEqual({ schritte: 0, griffTonart: 'C' });
    expect(griffbild(undefined, 'E', 2)).toEqual({ schritte: 0 });
  });

  it('transponiert ein ganzes Blatt in b-Schreibweise, wenn die Zieltonart es verlangt', () => {
    const b = blattTransponieren(chordproLesen('{key: C}\n[C]a [G]b [E]c'), -2);
    expect(b.tonart).toBe('Bb');
    expect(b.zeilen[0].art === 'text' && b.zeilen[0].teile.map((t) => t.akkord)).toEqual(['Bb', 'F', 'D']);
  });
});
