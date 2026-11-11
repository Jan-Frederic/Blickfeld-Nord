import { Injectable, signal } from '@angular/core';
import {
  SpotifyFehler,
  SpotifyGeraet,
  spotifyAbmelden,
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
} from './spotify-remote';

// Zustand der Spotify-Fernsteuerung für Übe- und Probe-Modus – einer für alle Knöpfe (Titelanzeige: volle Steuerung,
// Kopfleiste der Notenansicht: ▶/⏸). Der Bühnen-Modus meldet den aktuellen Song (songSetzen); gespielt wird immer der
// Song, der gerade zu sehen ist:
// – ▶ spielt ihn von vorn (oder setzt ihn fort, wenn er pausiert war).
// – Wechselt der Song, während die Steuerung spielt: mit „mitspielen“ (Standard an) startet gleich der neue, sonst –
//   und bei Songs ohne Spotify-Track – wird pausiert. So läuft nie ein anderer Song als der angezeigte.
// – Ist der Song zu Ende und Spotify spielt von sich aus etwas anderes weiter (Autoplay), wird pausiert.
// – Beim Verlassen des Modus (ende) wird pausiert, was die Steuerung gestartet hat.
@Injectable({ providedIn: 'root' })
export class SpotifySpieler {
  readonly verbunden = signal(spotifyVerbunden());
  /** Spotify-Track des angezeigten Songs (undefined: Song steht in keiner Spotify-Liste) */
  readonly track = signal<string | undefined>(undefined);
  readonly spielt = signal(false);
  readonly position = signal(0);
  readonly dauer = signal(0);
  readonly aktivesGeraet = signal<string | null>(null);
  readonly geraete = signal<SpotifyGeraet[]>([]);
  readonly gewaehlt = signal(spotifyGewaehltesGeraet());
  readonly mitspielen = signal(spotifyMitspielen());
  readonly laeuft = signal(false);
  readonly hinweis = signal('');

  /** Track, den die Steuerung zuletzt gestartet hat, und unter welcher ID Spotify ihn tatsächlich spielt */
  private gestartet: string | null = null;
  private gestartetAls: string | null = null;
  private uhrTakt: ReturnType<typeof setInterval> | undefined;
  private abfrage: ReturnType<typeof setInterval> | undefined;

  /** Modus geöffnet: Verbindung neu lesen, Fortschritt mitzählen und alle 5 s mit Spotify abgleichen */
  start(): void {
    this.verbunden.set(spotifyVerbunden());
    this.hinweis.set('');
    if (this.uhrTakt) return;
    this.uhrTakt = setInterval(() => {
      if (this.spielt()) this.position.update((p) => Math.min(p + 1000, this.dauer() || p + 1000));
    }, 1000);
    this.abfrage = setInterval(() => {
      if (this.spielt() && document.visibilityState === 'visible') void this.standLaden();
    }, 5000);
    if (this.verbunden()) void this.standLaden();
  }

  /** Modus verlassen: pausieren, was die Steuerung gestartet hat */
  ende(): void {
    clearInterval(this.uhrTakt);
    clearInterval(this.abfrage);
    this.uhrTakt = this.abfrage = undefined;
    if (this.spielt() && this.gestartet) void spotifyPause().catch(() => undefined);
    this.spielt.set(false);
    this.gestartet = this.gestartetAls = null;
    this.track.set(undefined);
  }

  /** der angezeigte Song hat gewechselt */
  songSetzen(t: string | undefined): void {
    const vorher = this.track();
    // Verbindung kann sich inzwischen geändert haben (in einem anderen Fenster verbunden oder getrennt)
    if (this.verbunden() !== spotifyVerbunden()) this.verbunden.set(spotifyVerbunden());
    if (t === vorher) return;
    this.track.set(t);
    this.hinweis.set('');
    const liefUeberUns = this.spielt() && !!this.gestartet;
    this.position.set(0);
    this.dauer.set(0);
    if (!liefUeberUns) return;
    if (t && this.mitspielen()) void this.spielen(t);
    else {
      // nicht mitspielen oder Song ohne Spotify-Track: der alte Song soll nicht weiterlaufen
      this.spielt.set(false);
      void spotifyPause().catch(() => undefined);
    }
  }

