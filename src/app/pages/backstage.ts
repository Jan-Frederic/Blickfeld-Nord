import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { HeuteFaellig } from './heute-faellig';
import { BackstageSuche } from './backstage-suche';
import { BandService } from '../data/band.service';
import { SyncService } from '../data/sync.service';
import { ladeIch } from '../data/band-ich';
import { alleFortschritte } from '../data/fortschritt';
import { rueckblickText, wochenRueckblick } from '../data/wochenrueckblick';
import { statusMigrieren } from '../data/uebe-status';
import { heuteGeuebt, karten, ladeTagesziel, ladeUeben, nochHeute } from '../data/ueben';

// Versteckter Bereich für die Band, erreichbar per Easter Egg: fünfmal schnell auf das Logo oben links klicken.
// Die Übersicht zeigt Suche, Fälliges und die nächsten Termine; die Themen liegen auf eigenen Unterseiten
// (Songs, Termine, Aufgaben, Technik, Material, Sprachen, Zahlen, Abgleich – siehe BACKSTAGE_BEREICHE), erreichbar über die Leiste oben.
@Component({
  selector: 'app-backstage',
  imports: [DatePipe, RouterLink, MatIconModule, HeuteFaellig, BackstageSuche],
  template: `
    <section class="section">
      <p class="kicker">Nur für die Band</p>
      <h2>Backstage</h2>
      <p class="lead">Alles für Planung und Auftritte an einem Ort. Die Themen findet ihr oben im Menü.</p>

      <!-- Reihenfolge nach Dringlichkeit: Suche, heute Fälliges, die nächsten Termine (je mit Bühnen- bzw. Probe-Modus);
           die Bereiche stehen in der Leiste oben. Die Bereit-Checks der
           kommenden Auftritte stehen unter Aufgaben. -->
      <app-backstage-suche />
      <app-heute-faellig />
      <!-- Üben: persönlicher Karteikasten mit den Songs, die noch wackeln; rechts der Übe-Modus (Notenansicht) -->
      <div class="ueben-reihe">
        <a class="ueben-karte" routerLink="/backstage/ueben">
          <mat-icon>style</mat-icon>
          <span><strong>Üben</strong> <small>{{ ueben.text }}</small></span>
        </a>
        <!-- wie Probe- und Bühnen-Modus: startet gleich die Notenansicht der fälligen Karteikarten -->
        <a class="modus" routerLink="/backstage/ueben" [queryParams]="{ modus: 1 }" aria-label="Übe-Modus starten" title="Übe-Modus"><mat-icon>fit_screen</mat-icon> <span class="modus-text">Übe-Modus</span></a>
      </div>
      <!-- Wochenrückblick der Band: geübte Karten der letzten 7 Tage je Person, Songs, die jetzt bei allen sitzen -->
      @if (rueckblick; as r) {
        <p class="wochenrueckblick"><mat-icon aria-hidden="true">insights</mat-icon>
          <span><strong>Diese Woche geübt:</strong> {{ r.text }}
            @if (r.gefestigt.length) { <small>Sitzt jetzt bei allen: {{ r.gefestigt.join(', ') }}</small> }</span></p>
      }

      <h3>Als Nächstes</h3>
      @if (next.length) {
        <ol class="next">
          @for (n of next; track n.date + n.label) {
            <li>
              <a class="termin" [routerLink]="n.link">
                <span class="date">{{ n.date | date: 'EEE, dd.MM.' : '' : 'de' }}@if (n.time) { · {{ n.time }}}</span>
                <span class="what"><mat-icon>{{ n.icon }}</mat-icon> {{ n.label }}</span>
              </a>
              <a class="modus" [routerLink]="n.modus.link" [queryParams]="n.modus.query" [attr.aria-label]="n.modus.text + ' – ' + n.label" [title]="n.modus.text"><mat-icon>fit_screen</mat-icon> <span class="modus-text">{{ n.modus.text }}</span></a>
            </li>
          }
        </ol>
      } @else {
        <p class="empty">Keine kommenden Termine eingetragen.</p>
      }

      <!-- ganz unten: Anleitung zu den drei Modi und den gemeinsamen Begriffen -->
      <p class="anleitung-link"><a routerLink="/backstage/anleitung"><mat-icon>help_outline</mat-icon> Anleitung: Übe-, Probe- und Bühnen-Modus im Vergleich</a></p>
    </section>
  `,
  styles: `
    h3 { margin: 32px 0 12px; font-family: var(--bn-wide); font-weight: 400; text-transform: uppercase; letter-spacing: .14em; font-size: .85rem; }
    .next { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    .ueben-reihe { display: flex; align-items: stretch; gap: 8px; margin: 20px 0 0; }
    .ueben-karte { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; border: 1px solid var(--bn-sunset); color: var(--bn-ink); text-decoration: none; }
    .ueben-karte:hover { background: rgba(232, 164, 106, .08); }
    .ueben-karte mat-icon { color: var(--bn-sunset); flex: none; }
    .ueben-karte span { flex: 1; min-width: 0; }
    .ueben-karte small { display: block; color: var(--bn-fog); font-size: .82rem; }
    .next li { display: flex; align-items: stretch; gap: 8px; }
    .termin {
      flex: 1; min-width: 0; display: grid; grid-template-columns: 9em 1fr; align-items: center; gap: 12px; padding: 12px 16px;
      border-radius: 10px; border: 1px solid var(--bn-line); color: var(--bn-ink); text-decoration: none;
    }
    .next a:hover { border-color: var(--bn-sunset); }
    .modus { display: flex; align-items: center; gap: 6px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--bn-line); color: var(--bn-sunset); text-decoration: none; font-size: .85rem; white-space: nowrap; }
    .modus mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .date { font-variant-numeric: tabular-nums; color: var(--bn-sunset); font-size: .9rem; }
    .what { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .what mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--bn-fog); }
    .empty { padding: 16px; border: 1px dashed var(--bn-line); border-radius: 12px; color: var(--bn-fog); }
    @media (max-width: 560px) {
      .termin { grid-template-columns: 1fr; gap: 4px; }
      .modus-text { display: none; }
    }
  `,
})
export class Backstage {
  private readonly router = inject(Router);
  /** Üben-Karte: wie viele Songs im Karteikasten liegen, wie viele heute dran sind (persönlich, data/ueben.ts) */
  protected readonly ueben = (() => {
    const ich = ladeIch();
    if (!ich) return { text: 'Songs lernen wie mit Karteikarten – persönlich, „Ich bin …“ unter Einstellungen wählen' };
    statusMigrieren();
    const heute = new Date().toLocaleDateString('sv-SE');
    const k = karten(ladeUeben(), new Map(), heute);
    const geuebt = heuteGeuebt(heute);
    const rest = nochHeute(ladeTagesziel(), geuebt.length);
    const dran = k.filter((x) => x.dran && !geuebt.includes(x.key)).length;
    // Tagesziel ist nur eine Empfehlung: erreicht → sagen, sonst die fälligen Karten
    const heuteText = !rest ? `Tagesziel geschafft (${geuebt.length} geübt)` : dran ? `${dran} heute dran` : 'heute nichts fällig';
    return { text: k.length ? `${k.length} ${k.length === 1 ? 'Song' : 'Songs'} im Karteikasten · ${heuteText}` : 'Karteikasten leer – Songs lassen sich dort hinzufügen' };
  })();
  protected readonly band = inject(BandService);
  protected readonly shows = [...this.band.shows].sort((a, b) => a.date.localeCompare(b.date));
  /** Wochenrückblick (data/wochenrueckblick.ts) – nur, wenn diese Woche jemand geübt hat oder ein Song gefestigt ist */
  protected readonly rueckblick = (() => {
    const r = wochenRueckblick(this.band.members, alleFortschritte(this.band.members), ladeIch(), new Date().toLocaleDateString('sv-SE'));
    return r.personen.some((p) => p.karten) || r.gefestigt.length ? { text: rueckblickText(r), gefestigt: r.gefestigt } : null;
  })();
  protected readonly rehearsals = [...this.band.rehearsals].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));

  // die nächsten vier Termine – Auftritte und Proben gemischt
  private readonly today = new Date().toISOString().slice(0, 10);
  protected readonly next = [
    ...this.shows
      .filter((s) => (s.endDate ?? s.date) >= this.today)
      .map((s) => ({
        date: s.date,
        time: s.time,
        label: s.venue + (s.city ? ', ' + s.city : ''),
        icon: s.private ? 'lock' : 'celebration',
        link: ['/backstage', this.band.showId(s)],
        modus: { text: 'Bühnen-Modus', link: ['/backstage', this.band.showId(s), 'setlist'], query: { buehne: 1 } },
      })),
    ...this.rehearsals
      .filter((r) => r.date >= this.today)
      .map((r) => ({ date: r.date, time: r.time, label: 'Probe' + (r.place ? ', ' + r.place : ''), icon: 'music_note', link: ['/backstage/probe', r.date], modus: { text: 'Probe-Modus', link: ['/backstage/probe', r.date], query: { modus: 1 } } })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
    .slice(0, 4);

  constructor() {
    // Synchronisation mit OneDrive (falls eingerichtet und „automatisch“): beim Öffnen und alle 15 Minuten
    inject(SyncService).automatisch();
    // Direktaufruf einer Unterseite: GitHub Pages leitet /backstage/<id>[/<teil>] über die Fehlerseite
    // nach /backstage/?auftritt=<id>[&teil=<teil>] um – von hier geht es zur eigentlichen Unterseite weiter
    // (der Teil hinter „#“, z. B. eine geteilte Setlist, kommt mit).
    const query = inject(ActivatedRoute).snapshot.queryParamMap;
    const id = query.get('auftritt');
    const teil = query.get('teil');
    // weitere Parameter (z. B. ?name= einer Sammlung) kommen mit
    const rest = Object.fromEntries(query.keys.filter((k) => k !== 'auftritt' && k !== 'teil').map((k) => [k, query.get(k)]));
    if (id) this.router.navigate(['/backstage', id, ...(teil ? [teil] : [])], { replaceUrl: true, preserveFragment: true, queryParams: rest });
  }
}
