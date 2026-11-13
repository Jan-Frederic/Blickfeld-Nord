import type { AccountInfo, AuthenticationResult, IPublicClientApplication } from '@azure/msal-browser';
import { ONEDRIVE, clientId } from './onedrive-config';
import { DeltaItem, DeltaStand, deltaAnwenden, deltaDateien, deltaGueltig } from './cloud-delta';

// OneDrive über Microsoft Graph – Anmeldung mit MSAL (Microsoft Authentication Library), nur im Browser, ohne Server.
// Angetippt („Mit Microsoft anmelden“) öffnet sich sofort das Anmelde-Fenster – noch im selben Moment, sonst blockt
// Safari es (dafür lädt die Seite mit dem Knopf die Bibliothek vorab: oneDriveVorbereiten). Im Hintergrund wird nur
// still angemeldet (ssoSilent, nie ein Fenster). Klappt das Fenster nicht (blockiert, keine Antwort), gibt es die
// Anmeldung per Weiterleitung (die ganze Seite geht zu Microsoft und kommt zurück). Antwortseite für alles: /auth/
// (scripts/auth-seite.mjs); die Bibliothek wird erst beim ersten Verbinden geladen.
// Files.ReadWrite.All: auch Ordner, die jemand anderes mit einem teilt (z. B. der Band-Ordner „Sync“ eines Mitglieds)
const SCOPES = ['User.Read', 'Files.ReadWrite.All'];
const GRAPH = 'https://graph.microsoft.com/v1.0';

export const oneDriveEingerichtet = () => !!clientId();

let app: Promise<IPublicClientApplication> | undefined;
let appFuer = '';
/** fertig geladen – damit ein Antippen das Anmelde-Fenster ohne Warten öffnen kann */
let fertig: IPublicClientApplication | null = null;
let modul: typeof import('@azure/msal-browser') | null = null;
/** Ergebnis einer Anmeldung per Weiterleitung (beim Laden der Seite nach der Rückkehr von Microsoft) */
let weiterleitung: Promise<AuthenticationResult | null> = Promise.resolve(null);
function msal(): Promise<IPublicClientApplication> {
  // neue Client-ID (in den Einstellungen geändert) → neu anlegen
  if (appFuer !== clientId()) {
    app = undefined;
    fertig = null;
  }
  appFuer = clientId();
  app ??= import('@azure/msal-browser')
    .then((m) => {
      modul = m;
      return m.createStandardPublicClientApplication({
        auth: { clientId: appFuer, authority: `https://login.microsoftonline.com/${ONEDRIVE.tenant}`, redirectUri: `${location.origin}/auth/` },
        cache: { cacheLocation: 'localStorage' },
        // navigatePopups: Fenster sofort öffnen (erst danach lädt MSAL, was es braucht) – sonst blockt Safari es;
        // popupBridgeTimeout: Zeit für Passwort, Code per SMS … (dass das Fenster zugeht, merken wir selbst)
        system: { navigatePopups: true, popupBridgeTimeout: FENSTER_HOECHSTENS_MS },
      });
    })
    .then((m) => {
      anmeldungBehalten();
      weiterleitung = m.handleRedirectPromise().then((r) => {
        if (r?.account) {
          m.setActiveAccount(r.account);
          kontoMerken(r.account.username);
        }
        return r;
      });
      weiterleitung.catch(() => undefined);
      fertig = m;
      return m;
    })
    .catch((e) => {
      // Laden fehlgeschlagen (z. B. schlechtes Netz): beim nächsten Versuch neu laden statt für immer zu scheitern
      app = undefined;
      throw new AnmeldeFehler('netz', 'Die Anmeldung von Microsoft ließ sich nicht laden – bei besserem Netz noch einmal versuchen.', e);
    });
  return app;
}

/** Bibliothek vorab laden (Seiten mit „Mit Microsoft anmelden“) – dann öffnet ein Antippen das Fenster sofort */
export function oneDriveVorbereiten(): void {
  if (oneDriveEingerichtet()) msal().catch(() => undefined);
}

const FENSTER_HOECHSTENS_MS = 10 * 60_000;
/** nach dem Schließen des Fensters so lange auf die Antwort warten, wenn die Antwortseite sich nicht gemeldet hat */
const NACH_SCHLIESSEN_MS = 6000;

