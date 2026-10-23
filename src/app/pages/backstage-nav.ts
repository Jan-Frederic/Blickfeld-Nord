import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

// Bereiche des Backstage – gemeinsame Navigation über allen Backstage-Seiten
export const BACKSTAGE_BEREICHE = [
  { path: '/backstage', label: 'Übersicht', icon: 'dashboard', text: 'Kennzahlen und die nächsten Termine' },
  { path: '/backstage/termine', label: 'Termine', icon: 'event', text: 'Auftritte und Proben, Kalender-Abo, neuen Termin eintragen' },
  { path: '/backstage/zahlen', label: 'Zahlen', icon: 'insights', text: 'Besucher der Website und Setlist-Statistik' },
  { path: '/backstage/songs', label: 'Songs', icon: 'library_music', text: 'Tonart, Tempo und Notizen für Setlist und Bühnen-Modus' },
  { path: '/backstage/uebersetzungen', label: 'Übersetzungen', icon: 'translate', text: 'Stand der englischen und niederländischen Texte, gegenlesen' },
  { path: '/backstage/material', label: 'Material', icon: 'print', text: 'Schilder, Karten, Rider und Pressekit zum Drucken und Verschicken' },
  { path: '/backstage/buehnenplan', label: 'Bühnenplan', icon: 'grid_view', text: 'Geräte im Bühnenplan verschieben und für GitHub übernehmen' },
  { path: '/backstage/abgleich', label: 'Abgleich', icon: 'sync', text: 'Setlists, Packlisten und Vor-Ort-Angaben mit der Band teilen' },
  { path: '/backstage/aufgaben', label: 'Aufgaben', icon: 'checklist', text: 'Was an der Website noch zu tun ist – Checkliste' },
] as const;

@Component({
  selector: 'app-backstage-nav',
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <nav class="nav" aria-label="Backstage-Bereiche">
      @for (b of bereiche; track b.path) {
        <a [routerLink]="b.path" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">
          <mat-icon>{{ b.icon }}</mat-icon> {{ b.label }}
        </a>
      }
    </nav>
  `,
  styles: `
    .nav { display: flex; gap: 6px; overflow-x: auto; margin: 0 0 24px; padding-bottom: 4px; scrollbar-width: thin; }
    a {
      display: inline-flex; align-items: center; gap: 6px; flex: none; padding: 7px 14px; border-radius: 999px;
      border: 1px solid var(--bn-line); color: var(--bn-ink); text-decoration: none; font-size: .88rem;
    }
    a:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    a.on { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `,
})
export class BackstageNav {
  protected readonly bereiche = BACKSTAGE_BEREICHE;
}
