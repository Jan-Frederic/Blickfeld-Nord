import { inject } from '@angular/core';
import { RenderMode, ServerRoute } from '@angular/ssr';
import { BandService } from './data/band.service';

// Beim Build werden alle öffentlichen Seiten als fertiges HTML erzeugt (schneller sichtbar, besser für Google).
// Backstage bleibt bewusst rein clientseitig – private Termine sollen nicht als statisches HTML entstehen.
export const serverRoutes: ServerRoute[] = [
  { path: 'backstage', renderMode: RenderMode.Client },
  { path: 'backstage/:id', renderMode: RenderMode.Client },
  { path: 'backstage/:id/:teil', renderMode: RenderMode.Client },
  // je Sprache eine Seite pro Bandmitglied und pro öffentlichem, geklärtem Konzert
  ...['', 'en/', 'nl/'].flatMap((prefix): ServerRoute[] => [
    {
      path: `${prefix}band/:slug`,
      renderMode: RenderMode.Prerender,
      getPrerenderParams: async () => inject(BandService).members.map((m) => ({ slug: m.slug })),
    },
    {
      path: `${prefix}konzerte/:id`,
      renderMode: RenderMode.Prerender,
      // auch vergangene Konzerte – als Rückblick
      getPrerenderParams: async () => {
        const band = inject(BandService);
        return band.publicShows.map((s) => ({ id: band.showId(s) }));
      },
    },
  ]),
  { path: '**', renderMode: RenderMode.Prerender },
];
