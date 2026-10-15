import { Component, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

// Dateien werden von scripts/build-pressekit.py nach public/presse/ erzeugt
interface Asset {
  title: string;
  info: string;
  file: string;
  preview: string;
  dark?: boolean;
  light?: boolean;
  // Vorschau komplett zeigen statt beschneiden
  contain?: boolean;
}

const PRESS_TEXT = `Was 2019 als Kombo von David Bröker und Matthias Wigger begann, ist heute ein echtes Power-Trio: Seit Oktober 2025 macht Jan-Frederic „Fred“ Overbeck am Bass die Runde komplett. Seitdem heißt es: drei Stimmen, ein Ziel – Party.

Blickfeld Nord spielt Musik, die ins Bein geht und zum Mitsingen einlädt – ein vielseitiges Repertoire aus Pop, Rock, Schlager, Dance und Disco. Egal ob Weihnachtsmarkt, Stadtfest oder private Feier: Wenn Blickfeld Nord auf der Bühne steht, bleibt keiner lange sitzen.`;

@Component({
  selector: 'app-presse',
  imports: [MatIconModule],
  template: `
    <section class="section presse">
      <p class="kicker">Für Presse &amp; Veranstalter</p>
      <h2>Pressekit</h2>
      <p class="lead">
        Alles, was ihr für eine Ankündigung oder einen Bericht über Blickfeld Nord braucht: Infos, Pressetext, Logos und
        Fotos in voller Auflösung.
      </p>

      <div class="main-downloads">
        <a class="btn primary" href="presse/blickfeld-nord-pressekit.pdf" download>
          <mat-icon>picture_as_pdf</mat-icon> Pressekit als PDF
        </a>
        <a class="btn" href="presse/blickfeld-nord-pressekit.zip" download>
          <mat-icon>folder_zip</mat-icon> Alles als ZIP herunterladen
        </a>
      </div>

      <h3>Pressetext</h3>
      <div class="press-text">
        @for (p of paragraphs; track $index) {
          <p>{{ p }}</p>
        }
        <div class="text-actions">
          <button class="btn small" (click)="copy()">
            <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
            {{ copied() ? 'Kopiert!' : 'Text kopieren' }}
          </button>
          <a class="btn small" href="presse/blickfeld-nord-pressetext.txt" download>
            <mat-icon>description</mat-icon> Als Textdatei
          </a>
        </div>
      </div>

      <h3>Logos &amp; Fotos</h3>
      <div class="assets">
        @for (a of assets; track a.file) {
          <a class="asset" [href]="'presse/' + a.file" download>
            <span class="preview" [class.dark]="a.dark" [class.light]="a.light" [class.contain]="a.contain"><img [src]="a.preview" [alt]="a.title" loading="lazy" /></span>
            <span class="meta">
              <span class="title">{{ a.title }}</span>
              <span class="info">{{ a.info }}</span>
            </span>
            <mat-icon class="dl">download</mat-icon>
          </a>
        }
      </div>

      <p class="usage">
        <mat-icon>info</mat-icon>
        Logos und Fotos dürfen für die Ankündigung von Auftritten sowie für die Berichterstattung über Blickfeld Nord
        honorarfrei verwendet werden. Bitte nicht verfremden. Bildnachweis: Blickfeld Nord.
      </p>
    </section>
  `,
  styles: `
    .presse { max-width: 1000px; }
    h3 {
      font-family: var(--bn-display); font-weight: 400; font-size: 1.1rem; text-transform: uppercase;
      letter-spacing: .08em; margin: 40px 0 14px;
    }
    .main-downloads { display: flex; flex-wrap: wrap; gap: 12px; }
    .btn {
      display: inline-flex; align-items: center; gap: 10px; padding: 11px 20px; border-radius: 999px;
      border: 1px solid var(--bn-line); color: var(--bn-ink); background: transparent; text-decoration: none;
      font: 500 .95rem Inter, sans-serif; cursor: pointer; transition: border-color .2s, color .2s, background .2s;
    }
    .btn:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .btn.primary { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    .btn.primary:hover { background: #f0b884; color: #2a1708; }
    .btn.small { padding: 7px 14px; font-size: .85rem; }
    .btn mat-icon { width: 20px; height: 20px; font-size: 20px; }
    .press-text {
      padding: 24px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72);
    }
    .press-text p { line-height: 1.75; color: rgba(236, 233, 228, .88); margin: 0 0 14px; }
    .text-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .assets { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
    .asset {
      display: flex; flex-direction: column; border-radius: 12px; overflow: hidden; position: relative;
      border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); color: var(--bn-ink); text-decoration: none;
      transition: border-color .2s, transform .2s;
    }
    .asset:hover { border-color: var(--bn-sunset); transform: translateY(-2px); }
    .preview { aspect-ratio: 4 / 3; display: block; overflow: hidden; background: #2b2f34; }
    .preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .preview.dark { background: #15171c; display: grid; place-items: center; }
    .preview.dark img { width: 62%; height: auto; object-fit: contain; }
    .preview.light { background: #f4f1ec; display: grid; place-items: center; }
    .preview.light img { width: 62%; height: auto; object-fit: contain; }
    .preview.contain { background: #15171c; display: grid; place-items: center; }
    .preview.contain img { width: 100%; height: auto; object-fit: contain; }
    .meta { display: flex; flex-direction: column; gap: 2px; padding: 12px 44px 14px 14px; }
    .title { font-weight: 600; }
    .info { font-size: .8rem; color: var(--bn-fog); }
    .dl { position: absolute; right: 12px; bottom: 16px; color: var(--bn-sunset); }
    .usage {
      display: flex; gap: 10px; align-items: flex-start; margin-top: 28px; font-size: .9rem; line-height: 1.6;
      color: var(--bn-fog);
    }
    .usage mat-icon { flex: none; color: var(--bn-sunset); }
  `,
})
export class Presse {
  protected readonly paragraphs = PRESS_TEXT.split('\n\n');
  protected readonly copied = signal(false);

  protected readonly assets: Asset[] = [
    { title: 'Bandfoto 1', info: 'JPG · 2000 × 1126 px', file: 'blickfeld-nord-bandfoto-2.jpg', preview: 'galerie/band-2-thumb.webp' },
    { title: 'Bandfoto 2', info: 'JPG · 1600 × 1200 px', file: 'blickfeld-nord-bandfoto-1.jpg', preview: 'galerie/band-1-thumb.webp' },
    { title: 'Logo-Motiv', info: 'JPG · 2000 × 1125 px', file: 'blickfeld-nord-logo-motiv.jpg', preview: 'galerie/logo-thumb.webp', contain: true },
    { title: 'Kompass-Symbol', info: 'PNG · 2048 × 2048 px', file: 'blickfeld-nord-kompass.png', preview: 'icon-512.png', dark: true },
    { title: 'Kompass-Symbol', info: 'SVG · Vektor, beliebig skalierbar', file: 'blickfeld-nord-kompass.svg', preview: 'favicon.svg', dark: true },
    { title: 'Kompass-Logo freigestellt, hell', info: 'PNG transparent · 2048 × 2048 px · für dunkle Untergründe', file: 'blickfeld-nord-kompass-logo-hell.png', preview: 'presse/blickfeld-nord-kompass-logo-hell.svg', dark: true },
    { title: 'Kompass-Logo freigestellt, hell', info: 'SVG · Vektor · für dunkle Untergründe', file: 'blickfeld-nord-kompass-logo-hell.svg', preview: 'presse/blickfeld-nord-kompass-logo-hell.svg', dark: true },
    { title: 'Kompass-Logo freigestellt, dunkel', info: 'PNG transparent · 2048 × 2048 px · für helle Untergründe', file: 'blickfeld-nord-kompass-logo-dunkel.png', preview: 'presse/blickfeld-nord-kompass-logo-dunkel.svg', light: true },
    { title: 'Kompass-Logo freigestellt, dunkel', info: 'SVG · Vektor · für helle Untergründe', file: 'blickfeld-nord-kompass-logo-dunkel.svg', preview: 'presse/blickfeld-nord-kompass-logo-dunkel.svg', light: true },
  ];

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(PRESS_TEXT);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Zwischenablage nicht verfügbar – Text bleibt markierbar
    }
  }
}
