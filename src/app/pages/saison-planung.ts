import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { saison, wiederAnfragen } from '../data/saison';
import { Show } from '../data/band.service';
import { anfrageText, kontaktVon, nachrichtSenden } from '../data/kontakte';

// Backstage → Termine: Saisonplanung – die nächsten 12 Monate als Zeitleiste (Auftritte je Monat, freie Monate
// markiert) und „Wieder anfragen“ für Orte, an denen vor einem Jahr gespielt wurde (data/saison.ts).
const LANG = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

@Component({
  selector: 'app-saison-planung',
  imports: [RouterLink, MatIconModule],
  template: `
    <details class="saison">
      <summary><mat-icon>date_range</mat-icon> Saisonplanung · {{ freieMonate() }} {{ freieMonate() === 1 ? 'Monat' : 'Monate' }} ohne Auftritt@if (anfragen().length) { · {{ anfragen().length }}× wieder anfragen }</summary>
      <ol class="zeitleiste">
        @for (m of monate(); track m.monat) {
          <li [class.frei]="!m.shows.length">
            <span class="monat">{{ name(m.monat) }}</span>
            @for (s of m.shows; track s.date + s.venue) {
              <a class="auftritt" [class.offen]="!s.confirmed" [class.privat]="s.private" [routerLink]="'/backstage/' + band.showId(s)" [title]="s.venue + (s.city ? ', ' + s.city : '')">{{ s.date.slice(8, 10) }}. {{ s.publicName || s.venue }}</a>
            } @empty { <span class="leer">frei</span> }
          </li>
        }
      </ol>
      <p class="mehr"><a routerLink="/backstage/termine/saison"><mat-icon>open_in_new</mat-icon> Saison als eigene Seite – mit Proben und Abwesenheiten, zum Drucken</a></p>
      @if (anfragen().length) {
        <p class="titel"><mat-icon>call</mat-icon> Wieder anfragen – vor einem Jahr dort gespielt, noch nichts Neues geplant:</p>
        <ul class="anfragen">
          @for (a of anfragen(); track a.show.date + a.show.venue) {
            <li><a [routerLink]="'/backstage/' + band.showId(a.show)">{{ a.show.publicName || a.show.venue }}</a>{{ a.show.city ? ', ' + a.show.city : '' }} – Jahrestag {{ datum(a.jahrestag) }}, am besten bis {{ datum(a.bis) }} anfragen
              <button type="button" class="anfrage" (click)="anfragen_(a.show)"><mat-icon>send</mat-icon> {{ kopiert() === a.show.date ? 'Kopiert!' : 'Anfrage schreiben' }}</button></li>
          }
        </ul>
      }
    </details>
  `,
})
export class SaisonPlanung {
  protected readonly band = inject(BandService);
  private readonly heute = new Date().toISOString().slice(0, 10);
  protected readonly monate = computed(() => saison(this.band.shows, this.heute));
  protected readonly freieMonate = computed(() => this.monate().filter((m) => !m.shows.length).length);
  protected readonly anfragen = computed(() => wiederAnfragen(this.band.shows, this.heute));
  /** freie Monate (ganzer Name) für die Anfrage – ab dem übernächsten Monat */
  private readonly freiNamen = computed(() => this.monate().slice(2).filter((m) => !m.shows.length).map((m) => `${LANG[Number(m.monat.slice(5, 7)) - 1]}${m.monat.slice(0, 4) !== this.heute.slice(0, 4) ? ' ' + m.monat.slice(0, 4) : ''}`).slice(0, 4));
  protected readonly kopiert = signal('');
  // fertige Anfrage an den Ansprechpartner (WhatsApp, sonst E-Mail), sonst Teilen bzw. Zwischenablage
  protected async anfragen_(s: Show): Promise<void> {
    const k = kontaktVon(s);
    if ((await nachrichtSenden(k, `Anfrage Blickfeld Nord – ${s.venue}`, anfrageText(s, k, this.freiNamen()))) === 'kopiert') {
      this.kopiert.set(s.date);
      setTimeout(() => this.kopiert.set(''), 2000);
    }
  }
  protected name(jm: string): string {
    return `${MONATE[Number(jm.slice(5, 7)) - 1]} ${jm.slice(2, 4)}`;
  }
  protected datum(d: string): string {
    return d.split('-').reverse().join('.');
  }
}
