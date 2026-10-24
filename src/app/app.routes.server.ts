import { inject } from '@angular/core';
import { RenderMode, ServerRoute } from '@angular/ssr';
import { BandService } from './data/band.service';
import { rueckblickJahre } from './data/jahresrueckblick';

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
    {
      // Jahresrückblick: das laufende Jahr erst ab dem 15.12. (Deploy an dem Tag: deploy-pages.yml, „schedule“)
      path: `${prefix}jahr/:jahr`,
      renderMode: RenderMode.Prerender,
      getPrerenderParams: async () =>
        rueckblickJahre(inject(BandService).shows, new Date().toISOString().slice(0, 10)).map((j) => ({ jahr: String(j) })),
    },
  ]),
  { path: '**', renderMode: RenderMode.Prerender },
];
