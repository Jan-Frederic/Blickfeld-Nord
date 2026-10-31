import { Component, computed, inject, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import data from '../data/repertoire.json';
import { BandService } from '../data/band.service';
import { alleBewertungen, rangliste, songKey } from '../data/bewertung';
import { Entry, SETLIST_PREFIX, isPause } from '../data/setlist-data';
import { ProbeTipp, probeTipps } from '../data/probe-vorschlag';
import { ladeWackelt } from '../data/wackelt';
import { LISTEN, songAbgleich } from '../data/playlisten';
import { alleSongNoten } from '../data/noten';
import { SONGINFO, SONGINFO_ENTWURF_KEY } from '../data/songinfo';
import { probenAusSpeicher, probenStand } from '../data/song-stand';

// Vorschläge für die Probe aus Sternen und Setlists dieses Geräts (Logik: data/probe-vorschlag.ts)
@Component({
  selector: 'app-probe-vorschlag',
  imports: [MatIconModule],
  template: `
    @if (tipps().length) {
      <div class="tipps">
        <p class="label"><mat-icon>lightbulb</mat-icon> Vorschläge – antippen zum Übernehmen</p>
        <ul>
          @for (t of tipps(); track t.title + t.artist) {
            <li><button type="button" (click)="add.emit(t)"><mat-icon>add</mat-icon> {{ t.title }} <small>{{ t.grund }}</small></button></li>
          }
        </ul>
      </div>
    }
  `,
  styles: `
    .tipps { margin: 0 0 12px; }
    .label { display: flex; align-items: center; gap: 6px; margin: 0 0 8px; font-size: .8rem; color: var(--bn-fog); }
    mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--bn-sunset); }
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
    button { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; font-size: .88rem; cursor: pointer; }
    button:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    small { color: var(--bn-fog); font-size: .76rem; }
  `,
})
export class ProbeVorschlag {
  /** Songs, die schon auf dem Probenplan stehen */
  readonly drin = input.required<{ title: string; artist: string }[]>();
  readonly add = output<ProbeTipp>();
  private readonly band = inject(BandService);
  /** Wunschlisten-Songs mit Noten und Tonart/Tempo, die noch nie geprobt wurden (Noten asynchron aus IndexedDB) */
  private readonly bereit = signal<{ title: string; artist: string }[]>([]);
  protected readonly tipps = computed(() => {
    const drin = new Set(this.drin().map(songKey));
    return this.berechnen(this.bereit()).filter((t) => !drin.has(songKey(t)));
  });

  constructor() {
    alleSongNoten()
      .then((noten) => {
        let entwurf: Record<string, { tonart?: string; spielTonart?: string; bpm?: number }> = {};
        try {
          entwurf = JSON.parse(localStorage.getItem(SONGINFO_ENTWURF_KEY) ?? '{}');
        } catch {
          // ohne Entwurf
        }
        const info = new Map(SONGINFO.map((s) => [`${s.title}|${s.artist}`, s]));
        const geprobt = probenStand(probenAusSpeicher(), new Date().toISOString().slice(0, 10));
        this.bereit.set(
          songAbgleich(LISTEN).filter((s) => {
            const w = entwurf[s.key] ?? info.get(s.key);
            const n = noten[s.key];
            return s.listen.includes('wunschliste') && (n?.pdfs?.length || n?.chordpro) && (w?.tonart || w?.spielTonart) && w?.bpm && !geprobt.has(s.key);
          }),
        );
      })
      .catch(() => undefined);
  }

  private berechnen(bereit: { title: string; artist: string }[]): ProbeTipp[] {
    const sterne = new Map(rangliste(alleBewertungen(), Infinity).map((p) => [songKey(p), p.schnitt]));
    const zuletzt = new Map<string, string>();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        const show = k?.startsWith(SETLIST_PREFIX) ? this.band.showById(k.slice(SETLIST_PREFIX.length)) : undefined;
        if (!show) continue;
        for (const e of JSON.parse(localStorage.getItem(k!) ?? '[]') as Entry[]) {
          if (!isPause(e) && (zuletzt.get(songKey(e)) ?? '') < show.date) zuletzt.set(songKey(e), show.date);
        }
      }
    } catch {
      // ohne Speicher nur nach Sternen
    }
    return probeTipps(data.tracks, sterne, zuletzt, new Date().toISOString().slice(0, 10), 4, new Set(Object.keys(ladeWackelt())), bereit);
  }
}
