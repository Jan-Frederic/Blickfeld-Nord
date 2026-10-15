import { Routes } from '@angular/router';
import { Home } from './pages/home';

// Startseite direkt im Hauptpaket, alle Unterseiten werden erst beim Aufruf geladen (kleineres Start-JavaScript)
export const routes: Routes = [
  { path: '', component: Home, title: 'Blickfeld Nord – Offizielle Bandpage' },
  { path: 'band/:slug', loadComponent: () => import('./pages/member').then((m) => m.MemberPage) },
  { path: 'historie', loadComponent: () => import('./pages/historie').then((m) => m.Historie), title: 'Historie – Blickfeld Nord' },
  { path: 'presse', loadComponent: () => import('./pages/presse').then((m) => m.Presse), title: 'Pressekit – Blickfeld Nord' },
  { path: 'freunde', loadComponent: () => import('./pages/freunde').then((m) => m.Freunde), title: 'Freunde & Partner – Blickfeld Nord' },
  { path: 'backstage', loadComponent: () => import('./pages/backstage').then((m) => m.Backstage), title: 'Backstage – Blickfeld Nord' },
  { path: 'impressum', loadComponent: () => import('./pages/impressum').then((m) => m.Impressum), title: 'Impressum – Blickfeld Nord' },
  { path: 'datenschutz', loadComponent: () => import('./pages/datenschutz').then((m) => m.Datenschutz), title: 'Datenschutzerklärung – Blickfeld Nord' },
  { path: '**', redirectTo: '' },
];
