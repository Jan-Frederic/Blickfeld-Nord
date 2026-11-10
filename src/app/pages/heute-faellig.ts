import { datumText } from '../data/datum';

import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { erinnerungAktualisieren } from '../data/erinnerung';
import { MatIconModule } from '@angular/material/icon';
import { BandService, Show } from '../data/band.service';
import { ladeKontakte, nachfragen } from '../data/kontakte';
import { SAISON_UPDATE_KEY, saisonUpdateFaellig } from '../data/jahresplan';
import { rueckblickFrist } from '../data/jahresrueckblick';
import { DeployLauf, deployStatus } from '../data/deploy-status';
import { kampagnenLink } from '../data/goatcounter';
import { tageSeitBackup } from './backstage-sync';
import { loadProbe, vorbereitungFaellig } from '../data/probe-modus';
import { lageAus, wetterHinweis } from '../data/wetter-warnung';
import { HOME, Ortsverzeichnis } from '../data/entfernung';
import { PACKLISTE_PREFIX, loadPackliste } from './packliste';
import { ladeIch } from '../data/band-ich';
import { heuteGeuebt, karten, ladeUeben } from '../data/ueben';
import { statusMigrieren } from '../data/uebe-status';
import { erledigteSchritte, schrittText, setzeSchritt, werbeplan, werbeplanAktiv } from '../data/werbeplan';

// Backstage-Übersicht, ganz oben: was heute dran ist – Auftritt und Probe von heute sowie fällige, noch nicht
// abgehakte Schritte aus dem Werbeplan (mit Haken und „Text kopieren“). Ohne Einträge unsichtbar.
interface Werbung {
  show: Show;
  id: string;
  schritt: string;
  titel: string;
  /** seit so vielen Tagen fällig (0 = heute) */
  tage: number;
}

