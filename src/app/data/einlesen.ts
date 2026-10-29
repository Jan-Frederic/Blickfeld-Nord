import { NOTEN_APP, notenDateien, notenImportieren } from './noten';
import { NotenErgebnis, istAkkordblatt, istPdf, notenEinlesen, notenErgebnisText } from './noten-import';
import { APP, backstageImportieren } from '../pages/backstage-sync';
import type { Stand } from '../pages/fortschritt';
import { Erkennung, erkennen } from './erkennung';

export type Melden = (stand: Stand) => void;

// Gemeinsames Einlesen aus einem Ordner – auf dem Gerät (z. B. der OneDrive-Ordner) oder aus OneDrive über Microsoft:
// erst sichten (was ist da?), dann die gewählten Dateien übernehmen. Erkannt werden Backups (Einstellungen → Backup,
// auch frühere „Backstage“-Dateien), Notenpakete („Notenblätter an die Band“), PDFs und Akkordblätter (.pro & Co.).

export interface Quelle {
  name: string;
  /** Pfad ab dem gewählten Ordner, eindeutig – dient auch als ID */
  pfad: string;
  groesse: number;
  /** ISO-Zeitpunkt der letzten Änderung (falls bekannt) */
  geaendert: string;
  laden: () => Promise<ArrayBuffer>;
}

export interface Fund extends Quelle {
  art: 'backstage' | 'noten' | 'pdf' | 'akkordblatt';
  /** Inhalt bei JSON-Dateien (schon beim Sichten gelesen) */
  text?: string;
  /** bei Noten: erkannter Song, Kandidaten, Fassung */
  erkennung?: Erkennung;
}

/** Dateien sichten: Noten nach Endung, JSON-Dateien nach Inhalt; neueste zuerst */
export async function sichten(quellen: Quelle[], melden?: Melden): Promise<Fund[]> {
  const funde: Fund[] = [];
  let i = 0;
  for (const q of quellen) {
    melden?.({ text: `Sichten: ${q.pfad}`, fertig: i++, gesamt: quellen.length });
    if (q.name.startsWith('.')) continue;
    if (istPdf(q.name)) funde.push({ ...q, art: 'pdf' });
    else if (istAkkordblatt(q.name)) funde.push({ ...q, art: 'akkordblatt' });
    else if (q.name.toLowerCase().endsWith('.json') && q.groesse < 200e6) {
      const text = new TextDecoder().decode(await q.laden());
      let app: string | undefined;
      try {
        app = (JSON.parse(text) as { app?: string }).app;
      } catch {
        // keine JSON-Datei von uns
      }
      if (app === APP) funde.push({ ...q, art: 'backstage', text });
      else if (app === NOTEN_APP) funde.push({ ...q, art: 'noten', text });
    }
  }
  // Noten: Titel und Interpret erkennen (Name, Ordner, Inhalt, Tippfehler)
  const noten = funde.filter((f) => f.art === 'pdf' || f.art === 'akkordblatt');
  for (const [n, f] of noten.entries()) {
    melden?.({ text: `Erkennen: ${f.pfad}`, fertig: n, gesamt: noten.length });
    f.erkennung = await erkennen(f.name, f.pfad, f.laden);
  }
  return funde.sort((a, b) => b.geaendert.localeCompare(a.geaendert));
}

/** gewählte Funde übernehmen; Backups älteste zuerst, damit die neueste gewinnt */
/** wahl.noten: je Pfad der gewählte Song („Titel|Interpret“) und die Fassung – nur diese Noten-Dateien werden eingelesen */
export async function uebernehmen(
  funde: Fund[],
  wahl: { dateien: Set<string>; noten: Map<string, { key: string; fassung: string }>; ersetzen: boolean },
  melden?: Melden,
): Promise<{ text: string; ohne: string[] }> {
  const teile: string[] = [];
  const backstage = funde.filter((d) => d.art === 'backstage' && wahl.dateien.has(d.pfad)).reverse();
  let eintraege = 0;
  backstage.forEach((d, i) => (eintraege += backstageImportieren(d.text!, wahl.ersetzen && i === 0)));
  if (backstage.length) teile.push(`${eintraege} ${eintraege === 1 ? 'Eintrag aus dem Backup' : 'Einträge aus dem Backup'}`);
  for (const d of funde.filter((x) => x.art === 'noten' && wahl.dateien.has(x.pfad)).reverse()) {
    melden?.({ text: `Notenpaket: ${d.pfad}` });
    teile.push(`Noten für ${await notenImportieren(d.text!)} Songs`);
  }
  let r: NotenErgebnis | undefined;
  const noten = funde.filter((d) => (d.art === 'pdf' || d.art === 'akkordblatt') && wahl.noten.has(d.pfad));
  if (noten.length) {
    r = await notenEinlesen(noten.map((d) => ({ name: d.name, pfad: d.pfad, groesse: d.groesse, daten: d.laden, ziel: wahl.noten.get(d.pfad) })), await notenDateien(), (fertig, gesamt, name) =>
      melden?.({ text: name ? `Noten: ${name}` : 'Noten eingelesen', fertig, gesamt }),
    );
    teile.push(notenErgebnisText(r).text);
  }
  return { text: teile.length ? `Eingelesen: ${teile.join(' · ')}` : 'Nichts ausgewählt.', ohne: r?.ohne ?? [] };
}
