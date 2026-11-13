import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { Eintrag, eintraege, entfernen, mb } from '../data/aufraeumen';
import { NotenDateiInfo, SongNoten, alleSongNoten, notenAllesLoeschen, notenDateiLoeschen, notenDateien, pdfName, songNotenSetzen } from '../data/noten';
import { mitschnittUebersicht, mitschnitteAllesLoeschen } from '../data/mitschnitte';
import { NotenCheckKarte } from './noten-check';
import { BackstageAufraeumen } from './backstage-aufraeumen';
import { SyncService } from '../data/sync.service';
import { SyncStatus, spiegelArt, syncStatusVon } from '../data/spiegel';
import { backupTeilen } from './backstage-sync';
import { DatenEditor } from './daten-editor';
import { LANGE_NICHT_TAGE, geraetId, seitText } from '../data/geraete';
import { standVergleich } from '../data/app-stand';
import { DatenGeraet } from './daten-geraet';

// Backstage → Abgleich → Daten auf diesem Gerät: jeder gespeicherte Eintrag einzeln – verständlich benannt (Bereich,
// Datum, Ort), mit Inhaltsangabe und Größe. Öffnen (Seite des Bereichs), ansehen/ändern, auswählen und als Datei
// teilen oder löschen, je Bereich alles löschen. Dazu Noten, Proben-Mitschnitte und Seiten für unterwegs, darunter
// Speicherplatz, Sync-Kopie, Spotify, App-Stand und Backup (daten-geraet.ts), darunter das Aufräumen (vergangene
// Einträge, alles löschen – backstage-aufraeumen.ts).
@Component({
  selector: 'app-backstage-daten',
  imports: [RouterLink, MatIconModule, DatenEditor, BackstageAufraeumen, NotenCheckKarte, DatenGeraet],
  template: `
    <div class="box">
      <h3>Daten auf diesem Gerät</h3>
      <p>{{ liste().length }} Einträge ({{ mb(gesamt()) }}) und Noten für {{ notenSongs().length }} Songs.@if (loeschbar()) { Löschen gilt für alle – vorher am besten ein Backup erstellen.}</p>
      @if (sync.bereit()) {
        <p class="status"><span class="s synchron">☁ {{ zaehler().synchron }} synchron</span>
          <span class="s wartet">⟳ {{ zaehler().wartet }} {{ zaehler().wartet === 1 ? 'wartet' : 'warten' }}</span>
          <span class="s lokal">▣ {{ zaehler().lokal }} nur auf diesem Gerät</span>
          @if (sync.letzter(); as l) { <span [class.fehler]="l.fehler">· zuletzt {{ zeit(l.zeit) }}</span> }</p>
      } @else {
        <p class="status">Nicht mit OneDrive synchronisiert – <a routerLink="/backstage/einstellungen">in den Einstellungen einrichten</a>.</p>
      }
      @if (!loeschbar()) {
        <p class="klein">Löschen ist nur mit der Berechtigung <strong>„Daten löschen“</strong> möglich: angemeldet und Besitzer des
          OneDrive-Ordners der Synchronisation.</p>
      }
      <label class="suche"><mat-icon>search</mat-icon>
        <input type="search" placeholder="Suchen, z. B. Setlist, 2026, Rhede …" aria-label="Daten durchsuchen" [value]="suche()" (input)="suche.set($any($event.target).value)" />
      </label>
      <div class="leiste">
        <label class="check"><input type="checkbox" [checked]="alleGewaehlt()" (change)="alleWaehlen($any($event.target).checked)" /> alle {{ suche() ? 'gefundenen' : '' }} auswählen</label>
        <button type="button" [disabled]="!auswahl().size" (click)="teilen()"><mat-icon>ios_share</mat-icon> {{ auswahl().size }} teilen</button>
        @if (loeschbar()) { <button type="button" [disabled]="!auswahl().size" (click)="loeschen([...auswahl()])"><mat-icon>delete</mat-icon> {{ auswahl().size }} löschen</button> }
      </div>

      @for (g of gruppen(); track g.id) {
        <div class="gruppe">
          @if (loeschbar()) { <button type="button" class="icon weg" (click)="gruppeLoeschen(g.label, g.eintraege, $event)" [attr.aria-label]="g.label + (suche() ? ' (gefundene)' : '') + ' löschen'"><mat-icon>delete_sweep</mat-icon></button> }
          <details [open]="!!suche() || offen().has(g.id)" (toggle)="merken(g.id, $any($event.target).open)">
          <summary>{{ g.label }} <span class="zahl">{{ g.eintraege.length }} · {{ mb(g.bytes) }}</span></summary>
          <ul>
            @for (e of g.eintraege; track e.key) {
              <li [class.verwaist]="e.verwaist">
                <input type="checkbox" [checked]="auswahl().has(e.key)" (change)="waehlen(e.key)" [attr.aria-label]="e.titel + ' auswählen'" />
                <span class="text">
                  @if (e.link) { <a [routerLink]="e.link">{{ e.titel }}</a> } @else { <strong>{{ e.titel }}</strong> }
                  <small>{{ e.details }} · {{ mb(e.bytes) }}@if (sync.bereit()) { · <span [class]="'s ' + status(e.key)">{{ statusText[status(e.key)] }}{{ art(e.key) === 'person' ? ' (persönlich)' : '' }}</span> }</small>
                </span>
                <button type="button" class="icon" (click)="bearbeiten.set(e)" [attr.aria-label]="e.titel + ' ansehen und ändern'"><mat-icon>data_object</mat-icon></button>
                @if (loeschbar()) { <button type="button" class="icon" (click)="loeschen([e.key])" [attr.aria-label]="e.titel + ' löschen'"><mat-icon>delete</mat-icon></button> }
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
          @if (loeschbar()) { <button type="button" class="icon weg" (click)="notenAlleLoeschen($event)" aria-label="Alle Noten löschen"><mat-icon>delete_sweep</mat-icon></button> }
          <details [open]="!!suche() || offen().has('noten')" (toggle)="merken('noten', $any($event.target).open)">
          <summary>Noten <span class="zahl">{{ notenSongs().length }} Songs · {{ pdfs().length }} PDFs · {{ mb(pdfBytes()) }}</span></summary>
          <ul>
            @for (n of notenGefiltert(); track n.key) {
              <li>
                <span class="text"><a routerLink="/backstage/songs">{{ n.titel }}</a><small>{{ n.details }}</small></span>
                @if (loeschbar()) { <button type="button" class="icon" (click)="songNotenLoeschen(n.key, n.titel)" [attr.aria-label]="'Noten von ' + n.titel + ' löschen'"><mat-icon>delete</mat-icon></button> }
              </li>
            }
            @for (d of pdfsGefiltert(); track d.id) {
              <li>
                <span class="text"><a routerLink="/backstage/songs/noten">{{ d.name }}</a><small>PDF · {{ mb(d.groesse) }} · {{ nutzung(d.id) }}</small></span>
                @if (loeschbar()) { <button type="button" class="icon" (click)="pdfLoeschen(d)" [attr.aria-label]="d.name + ' löschen'"><mat-icon>delete</mat-icon></button> }
              </li>
            }
          </ul>
        </details>
        </div>
        @if (!suche()) { <app-noten-check [version]="version() + stand()" (geaendert)="aufgeraeumt()" /> }
      }
      @if (mitschnitte().anzahl && !suche()) {
        <div class="gruppe">
          @if (loeschbar()) { <button type="button" class="icon weg" (click)="mitschnitteLoeschen($event)" aria-label="Alle Mitschnitte löschen"><mat-icon>delete_sweep</mat-icon></button> }
          <details>
          <summary>Proben-Mitschnitte <span class="zahl">{{ mitschnitte().anzahl }} · {{ mitschnitte().songs }} Songs · {{ mb(mitschnitte().bytes) }}</span></summary>
          <p>Anhören, teilen und einzeln löschen im Song-Dialog (<a routerLink="/backstage/songs">Songs → Liste</a>).</p>
        </details>
        </div>
      }
      <!-- Geräte im Sync-Ordner (Geraete/<Kennung>.json): wer wann zuletzt abgeglichen hat; nicht lesbare Einträge –
           mit „Daten löschen“ lässt sich ein Eintrag entfernen (das Gerät legt ihn beim nächsten Abgleich neu an) -->
      @if (sync.bereit() && (sync.geraete().length || sync.geraeteUnlesbar().length) && !suche()) {
        <div class="gruppe geraete-gruppe">
          <details [open]="offen().has('geraete')" (toggle)="merken('geraete', $any($event.target).open)">
          <summary>Geräte <span class="zahl">{{ sync.geraete().length + sync.geraeteUnlesbar().length }}</span></summary>
          <p>Wer wann zuletzt abgeglichen hat. Alte und nicht lesbare Einträge werden von selbst aufgeräumt.</p>
          <ul>
            @for (g of sync.geraete(); track g.id) {
              <li [class.verwaist]="langeNicht(g.zeit)">
                <span class="text"><strong>{{ g.name }}{{ g.id === meineId ? ' (dieses)' : '' }}</strong><small>{{ g.person }} · {{ seit(g.zeit) }} abgeglichen · Kennung {{ g.id }} · <span [class.veraltet]="veraltet(g.app)">{{ standText(g.app) }}</span>{{ langeNicht(g.zeit) ? ' · lange nicht abgeglichen' : '' }}</small></span>
                @if (loeschbar() && g.id !== meineId) { <button type="button" class="icon" (click)="geraetEntfernen(g.id, g.name)" [attr.aria-label]="'Eintrag von ' + g.name + ' entfernen'"><mat-icon>delete</mat-icon></button> }
              </li>
            }
            @for (id of sync.geraeteUnlesbar(); track id) {
              <li class="verwaist">
                <span class="text"><strong>Unbekanntes Gerät</strong><small>Kennung {{ id }} · Eintrag ließ sich beim letzten Abgleich nicht lesen</small></span>
                @if (loeschbar()) { <button type="button" class="icon" (click)="geraetEntfernen(id, 'Kennung ' + id)" [attr.aria-label]="'Eintrag mit Kennung ' + id + ' entfernen'"><mat-icon>delete</mat-icon></button> }
              </li>
            }
          </ul>
        </details>
        </div>
      }
      <!-- Speicherplatz, Sync-Kopie, Spotify, App und Seiten für unterwegs, Backup (daten-geraet.ts) -->
      @if (!suche()) { <app-daten-geraet [eintraege]="gesamt()" [noten]="pdfBytes()" [mitschnitte]="mitschnitte().bytes" [loeschbar]="loeschbar()" (geaendert)="aufgeraeumt()" /> }
      @if (meldung(); as m) { <p class="meldung" role="status">{{ m }}</p> }

      @if (loeschbar()) {
        <h4>Aufräumen</h4>
        <app-backstage-aufraeumen [version]="version() + stand()" (geaendert)="aufgeraeumt()" />
      }
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
    .status { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: .82rem; }
    .status a { color: var(--bn-sunset); }
    .klein { font-size: .8rem; }
    .s.synchron { color: #5fb88a; } .s.wartet { color: #e8a46a; } .s.lokal { color: var(--bn-fog); } .fehler { color: #e07a5a; }
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
  protected readonly meineId = geraetId();
  protected readonly seit = seitText;
  /** App-Stand eines Geräts in der Liste: „App-Stand 5926c9e0 (veraltet)“ */
  protected standText(app: string | undefined): string {
    if (!app) return 'App-Stand unbekannt (ältere Version)';
    const v = standVergleich(app, this.sync.neuesterStand());
    return `App-Stand ${app}${v === 'veraltet' ? ' (veraltet)' : v === 'aktuell' ? ' (aktuell)' : ''}`;
  }
  protected veraltet(app: string | undefined): boolean {
    return !app || standVergleich(app, this.sync.neuesterStand()) === 'veraltet';
  }
  protected langeNicht(zeit: string): boolean {
    return Date.now() - Date.parse(zeit) > LANGE_NICHT_TAGE * 864e5;
  }
  /** Geräte-Eintrag entfernen (nach Rückfrage) – das Gerät legt ihn beim nächsten eigenen Abgleich neu an */
  protected async geraetEntfernen(id: string, name: string): Promise<void> {
    if (!confirm(`Eintrag „${name}“ aus dem Sync-Ordner entfernen? Das Gerät legt ihn beim nächsten Abgleich neu an.`)) return;
    try {
      await this.sync.geraetEntfernen(id);
      this.meldung.set(`Eintrag „${name}“ entfernt.`);
    } catch (e) {
      this.meldung.set(`Entfernen nicht möglich: ${(e as Error).message}`);
    }
  }
  protected readonly bearbeiten = signal<Eintrag | null>(null);

  // Synchronisation: Status je Eintrag (synchron / wartet / nur auf diesem Gerät) und Berechtigung „Daten löschen“
  protected readonly sync = inject(SyncService);
  protected loeschbar(): boolean {
    return this.sync.darfLoeschen();
  }
  protected readonly art = spiegelArt;
  protected readonly statusText: Record<SyncStatus, string> = { synchron: '☁ synchron', wartet: '⟳ wartet', lokal: '▣ nur auf diesem Gerät' };
  protected status(key: string): SyncStatus {
    return syncStatusVon(key, localStorage.getItem(key), this.sync.spiegel(), this.sync.person());
  }
  protected readonly zaehler = computed(() => {
    this.sync.spiegel();
    this.sync.ausstehend();
    const z = { synchron: 0, wartet: 0, lokal: 0 };
    for (const e of this.liste()) z[this.status(e.key)]++;
    return z;
  });
  protected zeit(iso: string): string {
    return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
  }

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
  }

  // Proben-Mitschnitte
  protected readonly mitschnitte = signal({ anzahl: 0, songs: 0, bytes: 0 });

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

  // Löschen für die ganze Band (OneDrive und alle Geräte, über die Liste „für alle gelöscht“) oder nur hier
  protected async pdfLoeschen(d: NotenDateiInfo): Promise<void> {
    const alle = confirm(`„${d.name}“ für die ganze Band löschen – aus OneDrive und auf allen Geräten beim nächsten Abgleich?\n\nAbbrechen = nur auf diesem Gerät löschen (nächste Frage).`);
    if (!alle && !confirm(`„${d.name}“ nur auf diesem Gerät löschen? Songs, die es nutzen, verlieren hier dieses PDF; in OneDrive bleibt es.`)) return;
    await notenDateiLoeschen(d.id);
    const drueben = alle ? await this.sync.ausOneDriveLoeschen([d]).catch(() => 0) : 0;
    this.notenLaden();
    this.fertig(alle ? `PDF für alle gelöscht ✓${drueben ? '' : ' (im Sync-Ordner lag es nicht – die anderen Geräte entfernen ihre Kopie beim nächsten Abgleich)'}` : 'PDF auf diesem Gerät gelöscht ✓');
  }
}
