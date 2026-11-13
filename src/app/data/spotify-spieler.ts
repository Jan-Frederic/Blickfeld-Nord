import { Injectable, computed, signal } from '@angular/core';
import { SpotifyBrowser, spotifyBrowser } from './spotify-browser';
import { EINSATZ, Marke, markeLoeschen, markeSetzen, markeTypAendern, marken } from './sprungmarken';
import {
  SpotifyFehler,
  SpotifyGeraet,
  SpotifyStand,
  spotifyAbmelden,
  spotifyArt,
  spotifyBrowserRechte,
  spotifyLautstaerke,
  spotifyLautstaerkeSetzen,
  spotifyGeraetWaehlen,
  spotifyGeraete,
  spotifyGewaehltesGeraet,
  spotifyMitspielen,
  spotifyMitspielenSetzen,
  spotifyUebergang,
  spotifyNotiz,
  spotifyPause,
  spotifySpielen,
  spotifySpringen,
  spotifyStand,
  spotifyVerbunden,
  spotifyWeiter,
} from './spotify-remote';

/** womit gespielt wird: Fernsteuerung der Spotify-App (Web-API) oder der Player im Browser (data/spotify-browser.ts) */
export interface Antrieb {
  spielen(t: string, ab?: number): Promise<void>;
  pause(): Promise<unknown>;
  weiter(): Promise<unknown>;
  springen(ms: number): Promise<unknown>;
  stand(): Promise<SpotifyStand | null>;
}
const FERN: Antrieb = { spielen: spotifySpielen, pause: spotifyPause, weiter: spotifyWeiter, springen: spotifySpringen, stand: spotifyStand };
const DOCK_KEY = 'bn-spotify-abgedockt';
/** Einrichtung (Einstellungen → Checkliste): wann zuletzt ein Song wirklich lief, ob Spotify „nur mit Premium“ meldete */
export const SPOTIFY_OK_KEY = 'bn-spotify-ok';
export const SPOTIFY_PREMIUM_FEHLT_KEY = 'bn-spotify-premium-fehlt';
const DOCK_POS_KEY = 'bn-spotify-dock';
const lesen = <T>(k: string): T | null => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? 'null') as T | null;
  } catch {
    return null;
  }
};
const schreiben = (k: string, v: unknown) => {
  try {
    if (v === null || v === false) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {
    // ohne Speicher gilt es bis zum Schließen
  }
};

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
// Nach ▶ wartet die Steuerung auf Spotifys Bestätigung („startet“, bis zu 5 s): Spotify nimmt Befehle auch dann an
// (204), wenn das Gerät sie nicht ausführt – die Spotify-App auf dem Handy startet aus dem Hintergrund oft nichts
// (Android). Bleibt die Bestätigung aus, steht das als Hinweis mit „Spotify öffnen“ da; nach der Rückkehr in die App
// wird der Stand sofort nachgelesen und ein offener Start wiederholt. Läuft der Song, zählt der Fortschritt mit der
// eigenen Uhr (Länge aus den Spotify-Listen), die Rückmeldung (alle 10 s) berichtigt nur. Gibt Spotify gar keine
// Auskunft (Abfrage scheitert), gilt der eigene Befehl.
// Im Browser-Player (Einstellung „Im Browser abspielen“) meldet der Player seinen Stand selbst – genau und sofort.
// Zum Üben: Sprungmarken je Track (data/sprungmarken.ts, mit der Band geteilt) – ▶ beginnt am „Einsatz“, ein Tipp auf
// eine Marke springt dorthin – und eine Schleife A–B, die einen Abschnitt wiederholt, bis man sie aufhebt.
// Übergang: die letzten 15 s des Songs, dann blättert der Modus von selbst weiter (weiterBitte) und der nächste Song
// beginnt am Einsatz – zum Proben der Wechsel zwischen zwei Songs der Setlist.
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
  /** Knopf „⇢ Übergang“ zeigen (Einstellung, Standard aus) */
  readonly uebergangAn = signal(spotifyUebergang());
  readonly laeuft = signal(false);
  /** Start-Befehl ist angenommen, Spotify hat aber noch nicht bestätigt, dass der Song läuft */
  readonly startet = signal(false);
  readonly hinweis = signal('');
  /** der Hinweis lässt sich beheben, indem man Spotify öffnet (kein Gerät gefunden) */
  readonly spotifyOeffnen = signal(false);
  /** Einstellung „Im Browser abspielen“: die Seite ist selbst das Spotify-Gerät */
  readonly imBrowser = signal(false);
  /** Browser-Player, aber der Zugang hat das Recht dazu nicht: neu verbinden */
  readonly rechteFehlen = signal(false);
  readonly anmeldungNoetig = computed(() => !this.verbunden() || this.rechteFehlen());
  /** der angezeigte Song läuft bzw. lief (pausiert) über die Steuerung – dann lassen sich Stelle und ↺10 bedienen */
  readonly aktiv = signal(false);
  readonly lautstaerke = signal(spotifyLautstaerke());
  /** Notenansicht: Steuerung als verschiebbares Feld über den Noten statt in der Kopfleiste (je Gerät gemerkt) */
  readonly abgedockt = signal(lesen<boolean>(DOCK_KEY) === true);
  readonly dockPos = signal(lesen<{ x: number; y: number }>(DOCK_POS_KEY));
  /** Sprungmarken des angezeigten Tracks */
  readonly marken = signal<Marke[]>([]);
  /** Schleife A–B (ms): erst A gesetzt (b null), dann beide – am Ende springt es zurück auf A */
  readonly schleife = signal<{ a: number; b: number | null } | null>(null);
  /** nächster Song mit Spotify-Track (vom Bühnen-Modus gemeldet) – sonst kein Übergang möglich */
  readonly naechster = signal<{ track: string; titel: string } | undefined>(undefined);
  /** Übergang läuft: am Songende geht es von selbst zum nächsten */
  readonly uebergang = signal(false);
  /** zählt hoch, wenn der Bühnen-Modus zum nächsten Song blättern soll (Ende eines Übergangs) */
  readonly weiterBitte = signal(0);
  /** der nächste Song kommt aus einem Übergang: spielen, auch ohne „mitspielen“ */
  private uebergangWeiter = false;
  private antrieb: Antrieb = FERN;
  private browser: SpotifyBrowser | null = null;
  private readonly cspMelden = (e: SecurityPolicyViolationEvent) => spotifyNotiz(`Sicherheitsregel blockiert: ${e.effectiveDirective} ${e.blockedURI}`);

  /** Track, den die Steuerung zuletzt gestartet hat, und unter welcher ID Spotify ihn tatsächlich spielt */
  private gestartet: string | null = null;
  private gestartetAls: string | null = null;
  /** was Spotify vor unserem Start-Befehl spielte – das meldet es kurz danach oft noch, zählt dann nicht als unser Song */
  private davor: string | null = null;
  /** über die Steuerung wird gespielt (auch wenn der Song gerade zu Ende ist) – endet mit ⏸ */
  private mitlaufen = false;
  /** bis dahin (performance.now) meldet Spotify nach einem Start-Befehl oft noch den Song davor – der zählt dann nicht */
  private schonfrist = 0;
  /** Spotify hat bestätigt, dass der gestartete Song läuft (nur dann lässt er sich nach ⏸ fortsetzen) */
  private get bestaetigt(): boolean {
    return this.aktiv();
  }
  private set bestaetigt(b: boolean) {
    this.aktiv.set(b);
  }
  /** Warten auf die Bestätigung: Zeitpunkt des Befehls, Stelle, Zahl der Auskünfte und der gescheiterten Abfragen */
  private befehlZeit = 0;
  private befehlAb = 0;
  private auskuenfte = 0;
  private fehlAbfragen = 0;
  /** Song, dessen Start nicht geklappt hat (kein Gerät oder nicht bestätigt) – nach der Rückkehr aus der Spotify-App
   *  wird er noch einmal gestartet, wenn er dann nicht ohnehin läuft */
  private offen: string | null = null;
  private offenZeit = 0;
  /** bis dahin (performance.now) zählt eine Rückmeldung „spielt“ nach ⏸ nicht (Spotify meldet kurz noch den alten Stand) */
  private pauseFrist = 0;
  private readonly sichtbar = () => {
    if (document.visibilityState !== 'visible' || !this.verbunden() || this.startet()) return;
    const t = this.track();
    const nachholen = !!t && this.offen === t && performance.now() - this.offenZeit < 180_000;
    if (!nachholen && !this.gestartet) return;
    // zurück in der App (z. B. aus der Spotify-App): Stand sofort nachlesen; läuft der offene Song nicht, noch einmal starten
    void this.standLaden().then(() => {
      if (!nachholen || this.spielt() || this.startet() || this.offen !== t || this.track() !== t) return;
      this.offen = null;
      spotifyNotiz('zurück in der App: offener Start wird wiederholt');
      void this.spielen(t);
    });
  };
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
    // Einstellungen können sich seit dem letzten Modus geändert haben
    this.mitspielen.set(spotifyMitspielen());
    this.uebergangAn.set(spotifyUebergang());
    const imBrowser = spotifyArt() === 'browser';
    this.imBrowser.set(imBrowser);
    this.rechteFehlen.set(imBrowser && this.verbunden() && !spotifyBrowserRechte());
    spotifyNotiz(`— Modus geöffnet (verbunden: ${this.verbunden() ? 'ja' : 'nein'}${imBrowser ? ', im Browser' : ''}) —`);
    if (imBrowser) {
      const b = (this.browser = spotifyBrowser());
      b.anbinden(
        (st) => void this.standAnwenden(st, this.befehlNr),
        (e) => this.fehler(e),
      );
      this.antrieb = { spielen: (t, ab) => b.spielen(t, ab), pause: b.pause, weiter: b.weiter, springen: b.springen, stand: b.stand_ };
      document.addEventListener('securitypolicyviolation', this.cspMelden);
      if (this.verbunden() && !this.rechteFehlen()) void b.verbinden().catch((e) => this.fehler(e));
    } else this.antrieb = FERN;
    this.uhrTakt = setInterval(() => {
      if (!this.spielt()) return;
      const p = this.stelle();
      const d = this.dauer();
      this.position.set(d ? Math.min(p, d) : p);
      // Übergang: kurz vor dem Ende zum nächsten Song blättern lassen (der beginnt dann am Einsatz)
      if (this.uebergang() && d && p >= d - 700) {
        this.uebergang.set(false);
        this.uebergangWeiter = true;
        spotifyNotiz('Übergang: weiter zum nächsten Song');
        this.weiterBitte.update((n) => n + 1);
        return;
      }
      // Schleife: am Ende des Abschnitts zurück an den Anfang (solange kein Befehl läuft)
      const sch = this.schleife();
      if (sch?.b != null && p >= sch.b && !this.laeuft() && !this.startet()) {
        void this.springenAuf(sch.a, true);
        return;
      }
      // nach der eigenen Uhr ist der Song zu Ende und Spotify hat es (noch) nicht gemeldet
      if (d && p > d + 4000) {
        spotifyNotiz('eigene Uhr: Song zu Ende → ▶');
        this.laufen(false, d);
      }
    }, 500);
    // solange ein Song über die Steuerung lief oder läuft: alle 10 s abgleichen (Stelle, Pause in der Spotify-App …) –
    // sparsam, weil Spotify die Zahl der Anfragen begrenzt; der Fortschritt läuft dazwischen mit der eigenen Uhr
    this.abfrage = setInterval(() => {
      if (this.verbunden() && this.gestartet && document.visibilityState === 'visible') void this.standLaden();
    }, 10_000);
    document.addEventListener('visibilitychange', this.sichtbar);
    if (this.verbunden()) void this.standLaden();
  }

  /** Modus verlassen: pausieren, was die Steuerung gestartet hat */
  ende(): void {
    clearInterval(this.uhrTakt);
    clearInterval(this.abfrage);
    this.uhrTakt = this.abfrage = undefined;
    document.removeEventListener('visibilitychange', this.sichtbar);
    document.removeEventListener('securitypolicyviolation', this.cspMelden);
    spotifyNotiz('— Modus verlassen —');
    this.befehlNr++;
    if (this.browser) {
      // Browser-Player anhalten; er bleibt noch eine Weile angemeldet (data/spotify-browser.ts)
      this.browser.loesen();
      this.browser = null;
    } else if ((this.spielt() || this.startet()) && this.gestartet) void spotifyPause().catch(() => undefined);
    this.antrieb = FERN;
    this.startet.set(false);
    this.laufen(false, 0);
    this.mitlaufen = this.bestaetigt = this.uebergangWeiter = false;
    this.uebergang.set(false);
    this.naechster.set(undefined);
    this.offen = null;
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
    this.marken.set(marken(t));
    this.schleife.set(null);
    // von Hand weitergeblättert, während ein Übergang lief: der Übergang ist vorbei
    const ausUebergang = this.uebergangWeiter;
    this.uebergangWeiter = false;
    this.uebergang.set(false);
    // auch ein angenommener, noch nicht bestätigter Start zählt: er könnte gleich noch loslaufen
    const lief = (this.spielt() || this.startet()) && !!this.gestartet;
    this.startet.set(false);
    this.offen = null;
    this.bestaetigt = false;
    this.laufen(false, 0);
    this.dauer.set(dauerMs);
    if (!this.verbunden()) return;
    spotifyNotiz(`Songwechsel → ${t ?? 'Song ohne Spotify-Track'} (lief: ${lief ? 'ja' : 'nein'}, mitlaufen: ${this.mitlaufen ? 'ja' : 'nein'}, mitspielen: ${this.mitspielen() ? 'ja' : 'nein'}, Länge: ${Math.round(dauerMs / 1000)} s)`);
    if (t && ((this.mitlaufen && this.mitspielen()) || ausUebergang)) void this.spielen(t);
    else if (lief) {
      // nicht mitspielen oder Song ohne Spotify-Track: der alte Song soll nicht weiterlaufen
      this.befehlNr++;
      this.schonfrist = 0;
      if (!this.mitspielen()) this.mitlaufen = false;
      void this.antrieb.pause().catch(() => undefined);
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
      await this.standAnwenden(await this.antrieb.stand(), nr);
    } catch (e) {
      // das Nachlesen im Hintergrund meldet nichts (nächster Versuch in ein paar Sekunden) – außer die Verbindung ist weg
      if (e instanceof SpotifyFehler && e.art === 'anmelden') this.fehler(e);
      // Spotify gibt nach einem Start gar keine Auskunft (zweite Abfrage gescheitert): dann gilt der eigene Befehl
      else if (nr === this.befehlNr && this.startet() && ++this.fehlAbfragen >= 2 && !this.auskuenfte) this.unbestaetigt();
    }
  }

  /** Stand von Spotify übernehmen (Abfrage oder Meldung des Browser-Players); nr: Befehl, zu dem er gehört */
  private async standAnwenden(s: SpotifyStand | null, nr: number): Promise<void> {
    {
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
        await this.antrieb.pause().catch(() => undefined);
        return;
      }
      if (meins && s!.dauer) this.dauer.set(s!.dauer);
      const spielt = (meins || ohneTitel) && !!s?.spielt;
      if (this.startet()) {
        // Start-Befehl ist raus: erst wenn Spotify den Song als laufend meldet, gilt er als gestartet
        this.auskuenfte++;
        if (!spielt) return;
        this.startet.set(false);
        this.bestaetigt = true;
        this.offen = null;
        this.hinweisWeg();
        spotifyNotiz('Rückmeldung: Song läuft');
        schreiben(SPOTIFY_OK_KEY, new Date().toISOString());
        schreiben(SPOTIFY_PREMIUM_FEHLT_KEY, null);
        this.laufen(true, meins ? s!.position : this.befehlAb + (performance.now() - this.befehlZeit));
        return;
      }
      // kurz nach ⏸ meldet Spotify oft noch „spielt“: nicht zurückfallen
      if (spielt && performance.now() < this.pauseFrist) return;
      if (spielt && meins) {
        // läuft (auch wenn es in der Spotify-App gestartet wurde): beim Weiterblättern mitspielen, Hinweis erledigt
        this.mitlaufen = this.bestaetigt = true;
        this.gestartet ??= t!;
        this.offen = null;
        if (this.spotifyOeffnen()) this.hinweisWeg();
      }
      // in der Spotify-App mitten im Song angehalten: wie ⏸ hier – beim Weiterblättern nicht von selbst weiterspielen
      if (meins && !spielt && this.spielt() && s!.position > 2000 && s!.position < s!.dauer - 5000) this.mitlaufen = false;
      if (spielt !== this.spielt()) spotifyNotiz(`Rückmeldung: ${spielt ? 'spielt → ⏸' : `spielt nicht → ▶ (unser Song: ${meins ? 'ja' : 'nein'})`}`);
      this.laufen(spielt, meins ? s!.position : undefined);
    }
  }

  /** die Wartezeit nach einem Start-Befehl ist um (oder Spotify gibt keine Auskunft), ohne dass der Song als laufend gemeldet wurde */
  private unbestaetigt(): void {
    if (!this.startet()) return;
    this.startet.set(false);
    if (!this.auskuenfte) {
      spotifyNotiz('keine Auskunft von Spotify – gehe davon aus, dass der Song läuft');
      this.bestaetigt = true;
      this.laufen(true, this.befehlAb + (performance.now() - this.befehlZeit));
      return;
    }
    spotifyNotiz('Befehl angenommen, aber Spotify spielt nicht');
    this.laufen(false, this.befehlAb);
    if (this.imBrowser()) {
      this.hinweis.set('Der Song startet im Browser nicht – noch einmal ▶ drücken (ist der Ton des Geräts an?).');
      return;
    }
    this.offen = this.track() ?? null;
    this.offenZeit = performance.now();
    this.spotifyOeffnen.set(true);
    this.hinweis.set('Spotify hat den Befehl angenommen, spielt aber nicht – auf dem Handy startet die Spotify-App aus dem Hintergrund oft nichts. „Spotify öffnen“ antippen, bis der Song läuft, dann hierher zurück.');
  }

  /** ▶/⏸ für den angezeigten Song */
  async umschalten(): Promise<void> {
    const t = this.track();
    if (!t || this.startet()) return;
    // Browser-Player: Mobil-Browser geben Ton erst nach einer Berührung frei – im Klick selbst aufrufen
    this.browser?.aktivieren();
    spotifyNotiz(`Knopf ${this.spielt() ? '⏸' : '▶'} (Song ${t}, gestartet: ${this.gestartet ?? '–'}, Stelle ${Math.round(this.position() / 1000)} s von ${Math.round(this.dauer() / 1000)} s)`);
    if (this.spielt()) {
      const nr = ++this.befehlNr;
      this.mitlaufen = false;
      // ⏸ beendet auch einen Übergang – nach der Pause wird nicht von selbst weitergeblättert
      this.uebergang.set(false);
      await this.tun(nr, async () => {
        this.schonfrist = 0;
        await this.antrieb.pause();
        this.pauseFrist = performance.now() + 3000;
        if (nr === this.befehlNr) this.laufen(false);
      });
      return;
    }
    // derselbe Song war schon dran (pausiert): weiter, sonst von vorn
    const ab = this.position();
    if (this.gestartet === t && this.bestaetigt && ab > 0 && ab < (this.dauer() || Infinity) - 2000) {
      const nr = ++this.befehlNr;
      await this.tun(nr, async () => {
        try {
          await this.antrieb.weiter();
        } catch (e) {
          // inzwischen läuft dort etwas anderes oder nichts mehr: von der gemerkten Stelle neu starten
          if (!(e instanceof SpotifyFehler) || (e.art !== 'nichts' && e.art !== 'geraet')) throw e;
          await this.antrieb.spielen(t, ab);
        }
        this.mitlaufen = true;
        if (nr === this.befehlNr) this.gestartetMerken(nr, ab);
      });
    } else await this.spielen(t);
  }

  /** neu starten – am „Einsatz“, wenn der Song einen hat (sonst ab, Standard: Anfang) */
  private async spielen(t: string, ab = this.marken().find((m) => m.n === EINSATZ)?.ms ?? 0): Promise<void> {
    const nr = ++this.befehlNr;
    this.mitlaufen = true;
    await this.tun(nr, async () => {
      // überholt (schon weitergeblättert oder ⏸ gedrückt): gar nicht erst losschicken
      if (nr !== this.befehlNr) return;
      this.davor = this.gestartetAls ?? this.gestartet;
      this.gestartetAls = null;
      this.gestartet = null;
      this.bestaetigt = false;
      try {
        await this.antrieb.spielen(t, ab);
      } catch (e) {
        // der Start kam nicht an: nichts als spielend zeigen
        if (nr === this.befehlNr) this.laufen(false, 0);
        throw e;
      }
      if (nr !== this.befehlNr) return;
      this.gestartet = t;
      this.gestartetMerken(nr, ab);
    });
  }

  /** nach einem angenommenen Start-Befehl: auf Spotifys Bestätigung warten (Stand ein paarmal nachlesen); bleibt sie
   *  aus, meldet sich „unbestaetigt“ */
  private gestartetMerken(nr: number, ab: number): void {
    this.mitlaufen = true;
    this.schonfrist = performance.now() + 6000;
    this.pauseFrist = 0;
    this.befehlZeit = performance.now();
    this.befehlAb = ab;
    this.auskuenfte = this.fehlAbfragen = 0;
    this.laufen(false, ab);
    this.startet.set(true);
    for (const ms of [700, 1600, 2800, 4200]) setTimeout(() => nr === this.befehlNr && this.startet() && void this.standLaden(), ms);
    setTimeout(() => nr === this.befehlNr && this.unbestaetigt(), 5200);
  }

  /** ↺10 */
  zurueck(): Promise<void> {
    return this.springenAuf(this.stelle() - 10_000);
  }
  /** 10↻ */
  vor(): Promise<void> {
    return this.springenAuf(this.stelle() + 10_000);
  }
  /** an eine Stelle im Song springen (Fortschrittsbalken, ↺10, 10↻) – nur im Song, der über die Steuerung läuft */
  async springenAuf(ms: number, leise = false): Promise<void> {
    if (!this.aktiv()) return;
    const ziel = Math.round(Math.max(0, Math.min(ms, (this.dauer() || Infinity) - 1000)));
    const nr = this.befehlNr;
    if (!leise) spotifyNotiz(`Springen auf ${Math.round(ziel / 1000)} s`);
    // sofort an der neuen Stelle zeigen (die Schleife prüft sonst noch einmal die alte)
    this.laufen(this.spielt(), ziel);
    await this.tun(nr, async () => {
      await this.antrieb.springen(ziel);
      if (nr === this.befehlNr) this.laufen(this.spielt(), ziel);
    });
  }

  /** Marke antippen: läuft der Song über die Steuerung, dorthin springen – sonst von dort an abspielen */
  async zuMarke(m: Marke): Promise<void> {
    const t = this.track();
    if (!t || this.startet()) return;
    this.browser?.aktivieren();
    if (this.aktiv()) await this.springenAuf(m.ms);
    else await this.spielen(t, m.ms);
  }
  /** Marke an der aktuellen Stelle setzen (für die ganze Band) */
  markeHier(name: string): void {
    const t = this.track();
    if (!t || !this.aktiv()) return;
    spotifyNotiz(`Marke „${name}“ bei ${Math.round(this.stelle() / 1000)} s`);
    this.marken.set(markeSetzen(t, name, this.stelle()));
  }
  markeWeg(name: string): void {
    const t = this.track();
    if (t) this.marken.set(markeLoeschen(t, name));
  }
  /** Typ einer Marke ändern (Marken bearbeiten) – die Stelle bleibt */
  markeTyp(name: string, typ: string): void {
    const t = this.track();
    if (!t || !typ) return;
    spotifyNotiz(`Marke „${name}“ → ${typ}`);
    this.marken.set(markeTypAendern(t, name, typ));
  }
  /** Schleife: erst A (Anfang), dann B (Ende) an der aktuellen Stelle; ein dritter Tipp hebt sie auf */
  schleifeTippen(): void {
    if (!this.aktiv()) return;
    const sch = this.schleife();
    const hier = Math.round(this.stelle());
    if (!sch) this.schleife.set({ a: hier, b: null });
    else if (sch.b == null) {
      // B vor A getippt: Abschnitt umdrehen; zu kurz (unter 2 s): weiter auf B warten
      if (Math.abs(hier - sch.a) < 2000) return;
      this.schleife.set({ a: Math.min(sch.a, hier), b: Math.max(sch.a, hier) });
      spotifyNotiz(`Schleife ${Math.round(Math.min(sch.a, hier) / 1000)}–${Math.round(Math.max(sch.a, hier) / 1000)} s`);
    } else this.schleife.set(null);
  }
  schleifeAus(): void {
    this.schleife.set(null);
  }
  /** Übergang proben: die letzten 15 s dieses Songs, dann geht es von selbst zum nächsten (ab dessen Einsatz) */
  async uebergangStarten(vorlauf = 15_000): Promise<void> {
    const t = this.track();
    const d = this.dauer();
    if (!t || !d || !this.naechster() || this.startet()) return;
    this.browser?.aktivieren();
    this.schleife.set(null);
    spotifyNotiz(`Übergang zu ${this.naechster()!.titel}`);
    this.uebergang.set(true);
    if (this.aktiv()) await this.springenAuf(d - vorlauf);
    else await this.spielen(t, Math.max(0, d - vorlauf));
    if (!this.spielt() && !this.startet()) this.uebergang.set(false);
  }

  /** nur für Tests: womit gespielt wird */
  antriebSetzen(a: Antrieb): void {
    this.antrieb = a;
  }

  /** Lautstärke des Browser-Players (0–1) */
  lautstaerkeSetzen(v: number): void {
    this.lautstaerke.set(v);
    spotifyLautstaerkeSetzen(v);
    void this.browser?.lautstaerke(v).catch(() => undefined);
  }

  /** Notenansicht: Steuerung abdocken (verschiebbares Feld) bzw. wieder in die Kopfleiste */
  abdockenSetzen(an: boolean): void {
    this.abgedockt.set(an);
    schreiben(DOCK_KEY, an);
  }
  dockPosSetzen(p: { x: number; y: number }, merken = true): void {
    this.dockPos.set(p);
    if (merken) schreiben(DOCK_POS_KEY, p);
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
    if (this.spielt() && this.gestartet) void this.antrieb.pause().catch(() => undefined);
    this.browser?.trennen();
    spotifyAbmelden();
    this.verbunden.set(false);
    this.startet.set(false);
    this.laufen(false, 0);
    this.mitlaufen = this.bestaetigt = false;
    this.offen = null;
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
    spotifyNotiz(`Fehler: ${art}${status ? ` ${status}` : ''}${e instanceof SpotifyFehler ? '' : ` (${String(e).slice(0, 120)})`}`);
    this.startet.set(false);
    if (art === 'anmelden') {
      this.verbunden.set(false);
      this.laufen(false);
      return;
    }
    if (art === 'rechte') {
      // Browser-Player: Zugang ohne das Recht zum Abspielen – die Steuerung zeigt „Spotify neu verbinden“
      this.rechteFehlen.set(true);
      this.laufen(false);
      return;
    }
    // Befehl passte nicht zum Stand bei Spotify (z. B. Pause, obwohl schon angehalten): kein Hinweis nötig
    if (art === 'nichts') {
      this.laufen(false);
      return;
    }
    this.spotifyOeffnen.set(art === 'geraet' && !this.imBrowser());
    if (art === 'geraet' && !this.imBrowser()) {
      // nach „Spotify öffnen“ und der Rückkehr hierher wird der Start wiederholt
      this.offen = this.track() ?? null;
      this.offenZeit = performance.now();
    }
    this.hinweis.set(this.hinweisText(art, status));
  }

  private hinweisText(art: SpotifyFehler['art'], status: number): string {
    if (art === 'browser') return 'Dieser Browser kann Spotify nicht selbst abspielen – Spotify unterstützt das nur in Browsern am Computer (Chrome, Edge, Firefox, Safari). Auf dem Handy in den Einstellungen „Fernsteuerung“ wählen.';
    if (art === 'geraet' && this.imBrowser()) return 'Der Player im Browser ist noch nicht bereit – gleich noch einmal ▶.';
    if (art === 'geraet') return 'Spotify läuft auf keinem Gerät. Öffne die Spotify-App (am Computer: die App oder open.spotify.com in einem Tab), dann noch einmal ▶.';
    if (art === 'premium') {
      schreiben(SPOTIFY_PREMIUM_FEHLT_KEY, true);
      return 'Das geht nur mit Spotify Premium.';
    }
    if (art === 'freigabe') return 'Dein Spotify-Konto ist für die App noch nicht freigeschaltet (Spotify-Developer-Dashboard → User Management).';
    if (status === 429) return 'Spotify nimmt gerade keine weiteren Befehle an (zu viele Anfragen) – kurz warten, dann noch einmal ▶.';
    return status ? `Spotify meldet einen Fehler (${status}) – noch einmal versuchen.` : 'Keine Verbindung zu Spotify – Netz prüfen und noch einmal versuchen.';
  }
}