export type AnmeldeArt = 'blockiert' | 'geschlossen' | 'zeit' | 'netz' | 'sonst';
/** verständliche Meldung zur Anmeldung; art sagt der Seite, ob „Ohne Pop-up anmelden“ helfen kann */
export class AnmeldeFehler extends Error {
  override name = 'AnmeldeFehler';
  constructor(
    readonly art: AnmeldeArt,
    text: string,
    cause?: unknown,
  ) {
    super(text, { cause });
  }
}
/** Pop-up-Probleme: die Anmeldung per Weiterleitung kommt ohne Fenster aus */
export const weiterleitungHilft = (e: unknown) => e instanceof AnmeldeFehler && (e.art === 'blockiert' || e.art === 'zeit' || e.art === 'geschlossen');

/** Fehler von MSAL (errorCode) bzw. des Browsers in eine verständliche Meldung übersetzen */
export function anmeldeFehler(e: unknown): AnmeldeFehler {
  if (e instanceof AnmeldeFehler) return e;
  const code = String((e as { errorCode?: string })?.errorCode ?? '');
  if (code === 'popup_window_error' || code === 'empty_window_error')
    return new AnmeldeFehler('blockiert', 'Das Anmelde-Fenster wurde blockiert. Noch einmal antippen – oder „Ohne Pop-up anmelden“.', e);
  if (code === 'user_cancelled' || code === 'interaction_in_progress_cancelled')
    return new AnmeldeFehler('geschlossen', 'Anmeldung abgebrochen – das Anmelde-Fenster wurde geschlossen.', e);
  if (code === 'timed_out' || code === 'monitor_window_timeout')
    return new AnmeldeFehler('zeit', 'Vom Anmelde-Fenster kam keine Antwort. Noch einmal versuchen – oder „Ohne Pop-up anmelden“.', e);
  if (['no_network_connectivity', 'post_request_failed', 'get_request_failed', 'network_error', 'endpoints_resolution_error', 'failed_to_parse_response'].includes(code) || (e as Error)?.name === 'TypeError')
    return new AnmeldeFehler('netz', 'Keine Verbindung zu Microsoft – bei besserem Netz noch einmal versuchen.', e);
  const text = (e as Error)?.message || code || 'unbekannter Fehler';
  return new AnmeldeFehler('sonst', `Anmeldung nicht möglich: ${text}`, e);
}

/** Antwortseite /auth/ meldet sich (scripts/auth/bridge.js) – so wissen wir, dass das Fenster nicht einfach zuging */
export const ANTWORT_KEY = 'bn-auth-antwort';

/**
 * Auf das Anmelde-Fenster warten: Geht es zu, ohne dass sich die Antwortseite gemeldet hat, nach kurzer Gnadenfrist
 * „geschlossen“ – statt bis zur Zeitgrenze von MSAL zu warten. Hat sie sich gemeldet, läuft der Tausch gegen den
 * Zugang (Netz) einfach weiter.
 */
export function mitFensterWache<T>(
  arbeit: Promise<T>,
  fenster: () => { closed: boolean } | null,
  angekommen: () => boolean,
  o: { takt?: number; gnade?: number; warten?: (ms: number) => Promise<unknown> } = {},
): Promise<T> {
  const takt = o.takt ?? 500;
  const gnade = o.gnade ?? NACH_SCHLIESSEN_MS;
  const warten = o.warten ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  let fertig = false;
  const wache = (async (): Promise<never> => {
    while (!fertig) {
      await warten(takt);
      const f = fenster();
      if (fertig || !f?.closed || angekommen()) continue;
      for (let t = 0; t < gnade && !fertig && !angekommen(); t += takt) await warten(takt);
      if (!fertig && !angekommen()) throw new AnmeldeFehler('geschlossen', 'Anmeldung abgebrochen – das Anmelde-Fenster wurde geschlossen, bevor Microsoft geantwortet hat.');
    }
    return new Promise<never>(() => undefined);
  })();
  return Promise.race([arbeit, wache]).finally(() => (fertig = true));
}

// MSAL verschlüsselt die gespeicherte Anmeldung mit einem Schlüssel in einem Sitzungs-Cookie – endet die
// Browser-Sitzung (App beendet), ist der Schlüssel weg und man müsste sich neu anmelden. Den Cookie machen wir
// dauerhaft (400 Tage, mehr erlauben Browser nicht), damit die Anmeldung auf dem Gerät bleibt.
const SCHLUESSEL_COOKIE = 'msal.cache.encryption';
function anmeldungBehalten(): void {
  const name = encodeURIComponent(SCHLUESSEL_COOKIE);
  const wert = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(name + '='))
    ?.slice(name.length + 1);
  if (wert) document.cookie = `${name}=${wert};path=/;max-age=${400 * 86400};SameSite=None;Secure`;
}

