import { Component, computed, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import data from '../data/repertoire.json';
import { SONGINFO, SONGINFO_ENTWURF_KEY, SONG_FELDER, SongInfo, SongWerte } from '../data/songinfo';
import { patchSongInfo } from '../data/songinfo-patch';
import { NotenDateiInfo, alleSongNoten, notenDateien } from '../data/noten';
import { NotenEditor } from './noten-editor';
import { NotenVerwaltung } from './noten-verwaltung';
import { SETLIST_PREFIX } from '../data/setlist-data';

// Backstage → Songs: Tonart, Tempo und Notiz je Song eintragen, ohne songinfo.ts von Hand zu bearbeiten.
// „Original“ ist die Tonart der Aufnahme, „wir spielen“ und Capo die Band-Version; das Tempo lässt sich im Proberaum
// per „Tippen“ im Takt ermitteln. Unter jedem Song steht, woher recherchierte Werte stammen (quelle in songinfo.ts).
// Der Entwurf bleibt auf dem Gerät (bn-songinfo-entwurf), bis die fertige Datei auf GitHub eingefügt ist.
const ENTWURF_KEY = SONGINFO_ENTWURF_KEY;
const RAW_URL = 'https://raw.githubusercontent.com/Jan-Frederic/Blickfeld-Nord/main/src/app/data/songinfo.ts';
const EDIT_URL = 'https://github.com/Jan-Frederic/Blickfeld-Nord/edit/main/src/app/data/songinfo.ts';
const TONARTEN = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'H'];

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
  selector: 'app-backstage-songs',
  imports: [MatIconModule, NotenEditor, NotenVerwaltung],
  template: `
    <section class="section">
      <p class="kicker">Backstage</p>
      <h2>Songs</h2>
      <p class="lead">
        Tonart, Tempo und eine kurze Notiz je Song – erscheinen in Setlist, Bühnen-Modus und Laufzettel. Spielt ihr
        einen Song anders als im Original, unter „Wir spielen“ und „Capo“ eintragen; das Tempo im Proberaum mit
        <mat-icon class="inline">touch_app</mat-icon> mindestens viermal im Takt tippen.
        Angaben bisher bei {{ ausgefuellt() }} von {{ songs.length }} Songs. Auf diesem Gerät gelten Änderungen sofort;
        auf die Handys der anderen kommen sie über „Abgleich“ oder für alle dauerhaft über „Datei für GitHub erzeugen“ (unten).
      </p>

      <div class="fortschritt" role="progressbar" [attr.aria-valuenow]="ausgefuellt()" aria-valuemin="0" [attr.aria-valuemax]="songs.length" aria-label="Songs mit Tonart oder Tempo">
        <span [style.width.%]="(ausgefuellt() / songs.length) * 100"></span>
      </div>
      <div class="filter">
        <label class="check"><input type="checkbox" [checked]="nurLuecken()" (change)="nurLuecken.set($any($event.target).checked)" /> nur Songs ohne Tonart oder Tempo</label>
        <label>Reihenfolge
          <select (change)="sortierung.set($any($event.target).value)">
            <option value="repertoire">wie im Repertoire</option>
            <option value="haeufig">oft in Setlists zuerst</option>
          </select>
        </label>
      </div>

      <label class="search">
        <mat-icon>search</mat-icon>
        <input type="search" placeholder="Song oder Interpret suchen …" [value]="suche()" (input)="suche.set($any($event.target).value)" aria-label="Songs durchsuchen" />
      </label>

      <ul class="list">
        @for (s of gefiltert(); track s.key) {
          <li [class.changed]="geaendert().includes(s.key)">
            <span class="song"><strong>{{ s.title }}</strong><span class="a">{{ s.artist }}@if (haeufigkeit().get(s.key); as n) { · in {{ n }} {{ n === 1 ? 'Setlist' : 'Setlists' }} }</span>
              <button type="button" class="noten" [class.hat]="mitNoten().has(s.key)" (click)="notenOffen.set(notenOffen() === s.key ? null : s.key)" [attr.aria-expanded]="notenOffen() === s.key">
                <mat-icon>library_music</mat-icon> {{ mitNoten().has(s.key) ? 'Noten ✓' : 'Noten' }}</button></span>
            <label>Original
              <select (change)="setzen(s.key, 'tonart', $any($event.target).value)">
                <option value="" [selected]="!wert(s.key).tonart">–</option>
                @for (t of tonarten; track t) { <option [value]="t" [selected]="wert(s.key).tonart === t">{{ t }}</option> }
              </select>
            </label>
            <label>Wir spielen
              <select (change)="setzen(s.key, 'spielTonart', $any($event.target).value)">
                <option value="" [selected]="!wert(s.key).spielTonart">wie Original</option>
                @for (t of tonarten; track t) { <option [value]="t" [selected]="wert(s.key).spielTonart === t">{{ t }}</option> }
              </select>
            </label>
            <label>Capo
              <select (change)="setzen(s.key, 'capo', $any($event.target).value)">
                <option value="" [selected]="!wert(s.key).capo">–</option>
                @for (c of capos; track c) { <option [value]="c" [selected]="wert(s.key).capo === c">{{ c }}</option> }
              </select>
            </label>
            <label class="tempo">bpm
              <span class="tempo-feld">
                <input type="number" min="40" max="240" inputmode="numeric" [value]="wert(s.key).bpm ?? ''" (change)="setzen(s.key, 'bpm', $any($event.target).value)" />
                <button type="button" class="tap" [class.aktiv]="tapKey() === s.key" (click)="tippen(s.key)" [attr.aria-label]="'Tempo für ' + s.title + ' im Takt tippen'" title="Mindestens 4-mal im Takt tippen">
                  @if (tapKey() === s.key) { {{ tapBpm() ?? tapZahl() + '/4' }} } @else { <mat-icon>touch_app</mat-icon> }
                </button>
              </span>
            </label>
            <label class="notiz">Notiz
              <input maxlength="40" placeholder="z. B. Intro Gitarre" [value]="wert(s.key).notiz ?? ''" (change)="setzen(s.key, 'notiz', $any($event.target).value)" />
            </label>
            @if (quelle(s.key); as q) { <p class="quelle"><mat-icon>info</mat-icon> Recherche: {{ q }}</p> }
            @if (notenOffen() === s.key) { <app-noten-editor [songKey]="s.key" [dateien]="notenDateien()" (geaendert)="notenLaden()" /> }
          </li>
        } @empty {
          <li class="empty">Kein Song gefunden.</li>
        }
      </ul>

      <app-noten-verwaltung [dateien]="notenDateien()" [songs]="mitNoten().size" (geaendert)="notenLaden()" />

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
    </section>
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
    .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
    .list li {
      display: grid; grid-template-columns: minmax(0, 1fr) 76px 118px 62px 116px 150px; gap: 10px; align-items: end;
      padding: 10px 14px; border: 1px solid var(--bn-line); border-radius: 10px;
    }
    .list li.changed { border-color: var(--bn-sunset); }
    .tempo-feld { display: flex; gap: 4px; }
    .tempo-feld input { min-width: 0; }
    .tap {
      flex: none; display: grid; place-items: center; min-width: 40px; padding: 0 6px; border: 1px solid var(--bn-line); border-radius: 8px;
      background: none; color: var(--bn-fog); font: inherit; font-size: .8rem; text-transform: none; letter-spacing: 0; cursor: pointer;
    }
    .tap:hover, .tap.aktiv { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .tap mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .noten { justify-self: start; display: inline-flex; align-items: center; gap: 4px; margin-top: 4px; padding: 2px 10px; border: 1px solid var(--bn-line); border-radius: 999px; background: none; color: var(--bn-fog); font: inherit; font-size: .75rem; cursor: pointer; }
    .noten.hat { color: var(--bn-sunset); }
    .noten mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .quelle { grid-column: 1 / -1; display: flex; align-items: center; gap: 6px; margin: 0; font-size: .75rem; color: var(--bn-fog); }
    .quelle mat-icon { flex: none; font-size: 14px; width: 14px; height: 14px; }
    mat-icon.inline { font-size: 16px; width: 16px; height: 16px; vertical-align: -3px; }
    .song { display: grid; align-self: center; line-height: 1.4; min-width: 0; }
    .a { color: var(--bn-fog); font-size: .85rem; }
    label { display: grid; gap: 2px; min-width: 0; font-size: .72rem; color: var(--bn-fog); text-transform: uppercase; letter-spacing: .08em; }
    select, label input { width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid var(--bn-line); border-radius: 8px; background: #1b1e22; color: var(--bn-ink); font: inherit; font-size: .9rem; text-transform: none; letter-spacing: 0; }
    .empty { color: var(--bn-fog); }
    .apply { margin-top: 24px; padding: 16px 18px; border: 1px solid var(--bn-line); border-radius: 12px; font-size: .9rem; line-height: 1.6; }
    .apply p { margin: 0 0 8px; }
    .apply ol { margin: 0; padding-left: 20px; display: grid; gap: 8px; }
    .apply button, .apply a { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; text-decoration: none; cursor: pointer; }
    .apply button:hover, .apply a:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .apply mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .meldung { margin: 10px 0 0 !important; color: #5fb88a; }
    @media (max-width: 640px) {
      .list li { grid-template-columns: 1fr 1fr; }
      .song, .notiz { grid-column: 1 / -1; }
    }
  `,
})
export class BackstageSongs {
  protected readonly editUrl = EDIT_URL;
  protected readonly tonarten = [...TONARTEN, ...TONARTEN.map((t) => t + 'm')];
  protected readonly capos = Array.from({ length: 9 }, (_, i) => i + 1);
  protected readonly songs = data.tracks.map((t) => ({ title: t.title, artist: t.artist, key: key(t) }));
  private readonly gespeichert: Record<string, Werte> = Object.fromEntries(
    SONGINFO.map((s) => [key(s), Object.fromEntries(SONG_FELDER.filter((f) => s[f] !== undefined).map((f) => [f, s[f]])) as Werte]),
  );
  private readonly quellen = new Map(SONGINFO.filter((s) => s.quelle).map((s) => [key(s), s.quelle!]));
  protected readonly entwurf = signal<Record<string, Werte>>(ladeEntwurf());
  protected readonly suche = signal('');
  protected readonly meldung = signal('');

