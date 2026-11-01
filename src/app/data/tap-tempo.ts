// Tap-Tempo (Song-Dialog, Songliste „schnell eintragen“): im Takt tippen, ab dem 4. Tippen gilt das Tempo aus den
// letzten (bis zu 8) Abständen; mehr als 2 Sekunden Pause beginnt neu. Ohne Angular-Abhängigkeiten.
export class TapTempo {
  private zeiten: number[] = [];
  /** wie oft schon getippt (seit dem letzten Neubeginn) */
  get zahl(): number {
    return this.zeiten.length;
  }
  /** Tippen zum Zeitpunkt `jetzt` (ms) – liefert das Tempo, sobald es feststeht (40–240 bpm), sonst null */
  tippen(jetzt: number): number | null {
    if (jetzt - (this.zeiten.at(-1) ?? -Infinity) > 2000) this.zeiten = [];
    this.zeiten = [...this.zeiten, jetzt].slice(-9);
    if (this.zeiten.length < 4) return null;
    const bpm = Math.round(60000 / ((this.zeiten.at(-1)! - this.zeiten[0]) / (this.zeiten.length - 1)));
    return bpm >= 40 && bpm <= 240 ? bpm : null;
  }
  neu(): void {
    this.zeiten = [];
  }
}
