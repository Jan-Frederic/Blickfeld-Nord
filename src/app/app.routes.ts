import { Routes } from '@angular/router';
import { Home } from './pages/home';
import { Impressum } from './pages/impressum';
import { Datenschutz } from './pages/datenschutz';

export const routes: Routes = [
  { path: '', component: Home, title: 'Blickfeld Nord – Offizielle Bandpage' },
  { path: 'impressum', component: Impressum, title: 'Impressum – Blickfeld Nord' },
  { path: 'datenschutz', component: Datenschutz, title: 'Datenschutzerklärung – Blickfeld Nord' },
  { path: '**', redirectTo: '' },
];
