import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { I18n, tr } from '../i18n';

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

const PRESS_TEXT_EN = `What started in 2019 as a duo of David Bröker and Matthias Wigger is now a real power trio: since October 2025, Jan-Frederic “Fred” Overbeck on bass has completed the line-up. Ever since, it's been three voices, one goal – party.

Blickfeld Nord plays music that gets your feet moving and invites everyone to sing along – a varied repertoire of pop, rock, German Schlager, dance and disco. Whether it's a Christmas market, a town festival or a private party: when Blickfeld Nord is on stage, nobody stays seated for long.`;

const PRESS_TEXT_NL = `Wat in 2019 begon als duo van David Bröker en Matthias Wigger, is nu een echte powertrio: sinds oktober 2025 maakt Jan-Frederic „Fred” Overbeck op bas het geheel compleet. Sindsdien geldt: drie stemmen, één doel – feest.

Blickfeld Nord speelt muziek die in de benen kruipt en uitnodigt om mee te zingen – een gevarieerd repertoire van pop, rock, schlagers, dance en disco. Of het nu een kerstmarkt, een stadsfeest of een privéfeest is: als Blickfeld Nord op het podium staat, blijft niemand lang zitten.`;

// Dateien der Downloads – Titel und Beschreibung je Sprache in TEXT.assets (gleiche Reihenfolge)
const FILES: Omit<Asset, 'title' | 'info'>[] = [
  { file: 'blickfeld-nord-bandfoto-2.jpg', preview: 'galerie/band-2-thumb.webp' },
  { file: 'blickfeld-nord-bandfoto-1.jpg', preview: 'galerie/band-1-thumb.webp' },
  { file: 'blickfeld-nord-logo-motiv.jpg', preview: 'galerie/logo-thumb.webp', contain: true },
  { file: 'blickfeld-nord-kompass.png', preview: 'icon-512.png', dark: true },
  { file: 'blickfeld-nord-kompass.svg', preview: 'favicon.svg', dark: true },
  { file: 'blickfeld-nord-kompass-logo-hell.png', preview: 'presse/blickfeld-nord-kompass-logo-hell.svg', dark: true },
  { file: 'blickfeld-nord-kompass-logo-hell.svg', preview: 'presse/blickfeld-nord-kompass-logo-hell.svg', dark: true },
  { file: 'blickfeld-nord-kompass-logo-dunkel.png', preview: 'presse/blickfeld-nord-kompass-logo-dunkel.svg', light: true },
  { file: 'blickfeld-nord-kompass-logo-dunkel.svg', preview: 'presse/blickfeld-nord-kompass-logo-dunkel.svg', light: true },
];

