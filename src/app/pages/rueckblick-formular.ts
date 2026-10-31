import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService, Show } from '../data/band.service';
import { isPause, loadSetlist } from '../data/setlist-data';
import { ladeBewertungen, songKey } from '../data/bewertung';
import { ladeNachbereitung } from '../data/nachbereitung';

// „Rückblick schreiben“ auf der Backstage-Seite eines vergangenen Auftritts: Formular → fertiger Block für
// history in src/app/data/band.service.ts (wie das Termin-Formular). Fotos lädt man vorher in public/historie hoch.
const EDIT_URL = 'https://github.com/Jan-Frederic/Blickfeld-Nord/edit/main/src/app/data/band.service.ts';
const UPLOAD_URL = 'https://github.com/Jan-Frederic/Blickfeld-Nord/upload/main/public/historie';

// Apostroph als ’, damit der Text die Anführungszeichen im Code nicht beendet (wie in PFLEGE.md beschrieben)
const q = (s: string) => `'${s.trim().replace(/\\/g, '\\\\').replace(/'/g, '’')}'`;
// Songtitel exakt wie im Repertoire (Apostroph maskiert statt ersetzt)
const qs = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

interface Foto {
  datei: string;
  alt: string;
  credit: string;
}

@Component({
  selector: 'app-rueckblick-formular',
  imports: [MatIconModule],
  template: `
    <details class="neu" [open]="open()" (toggle)="aufklappen($any($event.target).open)">
      <summary><mat-icon>history_edu</mat-icon> {{ vorhanden() ? 'Rückblick ergänzen' : 'Rückblick schreiben' }}</summary>
      @if (vorhanden()) {
        <p class="problem"><mat-icon>info</mat-icon> Für diesen Tag gibt es schon einen Rückblick („{{ vorhanden() }}“). Ein zweiter Eintrag erscheint zusätzlich.</p>
      }
      <div class="grid">
        <label class="wide">Überschrift *<input [value]="titel()" (input)="titel.set($any($event.target).value)" placeholder="z. B. Weihnachtsmarkt in Rhede" maxlength="100" /></label>
        <p class="wide hinweis">Vorgefüllt aus Datum, Ort, „Was lief gut“ (Nachbereitung) und Song des Abends – bitte in eigenen Worten ergänzen.</p>
        <label class="wide">Text * <small>(Absätze mit einer Leerzeile trennen)</small>
          <textarea rows="6" [value]="text()" (input)="text.set($any($event.target).value); eigenerText = true" placeholder="Wie war der Abend? Was war besonders?"></textarea>
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

      @if (songs().length) {
        <p class="label">Setlist <small>(von diesem Gerät, {{ songs().length }} Songs)</small></p>
        <div class="grid">
          <label class="check"><input type="checkbox" [checked]="mitSetlist()" (change)="mitSetlist.set($any($event.target).checked)" /> „Gespielt an diesem Abend“ auf der Konzertseite zeigen</label>
          @if (mitSetlist()) {
            <label>Song des Abends <small>(vorbelegt: meiste Sterne)</small>
              <select (change)="highlight.set($any($event.target).value)">
                <option value="" [selected]="!highlight()">– keiner –</option>
                @for (s of songs(); track $index) { <option [value]="s.title" [selected]="s.title === highlight()">{{ s.title }}</option> }
              </select>
            </label>
          }
        </div>
      }

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
    .check { display: flex; align-items: center; gap: 8px; font-size: .9rem; color: var(--bn-ink); }
    .check input { width: auto; }
    input, textarea, select { padding: 8px 10px; border: 1px solid var(--bn-line); border-radius: 8px; background: #1b1e22; color: var(--bn-ink); font: inherit; box-sizing: border-box; width: 100%; }
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
    .hinweis { margin: 0; }
    .link { display: inline-flex; align-items: center; gap: 6px; padding: 0; border: 0; background: none; color: var(--bn-sunset); font: inherit; font-size: .85rem; cursor: pointer; }
    .link mat-icon { font-size: 16px; width: 16px; height: 16px; }
    @media (max-width: 640px) { .grid.foto { grid-template-columns: 1fr auto; } .grid.foto label { grid-column: 1; } }
  `,
})
export class RueckblickFormular {
  readonly show = input.required<Show>();
  private readonly band = inject(BandService);
  protected readonly editUrl = EDIT_URL;
  protected readonly uploadUrl = UPLOAD_URL;
  protected readonly open = signal(false);
  // vorgefüllt: Überschrift mit Ort, Text als Entwurf aus Datum, Ort, „Was lief gut“ und Song des Abends –
  // nur noch ein paar eigene Sätze ergänzen (öffentlich erst nach dem Umformulieren)
  protected readonly titel = linkedSignal(() => `${this.show().venue}${this.show().city && !this.show().venue.includes(this.show().city!) ? ' in ' + this.show().city : ''}`);
  protected readonly text = signal('');
  /** beim Aufklappen den Entwurf frisch erzeugen (die Nachbereitung darüber kann sich geändert haben) – nicht, wenn
   *  schon selbst geschrieben wurde */
  protected eigenerText = false;
  protected aufklappen(offen: boolean): void {
    this.open.set(offen);
    if (offen && (!this.eigenerText || !this.text().trim())) this.text.set(this.entwurf());
  }
  protected readonly reel = signal('');
  protected readonly fotos = signal<Foto[]>([]);
  protected readonly copied = signal(false);

  // Setlist und Sterne dieses Auftritts aus dem Browser
  private readonly id = computed(() => this.band.showId(this.show()));
  protected readonly songs = computed(() => loadSetlist(this.id()).filter((e) => !isPause(e)) as { title: string; artist: string }[]);
  protected readonly mitSetlist = signal(true);
  /** „Was lief gut“ aus der Nachbereitung – öffentlich erst nach dem Umformulieren */
  // bei jedem Zeichnen frisch gelesen – die Nachbereitung steht gleich darüber und ändert sich nebenher
  protected ausNachbereitung(): string {
    return ladeNachbereitung(this.id()).gut.trim();
  }
  private entwurf(): string {
    const s = this.show();
    const tag = new Date(`${s.date}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
    const absaetze = [`Am ${tag} waren wir bei ${s.venue}${s.city && !s.venue.includes(s.city) ? ' in ' + s.city : ''} zu Gast.`];
    const gut = this.ausNachbereitung();
    if (gut) absaetze.push(gut);
    const h = this.highlight();
    if (h) absaetze.push(`Unser Song des Abends: „${h}“.`);
    absaetze.push(`Danke an alle, die dabei waren!`);
    return absaetze.join('\n\n');
  }
  protected readonly highlight = linkedSignal(() => {
    const sterne = ladeBewertungen(this.id());
    let best: { title: string; n: number } | null = null;
    for (const s of this.songs()) {
      const n = sterne[songKey(s)] ?? 0;
      if (n && (!best || n > best.n)) best = { title: s.title, n };
    }
    return best?.title ?? '';
  });

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
    if (this.mitSetlist() && this.songs().length) {
      zeilen.push('      setlist: [');
      for (const s of this.songs()) zeilen.push(`        { title: ${qs(s.title)}, artist: ${qs(s.artist)} },`);
      zeilen.push('      ],');
      if (this.highlight()) zeilen.push(`      highlight: ${qs(this.highlight())},`);
    }
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