  // Lücken finden: nur Songs ohne Tonart oder Tempo, wahlweise die oft gespielten zuerst
  protected readonly nurLuecken = signal(false);
  protected readonly sortierung = signal<'repertoire' | 'haeufig'>('repertoire');
  /** in wie vielen Setlists auf diesem Gerät der Song steht */
  protected readonly haeufigkeit = computed(() => {
    const n = new Map<string, number>();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!;
        if (!k.startsWith(SETLIST_PREFIX)) continue;
        const liste = JSON.parse(localStorage.getItem(k) ?? '[]') as { title?: string; artist?: string }[];
        for (const s of new Set(liste.filter((e) => e.title).map((e) => key(e as { title: string; artist: string })))) n.set(s, (n.get(s) ?? 0) + 1);
      }
    } catch {
      // ohne Speicher keine Häufigkeit
    }
    return n;
  });

  protected readonly gefiltert = computed(() => {
    const q = norm(this.suche().trim());
    let liste = q ? this.songs.filter((s) => norm(`${s.title} ${s.artist}`).includes(q)) : this.songs;
    if (this.nurLuecken()) liste = liste.filter((s) => { const w = this.wert(s.key); return !w.tonart || !w.bpm; });
    if (this.sortierung() === 'haeufig') liste = [...liste].sort((a, b) => (this.haeufigkeit().get(b.key) ?? 0) - (this.haeufigkeit().get(a.key) ?? 0));
    return liste;
  });
  protected readonly geaendert = computed(() => Object.keys(this.entwurf()));
  protected readonly ausgefuellt = computed(() => this.songs.filter((s) => { const w = this.wert(s.key); return w.tonart || w.bpm || w.notiz; }).length);

  protected wert(k: string): Werte {
    return this.entwurf()[k] ?? this.gespeichert[k] ?? {};
  }

  // Noten (PDF/Akkordblatt) je Song – nur auf diesem Gerät, siehe data/noten.ts
  protected readonly notenOffen = signal<string | null>(null);
  protected readonly mitNoten = signal(new Set<string>());
  protected readonly notenDateien = signal<NotenDateiInfo[]>([]);
  constructor() {
    this.notenLaden();
  }
  protected notenLaden(): void {
    alleSongNoten().then((n) => this.mitNoten.set(new Set(Object.keys(n)))).catch(() => undefined);
    notenDateien().then((d) => this.notenDateien.set(d)).catch(() => undefined);
  }

  protected quelle(k: string): string | undefined {
    return this.quellen.get(k);
  }

  // Tap-Tempo: im Takt tippen, ab dem 4. Tippen wird das Tempo aus den letzten (bis zu 8) Abständen übernommen;
  // mehr als 2 Sekunden Pause oder ein anderer Song beginnt neu
  protected readonly tapKey = signal<string | null>(null);
  protected readonly tapZahl = signal(0);
  protected readonly tapBpm = signal<number | null>(null);
  private tapZeiten: number[] = [];

  protected tippen(k: string): void {
    const jetzt = performance.now();
    if (this.tapKey() !== k || jetzt - (this.tapZeiten.at(-1) ?? 0) > 2000) {
      this.tapKey.set(k);
      this.tapZeiten = [];
      this.tapBpm.set(null);
    }
    this.tapZeiten = [...this.tapZeiten, jetzt].slice(-9);
    this.tapZahl.set(this.tapZeiten.length);
    if (this.tapZeiten.length < 4) return;
    const schnitt = (this.tapZeiten.at(-1)! - this.tapZeiten[0]) / (this.tapZeiten.length - 1);
    const bpm = Math.round(60000 / schnitt);
    if (bpm < 40 || bpm > 240) return;
    this.tapBpm.set(bpm);
    this.setzen(k, 'bpm', String(bpm));
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
