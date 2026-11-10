// Bereiche des Backstage – Navigation in der Kopfleiste (app.html) und Kacheln der Backstage-Übersicht.
// Bewusst ohne Komponente, damit die Kopfleiste auf jeder Seite nur diese Liste lädt.
export const BACKSTAGE_BEREICHE = [
  { path: '/backstage', label: 'Übersicht', icon: 'dashboard', text: 'Kennzahlen und die nächsten Termine' },
  { path: '/backstage/songs', label: 'Songs', icon: 'library_music', text: 'Tonart, Tempo, Noten und die Setlists aller Auftritte' },
  { path: '/backstage/termine', label: 'Termine', icon: 'event', text: 'Auftritte und Proben, Kalender-Abo, neuen Termin eintragen' },
  { path: '/backstage/aufgaben', label: 'Aufgaben', icon: 'checklist', text: 'Was an der Website noch zu tun ist – Checkliste' },
  { path: '/backstage/buehnenplan', label: 'Technik', icon: 'grid_view', text: 'Bühnenplan: Geräte verschieben und für GitHub übernehmen' },
  { path: '/backstage/material', label: 'Material', icon: 'print', text: 'Schilder, Karten, Rider und Pressekit zum Drucken und Verschicken' },
  { path: '/backstage/uebersetzungen', label: 'Sprachen', icon: 'translate', text: 'Stand der englischen und niederländischen Texte, gegenlesen' },
  { path: '/backstage/zahlen', label: 'Zahlen', icon: 'insights', text: 'Besucher der Website und Setlist-Statistik' },
  { path: '/backstage/abgleich', label: 'Abgleich', icon: 'sync', text: 'Setlists, Packlisten und Vor-Ort-Angaben mit der Band teilen' },
  { path: '/backstage/einstellungen', label: 'Einstellungen', icon: 'settings', text: 'Synchronisation mit OneDrive: Konto, Cloud- und lokaler Ordner' },
] as const;
