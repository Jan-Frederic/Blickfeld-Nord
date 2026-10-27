import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { Entry, isPause, loadSetlist, setLength, setTime, setsOf } from '../data/setlist-data';
import { gespielteTonart, songInfo } from '../data/songinfo';
import { SetlistBuehne } from './setlist-buehne';

// Backstage → Songs → Setlists: die Setlists aller Auftritte auf diesem Gerät auf einen Blick – kommende zuerst
// (nächster oben), dann die vergangenen (neueste oben). Je Auftritt Sets mit Länge, Tonart/Tempo je Song, der Weg
// zur Setlist des Auftritts und der Bühnen-Modus.
@Component({
  selector: 'app-songs-setlists',
  imports: [DatePipe, RouterLink, MatIconModule, SetlistBuehne],
  template: `
    <p class="lead">
      Die Setlists aller Auftritte, wie sie auf diesem Gerät gespeichert sind – Setlists der anderen kommen über „Abgleich“
      oder „Setlist als Link“ dazu. Bearbeitet wird je Auftritt unter „Setlist“.
    </p>
    @if (!liste().length) {
      <p class="leer">Noch keine Setlist auf diesem Gerät. Im Backstage einen Auftritt öffnen und unter „Setlist“ Songs wählen.</p>
    }
    @for (a of liste(); track a.id) {
      <article [class.vorbei]="a.vorbei">
        <header>
          <h3>{{ a.date | date: 'EE dd.MM.yyyy' : '' : 'de' }} · {{ a.venue }}</h3>
          <span class="info">{{ a.songs }} Songs{{ a.dauer ? ' · ' + a.dauer : '' }}{{ a.vorbei ? ' · gespielt' : '' }}</span>
          <span class="knoepfe">
            <a [routerLink]="['/backstage', a.id, 'setlist']"><mat-icon>edit</mat-icon> Setlist</a>
            <button type="button" (click)="buehne.set(a)"><mat-icon>fit_screen</mat-icon> Bühnen-Modus</button>
          </span>
        </header>
        @for (set of a.sets; track $index; let n = $index) {
          @if (a.sets.length > 1) { <p class="set">Set {{ n + 1 }}</p> }
          <ol>
            @for (s of set; track $index) { <li><span class="t">{{ s.title }}</span> <span class="k">{{ s.artist }}</span>@if (info(s); as i) { <span class="ton">{{ i }}</span> }</li> }
          </ol>
        }
      </article>
    }
    @if (buehne(); as b) { <app-setlist-buehne [entries]="b.entries" [show]="b.id" (closed)="buehne.set(null)" /> }
  `,
  styles: `
    .leer { color: var(--bn-fog); }
    article { margin-top: 14px; padding: 14px 16px; border: 1px solid var(--bn-line); border-radius: 12px; }
    article.vorbei { opacity: .85; }
    header { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; }
    h3 { margin: 0; font-size: 1rem; overflow-wrap: anywhere; }
    .info { color: var(--bn-fog); font-size: .85rem; }
    .knoepfe { display: flex; gap: 8px; margin-left: auto; }
    .knoepfe a, .knoepfe button {
      display: inline-flex; align-items: center; gap: 4px; padding: 5px 12px; border: 1px solid var(--bn-line); border-radius: 999px;
      background: none; color: var(--bn-ink); font: inherit; font-size: .85rem; text-decoration: none; cursor: pointer;
    }
    .knoepfe a:hover, .knoepfe button:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .set { margin: 12px 0 4px; color: var(--bn-sunset); font-size: .72rem; text-transform: uppercase; letter-spacing: .1em; }
    ol { margin: 8px 0 0; padding-left: 26px; display: grid; gap: 3px; font-size: .9rem; }
    li { overflow-wrap: anywhere; }
    .k, .ton { color: var(--bn-fog); font-size: .82rem; }
    .ton { margin-left: 6px; font-variant-numeric: tabular-nums; }
  `,
})
export class SongsSetlists {
  private readonly band = inject(BandService);
  protected readonly buehne = signal<{ id: string; entries: Entry[] } | null>(null);

  protected readonly liste = computed(() => {
    const heute = new Date().toISOString().slice(0, 10);
    const alle = this.band.shows
      .map((show) => {
        const id = this.band.showId(show);
        const entries = loadSetlist(id);
        const sets = setsOf(entries);
        const sekunden = sets.reduce((s, x) => s + setLength(x).seconds, 0);
        const vorbei = (show.endDate ?? show.date) < heute;
        return { id, date: show.date, venue: show.venue, entries, sets, songs: entries.filter((e) => !isPause(e)).length, dauer: sekunden ? setTime(sekunden) : '', vorbei };
      })
      .filter((a) => a.songs);
    const kommend = alle.filter((a) => !a.vorbei).sort((a, b) => a.date.localeCompare(b.date));
    const vorbei = alle.filter((a) => a.vorbei).sort((a, b) => b.date.localeCompare(a.date));
    return [...kommend, ...vorbei];
  });

  protected info(s: { title: string; artist: string }): string {
    const i = songInfo(s.title, s.artist);
    return [gespielteTonart(i), i?.capo ? `Capo ${i.capo}` : '', i?.bpm ? `${i.bpm} bpm` : ''].filter(Boolean).join(' · ');
  }
}
