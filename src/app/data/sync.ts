// Synchronisation eines OneDrive-Ordners mit einem lokalen Ordner – in beide Richtungen, wie OneSync:
// Der Stand nach dem letzten Abgleich wird gemerkt (je Datei die Version auf beiden Seiten). Beim nächsten Mal
// zeigt der Vergleich, was sich wo geändert hat: Neues und Geändertes wird übertragen, Gelöschtes auf Wunsch auch
// drüben gelöscht. Wurde eine Datei auf beiden Seiten geändert, gewinnt die neuere – die andere bleibt als
// „… (Konflikt Gerät 2026-10-27).pdf“ erhalten. Nur Dateien, keine leeren Ordner.

export interface SyncDatei {
  /** Pfad ab dem Sync-Ordner, mit „/“ */
  pfad: string;
  groesse: number;
  /** ISO-Zeitpunkt der letzten Änderung */
  geaendert: string;
  /** ändert sich genau dann, wenn sich der Inhalt ändert */
  version: string;
}

/** eine Seite des Abgleichs (OneDrive-Ordner oder lokaler Ordner) */
export interface SyncOrdner {
  name: string;
  liste(gefunden?: (anzahl: number) => void): Promise<SyncDatei[]>;
  lesen(pfad: string): Promise<Blob>;
  schreiben(pfad: string, inhalt: Blob): Promise<SyncDatei>;
  loeschen(pfad: string): Promise<void>;
}

/** Stand nach dem letzten Abgleich: je Pfad die Version in der Cloud und lokal */
export type Zustand = Record<string, { cloud: string; lokal: string }>;

export type Richtung = 'beide' | 'runter' | 'hoch';

export type Aktion =
  | { art: 'runter' | 'hoch' | 'loeschenCloud' | 'loeschenLokal' | 'merken' | 'vergessen'; pfad: string }
  | { art: 'konflikt'; pfad: string; gewinner: 'cloud' | 'lokal' };

/** temporäre und versteckte Dateien (Office-Sperrdateien, .DS_Store …) bleiben außen vor */
export const ignorieren = (pfad: string) => pfad.split('/').some((t) => t.startsWith('.') || t.startsWith('~$') || t === 'Thumbs.db' || t === 'desktop.ini');

/** was zu tun ist – ohne etwas zu verändern */
export function planen(cloud: SyncDatei[], lokal: SyncDatei[], zustand: Zustand, o: { richtung: Richtung; loeschen: boolean }): Aktion[] {
  const c = new Map(cloud.filter((d) => !ignorieren(d.pfad)).map((d) => [d.pfad, d]));
  const l = new Map(lokal.filter((d) => !ignorieren(d.pfad)).map((d) => [d.pfad, d]));
  const runter = o.richtung !== 'hoch';
  const hoch = o.richtung !== 'runter';
  const out: Aktion[] = [];
  for (const pfad of [...new Set([...c.keys(), ...l.keys(), ...Object.keys(zustand)])].sort()) {
    const C = c.get(pfad);
    const L = l.get(pfad);
    const Z = zustand[pfad];
    const cNeu = !!C && (!Z || Z.cloud !== C.version);
    const lNeu = !!L && (!Z || Z.lokal !== L.version);
    if (C && L) {
      if (!cNeu && !lNeu) continue;
      // erster Abgleich, beide Seiten gleich groß: als gleich ansehen und nur merken
      if (!Z && C.groesse === L.groesse) out.push({ art: 'merken', pfad });
      else if (cNeu && !lNeu) out.push(runter ? { art: 'runter', pfad } : { art: 'merken', pfad });
      else if (lNeu && !cNeu) out.push(hoch ? { art: 'hoch', pfad } : { art: 'merken', pfad });
      else if (o.richtung === 'runter') out.push({ art: 'runter', pfad });
      else if (o.richtung === 'hoch') out.push({ art: 'hoch', pfad });
      else out.push({ art: 'konflikt', pfad, gewinner: C.geaendert >= L.geaendert ? 'cloud' : 'lokal' });
    } else if (C) {
      // lokal fehlt: dort gelöscht (war schon abgeglichen und in der Cloud unverändert) oder neu in der Cloud
      if (Z && !cNeu && o.loeschen && hoch) out.push({ art: 'loeschenCloud', pfad });
      else if (runter) out.push({ art: 'runter', pfad });
      else if (Z) out.push({ art: 'vergessen', pfad });
    } else if (L) {
      if (Z && !lNeu && o.loeschen && runter) out.push({ art: 'loeschenLokal', pfad });
      else if (hoch) out.push({ art: 'hoch', pfad });
      else if (Z) out.push({ art: 'vergessen', pfad });
    } else if (Z) out.push({ art: 'vergessen', pfad });
  }
  return out;
}

