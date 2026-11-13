import { CloudDatei, LadeWege, adresse, dateiLaden, pfadKodieren, AnmeldeFehler, anmeldeFehler, mitFensterWache, weiterleitungHilft } from './onedrive';
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

  describe('Anmeldung', () => {
    const msalFehler = (errorCode: string) => Object.assign(new Error(errorCode), { errorCode });

    it('übersetzt Fehler von MSAL in verständliche Meldungen', () => {
      expect(anmeldeFehler(msalFehler('empty_window_error')).art).toBe('blockiert');
      expect(anmeldeFehler(msalFehler('popup_window_error')).message).toMatch(/blockiert.*Ohne Pop-up anmelden/);
      expect(anmeldeFehler(msalFehler('user_cancelled')).art).toBe('geschlossen');
      expect(anmeldeFehler(msalFehler('timed_out')).art).toBe('zeit');
      expect(anmeldeFehler(msalFehler('no_network_connectivity')).art).toBe('netz');
      expect(anmeldeFehler(new TypeError('Failed to fetch')).art).toBe('netz');
      expect(anmeldeFehler(msalFehler('invalid_client')).message).toBe('Anmeldung nicht möglich: invalid_client');
    });

    it('bietet die Weiterleitung nur bei Problemen mit dem Fenster an', () => {
      expect(weiterleitungHilft(anmeldeFehler(msalFehler('empty_window_error')))).toBe(true);
      expect(weiterleitungHilft(anmeldeFehler(msalFehler('timed_out')))).toBe(true);
      expect(weiterleitungHilft(anmeldeFehler(msalFehler('no_network_connectivity')))).toBe(false);
      expect(weiterleitungHilft(new Error('x'))).toBe(false);
    });

    describe('Fenster-Wache', () => {
      const sofort = () => Promise.resolve();
      const nie = new Promise<string>(() => undefined);

      it('Fenster zu ohne Antwort: nach der Gnadenfrist „geschlossen“ statt minutenlang zu warten', async () => {
        const fenster = { closed: false };
        let runden = 0;
        const warten = () => (++runden === 3 && (fenster.closed = true), Promise.resolve());
        await expect(mitFensterWache(nie, () => fenster, () => false, { warten, takt: 500, gnade: 2000 })).rejects.toMatchObject({ name: 'AnmeldeFehler', art: 'geschlossen' });
      });

      it('Antwortseite hat sich gemeldet: Fenster zu ist kein Abbruch, die Anmeldung läuft weiter', async () => {
        let ok!: (x: string) => void;
        const arbeit = new Promise<string>((r) => (ok = r));
        let runden = 0;
        const warten = () => {
          if (++runden === 20) ok('angemeldet');
          return new Promise((r) => setTimeout(r, 0));
        };
        expect(await mitFensterWache(arbeit, () => ({ closed: true }), () => true, { warten })).toBe('angemeldet');
      });

      it('Ergebnis und Fehler der Anmeldung kommen unverändert durch', async () => {
        expect(await mitFensterWache(Promise.resolve('ja'), () => null, () => false, { warten: sofort })).toBe('ja');
        const f = new AnmeldeFehler('blockiert', 'blockiert');
        await expect(mitFensterWache(Promise.reject(f), () => null, () => false, { warten: sofort })).rejects.toBe(f);
      });
    });
  });

  describe('Datei laden', () => {
    const datei: CloudDatei = { id: 'i1', pfad: 'Geraete/dd2a1f3a.json', groesse: 80, version: 'v1', geaendert: '2026-11-13T08:00:00Z', drive: 'd1', downloadUrl: 'https://a.files.1drv.com/alt' };
    const abbruch = () => Promise.reject(new TypeError('Failed to fetch'));
    const ok = (text: string) => Promise.resolve(new Response(text));
    function wege(teile: Partial<LadeWege> & { content?: () => Promise<Response>; info?: () => Promise<Response> }): LadeWege & { aufrufe: string[]; caches: (string | undefined)[] } {
      const aufrufe: string[] = [];
      const caches: (string | undefined)[] = [];
      return {
        aufrufe,
        caches,
        jetzt: () => 0,
        warten: () => Promise.resolve(),
        fetch: (u, init) => (aufrufe.push(u), caches.push(init?.cache), teile.fetch ? teile.fetch(u) : abbruch()),
        graph: (p, init) => {
          aufrufe.push(p);
          caches.push(init?.cache);
          if (p.endsWith('/content')) return teile.content ? teile.content() : abbruch();
          if (teile.info) return teile.info();
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
      await expect(dateiLaden(datei, w)).rejects.toThrow(/versucht: a\.files\.1drv\.com abgebrochen \(0,0 s\), b\.files\.1drv\.com abgebrochen \(0,0 s\), graph\.microsoft\.com abgebrochen \(0,0 s\), b\.files/);
      expect(w.aufrufe.filter((u) => u.endsWith('/content'))).toHaveLength(2);
    });

    it('zweiter Durchgang am Browser-Cache vorbei', async () => {
      const w = wege({});
      await expect(dateiLaden(datei, w)).rejects.toThrow();
      expect(w.caches).toEqual([undefined, undefined, undefined, undefined, 'no-store', 'no-store', 'no-store']);
    });

    it('scheitert schon die Abfrage des Links, kommt trotzdem /content dran', async () => {
      const w = wege({ info: abbruch, content: () => ok('inhalt') });
      expect(await (await dateiLaden(datei, w)).text()).toBe('inhalt');
      expect(w.aufrufe).toEqual(['https://a.files.1drv.com/alt', '/drives/d1/items/i1', '/drives/d1/items/i1/content']);
    });

    it('nur Abbrüche: Fehlerart LadeUnterbrechung (Verbindung), mit Status von OneDrive dagegen nicht', async () => {
      await expect(dateiLaden(datei, wege({}))).rejects.toMatchObject({ name: 'LadeUnterbrechung' });
      const mitStatus = wege({ fetch: () => Promise.resolve(new Response('', { status: 403 })) });
      await expect(dateiLaden(datei, mitStatus)).rejects.toMatchObject({ name: 'Error' });
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
