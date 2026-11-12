// Spotify fernsteuern (Übe- und Probe-Modus): Die Musik läuft in der Spotify-App bzw. auf einem Spotify-Connect-Gerät
// (Handy, Laptop, Lautsprecher im Proberaum), diese Seite schickt nur Befehle über die Spotify-Web-API. Braucht
// Spotify Premium. Anmeldung je Person und Gerät im Browser (OAuth mit PKCE, ohne Server); der Zugang bleibt auf dem
// Gerät (bn-spotify-*, wird nicht gespiegelt). Ohne Anmeldung bleibt der eingebettete Player (30-Sekunden-Vorschau).
// Spotify-App „Blickfeld Nord“ im Developer-Dashboard: Client-ID unten (nicht geheim), Redirect-URI SPOTIFY_REDIRECT;
// im Entwicklungsmodus müssen die Nutzer dort eingetragen sein (User Management).

export const SPOTIFY_CLIENT_ID = '67d2d4b9c0ed431f932124cc94fbcb97';
const SCOPES = 'user-read-playback-state user-modify-playback-state';
/** zusätzlich für „Im Browser abspielen“ (Web Playback SDK) – verlangt Spotify so, auch Name und E-Mail */
const BROWSER_SCOPES = 'streaming user-read-email user-read-private';
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
  /** von Spotify bestätigte Rechte (ältere Zugänge: fehlt – dann nur Fernsteuerung) */
  scope?: string;
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
/** darf dieser Zugang im Browser abspielen (Web Playback SDK)? Sonst: neu verbinden */
export const spotifyBrowserRechte = () => /\bstreaming\b/.test(lesen<Token>(TOKEN_KEY)?.scope ?? '');