/** schon verbundenes Konto (ohne Netz, aus dem Speicher von MSAL) */
export async function oneDriveKonto(): Promise<AccountInfo | null> {
  if (!oneDriveEingerichtet()) return null;
  const m = await msal();
  return m.getActiveAccount() ?? m.getAllAccounts()[0] ?? null;
}

/**
 * Verbinden. Angetippt (still=false): vorhandenes Konto, sonst sofort das Anmelde-Fenster – ohne vorher übers Netz zu
 * gehen, sonst blockt Safari das Fenster. Fehler kommen als AnmeldeFehler mit verständlicher Meldung.
 * still=true (automatisch im Hintergrund): nur über die vorhandene Microsoft-Anmeldung im Browser (SSO), sonst null.
 */
export function oneDriveAnmelden(still = false): Promise<AccountInfo | null> {
  // schon geladen: ohne ein einziges await zum Fenster (zählt noch als Antippen)
  if (!still && fertig) {
    const k = fertig.getActiveAccount() ?? fertig.getAllAccounts()[0];
    return k ? Promise.resolve(k) : popupAnmelden(fertig);
  }
  return (async () => {
    const m = await msal();
    const vorhanden = await oneDriveKonto();
    if (vorhanden) return vorhanden;
    if (!still) return popupAnmelden(m);
    try {
      // zuletzt angemeldetes Konto vorgeben – dann klappt das stille Anmelden zuverlässiger
      const r = await m.ssoSilent({ scopes: SCOPES, loginHint: letztesKonto() });
      m.setActiveAccount(r.account);
      kontoMerken(r.account.username);
      return r.account;
    } catch {
      return null;
    }
  })();
}

/** Anmelde-Fenster öffnen (synchron im Aufruf) und bewachen; zuletzt angemeldetes Konto vorgeben */
function popupAnmelden(m: IPublicClientApplication): Promise<AccountInfo> {
  const hinweis = letztesKonto();
  const start = Date.now();
  let fenster: Window | null = null;
  const oeffnen = window.open;
  // das von MSAL geöffnete Fenster mitbekommen (um zu merken, wenn es zugeht)
  window.open = function (this: Window, ...a: Parameters<typeof window.open>) {
    fenster = oeffnen.apply(this, a);
    return fenster;
  } as typeof window.open;
  let arbeit: Promise<AuthenticationResult>;
  try {
    // overrideInteractionInProgress: eine hängengebliebene frühere Anmeldung (Fenster zu, Netz weg) blockiert nicht
    arbeit = m.loginPopup({ scopes: SCOPES, ...(hinweis ? { loginHint: hinweis } : { prompt: 'select_account' }), overrideInteractionInProgress: true });
  } finally {
    window.open = oeffnen;
  }
  const angekommen = () => {
    try {
      return Number(localStorage.getItem(ANTWORT_KEY)) >= start;
    } catch {
      return false;
    }
  };
  return mitFensterWache(arbeit, () => fenster, angekommen)
    .then((r) => {
      m.setActiveAccount(r.account);
      kontoMerken(r.account.username);
      return r.account;
    })
    .catch((e) => {
      throw anmeldeFehler(e);
    });
}

/** Anmeldung per Weiterleitung: die Seite geht zu Microsoft und kommt danach hierher zurück (ohne Fenster) */
const WEITER_KEY = 'bn-onedrive-weiterleitung';
export async function oneDriveWeiterleiten(): Promise<void> {
  const m = await msal();
  const hinweis = letztesKonto();
  try {
    sessionStorage.setItem(WEITER_KEY, String(Date.now()));
    // eine hängengebliebene Fenster-Anmeldung würde die Weiterleitung sonst ablehnen (interaction_in_progress)
    sessionStorage.removeItem('msal.interaction.status');
  } catch {
    // ohne Sitzungsspeicher geht es trotzdem
  }
  await m.loginRedirect({ scopes: SCOPES, ...(hinweis ? { loginHint: hinweis } : { prompt: 'select_account' }), redirectStartPage: location.href });
}

/** kommt die Seite gerade von der Anmeldung per Weiterleitung zurück? (ohne MSAL zu laden) */
export function weiterleitungZurueck(): boolean {
  try {
    const t = Number(sessionStorage.getItem(WEITER_KEY));
    return !!t && Date.now() - t < 30 * 60_000;
  } catch {
    return false;
  }
}

