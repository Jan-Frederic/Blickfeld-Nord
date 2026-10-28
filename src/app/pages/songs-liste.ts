import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import data from '../data/repertoire.json';
import { SONGINFO, SONGINFO_ENTWURF_KEY, SONG_FELDER, SongInfo, SongWerte } from '../data/songinfo';
import { patchSongInfo } from '../data/songinfo-patch';
import { NotenDateiInfo, alleSongNoten, notenDateien } from '../data/noten';
import { SongDialog } from './song-dialog';
import { SetlistBuehne } from './setlist-buehne';
import { Song, loadSetlist } from '../data/setlist-data';
import { BandService } from '../data/band.service';
import { historieText, songHistorie } from '../data/song-historie';

// Backstage → Songs → Liste: Tonart, Tempo und Notiz je Song eintragen, ohne songinfo.ts von Hand zu bearbeiten.
// „Original“ ist die Tonart der Aufnahme, „wir spielen“ und Capo die Band-Version; das Tempo lässt sich im Proberaum
// per „Tippen“ im Takt ermitteln. Unter jedem Song steht, woher recherchierte Werte stammen (quelle in songinfo.ts).
// Der Entwurf bleibt auf dem Gerät (bn-songinfo-entwurf), bis die fertige Datei auf GitHub eingefügt ist.
const ENTWURF_KEY = SONGINFO_ENTWURF_KEY;
const RAW_URL = 'https://raw.githubusercontent.com/Jan-Frederic/Blickfeld-Nord/main/src/app/data/songinfo.ts';
const EDIT_URL = 'https://github.com/Jan-Frederic/Blickfeld-Nord/edit/main/src/app/data/songinfo.ts';

type Werte = SongWerte;
const key = (t: { title: string; artist: string }) => `${t.title}|${t.artist}`;
const norm = (s: string) => s.toLocaleLowerCase('de').normalize('NFD').replace(/\p{Diacritic}/gu, '');

