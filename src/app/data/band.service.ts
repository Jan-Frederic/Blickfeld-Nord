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
    { name: 'David Bröker', role: 'Gesang & Gitarre', initials: 'DB', bio: 'Schreibt die meisten Texte – am liebsten nachts mit Blick aufs Wasser.' },
    { name: 'Matthias Wigger', role: 'Schlagzeug & Gesang', initials: 'MW', bio: 'Treibt jeden Song nach vorne und hält die Band zusammen.' },
    { name: 'Jan-Frederic Overbeck', role: 'Bass & Gesang', initials: 'JO', bio: 'Das ruhige Fundament der Band – auf und neben der Bühne.' },
  ];

  readonly releases: Release[] = [
    {
      title: 'Gegenwind', type: 'Album', year: 2026, cover: 'linear-gradient(180deg, #1c1f23 0%, #2c3034 55%, #b9774a 100%)',
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
      title: 'Horizont', type: 'EP', year: 2024, cover: 'linear-gradient(180deg, #23272b 0%, #3d4248 60%, #6f7a84 100%)',
      tracks: [
        { title: 'Horizont', duration: '3:44' },
        { title: 'Kompass', duration: '3:29' },
        { title: 'Küstenstraße', duration: '4:08' },
        { title: 'Blickfeld', duration: '4:36' },
      ],
    },
    {
      title: 'Erste Welle', type: 'Single', year: 2023, cover: 'linear-gradient(180deg, #121417 0%, #1f2a2c 60%, #4c5d5c 100%)',
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