const zufall = (n: number) => {
  const z = crypto.getRandomValues(new Uint8Array(n));
  return btoa(String.fromCharCode(...z)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
async function challenge(verifier: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  return btoa(String.fromCharCode(...h)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** zur Spotify-Anmeldung; danach geht es auf die Seite zurück, von der aus angemeldet wurde */
export async function spotifyAnmelden(zurueck = location.pathname + location.search, art: SpotifyArt = spotifyArt()): Promise<void> {
  const verifier = zufall(64);
  const state = zufall(16);
  schreiben(PKCE_KEY, { verifier, state, zurueck });
  const q = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: spotifyRedirect(),
    code_challenge_method: 'S256',
    code_challenge: await challenge(verifier),
    scope: art === 'browser' ? `${SCOPES} ${BROWSER_SCOPES}` : SCOPES,
    state,
  });
  location.assign(`https://accounts.spotify.com/authorize?${q}`);
}

/**
 * Adresse nach der Rückkehr von der Spotify-Anmeldung einordnen (suche: location.search der Startseite):
 * 'passt' – Antwort auf die hier begonnene Anmeldung · 'abgebrochen' – bei Spotify abgelehnt · 'fremd' – Antwort ohne
 * passende Anmeldung in diesem Browser (in einem anderen Browser begonnen, z. B. weil der Standardbrowser ein anderer
 * ist) · null – hat nichts mit Spotify zu tun
 */
export function spotifyRueckkehr(suche: string): 'passt' | 'abgebrochen' | 'fremd' | null {
  const q = new URLSearchParams(suche);
  if (!q.get('state') || !(q.has('code') || q.has('error'))) return null;
  const passt = lesen<{ state: string }>(PKCE_KEY)?.state === q.get('state');
  if (!passt) return q.has('code') ? 'fremd' : null;
  return q.has('error') ? 'abgebrochen' : 'passt';
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
  const j = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number; scope?: string };
  const alt = lesen<Token>(TOKEN_KEY);
  const t: Token = { access: j.access_token, refresh: j.refresh_token ?? alt?.refresh ?? '', bis: Date.now() + (j.expires_in - 60) * 1000, scope: j.scope ?? alt?.scope };
  schreiben(TOKEN_KEY, t);
  return t;
}

const MELDUNG_KEY = 'bn-spotify-meldung';
/** Ergebnis der letzten Anmeldung für die Seite, auf die es zurückgeht (einmal lesen) */
export function spotifyMeldung(): string {
  try {
    const m = sessionStorage.getItem(MELDUNG_KEY) ?? '';
    sessionStorage.removeItem(MELDUNG_KEY);
    return m;
  } catch {
    return '';
  }
}
const meldungMerken = (text: string) => {
  try {
    sessionStorage.setItem(MELDUNG_KEY, text);
  } catch {
    // ohne Speicher keine Meldung
  }
};

/**
 * Rückkehr von der Anmeldung (suche: location.search, gleich beim Start gemerkt): Code gegen Zugang tauschen, dann
 * zurück auf die Ausgangsseite – mit einer Meldung, wenn es nicht geklappt hat
 */
export async function spotifyAnmeldungAbschliessen(suche: string): Promise<void> {
  const q = new URLSearchParams(suche);
  const p = lesen<{ verifier: string; state: string; zurueck: string }>(PKCE_KEY);
  schreiben(PKCE_KEY, null);
  if (q.has('error')) meldungMerken('Die Anmeldung bei Spotify wurde abgebrochen.');
  else if (p && q.get('code') && q.get('state') === p.state) {
    try {
      await tokenHolen({ grant_type: 'authorization_code', code: q.get('code')!, redirect_uri: spotifyRedirect(), code_verifier: p.verifier });
      meldungMerken('Mit Spotify verbunden ✓');
    } catch (e) {
      const status = e instanceof SpotifyFehler ? e.status : 0;
      meldungMerken(status ? `Verbinden mit Spotify hat nicht geklappt (Fehler ${status}) – bitte noch einmal versuchen.` : 'Verbinden mit Spotify hat nicht geklappt (keine Verbindung) – bitte noch einmal versuchen.');
    }
  }
  location.replace(p?.zurueck || '/backstage');
}

export function spotifyAbmelden(): void {
  zuletztGeraet = null;
  schreiben(TOKEN_KEY, null);
  schreiben(GERAET_KEY, null);
}

/** läuft gerade eine Erneuerung des Zugangs? Dann warten alle darauf – Spotify gibt bei jeder Erneuerung ein neues
 *  Erneuerungs-Token aus, zwei gleichzeitige Erneuerungen mit demselben alten würden die Verbindung kappen */
let erneuerung: Promise<string> | null = null;
/** gültiger Zugangsschlüssel (bei Bedarf erneuert) – auch für den Browser-Player (data/spotify-browser.ts) */
export async function spotifyZugang(frisch = false): Promise<string> {
  return zugang(frisch);
}
async function zugang(frisch = false): Promise<string> {
  const t = lesen<Token>(TOKEN_KEY);
  if (!t?.refresh) throw new SpotifyFehler('anmelden');
  if (!frisch && t.bis > Date.now()) return t.access;
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
 * Pause, obwohl nichts läuft) · netz: sonstiges · browser: dieser Browser kann nicht selbst abspielen · rechte: für den
 * Browser-Player neu verbinden (Zugang ohne „streaming“)
 */
export class SpotifyFehler extends Error {
  /** status: HTTP-Status von Spotify (0: keine Antwort, z. B. offline) – für die Meldung */
  constructor(readonly art: 'anmelden' | 'geraet' | 'premium' | 'freigabe' | 'nichts' | 'netz' | 'browser' | 'rechte', readonly status = 0) {
    super(art);
  }
}

/** 403 von Spotify einordnen: Premium fehlt, Konto nicht freigeschaltet oder Befehl passt gerade nicht */
export function fehler403(text: string): SpotifyFehler['art'] {
  if (/PREMIUM_REQUIRED|premium/i.test(text)) return 'premium';
  if (/not registered|developer dashboard/i.test(text)) return 'freigabe';
  return 'nichts';
}

// ---- Diagnose ---------------------------------------------------------------------------------------------------
// Protokoll der letzten Befehle und Antworten (nur auf diesem Gerät, wird nicht gespiegelt; ohne Zugangsschlüssel,
// Geräte-IDs gekürzt) – in den Einstellungen einsehbar und kopierbar, wenn die Fernsteuerung irgendwo nicht tut, was
// sie soll: Was Spotify einem echten Konto antwortet, lässt sich nur dort sehen.
const PROTOKOLL_KEY = 'bn-spotify-protokoll';
const PROTOKOLL_LAENGE = 150;
let protokoll: string[] | null = null;
export function spotifyNotiz(text: string): void {
  protokoll ??= lesen<string[]>(PROTOKOLL_KEY) ?? [];
  const z = new Date();
  protokoll.push(`${z.toTimeString().slice(0, 8)}.${Math.floor(z.getMilliseconds() / 100)} ${text}`);
  if (protokoll.length > PROTOKOLL_LAENGE) protokoll.splice(0, protokoll.length - PROTOKOLL_LAENGE);
  schreiben(PROTOKOLL_KEY, protokoll);
}
export const spotifyProtokoll = (): string[] => [...(protokoll ?? lesen<string[]>(PROTOKOLL_KEY) ?? [])];
export function spotifyProtokollLeeren(): void {
  protokoll = [];
  schreiben(PROTOKOLL_KEY, null);
}
/** Kopfzeilen fürs Protokoll: Einstellungen und Zustand dieses Geräts (ohne Schlüssel) */
export function spotifyLage(): string[] {
  const t = lesen<Token>(TOKEN_KEY);
  const passt = (a: string) => typeof matchMedia === 'function' && matchMedia(a).matches;
  return [
    `Einstellung: ${spotifyArt()} · verbunden: ${t?.refresh ? 'ja' : 'nein'}${t?.refresh ? ` · Zugang gilt noch ${Math.round((t.bis - Date.now()) / 60000)} min · Rechte: ${t.scope ?? 'unbekannt (älterer Zugang)'}` : ''}`,
    `mitspielen: ${spotifyMitspielen() ? 'ja' : 'nein'} · Gerät gewählt: ${idKurz(lesen<string>(GERAET_KEY) ?? '') || 'automatisch'} · zuletzt: ${idKurz(zuletztGeraet ?? '') || '–'}`,
    `Fenster: ${passt('(display-mode: fullscreen)') ? 'Vollbild-App' : passt('(display-mode: standalone)') ? 'App-Fenster' : 'Browser-Tab'} · ${passt('(pointer: coarse)') ? 'Touch' : 'Maus'} · ${typeof navigator === 'undefined' ? '' : navigator.userAgent}`,
  ];
}
const idKurz = (id: string) => (id.length > 6 ? `${id.slice(0, 6)}…` : id);
const geraeteKurz = (text: string) => text.replace(/(device_id=)([^&\s]+)/g, (_, a: string, id: string) => a + idKurz(decodeURIComponent(id))).replace(/("device_ids":\[")([^"]+)/g, (_, a: string, id: string) => a + idKurz(id));
/** Antwort von Spotify in einer Zeile: Wiedergabestand, Geräteliste, sonst der Anfang */
function antwortKurz(j: unknown): string {
  const o = (j ?? {}) as { is_playing?: boolean; progress_ms?: number | null; currently_playing_type?: string; item?: { id?: string; duration_ms?: number; linked_from?: { id?: string } } | null; device?: { name?: string; type?: string; is_active?: boolean } | null; devices?: { id?: string; name?: string; type?: string; is_active?: boolean; is_restricted?: boolean }[] };
  if (Array.isArray(o.devices)) return o.devices.length ? o.devices.map((g) => `${g.name} (${g.type}, ${g.is_active ? 'aktiv' : 'nicht aktiv'}${g.is_restricted ? ', gesperrt' : ''}, ${idKurz(g.id ?? '')})`).join(' · ') : 'keine Geräte';
  if ('is_playing' in o) return `spielt=${o.is_playing} stelle=${o.progress_ms} titel=${o.item ? o.item.id : 'keiner'}${o.item?.linked_from?.id ? ` (statt ${o.item.linked_from.id})` : ''} dauer=${o.item?.duration_ms ?? '?'} art=${o.currently_playing_type ?? '?'} gerät=${o.device ? `${o.device.name} (${o.device.type}, ${o.device.is_active ? 'aktiv' : 'nicht aktiv'})` : 'keins'}`;
  return JSON.stringify(j).slice(0, 160);
}

async function api<T = void>(pfad: string, init: RequestInit = {}): Promise<T | null> {
  const methode = init.method ?? 'GET';
  const befehl = methode !== 'GET';
  const beginn = performance.now();
  const notiz = (ergebnis: string) => spotifyNotiz(`${methode} ${geraeteKurz(pfad)}${typeof init.body === 'string' ? ` ${geraeteKurz(init.body)}` : ''} → ${ergebnis} (${Math.round(performance.now() - beginn)} ms)`);
  const warten = (r: Response) => (r.headers.get('Retry-After') ? ` Retry-After ${r.headers.get('Retry-After')} s` : '');
  const senden = async (frisch = false) => {
    try {
      return await fetch(API + pfad, { ...init, headers: { ...init.headers, Authorization: `Bearer ${await zugang(frisch)}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) } });
    } catch (e) {
      // keine Antwort (offline, Verbindung abgebrochen) – oder der Zugang ließ sich nicht erneuern
      const f = e instanceof SpotifyFehler ? e : new SpotifyFehler('netz', 0);
      notiz(f.art === 'netz' && !f.status ? 'keine Antwort' : `Zugang: ${f.art}${f.status ? ` ${f.status}` : ''}`);
      throw f;
    }
  };
  let res = await senden();
  // Befehle (Abspielen, Pause, Springen) scheitern bei Spotify gelegentlich kurz mit 5xx bzw. 429: einmal neu versuchen
  if (befehl && (res.status >= 500 || res.status === 429)) {
    notiz(`${res.status}${warten(res)} – zweiter Versuch`);
    await new Promise((r) => setTimeout(r, 700));
    res = await senden();
  }
  // Zugang abgelaufen, obwohl er nach der Uhr dieses Geräts noch gelten müsste: einmal erneuern und wiederholen
  if (res.status === 401) {
    notiz('401 – Zugang wird erneuert');
    res = await senden(true);
  }
  if (res.status === 204 || res.status === 202) {
    notiz(String(res.status));
    return null;
  }
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    notiz(`${res.status}${warten(res)} ${text.replace(/\s+/g, ' ').slice(0, 200)}`);
    if (res.status === 401) {
      spotifyAbmelden();
      throw new SpotifyFehler('anmelden', 401);
    }
    if (res.status === 404) throw new SpotifyFehler('geraet', 404);
    if (res.status === 403) throw new SpotifyFehler(fehler403(text), 403);
    throw new SpotifyFehler('netz', res.status);
  }
  // Befehle: die Antwort ist ohne Belang – Spotify schickt bei Erfolg teils Text, der kein JSON ist
  if (befehl) {
    notiz(String(res.status));
    return null;
  }
  if (!text) {
    notiz(`${res.status} leer`);
    return null;
  }
  try {
    const j = JSON.parse(text) as T;
    notiz(`${res.status} ${antwortKurz(j)}`);
    return j;
  } catch {
    notiz(`${res.status} kein JSON: ${text.slice(0, 80)}`);
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

/** Gerät, auf dem zuletzt erfolgreich gestartet wurde – der nächste Befehl geht direkt dorthin (ohne erst die
 *  Geräteliste zu holen): schneller, und es klappt auch, wenn Spotify das Gerät nach einer Pause nicht mehr listet */
let zuletztGeraet: string | null = null;
const geraetWeg = (e: unknown) => e instanceof SpotifyFehler && e.art === 'geraet';

/** Song von vorn (oder ab Position) spielen */
export async function spotifySpielen(trackId: string, positionMs = 0): Promise<void> {
  const starten = (geraet: string) => api(`/me/player/play?device_id=${encodeURIComponent(geraet)}`, { method: 'PUT', body: JSON.stringify({ uris: [`spotify:track:${trackId}`], position_ms: Math.max(0, Math.round(positionMs)) }) });
  /** Gerät ist da, aber gerade nicht aktiv: erst die Wiedergabe dorthin holen, dann noch einmal */
  const wecken = async (geraet: string) => {
    await api('/me/player', { method: 'PUT', body: JSON.stringify({ device_ids: [geraet], play: false }) });
    await new Promise((r) => setTimeout(r, 700));
    await starten(geraet);
  };
  const gewaehlt = lesen<string>(GERAET_KEY);
  const bekannt = zuletztGeraet && (!gewaehlt || gewaehlt === zuletztGeraet) ? zuletztGeraet : null;
  if (bekannt) {
    try {
      await starten(bekannt);
      return;
    } catch (e) {
      if (!geraetWeg(e)) throw e;
    }
  }
  // Spotify listet das Gerät nach einer Pause oft nicht mehr – dann das zuletzt benutzte versuchen
  const geraet = (await zielGeraet()) ?? bekannt;
  if (!geraet) throw new SpotifyFehler('geraet');
  try {
    if (geraet === bekannt) await wecken(geraet);
    else await starten(geraet);
  } catch (e) {
    if (!geraetWeg(e) || geraet === bekannt) throw e;
    await wecken(geraet);
  }
  zuletztGeraet = geraet;
}
/** Wiedergabe auf dieses Gerät holen (ohne abzuspielen) – macht es bei Spotify zum aktiven Gerät */
export async function spotifyUebertragen(geraet: string): Promise<void> {
  await api('/me/player', { method: 'PUT', body: JSON.stringify({ device_ids: [geraet], play: false }) });
}
/** Song auf genau diesem Gerät spielen (Browser-Player: dessen Geräte-ID) – ohne Geräteliste und Wecken */
export async function spotifySpielenAuf(geraet: string, trackId: string, positionMs = 0): Promise<void> {
  await api(`/me/player/play?device_id=${encodeURIComponent(geraet)}`, { method: 'PUT', body: JSON.stringify({ uris: [`spotify:track:${trackId}`], position_ms: Math.max(0, Math.round(positionMs)) }) });
}
export const spotifyPause = () => api('/me/player/pause', { method: 'PUT' });
/** pausierten Song fortsetzen – auf dem zuletzt benutzten Gerät, auch wenn es inzwischen nicht mehr „aktiv“ ist */
export const spotifyWeiter = () => api(`/me/player/play${zuletztGeraet ? `?device_id=${encodeURIComponent(zuletztGeraet)}` : ''}`, { method: 'PUT' });
export const spotifySpringen = (ms: number) => api(`/me/player/seek?position_ms=${Math.max(0, Math.round(ms))}`, { method: 'PUT' });

export const spotifyGeraetWaehlen = (id: string) => {
  zuletztGeraet = null;
  schreiben(GERAET_KEY, id || null);
};
export const spotifyGewaehltesGeraet = () => lesen<string>(GERAET_KEY) ?? '';
export const spotifyMitspielen = () => lesen<boolean>(MITSPIELEN_KEY) !== false;
export const spotifyMitspielenSetzen = (an: boolean) => schreiben(MITSPIELEN_KEY, an);

/** Spotify im Übe- und Probe-Modus (Einstellungen, je Gerät): gar nicht, eingebetteter Player (30-Sekunden-Vorschau auf
 *  dem Handy), Fernsteuerung der Spotify-App (Premium) oder im Browser abspielen – die Seite ist selbst das
 *  Spotify-Gerät (Web Playback SDK, Premium, data/spotify-browser.ts) */
export type SpotifyArt = 'aus' | 'vorschau' | 'fern' | 'browser';
/** Fernsteuerung oder Browser-Player: beide über data/spotify-spieler.ts mit derselben Steuerung */
export const spotifyGesteuert = (a: SpotifyArt) => a === 'fern' || a === 'browser';
export const SPOTIFY_ART_KEY = 'bn-spotify-modus';
export function spotifyArt(): SpotifyArt {
  const v = lesen<string>(SPOTIFY_ART_KEY);
  return v === 'vorschau' || v === 'fern' || v === 'browser' ? v : 'aus';
}
export const spotifyArtSetzen = (a: SpotifyArt) => schreiben(SPOTIFY_ART_KEY, a === 'aus' ? null : a);

/** Lautstärke des Browser-Players (0–1, je Gerät) */
const LAUTSTAERKE_KEY = 'bn-spotify-lautstaerke';
export const spotifyLautstaerke = () => {
  const v = lesen<number>(LAUTSTAERKE_KEY);
  return typeof v === 'number' && v >= 0 && v <= 1 ? v : 0.8;
};
export const spotifyLautstaerkeSetzen = (v: number) => schreiben(LAUTSTAERKE_KEY, Math.min(1, Math.max(0, v)));
