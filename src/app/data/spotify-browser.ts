import { SpotifyFehler, SpotifyStand, spotifyLautstaerke, spotifyNotiz, spotifySpielenAuf, spotifyUebertragen, spotifyZugang } from './spotify-remote';

// „Im Browser abspielen“ (vierte Fassung von Spotify im Übe- und Probe-Modus): Die Seite wird selbst zum
// Spotify-Gerät – über Spotifys Web Playback SDK (https://sdk.scdn.co/spotify-player.js, erst bei Bedarf geladen).
// Braucht Spotify Premium und einen Zugang mit den Rechten „streaming“, „user-read-email“, „user-read-private“
// (in den Einstellungen neu verbinden). Spotify unterstützt das offiziell nur in Browsern am Computer; scheitert die
// Initialisierung, meldet die Steuerung das.
// Gestartet wird ein Song über die Web-API auf der Geräte-ID dieses Players, Pause, Weiter, Springen und Lautstärke
// gehen direkt an den Player; seinen Stand meldet er selbst (player_state_changed) – genau, ohne Abfragen bei Spotify.
//
// Ein Player für die ganze Sitzung (nicht einer je Öffnen des Modus): Jeder neue Player meldet sich bei Spotify als
// neues Gerät an, und nach ein paar An- und Abmeldungen kurz hintereinander kannte Spotify das frische Gerät nicht
// mehr („Device not found“, obwohl der Player „bereit“ meldete). Beim Verlassen des Modus wird deshalb nur pausiert;
// abgemeldet wird erst nach 10 Minuten ohne Modus, beim Schließen der Seite und beim Trennen. Kennt Spotify das Gerät
// trotzdem nicht: erst die Wiedergabe dorthin holen, dann den Player neu verbinden – jeweils mit neuem Versuch.

interface SdkTrack {
  id: string | null;
  uri: string;
  duration_ms: number;
  linked_from?: { id: string | null; uri: string | null };
}
interface SdkStand {
  paused: boolean;
  position: number;
  duration: number;
  track_window: { current_track: SdkTrack | null };
}
interface SdkPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(ereignis: string, f: (d: never) => void): boolean;
  getCurrentState(): Promise<SdkStand | null>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(ms: number): Promise<void>;
  setVolume(v: number): Promise<void>;
  activateElement?(): Promise<void>;
}
type SdkFenster = Window & {
  Spotify?: { Player: new (o: { name: string; getOAuthToken: (cb: (t: string) => void) => void; volume: number }) => SdkPlayer };
  onSpotifyWebPlaybackSDKReady?: () => void;
};

const SDK = 'https://sdk.scdn.co/spotify-player.js';
/** so lange bleibt der Player nach dem Verlassen des Modus angemeldet (schneller Wiedereinstieg, kein neues Gerät) */
const NACHLAUF_MS = 10 * 60_000;
const warten = (ms: number) => new Promise((r) => setTimeout(r, ms));

let sdkLaden: Promise<void> | null = null;
function sdk(): Promise<void> {
  const w = window as SdkFenster;
  if (w.Spotify?.Player) return Promise.resolve();
  sdkLaden ??= new Promise<void>((ok, fehl) => {
    const zeit = setTimeout(() => fehl(new SpotifyFehler('netz', 0)), 20_000);
    w.onSpotifyWebPlaybackSDKReady = () => {
      clearTimeout(zeit);
      ok();
    };
    const s = document.createElement('script');
    s.src = SDK;
    s.async = true;
    s.onerror = () => {
      clearTimeout(zeit);
      fehl(new SpotifyFehler('netz', 0));
    };
    document.head.appendChild(s);
  }).catch((e) => {
    sdkLaden = null;
    spotifyNotiz('Browser-Player: Spotify-Bibliothek lädt nicht');
    throw e;
  });
  return sdkLaden;
}

/** Stand des Players in der Form der Fernsteuerung (data/spotify-remote.ts) */
function umrechnen(s: SdkStand | null): SpotifyStand | null {
  const t = s?.track_window.current_track;
  if (!s || !t) return null;
  return { spielt: !s.paused, trackId: t.id, auchId: t.linked_from?.id ?? null, position: s.position, dauer: s.duration || t.duration_ms, geraet: 'dieser Browser' };
}

export class SpotifyBrowser {
  private player: SdkPlayer | null = null;
  private geraet: string | null = null;
  /** läuft gerade eine Anmeldung bei Spotify? (connect bis „ready“) */
  private bereit: Promise<string> | null = null;
  private fehler: SpotifyFehler | null = null;
  private wartend: ((id: string) => void)[] = [];
  private nachlauf: ReturnType<typeof setTimeout> | undefined;
  /** angebunden: der geöffnete Modus (Stand und Fehler gehen an ihn) */
  private stand: (s: SpotifyStand | null) => void = () => undefined;
  private fehlerMelden: (e: SpotifyFehler) => void = () => undefined;

  /** Modus geöffnet: Stand und Fehler an ihn melden, angemeldet bleiben */
  anbinden(stand: (s: SpotifyStand | null) => void, fehler: (e: SpotifyFehler) => void): void {
    clearTimeout(this.nachlauf);
    this.stand = stand;
    this.fehlerMelden = fehler;
  }
  /** Modus verlassen: anhalten, noch eine Weile angemeldet bleiben, dann abmelden */
  loesen(): void {
    this.stand = () => undefined;
    this.fehlerMelden = () => undefined;
    void this.player?.pause().catch(() => undefined);
    clearTimeout(this.nachlauf);
    this.nachlauf = setTimeout(() => this.trennen(), NACHLAUF_MS);
  }

