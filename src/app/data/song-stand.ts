import type { SongEintrag } from './playlisten';
import { vergleichsKey } from './playlisten';
import type { SongHistorie } from './song-historie';

// Stand der Songs über alle Listen: wie oft/zuletzt geprobt, bühnenreif, Kandidaten fürs Archiv und für die
// Website-Liste, vermutlich doppelte Songs. Reine Funktionen (Tests in song-stand.spec.ts); die Proben kommen aus
// den Probenplänen (bn-probe-<datum>) auf dem Gerät.

export interface ProbenStand {
  anzahl: number;
  zuletzt?: string;
}

/** Proben je Song: nur vergangene (bis einschließlich heute) zählen */
export function probenStand(proben: { tag: string; songs: { title: string; artist: string }[] }[], heute: string): Map<string, ProbenStand> {
  const out = new Map<string, ProbenStand>();
  for (const p of proben) {
    if (p.tag > heute) continue;
    for (const k of new Set(p.songs.map((s) => `${s.title}|${s.artist}`))) {
      const alt = out.get(k) ?? { anzahl: 0 };
      out.set(k, { anzahl: alt.anzahl + 1, zuletzt: !alt.zuletzt || p.tag > alt.zuletzt ? p.tag : alt.zuletzt });
    }
  }
  return out;
}

/** Probenpläne aus dem Speicher des Geräts */
export function probenAusSpeicher(): { tag: string; songs: { title: string; artist: string }[] }[] {
  const out: { tag: string; songs: { title: string; artist: string }[] }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      const tag = /^bn-probe-(\d{4}-\d{2}-\d{2})/.exec(k)?.[1];
      if (!tag) continue;
      const plan = JSON.parse(localStorage.getItem(k) ?? '{}') as { songs?: { title: string; artist: string; done?: boolean; notiz?: string }[] };
      // hat die Probe Häkchen „geprobt“, zählen nur die abgehakten Songs – sonst alle geplanten
      const songs = plan.songs ?? [];
      out.push({ tag, songs: songs.some((s) => s.done) ? songs.filter((s) => s.done) : songs });
    }
  } catch {
    // ohne Speicher keine Proben
  }
  return out;
}

/** letzte Probennotiz je Song (Probenprotokoll auf der Probenseite), neueste zuerst */
export function probenNotizen(): Map<string, { tag: string; notiz: string }> {
  const out = new Map<string, { tag: string; notiz: string }>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      const tag = /^bn-probe-(\d{4}-\d{2}-\d{2})/.exec(k)?.[1];
      if (!tag) continue;
      for (const s of (JSON.parse(localStorage.getItem(k) ?? '{}').songs ?? []) as { title: string; artist: string; notiz?: string }[]) {
        const key = `${s.title}|${s.artist}`;
        if (s.notiz && (out.get(key)?.tag ?? '') < tag) out.set(key, { tag, notiz: s.notiz });
      }
    }
  } catch {
    // ohne Speicher keine Notizen
  }
  return out;
}

/** bühnenreif: Noten da, Tonart und Tempo eingetragen, mindestens einmal geprobt */
export const buehnenreif = (f: { noten: boolean; tonart: boolean; geprobt: number }) => f.noten && f.tonart && f.geprobt > 0;

const monateZurueck = (heute: string, monate: number) => {
  const d = new Date(heute + 'T12:00:00Z');
  d.setUTCMonth(d.getUTCMonth() - monate);
  return d.toISOString().slice(0, 10);
};

/**
 * Kandidaten fürs Archiv: Songs, die nicht im Archiv stehen und seit mehr als `monate` Monaten weder gespielt noch
 * geprobt wurden (Songs ganz ohne Auftritt und Probe sind neu, keine Kandidaten).
 */
export function archivKandidaten(
  songs: SongEintrag[],
  historie: Map<string, SongHistorie>,
  proben: Map<string, ProbenStand>,
  heute: string,
  monate = 12,
): { song: SongEintrag; zuletzt: string }[] {
  const grenze = monateZurueck(heute, monate);
  return songs
    .filter((s) => s.listen.length && !s.listen.includes('archiv') && !historie.get(s.key)?.geplant)
    .map((song) => ({ song, zuletzt: [historie.get(song.key)?.zuletzt, proben.get(song.key)?.zuletzt].filter((x): x is string => !!x).sort().at(-1) ?? '' }))
    .filter((x) => x.zuletzt && x.zuletzt < grenze)
    .sort((a, b) => a.zuletzt.localeCompare(b.zuletzt));
}

/** live gespielt, aber nicht auf der Website-Liste (Kandidaten für die offizielle Playlist) */
export function gespieltNichtAufWebsite(songs: SongEintrag[], historie: Map<string, SongHistorie>): SongEintrag[] {
  return songs.filter((s) => (historie.get(s.key)?.gespielt ?? 0) > 0 && !s.listen.includes('website'));
}

function abstand(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let vorher = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const jetzt = [i];
    for (let j = 1; j <= b.length; j++) jetzt[j] = Math.min(vorher[j] + 1, jetzt[j - 1] + 1, vorher[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    vorher = jetzt;
  }
  return vorher[b.length];
}

export interface Doppelt {
  a: SongEintrag;
  b: SongEintrag;
  grund: string;
  /** zusammenführbar: einer der beiden steht in keiner Liste (eigenständig) – er geht im anderen auf */
  von?: SongEintrag;
  nach?: SongEintrag;
}

/** vermutlich derselbe Song: gleicher Titel mit anderer Band oder fast gleich geschrieben (Tippfehler) */
export function doppelte(songs: SongEintrag[]): Doppelt[] {
  const v = songs.map((s) => ({ s, k: vergleichsKey(s.title, s.artist), t: vergleichsKey(s.title, '') }));
  const out: Doppelt[] = [];
  for (let i = 0; i < v.length; i++) {
    for (let j = i + 1; j < v.length; j++) {
      const x = v[i];
      const y = v[j];
      const gleicherTitel = x.t === y.t;
      const fast = !gleicherTitel && x.k.length > 6 && abstand(x.k, y.k) <= 2;
      // ohne Band gegen mit Band: „Titel|“ und „Titel|Band“ sind sicher derselbe
      if (!gleicherTitel && !fast) continue;
      const eigen = !x.s.listen.length ? x.s : !y.s.listen.length ? y.s : undefined;
      const anderer = eigen === x.s ? y.s : x.s;
      out.push({
        a: x.s,
        b: y.s,
        grund: gleicherTitel ? (x.s.artist && y.s.artist ? 'gleicher Titel, andere Band' : 'gleicher Titel, einmal ohne Band') : 'fast gleich geschrieben',
        ...(eigen ? { von: eigen, nach: anderer } : {}),
      });
    }
  }
  return out;
}
