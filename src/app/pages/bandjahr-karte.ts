import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { BEWERTUNG_PREFIX, Bewertungen } from '../data/bewertung';
import { Entry, SETLIST_PREFIX } from '../data/setlist-data';
import { bandjahr } from '../data/bandjahr';
import { renderJahr, shareImage } from '../data/poster';

// Backstage → Zahlen: das Bandjahr auf einen Blick, auf Wunsch als Story-Bild zum Teilen (Silvester, Neujahr)
@Component({
  selector: 'app-bandjahr',
  imports: [MatIconModule],
  template: `
    <section class="stats" aria-labelledby="jahr-title">
      <div class="head">
        <div>
          <p class="kicker">Jahresrückblick</p>
          <h3 id="jahr-title">Bandjahr in Zahlen</h3>
        </div>
        <select [value]="jahr()" (change)="jahr.set(+$any($event.target).value)" aria-label="Jahr wählen">
          @for (j of jahre; track j) { <option [value]="j">{{ j }}</option> }
        </select>
      </div>
      <div class="zahlen">
        @for (z of zahlen(); track z[0]) { <div><strong>{{ z[1] }}</strong><span>{{ z[0] }}</span></div> }
      </div>
      @for (z of zeilen(); track z[0]) { <p class="zeile"><span>{{ z[0] }}</span> {{ z[1] }}</p> }
      <button type="button" (click)="teilen()"><mat-icon>ios_share</mat-icon> Als Story-Bild teilen</button>
      <p class="hint">Songs und Sterne stammen aus den Setlists auf diesem Gerät.</p>
    </section>
  `,
  styles: `
    .stats { margin-top: 40px; padding: 24px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    .head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 12px 16px; margin-bottom: 16px; }
    .head > div { min-width: 0; }
    .kicker { margin-bottom: 4px; }
    h3 { font-family: var(--bn-display); font-weight: 400; font-size: 1.3rem; text-transform: uppercase; letter-spacing: .08em; margin: 0; }
    select { padding: 8px 10px; border-radius: 8px; border: 1px solid var(--bn-line); background: #1b1e22; color: var(--bn-ink); font: inherit; color-scheme: dark; }
    .zahlen { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 14px; }
    .zahlen div { display: grid; gap: 2px; padding: 14px; border-radius: 10px; border: 1px solid var(--bn-line); }
    .zahlen strong { font-family: var(--bn-display); font-weight: 400; font-size: 1.8rem; color: var(--bn-sunset); }
    .zahlen span, .zeile span { font-size: .78rem; text-transform: uppercase; letter-spacing: .1em; color: var(--bn-fog); }
    .zeile { margin: 6px 0; }
    button { display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; padding: 7px 14px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; cursor: pointer; }
    button:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .hint { margin: 12px 0 0; font-size: .8rem; color: var(--bn-fog); }
  `,
})
export class BandjahrKarte {
  private readonly band = inject(BandService);
  private readonly heute = new Date().toISOString().slice(0, 10);
  protected readonly jahre = [...new Set(this.band.shows.filter((s) => s.date < this.heute).map((s) => +s.date.slice(0, 4)))].sort((a, b) => b - a);
  // im Januar standardmäßig das abgelaufene Jahr
  protected readonly jahr = signal(new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : (this.jahre[0] ?? new Date().getFullYear()));

  private readonly daten = (() => {
    const setlists = new Map<string, Entry[]>();
    const sterne = new Map<string, Bewertungen>();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!;
        if (k.startsWith(SETLIST_PREFIX)) setlists.set(k.slice(SETLIST_PREFIX.length), JSON.parse(localStorage.getItem(k) ?? '[]'));
        if (k.startsWith(BEWERTUNG_PREFIX)) sterne.set(k.slice(BEWERTUNG_PREFIX.length), JSON.parse(localStorage.getItem(k) ?? '{}'));
      }
    } catch {
      // ohne Speicher nur Termine
    }
    return { setlists, sterne };
  })();

  private readonly j = computed(() =>
    bandjahr(this.jahr(), this.heute, this.band.shows.map((s) => ({ ...s, id: this.band.showId(s) })), this.band.rehearsals, this.daten.setlists, this.daten.sterne),
  );
  protected readonly zahlen = computed<[string, number][]>(() => {
    const j = this.j();
    return [['Auftritte', j.auftritte], ['Proben', j.proben], ['Orte', j.orte], ['Songs gespielt', j.songsGespielt]];
  });
  protected readonly zeilen = computed<[string, string][]>(() => {
    const j = this.j();
    return [
      ...(j.meistgespielt ? [['Meistgespielt', `${j.meistgespielt.title} (${j.meistgespielt.mal}×)`] as [string, string]] : []),
      ...(j.bestbewertet ? [['Meiste Sterne', j.bestbewertet.title] as [string, string]] : []),
    ];
  });

  protected async teilen(): Promise<void> {
    const blob = await renderJahr(this.jahr(), this.zahlen(), this.zeilen());
    await shareImage(blob, `blickfeld-nord-${this.jahr()}-in-zahlen.png`, `Blickfeld Nord – ${this.jahr()} in Zahlen`);
  }
}
