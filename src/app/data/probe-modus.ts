// Probe-Modus (Backstage → Probe → „Probe-Modus starten“): die eingeplanten Songs im Vollbild wie im Bühnen-Modus
// (Noten, Tonart/Capo, Klick mit Übungstempo, Einzählen, Stimmgerät) – dazu je Song eine Probe-Leiste: der eigene
// Übe-Status (fünf Stufen, data/uebe-status.ts), die eigene Notiz (data/probe-notiz.ts), Mitschnitt, die Notizen der
// letzten Probe und die Zeit je Song. „Nochmal“ im Plan: solange der Song bei jemandem noch nicht sitzt.
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
  /** Plan zuletzt an die Band geschickt (JJJJ-MM-TT) */
  geschickt?: string;
  /** Generalprobe: Auftritts-ID, deren Setlist am Stück durchgespielt wird */
  generalprobe?: string;
  /** Generalprobe: Songs („Titel|Interpret“), die vor dem Durchlauf einzeln drankommen – was bei jemandem noch wackelt */
  vorab?: string[];
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

/**
 * „Sitzt“ / „Nochmal“ einer Person (ihr Stand steht in ihrem Fortschritt, data/fortschritt.ts): im gemeinsamen Plan nur
 * „geprobt“ und die Notiz „nochmal üben“, solange die Band (irgendwer) nochmal will – kein Stand, den eine andere
 * Person sonst überschreiben würde.
 */
