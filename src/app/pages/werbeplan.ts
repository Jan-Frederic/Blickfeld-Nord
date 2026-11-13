import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { datenStand } from '../data/neu-zeichnen';
import { MatIconModule } from '@angular/material/icon';
import { BandService, Show } from '../data/band.service';
import { kampagnenLink } from '../data/goatcounter';
import { bereit, imLeerlauf, vorbereiten } from '../data/instagram';
import { BILD_SCHRITTE, erledigteSchritte, schrittText, setzeSchritt, storyKopf, werbeplan } from '../data/werbeplan';

// Backstage eines öffentlichen Auftritts: Werbeplan mit festen Terminen (4 Wochen vorher bis eine Woche danach).
// Je Schritt ein fertiger Text zum Kopieren (Link mit Herkunft „text“ und Kampagne) und ein Haken – der fällige,
// noch nicht abgehakte Schritt erscheint zusätzlich unter Aufgaben. Schritte mit Bild haben „Story teilen“ bzw.
// „Plakat teilen“: passendes Bild zeichnen (Story mit Countdown-Kopf, Danke-Story), Text samt Link in die Zwischenablage,
// Teilen-Menü öffnen (Instagram-Story, WhatsApp-Status …; am Rechner Download) und den Schritt abhaken. Direkt posten
// kann eine Website nicht – Instagram erlaubt das nur über eine geprüfte App mit geheimem Schlüssel auf einem Server.
@Component({
  selector: 'app-werbeplan',
  imports: [MatIconModule],
  template: `
    <section class="plan" aria-labelledby="werbeplan-titel">
      <h3 id="werbeplan-titel"><mat-icon>campaign</mat-icon> Werbeplan</h3>
      <ol>
        @for (x of schritte(); track x.schritt.id) {
          <li [class]="x.status" [class.erledigt]="erledigt().includes(x.schritt.id)" [attr.aria-current]="x.status === 'jetzt' ? 'step' : null">
            <input type="checkbox" [id]="'wp-' + x.schritt.id" [checked]="erledigt().includes(x.schritt.id)" (change)="haken(x.schritt.id, $any($event.target).checked)" />
            <label class="datum" [for]="'wp-' + x.schritt.id">{{ datum(x.datum) }}</label>
            <span class="was"><strong>{{ x.schritt.titel }}</strong> {{ x.schritt.text }}</span>
            <span class="knoepfe">
              @if (bild[x.schritt.id]; as art) {
                <button type="button" class="kopieren teilen" [class.bereit]="bereitFuer() === x.schritt.id" (click)="teilen(x.schritt.id)" [disabled]="laeuft()" [attr.aria-label]="(bereitFuer() === x.schritt.id ? 'Jetzt teilen: ' : '') + (art === 'feed' ? 'Beitrag' : art === 'danke' ? 'Danke-Story' : 'Story') + ' für „' + x.schritt.titel + '“ teilen'" [attr.title]="art === 'feed' ? 'Plakat teilen' : 'Story teilen'">
                  <mat-icon>{{ geteilt() === x.schritt.id ? 'check' : bereitFuer() === x.schritt.id ? 'ios_share' : art === 'feed' ? 'image' : 'smartphone' }}</mat-icon>
                </button>
              }
              <button type="button" class="kopieren" (click)="kopieren(x.schritt.id)" [attr.aria-label]="'Text für „' + x.schritt.titel + '“ kopieren'">
                <mat-icon>{{ kopiert() === x.schritt.id ? 'check' : 'content_copy' }}</mat-icon>
              </button>
            </span>
          </li>
        }
      </ol>
      @if (meldung(); as m) { <p class="meldung" role="status">{{ m }}</p> }
      <p class="foot">📱 teilt die Story, 🖼 den Beitrag – danach ist der Schritt abgehakt.</p>
    </section>
  `,
  styles: `
    .plan { margin: 24px 0; padding: 16px 18px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 1rem; }
    h3 mat-icon { color: var(--bn-sunset); }
    ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    li { display: grid; grid-template-columns: auto 6.5em 1fr auto; align-items: start; gap: 10px; padding: 8px 10px; border-radius: 8px; font-size: .88rem; }
    input { margin: 3px 0 0; accent-color: var(--bn-sunset); }
    .datum { font-variant-numeric: tabular-nums; color: var(--bn-fog); cursor: pointer; }
    .was strong { display: block; font-weight: 500; color: var(--bn-ink); }
    .was { color: var(--bn-fog); }
    .jetzt { background: rgba(232, 164, 106, .12); outline: 1px solid var(--bn-sunset); }
    .jetzt strong, .jetzt .datum { color: var(--bn-sunset); }
    .vorbei, .erledigt { opacity: .55; }
    .erledigt strong { text-decoration: line-through; }
    .kopieren { display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid var(--bn-line); border-radius: 50%; background: none; color: var(--bn-ink); cursor: pointer; }
    .kopieren:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .kopieren mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .knoepfe { display: flex; gap: 6px; }
    .teilen { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .teilen.bereit { background: var(--bn-sunset); color: #2a1708; }
    .kopieren:disabled { opacity: .4; cursor: default; }
    .meldung { margin: 10px 0 0; font-size: .82rem; color: #5fb88a; }
    @media (max-width: 520px) {
      li { grid-template-columns: auto 1fr auto; row-gap: 2px; }
      .was { grid-column: 2; grid-row: 2; }
      .knoepfe { grid-column: 3; grid-row: 1 / 3; flex-direction: column; }
    }
    .foot { margin: 12px 0 0; font-size: .78rem; color: var(--bn-fog); }
  `,
})
export class Werbeplan {
  readonly show = input.required<Show>();
  /** Auftritts-ID (Datum, ggf. mit laufender Nummer) */
  readonly id = input.required<string>();
  protected readonly schritte = computed(() => werbeplan(this.show().date, new Date().toISOString().slice(0, 10), this.show().endDate));
  protected readonly erledigt = linkedSignal(() => (datenStand(), erledigteSchritte(this.id())));
  protected readonly kopiert = signal<string | null>(null);
  protected readonly geteilt = signal<string | null>(null);
  protected readonly laeuft = signal(false);
  protected readonly meldung = signal('');
  protected readonly bild = BILD_SCHRITTE;
  private readonly band = inject(BandService);

