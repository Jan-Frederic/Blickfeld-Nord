import { Component, ElementRef, computed, inject, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { Content } from '../content';
import { I18n, tr } from '../i18n';

// „Bisher live bei …“ (Booking und Pressekit): Referenzen aus den vergangenen, geklärten Auftritten als Karussell in
// einer Reihe – neueste zuerst, je Ort eine Karte mit Jahr(en). Wischen, Scrollen oder die Pfeile; kein Autoplay.
// Private Feiern erscheinen nur mit ihrem öffentlichen Namen bzw. als „Private Feier“.
const TEXT = tr(
  { kicker: 'Referenzen', title: 'Bisher live bei', prev: 'Zurück', next: 'Weiter', times: (n: number) => `${n}×` },
  { kicker: 'References', title: 'We have played at', prev: 'Previous', next: 'Next', times: (n: number) => `${n}×` },
  { kicker: 'Referenties', title: 'Eerder live bij', prev: 'Vorige', next: 'Volgende', times: (n: number) => `${n}×` },
);

@Component({
  selector: 'app-referenzen',
  imports: [MatIconModule],
  template: `
    @if (orte().length) {
      <section class="referenzen" aria-labelledby="ref-title">
        <div class="head">
          <div>
            <p class="kicker">{{ t().kicker }}</p>
            <h3 id="ref-title">{{ t().title }}</h3>
          </div>
          <div class="nav">
            <button type="button" (click)="blaettern(-1)" [attr.aria-label]="t().prev"><mat-icon>chevron_left</mat-icon></button>
            <button type="button" (click)="blaettern(1)" [attr.aria-label]="t().next"><mat-icon>chevron_right</mat-icon></button>
          </div>
        </div>
        <ul #reihe tabindex="0" [attr.aria-label]="t().title">
          @for (o of orte(); track o.name + o.city) {
            <li>
              <mat-icon aria-hidden="true">place</mat-icon>
              <strong>{{ content.t(o.name) }}</strong>
              @if (o.city) { <small>{{ o.city }}</small> }
              <span class="jahr">{{ o.jahre }}@if (o.anzahl > 1) { · {{ t().times(o.anzahl) }}}</span>
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    .referenzen { margin-top: 40px; }
    .head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
    h3 { font-family: var(--bn-display); font-weight: 400; font-size: 1.1rem; text-transform: uppercase; letter-spacing: .08em; margin: 0; }
    .nav { display: flex; gap: 8px; }
    .nav button { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); cursor: pointer; }
    .nav button:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    ul {
      list-style: none; margin: 0; padding: 0 0 10px; display: flex; gap: 14px; overflow-x: auto;
      scroll-snap-type: x mandatory; scroll-behavior: smooth; scrollbar-width: thin; overscroll-behavior-x: contain;
    }
    ul:focus-visible { outline: 2px solid var(--bn-sunset); outline-offset: 4px; }
    li {
      flex: 0 0 min(260px, 78vw); scroll-snap-align: start; display: flex; flex-direction: column; gap: 4px;
      padding: 16px 18px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72);
    }
    mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--bn-sunset); }
    strong { font-weight: 600; line-height: 1.35; }
    small { color: var(--bn-fog); }
    .jahr { margin-top: auto; padding-top: 8px; font-size: .82rem; color: var(--bn-fog); font-variant-numeric: tabular-nums; }
    @media (prefers-reduced-motion: reduce) { ul { scroll-behavior: auto; } }
  `,
})
export class Referenzen {
  private readonly band = inject(BandService);
  protected readonly content = inject(Content);
  protected readonly t = inject(I18n).t(TEXT);
  private readonly reihe = viewChild<ElementRef<HTMLElement>>('reihe');

  protected readonly orte = computed(() => {
    const heute = new Date().toISOString().slice(0, 10);
    const map = new Map<string, { name: string; city: string; anzahl: number; letzte: string; set: Set<string> }>();
    for (const s of this.band.shows.filter((x) => x.confirmed && (x.endDate ?? x.date) < heute)) {
      const name = this.band.publicVenue(s);
      const key = `${name}|${s.city ?? ''}`;
      const o = map.get(key) ?? { name, city: s.city ?? '', anzahl: 0, letzte: '', set: new Set<string>() };
      o.anzahl++;
      o.set.add(s.date.slice(0, 4));
      if (s.date > o.letzte) o.letzte = s.date;
      map.set(key, o);
    }
    return [...map.values()]
      .map((o) => ({ ...o, jahre: [...o.set].sort().join(', ') }))
      .sort((a, b) => b.letzte.localeCompare(a.letzte));
  });

  // um etwa eine Bildschirmbreite weiter – am Ende wieder an den Anfang
  protected blaettern(richtung: number): void {
    const el = this.reihe()?.nativeElement;
    if (!el) return;
    const ende = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    const anfang = el.scrollLeft <= 4;
    if (richtung > 0 && ende) el.scrollTo({ left: 0 });
    else if (richtung < 0 && anfang) el.scrollTo({ left: el.scrollWidth });
    else el.scrollBy({ left: richtung * el.clientWidth * 0.9 });
  }
}
