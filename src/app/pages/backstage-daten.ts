import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { Eintrag, eintraege, entfernen, mb } from '../data/aufraeumen';
import { NotenDateiInfo, SongNoten, alleSongNoten, notenAllesLoeschen, notenDateiLoeschen, notenDateien, pdfName, songNotenSetzen } from '../data/noten';
import { mitschnittUebersicht, mitschnitteAllesLoeschen } from '../data/mitschnitte';
import { cacheLeeren } from '../data/aufraeumen';
import { BackstageAufraeumen } from './backstage-aufraeumen';
import { backupTeilen } from './backstage-sync';
import { DatenEditor } from './daten-editor';

// Backstage → Abgleich → Daten auf diesem Gerät: jeder gespeicherte Eintrag einzeln – verständlich benannt (Bereich,
// Datum, Ort), mit Inhaltsangabe und Größe. Öffnen (Seite des Bereichs), ansehen/ändern, auswählen und als Datei
// teilen oder löschen, je Bereich alles löschen. Dazu Noten, Proben-Mitschnitte und Seiten für unterwegs, darunter
// das Aufräumen (vergangene und verwaiste Einträge, alles löschen – backstage-aufraeumen.ts).
@Component({
  selector: 'app-backstage-daten',
  imports: [RouterLink, MatIconModule, DatenEditor, BackstageAufraeumen],
  template: `
    <div class="box">
      <h3>Daten auf diesem Gerät</h3>
      <p>{{ liste().length }} Einträge ({{ mb(gesamt()) }}) und Noten für {{ notenSongs().length }} Songs. Antippen zum
        Öffnen, <mat-icon class="inline">data_object</mat-icon> zum Ansehen und Ändern; ausgewählte Einträge lassen sich als
        Datei teilen oder löschen, <mat-icon class="inline">delete_sweep</mat-icon> löscht einen ganzen Bereich. Vorher am
        besten ein Backup erstellen (Einstellungen → Backup).</p>
      <label class="suche"><mat-icon>search</mat-icon>
        <input type="search" placeholder="Suchen, z. B. Setlist, 2026, Rhede …" aria-label="Daten durchsuchen" [value]="suche()" (input)="suche.set($any($event.target).value)" />
      </label>
      <div class="leiste">
        <label class="check"><input type="checkbox" [checked]="alleGewaehlt()" (change)="alleWaehlen($any($event.target).checked)" /> alle {{ suche() ? 'gefundenen' : '' }} auswählen</label>
        <button type="button" [disabled]="!auswahl().size" (click)="teilen()"><mat-icon>ios_share</mat-icon> {{ auswahl().size }} teilen</button>
        <button type="button" [disabled]="!auswahl().size" (click)="loeschen([...auswahl()])"><mat-icon>delete</mat-icon> {{ auswahl().size }} löschen</button>
      </div>

      @for (g of gruppen(); track g.id) {
        <div class="gruppe">
          <button type="button" class="icon weg" (click)="gruppeLoeschen(g.label, g.eintraege, $event)" [attr.aria-label]="g.label + (suche() ? ' (gefundene)' : '') + ' löschen'"><mat-icon>delete_sweep</mat-icon></button>
          <details [open]="!!suche() || offen().has(g.id)" (toggle)="merken(g.id, $any($event.target).open)">
          <summary>{{ g.label }} <span class="zahl">{{ g.eintraege.length }} · {{ mb(g.bytes) }}</span></summary>
          <ul>
            @for (e of g.eintraege; track e.key) {
              <li [class.verwaist]="e.verwaist">
                <input type="checkbox" [checked]="auswahl().has(e.key)" (change)="waehlen(e.key)" [attr.aria-label]="e.titel + ' auswählen'" />
                <span class="text">
                  @if (e.link) { <a [routerLink]="e.link">{{ e.titel }}</a> } @else { <strong>{{ e.titel }}</strong> }
                  <small>{{ e.details }} · {{ mb(e.bytes) }}</small>
                </span>
                <button type="button" class="icon" (click)="bearbeiten.set(e)" [attr.aria-label]="e.titel + ' ansehen und ändern'"><mat-icon>data_object</mat-icon></button>
                <button type="button" class="icon" (click)="loeschen([e.key])" [attr.aria-label]="e.titel + ' löschen'"><mat-icon>delete</mat-icon></button>
              </li>
            }
          </ul>
        </details>
        </div>
      } @empty {
        <p>{{ suche() ? 'Nichts gefunden.' : 'Auf diesem Gerät ist nichts gespeichert.' }}</p>
      }

      @if (notenSongs().length || pdfs().length) {
        <div class="gruppe">
          <button type="button" class="icon weg" (click)="notenAlleLoeschen($event)" aria-label="Alle Noten löschen"><mat-icon>delete_sweep</mat-icon></button>
          <details [open]="!!suche() || offen().has('noten')" (toggle)="merken('noten', $any($event.target).open)">
          <summary>Noten <span class="zahl">{{ notenSongs().length }} Songs · {{ pdfs().length }} PDFs · {{ mb(pdfBytes()) }}</span></summary>
          <ul>
            @for (n of notenGefiltert(); track n.key) {
              <li>
                <span class="text"><a routerLink="/backstage/songs">{{ n.titel }}</a><small>{{ n.details }}</small></span>
                <button type="button" class="icon" (click)="songNotenLoeschen(n.key, n.titel)" [attr.aria-label]="'Noten von ' + n.titel + ' löschen'"><mat-icon>delete</mat-icon></button>
              </li>
            }
            @for (d of pdfsGefiltert(); track d.id) {
              <li>
                <span class="text"><a routerLink="/backstage/songs/noten">{{ d.name }}</a><small>PDF · {{ mb(d.groesse) }} · {{ nutzung(d.id) }}</small></span>
                <button type="button" class="icon" (click)="pdfLoeschen(d)" [attr.aria-label]="d.name + ' löschen'"><mat-icon>delete</mat-icon></button>
              </li>
            }
          </ul>
        </details>
        </div>
      }
      @if (mitschnitte().anzahl && !suche()) {
        <div class="gruppe">
          <button type="button" class="icon weg" (click)="mitschnitteLoeschen($event)" aria-label="Alle Mitschnitte löschen"><mat-icon>delete_sweep</mat-icon></button>
          <details>
          <summary>Proben-Mitschnitte <span class="zahl">{{ mitschnitte().anzahl }} · {{ mitschnitte().songs }} Songs · {{ mb(mitschnitte().bytes) }}</span></summary>
          <p>Anhören, teilen und einzeln löschen im Song-Dialog (<a routerLink="/backstage/songs">Songs → Liste</a>).</p>
        </details>
        </div>
      }
      @if (caches() && !suche()) {
        <div class="gruppe">
          <button type="button" class="icon weg" (click)="offlineLeeren($event)" aria-label="Seiten für unterwegs leeren"><mat-icon>delete_sweep</mat-icon></button>
          <details>
          <summary>Seiten für unterwegs <span class="zahl">{{ mb(speicher()) }}</span></summary>
          <p>Damit Backstage ohne Netz geht; lädt beim nächsten Besuch mit Netz neu.</p>
        </details>
        </div>
      }
      @if (meldung(); as m) { <p class="meldung" role="status">{{ m }}</p> }

      <h4>Aufräumen</h4>
      <app-backstage-aufraeumen [version]="version() + stand()" (geaendert)="aufgeraeumt()" />
    </div>
    @if (bearbeiten(); as e) { <app-daten-editor [schluessel]="e.key" [titel]="e.titel" (gespeichert)="fertig('Gespeichert ✓')" (zu)="bearbeiten.set(null)" /> }
  `,
  styles: `
    .box { margin-top: 20px; padding: 20px 24px; border-radius: 12px; border: 1px solid var(--bn-line); }
    h3, h4 { margin: 0 0 6px; font-family: var(--bn-wide); font-weight: 400; text-transform: uppercase; letter-spacing: .14em; font-size: .85rem; }
    p { margin: 0 0 12px; max-width: 720px; font-size: .88rem; line-height: 1.55; color: var(--bn-fog); }
    .suche { display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid var(--bn-line); border-radius: 10px; }
    .suche input { flex: 1; min-width: 0; padding: 9px 0; border: 0; background: none; color: var(--bn-ink); font: inherit; }
    .leiste { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin: 12px 0; font-size: .88rem; }
    .check { display: inline-flex; align-items: center; gap: 6px; margin-right: auto; }
    input[type=checkbox] { flex: none; accent-color: var(--bn-sunset); }
    details { border-top: 1px solid var(--bn-line); }
    summary { display: flex; align-items: center; gap: 8px; padding: 6px 0; cursor: pointer; font-size: .92rem; }
    summary::before { content: '▸'; color: var(--bn-fog); }
    details[open] > summary::before { content: '▾'; }
    .gruppe { position: relative; }
    .gruppe > .weg { position: absolute; top: 3px; right: 0; z-index: 1; }
    .gruppe summary { padding-right: 40px; }
    summary::-webkit-details-marker { display: none; }
    h4 { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--bn-line); color: var(--bn-sunset); }
    .zahl { color: var(--bn-fog); font-size: .8rem; }
    ul { list-style: none; margin: 0 0 10px; padding: 0; display: grid; gap: 2px; }
    li { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid rgba(255, 255, 255, .05); }
    li.verwaist .text > * { opacity: .7; }
    .text { flex: 1; min-width: 0; display: grid; overflow-wrap: anywhere; font-size: .9rem; }
    .text a { color: var(--bn-ink); }
    .text a:hover { color: var(--bn-sunset); }
    small { color: var(--bn-fog); font-size: .78rem; }
    button { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; font-size: .85rem; cursor: pointer; }
    button.icon { flex: none; padding: 5px; }
    button:hover:not(:disabled) { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    button:disabled { opacity: .4; cursor: default; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
    mat-icon.inline { font-size: 16px; width: 16px; height: 16px; vertical-align: -3px; }
    .meldung { margin: 12px 0 0; color: #5fb88a; }
  `,
})
export class BackstageDaten {
  /** von außen hochgezählt, wenn anderswo auf der Seite Daten geändert wurden */
  readonly version = input(0);
  readonly geaendert = output<void>();
  private readonly band = inject(BandService);
  protected readonly mb = mb;
  protected readonly stand = signal(0);
  protected readonly suche = signal('');
  protected readonly auswahl = signal(new Set<string>());
  protected readonly offen = signal(new Set<string>());
  protected readonly meldung = signal('');
  protected readonly bearbeiten = signal<Eintrag | null>(null);