/** nach der Rückkehr: Konto aus der Weiterleitung (oder AnmeldeFehler) */
export async function oneDriveNachWeiterleitung(): Promise<AccountInfo | null> {
  try {
    await msal();
    const r = await weiterleitung;
    return r?.account ?? (await oneDriveKonto());
  } catch (e) {
    throw anmeldeFehler(e);
  } finally {
    try {
      sessionStorage.removeItem(WEITER_KEY);
    } catch {
      // egal
    }
  }
}

const KONTO_KEY = 'bn-onedrive-konto';
/** zuletzt angemeldetes Konto (Adresse) – ohne MSAL zu laden */
export function letztesKonto(): string | undefined {
  try {
    return localStorage.getItem(KONTO_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}
function kontoMerken(name: string | null): void {
  try {
    if (name) localStorage.setItem(KONTO_KEY, name);
    else localStorage.removeItem(KONTO_KEY);
  } catch {
    // ohne Speicher eben ohne Vorgabe
  }
}

export async function oneDriveAbmelden(): Promise<void> {
  const m = await msal();
  const konto = await oneDriveKonto();
  // nur dieses Gerät/diese Seite vergessen – die Microsoft-Anmeldung im Browser bleibt
  await m.clearCache(konto ? { account: konto } : undefined);
  kontoMerken(null);
}

let stillModus = false;
/** im Hintergrund (automatischer Abgleich): nie ein Popup öffnen, sondern abbrechen */
export function oneDriveStill<T>(arbeit: () => Promise<T>): Promise<T> {
  stillModus = true;
  return arbeit().finally(() => (stillModus = false));
}

async function token(): Promise<string> {
  const m = await msal();
  const account = await oneDriveKonto();
  if (!account) throw new Error('Nicht mit OneDrive verbunden');
  const still = () => m.acquireTokenSilent({ scopes: SCOPES, account });
  try {
    return (await still()).accessToken;
  } catch (e) {
    // nur wenn Microsoft eine neue Anmeldung verlangt, hilft ein Fenster – bei schlechtem Netz einmal kurz warten und
    // noch einmal still versuchen (sonst ginge mitten im Abgleich grundlos ein Anmelde-Fenster auf)
    const neuAnmelden = !!modul && e instanceof modul.InteractionRequiredAuthError;
    if (!neuAnmelden) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        return (await still()).accessToken;
      } catch (e2) {
        if (!(modul && e2 instanceof modul.InteractionRequiredAuthError)) throw anmeldeFehler(e2);
      }
    }
    if (stillModus) throw new Error('Anmeldung abgelaufen – bitte „Jetzt synchronisieren“ antippen', { cause: e });
    try {
      return (await m.acquireTokenPopup({ scopes: SCOPES, account, overrideInteractionInProgress: true })).accessToken;
    } catch (e3) {
      throw anmeldeFehler(e3);
    }
  }
}

async function graph(pfad: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(pfad.startsWith('https://') ? pfad : GRAPH + pfad, { ...init, headers: { ...init.headers, Authorization: `Bearer ${await token()}` } });
  if (res.status === 404) throw new Error('nicht gefunden');
  if (!res.ok) throw new Error(`OneDrive antwortet mit ${res.status}`);
  return res;
}

/**
 * Darf das angemeldete Konto diesen Ordner sehen? (Sichtsperre fürs Backstage, data/zugang.ts)
 * ja = sichtbar; nein = nicht geteilt bzw. nicht vorhanden; unklar = keine Anmeldung, kein Netz oder Störung.
 */
