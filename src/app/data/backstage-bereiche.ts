// Bereiche des Backstage – Navigation in der Kopfleiste (app.html) und Kacheln der Backstage-Übersicht.
// Bewusst ohne Komponente, damit die Kopfleiste auf jeder Seite nur diese Liste lädt.
export const BACKSTAGE_BEREICHE = [
  { path: '/backstage', label: 'Übersicht', icon: 'dashboard', text: 'Kennzahlen und die nächsten Termine' },
  { path: '/backstage/termine', label: 'Termine', icon: 'event', text: 'Auftritte und Proben, Kalender-Abo, neuen Termin eintragen' },
  { path: '/backstage/zahlen', label: 'Zahlen', icon: 'insights', text: 'Besucher der Website und Setlist-Statistik' },
  { path: '/backstage/songs', label: 'Songs', icon: 'library_music', text: 'Tonart, Tempo, Noten und die Setlists aller Auftritte' },
  { path: '/backstage/uebersetzungen', label: 'Übersetzungen', icon: 'translate', text: 'Stand der englischen und niederländischen Texte, gegenlesen' },
  { path: '/backstage/material', label: 'Material', icon: 'print', text: 'Schilder, Karten, Rider und Pressekit zum Drucken und Verschicken' },
  { path: '/backstage/buehnenplan', label: 'Bühnenplan', icon: 'grid_view', text: 'Geräte im Bühnenplan verschieben und für GitHub übernehmen' },
  { path: '/backstage/abgleich', label: 'Abgleich', icon: 'sync', text: 'Setlists, Packlisten und Vor-Ort-Angaben mit der Band teilen' },
  { path: '/backstage/einstellungen', label: 'Einstellungen', icon: 'settings', text: 'Synchronisation mit OneDrive: Konto, Cloud- und lokaler Ordner' },
  { path: '/backstage/aufgaben', label: 'Aufgaben', icon: 'checklist', text: 'Was an der Website noch zu tun ist – Checkliste' },
] as const;
