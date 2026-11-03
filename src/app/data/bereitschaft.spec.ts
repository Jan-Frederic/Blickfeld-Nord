import { bereitschaft, langsamStrecken } from './bereitschaft';

const show = { date: '2026-12-04', time: '18:00', venue: 'Weihnachtsmarkt', city: 'Rhede', confirmed: true };
const basis = {
  show,
  heute: '2026-11-20',
  setlist: [{ title: 'A', artist: 'X' }, { pause: true as const }, { title: 'B', artist: 'Y' }],
  ohneTonartTempo: [],
  ohneNoten: [],
  vorort: { kontakt: 'Frau K.', ankunft: '16:00', strom: 'hinter der Bühne' },
  werbungErledigt: ['plakat', 'story-1'],
  packliste: { eingepackt: 0, gesamt: 20 },
};

describe('bereitschaft', () => {
  it('alles da: jeder Punkt ok, Packliste erst kurz vorher', () => {
    const p = bereitschaft(basis);
    expect(p.every((x) => x.ok)).toBe(true);
    expect(p.map((x) => x.text)).not.toContain('Alles eingepackt');
    expect(p.find((x) => x.text === 'Werbung im Plan')?.hinweis).toBe('als Nächstes: Eine Woche vorher');
  });

  it('meldet, was fehlt', () => {
    const p = bereitschaft({ ...basis, heute: '2026-12-03', setlist: [], vorort: { kontakt: 'Frau K.' }, werbungErledigt: [] });
    const offen = Object.fromEntries(p.filter((x) => !x.ok).map((x) => [x.text, x.hinweis]));
    expect(offen['Setlist steht']).toBe('auf diesem Gerät noch keine Setlist');
    expect(offen['Vor Ort geklärt']).toBe('fehlt: Ankunft, Strom');
    expect(offen['Werbung im Plan']).toContain('Plakat aushängen und posten');
    expect(offen['Alles eingepackt']).toBe('0 / 20');
  });

  it('private Auftritte ohne Werbung, ohne Uhrzeit ein offener Punkt', () => {
    const p = bereitschaft({ ...basis, show: { ...show, private: true, time: undefined } });
    expect(p.map((x) => x.text)).not.toContain('Werbung im Plan');
    expect(p.find((x) => x.text === 'Beginn eingetragen')?.ok).toBe(false);
  });

  it('Bühnen-Modus ohne Netz: erst ab einer Woche vorher, mit Knopf zum Vorladen', () => {
    const fehlt = { sw: true, shell: true, pdfjs: false };
    expect(bereitschaft({ ...basis, offline: fehlt }).map((x) => x.text)).not.toContain('Bühnen-Modus ohne Netz');
    const p = bereitschaft({ ...basis, heute: '2026-11-30', offline: fehlt }).find((x) => x.text === 'Bühnen-Modus ohne Netz');
    expect(p).toMatchObject({ ok: false, aktion: 'vorladen' });
    expect(p?.hinweis).toContain('pdf.js');
    const ohneSw = bereitschaft({ ...basis, heute: '2026-11-30', offline: { sw: false, shell: false, pdfjs: false } }).find((x) => x.text === 'Bühnen-Modus ohne Netz');
    expect(ohneSw?.aktion).toBeUndefined();
    expect(ohneSw?.hinweis).toContain('neu laden');
    expect(bereitschaft({ ...basis, heute: '2026-11-30', offline: { sw: true, shell: true, pdfjs: true } }).find((x) => x.text === 'Bühnen-Modus ohne Netz')?.ok).toBe(true);
  });

  it('Setlist rund: langsame Strecken, Sprünge, Baustellen', () => {
    const S = (title: string) => ({ title, artist: 'X' });
    const bpm: Record<string, number> = { a: 70, b: 80, c: 90, d: 85, e: 140 };
    expect(langsamStrecken([S('a'), S('b'), S('c'), S('d'), S('e'), S('a'), S('b')], (s) => bpm[s.title])).toBe(1);
    expect(langsamStrecken([S('a'), S('b'), { pause: true }, S('c')], (s) => bpm[s.title])).toBe(0);
    const p = bereitschaft({ ...basis, setlistCheck: { langsamStrecken: 1, spruenge: 0, baustellen: ['A'] } }).find((x) => x.text === 'Setlist rund');
    expect(p).toMatchObject({ ok: false, ziel: 'setlist' });
    expect(p?.hinweis).toBe('1× mehr als zwei langsame Songs hintereinander · Baustelle laut letzter Probe: A');
    expect(bereitschaft({ ...basis, setlistCheck: { langsamStrecken: 0, spruenge: 0, baustellen: [] } }).find((x) => x.text === 'Setlist rund')?.ok).toBe(true);
  });

  it('Vorabend: Wetter und Notenmappe zum Abhaken – erst am Vortag', () => {
    expect(bereitschaft({ ...basis, vorabend: [] }).some((p) => p.haken)).toBe(false);
    const p = bereitschaft({ ...basis, heute: '2026-12-03', vorabend: ['wetter'] });
    const h = p.filter((x) => x.haken);
    expect(h.map((x) => [x.haken, x.ok])).toEqual([['wetter', true], ['mappe', false]]);
    expect(h[1].ziel).toBe('setlist');
  });
});
