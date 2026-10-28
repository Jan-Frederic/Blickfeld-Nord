// Setlist per Link teilen: Die Songs stehen kompakt im Teil hinter „#“ der Adresse (geht nie an den Server) –
// je Song die Nummer im Repertoire (repertoire.json) plus eine kurze Prüfsumme des Titels, falls sich die Reihenfolge
// des Repertoires inzwischen geändert hat. Pausen als „p“, Publikumswünsche nur als Markierung (ohne Namen),
// Notizen für den Auftritt nach „~“ (URL-kodiert). Beispiel: #liste=1a.k3,7.x0!,p,22.mm~Schluss%20zweimal
import { Entry, isPause } from './setlist-data';

export interface Track {
  title: string;
  artist: string;
}

const PARAM = 'liste';

/** zwei Zeichen aus dem Titel – erkennt, ob die Nummer noch zum selben Song gehört */
function pruef(t: Track): string {
  let h = 0;
  for (const c of `${t.title}|${t.artist}`) h = (h * 31 + c.charCodeAt(0)) % 1296;
  return h.toString(36).padStart(2, '0');
}

export function setlistKodieren(entries: Entry[], tracks: Track[]): string {
  return entries
    .map((e) => {
      if (isPause(e)) return 'p';
      const i = tracks.findIndex((t) => t.title === e.title && t.artist === e.artist);
      if (i < 0) return '';
      return `${i.toString(36)}.${pruef(tracks[i])}${e.wunsch !== undefined ? '!' : ''}${e.notiz ? '~' + encodeURIComponent(e.notiz) : ''}`;
    })
    .filter(Boolean)
    .join(',');
}

export function setlistDekodieren(code: string, tracks: Track[]): Entry[] {
  return code.split(',').flatMap((teil): Entry[] => {
    if (teil === 'p') return [{ pause: true }];
    const m = /^([0-9a-z]+)\.([0-9a-z]{2})(!?)(?:~(.*))?$/.exec(teil);
    if (!m) return [];
    const nr = parseInt(m[1], 36);
    // Nummer passt nicht mehr (Repertoire geändert) → Song anhand der Prüfsumme suchen
    const t = tracks[nr] && pruef(tracks[nr]) === m[2] ? tracks[nr] : tracks.find((x) => pruef(x) === m[2]);
    if (!t) return [];
    let notiz = '';
    try {
      notiz = m[4] ? decodeURIComponent(m[4]).slice(0, 80) : '';
    } catch {
      // kaputt kodierte Notiz weglassen
    }
    return [{ title: t.title, artist: t.artist, ...(m[3] ? { wunsch: '' } : {}), ...(notiz ? { notiz } : {}) }];
  });
}

/** Link zur Setlist eines Auftritts */
export function setlistLink(origin: string, show: string, entries: Entry[], tracks: Track[]): string {
  return `${origin}/backstage/${show}/setlist#${PARAM}=${setlistKodieren(entries, tracks)}`;
}

/** Setlist aus dem Teil hinter „#“ (oder null, wenn keine drinsteht) */
export function setlistAusHash(hash: string, tracks: Track[]): Entry[] | null {
  const m = new RegExp(`[#&]${PARAM}=([^&]*)`).exec(hash);
  // erst an den Kommas trennen, dann dekodieren – sonst zerreißt ein Komma in einer Notiz den Eintrag
  return m ? setlistDekodieren(m[1], tracks) : null;
}
