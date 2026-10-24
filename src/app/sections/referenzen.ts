import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { Content } from '../content';
import { I18n, tr } from '../i18n';

// „Bisher live bei …“ (Booking und Pressekit): Referenzen aus den vergangenen, geklärten Auftritten – neueste zuerst,
// je Ort einmal mit Jahr(en). Private Feiern erscheinen nur mit ihrem öffentlichen Namen bzw. als „Private Feier“.
const TEXT = tr(
  { kicker: 'Referenzen', title: 'Bisher live bei', more: (n: number) => `und ${n} weiteren`, times: (n: number) => `${n}×` },
  { kicker: 'References', title: 'We have played at', more: (n: number) => `and ${n} more`, times: (n: number) => `${n}×` },
  { kicker: 'Referenties', title: 'Eerder live bij', more: (n: number) => `en ${n} andere`, times: (n: number) => `${n}×` },
);
const MAX = 12;

@Component({
  selector: 'app-referenzen',
  imports: [MatIconModule],
  template: `
    @if (orte().length) {
      <section class="referenzen" aria-labelledby="ref-title">
        <p class="kicker">{{ t().kicker }}</p>
        <h3 id="ref-title">{{ t().title }}</h3>
        <ul>
          @for (o of orte().slice(0, max); track o.name + o.city) {
            <li>
              <mat-icon aria-hidden="true">place</mat-icon>
              <span><strong>{{ content.t(o.name) }}</strong>@if (o.city) {<small> · {{ o.city }}</small>}</span>
              <span class="jahr">{{ o.jahre }}@if (o.anzahl > 1) { · {{ t().times(o.anzahl) }}}</span>
            </li>
          }
        </ul>
        @if (orte().length > max) { <p class="more">{{ t().more(orte().length - max) }}</p> }
      </section>
    }
  `,
  styles: `
    .referenzen { margin-top: 40px; }
    h3 { font-family: var(--bn-display); font-weight: 400; font-size: 1.1rem; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 14px; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px 24px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
    li { display: flex; align-items: baseline; gap: 8px; padding: 10px 0; border-bottom: 1px solid var(--bn-line); }
    mat-icon { flex: none; align-self: center; font-size: 18px; width: 18px; height: 18px; color: var(--bn-sunset); }
    li > span:first-of-type { flex: 1; min-width: 0; }
    small { color: var(--bn-fog); }
    .jahr { flex: none; font-size: .82rem; color: var(--bn-fog); font-variant-numeric: tabular-nums; }
    .more { margin: 10px 0 0; font-size: .85rem; color: var(--bn-fog); }
  `,
})
export class Referenzen {
  private readonly band = inject(BandService);
  protected readonly content = inject(Content);
  protected readonly t = inject(I18n).t(TEXT);
  protected readonly max = MAX;

  protected readonly orte = computed(() => {
    const heute = new Date().toISOString().slice(0, 10);
    const map = new Map<string, { name: string; city: string; jahre: string; anzahl: number; letzte: string; set: Set<string> }>();
    for (const s of this.band.shows.filter((x) => x.confirmed && (x.endDate ?? x.date) < heute)) {
      const name = this.band.publicVenue(s);
      const key = `${name}|${s.city ?? ''}`;
      const o = map.get(key) ?? { name, city: s.city ?? '', jahre: '', anzahl: 0, letzte: '', set: new Set<string>() };
      o.anzahl++;
      o.set.add(s.date.slice(0, 4));
      if (s.date > o.letzte) o.letzte = s.date;
      map.set(key, o);
    }
    return [...map.values()]
      .map((o) => ({ ...o, jahre: [...o.set].sort().join(', ') }))
      .sort((a, b) => b.letzte.localeCompare(a.letzte));
  });
}
