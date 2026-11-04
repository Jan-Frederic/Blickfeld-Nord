import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService, Show } from '../data/band.service';
import { kampagnenLink } from '../data/goatcounter';
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
                <button type="button" class="kopieren teilen" (click)="teilen(x.schritt.id)" [disabled]="laeuft()" [attr.aria-label]="(art === 'feed' ? 'Plakat' : art === 'danke' ? 'Danke-Story' : 'Story') + ' für „' + x.schritt.titel + '“ teilen'" [attr.title]="art === 'feed' ? 'Plakat teilen' : 'Story teilen'">
                  <mat-icon>{{ geteilt() === x.schritt.id ? 'check' : art === 'feed' ? 'image' : 'smartphone' }}</mat-icon>
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
      <p class="foot">📱 teilt das passende Bild (Story mit Countdown, Danke-Story; 🖼 Plakat) und legt den Text mit Link in die
        Zwischenablage – im Teilen-Menü Instagram → Story oder WhatsApp → Status wählen, der Schritt wird abgehakt.
        Haken setzen, wenn erledigt – dann verschwindet der Schritt aus den Aufgaben.</p>
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
  protected readonly erledigt = linkedSignal(() => erledigteSchritte(this.id()));
  protected readonly kopiert = signal<string | null>(null);
  protected readonly geteilt = signal<string | null>(null);
  protected readonly laeuft = signal(false);
  protected readonly meldung = signal('');
  protected readonly bild = BILD_SCHRITTE;
  private readonly band = inject(BandService);

  /** Bild zum Schritt zeichnen, Text in die Zwischenablage, teilen (bzw. speichern) und abhaken */
  protected async teilen(schritt: string): Promise<void> {
    const s = this.show();
    const art = BILD_SCHRITTE[schritt];
    // Herkunft je Bild: plakat, story-1, story-woche, story-morgen, story-heute, story-danke
    const link = kampagnenLink(this.id(), art === 'feed' ? 'plakat' : schritt.startsWith('story') ? schritt : `story-${schritt}`);
    this.laeuft.set(true);
    try {
      // Text zuerst – solange der Klick noch „frisch“ ist, darf die Seite in die Zwischenablage schreiben
      const text = schrittText(schritt, s, link);
      const kopiert = await navigator.clipboard.writeText(text).then(() => true, () => false);
      const poster = await import('../data/poster');
      const heute = new Date().toLocaleDateString('sv-SE');
      const blob =
        art === 'danke'
          ? await (() => {
              const h = this.band.history.find((x) => x.date === s.date && !x.example);
              return poster.renderDanke(s, this.band.publicVenue(s), h?.highlight, h?.images?.[0]?.src);
            })()
          : await poster.renderPoster(s, art, link, art === 'story' ? storyKopf(s.date, heute) : 'LIVE');
      const name = art === 'danke' ? `blickfeld-nord-danke-${this.id()}.png` : poster.posterFileName(s, art);
      const r = await poster.shareImage(blob, name, art === 'danke' ? 'Danke! – Blickfeld Nord' : `Blickfeld Nord live – ${s.venue}`);
      if (r === 'abgebrochen') return this.meldung.set('');
      this.haken(schritt, true);
      this.geteilt.set(schritt);
      setTimeout(() => this.geteilt.set(null), 2000);
      this.meldung.set(
        `${r === 'geteilt' ? 'Geteilt' : 'Bild gespeichert'} und abgehakt ✓${kopiert ? ' – der Text mit Link ist in der Zwischenablage (in der Story als Text oder Link-Sticker einfügen)' : ''}`,
      );
    } catch {
      this.meldung.set('Das Bild ließ sich nicht erstellen.');
    } finally {
      this.laeuft.set(false);
    }
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
