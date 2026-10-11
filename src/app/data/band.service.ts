import { Injectable } from '@angular/core';

export interface Member {
  name: string;
  role: string;
  bio: string;
  initials: string;
}

export interface Photo {
  src: string;
  thumb: string;
  alt: string;
  caption?: string;
}

export interface Show {
  date: string;
  city: string;
  venue: string;
  mapsUrl: string;
}

@Injectable({ providedIn: 'root' })
export class BandService {
  readonly members: Member[] = [
    { name: 'David Bröker', role: 'Gesang & Gitarre', initials: 'DB', bio: 'Schreibt die meisten Texte – am liebsten nachts mit Blick aufs Wasser.' },
    { name: 'Matthias Wigger', role: 'Schlagzeug & Gesang', initials: 'MW', bio: 'Treibt jeden Song nach vorne und hält die Band zusammen.' },
    { name: 'Jan-Frederic Overbeck', role: 'Bass & Gesang', initials: 'JO', bio: 'Das ruhige Fundament der Band – auf und neben der Bühne.' },
  ];

  // Neue Fotos nach public/galerie/ legen (Original + verkleinerte -thumb-Version) und hier eintragen
  readonly photos: Photo[] = [
    { src: 'galerie/band-1.webp', thumb: 'galerie/band-1-thumb.webp', alt: 'Die drei Musiker von Blickfeld Nord knien lachend zwischen Mikrofonständern und Schlagzeug', caption: 'Blickfeld Nord' },
    { src: 'hero.webp', thumb: 'galerie/logo-thumb.webp', alt: 'Blickfeld-Nord-Logo mit Kompass über einem nebligen See', caption: 'Blickfeld Nord' },
    { src: 'galerie/platzhalter-1.webp', thumb: 'galerie/platzhalter-1-thumb.webp', alt: 'Platzhalter – Foto folgt' },
    { src: 'galerie/platzhalter-2.webp', thumb: 'galerie/platzhalter-2-thumb.webp', alt: 'Platzhalter – Foto folgt' },
    { src: 'galerie/platzhalter-3.webp', thumb: 'galerie/platzhalter-3-thumb.webp', alt: 'Platzhalter – Foto folgt' },
    { src: 'galerie/platzhalter-4.webp', thumb: 'galerie/platzhalter-4-thumb.webp', alt: 'Platzhalter – Foto folgt' },
  ];

  readonly shows: Show[] = [
    { date: '2026-12-04', city: 'Rhede', venue: 'Weihnachtsmarkt', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Rhede%2C%20NRW' },
  ];
}
