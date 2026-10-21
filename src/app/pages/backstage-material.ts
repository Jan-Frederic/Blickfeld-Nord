import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BackstageNav } from './backstage-nav';

// Backstage → Material: Druckvorlagen und Unterlagen für Veranstalter – je Sprache (scripts/build-*.py, public/presse/).
// Plakate und Laufzettel entstehen pro Auftritt auf dessen Unterseite.
const SPRACHEN = [
  { suffix: '', label: 'DE' },
  { suffix: '-en', label: 'EN' },
  { suffix: '-nl', label: 'NL' },
];

const MATERIAL = [
  { file: 'blickfeld-nord-wunschbox', ext: 'pdf', icon: 'qr_code_2', title: 'Wunschbox-Schild', text: 'A4-Schild mit großem QR-Code zur Live-Wunschbox – für Bühne oder Theke.' },
  { file: 'blickfeld-nord-qr-karte', ext: 'pdf', icon: 'style', title: 'QR-Code-Karte', text: 'Schild mit QR-Codes zu Website und Instagram plus vier Flyer-Karten zum Ausschneiden.' },
  { file: 'blickfeld-nord-technik-rider', ext: 'pdf', icon: 'speaker', title: 'Technik-Rider', text: 'Platz, Strom, Zeitplan, Bühnenplan und Kanalliste – für Veranstalter und Technik.' },
  { file: 'blickfeld-nord-pressekit', ext: 'pdf', icon: 'newspaper', title: 'Pressekit', text: 'Infos, Pressetext, Kontakt, Fotos und Logos auf drei Seiten.' },
  { file: 'blickfeld-nord-pressekit', ext: 'zip', icon: 'folder_zip', title: 'Pressekit komplett (ZIP)', text: 'PDF, Pressetext, Fotos und Logos in voller Auflösung.' },
];

@Component({
  selector: 'app-backstage-material',
  imports: [MatIconModule, BackstageNav],
  template: `
    <section class="section">
      <app-backstage-nav />
      <p class="kicker">Backstage</p>
      <h2>Material</h2>
      <p class="lead">Zum Drucken und Verschicken – jeweils auf Deutsch, Englisch und Niederländisch. Plakat, Story und Laufzettel gibt es auf der Seite des jeweiligen Auftritts.</p>
      <ul class="list">
        @for (m of material; track m.file + m.ext) {
          <li>
            <mat-icon>{{ m.icon }}</mat-icon>
            <div>
              <h3>{{ m.title }}</h3>
              <p>{{ m.text }}</p>
            </div>
            <span class="langs">
              @for (s of sprachen; track s.label) {
                <a [href]="'presse/' + m.file + s.suffix + '.' + m.ext" target="_blank" rel="noopener" [attr.aria-label]="m.title + ' ' + s.label">{{ s.label }}</a>
              }
            </span>
          </li>
        }
      </ul>
    </section>
  `,
  styles: `
    .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
    li {
      display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 16px; padding: 16px 18px;
      border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72);
    }
    li > mat-icon { color: var(--bn-sunset); }
    li h3 { margin: 0 0 4px; font-size: 1rem; font-weight: 600; }
    li p { margin: 0; font-size: .88rem; line-height: 1.5; color: var(--bn-fog); }
    .langs { display: flex; gap: 6px; }
    .langs a {
      padding: 6px 12px; border-radius: 999px; border: 1px solid var(--bn-line); color: var(--bn-ink);
      text-decoration: none; font-size: .8rem; letter-spacing: .08em;
    }
    .langs a:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    @media (max-width: 560px) {
      li { grid-template-columns: auto 1fr; }
      .langs { grid-column: 2; }
    }
  `,
})
export class BackstageMaterial {
  protected readonly material = MATERIAL;
  protected readonly sprachen = SPRACHEN;
}
