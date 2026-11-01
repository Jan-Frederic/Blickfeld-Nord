// Tonart hören (Song-Dialog): aus dem Mikrofon-Spektrum ein Tonklassen-Profil (Chroma, 12 Werte C … H) sammeln und
// mit den Krumhansl-Kessler-Profilen aller 24 Dur- und Moll-Tonarten vergleichen (Korrelation). Ohne Angular-Abhängigkeiten.

const DUR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MOLL = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
/** Tonart-Namen wie in songinfo.ts */
export const GRUNDTOENE = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'H'];

function korrelation(a: number[], b: number[]): number {
  const ma = a.reduce((s, x) => s + x, 0) / a.length;
  const mb = b.reduce((s, x) => s + x, 0) / b.length;
  let z = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    z += (a[i] - ma) * (b[i] - mb);
    na += (a[i] - ma) ** 2;
    nb += (b[i] - mb) ** 2;
  }
  return na && nb ? z / Math.sqrt(na * nb) : 0;
}

export interface TonartTreffer {
  tonart: string;
  /** Korrelation −1 … 1 */
  wert: number;
}

/** die wahrscheinlichsten Tonarten zu einem Chroma-Profil, beste zuerst */
export function tonartAusChroma(chroma: number[]): TonartTreffer[] {
  const out: TonartTreffer[] = [];
  for (let g = 0; g < 12; g++) {
    const gedreht = (p: number[]) => p.map((_, i) => p[(i - g + 12) % 12]);
    out.push({ tonart: GRUNDTOENE[g], wert: korrelation(chroma, gedreht(DUR)) });
    out.push({ tonart: GRUNDTOENE[g] + 'm', wert: korrelation(chroma, gedreht(MOLL)) });
  }
  return out.sort((a, b) => b.wert - a.wert);
}

/**
 * Ein Spektrum (Dezibel je Frequenzband, z. B. AnalyserNode.getFloatFrequencyData) ins Chroma-Profil addieren:
 * nur 65–2000 Hz, Bänder unter `schwelle` dB zählen nicht; Gewicht = Lautstärke über der Schwelle.
 */
export function chromaAddieren(chroma: number[], spektrum: Float32Array, rate: number, schwelle = -70): void {
  const breite = rate / 2 / spektrum.length;
  for (let i = 1; i < spektrum.length; i++) {
    const f = i * breite;
    if (f < 65 || f > 2000) continue;
    const db = spektrum[i];
    if (!(db > schwelle)) continue;
    const ton = Math.round(12 * Math.log2(f / 440) + 69) % 12; // MIDI-Nummer → Tonklasse (0 = C)
    chroma[ton] += db - schwelle;
  }
}

/** sicher genug? Abstand der besten zur zweitbesten (ohne die parallele Tonart) */
export function sicherheit(treffer: TonartTreffer[]): 'sicher' | 'eher' | 'unsicher' {
  if (!treffer.length || treffer[0].wert < 0.5) return 'unsicher';
  return treffer[0].wert - treffer[1].wert > 0.08 ? 'sicher' : 'eher';
}
