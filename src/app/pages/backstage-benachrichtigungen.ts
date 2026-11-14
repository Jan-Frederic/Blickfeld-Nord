import { Component } from '@angular/core';
import { HeuteFaellig } from './heute-faellig';
import { DokuLink } from './doku-link';

// Backstage → Benachrichtigungen (Glocke oben in der Leiste, mit Zahl): was heute fällig ist (pages/heute-faellig.ts).
@Component({
  selector: 'app-backstage-benachrichtigungen',
  imports: [DokuLink, HeuteFaellig],
  template: `
    <section class="section">
      <p class="kicker">Backstage</p>
      <h2>Benachrichtigungen</h2>
      <p class="lead">Was heute dran ist – Üben, Termine, Werbung und was sonst ansteht. Die Zahl steht oben an der Glocke.</p>
      <app-doku-link thema="benachrichtigungen" />
      <app-heute-faellig />
    </section>
  `,
})
export class BackstageBenachrichtigungen {}
