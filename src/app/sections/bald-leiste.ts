import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BandService } from '../data/band.service';
import { tageZwischen } from '../data/datum';
import { I18n, LocPipe, tr } from '../i18n';

const TEXT = tr(
  {
    heute: 'Heute live:',
    morgen: 'Morgen live:',
    noch: (n: number) => `Noch ${n} Tage:`,
    mehr: 'Zum Konzert',
    zu: 'Hinweis schließen',
  },
  {
    heute: 'Live today:',
    morgen: 'Live tomorrow:',
    noch: (n: number) => `${n} days to go:`,
    mehr: 'Show details',
    zu: 'Close',
  },
  {
    heute: 'Vandaag live:',
    morgen: 'Morgen live:',
    noch: (n: number) => `Nog ${n} dagen:`,
    mehr: 'Naar het optreden',
    zu: 'Sluiten',
  },
);

const ZU_KEY = 'bn-bald-zu';

// In der Woche vor einem öffentlichen, geklärten Auftritt: kleine Leiste unten auf den Unterseiten („Noch 3 Tage:
// Weihnachtsmarkt, Rhede · Zum Konzert“). Nicht auf der Startseite (dort läuft der Countdown), nicht auf der
// Konzertseite selbst und nicht im Backstage. Nur im Browser; geschlossen bleibt sie für diesen Besuch zu.
@Component({
  selector: 'app-bald-leiste',
  imports: [RouterLink, LocPipe],
  template: `
    @if (bald(); as b) {
      <aside class="bald" [attr.aria-label]="b.kopf + ' ' + b.name">
        <span class="material-icons" aria-hidden="true">celebration</span>
        <span class="text"><strong>{{ b.kopf }}</strong> {{ b.name }}</span>
        <a [routerLink]="'/konzerte/' + b.id | loc">{{ t().mehr }}</a>
        <button type="button" class="zu" (click)="schliessen()" [attr.aria-label]="t().zu"><span class="material-icons" aria-hidden="true">close</span></button>
      </aside>
    }
  `,
  styles: `
    .bald {
      position: fixed; right: 16px; bottom: 16px; z-index: 19; display: flex; align-items: center; gap: 10px; max-width: calc(100vw - 32px);
      padding: 8px 8px 8px 14px; border-radius: 999px; border: 1px solid var(--bn-sunset); background: rgba(17, 19, 22, .95); color: var(--bn-ink);
      font-size: .9rem; box-shadow: 0 6px 24px rgba(0, 0, 0, .4); box-sizing: border-box;
    }
    .material-icons { font-size: 20px; color: var(--bn-sunset); }
    .text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    a { color: var(--bn-sunset); white-space: nowrap; }
    .zu { display: grid; place-items: center; width: 32px; height: 32px; flex: none; border: 0; border-radius: 50%; background: none; color: var(--bn-fog); cursor: pointer; }
    .zu .material-icons { color: inherit; font-size: 18px; }
    @media (max-width: 560px) { .bald { left: 16px; right: 16px; font-size: .82rem; } }
  `,
})
export class BaldLeiste {
  private readonly band = inject(BandService);
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t(TEXT);
  private readonly bereit = signal(false);
  private readonly zu = signal(false);

  constructor() {
    afterNextRender(() => {
      try {
        this.zu.set(sessionStorage.getItem(ZU_KEY) === '1');
      } catch {
        // ohne Speicher bleibt sie offen
      }
      this.bereit.set(true);
    });
  }

  protected readonly bald = computed(() => {
    if (!this.bereit() || this.zu()) return null;
    const pfad = this.i18n.path();
    if (pfad === '/' || pfad.startsWith('/backstage') || pfad.startsWith('/presse/')) return null;
    const heute = new Date().toISOString().slice(0, 10);
    const show = this.band.publicShows.find((s) => (s.endDate ?? s.date) >= heute);
    if (!show) return null;
    const tage = Math.max(0, tageZwischen(heute, show.date));
    if (tage > 7) return null;
    const id = this.band.showId(show);
    if (pfad.startsWith(`/konzerte/${id}`)) return null;
    const t = this.t();
    return { id, kopf: tage === 0 ? t.heute : tage === 1 ? t.morgen : t.noch(tage), name: show.venue + (show.city ? ', ' + show.city : '') };
  });

  protected schliessen(): void {
    this.zu.set(true);
    try {
      sessionStorage.setItem(ZU_KEY, '1');
    } catch {
      // ohne Speicher gilt es bis zum Neuladen
    }
  }
}
