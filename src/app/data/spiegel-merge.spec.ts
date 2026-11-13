import { vereinenFuer, zusammenfuehrbar, zusammenfuehren } from './spiegel-merge';

const j = (x: unknown) => JSON.stringify(x);
const p = (s: string) => JSON.parse(s);

describe('Übe-Daten zusammenführen', () => {
  it('nur die Übe-Einträge; alles andere: die andere Fassung gilt', () => {
    expect(zusammenfuehrbar('bn-ueben')).toBe(true);
    expect(zusammenfuehrbar('bn-kasten-fred')).toBe(true);
    expect(zusammenfuehrbar('bn-setlist-2026-12-04')).toBe(false);
    expect(zusammenfuehren('bn-setlist-x', j([1]), j([2]))).toBe(j([2]));
    expect(zusammenfuehren('bn-ueben', null, j({ a: 1 }))).toBe(j({ a: 1 }));
    expect(zusammenfuehren('bn-ueben', j({ a: 1 }), null)).toBe(j({ a: 1 }));
  });
  it('neues Gerät mit leerem Kasten: der Stand aus OneDrive bleibt vollständig', () => {
    const leer = j({ v: 2, kaesten: {}, gelernt: {}, eingenordet: {} });
    const echt = j({ v: 2, kaesten: { 'Iris|X': 4 }, gelernt: {}, eingenordet: { 'Africa|Y': '2026-11-01' }, zuletzt: '2026-11-10' });
    expect(p(zusammenfuehren('bn-kasten-fred', leer, echt))).toEqual(p(echt));
    expect(p(zusammenfuehren('bn-ueben', j({}), j({ 'Iris|X': { kasten: 4, faellig: '2026-11-17' } })))).toEqual({ 'Iris|X': { kasten: 4, faellig: '2026-11-17' } });
  });
  it('Karteikasten: beide Seiten vereint, je Song gewinnt das spätere „zuletzt“', () => {
    const eigen = j({ a: { kasten: 2, faellig: '2026-11-12', zuletzt: '2026-11-11' }, b: { kasten: 1, faellig: '2026-11-11', zuletzt: '2026-11-01' } });
    const andere = j({ a: { kasten: 4, faellig: '2026-11-15', zuletzt: '2026-11-08' }, b: { kasten: 3, faellig: '2026-11-14', zuletzt: '2026-11-10' }, c: { kasten: 1, faellig: '2026-11-11' } });
    const m = p(zusammenfuehren('bn-ueben', eigen, andere));
    expect(m.a.kasten).toBe(2);
    expect(m.b.kasten).toBe(3);
    expect(m.c.kasten).toBe(1);
  });
  it('Verlauf: Einträge beider Seiten, gleicher Tag und Quelle nur einmal, nach Tag sortiert', () => {
    const eigen = j({ s: [{ tag: '2026-11-11', stand: 'sitzt', quelle: 'ueben' }] });
    const andere = j({ s: [{ tag: '2026-11-02', stand: 'ueben', quelle: 'liste' }, { tag: '2026-11-11', stand: 'wackelt', quelle: 'ueben' }] });
    expect(p(zusammenfuehren('bn-fortschritt-fred', eigen, andere)).s).toEqual([
      { tag: '2026-11-02', stand: 'ueben', quelle: 'liste' },
      { tag: '2026-11-11', stand: 'wackelt', quelle: 'ueben' },
    ]);
  });
  it('heute geübt: am selben Tag vereint, sonst der spätere Tag', () => {
    expect(p(zusammenfuehren('bn-ueben-heute', j({ tag: '2026-11-11', keys: ['a'] }), j({ tag: '2026-11-11', keys: ['b'] }))).keys).toEqual(['a', 'b']);
    expect(p(zusammenfuehren('bn-ueben-heute', j({ tag: '2026-11-11', keys: ['a'] }), j({ tag: '2026-11-10', keys: ['b'] }))).keys).toEqual(['a']);
  });
});

describe('vereinenFuer (Konflikt beim Abgleich)', () => {
  it('vereint Übe-Daten der Band und der Person, sonst nicht', () => {
    expect(vereinenFuer('Daten/bn-fortschritt-fred.json')).not.toBeNull();
    expect(vereinenFuer('Einstellungen/fred/bn-ueben.json')).not.toBeNull();
    expect(vereinenFuer('Daten/bn-setlist-2026-12-04.json')).toBeNull();
    expect(vereinenFuer('Noten/x.pdf')).toBeNull();
    expect(vereinenFuer('Daten/bn-fortschritt-fred (Konflikt Gerät 2026-11-13).json')).toBeNull();
  });

  it('nimmt je Song den späteren Stand beider Geräte', () => {
    const v = vereinenFuer('Einstellungen/fred/bn-ueben.json')!;
    const lokal = j({ a: { zuletzt: '2026-11-13' }, b: { zuletzt: '2026-11-01' } });
    const cloud = j({ a: { zuletzt: '2026-11-10' }, b: { zuletzt: '2026-11-12' }, c: { zuletzt: '2026-11-11' } });
    expect(JSON.parse(v(lokal, cloud))).toEqual({ a: { zuletzt: '2026-11-13' }, b: { zuletzt: '2026-11-12' }, c: { zuletzt: '2026-11-11' } });
  });
});
