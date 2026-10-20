import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { UEBERSETZUNGEN } from '../data/uebersetzungen';
import { inhaltsTexte } from '../content';

// Stand der Inhalts-Übersetzungen (Englisch/Niederländisch): was ist gegengelesen, was noch nicht, was fehlt.
// Gegenlesen und freigeben: in src/app/data/uebersetzungen.ts geprueft: { en: true } setzen (PFLEGE.md).
const EDIT_URL = 'https://github.com/Jan-Frederic/Blickfeld-Nord/edit/main/src/app/data/uebersetzungen.ts';

@Component({
  selector: 'app-backstage-uebersetzungen',
  imports: [MatIconModule, RouterLink],
  template: `
    <section class="box" aria-labelledby="uebersetzungen-titel">
      <h2 id="uebersetzungen-titel"><mat-icon>translate</mat-icon> Übersetzungen der Inhalte</h2>
      <ul class="langs">
        @for (l of stand(); track l.lang) {
          <li>
            <span class="name">{{ l.name }}</span>
            <span class="bar" aria-hidden="true">
              <span class="ok" [style.flex]="l.geprueft"></span><span class="open" [style.flex]="l.ungeprueft"></span><span class="missing" [style.flex]="l.fehlt"></span>
            </span>
            <span class="sub"><i class="dot ok"></i>{{ l.geprueft }} gegengelesen · <i class="dot open"></i>{{ l.ungeprueft }} ungeprüft · <i class="dot missing"></i>{{ l.fehlt }} fehlen</span>
          </li>
        }
      </ul>
      @if (fehlend().length) {
        <details>
          <summary>{{ fehlend().length }} Texte ohne Übersetzung (erscheinen auf Englisch/Niederländisch auf Deutsch)</summary>
          <ul class="list">
            @for (t of fehlend(); track t) { <li>{{ t }}</li> }
          </ul>
        </details>
      }
      <a class="review" routerLink="/backstage/uebersetzungen"><mat-icon>fact_check</mat-icon> Übersetzungen prüfen</a>
      <p class="foot">
        Original und Übersetzung nebeneinander, korrigieren, „Passt“ anklicken – auch ohne Code-Kenntnisse ·
        <a [href]="editUrl" target="_blank" rel="noopener">Datei direkt auf GitHub öffnen</a>
      </p>
    </section>
  `,
  styles: `
    .box { margin-top: 32px; padding: 20px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    h2 { display: flex; align-items: center; gap: 8px; margin: 0 0 16px; font-size: 1.05rem; }
    h2 mat-icon { color: #7fb3e0; }
    mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .langs { margin: 0; padding: 0; list-style: none; display: grid; gap: 14px; }
    .langs li { display: grid; gap: 6px; }
    .name { font-weight: 500; }
    .bar { display: flex; height: 8px; border-radius: 4px; overflow: hidden; background: rgba(255, 255, 255, .06); }
    .ok { background: #5fb88a; } .open { background: #e0b25a; } .missing { background: rgba(255, 255, 255, .18); }
    .sub { font-size: .8rem; color: var(--bn-fog); }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin: 0 4px 0 2px; }
    details { margin-top: 16px; font-size: .88rem; }
    summary { cursor: pointer; }
    .list { margin: 8px 0 0; padding-left: 20px; color: var(--bn-fog); }
    .review { display: inline-flex; align-items: center; gap: 6px; margin-top: 16px; padding: 8px 14px; border-radius: 999px; background: var(--bn-sunset); color: #2a1708 !important; text-decoration: none; font-weight: 500; }
    .foot { margin: 16px 0 0; font-size: .78rem; color: var(--bn-fog); }
    a { color: var(--bn-sunset); }
  `,
})
export class BackstageUebersetzungen {
  protected readonly editUrl = EDIT_URL;
  private readonly texte = inhaltsTexte(inject(BandService));
  private readonly byGerman = new Map(UEBERSETZUNGEN.map((u) => [u.de, u]));

  protected readonly fehlend = computed(() => this.texte.filter((t) => !this.byGerman.has(t)));
  protected readonly stand = computed(() =>
    (['en', 'nl'] as const).map((lang) => {
      // alle Einträge der Tabelle (inkl. Technik) plus fehlende Inhaltstexte
      const geprueft = UEBERSETZUNGEN.filter((u) => u.geprueft?.[lang]).length;
      return {
        lang,
        name: lang === 'en' ? 'Englisch' : 'Niederländisch',
        geprueft,
        ungeprueft: UEBERSETZUNGEN.length - geprueft,
        fehlt: this.fehlend().length,
      };
    }),
  );
}
