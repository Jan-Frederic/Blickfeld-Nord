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
        <button type="button" class="btn zweit" (click)="bild()"><mat-icon>share</mat-icon> Als Bild teilen</button>
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
    .btn.zweit { background: none; color: var(--bn-ink); border-color: var(--bn-line); }
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

  /** Bild für die WhatsApp-Gruppe der Band (1080 × 1350): 12 Monate im Raster, Auftritte hell, Proben grau, Abwesenheiten rot */
  protected async bild(): Promise<void> {
    const W = 1080, H = 1350, rand = 40, kopf = 120, spalten = 3, zeilen = 4;
    const canvas = document.createElement('canvas');
    canvas.width = W * 2;
    canvas.height = H * 2;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(2, 2);
    await Promise.all([document.fonts.load('400 30px Michroma'), document.fonts.load('400 20px Inter'), document.fonts.load('600 20px Inter')]);
    ctx.fillStyle = '#15171c';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ece9e4';
    ctx.font = '400 34px Michroma';
    ctx.fillText('BLICKFELD NORD · SAISON', rand, 70);
    ctx.fillStyle = '#9aa0a6';
    ctx.font = '400 20px Inter';
    ctx.fillText(`Stand ${new Date().toLocaleDateString('de-DE')} · ${this.auftritte()} Auftritte · ${this.proben()} Proben · ${this.frei()} Monate frei`, rand, 104);
    const bw = (W - 2 * rand - (spalten - 1) * 16) / spalten;
    const bh = (H - kopf - rand - (zeilen - 1) * 16) / zeilen;
    this.plan().forEach((m, i) => {
      const x = rand + (i % spalten) * (bw + 16);
      const y = kopf + Math.floor(i / spalten) * (bh + 16);
      const frei = !this.hatAuftritt(m);
      ctx.strokeStyle = frei ? '#e8a46a' : '#3a3f45';
      ctx.setLineDash(frei ? [8, 6] : []);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, bw, bh, 14);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ece9e4';
      ctx.font = '600 22px Inter';
      ctx.fillText(this.name(m.monat), x + 16, y + 34);
      let zy = y + 66;
      const platz = Math.floor((bh - 70) / 26);
      const liste = m.eintraege.filter((e) => e.art !== 'probe' || m.eintraege.length <= platz);
      for (const e of liste.slice(0, platz)) {
        ctx.fillStyle = e.art === 'auftritt' ? (e.offen ? '#e8a46a' : '#ece9e4') : e.art === 'weg' ? '#e07a5a' : '#9aa0a6';
        ctx.font = `${e.art === 'auftritt' ? '600' : '400'} 18px Inter`;
        let t = `${tag(e.datum)} ${e.text}`;
        while (ctx.measureText(t).width > bw - 32 && t.length > 4) t = t.slice(0, -2) + '…';
        ctx.fillText(t, x + 16, zy);
        zy += 26;
      }
      if (liste.length > platz) {
        ctx.fillStyle = '#9aa0a6';
        ctx.fillText(`+ ${liste.length - platz} weitere`, x + 16, zy);
      }
      if (frei) {
        ctx.fillStyle = '#e8a46a';
        ctx.font = '400 18px Inter';
        ctx.fillText('noch kein Auftritt', x + 16, y + bh - 18);
      }
    });
    const blob = await new Promise<Blob>((ok, fehler) => canvas.toBlob((b) => (b ? ok(b) : fehler(new Error('Bild fehlt'))), 'image/png'));
    const { shareImage } = await import('../data/poster');
    await shareImage(blob, `blickfeld-nord-saison-${this.heute}.png`, 'Blickfeld Nord – Saison').catch(() => undefined);
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
