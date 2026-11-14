import { Component, DestroyRef, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Hinweise } from '../data/hinweise.service';

// Glocke oben in der Backstage-Leiste: Zahl der Benachrichtigungen (data/hinweise.service.ts), führt zur Seite
// /backstage/benachrichtigungen. Zählt bei jedem Seitenwechsel neu. Styles global (styles.scss, .kopf-knopf).
@Component({
  selector: 'app-kopf-glocke',
  imports: [RouterLink],
  template: `
    <a class="bn-icon-btn kopf-knopf" routerLink="/backstage/benachrichtigungen" [attr.aria-label]="label()" [title]="label()">
      <span class="material-icons" aria-hidden="true">{{ h.anzahl() ? 'notifications' : 'notifications_none' }}</span>
      @if (h.anzahl(); as n) { <span class="zahl" aria-hidden="true">{{ n > 99 ? '99+' : n }}</span> }
    </a>
  `,
})
export class KopfGlocke {
  protected readonly h = inject(Hinweise);
  protected readonly label = computed(() => {
    const n = this.h.anzahl();
    return n ? `Benachrichtigungen: ${n} fällig` : 'Benachrichtigungen: nichts fällig';
  });

  constructor() {
    this.h.start();
    const sub = inject(Router).events.subscribe((e) => e instanceof NavigationEnd && this.h.neu());
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }
}