function ladeEntwurf(): Record<string, Werte> {
  try {
    return JSON.parse(localStorage.getItem(ENTWURF_KEY) ?? '{}');
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-songs-liste',
  imports: [MatIconModule, SongDialog, SetlistBuehne],
  template: `
      <p class="lead">
        Tonart, Tempo, Notiz und Noten je Song – erscheinen in Setlist, Bühnen-Modus und Laufzettel. Zeile antippen zum
        Bearbeiten; spielt ihr einen Song anders als im Original, dort „Wir spielen“ und „Capo“ eintragen, das Tempo im
        Proberaum mit <mat-icon class="inline">touch_app</mat-icon> mindestens viermal im Takt tippen.
        <mat-icon class="inline">play_arrow</mat-icon> startet den Bühnen-Modus ab dem Song – zur Kontrolle der Noten.
        Angaben bisher bei {{ ausgefuellt() }} von {{ songs.length }} Songs. Auf diesem Gerät gelten Änderungen sofort;
        auf die Handys der anderen kommen sie über „Abgleich“ oder für alle dauerhaft über „Datei für GitHub erzeugen“ (unten).
      </p>

      <div class="fortschritt" role="progressbar" [attr.aria-valuenow]="ausgefuellt()" aria-valuemin="0" [attr.aria-valuemax]="songs.length" aria-label="Songs mit Tonart oder Tempo">
        <span [style.width.%]="(ausgefuellt() / songs.length) * 100"></span>
      </div>
      <div class="filter">
        <label>Zeigen
          <select class="zeigen" (change)="zeigen.set($any($event.target).value)">
            <option value="">alle Songs</option>
            <option value="tonart">ohne Tonart oder Tempo</option>
            <option value="noten">ohne Noten</option>
            <option value="akkorde">ohne Akkorde</option>
            @for (f of fassungen(); track f) { <option [value]="'fassung:' + f">ohne {{ f }}</option> }
            <option value="nie">noch nie gespielt</option>
          </select>
        </label>
        <label>Reihenfolge
          <select (change)="sortierung.set($any($event.target).value)">
            <option value="repertoire">wie im Repertoire</option>
            <option value="haeufig">oft gespielt zuerst</option>
            <option value="lange">lange nicht gespielt zuerst</option>
          </select>
        </label>
        @if (zeigen()) { <span class="treffer">{{ gefiltert().length }} {{ gefiltert().length === 1 ? 'Song' : 'Songs' }}</span> }
      </div>

      <label class="search">
        <mat-icon>search</mat-icon>
        <input type="search" placeholder="Song oder Interpret suchen …" [value]="suche()" (input)="suche.set($any($event.target).value)" aria-label="Songs durchsuchen" />
      </label>

      <table class="songs">
        <thead>
          <tr><th scope="col">Song</th><th scope="col">Tonart · Tempo</th><th scope="col">Noten</th><th scope="col"><span class="sr">Bühnen-Modus</span></th></tr>
        </thead>
        <tbody>
          @for (s of gefiltert(); track s.key; let i = $index) {
            <tr [class.changed]="geaendert().includes(s.key)" (click)="oeffnen(s.key)">
              <td class="song">
                <button type="button" class="oeffnen" (click)="oeffnen(s.key, $event)" [attr.aria-label]="s.title + ' bearbeiten'">{{ s.title }}</button>
                <span class="a">{{ s.artist }}</span>
                <span class="a hist">{{ historieText(historie().get(s.key)) }}</span>
              </td>
              <td class="werte">
                @let w = wert(s.key);
                @if (w.tonart || w.spielTonart) { <span>{{ w.spielTonart ?? w.tonart }}@if (w.spielTonart && w.tonart) { <span class="a"> ({{ w.tonart }})</span> }</span> }
                @if (w.capo) { <span class="a">Capo {{ w.capo }}</span> }
                @if (w.bpm) { <span class="a">{{ w.bpm }} bpm</span> }
                @if (!w.tonart && !w.spielTonart && !w.bpm) { <span class="a">–</span> }
              </td>
              <td class="noten">
                @if (mitNoten().get(s.key); as n) {
                  @if (n.pdfs) { <span class="tag">{{ n.pdfs > 1 ? n.pdfs + ' PDFs' : 'PDF' }}</span> }
                  @if (n.akkorde) { <span class="tag">Akkorde</span> }
                } @else { <span class="a">–</span> }
              </td>
              <td class="start">
                <button type="button" (click)="buehneAb(i, $event)" [attr.aria-label]="'Bühnen-Modus ab ' + s.title" title="Im Bühnen-Modus ab hier"><mat-icon>play_arrow</mat-icon></button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="4" class="a">Kein Song gefunden.</td></tr>
          }
        </tbody>
      </table>

      @if (offen(); as k) {
        <app-song-dialog [song]="zeile(k)" [werte]="wert(k)" [quelle]="quelle(k)" [dateien]="notenDateien()"
          [position]="(dialogIndex() + 1) + ' / ' + dialogListe().length" [hatVorigen]="dialogIndex() > 0" [hatNaechsten]="dialogIndex() < dialogListe().length - 1"
          (setzen)="setzen(k, $event.feld, $event.roh)" (notenGeaendert)="notenLaden()" (blaettern)="dialogBlaettern($event)"
          (buehne)="buehneAusDialog()" (schliessen)="offen.set(null)" />
      }
      @if (buehne(); as b) { <app-setlist-buehne [entries]="b.entries" [start]="b.start" [notenAuf]="true" (closed)="buehneZu()" /> }

      <div class="apply">
        @if (geaendert().length) {
          <p><strong>{{ geaendert().length }}</strong> {{ geaendert().length === 1 ? 'Song geändert' : 'Songs geändert' }} – auf diesem Gerät gespeichert. Für alle übernehmen:</p>
          <ol>
            <li><button type="button" (click)="erzeugen()"><mat-icon>content_copy</mat-icon> Datei für GitHub erzeugen</button></li>
            <li><a [href]="editUrl" target="_blank" rel="noopener"><mat-icon>open_in_new</mat-icon> songinfo.ts auf GitHub öffnen</a>, mit Strg+A alles markieren, einfügen, „Commit changes“</li>
            <li><button type="button" (click)="verwerfen()"><mat-icon>restart_alt</mat-icon> Entwurf auf diesem Gerät verwerfen</button></li>
          </ol>
          @if (meldung(); as m) { <p class="meldung" role="status">{{ m }}</p> }
        } @else {
          <p>Noch nichts geändert. Tonart als Grundton (Moll mit „m“), Tempo in Schlägen pro Minute. Recherchierte Werte
            gelten für die Originalaufnahme – die Quelle steht unter dem Song.</p>
        }
      </div>
  `,
  styles: `
    .fortschritt { height: 6px; margin: 0 0 14px; border-radius: 3px; background: rgba(255, 255, 255, .08); overflow: hidden; }
    .fortschritt span { display: block; height: 100%; background: var(--bn-sunset); }
    .filter { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 20px; margin-bottom: 12px; font-size: .88rem; color: var(--bn-fog); }
    .filter label { display: inline-flex; align-items: center; gap: 8px; text-transform: none; letter-spacing: normal; font-size: .88rem; color: var(--bn-fog); }
    .filter input[type=checkbox] { flex: none; width: auto; margin: 0; padding: 0; accent-color: var(--bn-sunset); }
    .filter select { padding: 6px 8px; border: 1px solid var(--bn-line); border-radius: 8px; background: #1b1e22; color: var(--bn-ink); font: inherit; color-scheme: dark; }
    .search { display: flex; align-items: center; gap: 8px; padding: 0 12px; margin-bottom: 16px; border: 1px solid var(--bn-line); border-radius: 10px; }
    .search mat-icon { color: var(--bn-fog); }
    .search input { flex: 1; padding: 10px 0; border: 0; background: none; color: var(--bn-ink); font: inherit; }
    .songs { width: 100%; border-collapse: collapse; font-size: .9rem; }
    th { padding: 6px 8px; border-bottom: 1px solid var(--bn-line); text-align: left; font-size: .72rem; font-weight: 500; color: var(--bn-fog); text-transform: uppercase; letter-spacing: .08em; }
    td { padding: 8px; border-bottom: 1px solid var(--bn-line); vertical-align: middle; overflow-wrap: anywhere; hyphens: auto; }
    tbody tr { cursor: pointer; }
    tbody tr:hover { background: rgba(255, 255, 255, .04); }
    tr.changed td:first-child { box-shadow: inset 3px 0 var(--bn-sunset); }
    .song, .werte { line-height: 1.35; }
    .song .a, .werte > span { display: block; }
    .hist { font-size: .75rem; }
    .treffer { font-size: .85rem; color: var(--bn-fog); }
    .oeffnen { padding: 0; border: 0; background: none; color: var(--bn-ink); font: inherit; font-weight: 600; text-align: left; cursor: pointer; }
    .oeffnen:hover { color: var(--bn-sunset); }
    .tag { display: inline-block; margin: 1px 4px 1px 0; padding: 0 7px; border: 1px solid var(--bn-sunset); border-radius: 999px; color: var(--bn-sunset); font-size: .72rem; }
    .start { width: 1%; }
    .start button { display: grid; place-items: center; width: 36px; height: 36px; border: 1px solid var(--bn-line); border-radius: 50%; background: none; color: var(--bn-ink); cursor: pointer; }
    .start button:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    mat-icon.inline { font-size: 16px; width: 16px; height: 16px; vertical-align: -3px; }
    .a { color: var(--bn-fog); font-size: .82rem; }
    .apply { margin-top: 24px; padding: 16px 18px; border: 1px solid var(--bn-line); border-radius: 12px; font-size: .9rem; line-height: 1.6; }
    .apply p { margin: 0 0 8px; }
    .apply ol { margin: 0; padding-left: 20px; display: grid; gap: 8px; }
    .apply button, .apply a { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; text-decoration: none; cursor: pointer; }
    .apply button:hover, .apply a:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .apply mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .meldung { margin: 10px 0 0 !important; color: #5fb88a; }
    @media (max-width: 480px) { td, th { padding: 8px 4px; } }
  `,
})
export class SongsListe {
  protected readonly editUrl = EDIT_URL;
  protected readonly songs = data.tracks.map((t) => ({ title: t.title, artist: t.artist, key: key(t) }));
  private readonly gespeichert: Record<string, Werte> = Object.fromEntries(
    SONGINFO.map((s) => [key(s), Object.fromEntries(SONG_FELDER.filter((f) => s[f] !== undefined).map((f) => [f, s[f]])) as Werte]),
  );
  private readonly quellen = new Map(SONGINFO.filter((s) => s.quelle).map((s) => [key(s), s.quelle!]));
  protected readonly entwurf = signal<Record<string, Werte>>(ladeEntwurf());
  protected readonly suche = signal('');
  protected readonly meldung = signal('');

