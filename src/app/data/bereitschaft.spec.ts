import { bereitschaft } from './bereitschaft';

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
});