  /** Player anmelden (einmal je Sitzung) – die Geräte-ID kommt, sobald Spotify ihn angemeldet hat */
  verbinden(): Promise<string> {
    if (this.geraet && !this.fehler) return Promise.resolve(this.geraet);
    this.bereit ??= (async () => {
      await sdk();
      this.fehler = null;
      const p = this.player ?? this.anlegen();
      const id = new Promise<string>((ok) => this.wartend.push(ok));
      if (!(await p.connect())) throw new SpotifyFehler('browser');
      spotifyNotiz('Browser-Player verbindet …');
      return id;
    })().finally(() => (this.bereit = null));
    return this.bereit;
  }

  private anlegen(): SdkPlayer {
    const w = window as SdkFenster;
    const p = new w.Spotify!.Player({
      name: 'Blickfeld Nord (Browser)',
      volume: spotifyLautstaerke(),
      getOAuthToken: (cb) => void spotifyZugang().then(cb, (e) => this.melden(e instanceof SpotifyFehler ? e : new SpotifyFehler('anmelden'))),
    });
    this.player = p;
    p.addListener('ready', ({ device_id }: { device_id: string }) => {
      spotifyNotiz(`Browser-Player bereit (${device_id.slice(0, 6)}…)`);
      this.geraet = device_id;
      this.wartend.splice(0).forEach((f) => f(device_id));
    });
    p.addListener('not_ready', ({ device_id }: { device_id: string }) => {
      spotifyNotiz(`Browser-Player nicht mehr bereit (${device_id.slice(0, 6)}…)`);
      if (this.geraet === device_id) this.geraet = null;
    });
    p.addListener('player_state_changed', (s: SdkStand | null) => this.stand(umrechnen(s)));
    p.addListener('initialization_error', ({ message }: { message: string }) => this.melden(new SpotifyFehler('browser'), message));
    p.addListener('authentication_error', ({ message }: { message: string }) => this.melden(new SpotifyFehler('rechte'), message));
    p.addListener('account_error', ({ message }: { message: string }) => this.melden(new SpotifyFehler('premium'), message));
    // „no list was loaded“: Pause beim Verlassen des Modus, obwohl noch nichts geladen war – harmlos, nicht protokollieren
    p.addListener('playback_error', ({ message }: { message: string }) => /no list was loaded/i.test(message) || spotifyNotiz(`Browser-Player: Wiedergabefehler ${message}`));
    // Seite wird geschlossen oder neu geladen: abmelden, sonst bleibt bei Spotify ein totes Gerät stehen
    addEventListener('pagehide', () => this.player?.disconnect());
    return p;
  }

  private melden(e: SpotifyFehler, text = ''): void {
    spotifyNotiz(`Browser-Player: ${e.art}${text ? ` (${text})` : ''}`);
    this.fehler = e;
    this.wartend.splice(0);
    this.fehlerMelden(e);
  }

  /** im Klick aufrufen: Mobil-Browser spielen Ton erst nach einer Berührung ab */
  aktivieren(): void {
    void this.player?.activateElement?.().catch(() => undefined);
  }

  private async geraetId(): Promise<string> {
    if (this.fehler) throw this.fehler;
    if (this.geraet) return this.geraet;
    const id = await Promise.race([this.verbinden(), warten(12_000).then(() => Promise.reject(this.fehler ?? new SpotifyFehler('geraet')))]);
    if (this.fehler) throw this.fehler;
    return id;
  }

  /** abmelden und wieder anmelden (derselbe Player) – Spotify vergibt dabei meist eine neue Geräte-ID */
  private async neuVerbinden(): Promise<string> {
    spotifyNotiz('Browser-Player wird neu verbunden');
    this.player?.disconnect();
    this.geraet = null;
    await warten(500);
    return this.geraetId();
  }

  async spielen(trackId: string, ab = 0): Promise<void> {
    let id = await this.geraetId();
    for (let versuch = 0; ; versuch++) {
      try {
        await spotifySpielenAuf(id, trackId, ab);
        return;
      } catch (e) {
        if (!(e instanceof SpotifyFehler) || e.art !== 'geraet' || versuch >= 2) throw e;
      }
      // Spotify kennt das Gerät (noch) nicht: erst die Wiedergabe dorthin holen, beim zweiten Mal neu verbinden
      if (versuch === 1) id = await this.neuVerbinden();
      spotifyNotiz('Browser-Player: Wiedergabe wird auf diesen Browser geholt');
      await spotifyUebertragen(id).catch(() => undefined);
      await warten(800);
    }
  }
  pause = async () => this.player?.pause();
  weiter = async () => this.player?.resume();
  springen = async (ms: number) => this.player?.seek(Math.max(0, Math.round(ms)));
  lautstaerke = async (v: number) => this.player?.setVolume(v);
  stand_ = async (): Promise<SpotifyStand | null> => umrechnen((await this.player?.getCurrentState().catch(() => null)) ?? null);

  /** abmelden (Trennen, 10 Minuten nach dem Modus): beim nächsten Mal wird neu angemeldet */
  trennen(): void {
    clearTimeout(this.nachlauf);
    if (this.player) spotifyNotiz('Browser-Player abgemeldet');
    this.player?.disconnect();
    this.geraet = null;
    this.fehler = null;
    this.wartend = [];
  }
}

/** der eine Browser-Player dieser Seite */
let einer: SpotifyBrowser | null = null;
export const spotifyBrowser = (): SpotifyBrowser => (einer ??= new SpotifyBrowser());
