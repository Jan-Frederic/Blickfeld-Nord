import type { AccountInfo, IPublicClientApplication } from '@azure/msal-browser';
import { ONEDRIVE, clientId } from './onedrive-config';

// OneDrive über Microsoft Graph – Anmeldung mit MSAL (Microsoft Authentication Library), nur im Browser, ohne Server.
// Ist man im Browser schon bei Microsoft angemeldet (Windows/Edge mit Firmenkonto, Office im Browser …), klappt
// das ohne Eingabe („Single Sign-On“, ssoSilent); sonst einmal im Popup. Die Bibliothek wird erst beim ersten
// Verbinden geladen. Antwortseite für Popup und stilles Anmelden: /auth/ (scripts/auth-seite.mjs).
const SCOPES = ['User.Read', 'Files.ReadWrite'];
const GRAPH = 'https://graph.microsoft.com/v1.0';

export const oneDriveEingerichtet = () => !!clientId();

let app: Promise<IPublicClientApplication> | undefined;
let appFuer = '';
function msal(): Promise<IPublicClientApplication> {
  // neue Client-ID (in den Einstellungen geändert) → neu anlegen
  if (appFuer !== clientId()) app = undefined;
  appFuer = clientId();
  app ??= import('@azure/msal-browser').then(({ createStandardPublicClientApplication }) =>
    createStandardPublicClientApplication({
      auth: { clientId: appFuer, authority: `https://login.microsoftonline.com/${ONEDRIVE.tenant}`, redirectUri: `${location.origin}/auth/` },
      cache: { cacheLocation: 'localStorage' },
    }),
  );
  return app;
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
    const r = await m.ssoSilent({ scopes: SCOPES });
    m.setActiveAccount(r.account);
    return r.account;
  } catch {
    if (still) return null;
  }
  const r = await m.loginPopup({ scopes: SCOPES, prompt: 'select_account' });
  m.setActiveAccount(r.account);
  return r.account;
}