export async function ordnerSichtbar(drive: string, item: string, still = false): Promise<'ja' | 'nein' | 'unklar'> {
  try {
    const t = still ? await oneDriveStill(token) : await token();
    const res = await fetch(`${GRAPH}/drives/${encodeURIComponent(drive)}/items/${encodeURIComponent(item)}?$select=id`, { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) return 'ja';
    return res.status === 403 || res.status === 404 ? 'nein' : 'unklar';
  } catch {
    return 'unklar';
  }
}

/** Kennung (Drive und Element) eines Ordners – für den Band-Ordner der Sichtsperre */
export async function ordnerKennung(ort: CloudOrt): Promise<{ drive: string; item: string }> {
  const i = (await (await graph(`${adresse(ort)}?$select=id,parentReference`)).json()) as { id: string; parentReference?: { driveId?: string } };
  const drive = i.parentReference?.driveId ?? ort.wurzel?.drive;
  if (!drive) throw new Error('Ordner ohne Drive-Kennung');
  return { drive, item: i.id };
}

/** Pfad im OneDrive („Blickfeld Nord/Noten“) für Graph-Adressen kodieren */
export const pfadKodieren = (pfad: string) => pfad.split('/').map((t) => t.trim()).filter(Boolean).map(encodeURIComponent).join('/');

interface GraphItem {
  id: string;
  name: string;
  size?: number;
  lastModifiedDateTime?: string;
  folder?: unknown;
  file?: unknown;
  /** Verknüpfung bzw. geteiltes Element: liegt eigentlich im OneDrive eines anderen */
  remoteItem?: { id: string; name?: string; folder?: unknown; parentReference?: { driveId?: string } };
  '@microsoft.graph.downloadUrl'?: string;
}

/** geteilter Ordner (aus dem OneDrive eines anderen) als Ausgangspunkt */
export interface CloudWurzel {
  drive: string;
  item: string;
  name: string;
}

/** Ort im OneDrive: Pfad ab dem eigenen OneDrive bzw. ab einem geteilten Ordner */
export interface CloudOrt {
  pfad: string;
  wurzel?: CloudWurzel;
}

/** Graph-Adresse eines Elements über seinen Pfad (ohne /children usw.) */
export function adresse(ort: CloudOrt, ...teile: string[]): string {
  const rel = [ort.pfad, ...teile].map(pfadKodieren).filter(Boolean).join('/');
  const basis = ort.wurzel ? `/drives/${ort.wurzel.drive}/items/${ort.wurzel.item}` : '/me/drive/root';
  return rel ? `${basis}:/${rel}:` : basis;
}

/** Graph-Adresse eines Elements über seine ID (drive: fremdes OneDrive) */
const perId = (id: string, drive?: string) => (drive ? `/drives/${drive}/items/${id}` : `/me/drive/items/${id}`);

/** geteilter Ordner hinter einer Verknüpfung bzw. einem „Mit mir geteilt“-Eintrag */
function alsWurzel(i: GraphItem): CloudWurzel | undefined {
  const r = i.remoteItem;
  return r?.folder && r.parentReference?.driveId ? { drive: r.parentReference.driveId, item: r.id, name: r.name ?? i.name } : undefined;
}

// ---- Für die Synchronisation (data/sync.ts) ----------------------------------------------------------------

export interface CloudDatei {
  id: string;
  /** Pfad ab dem Sync-Ordner */
  pfad: string;
  groesse: number;
  geaendert: string;
  /** ändert sich nur, wenn sich der Inhalt ändert (cTag, sonst eTag) */
  version: string;
  downloadUrl?: string;
  /** liegt in einem fremden OneDrive (geteilter Ordner) */
  drive?: string;
}

interface GraphDatei extends GraphItem {
  cTag?: string;
  eTag?: string;
}

const alsCloudDatei = (i: GraphDatei, pfad: string, drive?: string): CloudDatei => ({
  id: i.id,
  drive,
  pfad,
  groesse: i.size ?? 0,
  geaendert: i.lastModifiedDateTime ?? '',
  version: i.cTag ?? i.eTag ?? `${i.size}-${i.lastModifiedDateTime}`,
  downloadUrl: i['@microsoft.graph.downloadUrl'],
});

/**
 * alle Dateien unter dem Ordner (rekursiv, ohne Tiefengrenze; höchstens 20 000) mit Versionsangabe.
 * ordner: nur diese obersten Unterordner lesen (Schnellabgleich ohne Änderungsliste).
 */
export async function cloudBaum(ort: CloudOrt, gefunden?: (anzahl: number) => void, ordner?: string[]): Promise<CloudDatei[]> {
  const out: CloudDatei[] = [];
  const lesen = async (url: string, praefix: string, drive?: string): Promise<void> => {
    let naechste: string | undefined = url;
    while (naechste && out.length < 20000) {
      const seite = (await (await graph(naechste)).json()) as { value: GraphDatei[]; '@odata.nextLink'?: string };
      for (const i of seite.value) {
        if (ordner && !praefix && (!ordner.includes(i.name) || !(i.folder || i.remoteItem?.folder))) continue;
        const w = alsWurzel(i);
        if (w) await lesen(`${perId(w.item, w.drive)}/children?$top=500`, `${praefix}${i.name}/`, w.drive);
        else if (i.folder) await lesen(`${perId(i.id, drive)}/children?$top=500`, `${praefix}${i.name}/`, drive);
        else if (i.file) out.push(alsCloudDatei(i, praefix + i.name, drive));
      }
      gefunden?.(out.length);
      naechste = seite['@odata.nextLink'];
    }
  };
  try {
    await lesen(`${adresse(ort)}/children?$top=500`, '', ort.wurzel?.drive);
  } catch (e) {
    // Ordner gibt es (noch) nicht → leer; er entsteht beim ersten Hochladen
    if ((e as Error).message !== 'nicht gefunden') throw e;
  }
  return out;
}

/** Ort als Schlüssel für den gemerkten Stand der Änderungsliste */
export const ortSchluessel = (ort: CloudOrt) => JSON.stringify([ort.pfad, ort.wurzel?.drive ?? '', ort.wurzel?.item ?? '']);

/**
 * Dateien über die Änderungsliste (data/cloud-delta.ts): mit gemerktem Stand nur die Änderungen seitdem, sonst einmal
 * alles. null = taugt hier nicht (Verknüpfung zu einem fremden Ordner im Sync-Ordner) – dann wie bisher Ordner lesen.
 * Der neue Stand kommt zurück und wird vom Aufrufer gemerkt.
 */
export async function cloudDelta(
  ort: CloudOrt,
  alt: DeltaStand | undefined,
  gefunden?: (anzahl: number) => void,
): Promise<{ dateien: CloudDatei[]; stand: DeltaStand } | null> {
  const schluessel = ortSchluessel(ort);
  const weiter = deltaGueltig(alt, schluessel);
  let stand: DeltaStand;
  if (weiter) stand = { ...alt, eintraege: { ...alt.eintraege } };
  else {
    const k = await ordnerKennung(ort);
    stand = { ort: schluessel, wurzel: k.item, drive: k.drive, link: `/drives/${k.drive}/items/${k.item}/delta`, voll: new Date().toISOString(), eintraege: {} };
  }
  const links = new Map<string, string>();
  let naechste: string | undefined = stand.link;
  let link = '';
  try {
    while (naechste) {
      const seite = (await (await graph(naechste)).json()) as { value: DeltaItem[]; '@odata.nextLink'?: string; '@odata.deltaLink'?: string };
      if (deltaAnwenden(stand.eintraege, seite.value, stand.wurzel)) return null;
      for (const i of seite.value) if (i['@microsoft.graph.downloadUrl']) links.set(i.id, i['@microsoft.graph.downloadUrl']);
      gefunden?.(Object.keys(stand.eintraege).length);
      if (Object.keys(stand.eintraege).length > 20000) return null;
      naechste = seite['@odata.nextLink'];
      link = seite['@odata.deltaLink'] ?? link;
    }
  } catch (e) {
    // gemerkter Link abgelaufen (410) oder sonst unbrauchbar → einmal komplett neu
    if (weiter) return cloudDelta(ort, undefined, gefunden);
    throw e;
  }
  if (!link) return null;
  stand.link = link;
  const drive = ort.wurzel?.drive;
  const dateien = deltaDateien(stand.eintraege, stand.wurzel).map((d): CloudDatei => ({ ...d, drive, downloadUrl: links.get(d.id) }));
  return { dateien, stand };
}

/**
 * Inhalt einer Cloud-Datei. Wege nacheinander: der Download-Link aus der Liste, ein frisch geholter Link, zuletzt
 * /content über Graph (folgt einer Weiterleitung – scheitert in manchen Browsern). Bricht der Browser ab (TypeError:
 * kein Netz, Sicherheitsregel oder Server ohne CORS-Freigabe), nach einer Sekunde alles noch einmal. Scheitert auch das,
 * nennt die Meldung die versuchten Server und – falls die Sicherheitsregel der Seite (CSP) etwas blockiert hat – welchen.
 */
/** so lange darf ein Download höchstens dauern – sonst hinge der ganze Abgleich an einer Anfrage ohne Antwort */
const LADEN_HOECHSTENS_MS = 30_000;
export function cloudLaden(d: CloudDatei): Promise<Blob> {
  const frist = () => AbortSignal.timeout(LADEN_HOECHSTENS_MS);
  return dateiLaden(d, {
    graph: (p, init) => graph(p, { ...init, signal: frist() }),
    fetch: (u, init) => fetch(u, { ...init, signal: frist() }),
    warten: (ms) => new Promise((r) => setTimeout(r, ms)),
  });
}

/** Netz und Anmeldung von außen (für Tests ersetzbar) */
export interface LadeWege {
  graph(pfad: string, init?: RequestInit): Promise<Response>;
  fetch(url: string, init?: RequestInit): Promise<Response>;
  warten(ms: number): Promise<unknown>;
  /** Uhr in ms (für die Dauer je Versuch in der Meldung) */
  jetzt?: () => number;
}

/** Herunterladen scheiterte nur an der Verbindung (Abbruch, keine Antwort) – nicht an OneDrive oder einer Regel */
export class LadeUnterbrechung extends Error {
  override name = 'LadeUnterbrechung';
}

export async function dateiLaden(d: CloudDatei, w: LadeWege): Promise<Blob> {
  const versuche: string[] = [];
  const blockiert = new Set<string>();
  const csp = (e: SecurityPolicyViolationEvent) => blockiert.add(hostVon(e.blockedURI));
  // App zwischendurch im Hintergrund (Handy gesperrt, Tab gewechselt)? Dann bricht der Browser Anfragen gern ab
  let hintergrund = typeof document !== 'undefined' && document.hidden;
  const sicht = () => (hintergrund ||= document.hidden);
  if (typeof document !== 'undefined') {
    document.addEventListener('securitypolicyviolation', csp);
    document.addEventListener('visibilitychange', sicht);
  }
  const jetzt = w.jetzt ?? (() => Date.now());
  const dauer = (t0: number) => `${((jetzt() - t0) / 1000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;
  /** ein Weg: Blob oder null (gescheitert – Grund und Dauer in versuche); andere Fehler als ein Abbruch gehen weiter */
  const abbruch = (e: unknown) => ['TypeError', 'TimeoutError', 'AbortError'].includes((e as Error)?.name);
  const vermerken = (host: string, e: unknown, t0: number) =>
    versuche.push(`${host} ${(e as Error).name === 'TypeError' ? 'abgebrochen' : 'ohne Antwort'} (${dauer(t0)})`);
  // zweiter Durchgang am Browser-Cache vorbei: ein kaputter Cache-Eintrag ließe sonst immer dieselbe Datei scheitern
  const weg = async (url: string, mitZugang: boolean, init?: RequestInit): Promise<Blob | null> => {
    const t0 = jetzt();
    try {
      const res = mitZugang ? await w.graph(url, init) : await w.fetch(url, init);
      if (res.ok) return await res.blob();
      versuche.push(`${hostVon(url)} ${res.status}`);
    } catch (e) {
      if (!abbruch(e)) throw e;
      vermerken(hostVon(mitZugang ? GRAPH : url), e, t0);
    }
    return null;
  };
  const durchgang = async (mitListenLink: boolean, init?: RequestInit): Promise<Blob | null> => {
    if (mitListenLink && d.downloadUrl) {
      const b = await weg(d.downloadUrl, false, init);
      if (b) return b;
    }
    let link: string | undefined;
    const t0 = jetzt();
    try {
      link = ((await (await w.graph(perId(d.id, d.drive), init)).json()) as GraphItem)['@microsoft.graph.downloadUrl'];
    } catch (e) {
      if (!abbruch(e)) throw e;
      vermerken('graph.microsoft.com', e, t0);
    }
    if (link) {
      const b = await weg(link, false, init);
      if (b) return b;
    }
    // auch wenn die Abfrage des Links scheiterte: /content ist ein eigener Weg
    return weg(`${perId(d.id, d.drive)}/content`, true, init);
  };
  try {
    const erst = await durchgang(true);
    if (erst) return erst;
    await w.warten(1000);
    const dann = await durchgang(false, { cache: 'no-store' });
    if (dann) return dann;
    // Meldungen der Sicherheitsregel kommen kurz nach dem Abbruch
    await w.warten(50);
    const regel = blockiert.size ? `; Sicherheitsregel der Seite blockiert ${[...blockiert].join(', ')}` : '';
    const lage = [typeof navigator !== 'undefined' && navigator.onLine === false && 'Gerät offline', hintergrund && 'App war im Hintergrund'].filter(Boolean).join(', ');
    const text = `Herunterladen nicht möglich (keine Verbindung oder vom Browser blockiert – versucht: ${versuche.join(', ')}${regel}${lage ? `; ${lage}` : ''}) – wird beim nächsten Abgleich wiederholt`;
    // nur Abbrüche (kein Status von OneDrive, keine Sicherheitsregel): meist Netzwechsel oder App im Hintergrund
    const nurNetz = !blockiert.size && versuche.every((v) => / (abgebrochen|ohne Antwort) \(/.test(v));
    throw nurNetz ? new LadeUnterbrechung(text) : new Error(text);
  } finally {
    if (typeof document !== 'undefined') {
      document.removeEventListener('securitypolicyviolation', csp);
      document.removeEventListener('visibilitychange', sicht);
    }
  }
}

/** Server einer Adresse (für Meldungen – ohne Pfad und Schlüssel) */
const hostVon = (url: string): string => {
  try {
    return new URL(url, GRAPH).host;
  } catch {
    return '?';
  }
};

/** Datei hochladen (Ordner entstehen automatisch); bis 250 MB, darüber in Teilen */
export async function cloudSchreiben(ort: CloudOrt, pfad: string, inhalt: Blob): Promise<CloudDatei> {
  const ziel = adresse(ort, pfad);
  let item: GraphDatei;
  if (inhalt.size <= 4e6) {
    const hoch = () => graph(`${ziel}/content`, { method: 'PUT', body: inhalt, headers: { 'Content-Type': 'application/octet-stream' } });
    // mehrere gleichzeitige Uploads legen denselben neuen Ordner an → OneDrive meldet einmal 409; dann noch einmal
    const res = await hoch().catch(async (e: Error) => {
      if (!e.message.endsWith(' 409')) throw e;
      await new Promise((r) => setTimeout(r, 500));
      return hoch();
    });
    item = (await res.json()) as GraphDatei;
  } else {
    const sitzung = (await (
      await graph(`${ziel}/createUploadSession`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'replace' } }) })
    ).json()) as { uploadUrl: string };
    const STUECK = 320 * 1024 * 30; // ~9,8 MB, Vielfaches von 320 KiB
    let res: Response | undefined;
    for (let start = 0; start < inhalt.size; start += STUECK) {
      const ende = Math.min(start + STUECK, inhalt.size);
      res = await fetch(sitzung.uploadUrl, { method: 'PUT', body: inhalt.slice(start, ende), headers: { 'Content-Range': `bytes ${start}-${ende - 1}/${inhalt.size}` } });
      if (!res.ok) throw new Error(`Hochladen fehlgeschlagen (${res.status})`);
    }
    item = (await res!.json()) as GraphDatei;
  }
  return alsCloudDatei(item, pfad, ort.wurzel?.drive);
}

/** Datei löschen (landet im Papierkorb von OneDrive) */
export async function cloudLoeschen(id: string, drive?: string): Promise<void> {
  const res = await fetch(GRAPH + perId(id, drive), { method: 'DELETE', headers: { Authorization: `Bearer ${await token()}` } });
  if (!res.ok && res.status !== 404) throw new Error(`Löschen fehlgeschlagen (${res.status})`);
}

/** Datei im Sync-Ordner über ihren Pfad löschen (nicht vorhanden: nichts zu tun) */
export async function cloudLoeschenPfad(ort: CloudOrt, pfad: string): Promise<void> {
  let item: GraphItem;
  try {
    item = (await (await graph(adresse(ort, pfad))).json()) as GraphItem;
  } catch (e) {
    if ((e as Error).message === 'nicht gefunden') return;
    throw e;
  }
  // im geteilten Ordner eines anderen liegt die Datei in dessen OneDrive
  await cloudLoeschen(item.id, ort.wurzel?.drive);
}

export interface CloudEintrag {
  name: string;
  /** geteilter Ordner (Verknüpfung oder „Mit mir geteilt“) – öffnet sich als neuer Ausgangspunkt */
  wurzel?: CloudWurzel;
}

/** Unterordner eines Ordners (für die Auswahl in den Einstellungen); ganz oben auch die mit mir geteilten Ordner */
export async function cloudUnterordner(ort: CloudOrt): Promise<CloudEintrag[]> {
  const r = (await (await graph(`${adresse(ort)}/children?$top=500`)).json()) as { value: GraphItem[] };
  const liste: CloudEintrag[] = r.value.flatMap((i) => (alsWurzel(i) ? [{ name: i.name, wurzel: alsWurzel(i) }] : i.folder ? [{ name: i.name }] : []));
  if (!ort.pfad && !ort.wurzel) {
    try {
      const geteilt = (await (await graph('/me/drive/sharedWithMe')).json()) as { value: GraphItem[] };
      for (const i of geteilt.value) {
        const w = alsWurzel(i);
        if (w && !liste.some((x) => x.wurzel?.item === w.item)) liste.push({ name: w.name, wurzel: w });
      }
    } catch {
      // „Mit mir geteilt“ nicht verfügbar – Verknüpfungen in „Meine Dateien“ gehen trotzdem
    }
  }
  return liste.sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

/** neuen Ordner anlegen */
export async function cloudOrdnerAnlegen(eltern: CloudOrt, name: string): Promise<void> {
  await graph(`${adresse(eltern)}/children`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' }),
  });
}