  // Lücken finden (ohne Tonart/Tempo, ohne Noten, ohne Akkorde, ohne eine Fassung wie „Bass“, nie gespielt) und
  // sortieren nach Repertoire, oft gespielt oder lange nicht gespielt (Song-Historie aus den Setlists der Auftritte)
  protected readonly zeigen = signal('');
  protected readonly sortierung = signal<'repertoire' | 'haeufig' | 'lange'>('repertoire');
  protected readonly historieText = historieText;
  private readonly band = inject(BandService);
  protected readonly historie = computed(() =>
    songHistorie(
      this.band.shows.map((show) => ({ tag: show.endDate ?? show.date, setlist: loadSetlist(this.band.showId(show)) })),
      new Date().toISOString().slice(0, 10),
    ),
  );
  /** alle Fassungsnamen der PDFs auf diesem Gerät (für „ohne Bass“ usw.) */
  protected readonly fassungen = computed(() => {
    const namen = new Map<string, string>();
    for (const n of this.mitNoten().values()) for (const f of n.fassungen) if (!namen.has(f.toLowerCase())) namen.set(f.toLowerCase(), f);
    return [...namen.values()].sort((a, b) => a.localeCompare(b, 'de'));
  });

  protected readonly gefiltert = computed(() => {
    const q = norm(this.suche().trim());
    let liste = q ? this.songs.filter((s) => norm(`${s.title} ${s.artist}`).includes(q)) : this.songs;
    const z = this.zeigen();
    const noten = this.mitNoten();
    if (z === 'tonart') liste = liste.filter((s) => { const w = this.wert(s.key); return !w.tonart || !w.bpm; });
    else if (z === 'noten') liste = liste.filter((s) => !noten.has(s.key));
    else if (z === 'akkorde') liste = liste.filter((s) => !noten.get(s.key)?.akkorde);
    else if (z === 'nie') liste = liste.filter((s) => !this.historie().get(s.key)?.gespielt);
    else if (z.startsWith('fassung:')) {
      const f = z.slice(8).toLowerCase();
      liste = liste.filter((s) => !noten.get(s.key)?.fassungen.some((x) => x.toLowerCase() === f));
    }
    const h = this.historie();
    if (this.sortierung() === 'haeufig') liste = [...liste].sort((a, b) => (h.get(b.key)?.gespielt ?? 0) - (h.get(a.key)?.gespielt ?? 0));
    // nie gespielt zuerst, dann der am längsten nicht gespielte
    if (this.sortierung() === 'lange') liste = [...liste].sort((a, b) => (h.get(a.key)?.zuletzt ?? '').localeCompare(h.get(b.key)?.zuletzt ?? ''));
    return liste;
  });
  protected readonly geaendert = computed(() => Object.keys(this.entwurf()));
  protected readonly ausgefuellt = computed(() => this.songs.filter((s) => { const w = this.wert(s.key); return w.tonart || w.bpm || w.notiz; }).length);