/** Name der Konfliktkopie: „Iris - Bass (Konflikt Gerät 2026-10-27).pdf“ */
export function konfliktName(pfad: string, seite: string, datum = new Date().toISOString().slice(0, 10)): string {
  const punkt = pfad.lastIndexOf('.');
  const schnitt = punkt > pfad.lastIndexOf('/') ? punkt : pfad.length;
  return `${pfad.slice(0, schnitt)} (Konflikt ${seite} ${datum})${pfad.slice(schnitt)}`;
}

export interface SyncErgebnis {
  runter: number;
  hoch: number;
  geloescht: number;
  konflikte: number;
  fehler: string[];
  /** Pfade, die heruntergeladen oder neu angelegt wurden */
  neu: string[];
}

export interface SyncStand {
  text: string;
  fertig?: number;
  gesamt?: number;
}

/**
 * Abgleich ausführen. bestaetigen wird gefragt, wenn viele Dateien gelöscht würden (Schutz, falls z. B. ein Ordner
 * versehentlich geleert wurde); bei „nein“ werden Löschungen dieses Mal übersprungen.
 */
export async function synchronisieren(
  cloud: SyncOrdner,
  lokal: SyncOrdner,
  zustand: Zustand,
  o: { richtung: Richtung; loeschen: boolean },
  hilfen: { melden?: (s: SyncStand) => void; bestaetigen?: (text: string) => boolean | Promise<boolean>; speichern?: (z: Zustand) => Promise<void> } = {},
): Promise<{ ergebnis: SyncErgebnis; zustand: Zustand }> {
  const melden = hilfen.melden ?? (() => undefined);
  melden({ text: `OneDrive „${cloud.name}“ wird gelesen …` });
  const cListe = await cloud.liste((n) => melden({ text: `OneDrive: ${n} Dateien gefunden` }));
  melden({ text: `„${lokal.name}“ wird gelesen …` });
  const lListe = await lokal.liste((n) => melden({ text: `Lokal: ${n} Dateien gefunden` }));
  const c = new Map(cListe.map((d) => [d.pfad, d]));
  const l = new Map(lListe.map((d) => [d.pfad, d]));
  let aktionen = planen(cListe, lListe, zustand, o);

  const loeschungen = aktionen.filter((a) => a.art === 'loeschenCloud' || a.art === 'loeschenLokal').length;
  const gesamtDateien = new Set([...c.keys(), ...l.keys()]).size;
  if (loeschungen > 5 && loeschungen > gesamtDateien * 0.2) {
    const ok = await (hilfen.bestaetigen?.(`${loeschungen} von ${gesamtDateien} Dateien würden gelöscht. Wirklich löschen?`) ?? false);
    if (!ok) aktionen = aktionen.filter((a) => a.art !== 'loeschenCloud' && a.art !== 'loeschenLokal');
  }

  const z: Zustand = { ...zustand };
  const e: SyncErgebnis = { runter: 0, hoch: 0, geloescht: 0, konflikte: 0, fehler: [], neu: [] };
  const arbeit = aktionen.filter((a) => a.art !== 'merken' && a.art !== 'vergessen');
  let fertig = 0;
  const uebertragen = async (von: SyncOrdner, nach: SyncOrdner, pfad: string, inhalt?: Blob) => nach.schreiben(pfad, inhalt ?? (await von.lesen(pfad)));

  // derselbe Fehler immer wieder (z. B. Netz weg, Zugriff blockiert) → abbrechen statt jede Datei einzeln scheitern lassen
  let inFolge = 0;
  let letzter = '';
  for (const a of aktionen) {
    if (inFolge >= ABBRUCH_NACH) {
      e.fehler.unshift(`Abgebrochen nach ${ABBRUCH_NACH} gleichen Fehlern in Folge: ${letzter}`);
      break;
    }
    const C = c.get(a.pfad);
    const L = l.get(a.pfad);
    try {
      if (a.art === 'merken') z[a.pfad] = { cloud: C!.version, lokal: L!.version };
      else if (a.art === 'vergessen') delete z[a.pfad];
      else {
        melden({ text: `${TEXT[a.art]}: ${a.pfad}`, fertig: fertig++, gesamt: arbeit.length });
        if (a.art === 'runter') {
          z[a.pfad] = { cloud: C!.version, lokal: (await uebertragen(cloud, lokal, a.pfad)).version };
          e.runter++;
          e.neu.push(a.pfad);
        } else if (a.art === 'hoch') {
          z[a.pfad] = { cloud: (await uebertragen(lokal, cloud, a.pfad)).version, lokal: L!.version };
          e.hoch++;
        } else if (a.art === 'loeschenCloud') {
          await cloud.loeschen(a.pfad);
          delete z[a.pfad];
          e.geloescht++;
        } else if (a.art === 'loeschenLokal') {
          await lokal.loeschen(a.pfad);
          delete z[a.pfad];
          e.geloescht++;
        } else if (a.art === 'konflikt') {
          // Konflikt: die ältere Fassung als Kopie auf beiden Seiten behalten, dann die neuere übertragen
          const [sieger, verlierer, seite] = a.gewinner === 'cloud' ? [cloud, lokal, 'Gerät'] : [lokal, cloud, 'OneDrive'];
          const kopie = konfliktName(a.pfad, seite);
          const alt = await verlierer.lesen(a.pfad);
          const kv = await verlierer.schreiben(kopie, alt);
          const ks = await sieger.schreiben(kopie, alt);
          z[kopie] = a.gewinner === 'cloud' ? { cloud: ks.version, lokal: kv.version } : { cloud: kv.version, lokal: ks.version };
          const neu = await uebertragen(sieger, verlierer, a.pfad);
          z[a.pfad] = a.gewinner === 'cloud' ? { cloud: C!.version, lokal: neu.version } : { cloud: neu.version, lokal: L!.version };
          if (a.gewinner === 'cloud') e.neu.push(a.pfad);
          e.neu.push(kopie);
          e.konflikte++;
        }
        // Zwischenstand sichern – ein abgebrochener Abgleich macht beim nächsten Mal dort weiter
        if (fertig % 10 === 0) await hilfen.speichern?.(z);
        inFolge = 0;
      }
    } catch (err) {
      const text = (err as Error).message || 'Fehler';
      inFolge = text === letzter ? inFolge + 1 : 1;
      letzter = text;
      e.fehler.push(`${a.pfad}: ${text}`);
    }
  }
  melden({ text: 'Fertig', fertig: arbeit.length, gesamt: arbeit.length });
  await hilfen.speichern?.(z);
  return { ergebnis: e, zustand: z };
}

const ABBRUCH_NACH = 10;

const TEXT: Record<string, string> = {
  runter: 'Herunterladen',
  hoch: 'Hochladen',
  loeschenCloud: 'In OneDrive löschen',
  loeschenLokal: 'Lokal löschen',
  konflikt: 'Konflikt lösen',
};

/** kurze Zusammenfassung */
export function ergebnisText(e: SyncErgebnis): string {
  const teile = [
    e.runter && `${e.runter} heruntergeladen`,
    e.hoch && `${e.hoch} hochgeladen`,
    e.geloescht && `${e.geloescht} gelöscht`,
    e.konflikte && `${e.konflikte} ${e.konflikte === 1 ? 'Konflikt' : 'Konflikte'} (Kopie behalten)`,
    e.fehler.length && `${e.fehler.length} ${e.fehler.length === 1 ? 'Fehler' : 'Fehler'}`,
  ].filter(Boolean);
  return teile.length ? teile.join(', ') : 'Alles auf dem neuesten Stand';
}
