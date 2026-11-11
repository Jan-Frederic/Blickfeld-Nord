// Spotify fernsteuern (Übe- und Probe-Modus): Die Musik läuft in der Spotify-App bzw. auf einem Spotify-Connect-Gerät
// (Handy, Laptop, Lautsprecher im Proberaum), diese Seite schickt nur Befehle über die Spotify-Web-API. Braucht
// Spotify Premium. Anmeldung je Person und Gerät im Browser (OAuth mit PKCE, ohne Server); der Zugang bleibt auf dem
// Gerät (bn-spotify-*, wird nicht gespiegelt). Ohne Anmeldung bleibt der eingebettete Player (30-Sekunden-Vorschau).
// Spotify-App „Blickfeld Nord“ im Developer-Dashboard: Client-ID unten (nicht geheim), Redirect-URI SPOTIFY_REDIRECT;
// im Entwicklungsmodus müssen die Nutzer dort eingetragen sein (User Management).

export const SPOTIFY_CLIENT_ID = '67d2d4b9c0ed431f932124cc94fbcb97';
const SCOPES = 'user-read-playback-state user-modify-playback-state';
const TOKEN_KEY = 'bn-spotify-token';
const PKCE_KEY = 'bn-spotify-pkce';
export const GERAET_KEY = 'bn-spotify-geraet';
export const MITSPIELEN_KEY = 'bn-spotify-mitspielen';
const API = 'https://api.spotify.com/v1';

/** Rücksprung nach der Anmeldung: die Startseite (so im Spotify-Dashboard eingetragen) */
export const spotifyRedirect = () => `${location.origin}/`;

interface Token {
  access: string;
  refresh: string;
  /** ms seit 1970 */
  bis: number;
}

const lesen = <T>(k: string): T | null => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? 'null') as T | null;
  } catch {
    return null;
  }
};
const schreiben = (k: string, v: unknown): void => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {
    // ohne Speicher keine Anmeldung über das Neuladen hinaus
  }
};

export const spotifyVerbunden = () => !!lesen<Token>(TOKEN_KEY)?.refresh;

const zufall = (n: number) => {
  const z = crypto.getRandomValues(new Uint8Array(n));
  return btoa(String.fromCharCode(...z)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
async function challenge(verifier: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  return btoa(String.fromCharCode(...h)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** zur Spotify-Anmeldung; danach geht es auf die Seite zurück, von der aus angemeldet wurde */
export async function spotifyAnmelden(zurueck = location.pathname + location.search): Promise<void> {
  const verifier = zufall(64);
  const state = zufall(16);
  schreiben(PKCE_KEY, { verifier, state, zurueck });
  const q = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: spotifyRedirect(),
    code_challenge_method: 'S256',
    code_challenge: await challenge(verifier),
    scope: SCOPES,
    state,
  });
  location.assign(`https://accounts.spotify.com/authorize?${q}`);
}

/** gehört die aktuelle Adresse zur Rückkehr von der Spotify-Anmeldung? (ohne Spotify-Code zu laden) */
export function istSpotifyRueckkehr(): boolean {
  if (typeof location === 'undefined') return false;
  const q = new URLSearchParams(location.search);
  return (q.has('code') || q.has('error')) && !!q.get('state') && lesen<{ state: string }>(PKCE_KEY)?.state === q.get('state');
}

async function tokenHolen(body: Record<string, string>): Promise<Token> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID, ...body }),
  }).catch(() => {
    throw new SpotifyFehler('netz', 0);
  });
  // 400/401: Zugang ungültig (neu verbinden); alles andere ist vorübergehend
  if (!res.ok) throw new SpotifyFehler(res.status === 400 || res.status === 401 ? 'anmelden' : 'netz', res.status);
  const j = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
  const alt = lesen<Token>(TOKEN_KEY);
  const t: Token = { access: j.access_token, refresh: j.refresh_token ?? alt?.refresh ?? '', bis: Date.now() + (j.expires_in - 60) * 1000 };
  schreiben(TOKEN_KEY, t);
  return t;
}

