import { Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Fund, uebernehmen } from '../data/einlesen';

// Was in einem Ordner gefunden wurde (Abgleich → Ordner auf dem Gerät bzw. OneDrive): Backstage-Dateien und
// Notenpakete einzeln wählbar (die neuesten vorausgewählt), Noten-Dateien gesammelt; dann einlesen.
@Component({
  selector: 'app-funde-liste',
  imports: [MatIconModule],
  template: `
    <div class="funde">
      @if (!funde().length) { <p>Hier ist nichts, was sich einlesen ließe (Backstage-Dateien, Notenpakete, PDFs, .pro).</p> }
      @for (d of einzeln(); track d.pfad) {
        <label class="check"><input type="checkbox" [checked]="gewaehlt().has(d.pfad)" (change)="waehlen(d.pfad)" />
          {{ d.art === 'backstage' ? 'Backstage' : 'Notenpaket' }} · {{ d.pfad }} <small>{{ datum(d.geaendert) }}</small></label>
      }
      @if (notenZahl().pdfs || notenZahl().pro) {
        <label class="check"><input type="checkbox" [checked]="notenAn()" (change)="notenAn.set($any($event.target).checked)" /> {{ notenText() }}</label>
      }
      @if (hatBackstage()) {
        <label class="check"><input type="checkbox" [checked]="ersetzen()" (change)="ersetzen.set($any($event.target).checked)" /> Backstage-Daten ersetzen statt ergänzen</label>
      }
      @if (funde().length) {
        <button type="button" class="primaer" (click)="einlesen()" [disabled]="laeuft() || !anzahl()"><mat-icon>download</mat-icon> Einlesen</button>
      }
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
    .fehler { color: #e07a5a; }
  `,
})
export class FundeListe {
  readonly funde = input.required<Fund[]>();
  readonly geaendert = output<void>();
  protected readonly gewaehlt = signal(new Set<string>());
  protected readonly notenAn = signal(true);
  protected readonly ersetzen = signal(false);
  protected readonly laeuft = signal(false);
  protected readonly meldung = signal('');
  protected readonly ohne = signal<string[]>([]);

  protected readonly einzeln = computed(() => this.funde().filter((d) => d.art === 'backstage' || d.art === 'noten'));
  protected readonly hatBackstage = computed(() => this.funde().some((d) => d.art === 'backstage'));
  protected readonly notenZahl = computed(() => ({ pdfs: this.funde().filter((d) => d.art === 'pdf').length, pro: this.funde().filter((d) => d.art === 'akkordblatt').length }));
  protected readonly notenText = computed(() => {
    const { pdfs, pro } = this.notenZahl();
    return [pdfs && `${pdfs} ${pdfs === 1 ? 'PDF' : 'PDFs'}`, pro && `${pro} ${pro === 1 ? 'Akkordblatt' : 'Akkordblätter'}`].filter(Boolean).join(' und ') + ' (Zuordnung über den Dateinamen)';
  });
  protected readonly anzahl = computed(() => this.gewaehlt().size + (this.notenAn() ? this.notenZahl().pdfs + this.notenZahl().pro : 0));

  constructor() {
    // neue Funde: die neueste Backstage-Datei und das neueste Notenpaket vorauswählen
    effect(() => {
      const f = this.funde();
      untracked(() => {
        this.gewaehlt.set(new Set([f.find((d) => d.art === 'backstage')?.pfad, f.find((d) => d.art === 'noten')?.pfad].filter((x): x is string => !!x)));
        this.meldung.set('');
        this.ohne.set([]);
      });
    });
  }

  protected datum(iso: string): string {
    return iso ? new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : '';
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
      const r = await uebernehmen(this.funde(), { dateien: this.gewaehlt(), noten: this.notenAn(), ersetzen: this.ersetzen() }, (t) => this.meldung.set(t));
      this.meldung.set(r.text);
      this.ohne.set(r.ohne);
      this.geaendert.emit();
    } catch (e) {
      this.meldung.set(`Einlesen fehlgeschlagen: ${(e as Error).message || 'unbekannter Fehler'}`);
    } finally {
      this.laeuft.set(false);
    }
  }
}
