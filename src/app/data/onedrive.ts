import type { AccountInfo, IPublicClientApplication } from '@azure/msal-browser';
import { ONEDRIVE, clientId } from './onedrive-config';

// OneDrive über Microsoft Graph – Anmeldung mit MSAL (Microsoft Authentication Library), nur im Browser, ohne Server.
// Ist man im Browser schon bei Microsoft angemeldet (Windows/Edge mit Firmenkonto, Office im Browser …), klappt
// das ohne Eingabe („Single Sign-On“, ssoSilent); sonst einmal im Popup. Die Bibliothek wird erst beim ersten
// Verbinden geladen. Antwortseite für Popup und stilles Anmelden: /auth/ (scripts/auth-seite.mjs).
// Files.ReadWrite.All: auch Ordner, die jemand anderes mit einem teilt (z. B. der Band-Ordner „Sync“ eines Mitglieds)
const SCOPES = ['User.Read', 'Files.ReadWrite.All'];
const GRAPH = 'https://graph.microsoft.com/v1.0';

export const oneDriveEingerichtet = () => !!clientId();

let app: Promise<IPublicClientApplication> | undefined;
let appFuer = '';
function msal(): Promise<IPublicClientApplication> {
  // neue Client-ID (in den Einstellungen geändert) → neu anlegen
  if (appFuer !== clientId()) app = undefined;
  appFuer = clientId();
  app ??= import('@azure/msal-browser')
    .then(({ createStandardPublicClientApplication }) =>
      createStandardPublicClientApplication({
        auth: { clientId: appFuer, authority: `https://login.microsoftonline.com/${ONEDRIVE.tenant}`, redirectUri: `${location.origin}/auth/` },
        cache: { cacheLocation: 'localStorage' },
      }),
    )
    .then((m) => {
      anmeldungBehalten();
      return m;
    });
  return app;
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
 * Verbinden: erst still über die vorhandene Microsoft-Anmeldung im Browser (SSO), sonst Popup.
 * still=true versucht nur SSO und gibt bei Bedarf null zurück (für den automatischen Versuch beim Öffnen).
 */
export async function oneDriveAnmelden(still = false): Promise<AccountInfo | null> {
  const m = await msal();
  const vorhanden = await oneDriveKonto();
  if (vorhanden) return vorhanden;
  try {
    // zuletzt angemeldetes Konto vorgeben – dann klappt das stille Anmelden zuverlässiger
    const r = await m.ssoSilent({ scopes: SCOPES, loginHint: letztesKonto() });
    m.setActiveAccount(r.account);
    kontoMerken(r.account.username);
    return r.account;
  } catch {
    if (still) return null;
  }
  const r = await m.loginPopup({ scopes: SCOPES, prompt: 'select_account' });
  m.setActiveAccount(r.account);
  kontoMerken(r.account.username);
  return r.account;
}

const KONTO_KEY = 'bn-onedrive-konto';
function letztesKonto(): string | undefined {
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
  try {
    return (await m.acquireTokenSilent({ scopes: SCOPES, account })).accessToken;
  } catch (e) {
    if (stillModus) throw new Error('Anmeldung abgelaufen – bitte „Jetzt synchronisieren“ antippen', { cause: e });
    return (await m.acquireTokenPopup({ scopes: SCOPES, account })).accessToken;
  }
}

async function graph(pfad: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(pfad.startsWith('https://') ? pfad : GRAPH + pfad, { ...init, headers: { ...init.headers, Authorization: `Bearer ${await token()}` } });
  if (res.status === 404) throw new Error('nicht gefunden');
  if (!res.ok) throw new Error(`OneDrive antwortet mit ${res.status}`);
  return res;
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

/** alle Dateien unter dem Ordner (rekursiv, ohne Tiefengrenze; höchstens 20 000) mit Versionsangabe */
export async function cloudBaum(ort: CloudOrt, gefunden?: (anzahl: number) => void): Promise<CloudDatei[]> {
  const out: CloudDatei[] = [];
  const lesen = async (url: string, praefix: string, drive?: string): Promise<void> => {
    let naechste: string | undefined = url;
    while (naechste && out.length < 20000) {
      const seite = (await (await graph(naechste)).json()) as { value: GraphDatei[]; '@odata.nextLink'?: string };
      for (const i of seite.value) {
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

/** Inhalt einer Cloud-Datei */
export async function cloudLaden(d: CloudDatei): Promise<Blob> {
  if (d.downloadUrl) {
    try {
      const res = await fetch(d.downloadUrl);
      if (res.ok) return res.blob();
    } catch {
      // Link abgelaufen oder blockiert → über Graph versuchen
    }
  }
  try {
    return await (await graph(`${perId(d.id, d.drive)}/content`)).blob();
  } catch (e) {
    throw (e as Error).name === 'TypeError' ? new Error('Herunterladen nicht möglich (keine Verbindung oder vom Browser blockiert)', { cause: e }) : e;
  }
}

/** Datei hochladen (Ordner entstehen automatisch); bis 250 MB, darüber in Teilen */
export async function cloudSchreiben(ort: CloudOrt, pfad: string, inhalt: Blob): Promise<CloudDatei> {
  const ziel = adresse(ort, pfad);
  let item: GraphDatei;
  if (inhalt.size <= 4e6) {
    item = (await (await graph(`${ziel}/content`, { method: 'PUT', body: inhalt, headers: { 'Content-Type': 'application/octet-stream' } })).json()) as GraphDatei;
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
