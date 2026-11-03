// Hilfe im Abgleich (Backstage → Abgleich → Synchronisation): was jeder Knopf macht und was beim Abgleich gerade
// passiert – in einfachen Worten. Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.
export type Knopf = 'jetzt' | 'dateien' | 'einlesen' | 'zuordnen' | 'ignorieren';

export const KNOPF_NAME: Record<Knopf, string> = {
  jetzt: 'Jetzt synchronisieren',
  dateien: 'Lokale Dateien',
  einlesen: 'Synchronisierte Dateien einlesen',
  zuordnen: 'Zuordnen',
  ignorieren: 'ignorieren',
};

export const KNOPF_HILFE: Record<Knopf, string> = {
  jetzt:
    'Gleicht OneDrive und dieses Gerät ab: Was hier neu oder geändert ist, geht nach OneDrive, was dort neu ist, kommt hierher. Vorher werden deine Backstage-Daten und Einstellungen als kleine Dateien abgelegt, danach übernimmt das Gerät, was die Band geändert hat – und liest neue Noten automatisch ein (wenn eingestellt). Haben zwei Leute dieselbe Datei geändert, gewinnt die neuere; die andere bleibt als „(Konflikt …)“-Kopie erhalten.',
  dateien: 'Zeigt, was im lokalen Sync-Ordner liegt – jede Datei lässt sich öffnen, auch ohne Netz. Es wird nichts verändert.',
  einlesen:
    'Sucht im Sync-Ordner nach PDFs und Akkordblättern (.pro) und zeigt sie zur Auswahl. Erst mit „Einlesen“ kommen sie zu den Noten der Songs – vorher ändert sich nichts. Schon als „eigenständig“ eingelesene Noten werden nicht mehr angeboten; Backups stehen unter Einstellungen → Backup.',
  zuordnen: 'Zeigt nur die Noten-Dateien, die beim automatischen Einlesen keinem Song sicher zugeordnet werden konnten – dort den Song wählen und einlesen.',
  ignorieren: 'Blendet den Hinweis für diese Dateien aus. Die Dateien bleiben, wo sie sind, und lassen sich später über „Synchronisierte Dateien einlesen“ zuordnen.',
};

/** was gerade passiert – aus dem Fortschrittstext des Abgleichs (sync.ts, sync.service.ts) */
export function wasPassiert(text: string): string {
  if (text.startsWith('Einstellungen und Daten vorbereiten')) return 'Deine Setlists, Sterne, Einstellungen und Noten-Zuordnungen werden als kleine Dateien in den Sync-Ordner gelegt, damit sie gleich mit hochgehen.';
  if (text.startsWith('OneDrive')) return 'Die Liste der Dateien in OneDrive wird abgefragt – übertragen wird noch nichts.';
  if (text.startsWith('„') || text.startsWith('Lokal')) return 'Die Dateien auf diesem Gerät werden gezählt und mit dem Stand vom letzten Abgleich verglichen.';
  if (text.startsWith('Herunterladen')) return 'Neues oder Geändertes aus OneDrive kommt auf dieses Gerät.';
  if (text.startsWith('Hochladen')) return 'Was hier neu oder geändert ist, geht nach OneDrive – die anderen bekommen es bei ihrem nächsten Abgleich.';
  if (text.startsWith('In OneDrive löschen')) return 'Hier gelöschte Dateien werden auch in OneDrive gelöscht (nur mit eingeschaltetem Löschen).';
  if (text.startsWith('Lokal löschen')) return 'In OneDrive gelöschte Dateien werden auch auf diesem Gerät gelöscht (nur mit eingeschaltetem Löschen).';
  if (text.startsWith('Konflikt')) return 'Diese Datei wurde auf beiden Seiten geändert: Die neuere gilt, die andere wird als „(Konflikt …)“-Kopie aufgehoben.';
  if (text.startsWith('Noten erkennen')) return 'Neue Noten-Dateien werden ihrem Song zugeordnet – über Dateiname, Spotify-Listen und frühere Zuordnungen.';
  if (text.startsWith('Noten einlesen')) return 'Die erkannten Noten werden für den Bühnen- und Probemodus auf diesem Gerät gespeichert.';
  if (text.startsWith('Fertig')) return 'Übertragen ist alles – jetzt werden die Änderungen der Band übernommen.';
  return 'Der Abgleich läuft – die Seite kann offen bleiben, du kannst aber auch weiterarbeiten.';
}
