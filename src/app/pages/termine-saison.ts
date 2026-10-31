import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { PlanMonat, jahresplan } from '../data/jahresplan';
import { wiederAnfragen } from '../data/saison';

// Backstage → Termine → Saison (/backstage/termine/saison): die nächsten 12 Monate mit Auftritten, Proben und
// Abwesenheiten, freie Monate markiert, dazu „Wieder anfragen“ – auf der Seite und als Ausdruck/PDF für die
// Bandbesprechung (data/jahresplan.ts).
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const tag = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

@Component({
  selector: 'app-termine-saison',
  imports: [RouterLink, MatIconModule],
  template: `
    <section class="section termine-saison">
      <a class="back" routerLink="/backstage/termine"><mat-icon>arrow_back</mat-icon> Termine</a>
      <p class="kicker">Backstage · Termine</p>
      <h2>Saison</h2>
      <p class="lead">Die nächsten 12 Monate auf einen Blick: Auftritte, Proben und wer wann nicht kann. Freie Monate sind
        markiert. Zum Mitnehmen in die Bandbesprechung ausdrucken oder als PDF speichern.</p>
      <div class="knoepfe">
        <button type="button" class="btn" (click)="drucken()"><mat-icon>print</mat-icon> Drucken / als PDF</button>
        <span class="zahlen">{{ auftritte() }} Auftritte · {{ proben() }} Proben · {{ frei() }} {{ frei() === 1 ? 'Monat' : 'Monate' }} frei</span>
      </div>

      <div class="monate">
        @for (m of plan(); track m.monat) {
          <article [class.frei]="!hatAuftritt(m)">
            <h3>{{ name(m.monat) }}</h3>
            <ul>
              @for (e of m.eintraege; track e.datum + e.text) {
                <li [class]="e.art" [class.offen]="e.offen" [class.privat]="e.privat">
                  <span class="tag">{{ tagText(e.datum) }}@if (e.bis && e.bis !== e.datum) {–{{ tagText(e.bis) }}}</span>
                  @if (e.link) { <a [routerLink]="e.link">{{ e.text }}</a> } @else { <span>{{ e.text }}</span> }
                  @if (e.info) { <small>{{ e.info }}</small> }
                  @if (e.offen) { <small class="status">offen</small> }
                </li>
              }
            </ul>
            @if (!hatAuftritt(m)) { <p class="leer">noch kein Auftritt</p> }
          </article>
        }
      </div>

      @if (anfragen().length) {
        <h3 class="anfragen-titel"><mat-icon>call</mat-icon> Wieder anfragen</h3>
        <ul class="anfragen">
          @for (a of anfragen(); track a.show.date) {
            <li>{{ a.show.publicName || a.show.venue }}{{ a.show.city ? ', ' + a.show.city : '' }} – letztes Mal {{ datum(a.show.date) }}, am besten bis {{ datum(a.bis) }} anfragen</li>
          }
        </ul>
      }
    </section>
  `,
  styles: `
    .termine-saison { max-width: 1100px; }
    .back { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 14px; color: var(--bn-fog); text-decoration: none; font-size: .9rem; }
    .knoepfe { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px; margin: 0 0 20px; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 18px; border-radius: 999px; border: 1px solid var(--bn-sunset); background: var(--bn-sunset); color: #2a1708; font: 500 .9rem Inter, sans-serif; cursor: pointer; }
    .zahlen { color: var(--bn-fog); font-size: .9rem; }
  `,
})
export class TermineSaison {
  private readonly band = inject(BandService);
  private readonly heute = new Date().toISOString().slice(0, 10);
  protected readonly plan = computed(() =>
    jahresplan({ shows: this.band.shows, proben: this.band.rehearsals, weg: this.band.abwesenheiten, showId: (s) => this.band.showId(s) }, this.heute),
  );
  protected readonly anfragen = computed(() => wiederAnfragen(this.band.shows, this.heute));
  protected readonly auftritte = computed(() => this.plan().reduce((n, m) => n + m.eintraege.filter((e) => e.art === 'auftritt').length, 0));
  protected readonly proben = computed(() => this.plan().reduce((n, m) => n + m.eintraege.filter((e) => e.art === 'probe').length, 0));
  protected readonly frei = computed(() => this.plan().filter((m) => !this.hatAuftritt(m)).length);
  protected hatAuftritt(m: PlanMonat): boolean {
    return m.eintraege.some((e) => e.art === 'auftritt');
  }
  protected name(jm: string): string {
    return `${MONATE[Number(jm.slice(5, 7)) - 1]} ${jm.slice(0, 4)}`;
  }
  protected readonly tagText = tag;
  protected datum(d: string): string {
    return d.split('-').reverse().join('.');
  }

  /** Ausdruck: alle 12 Monate auf einer A4-Seite (quer), druckt bzw. speichert als PDF über den Browser */
  protected drucken(): void {
    const win = window.open('', '_blank');
    if (!win) return;
    const monate = this.plan()
      .map(
        (m) => `<section class="${this.hatAuftritt(m) ? '' : 'frei'}"><h2>${this.name(m.monat)}</h2><ul>${m.eintraege
          .map((e) => `<li class="${e.art}${e.offen ? ' offen' : ''}"><b>${tag(e.datum)}${e.bis && e.bis !== e.datum ? '–' + tag(e.bis) : ''}</b> ${esc(e.text)}${e.info ? ` <small>${esc(e.info)}</small>` : ''}${e.offen ? ' <small>(offen)</small>' : ''}</li>`)
          .join('')}</ul>${this.hatAuftritt(m) ? '' : '<p class="leer">noch kein Auftritt</p>'}</section>`,
      )
      .join('');
    const anfragen = this.anfragen().length
      ? `<h2 class="anfragen">Wieder anfragen</h2><ul>${this.anfragen().map((a) => `<li>${esc(a.show.publicName || a.show.venue)}${a.show.city ? ', ' + esc(a.show.city) : ''} – bis ${this.datum(a.bis)}</li>`).join('')}</ul>`
      : '';
    win.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Saison – Blickfeld Nord</title><style>
  @page { size: A4 landscape; margin: 10mm; }
  body { font: 9pt/1.35 Inter, Arial, sans-serif; color: #111; margin: 0; }
  header { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 4px; margin-bottom: 8px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  section { border: 1px solid #bbb; border-radius: 4px; padding: 5px 7px; min-height: 30mm; break-inside: avoid; }
  section.frei { border-style: dashed; }
  h2 { font-size: 10pt; margin: 0 0 3px; } ul { margin: 0; padding: 0; list-style: none; } li { margin: 1px 0; }
  li.probe { color: #555; } li.weg { color: #a33; font-style: italic; } li.offen b { color: #c60; }
  small { color: #666; } .leer { color: #c60; margin: 2px 0 0; }
  .anfragen { margin-top: 8px; } footer { margin-top: 6px; font-size: 7pt; color: #666; }
</style></head><body>
<header><b>BLICKFELD NORD</b><span>Saison ${this.name(this.plan()[0].monat)} – ${this.name(this.plan().at(-1)!.monat)}</span></header>
<div class="grid">${monate}</div>${anfragen}
<footer>Stand ${new Date().toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })} · ${this.auftritte()} Auftritte, ${this.proben()} Proben</footer>
</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }
}
