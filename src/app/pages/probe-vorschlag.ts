import { Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import data from '../data/repertoire.json';
import { BandService } from '../data/band.service';
import { alleBewertungen, rangliste, songKey } from '../data/bewertung';
import { Entry, SETLIST_PREFIX, isPause } from '../data/setlist-data';
import { ProbeTipp, probeTipps } from '../data/probe-vorschlag';
import { ladeWackelt } from '../data/wackelt';

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
  private readonly alle = this.berechnen();
  protected readonly tipps = computed(() => {
    const drin = new Set(this.drin().map(songKey));
    return this.alle.filter((t) => !drin.has(songKey(t)));
  });

  private berechnen(): ProbeTipp[] {
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
    return probeTipps(data.tracks, sterne, zuletzt, new Date().toISOString().slice(0, 10), 4, new Set(Object.keys(ladeWackelt())));
  }
}
