import { SyncDatei, SyncOrdner, Zustand, ausstehendInCloud, ignorieren, istDatenPfad, konfliktName, planen, synchronisieren } from './sync';

// Ordner im Speicher: Version = Zähler, der bei jedem Schreiben steigt
function speicherOrdner(name: string, start: Record<string, string> = {}): SyncOrdner & { inhalt: Map<string, { text: string; version: string; geaendert: string }> } {
  let n = 0;
  const inhalt = new Map(Object.entries(start).map(([p, text]) => [p, { text, version: `${name}${++n}`, geaendert: '2026-01-01T00:00:00Z' }]));
  return {
    name,
    inhalt,
    async liste() {
      return [...inhalt].map(([pfad, d]): SyncDatei => ({ pfad, groesse: d.text.length, geaendert: d.geaendert, version: d.version }));
    },
    async lesen(pfad) {
      return new Blob([inhalt.get(pfad)!.text]);
    },
    async schreiben(pfad, blob) {
      const d = { text: await blob.text(), version: `${name}${++n}`, geaendert: new Date().toISOString() };
      inhalt.set(pfad, d);
      return { pfad, groesse: d.text.length, geaendert: d.geaendert, version: d.version };
    },
    async loeschen(pfad) {
      inhalt.delete(pfad);
    },
  };
}
const aendern = (o: ReturnType<typeof speicherOrdner>, pfad: string, text: string, geaendert: string) =>
  o.inhalt.set(pfad, { text, version: `${o.name}-x-${text}`, geaendert });
const texte = (o: ReturnType<typeof speicherOrdner>) => Object.fromEntries([...o.inhalt].map(([p, d]) => [p, d.text]).sort());
const BEIDE = { richtung: 'beide' as const, loeschen: true };

