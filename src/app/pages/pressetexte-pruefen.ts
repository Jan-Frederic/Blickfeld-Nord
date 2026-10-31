import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { TEXT_SCHRITTE, presseText } from '../data/presse-texte';

// Backstage → Übersetzungen: die erzeugten Texte des Pressekits (Beitrag und Stories) für das nächste öffentliche
// Konzert – Deutsch, Englisch und Niederländisch nebeneinander zum Gegenlesen. Die Vorlagen stehen in
// src/app/data/presse-texte.ts; Korrekturen dort eintragen (oder Fred schicken).
const TITEL: Record<string, string> = { beitrag: 'Beitrag zum Plakat', 'story-1': 'Zwei Wochen vorher', woche: 'Eine Woche vorher', morgen: 'Am Tag davor', heute: 'Am Auftrittstag' };
const EDIT_URL = 'https://github.com/Jan-Frederic/Blickfeld-Nord/edit/main/src/app/data/presse-texte.ts';

@Component({
  selector: 'app-pressetexte-pruefen',
  imports: [MatIconModule],
  template: `
    @if (beispiel(); as b) {
      <details class="pressetexte">
        <summary><mat-icon>campaign</mat-icon> Pressekit-Texte gegenlesen (Beispiel: {{ b.venue }}, {{ b.date.split('-').reverse().join('.') }})</summary>
        <p class="info">Diese Texte erzeugt die Website für jedes Konzert (Pressekit und Backstage). Englisch und Niederländisch sind noch
          nicht gegengelesen – Korrekturen in <a [href]="editUrl" target="_blank" rel="noopener">presse-texte.ts</a> eintragen.</p>
        @for (z of zeilen(); track z.id) {
          <h4>{{ z.titel }}</h4>
          <div class="spalten">
            @for (t of z.texte; track t.lang) { <div><span class="lang">{{ t.lang }}</span><pre>{{ t.text }}</pre></div> }
          </div>
        }
      </details>
    }
  `,
})
export class PressetextePruefen {
  private readonly band = inject(BandService);
  protected readonly editUrl = EDIT_URL;
  protected readonly beispiel = computed(() => {
    const heute = new Date().toISOString().slice(0, 10);
    return this.band.publicShows.find((s) => (s.endDate ?? s.date) >= heute) ?? this.band.publicShows.at(-1);
  });
  protected readonly zeilen = computed(() => {
    const s = this.beispiel();
    if (!s) return [];
    const id = this.band.showId(s);
    const links = { text: `https://blickfeld-nord.de/konzerte/${id}/`, story: `https://blickfeld-nord.de/konzerte/${id}/` };
    return TEXT_SCHRITTE.map((sch) => ({
      id: sch,
      titel: TITEL[sch],
      texte: (['de', 'en', 'nl'] as const).map((lang) => ({ lang: lang.toUpperCase(), text: presseText(sch, s, lang, links) })),
    }));
  });
}
