import type { AccountInfo, IPublicClientApplication } from '@azure/msal-browser';
import { ONEDRIVE } from './onedrive-config';

// OneDrive über Microsoft Graph – Anmeldung mit MSAL (Microsoft Authentication Library), nur im Browser, ohne Server.
// Ist man im Browser schon bei Microsoft angemeldet (Windows/Edge mit Firmenkonto, Office im Browser …), klappt
// das ohne Eingabe („Single Sign-On“, ssoSilent); sonst einmal im Popup. Die Bibliothek wird erst beim ersten
// Verbinden geladen. Antwortseite für Popup und stilles Anmelden: /auth/ (scripts/auth-seite.mjs).
const SCOPES = ['User.Read', 'Files.ReadWrite'];
const GRAPH = 'https://graph.microsoft.com/v1.0';

export const oneDriveEingerichtet = () => !!ONEDRIVE.clientId;

let app: Promise<IPublicClientApplication> | undefined;
function msal(): Promise<IPublicClientApplication> {
  app ??= import('@azure/msal-browser').then(({ createStandardPublicClientApplication }) =>
    createStandardPublicClientApplication({
      auth: { clientId: ONEDRIVE.clientId, authority: `https://login.microsoftonline.com/${ONEDRIVE.tenant}`, redirectUri: `${location.origin}/auth/` },
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

async function token(): Promise<string> {
  const m = await msal();
  const account = await oneDriveKonto();
  if (!account) throw new Error('Nicht mit OneDrive verbunden');
  try {
    return (await m.acquireTokenSilent({ scopes: SCOPES, account })).accessToken;
  } catch {
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
