import { Component, computed, inject, signal } from '@angular/core';
import { spotifyAnmelden, spotifyMeldung } from '../data/spotify-remote';
import { SpotifySpieler } from '../data/spotify-spieler';
import { MARKEN_NAMEN } from '../data/sprungmarken';

// Spotify-Steuerung im Übe- und Probe-Modus (Titelanzeige, abgedockt auch über den Noten): ▶/⏸ spielt den
// angezeigten Song – mit der Einstellung „Fernsteuerung“ in der Spotify-App bzw. auf dem gewählten
// Spotify-Connect-Gerät, mit „Im Browser abspielen“ hier im Browser. Dazu ↺10 / 10↻, der Fortschrittsbalken zum
// Springen (ziehen oder antippen), Lautstärke (Browser-Player) bzw. Gerätewahl (Fernsteuerung) und „beim
// Weiterblättern mitspielen“. Zum Üben: Sprungmarken (mit der Band geteilt; ▶ beginnt am „Einsatz“) und die Schleife
// A–B (erster Tipp: Anfang, zweiter: Ende, dritter: aus). Zustand und Regeln: data/spotify-spieler.ts. Ohne Verbindung nur „Spotify verbinden“.
// Fehlerhinweise zeigt der Bühnen-Modus selbst. Styles global (styles.scss).
// Tippen und Wischen neben den Bedienelementen blättert wie überall im Modus (nur die Elemente selbst fangen es ab).
@Component({
  selector: 'app-spotify-steuerung',
  host: { '(keydown)': 'taste($event)' },
  template: `
    @if (s.anmeldungNoetig()) {
      <button type="button" class="verbinden" (click)="anmelden()" [title]="s.imBrowser() ? 'Ganze Songs hier im Browser abspielen (Spotify Premium)' : 'Ganze Songs über die Spotify-App abspielen (Spotify Premium)'">
        {{ s.rechteFehlen() ? '♫ Spotify neu verbinden – fürs Abspielen im Browser' : s.imBrowser() ? '♫ Spotify verbinden – im Browser abspielen' : '♫ Spotify verbinden – ganze Songs' }}
      </button>
      @if (meldung) { <p class="hinweis" role="status">{{ meldung }}</p> }
    } @else {
      <div class="leiste" role="group" aria-label="Spotify steuern">
        <button type="button" class="rund" (click)="s.zurueck()" [disabled]="s.laeuft() || !s.aktiv()" aria-label="10 Sekunden zurück">↺10</button>
        <button type="button" class="rund gross" [class.an]="s.spielt()" [class.startet]="s.startet()" (click)="s.umschalten()" [disabled]="s.laeuft() || s.startet()" [attr.aria-label]="s.startet() ? 'Spotify startet …' : s.spielt() ? 'Pause' : 'Auf Spotify abspielen'">{{ s.startet() ? '…' : s.spielt() ? '⏸' : '▶' }}</button>
        <button type="button" class="rund" (click)="s.vor()" [disabled]="s.laeuft() || !s.aktiv()" aria-label="10 Sekunden vor">10↻</button>
        <span class="zeit" aria-live="off">{{ uhr(ziehen() ?? s.position()) }} / {{ uhr(s.dauer()) }}</span>
      </div>
      <input type="range" class="balken" min="0" [max]="s.dauer() || 1" step="1000" [value]="ziehen() ?? s.position()" [disabled]="!s.aktiv() || !s.dauer()"
        (input)="ziehen.set(+$any($event.target).value)" (change)="springen(+$any($event.target).value)" aria-label="Stelle im Song" [attr.aria-valuetext]="uhr(ziehen() ?? s.position())" />
      <!-- Marken und Schleife am Balken -->
      <div class="spur" aria-hidden="true">
        @if (s.dauer()) {
          @if (s.schleife(); as sch) { <span class="ab" [style.left.%]="pct(sch.a)" [style.width.%]="sch.b != null ? pct(sch.b) - pct(sch.a) : 0.8"></span> }
          @for (m of s.marken(); track m.n) { <span class="tick" [class.einsatz]="m.n === 'Einsatz'" [style.left.%]="pct(m.ms)"></span> }
        }
      </div>
      <div class="marken" role="group" aria-label="Sprungmarken und Schleife">
        @for (m of s.marken(); track m.n) {
          <span class="marke">
            <button type="button" (click)="s.zuMarke(m)" [disabled]="s.laeuft() || s.startet()" [attr.aria-label]="'Zu ' + m.n + ' springen (' + uhr(m.ms) + ')'">{{ m.n }} <small>{{ uhr(m.ms) }}</small></button>
            @if (bearbeiten()) { <button type="button" class="weg" (click)="s.markeWeg(m.n)" [attr.aria-label]="'Marke ' + m.n + ' löschen'">✕</button> }
          </span>
        }
        <select class="neu-marke" aria-label="Marke an dieser Stelle setzen" [disabled]="!s.aktiv()" (change)="markeSetzen($event)" title="Erst ▶ – dann an der Stelle eine Marke setzen (gilt für die ganze Band)">
          <option value="">+ Marke</option>
          @for (n of namen; track n) { <option [value]="n">{{ n }}</option> }
        </select>
        @if (s.marken().length) { <button type="button" class="klein" (click)="bearbeiten.set(!bearbeiten())" [attr.aria-pressed]="bearbeiten()">{{ bearbeiten() ? 'Fertig' : 'Marken bearbeiten' }}</button> }
        <button type="button" class="schleife" [class.an]="!!s.schleife()" (click)="s.schleifeTippen()" [disabled]="!s.aktiv()" [attr.aria-label]="schleifeName()" [title]="schleifeName()">{{ schleifeText() }}</button>
        @if (s.schleife()) { <button type="button" class="weg" (click)="s.schleifeAus()" aria-label="Schleife aufheben">✕</button> }
      </div>
      <div class="geraet">
        @if (s.imBrowser()) {
          <label class="laut">Lautstärke <input type="range" min="0" max="1" step="0.05" [value]="s.lautstaerke()" (input)="s.lautstaerkeSetzen(+$any($event.target).value)" /></label>
          <span class="klein-text">Gerät: dieser Browser</span>
        } @else {
          <select aria-label="Spotify-Gerät" (focus)="s.geraeteLaden()" (change)="s.geraetWaehlen($any($event.target).value)">
            <option value="">{{ s.aktivesGeraet() ? 'Gerät: ' + s.aktivesGeraet() : 'Gerät automatisch' }}</option>
            @for (g of s.geraete(); track g.id) { <option [value]="g.id" [selected]="g.id === s.gewaehlt()">{{ g.name }}{{ g.is_active ? ' (aktiv)' : '' }}</option> }
          </select>
        }
        <label class="mit"><input type="checkbox" [checked]="s.mitspielen()" (change)="s.mitspielenSetzen($any($event.target).checked)" /> beim Weiterblättern mitspielen</label>
        <button type="button" class="klein" (click)="s.abmelden()">Spotify trennen</button>
      </div>
    }
  `,
})
export class SpotifySteuerung {
  protected readonly s = inject(SpotifySpieler);
  /** Ergebnis der letzten Anmeldung, falls sie von hier aus begonnen wurde und nicht geklappt hat */
  protected readonly meldung = this.s.verbunden() ? '' : spotifyMeldung();
  /** Stelle, solange am Fortschrittsbalken gezogen wird (erst beim Loslassen wird gesprungen) */
  protected readonly ziehen = signal<number | null>(null);
  protected readonly namen = MARKEN_NAMEN;
  protected readonly bearbeiten = signal(false);
  protected pct(ms: number): number {
    return this.s.dauer() ? Math.min(100, Math.max(0, (ms / this.s.dauer()) * 100)) : 0;
  }
  protected readonly schleifeText = computed(() => {
    const sch = this.s.schleife();
    if (!sch) return '⟲ A–B';
    return sch.b == null ? `⟲ ${this.uhr(sch.a)}–B?` : `⟲ ${this.uhr(sch.a)}–${this.uhr(sch.b)}`;
  });
  protected readonly schleifeName = computed(() => {
    const sch = this.s.schleife();
    if (!sch) return 'Schleife: Anfang hier setzen';
    return sch.b == null ? 'Schleife: Ende hier setzen' : `Schleife ${this.uhr(sch.a)} bis ${this.uhr(sch.b)} – antippen hebt sie auf`;
  });
  protected markeSetzen(e: Event): void {
    const feld = e.target as HTMLSelectElement;
    if (feld.value) this.s.markeHier(feld.value);
    feld.value = '';
  }
  protected uhr(ms: number): string {
    const sek = Math.floor(ms / 1000);
    return `${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, '0')}`;
  }
  protected springen(ms: number): void {
    this.ziehen.set(null);
    void this.s.springenAuf(ms);
  }
  /** Pfeiltasten in Schiebereglern und der Gerätewahl gehören dem Element – sonst blättert das Pedal weiter wie gewohnt */
  protected taste(e: KeyboardEvent): void {
    const el = e.target as HTMLElement;
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT') e.stopPropagation();
  }
  protected anmelden(): void {
    void spotifyAnmelden();
  }
}
