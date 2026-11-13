import { DOKU_GRUPPEN, DOKU_IDS, DOKU_THEMEN } from './doku-themen';
import { DOKU } from './doku-inhalte';

describe('Anleitungen', () => {
  it('jedes Thema hat Inhalt (außer „modi“ mit eigener Seite) und steht in genau einer Gruppe', () => {
    for (const id of DOKU_IDS) {
      if (id !== 'modi') {
        const d = DOKU[id];
        expect(d, id).toBeTruthy();
        expect(d.kurz.length, id).toBeGreaterThan(20);
        expect(d.abschnitte.length, id).toBeGreaterThanOrEqual(2);
        for (const a of d.abschnitte) expect(!!a.text || !!a.punkte?.length, `${id}: ${a.titel}`).toBe(true);
        for (const s of d.siehe ?? []) expect(s in DOKU_THEMEN, `${id} → ${s}`).toBe(true);
      }
      expect(DOKU_GRUPPEN.filter((g) => g.themen.includes(id)).length, id).toBe(1);
    }
  });

  it('jede Anleitung führt zu einer Backstage-Seite', () => {
    for (const id of DOKU_IDS) expect(DOKU_THEMEN[id].seite, id).toMatch(/^\/backstage(\/|$)/);
  });
});
