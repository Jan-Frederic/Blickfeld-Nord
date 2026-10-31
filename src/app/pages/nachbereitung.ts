import { Component, computed, input, linkedSignal, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { isPause, loadSetlist } from '../data/setlist-data';
import { LISTEN, songAbgleich } from '../data/playlisten';
import { BEWERTUNG_PREFIX, Bewertungen, bewerten, ladeBewertungen, songKey } from '../data/bewertung';
import { ladeWackelt, wackeltSetzen } from '../data/wackelt';
import { Nachbereitung as Daten, ladeNachbereitung, nachbereitungSpeichern, punkteAusText } from '../data/nachbereitung';

// „Nachbereitung“ auf der Backstage-Seite eines vergangenen Auftritts – in einem Rutsch: Sterne je Song (wie im
// Bühnen-Modus), unsichere Songs auf die eigene „Wackelt noch“-Liste, was gut lief und was schiefging, und Merkpunkte,
// die bis zum Abhaken unter Backstage → Aufgaben stehen. „Was lief gut“ lässt sich in den Rückblick übernehmen.
@Component({
  selector: 'app-nachbereitung',
  imports: [MatIconModule],
  template: `
    <details class="nach" [open]="offen()" (toggle)="offen.set($any($event.target).open)">
      <summary><mat-icon>rate_review</mat-icon> Nachbereitung @if (zusammenfassung(); as z) { <small>{{ z }}</small> }</summary>

      @if (songs().length) {
        <p class="label">Wie liefen die Songs? <small>Sterne wie im Bühnen-Modus · ⚠ = wackelt noch (deine Übe-Liste)</small></p>
        <ul class="songs">
          @for (s of songs(); track s.key) {
            <li>
              <span class="t">{{ s.title }}</span>
              <span class="sterne" role="group" [attr.aria-label]="'Sterne für ' + s.title">
                @for (n of [1, 2, 3, 4, 5]; track n) {
                  <button type="button" [class.an]="n <= (sterne()[s.key] || 0)" [attr.aria-label]="n + ' Sterne für ' + s.title" (click)="bewerte(s.key, n)">
                    <mat-icon>{{ n <= (sterne()[s.key] || 0) ? 'star' : 'star_border' }}</mat-icon>
                  </button>
                }
              </span>
              <button type="button" class="wackelt" [class.an]="!!wackelt()[s.key]" [attr.aria-pressed]="!!wackelt()[s.key]" [attr.aria-label]="s.title + ' wackelt noch'" (click)="wackeltUmschalten(s.key)">
                <mat-icon>warning</mat-icon>
              </button>
            </li>
          }
        </ul>
        @if (nichtAufWebsite().length) {
          <p class="hint"><mat-icon class="spotify">public</mat-icon> Gespielt, aber nicht auf der offiziellen Playlist: {{ nichtAufWebsite().join(', ') }} –
            <a [href]="websiteUrl" target="_blank" rel="noopener">in Spotify öffnen und hinzufügen</a>, dann steht er auch im Repertoire auf der Website.</p>
        }
      } @else {
        <p class="hint">Auf diesem Gerät gibt es keine Setlist zu diesem Auftritt – Sterne und „wackelt noch“ dann im Bühnen-Modus bzw. unter Songs.</p>
      }

      <div class="felder">
        <label>Was lief gut?<textarea rows="3" [value]="daten().gut" (input)="setzen('gut', $any($event.target).value)" placeholder="z. B. Publikum hat bei Westerland mitgesungen"></textarea></label>
        <label>Was ging schief?<textarea rows="3" [value]="daten().schief" (input)="setzen('schief', $any($event.target).value)" placeholder="z. B. Monitor Gesang zu leise, Kabel Keys wackelig"></textarea></label>
      </div>

      <p class="label">Merkpunkte <small>erscheinen unter Backstage → Aufgaben, bis sie abgehakt sind</small></p>
      @if (daten().punkte.length) {
        <ul class="punkte">
          @for (p of daten().punkte; track $index; let i = $index) {
            <li [class.fertig]="p.erledigt">
              <label><input type="checkbox" [checked]="!!p.erledigt" (change)="abhaken(i)" /> {{ p.text }}</label>
              <button type="button" class="klein" (click)="entfernen(i)" [attr.aria-label]="'Merkpunkt entfernen: ' + p.text"><mat-icon>close</mat-icon></button>
            </li>
          }
        </ul>
      }
      <div class="neu">
        <textarea rows="2" aria-label="Neue Merkpunkte, eine Zeile je Punkt" placeholder="Neue Punkte – eine Zeile je Punkt" [value]="neu()" (input)="neu.set($any($event.target).value)"></textarea>
        <button type="button" (click)="hinzufuegen()" [disabled]="!neu().trim()"><mat-icon>add</mat-icon> Hinzufügen</button>
      </div>
    </details>
  `,
  styles: `
    .nach { margin-top: 24px; padding: 14px 18px; border: 1px solid var(--bn-line); border-radius: 12px; }
    summary { display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 600; }
    summary mat-icon { color: var(--bn-sunset); }
    summary small { font-weight: 400; color: var(--bn-fog); }
    .label { margin: 16px 0 6px; font-size: .85rem; color: var(--bn-fog); }
    small { font-size: .78rem; }
    ul { list-style: none; margin: 0; padding: 0; }
    .songs li { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; padding: 4px 0; border-bottom: 1px solid var(--bn-line); }
    .t { flex: 1; min-width: 10em; overflow-wrap: anywhere; }
    .sterne { display: inline-flex; }
    button { display: inline-flex; align-items: center; justify-content: center; gap: 4px; min-height: 36px; min-width: 36px; padding: 0 10px; border: 1px solid var(--bn-line); border-radius: 999px; background: none; color: var(--bn-ink); font: inherit; font-size: .85rem; cursor: pointer; }
    button:disabled { opacity: .4; cursor: default; }
    .sterne button, .wackelt, .klein { border: 0; padding: 0; color: #555; }
    .sterne button.an { color: #e8a46a; }
    .wackelt.an { color: #e0b25a; }
    mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .felder { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin-top: 16px; }
    label { display: grid; gap: 4px; font-size: .85rem; color: var(--bn-fog); }
    textarea { padding: 8px 10px; border: 1px solid var(--bn-line); border-radius: 8px; background: #1b1e22; color: var(--bn-ink); font: inherit; resize: vertical; box-sizing: border-box; width: 100%; }
    .punkte li { display: flex; align-items: center; gap: 8px; }
    .punkte label { display: flex; flex: 1; align-items: center; gap: 8px; color: var(--bn-ink); font-size: .9rem; }
    .punkte input { accent-color: var(--bn-sunset); }
    .fertig label { text-decoration: line-through; color: var(--bn-fog); }
    .neu { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; margin-top: 8px; }
    .neu textarea { flex: 1; min-width: 200px; width: auto; }
    .hint { font-size: .85rem; color: var(--bn-fog); }
  `,
})
export class Nachbereitung {
  /** Auftritts-ID */
  readonly id = input.required<string>();
  protected readonly offen = signal(false);
  protected readonly songs = computed(() =>
    loadSetlist(this.id())
      .filter((e) => !isPause(e))
      .map((e) => ({ ...(e as { title: string; artist: string }), key: songKey(e as { title: string; artist: string }) })),
  );
  // gespielte Songs, die (noch) nicht auf der offiziellen Spotify-Playlist stehen – Kandidaten für die Website
  protected readonly websiteUrl = LISTEN[0].url;
  private readonly website = new Set(songAbgleich(LISTEN).filter((s) => s.listen.includes('website')).map((s) => s.key));
  protected readonly nichtAufWebsite = computed(() => this.songs().filter((s) => !this.website.has(s.key)).map((s) => s.title));
  protected readonly sterne = linkedSignal<Bewertungen>(() => ladeBewertungen(this.id()));
  protected readonly wackelt = signal(ladeWackelt());
  protected readonly daten = linkedSignal<Daten>(() => ladeNachbereitung(this.id()));
  protected readonly neu = signal('');

  protected readonly zusammenfassung = computed(() => {
    const offen = this.daten().punkte.filter((p) => !p.erledigt).length;
    const bewertet = this.songs().filter((s) => this.sterne()[s.key]).length;
    return [
      this.songs().length && `${bewertet} von ${this.songs().length} Songs bewertet`,
      offen && `${offen} ${offen === 1 ? 'offener Punkt' : 'offene Punkte'}`,
    ].filter(Boolean).join(' · ');
  });

  protected bewerte(key: string, n: number): void {
    this.sterne.update((b) => bewerten(b, key, n));
    try {
      localStorage.setItem(BEWERTUNG_PREFIX + this.id(), JSON.stringify(this.sterne()));
    } catch {
      // ohne Speicher gilt die Bewertung bis zum Neuladen
    }
  }

  protected wackeltUmschalten(key: string): void {
    this.wackelt.set(wackeltSetzen(key, !this.wackelt()[key]));
  }

  protected setzen(feld: 'gut' | 'schief', wert: string): void {
    this.aendern((d) => ({ ...d, [feld]: wert }));
  }

  protected hinzufuegen(): void {
    const neu = punkteAusText(this.neu()).map((text) => ({ text: text.slice(0, 200) }));
    if (!neu.length) return;
    this.aendern((d) => ({ ...d, punkte: [...d.punkte, ...neu] }));
    this.neu.set('');
  }

  protected abhaken(i: number): void {
    this.aendern((d) => ({ ...d, punkte: d.punkte.map((p, j) => (j === i ? { ...p, erledigt: !p.erledigt || undefined } : p)) }));
  }

  protected entfernen(i: number): void {
    this.aendern((d) => ({ ...d, punkte: d.punkte.filter((_, j) => j !== i) }));
  }

  private aendern(fn: (d: Daten) => Daten): void {
    this.daten.update(fn);
    nachbereitungSpeichern(this.id(), this.daten());
  }
}
