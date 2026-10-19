import { inject } from '@angular/core';
import { RenderMode, ServerRoute } from '@angular/ssr';
import { BandService } from './data/band.service';

// Beim Build werden alle öffentlichen Seiten als fertiges HTML erzeugt (schneller sichtbar, besser für Google).
// Backstage bleibt bewusst rein clientseitig – private Termine sollen nicht als statisches HTML entstehen.
export const serverRoutes: ServerRoute[] = [
  { path: 'backstage', renderMode: RenderMode.Client },
  { path: 'backstage/:id', renderMode: RenderMode.Client },
  { path: 'backstage/:id/:teil', renderMode: RenderMode.Client },
  {
    path: 'band/:slug',
    renderMode: RenderMode.Prerender,
    // Eine Seite pro Bandmitglied, direkt aus den Bandinfos
    getPrerenderParams: async () => inject(BandService).members.map((m) => ({ slug: m.slug })),
  },
  {
    path: 'konzerte/:id',
    renderMode: RenderMode.Prerender,
    // Eine Seite pro öffentlichem, geklärtem Konzert (auch vergangene – als Rückblick)
    getPrerenderParams: async () => {
      const band = inject(BandService);
      return band.publicShows.map((s) => ({ id: band.showId(s) }));
    },
  },
  { path: '**', renderMode: RenderMode.Prerender },
];
