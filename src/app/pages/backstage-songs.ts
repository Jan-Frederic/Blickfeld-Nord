import { Component, computed, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import data from '../data/repertoire.json';
import { SONGINFO, SONGINFO_ENTWURF_KEY, SongInfo } from '../data/songinfo';
import { patchSongInfo } from '../data/songinfo-patch';

// Backstage → Songs: Tonart, Tempo und Notiz je Song eintragen, ohne songinfo.ts von Hand zu bearbeiten.
// Der Entwurf bleibt auf dem Gerät (bn-songinfo-entwurf), bis die fertige Datei auf GitHub eingefügt ist.
const ENTWURF_KEY = SONGINFO_ENTWURF_KEY;
const RAW_URL = 'https://raw.githubusercontent.com/Jan-Frederic/Blickfeld-Nord/main/src/app/data/songinfo.ts';
const EDIT_URL = 'https://github.com/Jan-Frederic/Blickfeld-Nord/edit/main/src/app/data/songinfo.ts';
const TONARTEN = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'H'];

type Werte = Pick<SongInfo, 'tonart' | 'bpm' | 'notiz'>;
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
  imports: [MatIconModule],
  template: `
    <section class="section">
      <p class="kicker">Backstage</p>
      <h2>Songs</h2>
      <p class="lead">
        Tonart, Tempo und eine kurze Notiz je Song – erscheinen in Setlist, Bühnen-Modus und Laufzettel.
        Angaben bisher bei {{ ausgefuellt() }} von {{ songs.length }} Songs. Auf diesem Gerät gelten Änderungen sofort;
        auf die Handys der anderen kommen sie über „Abgleich“ oder für alle dauerhaft über „Datei für GitHub erzeugen“ (unten).
      </p>

      <label class="search">
        <mat-icon>search</mat-icon>
        <input type="search" placeholder="Song oder Interpret suchen …" [value]="suche()" (input)="suche.set($any($event.target).value)" aria-label="Songs durchsuchen" />
      </label>

      <ul class="list">
        @for (s of gefiltert(); track s.key) {
          <li [class.changed]="geaendert().includes(s.key)">
            <span class="song"><strong>{{ s.title }}</strong><span class="a">{{ s.artist }}</span></span>
            <label>Tonart
              <select (change)="setzen(s.key, 'tonart', $any($event.target).value)">
                <option value="" [selected]="!wert(s.key).tonart">–</option>
                @for (t of tonarten; track t) { <option [value]="t" [selected]="wert(s.key).tonart === t">{{ t }}</option> }
              </select>
            </label>
            <label>bpm
              <input type="number" min="40" max="240" inputmode="numeric" [value]="wert(s.key).bpm ?? ''" (change)="setzen(s.key, 'bpm', $any($event.target).value)" />
            </label>
            <label class="notiz">Notiz
              <input maxlength="40" placeholder="z. B. Capo 2" [value]="wert(s.key).notiz ?? ''" (change)="setzen(s.key, 'notiz', $any($event.target).value)" />
            </label>
          </li>
        } @empty {
          <li class="empty">Kein Song gefunden.</li>
        }
      </ul>

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
          <p>Noch nichts geändert. Tonart als Grundton (Moll mit „m“), Tempo in Schlägen pro Minute.</p>
        }
      </div>
    </section>
  `,
  styles: `
    .search { display: flex; align-items: center; gap: 8px; padding: 0 12px; margin-bottom: 16px; border: 1px solid var(--bn-line); border-radius: 10px; }
    .search mat-icon { color: var(--bn-fog); }
    .search input { flex: 1; padding: 10px 0; border: 0; background: none; color: var(--bn-ink); font: inherit; }
    .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
    .list li {
      display: grid; grid-template-columns: 1fr 90px 90px 160px; gap: 10px; align-items: end;
      padding: 10px 14px; border: 1px solid var(--bn-line); border-radius: 10px;
    }
    .list li.changed { border-color: var(--bn-sunset); }
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
  protected readonly songs = data.tracks.map((t) => ({ title: t.title, artist: t.artist, key: key(t) }));
  private readonly gespeichert: Record<string, Werte> = Object.fromEntries(SONGINFO.map((s) => [key(s), { tonart: s.tonart, bpm: s.bpm, notiz: s.notiz }]));
  protected readonly entwurf = signal<Record<string, Werte>>(ladeEntwurf());
  protected readonly suche = signal('');
  protected readonly meldung = signal('');

  protected readonly gefiltert = computed(() => {
    const q = norm(this.suche().trim());
    return q ? this.songs.filter((s) => norm(`${s.title} ${s.artist}`).includes(q)) : this.songs;
  });
  protected readonly geaendert = computed(() => Object.keys(this.entwurf()));
  protected readonly ausgefuellt = computed(() => this.songs.filter((s) => { const w = this.wert(s.key); return w.tonart || w.bpm || w.notiz; }).length);

  protected wert(k: string): Werte {
    return this.entwurf()[k] ?? this.gespeichert[k] ?? {};
  }

  protected setzen(k: string, feld: keyof Werte, roh: string): void {
    const neu: Werte = { ...this.wert(k) };
    if (feld === 'bpm') neu.bpm = Number(roh) >= 40 && Number(roh) <= 240 ? Math.round(Number(roh)) : undefined;
    else neu[feld] = roh.trim() || undefined;
    const alt = this.gespeichert[k] ?? {};
    const gleich = (['tonart', 'bpm', 'notiz'] as const).every((f) => (alt[f] ?? undefined) === (neu[f] ?? undefined));
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
    const liste: SongInfo[] = this.songs.map((s) => ({ title: s.title, artist: s.artist, ...this.wert(s.key) }));
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