  protected wert(k: string): Werte {
    return this.entwurf()[k] ?? this.gespeichert[k] ?? {};
  }

  // Noten (PDF/Akkordblatt) je Song – nur auf diesem Gerät, siehe data/noten.ts
  protected readonly mitNoten = signal(new Map<string, { pdfs: number; akkorde: boolean; fassungen: string[] }>());
  protected readonly notenDateien = signal<NotenDateiInfo[]>([]);
  constructor() {
    this.notenLaden();
  }
  protected notenLaden(): void {
    alleSongNoten()
      .then((n) => this.mitNoten.set(new Map(Object.entries(n).map(([k, v]) => [k, { pdfs: v.pdfs?.length ?? 0, akkorde: !!v.chordpro, fassungen: (v.pdfs ?? []).map((p) => p.name?.trim()).filter((x): x is string => !!x) }]))))
      .catch(() => undefined);
    notenDateien().then((d) => this.notenDateien.set(d)).catch(() => undefined);
  }

  // Dialog „Song bearbeiten“: Zeile anklicken; Voriger/Nächster gehen die Liste so durch, wie sie beim Öffnen gefiltert
  // war – ein Song, der durch das Eintragen aus dem Lücken-Filter fällt, bleibt so erreichbar
  protected readonly offen = signal<string | null>(null);
  protected readonly dialogListe = signal<string[]>([]);
  protected readonly dialogIndex = computed(() => this.dialogListe().indexOf(this.offen() ?? ''));
  private readonly songsNachKey = new Map(this.songs.map((s) => [s.key, s]));
  protected zeile(k: string) {
    return this.songsNachKey.get(k)!;
  }
  protected oeffnen(k: string, e?: Event): void {
    e?.stopPropagation();
    this.dialogListe.set(this.gefiltert().map((s) => s.key));
    this.offen.set(k);
  }
  protected dialogBlaettern(schritt: number): void {
    const k = this.dialogListe()[this.dialogIndex() + schritt];
    if (k) this.offen.set(k);
  }

