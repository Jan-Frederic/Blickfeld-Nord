import { Component } from '@angular/core';
import { BackstageNav } from './backstage-nav';
import { BackstageBesucher } from './backstage-besucher';
import { SetlistStats } from './setlist-stats';

// Backstage → Zahlen: Besucher der Website (GoatCounter) und welche Songs wir wie oft spielen
@Component({
  selector: 'app-backstage-zahlen',
  imports: [BackstageNav, BackstageBesucher, SetlistStats],
  template: `
    <section class="section">
      <app-backstage-nav />
      <p class="kicker">Backstage</p>
      <h2>Zahlen</h2>
      <p class="lead">Wie viele Leute die Website besuchen und welche Songs in euren Setlists am häufigsten vorkommen.</p>
      <app-backstage-besucher />
      <app-setlist-stats />
    </section>
  `,
})
export class BackstageZahlen {}
