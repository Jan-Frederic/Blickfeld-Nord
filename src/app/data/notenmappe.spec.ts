import { chordproLesen } from './chordpro';
import { akkordSatz } from './notenmappe';

describe('Notenmappe – Akkordblatt setzen', () => {
  it('stellt Akkorde genau über die Silbe und behält Abschnitte und Kommentare', () => {
    const z = akkordSatz(chordproLesen('{soc}\n[C]Einer von [G]80 Mil[Am]lionen\n{c: 2x}\n\n[D] [G]'));
    const akkord = z.find((x) => x.art === 'akkord')!.text;
    const text = z.find((x) => x.art === 'text')!.text;
    expect(text).toBe('Einer von 80 Millionen');
    expect(akkord.indexOf('G')).toBe(text.indexOf('80'));
    expect(akkord.indexOf('Am')).toBe(text.indexOf('lionen'));
    expect(z.map((x) => x.art)).toContain('kommentar');
    expect(z.map((x) => x.art)).toContain('leer');
    // Zeile nur aus Akkorden
    expect(z.at(-1)).toEqual({ art: 'akkord', text: 'D G' });
  });
});
