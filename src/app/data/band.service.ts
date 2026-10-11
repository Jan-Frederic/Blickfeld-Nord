import { Injectable } from '@angular/core';

export interface Member {
  name: string;
  role: string;
  bio: string;
  initials: string;
}

export interface Track {
  title: string;
  duration: string;
}

export interface Release {
  title: string;
  type: 'Album' | 'EP' | 'Single';
  year: number;
  cover: string;
  tracks: Track[];
}

export interface Show {
  date: string;
  city: string;
  venue: string;
  status: 'Tickets' | 'Wenige Tickets' | 'Ausverkauft';
}

@Injectable({ providedIn: 'root' })
export class BandService {
  readonly members: Member[] = [
    { name: 'Matthias Wigger', role: 'Gesang & Gitarre', initials: 'MW', bio: 'Schreibt die meisten Texte – am liebsten nachts mit Blick aufs Wasser.' },
    { name: 'David Bröker', role: 'Gitarre & Bass', initials: 'DB', bio: 'Zuständig für Hall, Delay und alles, was nach Weite klingt.' },
    { name: 'Jan-Frederic Overbeck', role: 'Schlagzeug', initials: 'JO', bio: 'Treibt jeden Song nach vorne und hält die Band zusammen.' },
  ];

  readonly releases: Release[] = [
    {
      title: 'Gegenwind', type: 'Album', year: 2026, cover: 'linear-gradient(135deg, #0f2d40, #3a7ca5)',
      tracks: [
        { title: 'Gegenwind', duration: '3:52' },
        { title: 'Leuchtturm', duration: '4:15' },
        { title: 'Salz auf der Haut', duration: '3:38' },
        { title: 'Nordlicht', duration: '5:02' },
        { title: 'Ebbe', duration: '4:21' },
        { title: 'Wenn die Möwen schweigen', duration: '3:47' },
      ],
    },
    {
      title: 'Horizont', type: 'EP', year: 2024, cover: 'linear-gradient(135deg, #2b1f3d, #a5617a)',
      tracks: [
        { title: 'Horizont', duration: '3:44' },
        { title: 'Kompass', duration: '3:29' },
        { title: 'Küstenstraße', duration: '4:08' },
        { title: 'Blickfeld', duration: '4:36' },
      ],
    },
    {
      title: 'Erste Welle', type: 'Single', year: 2023, cover: 'linear-gradient(135deg, #12332b, #5fa58a)',
      tracks: [
        { title: 'Erste Welle', duration: '3:31' },
        { title: 'Erste Welle (Akustik)', duration: '3:55' },
      ],
    },
  ];

  readonly shows: Show[] = [
    { date: '2026-10-24', city: 'Hamburg', venue: 'Molotow', status: 'Wenige Tickets' },
    { date: '2026-10-31', city: 'Kiel', venue: 'Die Pumpe', status: 'Tickets' },
    { date: '2026-11-07', city: 'Flensburg', venue: 'Volksbad', status: 'Tickets' },
    { date: '2026-11-14', city: 'Bremen', venue: 'Tower', status: 'Ausverkauft' },
    { date: '2026-11-21', city: 'Lübeck', venue: 'Treibsand', status: 'Tickets' },
    { date: '2026-12-05', city: 'Berlin', venue: 'Badehaus', status: 'Wenige Tickets' },
    { date: '2026-12-12', city: 'Rostock', venue: 'Peter-Weiss-Haus', status: 'Tickets' },
  ];
}
