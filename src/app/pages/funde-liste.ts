import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { LISTEN, pdfSong, songAbgleich } from '../data/playlisten';
import { SyncService } from '../data/sync.service';
import { notenDateiLoeschen, notenDateien } from '../data/noten';
import { Fund, uebernehmen } from '../data/einlesen';
import { zuordnungenMerken } from '../data/erkennung';
import { BandService } from '../data/band.service';
import { Vorschau, vorschau, vorschauText } from '../data/aufraeumen';
import { backupEintraege } from './backstage-sync';
import { Fortschritt, Stand } from './fortschritt';

// Was in einem Ordner gefunden wurde (Synchronisation: Einlesen bzw. Zuordnen): Backups und
// Notenpakete einzeln wählbar (die neuesten vorausgewählt); Noten-Dateien je Datei mit erkanntem Song (Titel –
// Interpret, data/erkennung.ts), Auswahl bei Unklarem und Fassung zum Korrigieren; dann einlesen.
// Statt eines Songs: „Eigenständig“ – ein eigener Song aus dem Dateinamen „<Band> - <Titel>.pdf“, ohne Spotify-Liste –
// oder „Löschen“ (nur mit Berechtigung „Daten löschen“): aus dem Sync-Ordner, damit aus OneDrive und von diesem Gerät.
const EIGEN = '__eigen';
const LOESCHEN = '__loeschen';
@Component({
  selector: 'app-funde-liste',
  imports: [MatIconModule, Fortschritt],
  template: `
    <div class="funde">
      @if (!funde().length) { <p>Hier ist nichts, was sich einlesen ließe (Backups, Notenpakete, PDFs, .pro).</p> }
      @for (d of einzeln(); track d.pfad) {
        <label class="check"><input type="checkbox" [checked]="gewaehlt().has(d.pfad)" (change)="waehlen(d.pfad)" />
          {{ d.art === 'backstage' ? 'Backup' : 'Notenpaket' }} · {{ d.pfad }} <small>{{ datum(d.geaendert) }}</small></label>
        @if (vorschauen().get(d.pfad); as v) {
          <details class="vorschau">
            <summary>Was sich ändert: {{ text(v) }}</summary>
            <ul class="aenderungen">
              @for (e of v.neu; track e.key) { <li><b class="neu">neu</b> {{ e.titel }} <small>{{ e.details }}</small></li> }
              @for (e of v.geaendert; track e.key) { <li><b class="anders">geändert</b> {{ e.titel }} <small>{{ e.was }}</small></li> }
              @if (v.gleich) { <li><small>{{ v.gleich }} {{ v.gleich === 1 ? 'Eintrag bleibt' : 'Einträge bleiben' }} gleich</small></li> }
            </ul>
          </details>
        }
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
              <li [class.offen]="!z?.key" [class.weg]="z?.key === loeschenWert">
                <input type="checkbox" [checked]="!!z?.an" [disabled]="!z?.key || z?.key === loeschenWert" (change)="setzen(d.pfad, { an: $any($event.target).checked })" [attr.aria-label]="d.pfad + ' einlesen'" />
                <span class="datei">{{ d.pfad }}
                  <small>{{ z?.key === loeschenWert ? 'wird gelöscht – aus OneDrive und von diesem Gerät' : z?.key === eigenWert ? 'eigenständig, ohne Spotify-Liste' : z?.key ? (d.erkennung?.key === z?.key ? (d.erkennung?.quelle === 'gemerkt' ? 'wie beim letzten Mal' : 'erkannt über ' + d.erkennung?.quelle) : 'von Hand gewählt') : d.erkennung?.kandidaten?.length ? 'mehrere möglich – bitte wählen' : 'nicht erkannt – bitte wählen' }}</small>
                </span>
                <select [attr.aria-label]="'Song für ' + d.pfad" (change)="songWaehlen(d.pfad, d.name, $any($event.target).value)">
                  <option value="" [selected]="!z?.key">– Song wählen –</option>
                  <optgroup label="Ohne Liste">
                    <option [value]="eigenWert" [selected]="z?.key === eigenWert">Eigenständig: {{ eigenText(d.name) }}</option>
                    @if (loeschbar()) { <option [value]="loeschenWert" [selected]="z?.key === loeschenWert">Löschen</option> }
                  </optgroup>
                  @if (d.erkennung?.kandidaten?.length) {
                    <optgroup label="Passend">
                      @for (k of d.erkennung!.kandidaten; track k) { <option [value]="k" [selected]="z?.key === k">{{ anzeige(k) }}</option> }
                    </optgroup>
                  }
                  <optgroup label="Songs">
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
        <label class="check"><input type="checkbox" [checked]="ersetzen()" (change)="ersetzen.set($any($event.target).checked)" /> Backup ersetzt alles statt zu ergänzen</label>
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
    .vorschau { margin: -4px 0 4px 28px; font-size: .82rem; color: var(--bn-fog); }
    .vorschau summary { cursor: pointer; }
    .aenderungen { max-height: 220px; margin-top: 6px; }
    .aenderungen li { display: block; padding: 3px 0; border: 0; }
    b.neu, b.anders { margin-right: 6px; padding: 0 6px; border-radius: 999px; font-size: .7rem; font-weight: 500; }
    b.neu { background: rgba(95, 184, 138, .2); color: #5fb88a; }
    b.anders { background: rgba(232, 164, 106, .2); color: #e8a46a; }
    .kopf { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 14px; margin-bottom: 6px; }
    .klein { font-size: .8rem; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; max-height: 420px; overflow: auto; }
    li { display: grid; grid-template-columns: auto minmax(0, 1fr) minmax(0, 220px) 110px; align-items: center; gap: 4px 10px; padding: 6px 0; border-bottom: 1px solid rgba(255, 255, 255, .06); font-size: .85rem; }
    li.offen .datei small { color: #e8a46a; }
    li.weg .datei { text-decoration: line-through; opacity: .7; }
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
  // Songs aller Spotify-Listen (alphabetisch)
  protected readonly repertoire = songAbgleich(LISTEN).map((t) => ({ key: t.key, text: t.artist ? `${t.title} – ${t.artist}` : t.title }));
  protected readonly eigenWert = EIGEN;
  protected readonly loeschenWert = LOESCHEN;
  private readonly sync = inject(SyncService);
  /** Löschen nur mit Berechtigung „Daten löschen“ (Besitzer des Sync-Ordners) */
  protected readonly loeschbar = computed(() => this.sync.darfLoeschen());
  protected eigenText(name: string): string {
    const s = pdfSong(name);
    return s.artist ? `${s.title} – ${s.artist}` : s.title;
  }
  protected songWaehlen(pfad: string, name: string, wert: string): void {
    // eigenständig: Fassung aus dem Dateinamen („Band - Titel - Bass.pdf“)
    const fassung = wert === EIGEN ? { fassung: pdfSong(name).fassung } : {};
    this.setzen(pfad, { key: wert, an: !!wert && wert !== LOESCHEN, ...fassung });
  }
  protected readonly ersetzen = signal(false);
  protected readonly laeuft = signal(false);
  protected readonly meldung = signal('');
  protected readonly stand = signal<Stand | null>(null);
  protected readonly ohne = signal<string[]>([]);

  protected readonly einzeln = computed(() => this.funde().filter((d) => d.art === 'backstage' || d.art === 'noten'));
  // Vorschau je Backup: was neu ist, was sich ändert, was gleich bleibt
  private readonly band = inject(BandService);
  private readonly auftritte = new Map(this.band.shows.map((s) => [this.band.showId(s), s.venue]));
  protected readonly text = vorschauText;
  protected readonly vorschauen = computed(() => {
    const out = new Map<string, Vorschau>();
    for (const d of this.funde()) {
      if (d.art !== 'backstage' || !d.text) continue;
      try {
        out.set(d.pfad, vorschau(backupEintraege(d.text), this.auftritte));
      } catch {
        // keine gültige Datei
      }
    }
    return out;
  });
  protected readonly hatBackstage = computed(() => this.funde().some((d) => d.art === 'backstage'));
  protected readonly noten = computed(() => this.funde().filter((d) => d.art === 'pdf' || d.art === 'akkordblatt'));
  protected readonly sichtbar = computed(() => (this.nurOffene() ? this.noten().filter((d) => !this.ziele().get(d.pfad)?.key) : this.noten()));
  protected readonly erkanntZahl = computed(() => this.noten().filter((d) => this.ziele().get(d.pfad)?.key).length);
  protected readonly notenZahl = computed(() => ({ pdfs: this.funde().filter((d) => d.art === 'pdf').length, pro: this.funde().filter((d) => d.art === 'akkordblatt').length }));
  protected readonly notenText = computed(() => {
    const { pdfs, pro } = this.notenZahl();
    return [pdfs && `${pdfs} ${pdfs === 1 ? 'PDF' : 'PDFs'}`, pro && `${pro} ${pro === 1 ? 'Akkordblatt' : 'Akkordblätter'}`].filter(Boolean).join(' und ');
  });
  protected readonly anzahl = computed(() => this.gewaehlt().size + [...this.ziele().values()].filter((z) => (z.an && z.key) || z.key === LOESCHEN).length);

  constructor() {
    // neue Funde: das neueste Backup und das neueste Notenpaket vorauswählen
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

  /** Schlüssel für „eigenständig“: Titel und Band aus dem Dateinamen */
  private ziel(pfad: string, key: string): string {
    if (key !== EIGEN) return key;
    const s = pdfSong(this.noten().find((d) => d.pfad === pfad)?.name ?? pfad);
    return `${s.title}|${s.artist}`;
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
    const weg = this.noten().filter((d) => this.ziele().get(d.pfad)?.key === LOESCHEN);
    if (weg.length && !confirm(`${weg.length} ${weg.length === 1 ? 'Datei' : 'Dateien'} aus OneDrive und von diesem Gerät löschen? Das betrifft die ganze Band.`)) return;
    this.laeuft.set(true);
    try {
      this.meldung.set('');
      this.stand.set({ text: 'Einlesen …' });
      const noten = new Map([...this.ziele()].filter(([, z]) => z.an && z.key && z.key !== LOESCHEN).map(([pfad, z]) => [pfad, { key: this.ziel(pfad, z.key), fassung: z.fassung }]));
      // von Hand geänderte Zuordnungen für das nächste Mal merken
      zuordnungenMerken(
        this.noten()
          .filter((d) => noten.has(d.pfad) && (d.erkennung?.key !== noten.get(d.pfad)!.key || d.erkennung?.fassung !== noten.get(d.pfad)!.fassung))
          .map((d) => ({ name: d.name, ...noten.get(d.pfad)! })),
      );
      const r = await uebernehmen(this.funde(), { dateien: this.gewaehlt(), noten, ersetzen: this.ersetzen() }, (s) => this.stand.set(s));
      const geloescht = weg.length ? await this.loeschen(weg) : 0;
      this.meldung.set([r.text, geloescht && `${geloescht} ${geloescht === 1 ? 'Datei' : 'Dateien'} gelöscht`].filter(Boolean).join(' · '));
      if (geloescht) void this.sync.jetzt();
      this.ohne.set(r.ohne);
      this.geaendert.emit();
    } catch (e) {
      this.meldung.set(`Einlesen fehlgeschlagen: ${(e as Error).message || 'unbekannter Fehler'}`);
    } finally {
      this.laeuft.set(false);
      this.stand.set(null);
    }
  }

  /** aus dem lokalen Sync-Ordner löschen (der nächste Abgleich löscht in OneDrive) und auf dem Gerät, falls schon
   *  eingelesen (gleicher Name und gleiche Größe) */
  private async loeschen(weg: Fund[]): Promise<number> {
    if (!this.loeschbar()) return 0;
    const lokal = await this.sync.lokal(true);
    if (!lokal) throw new Error('Kein Zugriff auf den Sync-Ordner – unter Einstellungen → Synchronisation wählen.');
    const geraet = await notenDateien();
    let n = 0;
    for (const d of weg) {
      this.stand.set({ text: `Löschen: ${d.pfad}` });
      await lokal.loeschen(d.pfad);
      for (const x of geraet.filter((x) => x.name === d.name && x.groesse === d.groesse)) await notenDateiLoeschen(x.id);
      n++;
    }
    return n;
  }
}