export async function oneDriveAbmelden(): Promise<void> {
  const m = await msal();
  const konto = await oneDriveKonto();
  // nur dieses Gerät/diese Seite vergessen – die Microsoft-Anmeldung im Browser bleibt
  await m.clearCache(konto ? { account: konto } : undefined);
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

export interface OneDriveDatei {
  id: string;
  name: string;
  /** Pfad ab dem gewählten Ordner, z. B. „Goo Goo Dolls/Iris - Bass.pdf“ */
  pfad: string;
  groesse: number;
  geaendert: string;
  downloadUrl?: string;
}

interface GraphItem {
  id: string;
  name: string;
  size?: number;
  lastModifiedDateTime?: string;
  folder?: unknown;
  file?: unknown;
  '@microsoft.graph.downloadUrl'?: string;
}

/** alle Dateien im Ordner und seinen Unterordnern (bis 4 Ebenen, höchstens 3000 Dateien) */
export async function oneDriveDateien(ordner: string, gefunden?: (anzahl: number, ordner: string) => void): Promise<OneDriveDatei[]> {
  const out: OneDriveDatei[] = [];
  const basis = pfadKodieren(ordner);
  const lesen = async (url: string, praefix: string, tiefe: number): Promise<void> => {
    let naechste: string | undefined = url;
    while (naechste && out.length < 3000) {
      const seite = (await (await graph(naechste)).json()) as { value: GraphItem[]; '@odata.nextLink'?: string };
      for (const i of seite.value) {
        if (i.folder && tiefe < 4) await lesen(`/me/drive/items/${i.id}/children?$top=200`, `${praefix}${i.name}/`, tiefe + 1);
        else if (i.file)
          out.push({ id: i.id, name: i.name, pfad: praefix + i.name, groesse: i.size ?? 0, geaendert: i.lastModifiedDateTime ?? '', downloadUrl: i['@microsoft.graph.downloadUrl'] });
      }
      gefunden?.(out.length, praefix || ordner);
      naechste = seite['@odata.nextLink'];
    }
  };
  await lesen(basis ? `/me/drive/root:/${basis}:/children?$top=200` : '/me/drive/root/children?$top=200', '', 0);
  return out;
}

/** Inhalt einer Datei (über die vorab freigegebene Download-Adresse, sonst über Graph) */
export async function oneDriveLaden(d: OneDriveDatei): Promise<ArrayBuffer> {
  if (d.downloadUrl) {
    const res = await fetch(d.downloadUrl);
    if (res.ok) return res.arrayBuffer();
  }
  return (await graph(`/me/drive/items/${d.id}/content`)).arrayBuffer();
}

/** Datei in den Ordner legen (vorhandene gleichen Namens wird ersetzt; bis 250 MB) */
export async function oneDriveSpeichern(ordner: string, name: string, inhalt: Blob): Promise<void> {
  const ziel = [pfadKodieren(ordner), encodeURIComponent(name)].filter(Boolean).join('/');
  await graph(`/me/drive/root:/${ziel}:/content`, { method: 'PUT', body: inhalt, headers: { 'Content-Type': inhalt.type || 'application/octet-stream' } });
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
}

interface GraphDatei extends GraphItem {
  cTag?: string;
  eTag?: string;
}

const alsCloudDatei = (i: GraphDatei, pfad: string): CloudDatei => ({
  id: i.id,
  pfad,
  groesse: i.size ?? 0,
  geaendert: i.lastModifiedDateTime ?? '',
  version: i.cTag ?? i.eTag ?? `${i.size}-${i.lastModifiedDateTime}`,
  downloadUrl: i['@microsoft.graph.downloadUrl'],
});

/** alle Dateien unter dem Ordner (rekursiv, ohne Tiefengrenze; höchstens 20 000) mit Versionsangabe */
export async function cloudBaum(ordner: string, gefunden?: (anzahl: number) => void): Promise<CloudDatei[]> {
  const out: CloudDatei[] = [];
  const lesen = async (url: string, praefix: string): Promise<void> => {
    let naechste: string | undefined = url;
    while (naechste && out.length < 20000) {
      const seite = (await (await graph(naechste)).json()) as { value: GraphDatei[]; '@odata.nextLink'?: string };
      for (const i of seite.value) {
        if (i.folder) await lesen(`/me/drive/items/${i.id}/children?$top=500`, `${praefix}${i.name}/`);
        else if (i.file) out.push(alsCloudDatei(i, praefix + i.name));
      }
      gefunden?.(out.length);
      naechste = seite['@odata.nextLink'];
    }
  };
  const basis = pfadKodieren(ordner);
  try {
    await lesen(basis ? `/me/drive/root:/${basis}:/children?$top=500` : '/me/drive/root/children?$top=500', '');
  } catch (e) {
    // Ordner gibt es (noch) nicht → leer; er entsteht beim ersten Hochladen
    if ((e as Error).message !== 'nicht gefunden') throw e;
  }
  return out;
}

/** Inhalt einer Cloud-Datei */
export async function cloudLaden(d: CloudDatei): Promise<Blob> {
  if (d.downloadUrl) {
    const res = await fetch(d.downloadUrl);
    if (res.ok) return res.blob();
  }
  return (await graph(`/me/drive/items/${d.id}/content`)).blob();
}

/** Datei hochladen (Ordner entstehen automatisch); bis 250 MB, darüber in Teilen */
export async function cloudSchreiben(ordner: string, pfad: string, inhalt: Blob): Promise<CloudDatei> {
  const ziel = [pfadKodieren(ordner), pfadKodieren(pfad)].filter(Boolean).join('/');
  let item: GraphDatei;
  if (inhalt.size <= 4e6) {
    item = (await (await graph(`/me/drive/root:/${ziel}:/content`, { method: 'PUT', body: inhalt, headers: { 'Content-Type': 'application/octet-stream' } })).json()) as GraphDatei;
  } else {
    const sitzung = (await (
      await graph(`/me/drive/root:/${ziel}:/createUploadSession`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'replace' } }) })
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
  return alsCloudDatei(item, pfad);
}

/** Datei löschen (landet im Papierkorb von OneDrive) */
export async function cloudLoeschen(id: string): Promise<void> {
  const res = await fetch(`${GRAPH}/me/drive/items/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${await token()}` } });
  if (!res.ok && res.status !== 404) throw new Error(`Löschen fehlgeschlagen (${res.status})`);
}

/** Unterordner eines Ordners (für die Auswahl in den Einstellungen) */
export async function cloudUnterordner(ordner: string): Promise<string[]> {
  const basis = pfadKodieren(ordner);
  const r = (await (await graph(basis ? `/me/drive/root:/${basis}:/children?$top=500` : '/me/drive/root/children?$top=500')).json()) as { value: GraphItem[] };
  return r.value.filter((i) => i.folder).map((i) => i.name).sort((a, b) => a.localeCompare(b, 'de'));
}

/** neuen Ordner anlegen */
export async function cloudOrdnerAnlegen(eltern: string, name: string): Promise<void> {
  const basis = pfadKodieren(eltern);
  await graph(basis ? `/me/drive/root:/${basis}:/children` : '/me/drive/root/children', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' }),
  });
}