  private meins(id: string | null, auch: string | null): boolean {
    const t = this.track();
    if (!t || !id) return false;
    return id === t || auch === t || (this.gestartet === t && id === this.gestartetAls);
  }

  async standLaden(): Promise<void> {
    try {
      const s = await spotifyStand();
      this.aktivesGeraet.set(s?.geraet ?? null);
      // gerade gestartet: unter dieser ID spielt Spotify unseren Song (kann eine andere Fassung sein)
      if (s?.spielt && s.trackId && this.gestartet === this.track() && !this.gestartetAls && s.position < 15_000) this.gestartetAls = s.trackId;
      const meins = !!s && this.meins(s.trackId, s.auchId);
      // unser Song war am Ende und Spotify spielt von sich aus etwas anderes weiter: anhalten
      if (s?.spielt && !meins && this.spielt() && this.gestartet && this.dauer() && this.position() > this.dauer() - 12_000) {
        this.spielt.set(false);
        await spotifyPause().catch(() => undefined);
        return;
      }
      this.spielt.set(meins && !!s?.spielt);
      if (meins) {
        this.position.set(s!.position);
        this.dauer.set(s!.dauer);
      }
    } catch (e) {
      this.fehler(e);
    }
  }

  /** ▶/⏸ für den angezeigten Song */
  async umschalten(): Promise<void> {
    const t = this.track();
    if (!t) return;
    if (this.spielt()) {
      await this.tun(async () => {
        await spotifyPause();
        this.spielt.set(false);
      });
      return;
    }
    // derselbe Song war schon dran (pausiert): weiter, sonst von vorn
    if (this.gestartet === t && this.position() > 0 && this.position() < (this.dauer() || Infinity) - 2000) {
      await this.tun(async () => {
        try {
          await spotifyWeiter();
        } catch (e) {
          // inzwischen läuft dort etwas anderes oder nichts mehr: von der gemerkten Stelle neu starten
          if (!(e instanceof SpotifyFehler) || (e.art !== 'nichts' && e.art !== 'geraet')) throw e;
          await spotifySpielen(t, this.position());
        }
        this.spielt.set(true);
        setTimeout(() => void this.standLaden(), 1200);
      });
    } else await this.spielen(t);
  }

  private async spielen(t: string): Promise<void> {
    await this.tun(async () => {
      this.gestartetAls = null;
      await spotifySpielen(t);
      this.gestartet = t;
      this.spielt.set(true);
      this.position.set(0);
      setTimeout(() => void this.standLaden(), 1200);
    });
  }

  async zurueck(): Promise<void> {
    await this.tun(async () => {
      const ziel = Math.max(0, this.position() - 10_000);
      await spotifySpringen(ziel);
      this.position.set(ziel);
    });
  }

  async geraeteLaden(): Promise<void> {
    await this.tun(async () => this.geraete.set(await spotifyGeraete()));
  }
  geraetWaehlen(id: string): void {
    spotifyGeraetWaehlen(id);
    this.gewaehlt.set(id);
  }
  mitspielenSetzen(an: boolean): void {
    spotifyMitspielenSetzen(an);
    this.mitspielen.set(an);
  }
  abmelden(): void {
    if (this.spielt() && this.gestartet) void spotifyPause().catch(() => undefined);
    spotifyAbmelden();
    this.verbunden.set(false);
    this.spielt.set(false);
    this.gestartet = this.gestartetAls = null;
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
    if (art === 'nichts') {
      // Befehl passte nicht zum Stand bei Spotify (z. B. Pause, obwohl schon angehalten): Stand neu lesen
      this.spielt.set(false);
      return;
    }
    this.hinweis.set(
      art === 'geraet'
        ? 'Kein Spotify-Gerät gefunden – öffne kurz die Spotify-App (oder Spotify auf dem Laptop), dann noch einmal ▶.'
        : art === 'premium'
          ? 'Das geht nur mit Spotify Premium.'
          : art === 'freigabe'
            ? 'Dein Spotify-Konto ist für die App noch nicht freigeschaltet (Spotify-Developer-Dashboard → User Management).'
            : 'Spotify antwortet gerade nicht – noch einmal versuchen.',
    );
  }
}
