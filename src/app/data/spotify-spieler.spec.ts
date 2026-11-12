import { vi } from 'vitest';
import { SpotifyStand } from './spotify-remote';
import { SpotifySpieler } from './spotify-spieler';
import { markeSetzen } from './sprungmarken';

// Regeln der Spotify-Steuerung (data/spotify-spieler.ts) mit einem Ersatz für Spotify und vorgespulter Zeit – die
// Fälle stammen aus echten Diagnose-Protokollen (Befehl angenommen, aber nichts spielt; Weiterblättern; Pause …).
function ersatz() {
  const a = {
    spiele: [] as [string, number][],
    pausen: 0,
    spruenge: [] as number[],
    stand: null as SpotifyStand | null,
    /** wann der Stand zuletzt gesetzt wurde – solange er „spielt“, läuft die gemeldete Stelle weiter wie bei Spotify */
    seit: 0,
    spielen: async (t: string, ab = 0) => void a.spiele.push([t, ab]),
    pause: async () => void a.pausen++,
    weiter: async () => undefined,
    // wie Spotify: nach dem Sprung meldet der Stand die neue Stelle
    springen: async (ms: number) => {
      a.spruenge.push(ms);
      if (a.stand) a.stand = { ...a.stand, position: ms };
      a.seit = Date.now();
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    standAbfragen: async () => (a.stand?.spielt ? { ...a.stand, position: a.stand.position + (Date.now() - a.seit) } : a.stand),
  };
  return a;
}
const laeuft = (trackId: string, position = 1000): SpotifyStand => ({ spielt: true, trackId, auchId: null, position, dauer: 200_000, geraet: 'Handy' });
const stumm: SpotifyStand = { spielt: false, trackId: null, auchId: null, position: 0, dauer: 0, geraet: 'Handy' };

describe('Spotify-Steuerung', () => {
  let s: SpotifySpieler;
  let a: ReturnType<typeof ersatz>;
  const zeit = (ms: number) => vi.advanceTimersByTimeAsync(ms);

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
    s = new SpotifySpieler();
    s.start();
    a = ersatz();
    s.antriebSetzen({ spielen: a.spielen, pause: a.pause, weiter: a.weiter, springen: a.springen, stand: a.standAbfragen });
    localStorage.setItem('bn-spotify-token', JSON.stringify({ access: 'x', refresh: 'x', bis: 9e15 }));
    s.songSetzen('t1', 200_000);
  });
  afterEach(() => {
    s.ende();
    vi.useRealTimers();
  });

  /** ▶ und Spotify bestätigt, dass der Song läuft */
  async function abspielen(track = 't1', position = 1000) {
    a.stand = laeuft(track, position);
    a.seit = Date.now();
    await s.umschalten();
    await zeit(800);
  }

  it('zeigt nach ▶ „startet“, bis Spotify den Song als laufend meldet', async () => {
    a.stand = stumm;
    await s.umschalten();
    expect(a.spiele).toEqual([['t1', 0]]);
    expect(s.startet()).toBe(true);
    expect(s.spielt()).toBe(false);
    a.stand = laeuft('t1');
    await zeit(800);
    expect(s.startet()).toBe(false);
    expect(s.spielt()).toBe(true);
    expect(s.aktiv()).toBe(true);
    expect(localStorage.getItem('bn-spotify-ok')).toBeTruthy();
  });

  it('Befehl angenommen, aber nichts spielt: Hinweis mit „Spotify öffnen“, kein Fortschritt', async () => {
    a.stand = stumm;
    await s.umschalten();
    await zeit(6000);
    expect(s.spielt()).toBe(false);
    expect(s.position()).toBe(0);
    expect(s.hinweis()).toContain('spielt aber nicht');
    expect(s.spotifyOeffnen()).toBe(true);
  });

  it('Weiterblättern spielt den nächsten Song – nach eigenem ⏸ nicht mehr', async () => {
    await abspielen();
    s.songSetzen('t2', 180_000);
    await zeit(0);
    expect(a.spiele.at(-1)).toEqual(['t2', 0]);
    a.stand = laeuft('t2');
    await zeit(800);
    await s.umschalten();
    expect(a.pausen).toBe(1);
    s.songSetzen('t3', 150_000);
    await zeit(1000);
    expect(a.spiele.map(([t]) => t)).toEqual(['t1', 't2']);
  });

  it('Song ohne Spotify-Track: der vorige wird angehalten', async () => {
    await abspielen();
    s.songSetzen(undefined);
    await zeit(0);
    expect(a.pausen).toBe(1);
  });

  it('▶ beginnt am „Einsatz“, eine Marke antippen springt dorthin', async () => {
    markeSetzen('t4', 'Einsatz', 8_000);
    markeSetzen('t4', 'Refrain', 61_000);
    s.songSetzen('t4', 200_000);
    a.stand = laeuft('t4', 8_000);
    await s.umschalten();
    expect(a.spiele).toEqual([['t4', 8_000]]);
    await zeit(800);
    await s.zuMarke(s.marken()[1]);
    expect(a.spruenge).toEqual([61_000]);
  });

  it('setzt eine Marke an der aktuellen Stelle (für die Band gespeichert)', async () => {
    await abspielen('t1', 30_000);
    s.markeHier('Solo');
    expect(s.marken()).toEqual([{ n: 'Solo', ms: expect.any(Number) }]);
    expect(s.marken()[0].ms).toBeGreaterThanOrEqual(30_000);
    expect(JSON.parse(localStorage.getItem('bn-sprungmarken')!)['t1'].marken).toHaveLength(1);
  });

  it('Schleife A–B springt am Ende zurück an den Anfang, ein dritter Tipp hebt sie auf', async () => {
    await abspielen('t1', 10_000);
    s.schleifeTippen();
    await zeit(3000);
    s.schleifeTippen();
    const sch = s.schleife()!;
    expect(sch.b! - sch.a).toBeGreaterThanOrEqual(2000);
    await zeit(1500);
    expect(a.spruenge).toContain(sch.a);
    s.schleifeTippen();
    expect(s.schleife()).toBeNull();
  });

  it('Übergang: letzte 15 s, dann blättert der Modus weiter und der nächste Song beginnt am Einsatz – auch ohne „mitspielen“', async () => {
    markeSetzen('t2', 'Einsatz', 4_000);
    s.mitspielenSetzen(false);
    s.naechster.set({ track: 't2', titel: 'Zwei' });
    await abspielen();
    await s.uebergangStarten();
    expect(a.spruenge).toEqual([185_000]);
    expect(s.uebergang()).toBe(true);
    const vorher = s.weiterBitte();
    await zeit(15_000);
    expect(s.weiterBitte()).toBe(vorher + 1);
    expect(s.uebergang()).toBe(false);
    // der Bühnen-Modus blättert weiter und meldet den neuen Song
    s.songSetzen('t2', 180_000);
    await zeit(0);
    expect(a.spiele.at(-1)).toEqual(['t2', 4_000]);
  });

  it('von Hand weitergeblättert während eines Übergangs: kein erzwungenes Abspielen', async () => {
    s.mitspielenSetzen(false);
    s.naechster.set({ track: 't2', titel: 'Zwei' });
    await abspielen();
    await s.uebergangStarten();
    s.songSetzen('t2', 180_000);
    await zeit(0);
    expect(a.spiele.map(([t]) => t)).toEqual(['t1']);
    expect(s.uebergang()).toBe(false);
  });

  it('Songwechsel hebt die Schleife auf', async () => {
    await abspielen();
    s.schleifeTippen();
    s.songSetzen('t2', 100_000);
    expect(s.schleife()).toBeNull();
  });
});
