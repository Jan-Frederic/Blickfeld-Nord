import { backupName, backupsAufraeumen, backupsSortiert, backupsZuLoeschen, istBackup } from './backup-regeln';

describe('Backup-Regeln', () => {
  const jetzt = new Date(2026, 10, 3, 8, 0).getTime();
  const b = (tag: string) => ({ pfad: `Backup/blickfeld-nord-backup-${tag}.json`, geaendert: '' });

  it('erkennt Backups – neue mit Uhrzeit, frühere Daten- und Noten-Dateien', () => {
    expect(istBackup('Backup/blickfeld-nord-backup-2026-11-03-0806.json')).toBe(true);
    expect(istBackup('Backup/blickfeld-nord-backup-2026-11-03.json')).toBe(true);
    expect(istBackup('Backup/blickfeld-nord-backup-noten-2026-11-03.json')).toBe(true);
    expect(istBackup('Backstage/blickfeld-nord-backstage-alle-2026-01-02.json')).toBe(true);
    expect(istBackup('Noten/Iris.pdf')).toBe(false);
    expect(backupName(new Date(2026, 10, 3, 8, 6))).toBe('blickfeld-nord-backup-2026-11-03-0806.json');
  });

  it('sortiert nach Datum und Uhrzeit im Namen, neueste zuerst', () => {
    const s = backupsSortiert([b('2026-11-03'), b('2026-11-03-0806'), b('2026-01-01'), { pfad: 'Noten/x.pdf', geaendert: '' }]);
    expect(s.map((x) => x.pfad.slice(29, -5))).toEqual(['2026-11-03', '2026-11-03-0806', '2026-01-01']);
  });

  it('löscht nach einem halben Jahr, behält aber immer die letzten 5', () => {
    // alle alt: nur die 5 neuesten bleiben
    const alt = ['2025-01-01', '2025-02-01', '2025-03-01', '2025-04-01', '2025-05-01', '2025-06-01', '2025-07-01'].map(b);
    expect(backupsZuLoeschen(alt, jetzt).map((x) => x.pfad)).toEqual([b('2025-02-01').pfad, b('2025-01-01').pfad]);
    // viele junge: nichts wird gelöscht, auch wenn es mehr als 5 sind
    const jung = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07'].map(b);
    expect(backupsZuLoeschen(jung, jetzt)).toEqual([]);
    // gemischt: nur die alten jenseits der letzten 5
    const gemischt = [...jung.slice(0, 4), b('2026-06-01'), b('2026-04-01'), b('2025-12-01')];
    expect(backupsZuLoeschen(gemischt, jetzt).map((x) => x.pfad)).toEqual([b('2026-04-01').pfad, b('2025-12-01').pfad]);
  });
});

describe('Backups von Hand aufräumen', () => {
  it('alle bis auf die beiden neuesten (auch frühere Sicherungen), andere Dateien bleiben', () => {
    const liste = [
      { pfad: 'Backup/blickfeld-nord-backup-2026-11-03-0806.json' },
      { pfad: 'Backup/blickfeld-nord-backup-2026-11-10-2100.json' },
      { pfad: 'Backup/blickfeld-nord-backup-2026-10-01-1200.json' },
      { pfad: 'Backstage/blickfeld-nord-backstage-alle-2026-05-01.json' },
      { pfad: 'Noten/Iris.pdf' },
    ];
    expect(backupsAufraeumen(liste).map((x) => x.pfad)).toEqual(['Backup/blickfeld-nord-backup-2026-10-01-1200.json', 'Backstage/blickfeld-nord-backstage-alle-2026-05-01.json']);
    expect(backupsAufraeumen(liste.slice(0, 2))).toEqual([]);
  });
});
