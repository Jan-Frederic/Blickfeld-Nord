import { Component, computed, input, linkedSignal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Show } from '../data/band.service';
import { Kontakt, adressbuchDa, ausAdressbuch, bewertungText, kontaktSetzen, kontaktVon, ortKey } from '../data/kontakte';
import { KontaktBewertung } from './kontakt-bewertung';

// Backstage eines Auftritts: Ansprechpartner beim Veranstalter (gilt für alle Auftritte am selben Ort). Bleibt auf
// den Geräten der Band und im OneDrive-Abgleich – nie im Repository.
@Component({
  selector: 'app-kontakt-karte',
  imports: [MatIconModule, KontaktBewertung],
  template: `
    <details class="kontakt" [open]="!!k().name || !!k().telefon || !!k().mail">
      <summary><mat-icon>contact_phone</mat-icon> Ansprechpartner {{ k().name ? '· ' + k().name : '' }}@if (bewertung()) { <small class="wertung">{{ bewertung() }}</small> }</summary>
      <div class="felder">
        <label>Name <input [value]="k().name ?? ''" (change)="setzen('name', $any($event.target).value)" placeholder="z. B. Anna" autocomplete="off" /></label>
        <label>WhatsApp / Telefon <input type="tel" [value]="k().telefon ?? ''" (change)="setzen('telefon', $any($event.target).value)" placeholder="0171 …" autocomplete="off" /></label>
        <label>E-Mail <input type="email" [value]="k().mail ?? ''" (change)="setzen('mail', $any($event.target).value)" placeholder="name@…" autocomplete="off" /></label>
      </div>
      @if (adressbuch) {
        <button type="button" class="adressbuch" (click)="ausAdressbuch()"><mat-icon>contacts</mat-icon> Aus dem Adressbuch</button>
      }
      <app-kontakt-bewertung [key]="key()" (geaendert)="neuLaden()" />
      <p class="hinweis">Gilt für alle Auftritte an diesem Ort. Nur auf euren Geräten und im OneDrive – nicht auf der Website.
        Pressekit-Link und „Wieder anfragen“ gehen dann direkt per WhatsApp (sonst E-Mail).</p>
    </details>
  `,
})
export class KontaktKarte {
  readonly show = input.required<Show>();
  protected readonly k = linkedSignal<Kontakt>(() => kontaktVon(this.show()) ?? {});
  protected readonly key = computed(() => ortKey(this.show()));
  protected readonly bewertung = computed(() => bewertungText(this.k()));
  protected readonly adressbuch = adressbuchDa();
  protected neuLaden(): void {
    this.k.set(kontaktVon(this.show()) ?? {});
  }
  protected async ausAdressbuch(): Promise<void> {
    const a = await ausAdressbuch();
    if (!a) return;
    kontaktSetzen(this.show(), { ...this.k(), ...Object.fromEntries(Object.entries(a).filter(([, v]) => v)) });
    this.neuLaden();
  }
  protected setzen(feld: keyof Kontakt, wert: string): void {
    const neu = { ...this.k(), [feld]: wert };
    kontaktSetzen(this.show(), neu);
    this.k.set(kontaktVon(this.show()) ?? {});
  }
}