  // Bühnen-Modus zur Kontrolle: ab dem gewählten Song durch die (gefilterte) Liste, Noten gleich offen –
  // Blättern und Klick wie auf der Bühne. Aus dem Dialog geöffnet, geht es danach zurück in den Dialog.
  protected readonly buehne = signal<{ entries: Song[]; start: number; zurueck?: string } | null>(null);
  protected buehneAb(i: number, e: Event): void {
    e.stopPropagation();
    this.buehne.set({ entries: this.gefiltert().map(({ title, artist }) => ({ title, artist })), start: i });
  }
  protected buehneAusDialog(): void {
    const k = this.offen();
    if (!k) return;
    const entries = this.dialogListe().map((x) => this.zeile(x)).map(({ title, artist }) => ({ title, artist }));
    this.offen.set(null);
    this.buehne.set({ entries, start: Math.max(0, this.dialogListe().indexOf(k)), zurueck: k });
  }
  protected buehneZu(): void {
    const k = this.buehne()?.zurueck;
    this.buehne.set(null);
    if (k) this.offen.set(k);
  }

  protected quelle(k: string): string | undefined {
    return this.quellen.get(k);
  }

  protected setzen(k: string, feld: keyof Werte, roh: string): void {
    const neu: Werte = { ...this.wert(k) };
    if (feld === 'bpm') neu.bpm = Number(roh) >= 40 && Number(roh) <= 240 ? Math.round(Number(roh)) : undefined;
    else if (feld === 'capo') neu.capo = Number(roh) >= 1 && Number(roh) <= 12 ? Number(roh) : undefined;
    else neu[feld] = roh.trim() || undefined;
    // „wir spielen“ gleich dem Original ist keine Abweichung
    if (neu.spielTonart && neu.spielTonart === neu.tonart) neu.spielTonart = undefined;
    const alt = this.gespeichert[k] ?? {};
    const gleich = SONG_FELDER.every((f) => (alt[f] ?? undefined) === (neu[f] ?? undefined));
    this.entwurf.update((e) => {
      const { [k]: _, ...rest } = e;
      return gleich ? rest : { ...rest, [k]: neu };
    });
    this.speichern();
  }

  private speichern(): void {
    try {
      localStorage.setItem(ENTWURF_KEY, JSON.stringify(this.entwurf()));
    } catch {
      // ohne Speicher gilt der Entwurf bis zum Neuladen
    }
  }

  protected verwerfen(): void {
    this.entwurf.set({});
    this.meldung.set('');
    this.speichern();
  }

  // aktuelle songinfo.ts holen, Liste mit allen Angaben (gespeichert + Entwurf) ersetzen, in die Zwischenablage
  protected async erzeugen(): Promise<void> {
    const liste: SongInfo[] = this.songs.map((s) => ({ title: s.title, artist: s.artist, ...this.wert(s.key), quelle: this.quelle(s.key) }));
    try {
      const res = await fetch(`${RAW_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const text = patchSongInfo(await res.text(), liste);
      if (!text) throw new Error('Liste fehlt');
      await navigator.clipboard.writeText(text);
      this.meldung.set('Kopiert ✓ – jetzt songinfo.ts auf GitHub öffnen und den Inhalt ersetzen. Danach den Entwurf verwerfen.');
    } catch {
      this.meldung.set(navigator.onLine ? 'Die Datei ließ sich nicht laden oder kopieren – bitte später noch einmal versuchen.' : 'Offline – dafür braucht es Internet.');
    }
  }
}
