import { Component, computed, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService, Show } from '../data/band.service';

// „Rückblick schreiben“ auf der Backstage-Seite eines vergangenen Auftritts: Formular → fertiger Block für
// history in src/app/data/band.service.ts (wie das Termin-Formular). Fotos lädt man vorher in public/historie hoch.
const EDIT_URL = 'https://github.com/Jan-Frederic/Blickfeld-Nord/edit/main/src/app/data/band.service.ts';
const UPLOAD_URL = 'https://github.com/Jan-Frederic/Blickfeld-Nord/upload/main/public/historie';

// Apostroph als ’, damit der Text die Anführungszeichen im Code nicht beendet (wie in PFLEGE.md beschrieben)
const q = (s: string) => `'${s.trim().replace(/\\/g, '\\\\').replace(/'/g, '’')}'`;

interface Foto {
  datei: string;
  alt: string;
  credit: string;
}

@Component({
  selector: 'app-rueckblick-formular',
  imports: [MatIconModule],
  template: `
    <details class="neu" [open]="open()" (toggle)="open.set($any($event.target).open)">
      <summary><mat-icon>history_edu</mat-icon> {{ vorhanden() ? 'Rückblick ergänzen' : 'Rückblick schreiben' }}</summary>
      @if (vorhanden()) {
        <p class="problem"><mat-icon>info</mat-icon> Für diesen Tag gibt es schon einen Rückblick („{{ vorhanden() }}“). Ein zweiter Eintrag erscheint zusätzlich.</p>
      }
      <div class="grid">
        <label class="wide">Überschrift *<input [value]="titel()" (input)="titel.set($any($event.target).value)" placeholder="z. B. Weihnachtsmarkt in Rhede" maxlength="100" /></label>
        <label class="wide">Text * <small>(Absätze mit einer Leerzeile trennen)</small>
          <textarea rows="6" [value]="text()" (input)="text.set($any($event.target).value)" placeholder="Wie war der Abend? Was war besonders?"></textarea>
        </label>
        <label class="wide">Instagram-Reel <small>(Link oder Kennung, optional)</small>
          <input [value]="reel()" (input)="reel.set($any($event.target).value)" placeholder="https://www.instagram.com/reel/ABC123/" />
        </label>
      </div>

      <p class="label">Fotos <small>(vorher auf GitHub in public/historie hochladen – ohne GPS-Standort, siehe Anleitung)</small></p>
      @for (f of fotos(); track $index; let i = $index) {
        <div class="grid foto">
          <label>Dateiname<input [value]="f.datei" (input)="foto(i, 'datei', $event)" placeholder="2026-12-04-weihnachtsmarkt.webp" /></label>
          <label class="wide">Beschreibung (für blinde Menschen) *<input [value]="f.alt" (input)="foto(i, 'alt', $event)" placeholder="Was ist auf dem Foto zu sehen?" /></label>
          <label>Fotograf <small>(nur mit Einverständnis)</small><input [value]="f.credit" (input)="foto(i, 'credit', $event)" /></label>
          <button type="button" class="icon" (click)="ohneFoto(i)" aria-label="Foto entfernen"><mat-icon>close</mat-icon></button>
        </div>
      }
      <div class="actions">
        <button type="button" (click)="mitFoto()"><mat-icon>add_photo_alternate</mat-icon> Foto hinzufügen</button>
        <a class="btn" [href]="uploadUrl" target="_blank" rel="noopener"><mat-icon>upload</mat-icon> Fotos auf GitHub hochladen</a>
      </div>

      @if (problem(); as p) {
        <p class="problem"><mat-icon>info</mat-icon> {{ p }}</p>
      } @else {
        <p class="label">Fertiger Block – direkt unter <code>readonly history: HistoryEntry[] = [</code> einfügen (neueste oben):</p>
        <pre class="code">{{ block() }}</pre>
        <div class="actions">
          <button type="button" class="primary" (click)="copy()"><mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon> {{ copied() ? 'Kopiert!' : 'Block kopieren' }}</button>
          <a class="btn" [href]="editUrl" target="_blank" rel="noopener"><mat-icon>edit</mat-icon> Datei auf GitHub öffnen</a>
        </div>
        <p class="hint">Der erste Absatz und das erste Foto erscheinen automatisch auch auf der Konzertseite dieses Auftritts.</p>
      }
    </details>
  `,
  styles: `
    .neu { margin-top: 24px; padding: 14px 18px; border: 1px solid var(--bn-line); border-radius: 12px; }
    summary { display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 600; }
    summary mat-icon { color: var(--bn-sunset); }
    .grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-top: 14px; }
    .grid.foto { grid-template-columns: 1fr 2fr 1fr auto; align-items: end; }
    .wide { grid-column: 1 / -1; }
    .grid.foto .wide { grid-column: auto; }
    label { display: grid; gap: 4px; font-size: .85rem; color: var(--bn-fog); }
    small { font-size: .78rem; }
    input, textarea { padding: 8px 10px; border: 1px solid var(--bn-line); border-radius: 8px; background: #1b1e22; color: var(--bn-ink); font: inherit; box-sizing: border-box; width: 100%; }
    textarea { resize: vertical; }
    .label { margin: 18px 0 6px; font-size: .85rem; color: var(--bn-fog); }
    .code { margin: 0; padding: 12px; border-radius: 8px; background: #111316; overflow-x: auto; font-size: .8rem; line-height: 1.5; white-space: pre; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .actions button, .btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px; border: 1px solid var(--bn-line);
      background: none; color: var(--bn-ink); font: inherit; font-size: .9rem; text-decoration: none; cursor: pointer;
    }
    .actions button:hover, .btn:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .actions .primary { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    .actions mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .icon { display: grid; place-items: center; width: 36px; height: 36px; border: 0; border-radius: 50%; background: none; color: var(--bn-fog); cursor: pointer; }
    .problem { display: flex; align-items: center; gap: 8px; margin: 14px 0 0; color: #e0b25a; font-size: .9rem; }
    .hint { margin: 10px 0 0; font-size: .8rem; color: var(--bn-fog); }
    @media (max-width: 640px) { .grid.foto { grid-template-columns: 1fr auto; } .grid.foto label { grid-column: 1; } }
  `,
})
export class RueckblickFormular {
  readonly show = input.required<Show>();
  private readonly band = inject(BandService);
  protected readonly editUrl = EDIT_URL;
  protected readonly uploadUrl = UPLOAD_URL;
  protected readonly open = signal(false);
  protected readonly titel = signal('');
  protected readonly text = signal('');
  protected readonly reel = signal('');
  protected readonly fotos = signal<Foto[]>([]);
  protected readonly copied = signal(false);

