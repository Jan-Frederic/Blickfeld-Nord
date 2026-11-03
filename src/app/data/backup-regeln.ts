// Backups im OneDrive-Ordner „Backup“ der Synchronisation: welche Dateien sind Backups, wie alt sind sie, welche
// werden gelöscht. Ein Backup enthält immer alles (Backstage-Daten, Einstellungen, Notenblätter samt Markierungen) in
// einer Datei. Aufbewahrt wird ein halbes Jahr; die letzten 5 Backups bleiben aber immer, auch wenn sie älter sind.
// Frühere Backups (getrennte Daten- und Noten-Dateien, „Backstage“-Sicherungen) zählen genauso mit.

export const BACKUP_ORDNER = 'Backup';
export const BACKUP_BEHALTEN = 5;
export const BACKUP_TTL_TAGE = 182;

/** Notenpaket aus früheren Backups (getrennte Datei) */
export const NOTEN_BACKUP = /^(?:Backup|Backstage)\/blickfeld-nord-(?:backup-)?noten-.*\.json$/;
/** Backup (heute mit allem; früher nur die Daten), Name mit Datum und ggf. Uhrzeit */
export const DATEN_BACKUP = /^(?:Backup|Backstage)\/blickfeld-nord-(?:backup|backstage-alle)-\d{4}-\d{2}-\d{2}(?:-\d{4})?\.json$/;

export const istBackup = (pfad: string) => DATEN_BACKUP.test(pfad) || NOTEN_BACKUP.test(pfad);

/** Dateiname für ein neues Backup: blickfeld-nord-backup-2026-11-03-0806.json (Ortszeit) */
export function backupName(d = new Date()): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `blickfeld-nord-backup-${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}.json`;
}

/** Zeitpunkt eines Backups: aus dem Namen (Datum, ggf. Uhrzeit), sonst Änderungsdatum der Datei */
export function backupZeit(x: { pfad: string; geaendert?: string }): number {
  const m = /(\d{4})-(\d{2})-(\d{2})(?:-(\d{2})(\d{2}))?\.json$/.exec(x.pfad);
  const geaendert = x.geaendert ? Date.parse(x.geaendert) : NaN;
  if (!m) return Number.isNaN(geaendert) ? 0 : geaendert;
  // nur ein Tag im Namen: das Änderungsdatum, sofern es zu dem Tag passt, sonst Mittag
  if (m[4] === undefined && !Number.isNaN(geaendert) && new Date(geaendert).toISOString().slice(0, 10) === `${m[1]}-${m[2]}-${m[3]}`) return geaendert;
  return new Date(+m[1], +m[2] - 1, +m[3], m[4] === undefined ? 12 : +m[4], m[5] === undefined ? 0 : +m[5]).getTime();
}

/** Backups, neueste zuerst */
export function backupsSortiert<T extends { pfad: string; geaendert?: string }>(liste: T[]): T[] {
  return liste.filter((x) => istBackup(x.pfad)).sort((a, b) => backupZeit(b) - backupZeit(a));
}

/** zu löschende Backups: älter als ein halbes Jahr und nicht unter den letzten 5 */
export function backupsZuLoeschen<T extends { pfad: string; geaendert?: string }>(liste: T[], jetzt = Date.now()): T[] {
  return backupsSortiert(liste)
    .slice(BACKUP_BEHALTEN)
    .filter((x) => jetzt - backupZeit(x) > BACKUP_TTL_TAGE * 864e5);
}
