import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Show } from '../data/band.service';
import { kampagnenLink } from '../data/goatcounter';
import { IG_FORMATE, IgFormat, bereit, imLeerlauf, vorbereiten } from '../data/instagram';
import { storyKopf } from '../data/werbeplan';
import { postText, renderHighlight, renderPoster, renderReel, renderStory, shareImage } from '../data/poster';

// Backstage eines kommenden, öffentlichen Auftritts: die Instagram-Formate auseinandergehalten – Beitrag (Feed),
// Story, Reel und Highlight-Cover, je mit Maßen, was in die Zwischenablage kommt und einem Tipp. Bilder werden im
// Hintergrund vorbereitet (data/instagram.ts), damit das Teilen-Menü direkt beim Tippen aufgeht; das Reel wird auf
// Wunsch aufgenommen (8 s) und dann mit einem zweiten Tipp geteilt.
type Stand = 'frei' | 'laeuft' | 'bereit';
const HIGHLIGHTS = ['LIVE', 'TERMINE', 'BACKSTAGE', String(new Date().getFullYear())];

@Component({
  selector: 'app-instagram-formate',
  imports: [MatIconModule],
  template: `
    <section class="ig" aria-labelledby="ig-titel">
      <h3 id="ig-titel"><mat-icon>photo_camera</mat-icon> Instagram</h3>
      <ul>
        @for (f of formate; track f.format) {
          <li>
            <div class="kopf">
              <strong>{{ f.titel }}</strong>
              @if (f.format === 'highlight') {
                <select aria-label="Beschriftung des Highlight-Covers" (change)="highlight.set($any($event.target).value)">
                  @for (h of highlights; track h) { <option [value]="h" [selected]="h === highlight()">{{ h }}</option> }
                  <option value="">ohne Text</option>
                </select>
              }
              <button type="button" class="teilen" [class.bereit]="stand()[f.format] === 'bereit'" (click)="teilen(f.format)" [disabled]="stand()[f.format] === 'laeuft'"
                [attr.aria-label]="(stand()[f.format] === 'bereit' ? 'Jetzt teilen: ' : f.format === 'reel' && !reelFertig() ? 'Reel aufnehmen: ' : 'Teilen: ') + f.titel">
                <mat-icon>{{ stand()[f.format] === 'laeuft' ? 'hourglass_top' : stand()[f.format] === 'bereit' ? 'ios_share' : f.format === 'reel' && !reelFertig() ? 'videocam' : 'share' }}</mat-icon>
                {{ stand()[f.format] === 'laeuft' ? (f.format === 'reel' ? 'Aufnahme ' + reelProzent() + ' %' : 'wird vorbereitet …') : stand()[f.format] === 'bereit' ? 'Jetzt teilen' : f.format === 'reel' && !reelFertig() ? 'Reel aufnehmen' : 'Teilen' }}
              </button>
            </div>
            <p class="masse">{{ f.masse }}</p>
            @if (f.text !== '–') { <p><mat-icon class="klein">content_paste</mat-icon> {{ f.text }}</p> }
            <p class="tipp">{{ f.tipp }}</p>
          </li>
        }
      </ul>
      @if (meldung(); as m) { <p class="meldung" role="status">{{ m }}</p> }
    </section>
  `,
})
export class InstagramFormate {
  readonly show = input.required<Show>();
  readonly id = input.required<string>();
  protected readonly formate = Object.values(IG_FORMATE);
  protected readonly highlights = HIGHLIGHTS;
  protected readonly highlight = signal('LIVE');
  protected readonly stand = signal<Record<IgFormat, Stand>>({ beitrag: 'frei', story: 'frei', reel: 'frei', highlight: 'frei' });
  protected readonly meldung = signal('');
  protected readonly reelProzent = signal(0);
  protected readonly reelFertig = computed(() => (this.stand(), !!bereit(this.schluessel('reel'))));
  private readonly heute = new Date().toLocaleDateString('sv-SE');
  private weg = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.weg = true));
    // Bilder im Hintergrund vorbereiten (nacheinander, damit die Seite flüssig bleibt) – das Reel nur auf Wunsch
    imLeerlauf(async () => {
      for (const f of ['story', 'beitrag', 'highlight'] as IgFormat[]) {
        if (this.weg) return;
        await this.vorrat(f).catch(() => undefined);
      }
    });
  }

  private schluessel(f: IgFormat): string {
    const s = this.show();
    return f === 'highlight' ? `highlight|${this.highlight()}` : `${f}|${this.id()}|${storyKopf(s.date, this.heute)}|${s.time ?? ''}|${s.venue}`;
  }

  private vorrat(f: IgFormat): Promise<Blob> {
    const s = this.show();
    return vorbereiten(this.schluessel(f), () => {
      if (f === 'beitrag') return renderPoster(s, 'feed', kampagnenLink(this.id(), 'plakat'));
      if (f === 'story') return renderStory(s, storyKopf(s.date, this.heute));
      if (f === 'highlight') return renderHighlight(this.highlight());
      return renderReel(s, storyKopf(s.date, this.heute), (a) => this.reelProzent.set(Math.round(a * 100)));
    });
  }

  /** Zwischenablage: Story nur den Link (Link-Sticker), Beitrag und Reel die Bildunterschrift, Highlight nichts */
  private zwischenablage(f: IgFormat): string | undefined {
    const s = this.show();
    if (f === 'story') return kampagnenLink(this.id(), 'story');
    if (f === 'highlight') return undefined;
    return postText(s, kampagnenLink(this.id(), f === 'reel' ? 'reel' : 'text'));
  }

  private setze(f: IgFormat, st: Stand): void {
    this.stand.update((x) => ({ ...x, [f]: st }));
  }

  protected async teilen(f: IgFormat): Promise<void> {
    const text = this.zwischenablage(f);
    const kopiert = text ? await navigator.clipboard.writeText(text).then(() => true, () => false) : false;
    const fertigesBild = bereit(this.schluessel(f));
    if (!fertigesBild) {
      // noch nicht fertig: vorbereiten, dann „Jetzt teilen“ (zweiter Tipp – sonst ließe der Browser das Teilen nicht zu)
      this.setze(f, 'laeuft');
      this.meldung.set(f === 'reel' ? 'Reel wird aufgenommen – die Seite bitte offen lassen (8 Sekunden) …' : '');
      try {
        await this.vorrat(f);
        this.setze(f, 'bereit');
        this.meldung.set(`${IG_FORMATE[f].titel} ist fertig – jetzt auf „Jetzt teilen“ tippen.`);
      } catch (e) {
        this.setze(f, 'frei');
        this.meldung.set((e as Error).message || 'Das hat nicht geklappt.');
      }
      return;
    }
    const s = this.show();
    const endung = fertigesBild.type.startsWith('video') ? 'mp4' : 'png';
    const name = `blickfeld-nord-${f}-${this.id()}.${endung}`;
    const r = await shareImage(fertigesBild, name, `Blickfeld Nord live – ${s.venue}`);
    this.setze(f, 'frei');
    if (r === 'abgebrochen') return this.meldung.set('');
    const ablage = kopiert ? (f === 'story' ? ' – der Link liegt in der Zwischenablage (als Link-Sticker einfügen)' : ' – die Bildunterschrift liegt in der Zwischenablage') : '';
    this.meldung.set(`${IG_FORMATE[f].titel} ${r === 'geteilt' ? 'geteilt' : 'gespeichert'} ✓${ablage}`);
  }
}
