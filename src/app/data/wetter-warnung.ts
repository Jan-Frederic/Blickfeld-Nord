// Wetter-Warnung am Vortag (Backstage → Benachrichtigungen): Regen, Kälte oder Wind zur Auftrittszeit (open-meteo) – mit dem,
// was dann zusätzlich eingepackt werden sollte; die Punkte landen auf der Packliste des Auftritts.
// Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.
export interface WetterLage {
  /** höchste Regenwahrscheinlichkeit (%) rund um den Auftritt */
  regen: number;
  /** tiefste Temperatur (°C) rund um den Auftritt */
  tief: number;
  /** stärkster Wind (km/h) */
  wind: number;
}

export interface WetterHinweis {
  text: string;
  packen: string[];
}

export function wetterHinweis(w: WetterLage): WetterHinweis | null {
  const teile: string[] = [];
  const packen: string[] = [];
  if (w.regen >= 50) {
    teile.push(`Regen gemeldet (${w.regen} %)`);
    packen.push('Pavillon / Regenschutz', 'Abdeckplanen fürs Equipment');
  }
  if (w.tief <= 3) {
    teile.push(`kalt (${w.tief} °C)`);
    packen.push('Warme Kleidung, Handschuhe (fingerlos)', 'Heizstrahler oder Wärmekissen');
  }
  if (w.wind >= 40) {
    teile.push(`windig (${w.wind} km/h)`);
    packen.push('Gewichte / Spanngurte für Pavillon und Ständer');
  }
  return teile.length ? { text: teile.join(', '), packen } : null;
}

/** Lage aus der open-meteo-Antwort: Stunden ab einer Stunde vor Beginn bis drei Stunden danach */
export function lageAus(data: { hourly: { time: string[]; temperature_2m: number[]; precipitation_probability: (number | null)[]; wind_speed_10m: number[] } }, beginn = '18:00'): WetterLage | null {
  const h = Number(beginn.slice(0, 2));
  const idx = data.hourly.time.map((t, i) => ({ t: Number(t.slice(11, 13)), i })).filter(({ t }) => t >= h - 1 && t <= h + 3).map(({ i }) => i);
  if (!idx.length) return null;
  return {
    regen: Math.max(...idx.map((i) => data.hourly.precipitation_probability[i] ?? 0)),
    tief: Math.round(Math.min(...idx.map((i) => data.hourly.temperature_2m[i]))),
    wind: Math.round(Math.max(...idx.map((i) => data.hourly.wind_speed_10m[i]))),
  };
}
