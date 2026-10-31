import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Component } from '@angular/core';
import { BackstageBesucher } from './backstage-besucher';
import { SetlistStats } from './setlist-stats';
import { SongRangliste } from './song-rangliste';
import { BandjahrKarte } from './bandjahr-karte';

// Backstage → Zahlen: Besucher der Website (GoatCounter), welche Songs wir wie oft spielen und ihre Sterne-Rangliste
@Component({
  selector: 'app-backstage-zahlen',
  imports: [RouterLink, MatIconModule, BackstageBesucher, SetlistStats, SongRangliste, BandjahrKarte],
  template: `
    <section class="section">
      <p class="kicker">Backstage</p>
      <h2>Zahlen</h2>
      <p class="lead">Wie viele Leute die Website besuchen und welche Songs in euren Setlists am häufigsten vorkommen – und welche im Bühnen-Modus die meisten Sterne bekommen.</p>
      <app-bandjahr />
      <p class="vorschau-link"><a [routerLink]="'/backstage/jahr/' + jahr"><mat-icon>auto_stories</mat-icon> Vorschau Jahresrückblick {{ jahr }}</a> – so sieht die öffentliche Seite ab dem 15.12. aus</p>
      <app-backstage-besucher />
      <app-setlist-stats />
      <app-song-rangliste />
    </section>
  `,
})
export class BackstageZahlen {
  protected readonly jahr = new Date().getFullYear();
}