/** Rückkehr von der Anmeldung: Code gegen Zugang tauschen, dann zurück auf die Ausgangsseite */
export async function spotifyAnmeldungAbschliessen(): Promise<void> {
  const q = new URLSearchParams(location.search);
  const p = lesen<{ verifier: string; state: string; zurueck: string }>(PKCE_KEY);
  schreiben(PKCE_KEY, null);
  if (p && q.get('code') && q.get('state') === p.state) {
    try {
      await tokenHolen({ grant_type: 'authorization_code', code: q.get('code')!, redirect_uri: spotifyRedirect(), code_verifier: p.verifier });
    } catch {
      // bleibt ohne Verbindung – die Steuerung bietet die Anmeldung erneut an
    }
  }
  location.replace(p?.zurueck || '/backstage');
}

export function spotifyAbmelden(): void {
  schreiben(TOKEN_KEY, null);
  schreiben(GERAET_KEY, null);
}

/** läuft gerade eine Erneuerung des Zugangs? Dann warten alle darauf – Spotify gibt bei jeder Erneuerung ein neues
 *  Erneuerungs-Token aus, zwei gleichzeitige Erneuerungen mit demselben alten würden die Verbindung kappen */
let erneuerung: Promise<string> | null = null;
async function zugang(): Promise<string> {
  const t = lesen<Token>(TOKEN_KEY);
  if (!t?.refresh) throw new SpotifyFehler('anmelden');
  if (t.bis > Date.now()) return t.access;
  erneuerung ??= tokenHolen({ grant_type: 'refresh_token', refresh_token: t.refresh })
    .then((n) => n.access)
    .catch((e) => {
      // nur wenn Spotify den Zugang ablehnt, ist die Verbindung weg – bei Netzproblemen bleibt sie
      if (e instanceof SpotifyFehler && e.art === 'anmelden') spotifyAbmelden();
      throw e instanceof SpotifyFehler ? e : new SpotifyFehler('netz', 0);
    })
    .finally(() => (erneuerung = null));
  return erneuerung;
}

/**
 * anmelden: (neu) verbinden · geraet: kein aktives Spotify · premium: nur mit Premium · freigabe: Konto ist in der
 * Spotify-App (Developer-Dashboard → User Management) nicht eingetragen · nichts: Befehl passt gerade nicht (z. B.
 * Pause, obwohl nichts läuft) · netz: sonstiges
 */
export class SpotifyFehler extends Error {
  /** status: HTTP-Status von Spotify (0: keine Antwort, z. B. offline) – für die Meldung */
  constructor(readonly art: 'anmelden' | 'geraet' | 'premium' | 'freigabe' | 'nichts' | 'netz', readonly status = 0) {
    super(art);
  }
}

/** 403 von Spotify einordnen: Premium fehlt, Konto nicht freigeschaltet oder Befehl passt gerade nicht */
export function fehler403(text: string): SpotifyFehler['art'] {
  if (/PREMIUM_REQUIRED|premium/i.test(text)) return 'premium';
  if (/not registered|developer dashboard/i.test(text)) return 'freigabe';
  return 'nichts';
}