describe('Synchronisation', () => {
  it('erster Abgleich: Neues wandert in beide Richtungen, Gleiches wird nur gemerkt', async () => {
    const cloud = speicherOrdner('c', { 'a.pdf': 'AAA', 'Noten/b.pro': 'B', 'gleich.txt': 'xx' });
    const lokal = speicherOrdner('l', { 'c.json': 'C', 'gleich.txt': 'yy' });
    const { ergebnis, zustand } = await synchronisieren(cloud, lokal, {}, BEIDE);
    expect(ergebnis).toMatchObject({ runter: 2, hoch: 1, konflikte: 0, fehler: [] });
    expect(texte(lokal)).toEqual({ 'Noten/b.pro': 'B', 'a.pdf': 'AAA', 'c.json': 'C', 'gleich.txt': 'yy' });
    expect(texte(cloud)).toEqual({ 'Noten/b.pro': 'B', 'a.pdf': 'AAA', 'c.json': 'C', 'gleich.txt': 'xx' });
    expect(Object.keys(zustand).sort()).toEqual(['Noten/b.pro', 'a.pdf', 'c.json', 'gleich.txt']);
    // zweiter Lauf: nichts zu tun
    const zwei = await synchronisieren(cloud, lokal, zustand, BEIDE);
    expect(zwei.ergebnis).toMatchObject({ runter: 0, hoch: 0, geloescht: 0 });
  });

  it('überträgt Änderungen und Löschungen der jeweils anderen Seite', async () => {
    const cloud = speicherOrdner('c', { 'a.pdf': 'A', 'b.pdf': 'B', 'c.pdf': 'C' });
    const lokal = speicherOrdner('l');
    let { zustand } = await synchronisieren(cloud, lokal, {}, BEIDE);
    aendern(cloud, 'a.pdf', 'A2', '2026-02-01T00:00:00Z');
    aendern(lokal, 'b.pdf', 'B2', '2026-02-01T00:00:00Z');
    lokal.inhalt.delete('c.pdf');
    const r = await synchronisieren(cloud, lokal, zustand, BEIDE);
    zustand = r.zustand;
    expect(r.ergebnis).toMatchObject({ runter: 1, hoch: 1, geloescht: 1 });
    expect(texte(cloud)).toEqual({ 'a.pdf': 'A2', 'b.pdf': 'B2' });
    expect(texte(lokal)).toEqual({ 'a.pdf': 'A2', 'b.pdf': 'B2' });
    expect(zustand['c.pdf']).toBeUndefined();
  });

  it('ohne „Löschungen übertragen“ kommt Gelöschtes zurück', async () => {
    const cloud = speicherOrdner('c', { 'a.pdf': 'A' });
    const lokal = speicherOrdner('l');
    const { zustand } = await synchronisieren(cloud, lokal, {}, BEIDE);
    lokal.inhalt.delete('a.pdf');
    await synchronisieren(cloud, lokal, zustand, { richtung: 'beide', loeschen: false });
    expect(texte(lokal)).toEqual({ 'a.pdf': 'A' });
  });

  it('Konflikt: die neuere Fassung gewinnt, die ältere bleibt als Kopie auf beiden Seiten', async () => {
    const cloud = speicherOrdner('c', { 'Iris - Bass.pdf': 'alt' });
    const lokal = speicherOrdner('l');
    const { zustand } = await synchronisieren(cloud, lokal, {}, BEIDE);
    aendern(cloud, 'Iris - Bass.pdf', 'cloud-neu', '2026-03-02T00:00:00Z');
    aendern(lokal, 'Iris - Bass.pdf', 'lokal-aelter', '2026-03-01T00:00:00Z');
    const r = await synchronisieren(cloud, lokal, zustand, BEIDE);
    expect(r.ergebnis.konflikte).toBe(1);
    const kopie = konfliktName('Iris - Bass.pdf', 'Gerät');
    expect(texte(lokal)).toEqual({ 'Iris - Bass.pdf': 'cloud-neu', [kopie]: 'lokal-aelter' });
    expect(texte(cloud)).toEqual(texte(lokal));
    // danach stabil
    expect((await synchronisieren(cloud, lokal, r.zustand, BEIDE)).ergebnis).toMatchObject({ runter: 0, hoch: 0, konflikte: 0 });
  });

  it('nur herunterladen: lokale Änderungen gehen nicht hoch, die Cloud gilt', async () => {
    const cloud = speicherOrdner('c', { 'a.pdf': 'A' });
    const lokal = speicherOrdner('l', { 'eigen.txt': 'E' });
    const o = { richtung: 'runter' as const, loeschen: true };
    const { zustand } = await synchronisieren(cloud, lokal, {}, o);
    expect(texte(cloud)).toEqual({ 'a.pdf': 'A' });
    aendern(cloud, 'a.pdf', 'A2', '2026-02-01T00:00:00Z');
    aendern(lokal, 'a.pdf', 'L2', '2026-03-01T00:00:00Z');
    await synchronisieren(cloud, lokal, zustand, o);
    expect(texte(lokal)['a.pdf']).toBe('A2');
    expect(texte(cloud)).toEqual({ 'a.pdf': 'A2' });
  });

  it('fragt bei vielen Löschungen nach und überspringt sie bei „nein“', async () => {
    const start = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`d${i}.pdf`, String(i)]));
    const cloud = speicherOrdner('c', start);
    const lokal = speicherOrdner('l');
    const { zustand } = await synchronisieren(cloud, lokal, {}, BEIDE);
    lokal.inhalt.clear();
    let gefragt = '';
    const r = await synchronisieren(cloud, lokal, zustand, BEIDE, { bestaetigen: (t) => ((gefragt = t), false) });
    expect(gefragt).toContain('10 von 10');
    expect(Object.keys(texte(cloud)).length).toBe(10);
    // statt zu löschen wird wieder heruntergeladen? Nein – übersprungen, der Zustand bleibt
    expect(r.ergebnis.geloescht).toBe(0);
  });

  it('Fehler bei einer Datei halten den Rest nicht auf', async () => {
    const cloud = speicherOrdner('c', { 'a.pdf': 'A', 'b.pdf': 'B' });
    const lokal = speicherOrdner('l');
    const schreiben = lokal.schreiben.bind(lokal);
    lokal.schreiben = async (p, b) => {
      if (p === 'a.pdf') throw new Error('voll');
      return schreiben(p, b);
    };
    const r = await synchronisieren(cloud, lokal, {}, BEIDE);
    expect(r.ergebnis.fehler).toEqual(['a.pdf: voll']);
    expect(r.zustand['a.pdf']).toBeUndefined();
    expect(texte(lokal)).toEqual({ 'b.pdf': 'B' });
  });

  it('plant ohne Ausführung und lässt versteckte Dateien aus', () => {
    const d = (pfad: string, version: string): SyncDatei => ({ pfad, groesse: 1, geaendert: '', version });
    const z: Zustand = { 'weg.pdf': { cloud: 'c1', lokal: 'l1' } };
    expect(planen([d('.DS_Store', '1'), d('weg.pdf', 'c1')], [d('~$Iris.docx', '1')], z, BEIDE)).toEqual([{ art: 'loeschenCloud', pfad: 'weg.pdf' }]);
    expect(ignorieren('Noten/.git/x')).toBe(true);
    expect(konfliktName('Ordner/Iris.v2/Bass', 'OneDrive', '2026-10-27')).toBe('Ordner/Iris.v2/Bass (Konflikt OneDrive 2026-10-27)');
  });

  it('bricht nach zehn gleichen Fehlern in Folge ab, statt jede Datei scheitern zu lassen', async () => {
    const dateien = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`n${i}.pdf`, 'x']));
    const cloud = { ...speicherOrdner('c', dateien), lesen: async () => { throw new TypeError('Failed to fetch'); } };
    const lokal = speicherOrdner('l');
    const { ergebnis } = await synchronisieren(cloud, lokal, {}, BEIDE);
    // 10 Fehler + Abbruch-Hinweis; die bis dahin gleichzeitig laufenden Übertragungen (höchstens 3) enden noch
    expect(ergebnis.fehler.length).toBeGreaterThanOrEqual(11);
    expect(ergebnis.fehler.length).toBeLessThanOrEqual(14);
    expect(ergebnis.fehler[0]).toBe('Abgebrochen nach 10 gleichen Fehlern in Folge: Failed to fetch');
    expect(ergebnis.runter).toBe(0);
  });

  it('Schnellabgleich: nur Einstellungen und Daten, PDFs bleiben samt Stand für den vollen Abgleich liegen', async () => {
    const cloud = speicherOrdner('c', { 'Daten/bn-setlist-1.json': 'S', 'Noten/Iris.pdf': 'PDF' });
    const lokal = speicherOrdner('l', { 'Einstellungen/Ich/bn-wackelt.json': 'W', 'neu.pdf': 'N' });
    const r = await synchronisieren(cloud, lokal, {}, { ...BEIDE, nur: istDatenPfad });
    expect(r.ergebnis).toMatchObject({ runter: 1, hoch: 1 });
    expect(r.ergebnis.ausstehend).toEqual({ dateien: 1, bytes: 3 });
    expect(Object.keys(r.zustand).sort()).toEqual(['Daten/bn-setlist-1.json', 'Einstellungen/Ich/bn-wackelt.json']);
    // die Liste nach dem Abgleich enthält das Heruntergeladene
    expect(r.lokal.map((d) => d.pfad).sort()).toEqual(['Daten/bn-setlist-1.json', 'Einstellungen/Ich/bn-wackelt.json', 'neu.pdf']);
    // voller Abgleich danach holt den Rest; ein weiterer Schnellabgleich lässt den Stand der PDFs in Ruhe
    const voll = await synchronisieren(cloud, lokal, r.zustand, BEIDE);
    expect(voll.ergebnis).toMatchObject({ runter: 1, hoch: 1 });
    const schnell = await synchronisieren(cloud, lokal, voll.zustand, { ...BEIDE, nur: istDatenPfad });
    expect(schnell.ergebnis).toMatchObject({ runter: 0, hoch: 0, geloescht: 0, ausstehend: { dateien: 0, bytes: 0 } });
    expect(schnell.zustand).toEqual(voll.zustand);
  });

  it('erkennt Daten-Pfade', () => {
    expect(istDatenPfad('Daten/bn-werbeplan-x.json')).toBe(true);
    expect(istDatenPfad('Markierungen/Band/Iris-123.json')).toBe(true);
    expect(istDatenPfad('Noten/Iris.pdf')).toBe(false);
    expect(istDatenPfad('Daten.json')).toBe(false);
    expect(istDatenPfad('Mitschnitte/Iris/song.txt')).toBe(false);
    // in OneDrive gelöschtes PDF zählt ebenfalls als ausstehend
    expect(ausstehendInCloud([], { 'a.pdf': { cloud: '1', lokal: '1' }, 'Daten/x.json': { cloud: '1', lokal: '1' } }, istDatenPfad)).toEqual({ dateien: 1, bytes: 0 });
  });

  it('überträgt mehrere Dateien gleichzeitig und kommt zum selben Ergebnis', async () => {
    const start = Object.fromEntries(Array.from({ length: 23 }, (_, i) => [`n/${i}.pdf`, `inhalt ${i}`]));
    const cloud = speicherOrdner('c', start);
    const lokal = speicherOrdner('l');
    let gleichzeitig = 0;
    let hoechstens = 0;
    const lesen = cloud.lesen.bind(cloud);
    cloud.lesen = async (p) => {
      hoechstens = Math.max(hoechstens, ++gleichzeitig);
      await new Promise((r) => setTimeout(r, 2));
      gleichzeitig--;
      return lesen(p);
    };
    const r = await synchronisieren(cloud, lokal, {}, BEIDE);
    expect(r.ergebnis.runter).toBe(23);
    expect(hoechstens).toBeGreaterThan(1);
    expect(hoechstens).toBeLessThanOrEqual(4);
    expect(texte(lokal)).toEqual(texte(cloud));
    expect(Object.keys(r.zustand)).toHaveLength(23);
  });
});