@Component({
  selector: 'app-heute-faellig',
  imports: [RouterLink, MatIconModule],
  template: `
    @if (termine().length || werbung().length || deploy()) {
      <section class="heute" aria-labelledby="heute-titel">
        <h3 id="heute-titel"><mat-icon>today</mat-icon> Heute fällig</h3>
        <ul>
          @if (deploy(); as d) {
            <li class="spaet">
              <mat-icon>error</mat-icon>
              <a [href]="d.html_url" target="_blank" rel="noopener">Website-Update gescheitert ({{ seit(d.created_at) }}) – live ist noch der alte Stand. Zum Lauf auf GitHub</a>
            </li>
          }
          @for (t of termine(); track t.label) {
            <li>
              <mat-icon>{{ t.icon }}</mat-icon>
              <a [routerLink]="t.link" [queryParams]="t.query">{{ t.label }}</a>
            </li>
          }
          @for (w of werbung(); track w.id + w.schritt) {
            <li [class.spaet]="w.tage > 0">
              <input type="checkbox" [id]="'heute-' + w.id + w.schritt" (change)="haken(w)" [attr.aria-label]="'Erledigt: ' + w.titel" />
              <label [for]="'heute-' + w.id + w.schritt">
                <a [routerLink]="['/backstage', w.id]">{{ w.show.venue }}</a>: {{ w.titel }}@if (w.tage > 0) { <span class="hinweis"> · seit {{ w.tage === 1 ? 'gestern' : w.tage + ' Tagen' }} fällig</span> }
              </label>
              <button type="button" (click)="kopieren(w)" [attr.aria-label]="'Text für „' + w.titel + '“ kopieren'">
                <mat-icon>{{ kopiert() === w.id + w.schritt ? 'check' : 'content_copy' }}</mat-icon>
              </button>
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    .heute { margin: 24px 0 0; padding: 14px 18px; border-radius: 12px; border: 1px solid var(--bn-sunset); background: rgba(232, 164, 106, .08); }
    h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; font: 400 .85rem var(--bn-wide); text-transform: uppercase; letter-spacing: .14em; }
    h3 mat-icon { color: var(--bn-sunset); }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
    li { display: flex; align-items: center; gap: 10px; min-height: 36px; font-size: .92rem; }
    li > mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--bn-fog); }
    label { flex: 1; min-width: 0; cursor: pointer; }
    input { accent-color: var(--bn-sunset); margin: 0 4px; }
    a { color: var(--bn-ink); }
    a:hover { color: var(--bn-sunset); }
    .hinweis { color: #e0b25a; font-size: .82rem; }
    button { display: grid; place-items: center; flex: none; width: 34px; height: 34px; border: 1px solid var(--bn-line); border-radius: 50%; background: none; color: var(--bn-ink); cursor: pointer; }
    button:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    button mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `,
})
export class HeuteFaellig {
  private readonly band = inject(BandService);
  private readonly heute = new Date().toISOString().slice(0, 10);
  private readonly stand = signal(0); // nach dem Abhaken neu berechnen
  protected readonly kopiert = signal<string | null>(null);
  /** letzter Deploy gescheitert? (GitHub, nur mit Netz) */
  protected readonly deploy = signal<DeployLauf | null>(null);
  constructor() {
    // Zahl fälliger Karteikarten am App-Symbol (Übe-Erinnerung, data/erinnerung.ts)
    void erinnerungAktualisieren();
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      deployStatus().then((d) => this.deploy.set(d));
      void this.wetterPruefen();
    }
  }

  /** Vortag: Regen, Kälte oder Wind zur Auftrittszeit → Hinweis und Punkte auf die Packliste (einmal) */
  protected readonly wetter = signal<{ icon: string; label: string; link: string[] }[]>([]);
  private async wetterPruefen(): Promise<void> {
    const shows = this.band.shows.filter((s) => s.date === this.morgen);
    const out: { icon: string; label: string; link: string[] }[] = [];
    for (const s of shows) {
      try {
        const orte = await Ortsverzeichnis.load();
        const pos = (s.city && orte.locate(s.city)) || orte.locate(s.venue) || HOME;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${pos.lat}&longitude=${pos.lon}&hourly=temperature_2m,precipitation_probability,wind_speed_10m&timezone=Europe%2FBerlin&start_date=${s.date}&end_date=${s.date}`;
        const lage = lageAus(await (await fetch(url)).json(), s.time);
        const h = lage && wetterHinweis(lage);
        if (!h) continue;
        const id = this.band.showId(s);
        const pack = loadPackliste(PACKLISTE_PREFIX + id);
        const neu = h.packen.filter((x) => !pack.custom.includes(x));
        if (neu.length) {
          try {
            localStorage.setItem(PACKLISTE_PREFIX + id, JSON.stringify({ ...pack, custom: [...pack.custom, ...neu] }));
          } catch {
            // ohne Speicher nur der Hinweis
          }
        }
        out.push({ icon: 'umbrella', label: `Wetter morgen in ${s.city ?? s.venue}: ${h.text} – ${h.packen.join(', ')} (steht auf der Packliste)`, link: ['/backstage', id, 'packliste'] });
      } catch {
        // ohne Vorhersage kein Hinweis
      }
    }
    this.wetter.set(out);
  }
  protected seit(iso: string): string {
    const std = Math.round((Date.now() - Date.parse(iso)) / 36e5);
    return std < 1 ? 'gerade eben' : std < 24 ? `vor ${std} Std.` : `vor ${Math.round(std / 24)} Tagen`;
  }

  private readonly morgen = new Date(Date.parse(this.heute) + 864e5).toISOString().slice(0, 10);

  protected readonly termine = computed((): { icon: string; label: string; link: string[]; query?: Record<string, string | number> }[] => [
    ...this.uebenFaellig(),
    ...this.wetter(),
    // Woche vor einer Probe: Plan an die Band (Songs zum Vorher-Anhören), solange er nicht geschickt wurde
    ...vorbereitungFaellig(this.band.rehearsals, this.heute, loadProbe).map(({ probe, songs, tage }) => ({
      icon: 'queue_music',
      label: `Probe ${tage === 1 ? 'morgen' : 'in ' + tage + ' Tagen'} (${datumText(probe.date).slice(0, 6)}): ${songs ? songs + (songs === 1 ? ' Song' : ' Songs') + ' geplant – Plan an die Band schicken' : 'noch keine Songs geplant'}`,
      link: ['/backstage/probe', probe.date],
    })),
    // Vortag: alles auf einer Seite prüfen – Bereit?, Packliste, Wetter, Notenmappe, Bühnen-Modus ohne Netz
    ...this.band.shows
      .filter((s) => s.date === this.morgen)
      .map((s) => ({ icon: 'checklist', label: `Morgen: ${s.venue} – Bereit?, Packliste, Wetter, Notenmappe und Offline prüfen`, link: ['/backstage', this.band.showId(s)] })),
    ...this.band.shows
      .filter((s) => s.date <= this.heute && (s.endDate ?? s.date) >= this.heute)
      .map((s) => ({ icon: 'celebration', label: `Auftritt: ${s.venue}${s.time ? ' · ' + s.time + ' Uhr' : ''}`, link: ['/backstage', this.band.showId(s)] })),
    ...this.band.rehearsals
      .filter((r) => r.date === this.heute)
      .map((r) => ({ icon: 'music_note', label: `Probe${r.time ? ' · ' + r.time + ' Uhr' : ''}${r.place ? ', ' + r.place : ''}`, link: ['/backstage/probe', r.date] })),
    // Monatsanfang: Saison als Bild an die Band (Termine → Saison → Als Bild teilen)
    ...(saisonUpdateFaellig(this.heute, this.gelesen(SAISON_UPDATE_KEY))
      ? [{ icon: 'date_range', label: 'Saison-Update an die Band schicken (Termine → Saison → Als Bild teilen)', link: ['/backstage/termine/saison'] }]
      : []),
    // Dezember-Auftritte: Rückblick bis zum 14.12. schreiben, damit er im Jahresrückblick (/jahr/<Jahr>, ab 15.12.) steht
    ...rueckblickFrist(this.band.shows, this.band.history, this.heute).map((s) => ({
      icon: 'auto_stories',
      label: `Rückblick „${s.private ? (s.publicName ?? 'Private Feier') : s.venue}“ bis 14.12. schreiben – sonst fehlt er im Jahresrückblick`,
      link: ['/backstage', this.band.showId(s)],
    })),
    // Backup älter als 14 Tage (oder noch nie) – Backstage-Daten liegen sonst nur auf diesem Gerät
    ...this.backupFaellig(),
    // Anfragen ohne Antwort (seit 14 Tagen kein neuer Termin dort) – Kontakte unter Termine → Kontakte
    ...nachfragen(ladeKontakte(), this.band.shows, this.heute).map((n) => ({
      icon: 'call',
      label: `Nachfragen: ${n.name} (angefragt am ${datumText(n.angefragt)})`,
      link: ['/backstage/termine/kontakte'],
    })),
  ]);

  /** fällige Karteikarten (persönlich, „Ich bin …“) – direkt in den Übe-Modus; dazu der nächste Auftritt in 30 Tagen */
  private uebenFaellig(): { icon: string; label: string; link: string[]; query?: Record<string, string | number> }[] {
    if (!ladeIch()) return [];
    statusMigrieren();
    const geuebt = heuteGeuebt(this.heute);
    const n = karten(ladeUeben(), new Map(), this.heute).filter((k) => k.dran && !geuebt.includes(k.key)).length;
    if (!n) return [];
    const show = [...this.band.shows].filter((x) => x.date > this.heute).sort((a, b) => a.date.localeCompare(b.date))[0];
    const tage = show ? Math.round((Date.parse(show.date) - Date.parse(this.heute)) / 864e5) : 99;
    const vorher = show && tage <= 30 ? ` · ${show.private ? (show.publicName ?? 'Private Feier') : show.venue} in ${tage === 1 ? 'einem Tag' : tage + ' Tagen'}` : '';
    return [{ icon: 'style', label: `${n} ${n === 1 ? 'Karteikarte' : 'Karteikarten'} fällig – Übe-Modus starten${vorher}`, link: ['/backstage/ueben'], query: { modus: 1 } }];
  }

  private backupFaellig(): { icon: string; label: string; link: string[] }[] {
    const tage = tageSeitBackup();
    if (tage === undefined || (tage !== null && tage <= 14)) return [];
    return [{ icon: 'backup', label: tage === null ? 'Noch kein Backup auf diesem Gerät – jetzt erstellen' : `Letztes Backup vor ${tage} Tagen – neues erstellen`, link: ['/backstage/einstellungen'] }];
  }

  private gelesen(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  protected readonly werbung = computed<Werbung[]>(() => {
    this.stand();
    return this.band.shows
      .filter((s) => s.confirmed && !s.private && werbeplanAktiv(s.date, this.heute, s.endDate))
      .flatMap((show) => {
        const id = this.band.showId(show);
        const jetzt = werbeplan(show.date, this.heute, show.endDate).find((x) => x.status === 'jetzt');
        if (!jetzt || erledigteSchritte(id).includes(jetzt.schritt.id)) return [];
        // Rückblick schon geschrieben → erledigt
        if (jetzt.schritt.id === 'rueckblick' && this.band.history.some((h) => h.date === show.date && !h.example)) return [];
        const tage = Math.round((Date.parse(this.heute) - Date.parse(jetzt.datum)) / 864e5);
        return [{ show, id, schritt: jetzt.schritt.id, titel: jetzt.schritt.titel, tage }];
      });
  });

  protected haken(w: Werbung): void {
    setzeSchritt(w.id, w.schritt, true);
    this.stand.update((n) => n + 1);
  }

  protected async kopieren(w: Werbung): Promise<void> {
    const text = schrittText(w.schritt, w.show, kampagnenLink(w.id, 'text'));
    try {
      await navigator.clipboard.writeText(text);
      this.kopiert.set(w.id + w.schritt);
      setTimeout(() => this.kopiert.set(null), 2000);
    } catch {
      window.prompt('Text kopieren:', text);
    }
  }
}
