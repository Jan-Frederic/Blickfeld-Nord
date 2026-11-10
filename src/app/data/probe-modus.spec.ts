import { probeErgebnisNachricht, type ProbePlan, generalprobe, probeNachricht, vorbereitungFaellig, NOCHMAL_NOTIZ, durchlauf, ergebnis, letzteNotiz, markieren, markierenPerson, minutenText, naechsteProbe, notizSetzen, probenDauer, uebertragen, zeitDazu, zeitJeSong, generalprobeAblauf } from './probe-modus';
import { probenVerlauf } from './song-stand';

const A = { title: 'Iris', artist: 'The Goo Goo Dolls' };
const B = { title: 'Africa', artist: 'Toto' };
const plan = (): ProbePlan => ({ songs: [{ ...A, done: false }, { ...B, done: false }], notizen: '', punkte: [] });

describe('probe-modus', () => {
  it('Sitzt und Nochmal: geprobt, „nochmal üben“ nur ohne eigene Notiz', () => {
    let p = markieren(plan(), A, 'nochmal');
    expect(p.songs[0]).toMatchObject({ done: true, stand: 'nochmal', notiz: NOCHMAL_NOTIZ });
    p = markieren(p, A, 'sitzt');
    expect(p.songs[0]).toMatchObject({ done: true, stand: 'sitzt', notiz: undefined });
    p = markieren(notizSetzen(p, B, 'Bridge wackelt'), B, 'nochmal');
    expect(p.songs[1].notiz).toBe('Bridge wackelt');
  });

  it('Durchläufe und Zeit', () => {
    let p = durchlauf(durchlauf(plan(), A), A);
    expect(p.songs[0].durchlaeufe).toBe(2);
    p = durchlauf(durchlauf(p, A, -1), A, -1);
    expect(p.songs[0].durchlaeufe).toBeUndefined();
    p = zeitDazu(zeitDazu(zeitDazu(p, A, 90), A, 3), A, 30);
    expect(p.songs[0].zeit).toBe(120);
    // Song, der nicht auf dem Plan steht, bekommt keine Zeit
    expect(zeitDazu(p, { title: 'X', artist: 'Y' }, 60).songs.length).toBe(2);
  });

  it('Ergebnis und Übertragen auf die nächste Probe', () => {
    const p = markieren(markieren(plan(), A, 'sitzt'), B, 'nochmal');
    const e = ergebnis({ ...p, songs: [...p.songs, { title: 'Neu', artist: 'Z', done: false }] });
    expect([e.sitzt.length, e.nochmal.length, e.offen.length]).toEqual([1, 1, 1]);
    const ziel = { songs: [{ ...B, done: false }], notizen: '', punkte: [] };
    const r = uebertragen(ziel, [...e.nochmal, ...e.offen]);
    expect(r.neu).toBe(1);
    expect(r.plan.songs.map((s) => s.title)).toEqual(['Africa', 'Neu']);
    expect(r.plan.songs.every((s) => !s.done)).toBe(true);
  });

  it('nächste Probe, Dauer, Zeit je Song, Texte', () => {
    expect(naechsteProbe([{ date: '2027-01-15' }, { date: '2026-12-11' }, { date: '2026-10-23' }], '2026-11-20')?.date).toBe('2026-12-11');
    expect(probenDauer({ time: '18:00', endTime: '21:00' })).toBe(3 * 3600);
    expect(probenDauer({ time: '20:00' })).toBe(3 * 3600);
    expect(probenDauer({})).toBe(0);
    expect(zeitJeSong(3600, 4)).toBe(900);
    expect(zeitJeSong(-10, 4)).toBeUndefined();
    expect(minutenText(65 * 60)).toBe('1 h 5 min');
  });

  it('letzte Notiz aus einer früheren Probe', () => {
    const plaene = [
      { tag: '2026-10-23', songs: [{ ...A, notiz: 'Tempo zu schnell' }] },
      { tag: '2026-11-20', songs: [{ ...A, notiz: 'heute' }] },
      { tag: '2026-09-01', songs: [{ ...A, notiz: 'alt' }] },
    ];
    expect(letzteNotiz(plaene, A, '2026-11-20')).toEqual({ tag: '2026-10-23', notiz: 'Tempo zu schnell' });
  });

  it('Proben-Verlauf: Sitzt/Nochmal aus dem Probe-Modus gehen vor der Notiz', () => {
    const plaene = [
      { tag: '2026-10-23', songs: [{ ...A, done: true, stand: 'nochmal' as const, notiz: 'klappt' }] },
      { tag: '2026-11-20', songs: [{ ...A, done: true, stand: 'sitzt' as const, notiz: 'Tempo war noch wackelig' }] },
    ];
    expect(probenVerlauf(plaene, 'Iris|The Goo Goo Dolls', '2026-12-01').map((p) => p.stufe)).toEqual(['baustelle', 'sitzt']);
  });

  it('Nachricht an die Band', () => {
    const p = { ...plan(), punkte: [{ text: 'Kabel besorgen', done: false }, { text: 'erledigt', done: true }], notizen: 'Bitte pünktlich' };
    const t = probeNachricht({ date: '2026-11-20', time: '18:00', endTime: '21:00', place: 'Dingden' }, markieren(p, B, 'nochmal'), (s) => (s.title === 'Iris' ? 'D · 155 bpm' : ''), (s) => (s.title === 'Iris' ? 'https://open.spotify.com/track/x' : undefined));
    expect(t).toContain('🎸 Probe Freitag, 20. November · 18:00–21:00 Uhr, Dingden');
    expect(t).toContain('1. Iris – The Goo Goo Dolls (D · 155 bpm)\n   https://open.spotify.com/track/x');
    expect(t).toContain('2. Africa – Toto ↻');
    expect(t).toContain('• Kabel besorgen');
    expect(t).not.toContain('erledigt');
    expect(t).toContain('Bitte pünktlich');
  });

  it('Vorbereitung fällig: Proben in 1–7 Tagen, solange nicht geschickt', () => {
    const plaene: Record<string, ReturnType<typeof plan>> = { '2026-11-20': plan(), '2026-11-15': { ...plan(), geschickt: '2026-11-10' } };
    const f = vorbereitungFaellig([{ date: '2026-11-20' }, { date: '2026-11-15' }, { date: '2026-12-11' }, { date: '2026-11-13' }], '2026-11-13', (d) => plaene[d] ?? { songs: [], notizen: '', punkte: [] });
    expect(f.map((x) => [x.probe.date, x.tage, x.songs])).toEqual([['2026-11-20', 7, 2]]);
  });

  it('Generalprobe: Setlist vorne in Reihenfolge, Bisheriges bleibt', () => {
    const p = notizSetzen(plan(), B, 'Intro');
    const g = generalprobe(p, [B, { title: 'Neu', artist: 'Z' }], '2026-12-04-rhede');
    expect(g.generalprobe).toBe('2026-12-04-rhede');
    expect(g.songs.map((s) => s.title)).toEqual(['Africa', 'Neu', 'Iris']);
    expect(g.songs[0].notiz).toBe('Intro');
  });

  it('Sitzt/Nochmal je Person: Plan nur „geprobt“ und Band-Notiz, Ergebnis aus den Ständen der Personen', () => {
    const plan: ProbePlan = { songs: [{ title: 'Iris', artist: 'X', done: false }, { title: 'Angels', artist: 'X', done: false }], notizen: '', punkte: [] };
    const p1 = markierenPerson(plan, { title: 'Iris', artist: 'X' }, 'nochmal');
    expect(p1.songs[0]).toEqual({ title: 'Iris', artist: 'X', done: true, notiz: NOCHMAL_NOTIZ });
    expect(markierenPerson(p1, { title: 'Iris', artist: 'X' }, 'sitzt').songs[0].notiz).toBeUndefined();
    const e = ergebnis(plan, (s) => (s.title === 'Iris' ? 'nochmal' : undefined));
    expect(e.nochmal.map((x) => x.title)).toEqual(['Iris']);
    expect(e.offen.map((x) => x.title)).toEqual(['Angels']);
  });
});

