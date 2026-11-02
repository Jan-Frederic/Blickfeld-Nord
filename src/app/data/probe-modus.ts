// Probe-Modus (Backstage → Probe → „Probe-Modus starten“): die eingeplanten Songs im Vollbild wie im Bühnen-Modus
// (Noten, Tonart/Capo, Klick mit Übungstempo, Einzählen, Stimmgerät) – dazu je Song eine Probe-Leiste: „Sitzt“ oder
// „Nochmal“, Durchläufe zählen, Notiz fürs Protokoll, Mitschnitt, die Notiz der letzten Probe und die Zeit je Song.
// Am Ende eine Zusammenfassung; was nicht geschafft wurde oder nochmal dran muss, geht mit einem Klick auf den Plan
// der nächsten Probe. Alles landet im Probenplan (bn-probe-<datum>) und damit im Proben-Verlauf der Songs.
// Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.

export interface ProbeSong {
  title: string;
  artist: string;
  /** geprobt */
  done: boolean;
  /** Protokoll („Bridge sitzt“, „Tempo zu schnell“) */
  notiz?: string;
  /** Ergebnis im Probe-Modus */
  stand?: 'sitzt' | 'nochmal';
  /** wie oft durchgespielt */
  durchlaeufe?: number;
  /** Sekunden, die der Song im Probe-Modus dran war */
  zeit?: number;
}

export interface ProbePlan {
  songs: ProbeSong[];
  notizen: string;
  punkte: { text: string; done: boolean }[];
}

export const PROBE_PREFIX = 'bn-probe-';
/** Notiz, wenn „Nochmal“ ohne eigene Notiz gedrückt wird – zählt im Proben-Verlauf als Baustelle */
export const NOCHMAL_NOTIZ = 'nochmal üben';

const leer = (): ProbePlan => ({ songs: [], notizen: '', punkte: [] });
export const songKeyVon = (s: { title: string; artist: string }) => `${s.title}|${s.artist}`;

export function loadProbe(datum: string): ProbePlan {
  try {
    return { ...leer(), ...JSON.parse(localStorage.getItem(PROBE_PREFIX + datum) ?? '{}') };
  } catch {
    return leer();
  }
}

export function speichereProbe(datum: string, plan: ProbePlan): void {
  try {
    localStorage.setItem(PROBE_PREFIX + datum, JSON.stringify(plan));
  } catch {
    // ohne Speicher (privater Modus) gilt die Planung nur bis zum Neuladen
  }
}

/** einen Song im Plan ändern (fehlt er, wird er angehängt – z. B. ein spontan gewünschter Song) */
export function songAendern(plan: ProbePlan, s: { title: string; artist: string }, aenderung: (x: ProbeSong) => ProbeSong): ProbePlan {
  const key = songKeyVon(s);
  const da = plan.songs.some((x) => songKeyVon(x) === key);
  const songs = da ? plan.songs.map((x) => (songKeyVon(x) === key ? aenderung(x) : x)) : [...plan.songs, aenderung({ title: s.title, artist: s.artist, done: false })];
  return { ...plan, songs };
}

/** „Sitzt“ bzw. „Nochmal“: geprobt; „Nochmal“ ohne eigene Notiz bekommt „nochmal üben“, „Sitzt“ nimmt das wieder weg */
export function markieren(plan: ProbePlan, s: { title: string; artist: string }, stand: 'sitzt' | 'nochmal'): ProbePlan {
  return songAendern(plan, s, (x) => {
    const notiz = stand === 'nochmal' ? x.notiz || NOCHMAL_NOTIZ : x.notiz === NOCHMAL_NOTIZ ? undefined : x.notiz;
    return { ...x, done: true, stand, notiz };
  });
}

export function durchlauf(plan: ProbePlan, s: { title: string; artist: string }, delta = 1): ProbePlan {
  return songAendern(plan, s, (x) => ({ ...x, durchlaeufe: Math.max(0, (x.durchlaeufe ?? 0) + delta) || undefined }));
}