  /** Schritt, dessen Bild nach dem Vorbereiten auf den zweiten Tipp („Jetzt teilen“) wartet */
  protected readonly bereitFuer = signal<string | null>(null);
  private readonly heute = new Date().toLocaleDateString('sv-SE');

  constructor() {
    // Bilder der nächsten offenen Schritte im Hintergrund vorbereiten – dann geht das Teilen-Menü direkt beim Tippen auf
    imLeerlauf(() => {
      const offen = this.schritte()
        .filter((x) => BILD_SCHRITTE[x.schritt.id] && x.status !== 'vorbei' && !this.erledigt().includes(x.schritt.id))
        .slice(0, 2);
      // ein „jetzt“ fälliger Schritt kann auch schon „vorbei“ markiert sein, wenn sein Tag heute ist – der zählt mit
      const jetzt = this.schritte().find((x) => x.status === 'jetzt' && BILD_SCHRITTE[x.schritt.id] && !this.erledigt().includes(x.schritt.id));
      for (const x of [...(jetzt ? [jetzt] : []), ...offen]) void this.vorrat(x.schritt.id).catch(() => undefined);
    });
  }

  /** Herkunft je Bild: plakat, story-1, story-woche, story-morgen, story-heute, story-danke */
  private link(schritt: string): string {
    return kampagnenLink(this.id(), BILD_SCHRITTE[schritt] === 'feed' ? 'plakat' : schritt.startsWith('story') ? schritt : `story-${schritt}`);
  }

