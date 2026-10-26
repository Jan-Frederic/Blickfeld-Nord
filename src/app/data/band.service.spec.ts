import { BandService, friendId } from './band.service';
import repertoire from './repertoire.json';
import { SONGINFO } from './songinfo';
import technik from './technik.json';

// Prüft die zentral gepflegten Inhalte auf typische Tippfehler, bevor sie live gehen
const band = new BandService();
const isDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d + 'T00:00:00Z')) && new Date(d + 'T00:00:00Z').toISOString().startsWith(d);

describe('Bandmitglieder', () => {
  it('haben eindeutige, URL-taugliche Kurznamen', () => {
    const slugs = band.members.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });

  it('haben Name, Rolle und Kurzbio', () => {
    for (const m of band.members) {
      expect(m.name.trim()).not.toBe('');
      expect(m.role.trim()).not.toBe('');
      expect(m.bio.trim()).not.toBe('');
    }
  });
});

describe('Auftritte', () => {
  it('zeigen private Namen nie öffentlich', () => {
    for (const s of band.shows.filter((x) => x.private)) {
      expect(band.publicVenue(s)).toBe(s.publicName ?? 'Private Feier');
    }
    expect(band.publicVenue({ date: '2030-01-01', venue: 'Max M.', private: true, confirmed: true })).toBe('Private Feier');
  });

  it('haben eindeutige Backstage-IDs', () => {
    const ids = band.shows.map((s) => band.showId(s));
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of band.shows) expect(band.showById(band.showId(s))).toBe(s);
  });

  it.each(band.shows.map((s) => [`${s.date} ${s.venue}`, s] as const))('%s ist gültig', (_, s) => {
    expect(isDate(s.date)).toBe(true);
    if (s.endDate) {
      expect(isDate(s.endDate)).toBe(true);
      expect(s.endDate >= s.date).toBe(true);
    }
    if (s.time) expect(s.time).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
    if (s.mapsUrl) expect(s.mapsUrl).toMatch(/^https:\/\//);
    if (s.price !== undefined) expect(s.price).toBeGreaterThanOrEqual(0);
    expect(s.venue.trim()).not.toBe('');
  });

  it('öffentlich gelistet werden nur nicht-private und geklärte Termine', () => {
    for (const s of band.publicShows) {
      expect(s.private).toBeFalsy();
      expect(s.confirmed).toBe(true);
    }
  });
});

describe('Proben', () => {
  it.each(band.rehearsals.map((r) => [r.date, r] as const))('%s ist gültig', (_, r) => {
    expect(isDate(r.date)).toBe(true);
    for (const t of [r.time, r.endTime]) if (t) expect(t).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
  });
});