export function notizSetzen(plan: ProbePlan, s: { title: string; artist: string }, notiz: string): ProbePlan {
  return songAendern(plan, s, (x) => ({ ...x, notiz: notiz.trim().slice(0, 80) || undefined }));
}

/** Zeit dazurechnen (Sekunden); unter 5 Sekunden zählt nicht (nur durchgeblättert) */
export function zeitDazu(plan: ProbePlan, s: { title: string; artist: string }, sekunden: number): ProbePlan {
  if (sekunden < 5 || !plan.songs.some((x) => songKeyVon(x) === songKeyVon(s))) return plan;
  return songAendern(plan, s, (x) => ({ ...x, zeit: Math.round((x.zeit ?? 0) + sekunden) }));
}

export interface ProbeErgebnis {
  sitzt: ProbeSong[];
  nochmal: ProbeSong[];
  /** nicht drangekommen */
  offen: ProbeSong[];
  /** Sekunden insgesamt */
  zeit: number;
}

export function ergebnis(plan: ProbePlan): ProbeErgebnis {
  const sitzt = plan.songs.filter((s) => s.done && s.stand !== 'nochmal');
  const nochmal = plan.songs.filter((s) => s.stand === 'nochmal');
  const offen = plan.songs.filter((s) => !s.done);
  return { sitzt, nochmal, offen, zeit: plan.songs.reduce((n, s) => n + (s.zeit ?? 0), 0) };
}

/** Songs auf den Plan einer anderen Probe setzen (nur, was dort noch fehlt) – Zahl der neuen */
export function uebertragen(ziel: ProbePlan, songs: { title: string; artist: string }[]): { plan: ProbePlan; neu: number } {
  const da = new Set(ziel.songs.map(songKeyVon));
  const neu = songs.filter((s) => !da.has(songKeyVon(s))).map((s) => ({ title: s.title, artist: s.artist, done: false }));
  return { plan: { ...ziel, songs: [...ziel.songs, ...neu] }, neu: neu.length };
}

/** nächste Probe nach diesem Datum */
export function naechsteProbe<T extends { date: string }>(proben: T[], datum: string): T | undefined {
  return [...proben].filter((p) => p.date > datum).sort((a, b) => a.date.localeCompare(b.date))[0];
}

/** Probendauer in Sekunden aus Beginn und Ende (ohne Ende: 3 Stunden), 0 ohne Uhrzeit */
export function probenDauer(p: { time?: string; endTime?: string } | undefined): number {
  if (!p?.time) return 0;
  const min = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
  const ende = p.endTime ? min(p.endTime) : min(p.time) + 180;
  return Math.max(0, (ende - min(p.time)) * 60);
}

/** Zeit je noch offenem Song, damit die Probe reicht (Sekunden) – undefined ohne Zeitrahmen oder ohne offene Songs */
export function zeitJeSong(restSekunden: number, offen: number): number | undefined {
  return restSekunden > 0 && offen > 0 ? Math.floor(restSekunden / offen) : undefined;
}

/** letzte Notiz zu diesem Song aus einer früheren Probe */
export function letzteNotiz(plaene: { tag: string; songs: { title: string; artist: string; notiz?: string }[] }[], s: { title: string; artist: string }, vor: string): { tag: string; notiz: string } | undefined {
  const key = songKeyVon(s);
  let best: { tag: string; notiz: string } | undefined;
  for (const p of plaene) {
    if (p.tag >= vor) continue;
    const x = p.songs.find((y) => songKeyVon(y) === key);
    if (x?.notiz && (!best || p.tag > best.tag)) best = { tag: p.tag, notiz: x.notiz };
  }
  return best;
}

/** „3 min“, „1 h 5 min“ */
export function minutenText(sekunden: number): string {
  const m = Math.round(sekunden / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}