const TEXT = tr(
  {
    kicker: 'Für Presse & Veranstalter',
    lead: 'Alles, was ihr für eine Ankündigung oder einen Bericht über Blickfeld Nord braucht: Infos, Pressetext, Logos und Fotos in voller Auflösung.',
    pdf: 'Pressekit als PDF',
    zip: 'Alles als ZIP herunterladen',
    qr: 'QR-Code-Karte zum Ausdrucken',
    pressText: 'Pressetext',
    text: PRESS_TEXT,
    copied: 'Kopiert!',
    copy: 'Text kopieren',
    txt: 'Als Textdatei',
    logos: 'Logos & Fotos',
    usage: 'Logos und Fotos dürfen für die Ankündigung von Auftritten sowie für die Berichterstattung über Blickfeld Nord honorarfrei verwendet werden. Bitte nicht verfremden. Bildnachweis: Blickfeld Nord.',
    assets: [
      { title: 'Bandfoto 1', info: 'JPG · 2000 × 1126 px' },
      { title: 'Bandfoto 2', info: 'JPG · 1600 × 1200 px' },
      { title: 'Logo-Motiv', info: 'JPG · 2000 × 1125 px' },
      { title: 'Kompass-Symbol', info: 'PNG · 2048 × 2048 px' },
      { title: 'Kompass-Symbol', info: 'SVG · Vektor, beliebig skalierbar' },
      { title: 'Kompass-Logo freigestellt, hell', info: 'PNG transparent · 2048 × 2048 px · für dunkle Untergründe' },
      { title: 'Kompass-Logo freigestellt, hell', info: 'SVG · Vektor · für dunkle Untergründe' },
      { title: 'Kompass-Logo freigestellt, dunkel', info: 'PNG transparent · 2048 × 2048 px · für helle Untergründe' },
      { title: 'Kompass-Logo freigestellt, dunkel', info: 'SVG · Vektor · für helle Untergründe' },
    ],
  },
  {
    kicker: 'For press & organisers',
    lead: 'Everything you need for an announcement or a report about Blickfeld Nord: info, press text, logos and photos in full resolution.',
    pdf: 'Press kit as PDF',
    zip: 'Download everything as ZIP',
    qr: 'QR code card to print',
    pressText: 'Press text',
    text: PRESS_TEXT_EN,
    copied: 'Copied!',
    copy: 'Copy text',
    txt: 'As text file',
    logos: 'Logos & photos',
    usage: 'Logos and photos may be used free of charge to announce shows and for reporting on Blickfeld Nord. Please do not alter them. Photo credit: Blickfeld Nord.',
    assets: [
      { title: 'Band photo 1', info: 'JPG · 2000 × 1126 px' },
      { title: 'Band photo 2', info: 'JPG · 1600 × 1200 px' },
      { title: 'Logo artwork', info: 'JPG · 2000 × 1125 px' },
      { title: 'Compass symbol', info: 'PNG · 2048 × 2048 px' },
      { title: 'Compass symbol', info: 'SVG · vector, scales to any size' },
      { title: 'Compass logo, cut out, light', info: 'PNG transparent · 2048 × 2048 px · for dark backgrounds' },
      { title: 'Compass logo, cut out, light', info: 'SVG · vector · for dark backgrounds' },
      { title: 'Compass logo, cut out, dark', info: 'PNG transparent · 2048 × 2048 px · for light backgrounds' },
      { title: 'Compass logo, cut out, dark', info: 'SVG · vector · for light backgrounds' },
    ],
  },
  {
    kicker: 'Voor pers & organisatoren',
    lead: "Alles wat je nodig hebt voor een aankondiging of een bericht over Blickfeld Nord: info, perstekst, logo's en foto's in volledige resolutie.",
    pdf: 'Perskit als pdf',
    zip: 'Alles downloaden als zip',
    qr: 'QR-codekaart om te printen',
    pressText: 'Perstekst',
    text: PRESS_TEXT_NL,
    copied: 'Gekopieerd!',
    copy: 'Tekst kopiëren',
    txt: 'Als tekstbestand',
    logos: "Logo's & foto's",
    usage: "Logo's en foto's mogen kosteloos worden gebruikt om optredens aan te kondigen en voor berichtgeving over Blickfeld Nord. Graag niet bewerken. Fotocredit: Blickfeld Nord.",
    assets: [
      { title: 'Bandfoto 1', info: 'JPG · 2000 × 1126 px' },
      { title: 'Bandfoto 2', info: 'JPG · 1600 × 1200 px' },
      { title: 'Logomotief', info: 'JPG · 2000 × 1125 px' },
      { title: 'Kompassymbool', info: 'PNG · 2048 × 2048 px' },
      { title: 'Kompassymbool', info: 'SVG · vector, onbeperkt schaalbaar' },
      { title: 'Kompaslogo vrijstaand, licht', info: 'PNG transparant · 2048 × 2048 px · voor donkere achtergronden' },
      { title: 'Kompaslogo vrijstaand, licht', info: 'SVG · vector · voor donkere achtergronden' },
      { title: 'Kompaslogo vrijstaand, donker', info: 'PNG transparant · 2048 × 2048 px · voor lichte achtergronden' },
      { title: 'Kompaslogo vrijstaand, donker', info: 'SVG · vector · voor lichte achtergronden' },
    ],
  },
);

@Component({
  selector: 'app-presse',
  imports: [MatIconModule],
  template: `
    <section class="section presse">
      <p class="kicker">{{ t().kicker }}</p>
      <h2>Pressekit</h2>
      <p class="lead">{{ t().lead }}</p>

      <div class="main-downloads">
        <a class="btn primary" [href]="'presse/blickfeld-nord-pressekit' + sfx() + '.pdf'" download>
          <mat-icon>picture_as_pdf</mat-icon> {{ t().pdf }}
        </a>
        <a class="btn" [href]="'presse/blickfeld-nord-pressekit' + sfx() + '.zip'" download>
          <mat-icon>folder_zip</mat-icon> {{ t().zip }}
        </a>
        <a class="btn" [href]="'presse/blickfeld-nord-qr-karte' + sfx() + '.pdf'" download>
          <mat-icon>qr_code_2</mat-icon> {{ t().qr }}
        </a>
      </div>

      <h3>{{ t().pressText }}</h3>
      <div class="press-text">
        @for (p of paragraphs(); track $index) {
          <p>{{ p }}</p>
        }
        <div class="text-actions">
          <button class="btn small" (click)="copy()">
            <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
            {{ copied() ? t().copied : t().copy }}
          </button>
          <a class="btn small" [href]="'presse/blickfeld-nord-pressetext' + sfx() + '.txt'" download>
            <mat-icon>description</mat-icon> {{ t().txt }}
          </a>
        </div>
      </div>

      <h3>{{ t().logos }}</h3>
      <div class="assets">
        @for (a of assets(); track a.file) {
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
        {{ t().usage }}
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
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t(TEXT);
  // Pressekit, Pressetext und QR-Karte gibt es je Sprache (scripts/build-pressekit.py, build-qr-karte.py): Deutsch ohne Zusatz, sonst -en / -nl
  protected readonly sfx = computed(() => (this.i18n.lang() === 'de' ? '' : '-' + this.i18n.lang()));
  protected readonly paragraphs = computed(() => this.t().text.split('\n\n'));
  protected readonly copied = signal(false);
  protected readonly assets = computed((): Asset[] => FILES.map((f, i) => ({ ...f, ...this.t().assets[i] })));

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.t().text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Zwischenablage nicht verfügbar – Text bleibt markierbar
    }
  }
}