async function api<T = void>(pfad: string, init: RequestInit = {}): Promise<T | null> {
  const befehl = !!init.method && init.method !== 'GET';
  const senden = async () => {
    try {
      return await fetch(API + pfad, { ...init, headers: { ...init.headers, Authorization: `Bearer ${await zugang()}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) } });
    } catch (e) {
      if (e instanceof SpotifyFehler) throw e;
      // keine Antwort (offline, Verbindung abgebrochen)
      throw new SpotifyFehler('netz', 0);
    }
  };
  let res = await senden();
  // Befehle (Abspielen, Pause, Springen) scheitern bei Spotify gelegentlich kurz mit 5xx bzw. 429: einmal neu versuchen
  if (befehl && (res.status >= 500 || res.status === 429)) {
    await new Promise((r) => setTimeout(r, 700));
    res = await senden();
  }
  if (res.status === 204 || res.status === 202) return null;
  if (res.status === 401) {
    spotifyAbmelden();
    throw new SpotifyFehler('anmelden', 401);
  }
  if (res.status === 404) throw new SpotifyFehler('geraet', 404);
  if (res.status === 403) throw new SpotifyFehler(fehler403(await res.text().catch(() => '')), 403);
  if (!res.ok) throw new SpotifyFehler('netz', res.status);
  // Befehle: die Antwort ist ohne Belang – Spotify schickt bei Erfolg teils Text, der kein JSON ist
  if (befehl) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new SpotifyFehler('netz', res.status);
  }
}

export interface SpotifyGeraet {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}
export interface SpotifyStand {
  spielt: boolean;
  trackId: string | null;
  /** ursprünglich gewünschter Track, wenn Spotify eine andere Fassung spielt */
  auchId: string | null;
  position: number;
  dauer: number;
  geraet: string | null;
}

export async function spotifyGeraete(): Promise<SpotifyGeraet[]> {
  return (await api<{ devices: SpotifyGeraet[] }>('/me/player/devices'))?.devices ?? [];
}

export async function spotifyStand(): Promise<SpotifyStand | null> {
  const s = await api<{ is_playing: boolean; progress_ms: number | null; item: { id: string; duration_ms: number; linked_from?: { id: string } } | null; device: { id: string; name: string } | null }>('/me/player');
  if (!s) return null;
  // Spotify ersetzt nicht verfügbare Fassungen eines Songs durch eine andere („linked_from“ nennt die gewünschte)
  return { spielt: s.is_playing, trackId: s.item?.id ?? null, auchId: s.item?.linked_from?.id ?? null, position: s.progress_ms ?? 0, dauer: s.item?.duration_ms ?? 0, geraet: s.device?.name ?? null };
}

/** gewähltes Gerät (sonst das aktive bzw. erste) */
async function zielGeraet(): Promise<string | undefined> {
  const gewaehlt = lesen<string>(GERAET_KEY);
  const liste = await spotifyGeraete();
  if (gewaehlt && liste.some((g) => g.id === gewaehlt)) return gewaehlt;
  return (liste.find((g) => g.is_active) ?? liste.find((g) => g.type === 'Smartphone') ?? liste[0])?.id;
}

/** Song von vorn (oder ab Position) spielen */
export async function spotifySpielen(trackId: string, positionMs = 0): Promise<void> {
  const geraet = await zielGeraet();
  if (!geraet) throw new SpotifyFehler('geraet');
  const starten = () => api(`/me/player/play?device_id=${encodeURIComponent(geraet)}`, { method: 'PUT', body: JSON.stringify({ uris: [`spotify:track:${trackId}`], position_ms: positionMs }) });
  try {
    await starten();
  } catch (e) {
    // Gerät ist da, aber gerade nicht aktiv: erst die Wiedergabe dorthin holen, dann noch einmal
    if (!(e instanceof SpotifyFehler) || e.art !== 'geraet') throw e;
    await api('/me/player', { method: 'PUT', body: JSON.stringify({ device_ids: [geraet], play: false }) });
    await new Promise((r) => setTimeout(r, 700));
    await starten();
  }
}
export const spotifyPause = () => api('/me/player/pause', { method: 'PUT' });
export const spotifyWeiter = () => api('/me/player/play', { method: 'PUT' });
export const spotifySpringen = (ms: number) => api(`/me/player/seek?position_ms=${Math.max(0, Math.round(ms))}`, { method: 'PUT' });

export const spotifyGeraetWaehlen = (id: string) => schreiben(GERAET_KEY, id || null);
export const spotifyGewaehltesGeraet = () => lesen<string>(GERAET_KEY) ?? '';
export const spotifyMitspielen = () => lesen<boolean>(MITSPIELEN_KEY) !== false;
export const spotifyMitspielenSetzen = (an: boolean) => schreiben(MITSPIELEN_KEY, an);

/** Spotify im Übe- und Probe-Modus (Einstellungen, je Gerät): gar nicht, eingebetteter Player (30-Sekunden-Vorschau auf
 *  dem Handy) oder Fernsteuerung der Spotify-App (Premium) */
export type SpotifyArt = 'aus' | 'vorschau' | 'fern';
export const SPOTIFY_ART_KEY = 'bn-spotify-modus';
export function spotifyArt(): SpotifyArt {
  const v = lesen<string>(SPOTIFY_ART_KEY);
  return v === 'vorschau' || v === 'fern' ? v : 'aus';
}
export const spotifyArtSetzen = (a: SpotifyArt) => schreiben(SPOTIFY_ART_KEY, a === 'aus' ? null : a);