describe('Tonart und Tempo (songinfo.ts)', () => {
  it('passen zu Songs im Repertoire und haben gültige Werte', () => {
    for (const s of SONGINFO) {
      expect(repertoire.tracks.some((t) => t.title === s.title && t.artist === s.artist), `${s.title} – ${s.artist} nicht im Repertoire`).toBe(true);
      if (s.tonart) expect(s.tonart).toMatch(/^[A-H][#b]?m?$/);
      if (s.spielTonart) expect(s.spielTonart).toMatch(/^[A-H][#b]?m?$/);
      if (s.capo) expect(Number.isInteger(s.capo) && s.capo >= 1 && s.capo <= 12).toBe(true);
      if (s.bpm) expect(s.bpm >= 40 && s.bpm <= 240).toBe(true);
    }
  });
});

describe('Abwesenheiten', () => {
  const namen = ['Band', ...band.members.map((m) => m.nickname ?? m.name.split(' ')[0])];
  // eine Schleife statt it.each – die Liste darf leer sein
  it('haben gültige Namen und Daten, „bis“ nicht vor „von“', () => {
    for (const a of band.abwesenheiten) {
      expect(namen).toContain(a.wer);
      expect(isDate(a.von)).toBe(true);
      if (a.bis) {
        expect(isDate(a.bis)).toBe(true);
        expect(a.bis >= a.von).toBe(true);
      }
    }
  });
});

describe('Historie', () => {
  it.each(band.history.map((h) => [`${h.date} ${h.title}`, h] as const))('%s ist gültig', (_, h) => {
    expect(isDate(h.date)).toBe(true);
    expect(h.title.trim()).not.toBe('');
    expect(h.text.length).toBeGreaterThan(0);
    for (const img of h.images ?? []) expect(img.alt.trim()).not.toBe('');
  });

  it.each(band.history.map((e) => [`${e.date} ${e.title}`, e] as const))('%s ist gültig', (_, e) => {
    expect(isDate(e.date)).toBe(true);
    expect(e.title.trim()).not.toBe('');
    expect(e.text.length).toBeGreaterThan(0);
    for (const img of e.images ?? []) {
      expect(img.src).toMatch(/^historie\/.+\.(webp|jpg|png)$/);
      expect(img.alt.trim()).not.toBe('');
    }
    for (const l of e.links ?? []) expect(l.url).toMatch(/^https:\/\//);
    if (e.reel) expect(e.reel).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('hat keine zwei Einträge am selben Tag mit gleichem Titel', () => {
    const keys = band.history.map((e) => e.date + e.title);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('Galerie', () => {
  it('jedes Foto hat Vorschau und Alternativtext', () => {
    for (const p of band.photos) {
      expect(p.thumb).toBeTruthy();
      expect(p.alt.trim()).not.toBe('');
    }
  });
});

describe('Freunde', () => {
  it('haben https-Links', () => {
    for (const f of band.friends) expect(f.url).toMatch(/^https:\/\//);
  });

  it('haben eindeutige Anker für die Verlinkung aus der Konzertliste', () => {
    const ids = band.friends.map(friendId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it('erkennt Locations von Freunden', () => {
    expect(band.friendForVenue('Café Lotti – Tanz in den Mai')?.name).toBe('Café Lotti');
    expect(band.friendForVenue('Weihnachtsmarkt')).toBeUndefined();
    expect(band.friendForVenue('Hausparty bei Freunden von der Löscheinheit Dingden')?.name).toContain('Feuerwehr');
    const parts = band.venueParts('Café Lotti mit Pro Campesinos');
    expect(parts.map((p) => [p.text, p.friend?.name ?? null])).toEqual([
      ['Café Lotti', 'Café Lotti'],
      [' mit ', null],
      ['Pro Campesinos', 'Pro Campesinos 1977 e.V.'],
    ]);
  });
});

describe('Repertoire (aus Spotify)', () => {
  it('hat gültige Einträge', () => {
    for (const t of repertoire.tracks as { title: string; artist: string; year?: number }[]) {
      expect(t.title.trim()).not.toBe('');
      expect(t.artist.trim()).not.toBe('');
      if (t.year !== undefined) expect(t.year).toBeGreaterThan(1900);
    }
  });
});

describe('Technischer Aufbau (technik.json)', () => {
  const ids = technik.aufbau.map((i) => i.id);

  it('hat eindeutige Elemente und Kanäle', () => {
    expect(new Set(ids).size).toBe(ids.length);
    const ch = technik.kanaele.map((k) => k.kanal);
    expect(new Set(ch).size).toBe(ch.length);
  });

  it('verweist nur auf beschriebene Geräte', () => {
    for (const i of technik.aufbau as { hw?: string }[]) {
      if (i.hw) expect(Object.keys(technik.hardware)).toContain(i.hw);
    }
    for (const h of Object.values(technik.hardware)) expect(h.beschreibung.trim()).not.toBe('');
  });

  it('verweist nur auf vorhandene Monitore und Steckdosen', () => {
    for (const m of technik.monitore) expect(ids).toContain(m.id);
    for (const s of technik.strom) expect(ids).toContain(s.id);
  });

  it('mischt auf den Monitoren nur vorhandene Kanäle mit gültigem Pegel', () => {
    const kanaele = technik.kanaele.map((k) => k.kanal);
    for (const m of technik.monitore as { mix: { kanal: number; pegel: string }[] | null }[]) {
      for (const x of m.mix ?? []) {
        expect(kanaele).toContain(x.kanal);
        expect(['laut', 'mittel', 'leise']).toContain(x.pegel);
      }
    }
  });

  it('platziert alles auf oder neben der Bühne', () => {
    for (const i of technik.aufbau) {
      expect(i.x).toBeGreaterThanOrEqual(-0.5);
      expect(i.x).toBeLessThanOrEqual(technik.buehne.breite + 0.5);
      expect(i.y).toBeGreaterThanOrEqual(0);
      expect(i.y).toBeLessThanOrEqual(technik.buehne.tiefe);
    }
  });
});
