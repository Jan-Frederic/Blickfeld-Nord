import { Component, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import {
  SpotifyFehler,
  SpotifyGeraet,
  spotifyAbmelden,
  spotifyAnmelden,
  spotifyGeraetWaehlen,
  spotifyGeraete,
  spotifyGewaehltesGeraet,
  spotifyMitspielen,
  spotifyMitspielenSetzen,
  spotifyPause,
  spotifySpielen,
  spotifySpringen,
  spotifyStand,
  spotifyVerbunden,
  spotifyWeiter,
} from '../data/spotify-remote';

// Spotify-Fernsteuerung in der Titelanzeige (Übe- und Probe-Modus, data/spotify-remote.ts): ▶/⏸ spielt den Song ganz in
// der Spotify-App bzw. auf dem gewählten Spotify-Connect-Gerät, 10 s zurück, Fortschritt, Gerätewahl und „Beim
// Weiterblättern mitspielen“. Ohne Verbindung nur „Spotify verbinden“ – dann steht daneben der eingebettete Player
// (Vorschau) als Rückfall; verbunden blendet der Elternteil ihn aus (Ausgabe „verbindung“). Styles global (styles.scss).
@Component({
  selector: 'app-spotify-steuerung',
  host: { '(pointerdown)': '$event.stopPropagation()', '(pointerup)': '$event.stopPropagation()', '(keydown)': '$event.stopPropagation()' },
  template: `
    @if (!verbunden()) {
      <button type="button" class="verbinden" (click)="anmelden()" title="Ganze Songs über die Spotify-App abspielen (Spotify Premium)">♫ Spotify verbinden – ganze Songs</button>
    } @else {
      <div class="leiste" role="group" aria-label="Spotify steuern">
        <button type="button" class="rund" (click)="zurueck()" [disabled]="laeuft()" aria-label="10 Sekunden zurück">↺10</button>
        <button type="button" class="rund gross" [class.an]="spielt()" (click)="umschalten()" [disabled]="laeuft()" [attr.aria-label]="spielt() ? 'Pause' : 'Auf Spotify abspielen'">{{ spielt() ? '⏸' : '▶' }}</button>
        <span class="zeit" aria-live="off">{{ uhr(position()) }} / {{ uhr(dauer()) }}</span>
        <label class="mit"><input type="checkbox" [checked]="mitspielen()" (change)="mitspielenSetzen($any($event.target).checked)" /> beim Weiterblättern mitspielen</label>
      </div>
      <div class="balken" aria-hidden="true"><span [style.width.%]="dauer() ? (position() / dauer()) * 100 : 0"></span></div>
      <div class="geraet">
        <select aria-label="Spotify-Gerät" (focus)="geraeteLaden()" (change)="geraetWaehlen($any($event.target).value)">
          <option value="">{{ aktivesGeraet() ? 'Gerät: ' + aktivesGeraet() : 'Gerät automatisch' }}</option>
          @for (g of geraete(); track g.id) { <option [value]="g.id" [selected]="g.id === gewaehlt()">{{ g.name }}{{ g.is_active ? ' (aktiv)' : '' }}</option> }
        </select>
        <button type="button" class="klein" (click)="abmelden()">Spotify trennen</button>
      </div>
      @if (hinweis(); as h) { <p class="hinweis" role="status">{{ h }}</p> }
    }
  `,
})
export class SpotifySteuerung {
  /** Spotify-Track-ID des aktuellen Songs */
  readonly trackId = input<string | undefined>();
  /** verbunden ja/nein – der Elternteil blendet damit die Vorschau (Rückfall) aus */
  readonly verbindung = output<boolean>();
  protected readonly verbunden = signal(spotifyVerbunden());
  protected readonly spielt = signal(false);
  protected readonly position = signal(0);
  protected readonly dauer = signal(0);
  protected readonly aktivesGeraet = signal<string | null>(null);
  protected readonly geraete = signal<SpotifyGeraet[]>([]);
  protected readonly gewaehlt = signal(spotifyGewaehltesGeraet());
  protected readonly mitspielen = signal(spotifyMitspielen());
  protected readonly laeuft = signal(false);
  protected readonly hinweis = signal('');
  /** Track, den diese Steuerung zuletzt gestartet hat (Fortschritt zählt nur für ihn) */
  private gestartet: string | null = null;
  private letzterTrack: string | undefined;
  private uhrTakt: ReturnType<typeof setInterval> | undefined;
  private abfrage: ReturnType<typeof setInterval> | undefined;

  constructor() {
    // neuer Song: lief der vorige über diese Steuerung und ist „mitspielen“ an, gleich den neuen spielen
    effect(() => {
      const t = this.trackId();
      untracked(() => {
        const vorher = this.letzterTrack;
        this.letzterTrack = t;
        if (vorher === undefined || t === vorher) return;
        if (t && this.verbunden() && this.mitspielen() && this.spielt() && this.gestartet) void this.spielen(t);
        else {
          this.position.set(0);
          if (this.gestartet !== t) this.dauer.set(0);
        }
      });
    });
    if (this.verbunden()) void this.standLaden();
    effect(() => this.verbindung.emit(this.verbunden()));
    // Fortschritt: jede Sekunde weiterzählen, alle 5 s mit Spotify abgleichen (nur solange es spielt)
    this.uhrTakt = setInterval(() => {
      if (this.spielt()) this.position.update((p) => Math.min(p + 1000, this.dauer() || p + 1000));
    }, 1000);
    this.abfrage = setInterval(() => {
      if (this.spielt() && document.visibilityState === 'visible') void this.standLaden();
    }, 5000);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(this.uhrTakt);
      clearInterval(this.abfrage);
    });
  }

  protected uhr(ms: number): string {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  protected anmelden(): void {
    void spotifyAnmelden();
  }
  protected abmelden(): void {
    spotifyAbmelden();
    this.verbunden.set(false);
    this.spielt.set(false);
  }
  protected mitspielenSetzen(an: boolean): void {
    spotifyMitspielenSetzen(an);
    this.mitspielen.set(an);
  }
  protected geraetWaehlen(id: string): void {
    spotifyGeraetWaehlen(id);
    this.gewaehlt.set(id);
  }
  protected async geraeteLaden(): Promise<void> {
    await this.tun(async () => this.geraete.set(await spotifyGeraete()));
  }

  private async standLaden(): Promise<void> {
    try {
      const s = await spotifyStand();
      this.aktivesGeraet.set(s?.geraet ?? null);
      // nur den eigenen Song anzeigen – läuft gerade etwas anderes, steht hier ▶
      const meins = !!s && !!this.trackId() && s.trackId === this.trackId();
      this.spielt.set(meins && !!s?.spielt);
      if (meins) {
        this.position.set(s!.position);
        this.dauer.set(s!.dauer);
      }
    } catch (e) {
      this.fehler(e);
    }
  }

  protected async umschalten(): Promise<void> {
    const t = this.trackId();
    if (!t) return;
    if (this.spielt()) {
      await this.tun(async () => {
        await spotifyPause();
        this.spielt.set(false);
      });
      return;
    }
    // derselbe Song war schon dran (pausiert): weiter, sonst von vorn
    if (this.gestartet === t && this.position() > 0) {
      await this.tun(async () => {
        await spotifyWeiter();
        this.spielt.set(true);
      });
    } else await this.spielen(t);
  }

  private async spielen(t: string): Promise<void> {
    await this.tun(async () => {
      await spotifySpielen(t);
      this.gestartet = t;
      this.spielt.set(true);
      this.position.set(0);
      setTimeout(() => void this.standLaden(), 1200);
    });
  }

  protected async zurueck(): Promise<void> {
    await this.tun(async () => {
      const ziel = Math.max(0, this.position() - 10_000);
      await spotifySpringen(ziel);
      this.position.set(ziel);
    });
  }

  private async tun(arbeit: () => Promise<void>): Promise<void> {
    this.laeuft.set(true);
    this.hinweis.set('');
    try {
      await arbeit();
    } catch (e) {
      this.fehler(e);
    } finally {
      this.laeuft.set(false);
    }
  }

  private fehler(e: unknown): void {
    const art = e instanceof SpotifyFehler ? e.art : 'netz';
    if (art === 'anmelden') {
      this.verbunden.set(false);
      this.spielt.set(false);
      return;
    }
    this.hinweis.set(
      art === 'geraet'
        ? 'Kein Spotify-Gerät gefunden – öffne kurz die Spotify-App (oder Spotify auf dem Laptop), dann noch einmal ▶.'
        : art === 'premium'
          ? 'Das geht nur mit Spotify Premium.'
          : 'Spotify antwortet gerade nicht – noch einmal versuchen.',
    );
  }
}
