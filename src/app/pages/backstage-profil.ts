import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { ichQuelle, ladeIch, rufname } from '../data/band-ich';
import { letztesKonto } from '../data/onedrive';
import { geraetName, standardName } from '../data/geraete';
import { ladeZugang } from '../data/zugang';
import { appStand } from '../data/app-stand';
import { datumText } from '../data/datum';
import { statusMigrieren } from '../data/uebe-status';
import { heuteGeuebt, karten, ladeUeben } from '../data/ueben';
import { DokuLink } from './doku-link';

// Backstage → Profil (Knopf mit den Initialen oben links in der Leiste): wer ich in der Band bin („Ich bin …“), mit
// welchem Microsoft-Konto dieses Gerät angemeldet ist, Gerätename, Backstage-Zugang, App-Stand und mein Üben.
// Alles nur von diesem Gerät gelesen – geändert wird unter Einstellungen. Meist als Schublade von links (app.html,
// Eingabe `schublade`: einspaltig), als Seite unter /backstage/profil.
@Component({
  selector: 'app-backstage-profil',
  host: { '[class.in-schublade]': 'schublade()' },
  imports: [DokuLink, RouterLink, MatIconModule],
  template: `
    <section class="section">
      <p class="kicker">Backstage</p>
      <h2>Profil</h2>
      <p class="lead">Wer du in der Band bist und was dieses Gerät über dich weiß. Ändern lässt sich alles unter
        <a routerLink="/backstage/einstellungen">Einstellungen</a>.</p>
      <app-doku-link thema="profil" />

      <div class="karte">
        @if (mitglied(); as m) {
          @if (m.photo) { <img [src]="'/' + m.photo.avatar" alt="" width="72" height="72" /> } @else { <span class="kreis">{{ m.initials }}</span> }
          <div>
            <p class="name">{{ m.name }}</p>
            <p class="rolle">{{ m.role }}</p>
          </div>
        } @else {
          <span class="kreis"><mat-icon>person</mat-icon></span>
          <div>
            <p class="name">Noch nicht gewählt</p>
            <p class="rolle">Unter <a routerLink="/backstage/einstellungen">Einstellungen</a> „Ich bin …“ wählen – dann zählen Üben, Zusagen und Bühnenreife für dich.</p>
          </div>
        }
      </div>

      <dl class="angaben">
        <div><dt><mat-icon>badge</mat-icon> Ich bin</dt><dd>{{ ichText() }}</dd></div>
        <div><dt><mat-icon>account_circle</mat-icon> Microsoft-Konto</dt><dd>{{ konto || 'nicht angemeldet' }}</dd></div>
        <div><dt><mat-icon>devices</mat-icon> Dieses Gerät</dt><dd>{{ geraet }}</dd></div>
        <div><dt><mat-icon>verified_user</mat-icon> Backstage-Zugang</dt><dd>{{ zugang }}</dd></div>
        <div><dt><mat-icon>update</mat-icon> App-Stand</dt><dd>{{ stand() || '–' }}</dd></div>
        @if (mitglied()) {
          <div><dt><mat-icon>style</mat-icon> Üben</dt><dd><a routerLink="/backstage/ueben">{{ ueben() }}</a></dd></div>
        }
      </dl>

      <p class="wege">
        <a routerLink="/backstage/einstellungen"><mat-icon>settings</mat-icon> Einstellungen</a>
        <a routerLink="/backstage/benachrichtigungen"><mat-icon>notifications</mat-icon> Benachrichtigungen</a>
        @if (mitglied(); as m) { <a [routerLink]="'/band/' + m.slug"><mat-icon>person</mat-icon> Meine Seite auf der Website</a> }
      </p>
    </section>
  `,
  styles: `
    .karte { display: flex; align-items: center; gap: 16px; margin: 0 0 20px; padding: 16px; border: 1px solid var(--bn-line); border-radius: 14px; }
    .karte img, .kreis { flex: none; width: 72px; height: 72px; border-radius: 50%; object-fit: cover; }
    .kreis { display: grid; place-items: center; border: 1px solid var(--bn-sunset); color: var(--bn-sunset); font: 400 1.3rem var(--bn-wide); letter-spacing: .08em; }
    .name { margin: 0 0 4px; font: 400 1.1rem var(--bn-wide); text-transform: uppercase; letter-spacing: .1em; }
    .rolle { margin: 0; color: var(--bn-fog); font-size: .92rem; }
    .rolle a, .lead a { color: var(--bn-sunset); }
    .angaben { display: grid; gap: 2px; margin: 0 0 20px; }
    .angaben div { display: grid; grid-template-columns: minmax(150px, 220px) 1fr; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--bn-line); }
    dt { display: flex; align-items: center; gap: 8px; color: var(--bn-fog); font-size: .9rem; }
    dt mat-icon { font-size: 18px; width: 18px; height: 18px; }
    dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
    dd a { color: var(--bn-ink); }
    dd a:hover { color: var(--bn-sunset); }
    .wege { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; }
    .wege a { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1px solid var(--bn-line); border-radius: 999px; color: var(--bn-ink); text-decoration: none; font-size: .9rem; }
    .wege a:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .wege mat-icon { font-size: 18px; width: 18px; height: 18px; }
    @media (max-width: 560px) { .angaben div { grid-template-columns: 1fr; gap: 2px; } }
    :host(.in-schublade) .section { padding: 24px 20px 32px; }
    :host(.in-schublade) .angaben div { grid-template-columns: 1fr; gap: 2px; }
  `,
})
export class BackstageProfil {
  /** in der Schublade von links (schmal, einspaltig) */
  readonly schublade = input(false);
  private readonly band = inject(BandService);
  private readonly ich = ladeIch();
  protected readonly mitglied = computed(() => this.band.members.find((m) => m.slug === this.ich) ?? null);
  protected readonly ichText = computed(() => {
    const m = this.mitglied();
    if (!m) return 'noch nicht gewählt';
    return `${rufname(m)}${ichQuelle() === 'konto' ? ' – aus dem Microsoft-Konto erkannt' : ichQuelle() === 'hand' ? ' – von Hand gewählt' : ''}`;
  });
  protected readonly konto = letztesKonto() ?? '';
  protected readonly geraet = geraetName() || (typeof navigator !== 'undefined' ? standardName(navigator.userAgent) : '');
  protected readonly zugang = (() => {
    const z = ladeZugang();
    return z ? `zuletzt geprüft am ${datumText(new Date(z.zeit).toISOString().slice(0, 10))}` : 'frei (ohne Sperre) oder noch nicht geprüft';
  })();
  protected readonly stand = signal('');
  protected readonly ueben = computed(() => {
    statusMigrieren();
    const heute = new Date().toLocaleDateString('sv-SE');
    const geuebt = heuteGeuebt(heute);
    const k = karten(ladeUeben(), new Map(), heute);
    const dran = k.filter((x) => x.dran && !geuebt.includes(x.key)).length;
    return k.length ? `${k.length} ${k.length === 1 ? 'Song' : 'Songs'} im Karteikasten · ${dran ? dran + ' heute dran' : 'heute nichts fällig'}` : 'Karteikasten leer';
  });

  constructor() {
    appStand().then((s) => this.stand.set(s.slice(0, 8))).catch(() => undefined);
  }
}
