import { Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import data from '../data/repertoire.json';
import { Fund, uebernehmen } from '../data/einlesen';
import { Fortschritt, Stand } from './fortschritt';

// Was in einem Ordner gefunden wurde (Abgleich → Ordner auf dem Gerät bzw. Synchronisation): Backstage-Dateien und
// Notenpakete einzeln wählbar (die neuesten vorausgewählt); Noten-Dateien je Datei mit erkanntem Song (Titel –
// Interpret, data/erkennung.ts), Auswahl bei Unklarem und Fassung zum Korrigieren; dann einlesen.
@Component({
  selector: 'app-funde-liste',
  imports: [MatIconModule, Fortschritt],
  template: `
    <div class="funde">
      @if (!funde().length) { <p>Hier ist nichts, was sich einlesen ließe (Backstage-Dateien, Notenpakete, PDFs, .pro).</p> }
      @for (d of einzeln(); track d.pfad) {
        <label class="check"><input type="checkbox" [checked]="gewaehlt().has(d.pfad)" (change)="waehlen(d.pfad)" />
          {{ d.art === 'backstage' ? 'Backstage' : 'Notenpaket' }} · {{ d.pfad }} <small>{{ datum(d.geaendert) }}</small></label>
      }
      @if (noten().length) {
        <div class="noten">
          <p class="kopf">{{ notenText() }} – {{ erkanntZahl() }} von {{ noten().length }} erkannt.
            @if (erkanntZahl() < noten().length) {
              <label class="check klein"><input type="checkbox" [checked]="nurOffene()" (change)="nurOffene.set($any($event.target).checked)" /> nur nicht erkannte zeigen</label>
            }
          </p>
          <ul>
            @for (d of sichtbar(); track d.pfad) {
              @let z = ziele().get(d.pfad);
              <li [class.offen]="!z?.key">
                <input type="checkbox" [checked]="!!z?.an" [disabled]="!z?.key" (change)="setzen(d.pfad, { an: $any($event.target).checked })" [attr.aria-label]="d.pfad + ' einlesen'" />
                <span class="datei">{{ d.pfad }}
                  <small>{{ z?.key ? (d.erkennung?.key === z?.key ? 'erkannt über ' + d.erkennung?.quelle : 'von Hand gewählt') : d.erkennung?.kandidaten?.length ? 'mehrere möglich – bitte wählen' : 'nicht erkannt – bitte wählen' }}</small>
                </span>
                <select [attr.aria-label]="'Song für ' + d.pfad" (change)="setzen(d.pfad, { key: $any($event.target).value, an: !!$any($event.target).value })">
                  <option value="" [selected]="!z?.key">– Song wählen –</option>
                  @if (d.erkennung?.kandidaten?.length) {
                    <optgroup label="Passend">
                      @for (k of d.erkennung!.kandidaten; track k) { <option [value]="k" [selected]="z?.key === k">{{ anzeige(k) }}</option> }
                    </optgroup>
                  }
                  <optgroup label="Repertoire">
                    @for (s of repertoire; track s.key) { <option [value]="s.key" [selected]="z?.key === s.key">{{ s.text }}</option> }
                  </optgroup>
                </select>
                @if (d.art === 'pdf') {
                  <input class="fassung" placeholder="Fassung" maxlength="30" [value]="z?.fassung ?? ''" (change)="setzen(d.pfad, { fassung: $any($event.target).value.trim() })" [attr.aria-label]="'Fassung für ' + d.pfad" />
                }
              </li>
            }
          </ul>
        </div>
      }
      @if (hatBackstage()) {
        <label class="check"><input type="checkbox" [checked]="ersetzen()" (change)="ersetzen.set($any($event.target).checked)" /> Backstage-Daten ersetzen statt ergänzen</label>
      }
      @if (funde().length) {
        <button type="button" class="primaer" (click)="einlesen()" [disabled]="laeuft() || !anzahl()"><mat-icon>download</mat-icon> Einlesen</button>
      }
      @if (stand(); as s) { <app-fortschritt [stand]="s" /> }
      @if (meldung(); as m) { <p class="meldung" role="status">{{ m }}</p> }
      @if (ohne().length) { <p class="fehler">Nicht zugeordnet (Titel und Interpret nicht im Dateinamen erkannt): {{ ohne().join(', ') }}</p> }
    </div>
  `,
  styles: `
    .funde { display: grid; gap: 8px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--bn-line); justify-items: start; }
    p { margin: 0; max-width: 720px; font-size: .88rem; line-height: 1.55; color: var(--bn-fog); }
    .check { display: inline-flex; align-items: center; gap: 8px; font-size: .88rem; overflow-wrap: anywhere; }
    .check input { flex: none; accent-color: var(--bn-sunset); }
    small { color: var(--bn-fog); }
    button { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px; border: 1px solid var(--bn-sunset); background: var(--bn-sunset); color: #2a1708; font: inherit; font-size: .86rem; cursor: pointer; }
    button:disabled { opacity: .4; cursor: default; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .meldung { color: #5fb88a; }
    .noten { width: 100%; }
    .kopf { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 14px; margin-bottom: 6px; }
    .klein { font-size: .8rem; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; max-height: 420px; overflow: auto; }
    li { display: grid; grid-template-columns: auto minmax(0, 1fr) minmax(0, 220px) 110px; align-items: center; gap: 4px 10px; padding: 6px 0; border-bottom: 1px solid rgba(255, 255, 255, .06); font-size: .85rem; }
    li.offen .datei small { color: #e8a46a; }
    .datei { display: grid; overflow-wrap: anywhere; }
    li select, li .fassung { width: 100%; box-sizing: border-box; padding: 5px 6px; border: 1px solid var(--bn-line); border-radius: 8px; background: #1b1e22; color: var(--bn-ink); font: inherit; font-size: .82rem; color-scheme: dark; }
    @media (max-width: 640px) {
      li { grid-template-columns: auto minmax(0, 1fr); }
      li select, li .fassung { grid-column: 2; }
    }
    .fehler { color: #e07a5a; }
  `,
})
export class FundeListe {
  readonly funde = input.required<Fund[]>();
  readonly geaendert = output<void>();
  protected readonly gewaehlt = signal(new Set<string>());
  /** je Noten-Datei: gewählter Song, Fassung, einlesen ja/nein */
  protected readonly ziele = signal(new Map<string, { key: string; fassung: string; an: boolean }>());
  protected readonly nurOffene = signal(false);
  protected readonly repertoire = [...data.tracks]
    .map((t) => ({ key: `${t.title}|${t.artist}`, text: `${t.title} – ${t.artist}` }))
    .sort((a, b) => a.text.localeCompare(b.text, 'de'));
  protected readonly ersetzen = signal(false);
  protected readonly laeuft = signal(false);
  protected readonly meldung = signal('');
  protected readonly stand = signal<Stand | null>(null);
  protected readonly ohne = signal<string[]>([]);

  protected readonly einzeln = computed(() => this.funde().filter((d) => d.art === 'backstage' || d.art === 'noten'));
  protected readonly hatBackstage = computed(() => this.funde().some((d) => d.art === 'backstage'));
  protected readonly noten = computed(() => this.funde().filter((d) => d.art === 'pdf' || d.art === 'akkordblatt'));
  protected readonly sichtbar = computed(() => (this.nurOffene() ? this.noten().filter((d) => !this.ziele().get(d.pfad)?.key) : this.noten()));
  protected readonly erkanntZahl = computed(() => this.noten().filter((d) => this.ziele().get(d.pfad)?.key).length);
  protected readonly notenZahl = computed(() => ({ pdfs: this.funde().filter((d) => d.art === 'pdf').length, pro: this.funde().filter((d) => d.art === 'akkordblatt').length }));
  protected readonly notenText = computed(() => {
    const { pdfs, pro } = this.notenZahl();
    return [pdfs && `${pdfs} ${pdfs === 1 ? 'PDF' : 'PDFs'}`, pro && `${pro} ${pro === 1 ? 'Akkordblatt' : 'Akkordblätter'}`].filter(Boolean).join(' und ');
  });
  protected readonly anzahl = computed(() => this.gewaehlt().size + [...this.ziele().values()].filter((z) => z.an && z.key).length);

  constructor() {
    // neue Funde: die neueste Backstage-Datei und das neueste Notenpaket vorauswählen
    effect(() => {
      const f = this.funde();
      untracked(() => {
        this.gewaehlt.set(new Set([f.find((d) => d.art === 'backstage')?.pfad, f.find((d) => d.art === 'noten')?.pfad].filter((x): x is string => !!x)));
        this.ziele.set(new Map(f.filter((d) => d.erkennung).map((d) => [d.pfad, { key: d.erkennung!.key ?? '', fassung: d.erkennung!.fassung, an: !!d.erkennung!.key }])));
        this.meldung.set('');
        this.stand.set(null);
        this.ohne.set([]);
      });
    });
  }

  protected datum(iso: string): string {
    return iso ? new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  }

  protected anzeige(key: string): string {
    return key.replace('|', ' – ');
  }

  protected setzen(pfad: string, teil: Partial<{ key: string; fassung: string; an: boolean }>): void {
    this.ziele.update((z) => new Map(z).set(pfad, { ...(z.get(pfad) ?? { key: '', fassung: '', an: false }), ...teil }));
  }

  protected waehlen(pfad: string): void {
    this.gewaehlt.update((g) => {
      const neu = new Set(g);
      if (!neu.delete(pfad)) neu.add(pfad);
      return neu;
    });
  }

  protected async einlesen(): Promise<void> {
    const backstage = this.einzeln().some((d) => d.art === 'backstage' && this.gewaehlt().has(d.pfad));
    if (backstage && this.ersetzen() && !confirm('Alle Backstage-Daten dieses Geräts durch die gewählten Dateien ersetzen?')) return;
    this.laeuft.set(true);
    try {
      this.meldung.set('');
      this.stand.set({ text: 'Einlesen …' });
      const noten = new Map([...this.ziele()].filter(([, z]) => z.an && z.key).map(([pfad, z]) => [pfad, { key: z.key, fassung: z.fassung }]));
      const r = await uebernehmen(this.funde(), { dateien: this.gewaehlt(), noten, ersetzen: this.ersetzen() }, (s) => this.stand.set(s));
      this.meldung.set(r.text);
      this.ohne.set(r.ohne);
      this.geaendert.emit();
    } catch (e) {
      this.meldung.set(`Einlesen fehlgeschlagen: ${(e as Error).message || 'unbekannter Fehler'}`);
    } finally {
      this.laeuft.set(false);
      this.stand.set(null);
    }
  }
}
