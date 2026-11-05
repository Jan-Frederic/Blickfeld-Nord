import { DeltaEintrag, DeltaItem, deltaAnwenden, deltaDateien, deltaGueltig } from './cloud-delta';

const W = 'wurzel';
const ordner = (id: string, name: string, p = W): DeltaItem => ({ id, name, folder: {}, parentReference: { id: p } });
const datei = (id: string, name: string, p = W, cTag = `c-${id}`): DeltaItem => ({ id, name, file: {}, size: 10, cTag, lastModifiedDateTime: '2026-11-01T00:00:00Z', parentReference: { id: p } });
const pfade = (e: Record<string, DeltaEintrag>) => deltaDateien(e, W).map((d) => `${d.pfad}@${d.version}`);

describe('OneDrive-Änderungsliste', () => {
  it('setzt Pfade aus IDs zusammen – auch wenn Dateien vor ihrem Ordner kommen', () => {
    const e: Record<string, DeltaEintrag> = {};
    expect(deltaAnwenden(e, [{ id: W, name: 'Sync', folder: {} }, datei('f1', 'a.json', 'o1'), ordner('o1', 'Daten'), datei('f2', 'Iris.pdf')], W)).toBe(false);
    expect(pfade(e)).toEqual(['Daten/a.json@c-f1', 'Iris.pdf@c-f2']);
  });

  it('übernimmt Änderungen, Umbenennen eines Ordners und Löschen', () => {
    const e: Record<string, DeltaEintrag> = {};
    deltaAnwenden(e, [ordner('o1', 'Noten'), ordner('o2', 'Bass', 'o1'), datei('f1', 'Iris.pdf', 'o2'), datei('f2', 'b.pdf', 'o2'), datei('f3', 'x.json')], W);
    // Ordner umbenannt (Inhalt wird von Graph nicht erneut gemeldet), Datei geändert, Datei gelöscht (ohne Name)
    deltaAnwenden(e, [ordner('o1', 'Sheets'), datei('f1', 'Iris.pdf', 'o2', 'neu'), { id: 'f3', deleted: {} }], W);
    expect(pfade(e)).toEqual(['Sheets/Bass/b.pdf@c-f2', 'Sheets/Bass/Iris.pdf@neu']);
    // dasselbe Element mehrfach: das letzte gilt
    deltaAnwenden(e, [datei('f2', 'b.pdf', 'o2', 'v1'), datei('f2', 'b2.pdf', 'o2', 'v2')], W);
    expect(pfade(e)).toContain('Sheets/Bass/b2.pdf@v2');
  });

  it('gelöschter oder weggeschobener Ordner: sein Inhalt gilt als weg und wird vergessen', () => {
    const e: Record<string, DeltaEintrag> = {};
    deltaAnwenden(e, [ordner('o1', 'Alt'), datei('f1', 'a.pdf', 'o1'), datei('f2', 'b.pdf')], W);
    deltaAnwenden(e, [{ id: 'o1', deleted: {} }], W);
    expect(pfade(e)).toEqual(['b.pdf@c-f2']);
    expect(e['f1']).toBeUndefined();
    // aus dem Sync-Ordner hinausgeschoben (Elternordner unbekannt)
    deltaAnwenden(e, [datei('f2', 'b.pdf', 'irgendwo')], W);
    expect(pfade(e)).toEqual([]);
  });

  it('meldet Verknüpfungen zu fremden Ordnern (dafür taugt die Änderungsliste nicht)', () => {
    expect(deltaAnwenden({}, [{ id: 'r', name: 'Sync', remoteItem: { id: 'x' }, parentReference: { id: W } }], W)).toBe(true);
  });

  it('gemerkter Stand gilt nur für denselben Ordner und höchstens einen Tag', () => {
    const s = { ort: 'a', wurzel: W, drive: 'd', link: 'l', voll: '2026-11-05T00:00:00Z', eintraege: {} };
    const t = Date.parse('2026-11-05T12:00:00Z');
    expect(deltaGueltig(s, 'a', t)).toBe(true);
    expect(deltaGueltig(s, 'b', t)).toBe(false);
    expect(deltaGueltig({ ...s, link: '' }, 'a', t)).toBe(false);
    expect(deltaGueltig(s, 'a', t + 24 * 3600_000)).toBe(false);
    expect(deltaGueltig(undefined, 'a', t)).toBe(false);
  });
});
