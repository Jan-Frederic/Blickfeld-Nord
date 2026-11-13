import { neuesterStand, standVergleich } from './app-stand';

describe('App-Stand', () => {
  it('liest die veröffentlichte Version aus /sw.js (am Browser-Cache vorbei)', async () => {
    let init: RequestInit | undefined;
    const laden = (async (_u: string, i?: RequestInit) => ((init = i), new Response("const VERSION = '5926c9e031cb';\nconst CACHE = ..."))) as typeof fetch;
    expect(await neuesterStand(laden)).toBe('5926c9e0');
    expect(init?.cache).toBe('no-store');
  });

  it('offline oder ohne Version: unbekannt', async () => {
    expect(await neuesterStand((async () => Promise.reject(new TypeError('offline'))) as typeof fetch)).toBe('');
    expect(await neuesterStand((async () => new Response('nichts')) as typeof fetch)).toBe('');
  });

  it('vergleicht den Stand eines Geräts mit dem veröffentlichten', () => {
    expect(standVergleich('5926c9e0', '5926c9e0')).toBe('aktuell');
    expect(standVergleich('461a20bb', '5926c9e0')).toBe('veraltet');
    expect(standVergleich(undefined, '5926c9e0')).toBe('unbekannt');
    expect(standVergleich('461a20bb', '')).toBe('unbekannt');
  });
});