  private readonly auftritte = new Map(this.band.shows.map((s) => [this.band.showId(s), s.venue]));
  protected readonly liste = computed(() => (this.stand(), this.version(), eintraege(this.auftritte)));
  protected readonly gesamt = computed(() => this.liste().reduce((s, e) => s + e.bytes, 0));
  private readonly treffer = (text: string) => {
    const q = this.suche().trim().toLocaleLowerCase('de');
    return !q || text.toLocaleLowerCase('de').includes(q);
  };
  private readonly gefiltert = computed(() => this.liste().filter((e) => this.treffer(`${e.titel} ${e.details} ${e.key} ${e.bereich.label}`)));
  protected readonly gruppen = computed(() => {
    const g = new Map<string, { id: string; label: string; eintraege: Eintrag[]; bytes: number }>();
    for (const e of this.gefiltert()) {
      const x = g.get(e.bereich.id) ?? { id: e.bereich.id, label: e.bereich.label, eintraege: [], bytes: 0 };
      x.eintraege.push(e);
      x.bytes += e.bytes;
      g.set(e.bereich.id, x);
    }
    return [...g.values()];
  });
  protected readonly alleGewaehlt = computed(() => this.gefiltert().length > 0 && this.gefiltert().every((e) => this.auswahl().has(e.key)));

