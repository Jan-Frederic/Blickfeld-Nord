import { Component, effect, inject, output } from '@angular/core';
import { spotifyAnmelden } from '../data/spotify-remote';
import { SpotifySpieler } from '../data/spotify-spieler';

// Spotify-Fernsteuerung in der Titelanzeige (Übe- und Probe-Modus): ▶/⏸ spielt den angezeigten Song ganz in der
// Spotify-App bzw. auf dem gewählten Spotify-Connect-Gerät, ↺10, Fortschritt, Gerätewahl und „beim Weiterblättern
// mitspielen“. Zustand und Regeln: data/spotify-spieler.ts (derselbe Zustand wie der ▶-Knopf in der Kopfleiste der
// Notenansicht). Ohne Verbindung nur „Spotify verbinden“ – dann steht daneben der eingebettete Player (Vorschau) als
// Rückfall; verbunden blendet der Elternteil ihn aus (Ausgabe „verbindung“). Styles global (styles.scss).
@Component({
  selector: 'app-spotify-steuerung',
  host: { '(pointerdown)': '$event.stopPropagation()', '(pointerup)': '$event.stopPropagation()', '(keydown)': '$event.stopPropagation()' },
  template: `
    @if (!s.verbunden()) {
      <button type="button" class="verbinden" (click)="anmelden()" title="Ganze Songs über die Spotify-App abspielen (Spotify Premium)">♫ Spotify verbinden – ganze Songs</button>
    } @else {
      <div class="leiste" role="group" aria-label="Spotify steuern">
        <button type="button" class="rund" (click)="s.zurueck()" [disabled]="s.laeuft() || !s.spielt()" aria-label="10 Sekunden zurück">↺10</button>
        <button type="button" class="rund gross" [class.an]="s.spielt()" (click)="s.umschalten()" [disabled]="s.laeuft()" [attr.aria-label]="s.spielt() ? 'Pause' : 'Auf Spotify abspielen'">{{ s.spielt() ? '⏸' : '▶' }}</button>
        <span class="zeit" aria-live="off">{{ uhr(s.position()) }} / {{ uhr(s.dauer()) }}</span>
        <label class="mit"><input type="checkbox" [checked]="s.mitspielen()" (change)="s.mitspielenSetzen($any($event.target).checked)" /> beim Weiterblättern mitspielen</label>
      </div>
      <div class="balken" aria-hidden="true"><span [style.width.%]="s.dauer() ? (s.position() / s.dauer()) * 100 : 0"></span></div>
      <div class="geraet">
        <select aria-label="Spotify-Gerät" (focus)="s.geraeteLaden()" (change)="s.geraetWaehlen($any($event.target).value)">
          <option value="">{{ s.aktivesGeraet() ? 'Gerät: ' + s.aktivesGeraet() : 'Gerät automatisch' }}</option>
          @for (g of s.geraete(); track g.id) { <option [value]="g.id" [selected]="g.id === s.gewaehlt()">{{ g.name }}{{ g.is_active ? ' (aktiv)' : '' }}</option> }
        </select>
        <button type="button" class="klein" (click)="s.abmelden()">Spotify trennen</button>
      </div>
      @if (s.hinweis(); as h) { <p class="hinweis" role="status">{{ h }}</p> }
    }
  `,
})
export class SpotifySteuerung {
  protected readonly s = inject(SpotifySpieler);
  /** verbunden ja/nein – der Elternteil blendet damit die Vorschau (Rückfall) aus */
  readonly verbindung = output<boolean>();

  constructor() {
    effect(() => this.verbindung.emit(this.s.verbunden()));
  }

  protected uhr(ms: number): string {
    const sek = Math.floor(ms / 1000);
    return `${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, '0')}`;
  }
  protected anmelden(): void {
    void spotifyAnmelden();
  }
}
