import { CloudDatei, LadeWege, adresse, dateiLaden, pfadKodieren } from './onedrive';
import { istAkkordblatt, istPdf } from './noten-import';

describe('OneDrive', () => {
  it('kodiert Ordnerpfade für Graph-Adressen', () => {
    expect(pfadKodieren(' Blickfeld Nord / Noten & Co/ ')).toBe('Blickfeld%20Nord/Noten%20%26%20Co');
    expect(pfadKodieren('')).toBe('');
  });

  it('adressiert eigene und geteilte Ordner', () => {
    expect(adresse({ pfad: '' })).toBe('/me/drive/root');
    expect(adresse({ pfad: 'Blickfeld Nord' }, 'Noten/a b.pdf')).toBe('/me/drive/root:/Blickfeld%20Nord/Noten/a%20b.pdf:');
    const wurzel = { drive: 'd1', item: 'i1', name: 'Sync' };
    expect(adresse({ pfad: '', wurzel })).toBe('/drives/d1/items/i1');
    expect(adresse({ pfad: 'Sheets', wurzel }, 'Iris.pdf')).toBe('/drives/d1/items/i1:/Sheets/Iris.pdf:');
  });

  it('erkennt Noten-Dateien', () => {
    expect(istPdf('Iris - Bass.PDF')).toBe(true);
    expect(istAkkordblatt('angels.chopro')).toBe(true);
    expect(istAkkordblatt('liesmich.md')).toBe(false);
  });

  describe('Datei laden', () => {
    const datei: CloudDatei = { id: 'i1', pfad: 'Geraete/dd2a1f3a.json', groesse: 80, version: 'v1', geaendert: '2026-11-13T08:00:00Z', drive: 'd1', downloadUrl: 'https://a.files.1drv.com/alt' };
    const abbruch = () => Promise.reject(new TypeError('Failed to fetch'));
    const ok = (text: string) => Promise.resolve(new Response(text));
    function wege(teile: Partial<LadeWege> & { content?: () => Promise<Response> }): LadeWege & { aufrufe: string[] } {
      const aufrufe: string[] = [];
      return {
        aufrufe,
        warten: () => Promise.resolve(),
        fetch: (u) => (aufrufe.push(u), teile.fetch ? teile.fetch(u) : abbruch()),
        graph: (p) => {
          aufrufe.push(p);
          if (p.endsWith('/content')) return teile.content ? teile.content() : abbruch();
          return Promise.resolve(new Response(JSON.stringify({ '@microsoft.graph.downloadUrl': 'https://b.files.1drv.com/neu' })));
        },
      };
    }

    it('nimmt den Link aus der Liste, wenn er klappt', async () => {
      const w = wege({ fetch: () => ok('{"a":1}') });
      expect(await (await dateiLaden(datei, w)).text()).toBe('{"a":1}');
      expect(w.aufrufe).toEqual(['https://a.files.1drv.com/alt']);
    });

    it('weicht auf /content aus, wenn beide Links abbrechen', async () => {
      const w = wege({ content: () => ok('inhalt') });
      expect(await (await dateiLaden(datei, w)).text()).toBe('inhalt');
      expect(w.aufrufe).toEqual(['https://a.files.1drv.com/alt', '/drives/d1/items/i1', 'https://b.files.1drv.com/neu', '/drives/d1/items/i1/content']);
    });

    it('versucht es ein zweites Mal und nennt dann die versuchten Server', async () => {
      const w = wege({});
      await expect(dateiLaden(datei, w)).rejects.toThrow(/versucht: a\.files\.1drv\.com abgebrochen, b\.files\.1drv\.com abgebrochen, graph\.microsoft\.com abgebrochen\) – wird beim nächsten Abgleich wiederholt/);
      expect(w.aufrufe.filter((u) => u.endsWith('/content'))).toHaveLength(2);
    });

    it('hängt nicht: eine Anfrage ohne Antwort (Zeitgrenze) gilt wie ein Abbruch', async () => {
      const ohneAntwort = () => Promise.reject(new DOMException('Zeit um', 'TimeoutError'));
      const w = wege({ fetch: ohneAntwort, content: ohneAntwort });
      await expect(dateiLaden(datei, w)).rejects.toThrow(/a\.files\.1drv\.com ohne Antwort/);
    });

    it('gibt echte Fehler von OneDrive (z. B. nicht gefunden) gleich weiter', async () => {
      const w = wege({});
      w.graph = () => Promise.reject(new Error('nicht gefunden'));
      await expect(dateiLaden({ ...datei, downloadUrl: undefined }, w)).rejects.toThrow('nicht gefunden');
    });
  });
});
