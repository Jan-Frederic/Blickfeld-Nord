import { lageAus, wetterHinweis } from './wetter-warnung';

describe('wetter-warnung', () => {
  it('Regen, Kälte, Wind → Hinweis und Packliste', () => {
    expect(wetterHinweis({ regen: 20, tief: 8, wind: 15 })).toBeNull();
    const h = wetterHinweis({ regen: 70, tief: 1, wind: 45 })!;
    expect(h.text).toBe('Regen gemeldet (70 %), kalt (1 °C), windig (45 km/h)');
    expect(h.packen).toContain('Pavillon / Regenschutz');
    expect(h.packen).toContain('Warme Kleidung, Handschuhe (fingerlos)');
  });

  it('Lage rund um den Auftritt (eine Stunde vorher bis drei danach)', () => {
    const time = Array.from({ length: 24 }, (_, h) => `2026-12-04T${String(h).padStart(2, '0')}:00`);
    const data = {
      hourly: {
        time,
        temperature_2m: time.map((_, h) => 10 - h / 3),
        precipitation_probability: time.map((_, h) => (h === 12 ? 90 : h === 19 ? 60 : 10)),
        wind_speed_10m: time.map(() => 12),
      },
    };
    expect(lageAus(data, '18:00')).toEqual({ regen: 60, tief: 3, wind: 12 });
  });
});
