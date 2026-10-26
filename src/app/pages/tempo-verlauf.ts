import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Song } from '../data/setlist-data';
import { songInfo } from '../data/songinfo';
import { LANGSAM_BPM, langsameStrecken } from '../data/tempo-verlauf';

// Setlist: Tempo-Verlauf je Set als kleine Kurve (BPM aus Backstage → Songs) und Hinweis, wenn drei oder mehr
// langsame Songs direkt aufeinander folgen. Erscheint erst, wenn für mindestens drei Songs ein Tempo eingetragen ist.
const B = 300; // Breite der Kurve (viewBox)
const H = 60;

@Component({
  selector: 'app-tempo-verlauf',
  imports: [MatIconModule],
  template: `
    @if (sichtbar()) {
      <section class="tempo" aria-labelledby="tempo-titel">
        <h4 id="tempo-titel"><mat-icon>speed</mat-icon> Tempo-Verlauf</h4>
        @for (s of kurven(); track $index) {
          <div class="set">
            <span class="name">Set {{ $index + 1 }}</span>
            <svg [attr.viewBox]="'0 0 ' + B + ' ' + H" preserveAspectRatio="none" role="img" [attr.aria-label]="s.beschreibung">
              <line x1="0" [attr.y1]="s.grenzeY" [attr.x2]="B" [attr.y2]="s.grenzeY" class="grenze" />
              <polyline [attr.points]="s.punkte" />
              <!-- Punkte als runde Linienenden: bleiben rund, auch wenn die Kurve in die Breite gezogen wird -->
              @for (p of s.marken; track $index) { <line class="punkt" [attr.x1]="p.x" [attr.y1]="p.y" [attr.x2]="p.x" [attr.y2]="p.y" [class.langsam]="p.langsam" /> }
            </svg>
            <span class="spanne">{{ s.spanne }}</span>
          </div>
          @for (h of s.hinweise; track $index) { <p class="hinweis"><mat-icon>trending_down</mat-icon> {{ h }}</p> }
        }
        <p class="foot">Gestrichelt: {{ LANGSAM }} bpm – darunter gilt ein Song als langsam. Songs ohne Tempo fehlen in der Kurve.</p>
      </section>
    }
  `,
  styles: `
    .tempo { margin-top: 20px; padding: 14px 16px; border: 1px solid var(--bn-line); border-radius: 10px; }
    h4 { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; font-size: .9rem; font-weight: 500; }
    h4 mat-icon { color: var(--bn-sunset); font-size: 20px; width: 20px; height: 20px; }
    .set { display: grid; grid-template-columns: 3.5em 1fr auto; align-items: center; gap: 10px; margin-bottom: 6px; font-size: .8rem; color: var(--bn-fog); }
    svg { width: 100%; height: 44px; overflow: visible; }
    polyline { fill: none; stroke: var(--bn-sunset); stroke-width: 2; vector-effect: non-scaling-stroke; }
    .punkt { stroke: var(--bn-sunset); stroke-width: 7; stroke-linecap: round; vector-effect: non-scaling-stroke; }
    .punkt.langsam { stroke: #7fb3e0; }
    .grenze { stroke: var(--bn-line); stroke-dasharray: 4 4; vector-effect: non-scaling-stroke; }
    .spanne { font-variant-numeric: tabular-nums; }
    .hinweis { display: flex; align-items: center; gap: 6px; margin: 0 0 8px; font-size: .82rem; color: #e0b25a; }
    .hinweis mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .foot { margin: 8px 0 0; font-size: .75rem; color: var(--bn-fog); }
  `,
})
export class TempoVerlauf {
  readonly sets = input.required<Song[][]>();
  protected readonly B = B;
  protected readonly H = H;
  protected readonly LANGSAM = LANGSAM_BPM;

  private readonly tempi = computed(() => this.sets().map((set) => set.map((s) => songInfo(s.title, s.artist)?.bpm)));
  protected readonly sichtbar = computed(() => this.tempi().flat().filter((b) => b !== undefined).length >= 3);

  protected readonly kurven = computed(() => {
    const alle = this.tempi().flat().filter((b): b is number => b !== undefined);
    const lo = Math.min(...alle, LANGSAM_BPM) - 10;
    const hi = Math.max(...alle, LANGSAM_BPM) + 10;
    const y = (b: number) => H - ((b - lo) / (hi - lo)) * H;
    // Nummerierung über alle Sets wie in der Setlist
    let nr = 0;
    return this.tempi().map((bpm, si) => {
      const start = nr;
      nr += bpm.length;
      const x = (i: number) => (bpm.length > 1 ? (i / (bpm.length - 1)) * B : B / 2);
      const marken = bpm.flatMap((b, i) => (b === undefined ? [] : [{ x: x(i), y: y(b), langsam: b < LANGSAM_BPM }]));
      const mit = bpm.filter((b): b is number => b !== undefined);
      const hinweise = langsameStrecken(bpm).map(
        (s) => `Songs ${start + s.von + 1}–${start + s.bis + 1}: ${s.bis - s.von + 1} langsame Songs in Folge – vielleicht einen schnellen dazwischen?`,
      );
      return {
        punkte: marken.map((p) => `${p.x},${p.y}`).join(' '),
        marken,
        grenzeY: y(LANGSAM_BPM),
        spanne: mit.length ? `${Math.min(...mit)}–${Math.max(...mit)} bpm` : 'kein Tempo',
        beschreibung: `Set ${si + 1}: Tempo ${mit.join(', ') || 'unbekannt'} bpm`,
        hinweise,
      };
    });
  });
}
