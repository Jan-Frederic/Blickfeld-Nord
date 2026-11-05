// OneDrive-Änderungsliste („delta“ in Microsoft Graph): statt bei jedem Abgleich alle Ordner einzeln zu lesen (eine
// Anfrage je Ordner), fragt der Abgleich nur „was hat sich seit dem letzten Mal geändert?“ – eine Anfrage, ohne
// Änderungen kommt fast nichts zurück. Dafür merkt sich jedes Gerät den Dateibaum (Name, Elternordner, Version je
// Element-ID) und den Link für die nächste Abfrage. Graph liefert in der Änderungsliste keine Pfade, nur IDs und
// Elternordner – die Pfade werden hier zusammengesetzt (so stimmen sie auch nach dem Umbenennen eines Ordners, dessen
// Inhalt Graph dabei nicht erneut meldet). Funktioniert bei privaten Microsoft-Konten für jeden Ordner.
// Ohne Angular-Abhängigkeiten, damit es in Node testbar ist.

/** ein Element im gemerkten Baum */
export interface DeltaEintrag {
  /** Name */
  n: string;
  /** ID des Elternordners */
  p?: string;
  ordner?: true;
  groesse?: number;
  geaendert?: string;
  version?: string;
}

/** gemerkter Stand je Sync-Ordner */
export interface DeltaStand {
  /** für welchen Ordner (Pfad bzw. geteilter Ordner) – anderer Ordner → neu beginnen */
  ort: string;
  /** ID des Sync-Ordners selbst */
  wurzel: string;
  drive: string;
  /** Link für die nächste Abfrage */
  link: string;
  /** wann zuletzt komplett gelesen (ISO) – einmal am Tag zur Sicherheit neu */
  voll: string;
  eintraege: Record<string, DeltaEintrag>;
}

/** Element, wie Graph es in der Änderungsliste liefert (nur, was wir brauchen) */
export interface DeltaItem {
  id: string;
  name?: string;
  size?: number;
  lastModifiedDateTime?: string;
  cTag?: string;
  eTag?: string;
  parentReference?: { id?: string };
  folder?: unknown;
  file?: unknown;
  deleted?: unknown;
  /** Verknüpfung zu einem Ordner eines anderen – den deckt die Änderungsliste nicht ab */
  remoteItem?: unknown;
  '@microsoft.graph.downloadUrl'?: string;
}

/** höchstens so lange gilt der gemerkte Baum, dann wird einmal komplett neu gelesen */
export const DELTA_VOLL_NACH_MS = 24 * 3600_000;

/**
 * Änderungen in den Baum übernehmen (verändert eintraege). Ein Element kann mehrfach vorkommen – das letzte gilt.
 * Ergebnis: true, wenn eine Verknüpfung zu einem fremden Ordner dabei ist (dann taugt die Änderungsliste nicht).
 */
export function deltaAnwenden(eintraege: Record<string, DeltaEintrag>, items: DeltaItem[], wurzel: string): boolean {
  let verknuepfung = false;
  for (const i of items) {
    if (i.id === wurzel) continue;
    if (i.deleted) {
      delete eintraege[i.id];
      continue;
    }
    if (i.remoteItem) {
      verknuepfung = true;
      continue;
    }
    const alt = eintraege[i.id];
    const p = i.parentReference?.id ?? alt?.p;
    const n = i.name ?? alt?.n;
    if (!n) continue;
    if (i.folder) eintraege[i.id] = { n, p, ordner: true };
    else if (i.file)
      eintraege[i.id] = {
        n,
        p,
        groesse: i.size ?? 0,
        geaendert: i.lastModifiedDateTime ?? '',
        version: i.cTag ?? i.eTag ?? `${i.size}-${i.lastModifiedDateTime}`,
      };
  }
  return verknuepfung;
}

/**
 * Dateien mit Pfad ab dem Sync-Ordner. Elemente, deren Elternkette nicht mehr zum Sync-Ordner führt (Ordner gelöscht
 * oder weggeschoben), gelten als weg und werden aus dem Baum entfernt.
 */
export function deltaDateien(eintraege: Record<string, DeltaEintrag>, wurzel: string): { id: string; pfad: string; groesse: number; geaendert: string; version: string }[] {
  const pfade = new Map<string, string | null>([[wurzel, '']]);
  const pfadVon = (id: string, tiefe = 0): string | null => {
    if (pfade.has(id)) return pfade.get(id)!;
    const e = eintraege[id];
    // unbekannter Elternordner oder Kreis → nicht (mehr) im Sync-Ordner
    const eltern = e?.p && tiefe < 100 ? pfadVon(e.p, tiefe + 1) : null;
    const pfad = e && eltern !== null ? (eltern ? `${eltern}/${e.n}` : e.n) : null;
    pfade.set(id, pfad);
    return pfad;
  };
  const out: { id: string; pfad: string; groesse: number; geaendert: string; version: string }[] = [];
  for (const [id, e] of Object.entries(eintraege)) {
    const pfad = pfadVon(id);
    if (pfad === null) delete eintraege[id];
    else if (!e.ordner) out.push({ id, pfad, groesse: e.groesse ?? 0, geaendert: e.geaendert ?? '', version: e.version ?? '' });
  }
  return out.sort((a, b) => a.pfad.localeCompare(b.pfad));
}

/** gemerkter Stand noch brauchbar? (gleicher Ordner, nicht älter als einen Tag) */
export function deltaGueltig(s: DeltaStand | undefined, ort: string, jetzt = Date.now()): s is DeltaStand {
  return !!s && s.ort === ort && !!s.link && jetzt - Date.parse(s.voll) < DELTA_VOLL_NACH_MS;
}
