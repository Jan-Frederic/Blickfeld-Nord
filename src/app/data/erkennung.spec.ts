import { erkennen } from './erkennung';

const songs = [
  { title: 'Iris', artist: 'The Goo Goo Dolls' },
  { title: 'Hallelujah', artist: 'Leonard Cohen' },
  { title: 'Hallelujah', artist: 'Jeff Buckley' },
  { title: 'Let It Be - Remastered 2009', artist: 'The Beatles' },
  { title: '80 Millionen', artist: 'Max Giesinger' },
];
const text = (t: string) => async () => new TextEncoder().encode(t).buffer as ArrayBuffer;
const nie = async (): Promise<ArrayBuffer> => {
  throw new Error('Inhalt sollte nicht gebraucht werden');
};

describe('Erkennung von Titel und Interpret', () => {
  it('aus dem Dateinamen, Rest ist die Fassung', async () => {
    expect(await erkennen('Iris - Goo Goo Dolls - Bass v2.pdf', 'Iris - Goo Goo Dolls - Bass v2.pdf', nie, songs)).toEqual({ key: 'Iris|The Goo Goo Dolls', kandidaten: [], fassung: 'Bass v2', quelle: 'Dateiname' });
  });

  it('mit dem Ordner, wenn der Name allein nicht reicht', async () => {
    const e = await erkennen('Bass.pdf', 'Max Giesinger/80 Millionen/Bass.pdf', nie, songs);
    expect(e).toMatchObject({ key: '80 Millionen|Max Giesinger', quelle: 'Ordner', fassung: 'Bass' });
  });

  it('aus {title}/{artist} eines Akkordblatts', async () => {
    const e = await erkennen('song17.pro', 'song17.pro', text('{title: Hallelujah}\n{artist: Jeff Buckley}\n[C]x'), songs);
    expect(e).toMatchObject({ key: 'Hallelujah|Jeff Buckley', quelle: 'Akkordblatt' });
  });

  it('Titel und Interpret in beliebiger Reihenfolge', async () => {
    expect(await erkennen('Goo Goo Dolls - Iris - Bass.pdf', 'Goo Goo Dolls - Iris - Bass.pdf', nie, songs)).toMatchObject({ key: 'Iris|The Goo Goo Dolls', fassung: 'Bass' });
    expect(await erkennen('The Beatles - Let It Be.pdf', 'The Beatles - Let It Be.pdf', nie, songs)).toMatchObject({ key: 'Let It Be - Remastered 2009|The Beatles', fassung: '' });
    expect(await erkennen('Jeff Buckley_Hallelujah_Gitarre.pdf', 'Jeff Buckley_Hallelujah_Gitarre.pdf', nie, songs)).toMatchObject({ key: 'Hallelujah|Jeff Buckley', fassung: 'Gitarre' });
    expect(await erkennen('Giesinger, Max - 80 Millionen (Keys).pdf', 'Giesinger, Max - 80 Millionen (Keys).pdf', nie, songs)).toMatchObject({ key: '80 Millionen|Max Giesinger', fassung: 'Keys' });
  });

  it('mit Tippfehlern', async () => {
    const e = await erkennen('Iriss - Goo Goo Dools.pro', 'Iriss - Goo Goo Dools.pro', text('[C]ohne Titel'), songs);
    expect(e).toMatchObject({ key: 'Iris|The Goo Goo Dolls', quelle: 'ungefähr', fassung: '' });
    expect(await erkennen('Iris - Goo Goo Dools - Bass.pdf', 'Iris - Goo Goo Dools - Bass.pdf', nie, songs)).toMatchObject({ key: 'Iris|The Goo Goo Dolls', fassung: 'Bass' });
    expect((await erkennen('Leonard Cohen - Halleluja.pro', 'x/Leonard Cohen - Halleluja.pro', text(''), songs)).key).toBe('Hallelujah|Leonard Cohen');
  });

  it('bei Gleichstand Kandidaten zur Auswahl, sonst nichts', async () => {
    const e = await erkennen('Hallelujah Gitarre.pro', 'Hallelujah Gitarre.pro', text('[C]x'), songs);
    expect(e.key).toBeUndefined();
    expect(e.kandidaten.sort()).toEqual(['Hallelujah|Jeff Buckley', 'Hallelujah|Leonard Cohen']);
    expect(e.fassung).toBe('Gitarre');
    expect(await erkennen('Einkaufsliste.pro', 'Einkaufsliste.pro', text('Milch'), songs)).toEqual({ kandidaten: [], fassung: 'Einkaufsliste' });
  });
});
