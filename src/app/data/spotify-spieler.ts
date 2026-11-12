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
// – Wechselt der Song, nachdem über die Steuerung gespielt wurde (auch wenn der vorige Song schon zu Ende ist): mit
//   „mitspielen“ (Standard an) startet gleich der neue, sonst – und bei Songs ohne Spotify-Track – wird pausiert. So
//   läuft nie ein anderer Song als der angezeigte. Wer selbst auf ⏸ drückt (oder in der Spotify-App anhält), bekommt
//   beim Weiterblättern nichts vorgespielt, bis er wieder ▶ drückt.
// – Ist der Song zu Ende und Spotify spielt von sich aus etwas anderes weiter (Autoplay), wird pausiert.
// – Beim Verlassen des Modus (ende) wird pausiert, was die Steuerung gestartet hat.
// Maßgeblich sind die eigenen Befehle: Nach ▶ gilt der Song als laufend und der Fortschritt zählt mit der eigenen Uhr
// (Länge aus den Spotify-Listen); Spotifys Rückmeldung (alle 5 s) berichtigt nur – sie kommt verzögert, nennt Songs
// teils unter einer anderen ID und fällt auch mal aus, daran darf die Steuerung nicht hängen.
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
  /** der Hinweis lässt sich beheben, indem man Spotify öffnet (kein Gerät gefunden) */
  readonly spotifyOeffnen = signal(false);

  /** Track, den die Steuerung zuletzt gestartet hat, und unter welcher ID Spotify ihn tatsächlich spielt */
  private gestartet: string | null = null;
  private gestartetAls: string | null = null;
  /** was Spotify vor unserem Start-Befehl spielte – das meldet es kurz danach oft noch, zählt dann nicht als unser Song */
  private davor: string | null = null;
  /** über die Steuerung wird gespielt (auch wenn der Song gerade zu Ende ist) – endet mit ⏸ */
  private mitlaufen = false;
  /** bis dahin (performance.now) gilt „spielt“ nach einem Start-Befehl, auch wenn Spotify noch den alten Stand meldet */
  private schonfrist = 0;
  /** eigene Uhr: Stelle im Song (ms) zum Zeitpunkt „seit“ – solange gespielt wird, läuft sie von dort weiter */
  private basis = 0;
  private seit = 0;
  /** zählt die Befehle – Rückmeldungen und Nacharbeiten zu einem überholten Befehl werden verworfen */
  private befehlNr = 0;
  /** Befehle nacheinander (schnelles Blättern): der nächste geht erst raus, wenn der vorige beantwortet ist */
  private kette: Promise<void> = Promise.resolve();
  private wartend = 0;
  private uhrTakt: ReturnType<typeof setInterval> | undefined;
  private abfrage: ReturnType<typeof setInterval> | undefined;

  /** Modus geöffnet: Verbindung neu lesen, Fortschritt mitzählen und alle 5 s mit Spotify abgleichen */
  start(): void {
    this.verbunden.set(spotifyVerbunden());
    this.hinweisWeg();
    if (this.uhrTakt) return;
    this.uhrTakt = setInterval(() => {
      if (!this.spielt()) return;
      const p = this.stelle();
      const d = this.dauer();
      this.position.set(d ? Math.min(p, d) : p);
      // nach der eigenen Uhr ist der Song zu Ende und Spotify hat es (noch) nicht gemeldet
      if (d && p > d + 4000) this.laufen(false, d);
    }, 500);
    // solange ein Song über die Steuerung lief oder läuft: alle 5 s abgleichen (Position, Pause in der Spotify-App …)
    this.abfrage = setInterval(() => {
      if (this.verbunden() && this.gestartet && document.visibilityState === 'visible') void this.standLaden();
    }, 5000);
    if (this.verbunden()) void this.standLaden();
  }

  /** Modus verlassen: pausieren, was die Steuerung gestartet hat */
  ende(): void {
    clearInterval(this.uhrTakt);
    clearInterval(this.abfrage);
    this.uhrTakt = this.abfrage = undefined;
    this.befehlNr++;
    if (this.spielt() && this.gestartet) void spotifyPause().catch(() => undefined);
    this.laufen(false, 0);
    this.mitlaufen = false;
    this.gestartet = this.gestartetAls = this.davor = null;
    this.track.set(undefined);
  }

  /** der angezeigte Song hat gewechselt (dauerMs: Länge aus den Spotify-Listen, bis Spotify die genaue meldet) */
  songSetzen(t: string | undefined, dauerMs = 0): void {
    const vorher = this.track();
    // Verbindung kann sich inzwischen geändert haben (in einem anderen Fenster verbunden oder getrennt)
    if (this.verbunden() !== spotifyVerbunden()) this.verbunden.set(spotifyVerbunden());
    if (t === vorher) return;
    this.track.set(t);
    this.hinweisWeg();
    const lief = this.spielt() && !!this.gestartet;
    this.laufen(false, 0);
    this.dauer.set(dauerMs);
    if (!this.verbunden()) return;
    if (t && this.mitlaufen && this.mitspielen()) void this.spielen(t);
    else if (lief) {
      // nicht mitspielen oder Song ohne Spotify-Track: der alte Song soll nicht weiterlaufen
      this.befehlNr++;
      this.schonfrist = 0;
      if (!this.mitspielen()) this.mitlaufen = false;
      void spotifyPause().catch(() => undefined);
    }
  }

  /** Stelle im Song nach der eigenen Uhr */
  private stelle(): number {
    return this.spielt() ? this.basis + (performance.now() - this.seit) : this.basis;
  }
  /** spielt / spielt nicht – ab der genannten Stelle (ohne Angabe: wo die eigene Uhr gerade steht) */
  private laufen(an: boolean, ab = this.stelle()): void {
    this.basis = Math.max(0, ab);
    this.seit = performance.now();
    this.spielt.set(an);
    this.position.set(this.dauer() ? Math.min(this.basis, this.dauer()) : this.basis);
  }

  async standLaden(): Promise<void> {
    const nr = this.befehlNr;
    try {
      const s = await spotifyStand();
      // inzwischen ging ein neuer Befehl raus: diese Antwort beschreibt den Stand davor
      if (nr !== this.befehlNr) return;
      this.aktivesGeraet.set(s?.geraet ?? null);
      const t = this.track();
      const frist = performance.now() < this.schonfrist;
      const unser = !!t && this.gestartet === t;
      // unter welcher ID spielt Spotify unseren Song (kann eine andere Fassung sein)? Kurz nach dem Start meldet es
      // oft noch den Song davor – der zählt nicht
      const direkt = !!s && (s.trackId === t || s.auchId === t);
      if (unser && s?.spielt && s.trackId && !direkt && s.position < 20_000 && this.stelle() < 20_000 && !(frist && s.trackId === this.davor)) this.gestartetAls = s.trackId;
      const meins = !!s && !!t && !!s.trackId && (s.trackId === t || s.auchId === t || (unser && s.trackId === this.gestartetAls));
      // Spotify meldet „spielt“, nennt aber keinen Titel: nach unserem Start ist es unser Song
      const ohneTitel = !!s?.spielt && !s.trackId && unser;
      // unser Song war am Ende und Spotify spielt von sich aus etwas anderes weiter: anhalten
      if (s?.spielt && !meins && !ohneTitel && this.spielt() && unser && this.dauer() && this.stelle() > this.dauer() - 12_000) {
        this.laufen(false, this.dauer());
        await spotifyPause().catch(() => undefined);
        return;
      }
      if (meins && s!.dauer) this.dauer.set(s!.dauer);
      // kurz nach dem Start meldet Spotify oft noch den alten Stand (nichts oder der vorige Song): nicht zurückfallen
      if (!((meins || ohneTitel) && s?.spielt) && frist) return;
      const spielt = (meins || ohneTitel) && !!s?.spielt;
      // in der Spotify-App mitten im Song angehalten: wie ⏸ hier – beim Weiterblättern nicht von selbst weiterspielen
      if (meins && !spielt && this.spielt() && s!.position > 2000 && s!.position < s!.dauer - 5000) this.mitlaufen = false;
      this.laufen(spielt, meins ? s!.position : undefined);
    } catch (e) {
      // das Nachlesen im Hintergrund meldet nichts (nächster Versuch in ein paar Sekunden) – außer die Verbindung ist weg
      if (e instanceof SpotifyFehler && e.art === 'anmelden') this.fehler(e);
    }
  }

  /** ▶/⏸ für den angezeigten Song */
  async umschalten(): Promise<void> {
    const t = this.track();
    if (!t) return;
    if (this.spielt()) {
      const nr = ++this.befehlNr;
      this.mitlaufen = false;
      await this.tun(nr, async () => {
        this.schonfrist = 0;
        await spotifyPause();
        if (nr === this.befehlNr) this.laufen(false);
      });
      return;
    }
    // derselbe Song war schon dran (pausiert): weiter, sonst von vorn
    const ab = this.position();
    if (this.gestartet === t && ab > 0 && ab < (this.dauer() || Infinity) - 2000) {
      const nr = ++this.befehlNr;
      await this.tun(nr, async () => {
        try {
          await spotifyWeiter();
        } catch (e) {
          // inzwischen läuft dort etwas anderes oder nichts mehr: von der gemerkten Stelle neu starten
          if (!(e instanceof SpotifyFehler) || (e.art !== 'nichts' && e.art !== 'geraet')) throw e;
          await spotifySpielen(t, ab);
        }
        this.mitlaufen = true;
        if (nr === this.befehlNr) this.gestartetMerken(nr, ab);
      });
    } else await this.spielen(t);
  }

  private async spielen(t: string): Promise<void> {
    const nr = ++this.befehlNr;
    this.mitlaufen = true;
    await this.tun(nr, async () => {
      // überholt (schon weitergeblättert oder ⏸ gedrückt): gar nicht erst losschicken
      if (nr !== this.befehlNr) return;
      this.davor = this.gestartetAls ?? this.gestartet;
      this.gestartetAls = null;
      this.gestartet = null;
      try {
        await spotifySpielen(t);
      } catch (e) {
        // der Start kam nicht an: nichts als spielend zeigen
        if (nr === this.befehlNr) this.laufen(false, 0);
        throw e;
      }
      if (nr !== this.befehlNr) return;
      this.gestartet = t;
      this.gestartetMerken(nr, 0);
    });
  }

  /** nach einem Start-Befehl: sofort als spielend zeigen, Schonfrist setzen und den Stand ein paarmal nachlesen */
  private gestartetMerken(nr: number, ab: number): void {
    this.mitlaufen = true;
    this.schonfrist = performance.now() + 6000;
    this.laufen(true, ab);
    for (const ms of [1200, 3000, 6500]) setTimeout(() => nr === this.befehlNr && this.gestartet && void this.standLaden(), ms);
  }

  async zurueck(): Promise<void> {
    const nr = this.befehlNr;
    await this.tun(nr, async () => {
      const ziel = Math.max(0, this.stelle() - 10_000);
      await spotifySpringen(ziel);
      if (nr === this.befehlNr) this.laufen(this.spielt(), ziel);
    });
  }

  async geraeteLaden(): Promise<void> {
    // Liste fürs Auswahlfeld – scheitert das Holen, bleibt die alte stehen (kein Hinweis: ▶ meldet sich selbst)
    await spotifyGeraete().then((g) => this.geraete.set(g)).catch(() => undefined);
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
    this.befehlNr++;
    if (this.spielt() && this.gestartet) void spotifyPause().catch(() => undefined);
    spotifyAbmelden();
    this.verbunden.set(false);
    this.laufen(false, 0);
    this.mitlaufen = false;
    this.gestartet = this.gestartetAls = this.davor = null;
  }

  /** Hinweis schließen */
  hinweisWeg(): void {
    this.hinweis.set('');
    this.spotifyOeffnen.set(false);
  }

  /** Befehl ausführen – nacheinander; Fehler eines überholten Befehls (nr) melden nichts mehr */
  private tun(nr: number, arbeit: () => Promise<void>): Promise<void> {
    this.wartend++;
    this.laeuft.set(true);
    this.hinweisWeg();
    const lauf = this.kette.then(async () => {
      try {
        await arbeit();
      } catch (e) {
        if (nr === this.befehlNr) this.fehler(e);
      } finally {
        if (--this.wartend === 0) this.laeuft.set(false);
      }
    });
    this.kette = lauf;
    return lauf;
  }

  private fehler(e: unknown): void {
    this.schonfrist = 0;
    const art = e instanceof SpotifyFehler ? e.art : 'netz';
    const status = e instanceof SpotifyFehler ? e.status : 0;
    if (art === 'anmelden') {
      this.verbunden.set(false);
      this.laufen(false);
      return;
    }
    // Befehl passte nicht zum Stand bei Spotify (z. B. Pause, obwohl schon angehalten): kein Hinweis nötig
    if (art === 'nichts') {
      this.laufen(false);
      return;
    }
    this.spotifyOeffnen.set(art === 'geraet');
    this.hinweis.set(
      art === 'geraet'
        ? 'Spotify läuft auf keinem Gerät. Öffne die Spotify-App (am Computer: die App oder open.spotify.com in einem Tab), dann noch einmal ▶.'
        : art === 'premium'
          ? 'Das geht nur mit Spotify Premium.'
          : art === 'freigabe'
            ? 'Dein Spotify-Konto ist für die App noch nicht freigeschaltet (Spotify-Developer-Dashboard → User Management).'
            : status === 429
              ? 'Spotify nimmt gerade keine weiteren Befehle an (zu viele Anfragen) – kurz warten, dann noch einmal ▶.'
              : status
                ? `Spotify meldet einen Fehler (${status}) – noch einmal versuchen.`
                : 'Keine Verbindung zu Spotify – Netz prüfen und noch einmal versuchen.',
    );
  }
}
