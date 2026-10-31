import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { LISTEN, ListenKey, SongEintrag, abweichungen, gesamtDauer, listeInReihenfolge, pdfSong, pdfSongKey, songAbgleich } from '../data/playlisten';
import { songUmbenennen } from '../data/song-umbenennen';
import { Doppelt, archivKandidaten, buehnenreif, doppelte, gespieltNichtAufWebsite, probenAusSpeicher, probenStand } from '../data/song-stand';
import { SONGINFO, SONGINFO_ENTWURF_KEY, SONG_FELDER, SongInfo, SongWerte } from '../data/songinfo';
import { patchSongInfo } from '../data/songinfo-patch';
import { NotenDateiInfo, NotenPdf, alleSongNoten, notenDateien, songNotenSetzen } from '../data/noten';
import { SongDialog } from './song-dialog';
import { SetlistBuehne } from './setlist-buehne';
import { Song, durationOf, loadSetlist, setTime } from '../data/setlist-data';
import { BandService } from '../data/band.service';
import { historieText, songHistorie } from '../data/song-historie';
import { ladeWackelt, wackeltSetzen } from '../data/wackelt';

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
        Angaben bisher bei {{ ausgefuellt() }} von {{ songs().length }} Songs. Auf diesem Gerät gelten Änderungen sofort;
        auf die Handys der anderen kommen sie über „Abgleich“ oder für alle dauerhaft über „Datei für GitHub erzeugen“ (unten).
      </p>

      <div class="fortschritt" role="progressbar" [attr.aria-valuenow]="ausgefuellt()" aria-valuemin="0" [attr.aria-valuemax]="songs().length" aria-label="Songs mit Tonart oder Tempo">
        <span [style.width.%]="(ausgefuellt() / (songs().length || 1)) * 100"></span>
      </div>
      <div class="listen-chips" role="group" aria-label="Nach Spotify-Liste filtern">
        <button type="button" [attr.aria-pressed]="liste() === ''" (click)="liste.set('')">Alle <span class="n">{{ songs().length }}</span></button>
        @for (l of listen; track l.key) {
          <button type="button" [attr.aria-pressed]="liste() === l.key" (click)="liste.set(l.key)"><mat-icon>{{ l.icon }}</mat-icon> {{ l.label }} <span class="n">{{ anzahl()[l.key] || 0 }}</span></button>
        }
        <button type="button" [attr.aria-pressed]="liste() === 'ohne'" (click)="liste.set('ohne')">Ohne Liste <span class="n">{{ anzahl()['ohne'] }}</span></button>
      </div>
      <div class="listen-info">
        @if (liste()) {
          <span>{{ listenSongs().length }} Songs · {{ zeitText(listenDauer().sekunden) }}@if (listenDauer().fehlend) { <span class="a"> ({{ listenDauer().fehlend }} ohne Länge)</span> }@if (liste() === 'ohne') { <span class="a"> · je 4 Minuten angenommen</span> }</span>
          <button type="button" (click)="mappe()" [disabled]="mappeLaeuft()"><mat-icon>picture_as_pdf</mat-icon> Notenmappe dieser Liste</button>
        }
        <a [href]="aktualisierenUrl" target="_blank" rel="noopener" title="Holt alle Spotify-Listen neu (GitHub → „Run workflow“), danach neuer Stand der Website"><mat-icon>refresh</mat-icon> Listen jetzt aktualisieren</a>
      </div>
      @if (mappeText(); as m) { <p class="a" role="status">{{ m }}</p> }
      @if (hinweisZahl()) {
        <details class="abweichungen">
          <summary><mat-icon>rule</mat-icon> {{ hinweisZahl() }} Hinweise zu den Listen</summary>
          @if (abw().setlistOhneWebsite.length) { <p><b>In der Setlist, aber nicht auf der Website:</b> {{ namen(abw().setlistOhneWebsite) }}</p> }
          @if (abw().archivAufWebsite.length) { <p><b>Im Archiv, aber noch auf der Website:</b> {{ namen(abw().archivAufWebsite) }}</p> }
          @if (fuerWebsite().length) {
            <p><b>Live gespielt, aber nicht auf der Website:</b> {{ namen(fuerWebsite()) }} –
              <a [href]="websiteUrl" target="_blank" rel="noopener">offizielle Playlist in Spotify öffnen</a> und hinzufügen</p>
          }
          @if (fuersArchiv().length) {
            <p><b>Fürs Archiv? Seit über 12 Monaten weder gespielt noch geprobt:</b>
              @for (x of fuersArchiv(); track x.song.key; let l = $last) { {{ x.song.title }} <span class="a">({{ datum(x.zuletzt) }})</span>{{ l ? '' : ', ' }} }</p>
          }
          @if (doppelt().length) {
            <p><b>Vermutlich doppelt:</b></p>
            <ul class="doppelt">
              @for (d of doppelt(); track d.a.key + d.b.key) {
                <li>{{ anzeige(d.a) }} ↔ {{ anzeige(d.b) }} <span class="a">· {{ d.grund }}</span>
                  @if (d.von) { <button type="button" (click)="zusammenfuehren(d)">„{{ anzeige(d.von) }}“ in „{{ anzeige(d.nach!) }}“ aufgehen lassen</button> }
                </li>
              }
            </ul>
          }
        </details>
      }
      <div class="filter">
        <label>Zeigen
          <select class="zeigen" (change)="zeigen.set($any($event.target).value)">
            <option value="">alle Songs</option>
            <option value="tonart">ohne Tonart oder Tempo</option>
            <option value="noten">ohne Noten</option>
            <option value="akkorde">ohne Akkorde</option>
            @for (f of fassungen(); track f) { <option [value]="'fassung:' + f">ohne {{ f }}</option> }
            <option value="nie">noch nie gespielt</option>
            <option value="wackelt">wackelt noch (deine Liste)</option>
          </select>
        </label>
        <label>Reihenfolge
          <select (change)="sortierung.set($any($event.target).value)">
            <option value="repertoire">alphabetisch</option>
            <option value="haeufig">oft gespielt zuerst</option>
            <option value="lange">lange nicht gespielt zuerst</option>
            @if (liste() && liste() !== 'ohne') { <option value="spotify">wie in Spotify</option> }
          </select>
        </label>
        <label><input type="checkbox" [checked]="schnell()" (change)="schnell.set($any($event.target).checked)" /> Tonart und Tempo schnell eintragen</label>
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
                @if (s.listen.length) {
                  <span class="listen-icons">
                    @for (k of s.listen; track k) {
                      @let l = listeVon(k);
                      <a [href]="l.url" target="_blank" rel="noopener" (click)="$event.stopPropagation()" [attr.aria-label]="'In Liste ' + l.label + ' – auf Spotify öffnen'" [title]="l.label + ' – auf Spotify öffnen'"><mat-icon>{{ l.icon }}</mat-icon></a>
                    }
                  </span>
                }
                @if (liste() === 'wunschliste') {
                  @let f = fortschritt(s.key);
                  <span class="wunsch-stand" [attr.aria-label]="'Stand: ' + f.zahl + ' von 3'">
                    <span [class.ok]="f.noten">Noten</span><span [class.ok]="f.tonart">Tonart/Tempo</span><span [class.ok]="f.geprobt">{{ f.geprobt ? f.geprobt + '× geprobt' : 'nicht geprobt' }}</span>
                  </span>
                }
                <span class="a hist">{{ historieText(historie().get(s.key)) }}@if (wackelt()[s.key]) { <span class="wackelt"> · wackelt noch</span> }</span>
              </td>
              <td class="werte">
                @let w = wert(s.key);
                @if (schnell()) {
                  <span class="schnell" (click)="$event.stopPropagation()">
                    <select [attr.aria-label]="'Tonart von ' + s.title" (change)="setzen(s.key, w.tonart ? 'spielTonart' : 'tonart', $any($event.target).value)">
                      <option value="" [selected]="!(w.spielTonart ?? w.tonart)">Tonart</option>
                      @for (t of tonarten; track t) { <option [value]="t" [selected]="(w.spielTonart ?? w.tonart) === t">{{ t }}</option> }
                    </select>
                    <input type="number" min="40" max="240" inputmode="numeric" placeholder="bpm" [attr.aria-label]="'Tempo von ' + s.title" [value]="w.bpm ?? ''" (change)="setzen(s.key, 'bpm', $any($event.target).value)" />
                  </span>
                } @else {
                @if (w.tonart || w.spielTonart) { <span>{{ w.spielTonart ?? w.tonart }}@if (w.spielTonart && w.tonart) { <span class="a"> ({{ w.tonart }})</span> }</span> }
                @if (w.capo) { <span class="a">Capo {{ w.capo }}</span> }
                @if (w.bpm) { <span class="a">{{ w.bpm }} bpm</span> }
                @if (!w.tonart && !w.spielTonart && !w.bpm) { <span class="a">–</span> }
                }
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
          [position]="(dialogIndex() + 1) + ' / ' + dialogListe().length" [hatVorigen]="dialogIndex() > 0" [hatNaechsten]="dialogIndex() < dialogListe().length - 1" [wackelt]="!!wackelt()[k]" (wackeltUmschalten)="wackeltUmschalten(k)"
          [umbenennbar]="!zeile(k).listen.length" (umbenennen)="umbenennen(k, $event)"
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
    .wackelt { color: #e0b25a; }
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
  // alle Spotify-Listen gegeneinander abgeglichen (data/playlisten.ts), dazu Songs, die es nur als Noten gibt
  protected readonly listen = LISTEN;
  private readonly notenKeys = signal<string[]>([]);
  protected readonly songs = computed<SongEintrag[]>(() => songAbgleich(LISTEN, this.notenKeys()));
  protected readonly liste = signal<ListenKey | '' | 'ohne'>('');
  protected readonly anzahl = computed(() => {
    const n: Record<string, number> = { ohne: 0 };
    for (const s of this.songs()) {
      if (!s.listen.length) n['ohne']++;
      for (const k of s.listen) n[k] = (n[k] ?? 0) + 1;
    }
    return n;
  });
  private readonly listenNachKey = new Map(LISTEN.map((l) => [l.key, l]));
  protected listeVon(k: ListenKey) {
    return this.listenNachKey.get(k)!;
  }
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
  protected readonly sortierung = signal<'repertoire' | 'haeufig' | 'lange' | 'spotify'>('repertoire');
  /** Schnell-Modus: Tonart und Tempo direkt in der Tabelle, ohne Dialog */
  protected readonly schnell = signal(false);
  protected readonly tonarten = ((t) => [...t, ...t.map((x) => x + 'm')])(['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'H']);
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
    let liste = q ? this.songs().filter((s) => norm(`${s.title} ${s.artist}`).includes(q)) : this.songs();
    const l = this.liste();
    if (l === 'ohne') liste = liste.filter((s) => !s.listen.length);
    else if (l) liste = liste.filter((s) => s.listen.includes(l));
    const z = this.zeigen();
    const noten = this.mitNoten();
    if (z === 'tonart') liste = liste.filter((s) => { const w = this.wert(s.key); return !w.tonart || !w.bpm; });
    else if (z === 'noten') liste = liste.filter((s) => !noten.has(s.key));
    else if (z === 'akkorde') liste = liste.filter((s) => !noten.get(s.key)?.akkorde);
    else if (z === 'nie') liste = liste.filter((s) => !this.historie().get(s.key)?.gespielt);
    else if (z === 'wackelt') liste = liste.filter((s) => this.wackelt()[s.key]);
    else if (z.startsWith('fassung:')) {
      const f = z.slice(8).toLowerCase();
      liste = liste.filter((s) => !noten.get(s.key)?.fassungen.some((x) => x.toLowerCase() === f));
    }
    const h = this.historie();
    if (this.sortierung() === 'haeufig') liste = [...liste].sort((a, b) => (h.get(b.key)?.gespielt ?? 0) - (h.get(a.key)?.gespielt ?? 0));
    // nie gespielt zuerst, dann der am längsten nicht gespielte
    if (this.sortierung() === 'spotify' && this.liste() && this.liste() !== 'ohne') {
      const reihe = new Map(this.listenSongs().map((x, i) => [x.key, i]));
      liste = [...liste].sort((a, b) => (reihe.get(a.key) ?? 1e9) - (reihe.get(b.key) ?? 1e9));
    }
    if (this.sortierung() === 'lange') liste = [...liste].sort((a, b) => (h.get(a.key)?.zuletzt ?? '').localeCompare(h.get(b.key)?.zuletzt ?? ''));
    return liste;
  });
  protected readonly geaendert = computed(() => Object.keys(this.entwurf()));
  /** eigene „Wackelt noch“-Liste (data/wackelt.ts) */
  protected readonly wackelt = signal(ladeWackelt());
  // Lücken je Liste: „Zeigen“ und Reihenfolge wirken zusätzlich zu den Chips (z. B. Setlist + ohne Bass)
  // Dauer, Notenmappe, Abweichungen, Stand der Wunschliste
  protected readonly aktualisierenUrl = 'https://github.com/Jan-Frederic/Blickfeld-Nord/actions/workflows/repertoire.yml';
  protected readonly abw = computed(() => abweichungen(this.songs()));
  protected namen(songs: SongEintrag[]): string {
    return songs.map((s) => (s.artist ? `${s.title} (${s.artist})` : s.title)).join(', ');
  }
  /** Songs der gewählten Liste – bei Spotify-Listen in deren Reihenfolge */
  protected readonly listenSongs = computed(() => {
    const l = this.liste();
    if (!l) return this.songs();
    if (l === 'ohne') return this.songs().filter((s) => !s.listen.length);
    return listeInReihenfolge(l, this.songs());
  });
  protected readonly listenDauer = computed(() => gesamtDauer(this.listenSongs(), durationOf));
  protected zeitText(sek: number): string {
    return setTime(sek);
  }
  protected readonly mappeLaeuft = signal(false);
  protected readonly mappeText = signal('');
  protected async mappe(): Promise<void> {
    const l = this.liste();
    const name = l === 'ohne' ? 'Ohne Liste' : this.listeVon(l as ListenKey).label;
    this.mappeLaeuft.set(true);
    this.mappeText.set('Notenmappe wird erstellt …');
    try {
      const { notenmappe } = await import('../data/notenmappe');
      const r = await notenmappe(this.listenSongs().map(({ title, artist }) => ({ title, artist })), `Liste ${name}`, (st) => this.mappeText.set(st.text));
      const datei = new File([r.pdf], `Notenmappe ${name}.pdf`, { type: 'application/pdf' });
      const url = URL.createObjectURL(datei);
      Object.assign(document.createElement('a'), { href: url, download: datei.name }).click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      this.mappeText.set(`Notenmappe mit ${r.seiten} Seiten gespeichert ✓${r.ohne.length ? ` – ohne Noten: ${r.ohne.length}` : ''}`);
    } catch (e) {
      this.mappeText.set(`Notenmappe ließ sich nicht erstellen: ${(e as Error).message || 'unbekannter Fehler'}`);
    } finally {
      this.mappeLaeuft.set(false);
    }
  }
  /** Wunschliste: Noten da, Tonart/Tempo eingetragen, wie oft schon geprobt (vergangene Proben) */
  private readonly proben = computed(() => probenStand(probenAusSpeicher(), new Date().toISOString().slice(0, 10)));
  private readonly geprobt = computed(() => new Map([...this.proben()].map(([k, p]) => [k, p.anzahl])));
  // Hinweise: Kandidaten für die Website-Liste und fürs Archiv, vermutlich Doppelte (data/song-stand.ts)
  protected readonly websiteUrl = LISTEN[0].url;
  protected readonly fuerWebsite = computed(() => gespieltNichtAufWebsite(this.songs(), this.historie()));
  protected readonly fuersArchiv = computed(() => archivKandidaten(this.songs(), this.historie(), this.proben(), new Date().toISOString().slice(0, 10)));
  protected readonly doppelt = computed(() => doppelte(this.songs()));
  protected readonly hinweisZahl = computed(
    () => this.abw().setlistOhneWebsite.length + this.abw().archivAufWebsite.length + this.fuerWebsite().length + this.fuersArchiv().length + this.doppelt().length,
  );
  protected anzeige(s: SongEintrag): string {
    return s.artist ? `${s.title} – ${s.artist}` : s.title;
  }
  protected datum(iso: string): string {
    return `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
  }
  protected async zusammenfuehren(d: Doppelt): Promise<void> {
    if (!d.von || !d.nach || !confirm(`„${this.anzeige(d.von)}“ in „${this.anzeige(d.nach)}“ aufgehen lassen? Noten, Mitschnitte und Einträge ziehen mit.`)) return;
    await songUmbenennen(d.von, d.nach);
    this.entwurf.set(ladeEntwurf());
    this.wackelt.set(ladeWackelt());
    await this.notenSongs();
    this.notenLaden();
  }
  /** bühnenreif (Noten, Tonart/Tempo, geprobt) – für die Wunschliste */
  protected readonly buehnenreif = buehnenreif;
  protected fortschritt(k: string) {
    const w = this.wert(k);
    const f = { noten: this.mitNoten().has(k), tonart: !!((w.tonart || w.spielTonart) && w.bpm), geprobt: this.geprobt().get(k) ?? 0 };
    return { ...f, zahl: [f.noten, f.tonart, f.geprobt > 0].filter(Boolean).length };
  }
  /** eigenständigen Song umbenennen – Noten, Mitschnitte, Setlists, Proben, Entwurf ziehen mit */
  protected async umbenennen(k: string, neu: { title: string; artist: string }): Promise<void> {
    const alt = this.zeile(k);
    if (!neu.title || (neu.title === alt.title && neu.artist === alt.artist)) return;
    await songUmbenennen(alt, neu);
    const neuKey = `${neu.title}|${neu.artist}`;
    this.entwurf.set(ladeEntwurf());
    this.wackelt.set(ladeWackelt());
    this.offen.set(null);
    await this.notenSongs();
    this.notenLaden();
    if (this.songsNachKey().has(neuKey)) this.offen.set(neuKey);
  }

  protected wackeltUmschalten(k: string): void {
    this.wackelt.set(wackeltSetzen(k, !this.wackelt()[k]));
  }
  protected readonly ausgefuellt = computed(() => this.songs().filter((s) => { const w = this.wert(s.key); return w.tonart || w.bpm || w.notiz; }).length);

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
    void this.notenSongs();
    alleSongNoten()
      .then((n) => this.mitNoten.set(new Map(Object.entries(n).map(([k, v]) => [k, { pdfs: v.pdfs?.length ?? 0, akkorde: !!v.chordpro, fassungen: (v.pdfs ?? []).map((p) => p.name?.trim()).filter((x): x is string => !!x) }]))))
      .catch(() => undefined);
    notenDateien().then((d) => this.notenDateien.set(d)).catch(() => undefined);
  }

  /** Songs, die es nur als Noten gibt: Noten zu Songs in keiner Liste und alleinstehende PDFs. Ein PDF, das noch
   *  keinem Song zugeordnet ist, wird dem Song aus seinem Namen „<Band> - <Titel>.pdf“ zugeordnet (Rest = Fassung) –
   *  steht der Song in einer Liste, diesem; sonst ist es ein eigener Song ohne Liste */
  private async notenSongs(): Promise<void> {
    try {
      const [songs, dateien] = await Promise.all([alleSongNoten(), notenDateien()]);
      const genutzt = new Set(Object.values(songs).flatMap((n) => (n.pdfs ?? []).map((p) => p.datei)));
      const bekannt = songAbgleich(LISTEN);
      const neu = new Map<string, NotenPdf[]>();
      for (const d of dateien.filter((x) => !genutzt.has(x.id))) {
        const k = pdfSongKey(d.name, bekannt);
        const fassung = pdfSong(d.name).fassung;
        neu.set(k, [...(neu.get(k) ?? []), { datei: d.id, ...(fassung ? { name: fassung } : {}) }]);
      }
      for (const [k, pdfs] of neu) {
        const alt = songs[k] ?? {};
        songs[k] = { ...alt, pdfs: [...(alt.pdfs ?? []), ...pdfs] };
        await songNotenSetzen(k, songs[k]);
      }
      if (neu.size) this.notenLaden();
      this.notenKeys.set(Object.entries(songs).filter(([, n]) => n.pdfs?.length || n.chordpro).map(([k]) => k));
    } catch {
      // ohne IndexedDB nur die Listen
    }
  }

  // Dialog „Song bearbeiten“: Zeile anklicken; Voriger/Nächster gehen die Liste so durch, wie sie beim Öffnen gefiltert
  // war – ein Song, der durch das Eintragen aus dem Lücken-Filter fällt, bleibt so erreichbar
  protected readonly offen = signal<string | null>(null);
  protected readonly dialogListe = signal<string[]>([]);
  protected readonly dialogIndex = computed(() => this.dialogListe().indexOf(this.offen() ?? ''));
  private readonly songsNachKey = computed(() => new Map(this.songs().map((s) => [s.key, s])));
  protected zeile(k: string) {
    return this.songsNachKey().get(k)!;
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
    // Songs der Website-Liste und alle mit Angaben – reine Noten-Songs ohne Angaben bleiben draußen
    const liste: SongInfo[] = this.songs().filter((s) => s.listen.includes('website') || Object.keys(this.wert(s.key)).length || this.quelle(s.key)).map((s) => ({ title: s.title, artist: s.artist, ...this.wert(s.key), quelle: this.quelle(s.key) }));
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