  // Noten
  private readonly noten = signal<Record<string, SongNoten>>({});
  protected readonly pdfs = signal<NotenDateiInfo[]>([]);
  protected readonly pdfBytes = computed(() => this.pdfs().reduce((s, d) => s + d.groesse, 0));
  protected readonly notenSongs = computed(() =>
    Object.entries(this.noten()).map(([key, n]) => {
      const [titel, artist] = key.split('|');
      const pdfs = n.pdfs ?? [];
      return { key, titel: `${titel} – ${artist}`, details: [pdfs.map((p, i) => pdfName(p, i, pdfs)).join(', '), n.chordpro ? 'Akkorde' : ''].filter(Boolean).join(' · ') };
    }),
  );
  protected readonly notenGefiltert = computed(() => this.notenSongs().filter((n) => this.treffer(`${n.titel} ${n.details} Noten`)));
  protected readonly pdfsGefiltert = computed(() => this.pdfs().filter((d) => this.treffer(`${d.name} PDF Noten`)));

  constructor() {
    effect(() => {
      this.version();
      untracked(() => this.notenLaden());
    });
  }

  private notenLaden(): void {
    alleSongNoten().then((n) => this.noten.set(n)).catch(() => undefined);
    notenDateien().then((d) => this.pdfs.set(d)).catch(() => undefined);
    mitschnittUebersicht().then((m) => this.mitschnitte.set(m)).catch(() => undefined);
    void this.speicherLaden();
  }

  // Proben-Mitschnitte und Seiten für unterwegs (Cache des Service Workers)
  protected readonly mitschnitte = signal({ anzahl: 0, songs: 0, bytes: 0 });
  protected readonly caches = signal(0);
  protected readonly speicher = signal(0);
  private async speicherLaden(): Promise<void> {
    try {
      this.caches.set(typeof caches === 'undefined' ? 0 : (await caches.keys()).length);
      const s = await navigator.storage?.estimate?.();
      // grob: alles, was nicht Noten oder Mitschnitte ist
      this.speicher.set(Math.max(0, (s?.usage ?? 0) - this.pdfBytes() - this.mitschnitte().bytes));
    } catch {
      // Schätzung nicht verfügbar
    }
  }

