import { SpeicherUmgebung, dauerhaftAnfragen } from './speicher';

describe('Dauerhaft speichern anfragen', () => {
  const TAG = 864e5;
  function umgebung(t: Partial<SpeicherUmgebung> & { schon?: boolean; ergebnis?: boolean } = {}): SpeicherUmgebung & { gefragt: number; gemerkt: number } {
    const u: SpeicherUmgebung & { gefragt: number; gemerkt: number } = {
      gefragt: 0,
      gemerkt: 0,
      installiert: false,
      firefox: false,
      zuletzt: 0,
      storage: { persisted: async () => !!t.schon, persist: async (): Promise<boolean> => (u.gefragt++, t.ergebnis ?? true) },
      merken: (z: number) => (u.gemerkt = z),
      ...t,
    };
    return u;
  }

  it('fragt still nach und merkt sich den Zeitpunkt', async () => {
    const u = umgebung();
    expect(await dauerhaftAnfragen(u, 1000)).toBe(true);
    expect(u.gefragt).toBe(1);
    expect(u.gemerkt).toBe(1000);
  });

  it('schon dauerhaft: nicht noch einmal fragen', async () => {
    const u = umgebung({ schon: true });
    expect(await dauerhaftAnfragen(u)).toBe(true);
    expect(u.gefragt).toBe(0);
  });

  it('höchstens alle 30 Tage', async () => {
    const u = umgebung({ zuletzt: 10 * TAG });
    expect(await dauerhaftAnfragen(u, 20 * TAG)).toBeUndefined();
    expect(await dauerhaftAnfragen(u, 41 * TAG)).toBe(true);
  });

  it('Firefox im Tab (würde nachfragen): nicht von selbst – installiert schon', async () => {
    expect(await dauerhaftAnfragen(umgebung({ firefox: true }))).toBeUndefined();
    expect(await dauerhaftAnfragen(umgebung({ firefox: true, installiert: true }))).toBe(true);
  });

  it('Browser ohne Storage API: nichts tun', async () => {
    expect(await dauerhaftAnfragen(umgebung({ storage: undefined }))).toBeUndefined();
  });
});
