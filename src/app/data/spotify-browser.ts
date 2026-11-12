import { SpotifyFehler, SpotifyStand, spotifyLautstaerke, spotifyNotiz, spotifySpielenAuf, spotifyZugang } from './spotify-remote';

// „Im Browser abspielen“ (vierte Fassung von Spotify im Übe- und Probe-Modus): Die Seite wird selbst zum
// Spotify-Gerät – über Spotifys Web Playback SDK (https://sdk.scdn.co/spotify-player.js, erst bei Bedarf geladen).
// Braucht Spotify Premium und einen Zugang mit den Rechten „streaming“, „user-read-email“, „user-read-private“
// (in den Einstellungen neu verbinden). Spotify unterstützt das offiziell nur in Browsern am Computer; auf dem Handy
// meldet das SDK meist einen Initialisierungsfehler – dann bleibt die Fernsteuerung.
// Gestartet wird ein Song über die Web-API auf der Geräte-ID dieses Players, Pause, Weiter, Springen und Lautstärke
// gehen direkt an den Player; seinen Stand meldet er selbst (player_state_changed) – genau, ohne Abfragen bei Spotify.

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
  private bereit: Promise<string> | null = null;
  private fehler: SpotifyFehler | null = null;
  private wartend: ((id: string) => void)[] = [];

  /** stand: jeder neue Stand des Players · fehler: Initialisierung, Zugang, Konto (meldet die Steuerung als Hinweis) */
  constructor(
    private readonly stand: (s: SpotifyStand | null) => void,
    private readonly fehlerMelden: (e: SpotifyFehler) => void,
  ) {}

  /** Player verbinden (beim Öffnen des Modus) – die Geräte-ID kommt, sobald Spotify ihn angemeldet hat */
  verbinden(): Promise<string> {
    this.bereit ??= (async () => {
      await sdk();
      const w = window as SdkFenster;
      const p = new w.Spotify!.Player({
        name: 'Blickfeld Nord (Browser)',
        volume: spotifyLautstaerke(),
        getOAuthToken: (cb) => void spotifyZugang().then(cb, (e) => this.melden(e instanceof SpotifyFehler ? e : new SpotifyFehler('anmelden'))),
      });
      this.player = p;
      const id = new Promise<string>((ok) => this.wartend.push(ok));
      p.addListener('ready', ({ device_id }: { device_id: string }) => {
        spotifyNotiz(`Browser-Player bereit (${device_id.slice(0, 6)}…)`);
        this.geraet = device_id;
        this.wartend.splice(0).forEach((f) => f(device_id));
      });
      p.addListener('not_ready', () => {
        spotifyNotiz('Browser-Player nicht mehr bereit');
        this.geraet = null;
      });
      p.addListener('player_state_changed', (s: SdkStand | null) => this.stand(umrechnen(s)));
      p.addListener('initialization_error', ({ message }: { message: string }) => this.melden(new SpotifyFehler('browser'), message));
      p.addListener('authentication_error', ({ message }: { message: string }) => this.melden(new SpotifyFehler('rechte'), message));
      p.addListener('account_error', ({ message }: { message: string }) => this.melden(new SpotifyFehler('premium'), message));
      p.addListener('playback_error', ({ message }: { message: string }) => spotifyNotiz(`Browser-Player: Wiedergabefehler ${message}`));
      if (!(await p.connect())) throw new SpotifyFehler('browser');
      spotifyNotiz('Browser-Player verbindet …');
      return id;
    })().catch((e) => {
      this.bereit = null;
      throw e;
    });
    return this.bereit;
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
    const id = await Promise.race([this.verbinden(), new Promise<never>((_, fehl) => setTimeout(() => fehl(this.fehler ?? new SpotifyFehler('geraet')), 12_000))]);
    if (this.fehler) throw this.fehler;
    return id;
  }

  async spielen(trackId: string, ab = 0): Promise<void> {
    const id = await this.geraetId();
    try {
      await spotifySpielenAuf(id, trackId, ab);
    } catch (e) {
      // gerade erst angemeldet: Spotify kennt das Gerät noch nicht – kurz warten, noch einmal
      if (!(e instanceof SpotifyFehler) || e.art !== 'geraet') throw e;
      await new Promise((r) => setTimeout(r, 1200));
      await spotifySpielenAuf(id, trackId, ab);
    }
  }
  pause = async () => this.player?.pause();
  weiter = async () => this.player?.resume();
  springen = async (ms: number) => this.player?.seek(Math.max(0, Math.round(ms)));
  lautstaerke = async (v: number) => this.player?.setVolume(v);
  stand_ = async (): Promise<SpotifyStand | null> => umrechnen((await this.player?.getCurrentState().catch(() => null)) ?? null);

  /** Modus verlassen: Player abmelden (Spotify hält dann an) */
  trennen(): void {
    this.player?.disconnect();
    this.player = null;
    this.geraet = null;
    this.bereit = null;
    this.fehler = null;
    this.wartend = [];
  }
}
