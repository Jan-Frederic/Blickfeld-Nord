import { chromaAddieren, sicherheit, tonartAusChroma } from './tonart-erkennung';

// Chroma eines Dreiklangs mit Tonleiter: Grundton, Terz, Quinte betont
const profil = (toene: number[], stark: number[]) => Array.from({ length: 12 }, (_, i) => (stark.includes(i) ? 5 : toene.includes(i) ? 2 : 0.2));

describe('tonartAusChroma', () => {
  it('erkennt G-Dur (G H D betont, Tonleiter mit F#)', () => {
    const t = tonartAusChroma(profil([0, 2, 4, 6, 7, 9, 11], [7, 11, 2]));
    expect(t[0].tonart).toBe('G');
    expect(sicherheit(t)).not.toBe('unsicher');
  });

  it('erkennt a-Moll (A C E betont)', () => {
    expect(tonartAusChroma(profil([9, 11, 0, 2, 4, 5, 7], [9, 0, 4]))[0].tonart).toBe('Am');
  });

  it('Spektrum mit Ton bei 440 Hz landet bei A', () => {
    const chroma = Array(12).fill(0);
    const spektrum = new Float32Array(2048).fill(-100);
    const rate = 44100;
    spektrum[Math.round(440 / (rate / 2 / 2048))] = -20;
    chromaAddieren(chroma, spektrum, rate);
    expect(chroma.indexOf(Math.max(...chroma))).toBe(9);
  });
});
