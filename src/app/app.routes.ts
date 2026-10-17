import { Routes } from '@angular/router';
import { Home } from './pages/home';

// Startseite direkt im Hauptpaket, alle Unterseiten werden erst beim Aufruf geladen (kleineres Start-JavaScript)
export const routes: Routes = [
  { path: '', component: Home, title: 'Blickfeld Nord – Offizielle Bandpage' },
  { path: 'band/:slug', loadComponent: () => import('./pages/member').then((m) => m.MemberPage) },
  { path: 'booking', loadComponent: () => import('./pages/booking').then((m) => m.BookingPage), title: 'Booking – Blickfeld Nord', data: { description: 'Blickfeld Nord buchen: Partyband für Feste, private Feiern und Kneipen – Verfügbarkeit, Technik, Spielzeit, häufige Fragen und Kontakt.' } },
  { path: 'historie', loadComponent: () => import('./pages/historie').then((m) => m.Historie), title: 'Historie – Blickfeld Nord', data: { description: 'Unsere Geschichte in Momenten: Auftritte, Orte und Begegnungen von Blickfeld Nord – mit Fotos und Videos.' } },
  { path: 'presse', loadComponent: () => import('./pages/presse').then((m) => m.Presse), title: 'Pressekit – Blickfeld Nord', data: { description: 'Pressetext, Logos und Fotos von Blickfeld Nord zum Download – für Veranstalter, Presse und Plakate.' } },
  { path: 'freunde', loadComponent: () => import('./pages/freunde').then((m) => m.Freunde), title: 'Freunde & Partner – Blickfeld Nord', data: { description: 'Befreundete Bands, Locations und Vereine von Blickfeld Nord – vom Café Lotti bis zur Drum School.' } },
  { path: 'backstage', loadComponent: () => import('./pages/backstage').then((m) => m.Backstage), title: 'Backstage – Blickfeld Nord', data: { robots: 'noindex, nofollow' } },
  { path: 'impressum', loadComponent: () => import('./pages/impressum').then((m) => m.Impressum), title: 'Impressum – Blickfeld Nord', data: { description: 'Impressum der Band Blickfeld Nord.' } },
  { path: 'datenschutz', loadComponent: () => import('./pages/datenschutz').then((m) => m.Datenschutz), title: 'Datenschutzerklärung – Blickfeld Nord', data: { description: 'Datenschutzerklärung der Website von Blickfeld Nord.' } },
  // Fehlerseite: /404 wird vorgerendert und beim Deploy als 404.html genutzt
  { path: '404', loadComponent: () => import('./pages/not-found').then((m) => m.NotFound), title: 'Seite nicht gefunden – Blickfeld Nord', data: { robots: 'noindex' } },
  { path: '**', loadComponent: () => import('./pages/not-found').then((m) => m.NotFound), title: 'Seite nicht gefunden – Blickfeld Nord', data: { robots: 'noindex' } },
];
