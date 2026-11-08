import { beforeEach, describe, expect, it } from 'vitest';
import { ladeProbeNotizen, letzteNotizen, notizenDerProbe, probeNotizSetzen } from './probe-notiz';

const band = [
  { slug: 'david', name: 'David B.' },
  { slug: 'fred', name: 'Fred X.' },
];
const K = 'Iris|Goo Goo Dolls';
beforeEach(() => localStorage.clear());

describe('Probe-Notizen je Person', () => {
  it('jede Person schreibt ihre eigene Datei; leer löscht', () => {
    probeNotizSetzen('david', '2026-11-05', K, ' Bridge wackelt ');
    probeNotizSetzen('fred', '2026-11-05', K, 'Tempo');
    expect(ladeProbeNotizen('david')).toEqual({ '2026-11-05': { [K]: 'Bridge wackelt' } });
    expect([...notizenDerProbe('2026-11-05', band)]).toEqual([[K, ['David: Bridge wackelt', 'Fred: Tempo']]]);
    expect([...notizenDerProbe('2026-11-05', band, 'david')]).toEqual([[K, ['Fred: Tempo']]]);
    probeNotizSetzen('david', '2026-11-05', K, '');
    expect(localStorage.getItem('bn-probenotiz-david')).toBeNull();
  });

  it('letzte Probe: Protokoll und Notizen der Musiker zusammen, nur vor dem Datum', () => {
    probeNotizSetzen('fred', '2026-11-05', K, 'Einsatz');
    probeNotizSetzen('david', '2026-11-12', K, 'neu');
    const plan = new Map([[K, { tag: '2026-11-05', notiz: 'nochmal üben' }]]);
    expect(letzteNotizen(band, plan, '2026-11-12').get(K)).toEqual({ tag: '2026-11-05', notiz: 'nochmal üben · Fred: Einsatz' });
    expect(letzteNotizen(band, plan).get(K)).toEqual({ tag: '2026-11-12', notiz: 'David: neu' });
  });
});