describe('Probe-Ergebnis an die Band', () => {
  it('nennt Sitzt, Nochmal mit Namen, nicht Drangekommenes, Notizen und die nächste Probe', () => {
    const A = { title: 'Iris', artist: 'X', done: true };
    const B = { title: 'Africa', artist: 'Y', done: true };
    const C = { title: 'Angels', artist: 'Z', done: false };
    const t = probeErgebnisNachricht('2026-11-20', { sitzt: [A], nochmal: [B], offen: [C], zeit: 1800 }, () => 'Fred: Üben', new Map([['Africa|Y', ['Fred: Bridge']]]), { date: '2026-11-27', time: '19:00' });
    expect(t).toContain('Ergebnis (30 min geprobt)');
    expect(t).toContain('✅ Sitzt (1):\n• Iris');
    expect(t).toContain('↻ Nochmal (1):\n• Africa (Fred: Üben)');
    expect(t).toContain('⏳ Nicht drangekommen (1):\n• Angels');
    expect(t).toContain('📝 Notizen:\n• Africa: Fred: Bridge');
    expect(t).toContain('Nächste Probe: Freitag, 27. November, 19:00 Uhr');
  });
});

describe('Generalprobe mit Wackelnden vorab', () => {
  const a = { title: 'A', artist: 'x' };
  const b = { title: 'B', artist: 'y' };
  const c = { title: 'C', artist: 'z' };
  it('merkt sich nur Songs der Setlist als vorab; Ablauf: vorab, Pause, Setlist mit Pausen', () => {
    const p = generalprobe({ songs: [], notizen: '', punkte: [] }, [a, b, c], 'show', [c, { title: 'Fremd', artist: 'q' }]);
    expect(p.vorab).toEqual(['C|z']);
    expect(generalprobeAblauf([a, { pause: true }, b, c], p.vorab)).toEqual([{ title: 'C', artist: 'z' }, { pause: true }, a, { pause: true }, b, c]);
    expect(generalprobeAblauf([a, b], undefined)).toEqual([a, b]);
    expect(generalprobe(p, [a, b, c], 'show').vorab).toBeUndefined();
  });
});
