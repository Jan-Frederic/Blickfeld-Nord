import { BandService, friendId } from './band.service';

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

describe('Historie', () => {
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
  });
});
