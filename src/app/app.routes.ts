import { Routes } from '@angular/router';
import { Home } from './pages/home';
import { Impressum } from './pages/impressum';
import { Datenschutz } from './pages/datenschutz';
import { MemberPage } from './pages/member';
import { Freunde } from './pages/freunde';
import { Backstage } from './pages/backstage';
import { Historie } from './pages/historie';

export const routes: Routes = [
  { path: '', component: Home, title: 'Blickfeld Nord – Offizielle Bandpage' },
  { path: 'band/:slug', component: MemberPage },
  { path: 'historie', component: Historie, title: 'Historie – Blickfeld Nord' },
  { path: 'freunde', component: Freunde, title: 'Freunde & Partner – Blickfeld Nord' },
  { path: 'backstage', component: Backstage, title: 'Backstage – Blickfeld Nord' },
  { path: 'impressum', component: Impressum, title: 'Impressum – Blickfeld Nord' },
  { path: 'datenschutz', component: Datenschutz, title: 'Datenschutzerklärung – Blickfeld Nord' },
  { path: '**', redirectTo: '' },
];
