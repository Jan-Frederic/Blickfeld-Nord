// Stimmgerät: Tonhöhe aus einem Stück Mikrofon-Signal (Autokorrelation) und der nächste Ton mit Abweichung in Cent.
// Deutsche Tonnamen (B = B♭, H = B natural). Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.

const NAMEN = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B', 'H'];

/** Grundfrequenz in Hz (40–1500 Hz) oder null bei Stille bzw. ohne klaren Ton */
export function tonhoehe(puffer: Float32Array, rate: number): number | null {
  const n = puffer.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += puffer[i] * puffer[i];
  if (Math.sqrt(rms / n) < 0.01) return null;
  const minLag = Math.floor(rate / 1500);
  const maxLag = Math.min(Math.floor(rate / 40), n - 1);
  // normierte Autokorrelation je Verschiebung
  const r = new Float32Array(maxLag + 2);
  for (let lag = minLag; lag <= maxLag + 1; lag++) {
    let s = 0;
    let e1 = 0;
    let e2 = 0;
    for (let i = 0; i + lag < n; i++) {
      s += puffer[i] * puffer[i + lag];
      e1 += puffer[i] * puffer[i];
      e2 += puffer[i + lag] * puffer[i + lag];
    }
    r[lag] = e1 && e2 ? s / Math.sqrt(e1 * e2) : 0;
  }
  // erste Verschiebung, deren Korrelation fast so hoch ist wie die beste (vermeidet Oktavfehler)
  let best = 0;
  for (let lag = minLag; lag <= maxLag; lag++) best = Math.max(best, r[lag]);
  if (best < 0.8) return null;
  let t = minLag;
  for (let lag = minLag + 1; lag <= maxLag; lag++) {
    if (r[lag] >= best * 0.95 && r[lag] >= r[lag - 1] && r[lag] >= r[lag + 1]) {
      t = lag;
      break;
    }
  }
  // Feinbestimmung zwischen den Abtastwerten (Parabel durch drei Punkte)
  const a = r[t - 1] ?? 0;
  const b = r[t];
  const c = r[t + 1] ?? 0;
  const d = a - 2 * b + c;
  const genau = d ? t + (a - c) / (2 * d) : t;
  return rate / genau;
}

export interface Ton {
  name: string;
  oktave: number;
  /** Abweichung vom nächsten Ton in Cent (−50 … +50) */
  cent: number;
  /** Frequenz des nächsten Tons */
  ziel: number;
}

/** nächster Ton zu einer Frequenz (Kammerton a′ = 440 Hz) */
export function tonVon(frequenz: number, kammerton = 440): Ton {
  const halbtoene = 12 * Math.log2(frequenz / kammerton) + 57; // 57 = A4 ab C0
  const nr = Math.round(halbtoene);
  return {
    name: NAMEN[((nr % 12) + 12) % 12],
    oktave: Math.floor(nr / 12),
    cent: Math.round((halbtoene - nr) * 100),
    ziel: kammerton * 2 ** ((nr - 57) / 12),
  };
}