  private schluessel(schritt: string): string {
    const s = this.show();
    const art = BILD_SCHRITTE[schritt];
    return art === 'feed' ? `beitrag|${this.id()}|${s.time ?? ''}|${s.venue}` : `werbeplan-${schritt}|${this.id()}|${storyKopf(s.date, this.heute)}|${s.time ?? ''}|${s.venue}`;
  }

  private async vorrat(schritt: string): Promise<Blob> {
    const s = this.show();
    const art = BILD_SCHRITTE[schritt];
    const poster = await import('../data/poster');
    return vorbereiten(this.schluessel(schritt), () => {
      if (art === 'feed') return poster.renderPoster(s, 'feed', kampagnenLink(this.id(), 'plakat'));
      if (art === 'danke') {
        const h = this.band.history.find((x) => x.date === s.date && !x.example);
        return poster.renderDanke(s, this.band.publicVenue(s), h?.highlight, h?.images?.[0]?.src);
      }
      return poster.renderStory(s, storyKopf(s.date, this.heute));
    });
  }

  /**
   * Teilen: Zwischenablage (Beitrag: Bildunterschrift, Story: nur der Link für den Link-Sticker), Bild aus dem Vorrat
   * sofort teilen – ist es noch nicht fertig, erst vorbereiten und auf „Jetzt teilen“ warten (der Browser lässt das
   * Teilen nur direkt nach einem Tipp zu). Danach abhaken.
   */
  protected async teilen(schritt: string): Promise<void> {
    const s = this.show();
    const art = BILD_SCHRITTE[schritt];
    const text = art === 'feed' ? schrittText(schritt, s, this.link(schritt)) : this.link(schritt);
    const kopiert = await navigator.clipboard.writeText(text).then(() => true, () => false);
    const blob = bereit(this.schluessel(schritt));
    if (!blob) {
      this.laeuft.set(true);
      this.meldung.set('Bild wird vorbereitet …');
      try {
        await this.vorrat(schritt);
        this.bereitFuer.set(schritt);
        this.meldung.set('Fertig – jetzt auf „Jetzt teilen“ tippen.');
      } catch {
        this.meldung.set('Das Bild ließ sich nicht erstellen.');
      } finally {
        this.laeuft.set(false);
      }
      return;
    }
    const { shareImage, posterFileName } = await import('../data/poster');
    const name = art === 'danke' ? `blickfeld-nord-danke-${this.id()}.png` : art === 'feed' ? posterFileName(s, 'feed') : `blickfeld-nord-story-${schritt}-${this.id()}.png`;
    const r = await shareImage(blob, name, art === 'danke' ? 'Danke! – Blickfeld Nord' : `Blickfeld Nord live – ${s.venue}`);
    this.bereitFuer.set(null);
    if (r === 'abgebrochen') return this.meldung.set('');
    this.haken(schritt, true);
    this.geteilt.set(schritt);
    setTimeout(() => this.geteilt.set(null), 2000);
    const ablage = kopiert ? (art === 'feed' ? ' – die Bildunterschrift liegt in der Zwischenablage' : ' – der Link liegt in der Zwischenablage: in Instagram als Link-Sticker in die freie Fläche unten einfügen') : '';
    this.meldung.set(`${r === 'geteilt' ? 'Geteilt' : 'Bild gespeichert'} und abgehakt ✓${ablage}`);
  }

  protected haken(schritt: string, an: boolean): void {
    this.erledigt.set(setzeSchritt(this.id(), schritt, an));
  }

  protected async kopieren(schritt: string): Promise<void> {
    const text = schrittText(schritt, this.show(), kampagnenLink(this.id(), 'text'));
    try {
      await navigator.clipboard.writeText(text);
      this.kopiert.set(schritt);
      setTimeout(() => this.kopiert.set(null), 2000);
    } catch {
      window.prompt('Text kopieren:', text);
    }
  }

  protected datum(d: string): string {
    const [j, m, t] = d.split('-');
    return `${['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date(`${d}T12:00:00`).getDay()]}, ${t}.${m}.${j.slice(2)}`;
  }
}