  protected readonly vorhanden = computed(() => this.band.history.find((h) => h.date === this.show().date && !h.example)?.title ?? null);
  private readonly absaetze = computed(() => this.text().split(/\n\s*\n/).map((a) => a.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean));
  // Reel-Kennung aus einem kompletten Link oder direkt eingegeben
  private readonly reelId = computed(() => this.reel().trim().match(/(?:reel\/)?([A-Za-z0-9_-]{5,})\/?(?:\?.*)?$/)?.[1] ?? '');

  protected readonly problem = computed(() => {
    if (!this.titel().trim()) return 'Bitte eine Überschrift eingeben.';
    if (!this.absaetze().length) return 'Bitte einen Text schreiben.';
    if (this.fotos().some((f) => f.datei.trim() && !f.alt.trim())) return 'Bitte jedes Foto beschreiben – für blinde Menschen und Suchmaschinen.';
    if (this.fotos().some((f) => f.datei.trim() && !/\.(webp|jpe?g|png)$/i.test(f.datei.trim()))) return 'Fotos als .webp, .jpg oder .png.';
    return null;
  });

  protected readonly block = computed(() => {
    const zeilen = ['    {', `      date: ${q(this.show().date)},`, `      title: ${q(this.titel())},`, '      text: ['];
    for (const a of this.absaetze()) zeilen.push(`        ${q(a)},`);
    zeilen.push('      ],');
    const fotos = this.fotos().filter((f) => f.datei.trim());
    if (fotos.length) {
      zeilen.push('      images: [');
      for (const f of fotos) {
        const datei = f.datei.trim().replace(/^.*\//, '');
        zeilen.push(`        { src: ${q('historie/' + datei)}, alt: ${q(f.alt)}${f.credit.trim() ? `, credit: ${q(f.credit)}` : ''} },`);
      }
      zeilen.push('      ],');
    }
    if (this.reelId()) zeilen.push(`      reel: ${q(this.reelId())},`);
    zeilen.push('    },');
    return zeilen.join('\n');
  });

  protected mitFoto(): void {
    this.fotos.update((l) => [...l, { datei: '', alt: '', credit: '' }]);
  }
  protected ohneFoto(i: number): void {
    this.fotos.update((l) => l.filter((_, j) => j !== i));
  }
  protected foto(i: number, feld: keyof Foto, e: Event): void {
    const wert = (e.target as HTMLInputElement).value;
    this.fotos.update((l) => l.map((f, j) => (j === i ? { ...f, [feld]: wert } : f)));
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.block());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      window.prompt('Block kopieren:', this.block());
    }
  }
}
