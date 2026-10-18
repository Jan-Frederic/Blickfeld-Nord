import { Component } from '@angular/core';
import { Gallery } from '../sections/gallery';

// Eigene Unterseite /galerie – Fotos mit Vollbildansicht (Inhalte: photos in band.service.ts)
@Component({
  selector: 'app-galerie-page',
  imports: [Gallery],
  template: `<app-gallery />`,
})
export class GaleriePage {}
