import { Component } from '@angular/core';
import { BackstageNav } from './backstage-nav';
import { BackstageBesucher } from './backstage-besucher';
import { SetlistStats } from './setlist-stats';
import { SongRangliste } from './song-rangliste';
import { BandjahrKarte } from './bandjahr-karte';

// Backstage → Zahlen: Besucher der Website (GoatCounter), welche Songs wir wie oft spielen und ihre Sterne-Rangliste
@Component({
  selector: 'app-backstage-zahlen',
  imports: [BackstageNav, BackstageBesucher, SetlistStats, SongRangliste, BandjahrKarte],
  template: `
    <section class="section">
      <app-backstage-nav />
      <p class="kicker">Backstage</p>
      <h2>Zahlen</h2>
      <p class="lead">Wie viele Leute die Website besuchen und welche Songs in euren Setlists am häufigsten vorkommen – und welche im Bühnen-Modus die meisten Sterne bekommen.</p>
      <app-bandjahr />
      <app-backstage-besucher />
      <app-setlist-stats />
      <app-song-rangliste />
    </section>
  `,
})
export class BackstageZahlen {}