  /** aus dem Aufräumen (unten): neu lesen und den anderen Teilen der Seite Bescheid geben */
  protected aufgeraeumt(): void {
    this.stand.update((x) => x + 1);
    this.notenLaden();
    this.geaendert.emit();
  }

  protected gruppeLoeschen(label: string, liste: Eintrag[], e: Event): void {
    e.preventDefault();
    e.stopPropagation();
    this.loeschen(liste.map((x) => x.key), `${label}: ${liste.length} ${liste.length === 1 ? 'Eintrag' : 'Einträge'}`);
  }

  protected async notenAlleLoeschen(e: Event): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Alle Noten (${this.notenSongs().length} Songs, ${this.pdfs().length} PDFs) auf diesem Gerät löschen?`)) return;
    await notenAllesLoeschen();
    this.notenLaden();
    this.fertig('Noten gelöscht ✓');
  }

  protected async mitschnitteLoeschen(e: Event): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Alle ${this.mitschnitte().anzahl} Proben-Mitschnitte auf diesem Gerät löschen?`)) return;
    await mitschnitteAllesLoeschen();
    this.notenLaden();
    this.fertig('Mitschnitte gelöscht ✓');
  }

  protected async offlineLeeren(e: Event): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Seiten für unterwegs leeren? Ohne Netz ist Backstage dann erst nach dem nächsten Besuch mit Netz wieder da.')) return;
    await cacheLeeren();
    this.notenLaden();
    this.fertig('Seiten für unterwegs geleert ✓');
  }

  protected nutzung(id: string): string {
    const n = Object.values(this.noten()).filter((x) => x.pdfs?.some((p) => p.datei === id)).length;
    return n ? `bei ${n} ${n === 1 ? 'Song' : 'Songs'}` : 'von keinem Song genutzt';
  }

  protected merken(id: string, auf: boolean): void {
    if (this.suche()) return;
    this.offen.update((o) => {
      const neu = new Set(o);
      if (auf) neu.add(id);
      else neu.delete(id);
      return neu;
    });
  }

  protected waehlen(key: string): void {
    this.auswahl.update((a) => {
      const neu = new Set(a);
      if (!neu.delete(key)) neu.add(key);
      return neu;
    });
  }

  protected alleWaehlen(an: boolean): void {
    this.auswahl.update((a) => {
      const neu = new Set(a);
      for (const e of this.gefiltert()) {
        if (an) neu.add(e.key);
        else neu.delete(e.key);
      }
      return neu;
    });
  }

  protected fertig(text: string): void {
    this.meldung.set(text);
    this.stand.update((x) => x + 1);
    this.geaendert.emit();
  }

  protected loeschen(keys: string[], text?: string): void {
    const titel = text ?? (keys.length === 1 ? this.liste().find((e) => e.key === keys[0])?.titel : `${keys.length} Einträge`);
    if (!confirm(`${titel} auf diesem Gerät löschen?`)) return;
    entfernen(keys);
    this.auswahl.update((a) => new Set([...a].filter((k) => !keys.includes(k))));
    this.fertig(`${keys.length === 1 ? '1 Eintrag' : keys.length + ' Einträge'} gelöscht ✓`);
  }

  // Auswahl als Backstage-Datei: lässt sich auf anderen Geräten mit „Datei importieren“ einlesen (Einstellungen
  // gehen mit, werden beim Import aber nicht übernommen – die bleiben je Gerät)
  protected async teilen(): Promise<void> {
    const data: Record<string, unknown> = {};
    for (const k of this.auswahl()) {
      const roh = localStorage.getItem(k);
      if (roh === null) continue;
      try {
        data[k] = JSON.parse(roh);
      } catch {
        data[k] = roh;
      }
    }
    const n = Object.keys(data).length;
    const geteilt = await backupTeilen(data, 'auswahl');
    if (geteilt !== null) this.meldung.set(`${n} ${n === 1 ? 'Eintrag' : 'Einträge'} ${geteilt ? 'geteilt' : 'als Datei gespeichert'} ✓`);
  }

  protected async songNotenLoeschen(key: string, titel: string): Promise<void> {
    if (!confirm(`Noten von „${titel}“ löschen? Die PDF-Dateien bleiben gespeichert.`)) return;
    await songNotenSetzen(key, {});
    this.notenLaden();
    this.fertig('Noten gelöscht ✓');
  }

  protected async pdfLoeschen(d: NotenDateiInfo): Promise<void> {
    if (!confirm(`„${d.name}“ löschen? Songs, die es nutzen, verlieren dieses PDF.`)) return;
    await notenDateiLoeschen(d.id);
    this.notenLaden();
    this.fertig('PDF gelöscht ✓');
  }
}
