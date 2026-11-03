// „Bereit für den Auftritt?“ – Check für einen kommenden Auftritt (Backstage-Übersicht und Seite des Auftritts):
// was aus Repo und Gerät ablesbar ist – Termin geklärt, Beginn, Setlist, Tonart/Tempo, Noten, Vor-Ort-Angaben,
// Werbeplan, kurz vorher die Packliste. Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann;
// die Seite sammelt die Werte aus localStorage und IndexedDB ein.
import type { Show } from './band.service';
import type { Entry } from './setlist-data';
import { WERBEPLAN, werbeplan } from './werbeplan';
import { type OfflineStand, offlineFehlt } from './offline';
import { isPause, type Song } from './setlist-data';

/** wie oft stehen mehr als zwei langsame Songs (unter `grenze` bpm) hintereinander – je Set gezählt */
export function langsamStrecken(setlist: Entry[], bpm: (s: Song) => number | undefined, grenze = 95): number {
  let zahl = 0;
  let lauf = 0;
  for (const e of setlist) {
    const b = isPause(e) ? undefined : bpm(e);
    if (b !== undefined && b < grenze) {
      lauf++;
      if (lauf === 3) zahl++;
    } else lauf = 0;
  }
  return zahl;
}

export interface Punkt {
  text: string;
  ok: boolean;
  /** was fehlt bzw. wo es geht */
  hinweis?: string;
  /** Unterseite des Auftritts (setlist, vorort, packliste) oder '' für die Seite selbst */
  ziel?: string;
  /** Knopf statt Link: „vorladen“ holt, was für den Bühnen-Modus ohne Netz fehlt */
  aktion?: 'vorladen';
  /** zum Abhaken von Hand (Vorabend: Wetter, Notenmappe) – Kennung des Hakens */
  haken?: string;
}

/** Punkte am Vortag und am Tag selbst, die sich nicht ablesen lassen – von Hand abhaken (bn-vorabend-<id>) */
export const VORABEND = [
  { id: 'wetter', text: 'Wetter angesehen', hinweis: 'siehe „Wetter“ auf dieser Seite – Jacke, Pavillon, Regenschutz fürs Equipment?' },
  { id: 'mappe', text: 'Notenmappe dabei', hinweis: 'ausgedruckt oder als PDF auf dem Tablet (Setlist → Notenmappe)', ziel: 'setlist' },
] as const;
export const VORABEND_PREFIX = 'bn-vorabend-';

export interface BereitschaftsDaten {
  show: Show;
  heute: string;
  setlist: Entry[];
  /** Songs der Setlist ohne Tonart bzw. ohne Tempo (Titel) */
  ohneTonartTempo: string[];
  /** Songs der Setlist ohne Noten auf diesem Gerät (Titel) – undefined, solange unbekannt */
  ohneNoten?: string[];
  vorort: Record<string, string | undefined>;
  /** erledigte Werbeplan-Schritte */
  werbungErledigt: string[];
  packliste: { eingepackt: number; gesamt: number };
  /** Auffälligkeiten der Setlist: langsame Strecken, Tonartsprünge, Songs mit Baustelle aus der letzten Probe */
  setlistCheck?: { langsamStrecken: number; spruenge: number; baustellen: string[] };
  /** Offline-Speicher dieses Geräts – undefined, solange unbekannt oder ohne Service Worker */
  offline?: OfflineStand;
  /** von Hand abgehakte Vorabend-Punkte (VORABEND) – undefined: nicht anzeigen */
  vorabend?: string[];
}

const tageBis = (heute: string, datum: string) => Math.round((Date.parse(datum) - Date.parse(heute)) / 864e5);
const liste = (titel: string[], max = 4) => titel.slice(0, max).join(', ') + (titel.length > max ? ` und ${titel.length - max} weitere` : '');

