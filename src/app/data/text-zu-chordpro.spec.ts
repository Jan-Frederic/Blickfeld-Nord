import { chordproLesen } from './chordpro';
import { istAkkordText, istAkkordzeile, istChordPro, textZuChordPro } from './text-zu-chordpro';

describe('Text → ChordPro', () => {
  it('erkennt Akkordzeilen – auch H, Zusätze, Bass, Taktstriche und Wiederholungen', () => {
    expect(istAkkordzeile('G       D      Em   C')).toBe(true);
    expect(istAkkordzeile('Hm7  Cmaj7/G  F#m7b5  Asus4  E7sus4  C6/9 N.C.')).toBe(true);
    expect(istAkkordzeile('| G  D | Em  C |  x2')).toBe(true);
    expect(istAkkordzeile('(G)  (D)')).toBe(true);
    expect(istAkkordzeile('Am I wrong')).toBe(false);
    expect(istAkkordzeile('| x2 |')).toBe(false);
  });

  it('setzt die Akkorde spaltengenau in den Text, reine Akkordzeilen bleiben, Abschnitte werden {comment}', () => {
    const u = textZuChordPro(['[Intro]', 'G  D  Em  C', '', '[Verse 1]', 'G            D', 'Einer von 80 Millionen', '', 'Chorus:', '  Em  C', '  Und ich', ''].join('\n'));
    expect(u.text).toBe(['{comment: Intro}', '[G] [D] [Em] [C]', '', '{comment: Strophe 1}', '[G]Einer von 80 [D]Millionen', '', '{comment: Refrain}', '  [Em]Und [C]ich'].join('\n'));
    expect(u).toMatchObject({ zusammengefuehrt: 2, akkordzeilen: 1, abschnitte: 3 });
    // Tabs zählen bis zur nächsten Viererspalte
    expect(textZuChordPro('G\tD\nabcdefgh').text).toBe('[G]abcd[D]efgh');
  });

  it('Metadaten: Titel/Interpret vom Song, Tonart und Capo aus dem Text; „Band of Gold“ bleibt Text', () => {
    const u = textZuChordPro(['Key: Am', 'Capo 2nd fret', 'Intro: Am F C G', 'Band of gold'].join('\n'), { title: 'Iris', artist: 'Goo Goo Dolls' });
    expect(u.text).toBe(['{title: Iris}', '{artist: Goo Goo Dolls}', '{key: Am}', '{capo: 2}', '', '{comment: Intro}', '[Am] [F] [C] [G]', 'Band of gold'].join('\n'));
    const blatt = chordproLesen(u.text);
    expect(blatt).toMatchObject({ titel: 'Iris', interpret: 'Goo Goo Dolls', tonart: 'Am', capo: 2 });
  });

  it('erkennt, ob schon ChordPro bzw. Akkord-Text vorliegt', () => {
    expect(istChordPro('{title: X}\n[G]Hallo')).toBe(true);
    expect(istChordPro('G  D\nHallo Welt')).toBe(false);
    expect(istChordPro('[Chorus]\nG  D\nHallo Welt')).toBe(false);
    expect(istAkkordText('G  D\nHallo Welt\nEm  C\nTschüss')).toBe(true);
    expect(istAkkordText('Nur Text\nohne Akkorde')).toBe(false);
  });
});