export function markierenPerson(plan: ProbePlan, s: { title: string; artist: string }, band: 'sitzt' | 'nochmal' | undefined): ProbePlan {
  return songAendern(plan, s, (x) => {
    const notiz = band === 'nochmal' ? x.notiz || NOCHMAL_NOTIZ : x.notiz === NOCHMAL_NOTIZ ? undefined : x.notiz;
    const { stand: _, ...rest } = x;
    return { ...rest, done: true, notiz };
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

/** Ergebnis der Probe; `stand` liefert den Stand der Band je Song aus den Fortschritten der Personen (sonst gilt der Plan) */
export function ergebnis(plan: ProbePlan, stand: (s: ProbeSong) => 'sitzt' | 'nochmal' | undefined = () => undefined): ProbeErgebnis {
  const von = (s: ProbeSong) => stand(s) ?? s.stand;
  const sitzt = plan.songs.filter((s) => (s.done || stand(s)) && von(s) !== 'nochmal');
  const nochmal = plan.songs.filter((s) => von(s) === 'nochmal');
  const offen = plan.songs.filter((s) => !s.done && !stand(s));
  return { sitzt, nochmal, offen, zeit: plan.songs.reduce((n, s) => n + (s.zeit ?? 0), 0) };
}

/**
 * Ergebnis einer Probe als Nachricht an die Band: was sitzt, was nochmal kommt (mit Namen), was nicht drankam, die
 * Notizen je Person und die nächste Probe.
 */
export function probeErgebnisNachricht(
  datum: string,
  e: ProbeErgebnis,
  nochmalBei: (s: ProbeSong) => string,
  notizen: Map<string, string[]>,
  naechste?: { date: string; time?: string },
): string {
  const tag = new Date(`${datum}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  const liste = (songs: ProbeSong[], mit?: (s: ProbeSong) => string) => songs.map((s) => `• ${s.title}${mit && mit(s) ? ` (${mit(s)})` : ''}`).join('\n');
  const mitNotiz = [...notizen].filter(([, n]) => n.length);
  return [
    `🎸 Probe ${tag} – Ergebnis${e.zeit ? ` (${minutenText(e.zeit)} geprobt)` : ''}`,
    e.sitzt.length ? `\n✅ Sitzt (${e.sitzt.length}):\n${liste(e.sitzt)}` : '',
    e.nochmal.length ? `\n↻ Nochmal (${e.nochmal.length}):\n${liste(e.nochmal, nochmalBei)}` : '',
    e.offen.length ? `\n⏳ Nicht drangekommen (${e.offen.length}):\n${liste(e.offen)}` : '',
    mitNotiz.length ? `\n📝 Notizen:\n${mitNotiz.map(([k, n]) => `• ${k.slice(0, k.lastIndexOf('|'))}: ${n.join(' · ')}`).join('\n')}` : '',
    naechste ? `\nNächste Probe: ${new Date(`${naechste.date}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}${naechste.time ? `, ${naechste.time} Uhr` : ''}` : '',
  ]
    .filter(Boolean)
    .join('\n');
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

/** Plan als Nachricht an die Band: Termin, Songs mit Tonart/Tempo und Spotify-Link, offene Punkte */
export function probeNachricht(
  p: { date: string; time?: string; endTime?: string; place?: string },
  plan: ProbePlan,
  info: (s: { title: string; artist: string }) => string,
  link: (s: { title: string; artist: string }) => string | undefined,
): string {
  const tag = new Date(`${p.date}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  const zeit = p.time ? ` · ${p.time}${p.endTime ? '–' + p.endTime : ''} Uhr` : '';
  const songs = plan.songs.map((s, i) => {
    const werte = info(s);
    const url = link(s);
    return `${i + 1}. ${s.title} – ${s.artist}${werte ? ` (${werte})` : ''}${s.stand === 'nochmal' ? ' ↻' : ''}${url ? `\n   ${url}` : ''}`;
  });
  const punkte = plan.punkte.filter((x) => !x.done).map((x) => `• ${x.text}`);
  return [
    `🎸 Probe ${tag}${zeit}${p.place ? `, ${p.place}` : ''}`,
    plan.generalprobe
      ? plan.vorab?.length
        ? `Generalprobe: erst einzeln ${plan.vorab.map((k) => k.slice(0, k.lastIndexOf('|'))).join(', ')} – dann die Setlist am Stück.`
        : 'Generalprobe: Setlist am Stück durchspielen.'
      : '',
    songs.length ? `\nDiese Songs üben wir${songs.length > 1 ? ' – bitte vorher anhören' : ''}:\n${songs.join('\n')}` : '\nSongs stehen noch nicht fest.',
    punkte.length ? `\nOffene Punkte:\n${punkte.join('\n')}` : '',
    plan.notizen.trim() ? `\n${plan.notizen.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Proben in den nächsten 7 Tagen, deren Plan noch nicht an die Band ging – für „Benachrichtigungen“ */
export function vorbereitungFaellig<T extends { date: string }>(proben: T[], heute: string, plan: (datum: string) => ProbePlan): { probe: T; songs: number; tage: number }[] {
  return proben
    .map((p) => ({ probe: p, tage: Math.round((Date.parse(p.date) - Date.parse(heute)) / 864e5) }))
    .filter((x) => x.tage >= 1 && x.tage <= 7)
    .map((x) => ({ ...x, plan: plan(x.probe.date) }))
    .filter((x) => !x.plan.geschickt)
    .map(({ probe, tage, plan: pl }) => ({ probe, tage, songs: pl.songs.length }));
}

/**
 * Generalprobe: Songs der Setlist in ihrer Reihenfolge an den Anfang, Bisheriges (mit Notizen) bleibt dahinter.
 * vorab: was bei jemandem noch wackelt (Setlist-Songs, die nicht bühnenreif sind) – kommt vor dem Durchlauf einzeln dran.
 */
export function generalprobe(plan: ProbePlan, setlist: { title: string; artist: string }[], showId: string, vorab: { title: string; artist: string }[] = []): ProbePlan {
  const alt = new Map(plan.songs.map((s) => [songKeyVon(s), s]));
  const vorne = setlist.map((s) => alt.get(songKeyVon(s)) ?? { title: s.title, artist: s.artist, done: false });
  const drin = new Set(vorne.map(songKeyVon));
  const imSet = new Set(setlist.map(songKeyVon));
  const v = vorab.map(songKeyVon).filter((k) => imSet.has(k));
  return { ...plan, generalprobe: showId, ...(v.length ? { vorab: v } : { vorab: undefined }), songs: [...vorne, ...plan.songs.filter((s) => !drin.has(songKeyVon(s)))] };
}

/** Generalprobe im Probe-Modus: erst die wackelnden Songs einzeln, eine Pause, dann die Setlist am Stück (mit Pausen) */
export function generalprobeAblauf<E extends { title: string; artist: string } | { pause: true }>(setlist: E[], vorab: string[] | undefined): (E | { title: string; artist: string } | { pause: true })[] {
  if (!vorab?.length || !setlist.length) return setlist;
  const songs = new Map(setlist.filter((e): e is E & { title: string; artist: string } => !('pause' in e)).map((e) => [songKeyVon(e), e]));
  const vorne = vorab.flatMap((k) => (songs.has(k) ? [{ title: songs.get(k)!.title, artist: songs.get(k)!.artist }] : []));
  return vorne.length ? [...vorne, { pause: true as const }, ...setlist] : setlist;
}