export function bereitschaft(d: BereitschaftsDaten): Punkt[] {
  const { show } = d;
  const punkte: Punkt[] = [];
  const songs = d.setlist.filter((e) => !('pause' in e));

  punkte.push({ text: 'Termin geklärt', ok: show.confirmed, hinweis: show.confirmed ? undefined : 'noch als offen eingetragen (band.service.ts)' });
  punkte.push({ text: 'Beginn eingetragen', ok: !!show.time, hinweis: show.time ? `${show.time} Uhr` : 'Uhrzeit fehlt (band.service.ts)' });
  punkte.push({
    text: 'Setlist steht',
    ok: songs.length > 0,
    hinweis: songs.length ? `${songs.length} Songs` : 'auf diesem Gerät noch keine Setlist',
    ziel: 'setlist',
  });
  if (songs.length) {
    punkte.push({
      text: 'Tonart und Tempo für alle Songs',
      ok: !d.ohneTonartTempo.length,
      hinweis: d.ohneTonartTempo.length ? `fehlt bei ${liste(d.ohneTonartTempo)} (Songs → Liste)` : undefined,
      ziel: 'setlist',
    });
    if (d.ohneNoten)
      punkte.push({
        text: 'Noten auf diesem Gerät',
        ok: !d.ohneNoten.length,
        hinweis: d.ohneNoten.length ? `fehlen für ${liste(d.ohneNoten)} – „Auftritt vorbereiten“ in der Setlist prüft auch die Fassung` : undefined,
        ziel: 'setlist',
      });
  }
  if (songs.length && d.setlistCheck) {
    const c = d.setlistCheck;
    const teile = [
      c.langsamStrecken && `${c.langsamStrecken}× mehr als zwei langsame Songs hintereinander`,
      c.spruenge && `${c.spruenge} ${c.spruenge === 1 ? 'Tonartsprung' : 'Tonartsprünge'}`,
      c.baustellen.length && `Baustelle laut letzter Probe: ${liste(c.baustellen)}`,
    ].filter(Boolean);
    punkte.push({ text: 'Setlist rund', ok: !teile.length, hinweis: teile.length ? teile.join(' · ') : undefined, ziel: 'setlist' });
  }
  const wichtig = [
    ['kontakt', 'Ansprechpartner'],
    ['ankunft', 'Ankunft'],
    ['strom', 'Strom'],
  ] as const;
  const fehlt = wichtig.filter(([k]) => !d.vorort[k]?.trim()).map(([, label]) => label);
  punkte.push({ text: 'Vor Ort geklärt', ok: !fehlt.length, hinweis: fehlt.length ? `fehlt: ${fehlt.join(', ')}` : undefined, ziel: 'vorort' });

  // Werbung nur für öffentliche, geklärte Auftritte: fällige Schritte vor dem Auftritt, die noch nicht abgehakt sind
  if (!show.private && show.confirmed) {
    const offen = werbeplan(show.date, d.heute, show.endDate).filter(
      (x) => x.status !== 'kommt' && x.schritt.vorher >= 0 && !d.werbungErledigt.includes(x.schritt.id),
    );
    const naechster = WERBEPLAN.find((s) => s.vorher >= 0 && tageBis(d.heute, show.date) > s.vorher);
    punkte.push({
      text: 'Werbung im Plan',
      ok: !offen.length,
      hinweis: offen.length ? `offen: ${offen.map((x) => x.schritt.titel).join(', ')}` : naechster ? `als Nächstes: ${naechster.titel}` : undefined,
      ziel: '',
    });
  }

  // ab einer Woche vorher: startet der Bühnen-Modus auch ohne Netz?
  if (d.offline && tageBis(d.heute, show.date) <= 7) {
    const fehlt = offlineFehlt(d.offline);
    punkte.push({ text: 'Bühnen-Modus ohne Netz', ok: !fehlt.length, hinweis: fehlt.length ? fehlt.join(' · ') : undefined, aktion: d.offline.sw ? 'vorladen' : undefined });
  }

  // Packliste erst kurz vorher
  if (tageBis(d.heute, show.date) <= 2) {
    const { eingepackt, gesamt } = d.packliste;
    punkte.push({ text: 'Alles eingepackt', ok: gesamt > 0 && eingepackt >= gesamt, hinweis: `${eingepackt} / ${gesamt}`, ziel: 'packliste' });
  }

  // Vortag und Tag selbst: Wetter und Notenmappe zum Abhaken
  if (d.vorabend && tageBis(d.heute, show.date) <= 1)
    for (const v of VORABEND) punkte.push({ text: v.text, ok: d.vorabend.includes(v.id), hinweis: v.hinweis, haken: v.id, ...('ziel' in v ? { ziel: v.ziel } : {}) });
  return punkte;
}
