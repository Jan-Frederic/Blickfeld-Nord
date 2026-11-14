import { Injectable, computed, inject, signal } from '@angular/core';
import { datumText } from './datum';
import { erinnerungAktualisieren } from './erinnerung';
import { BandService, Show } from './band.service';
import { ladeKontakte, nachfragen } from './kontakte';
import { SAISON_UPDATE_KEY, saisonUpdateFaellig } from './jahresplan';
import { rueckblickFrist } from './jahresrueckblick';
import { DeployLauf, deployStatus } from './deploy-status';
import { tageSeitBackup } from '../pages/backstage-sync';
import { loadProbe, vorbereitungFaellig } from './probe-modus';
import { lageAus, wetterHinweis } from './wetter-warnung';
import { HOME, Ortsverzeichnis } from './entfernung';
import { PACKLISTE_PREFIX, loadPackliste } from '../pages/packliste';
import { ladeIch } from './band-ich';
import { heuteGeuebt, karten, ladeUeben } from './ueben';
import { statusMigrieren } from './uebe-status';
import { erledigteSchritte, setzeSchritt, werbeplan, werbeplanAktiv } from './werbeplan';

// Benachrichtigungen im Backstage: was heute dran ist – fällige Karteikarten, Auftritt und Probe von heute, der Vortag
// eines Auftritts (mit Wetter), Probe-Vorbereitung, Saison-Update, Rückblick-Frist, Backup, Nachfragen, ein
// gescheitertes Website-Update und fällige Schritte aus dem Werbeplan. Ein Dienst für die Glocke oben in der Leiste
// (Zahl, pages/kopf-glocke.ts) und die Seite /backstage/benachrichtigungen (pages/heute-faellig.ts).
export interface Termin {
  icon: string;
  label: string;
  link: string[];
  query?: Record<string, string | number>;
}

export interface Werbung {
  show: Show;
  id: string;
  schritt: string;
  titel: string;
  /** seit so vielen Tagen fällig (0 = heute) */
  tage: number;
}

const tag = (d = new Date()) => d.toISOString().slice(0, 10);

@Injectable({ providedIn: 'root' })
export class Hinweise {
  private readonly band = inject(BandService);
  /** heutiges Datum – neu gelesen bei jedem Seitenwechsel (die App kann über Mitternacht offen bleiben) */
  private readonly heute = signal(tag());
  /** nach dem Abhaken oder einem Seitenwechsel neu berechnen (vieles steht in localStorage) */
  private readonly stand = signal(0);
  /** letzter Deploy gescheitert? (GitHub, nur mit Netz) */
  readonly deploy = signal<DeployLauf | null>(null);
  /** Vortag: Regen, Kälte oder Wind zur Auftrittszeit → Hinweis und Punkte auf die Packliste (einmal) */
  private readonly wetter = signal<Termin[]>([]);
  private gestartet = false;

  /** einmal je Sitzung: App-Symbol-Zahl, Deploy-Status und Wetter holen */
  start(): void {
    if (this.gestartet) return;
    this.gestartet = true;
    // Zahl fälliger Karteikarten am App-Symbol (Übe-Erinnerung, data/erinnerung.ts)
    void erinnerungAktualisieren();
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      deployStatus().then((d) => this.deploy.set(d));
      void this.wetterPruefen();
    }
  }

  /** neu berechnen (Seitenwechsel, etwas erledigt) */
  neu(): void {
    this.heute.set(tag());
    this.stand.update((n) => n + 1);
  }

  private readonly morgen = computed(() => tag(new Date(Date.parse(this.heute()) + 864e5)));

  private async wetterPruefen(): Promise<void> {
    const shows = this.band.shows.filter((s) => s.date === this.morgen());
    const out: Termin[] = [];
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

  readonly termine = computed((): Termin[] => {
    this.stand();
    const heute = this.heute();
    const morgen = this.morgen();
    return [
      ...this.uebenFaellig(heute),
      ...this.wetter(),
      // Woche vor einer Probe: Plan an die Band (Songs zum Vorher-Anhören), solange er nicht geschickt wurde
      ...vorbereitungFaellig(this.band.rehearsals, heute, loadProbe).map(({ probe, songs, tage }) => ({
        icon: 'queue_music',
        label: `Probe ${tage === 1 ? 'morgen' : 'in ' + tage + ' Tagen'} (${datumText(probe.date).slice(0, 6)}): ${songs ? songs + (songs === 1 ? ' Song' : ' Songs') + ' geplant – Plan an die Band schicken' : 'noch keine Songs geplant'}`,
        link: ['/backstage/probe', probe.date],
      })),
      // Vortag: alles auf einer Seite prüfen – Bereit?, Packliste, Wetter, Notenmappe, Bühnen-Modus ohne Netz
      ...this.band.shows
        .filter((s) => s.date === morgen)
        .map((s) => ({ icon: 'checklist', label: `Morgen: ${s.venue} – Bereit?, Packliste, Wetter, Notenmappe und Offline prüfen`, link: ['/backstage', this.band.showId(s)] })),
      ...this.band.shows
        .filter((s) => s.date <= heute && (s.endDate ?? s.date) >= heute)
        .map((s) => ({ icon: 'celebration', label: `Auftritt: ${s.venue}${s.time ? ' · ' + s.time + ' Uhr' : ''}`, link: ['/backstage', this.band.showId(s)] })),
      ...this.band.rehearsals
        .filter((r) => r.date === heute)
        .map((r) => ({ icon: 'music_note', label: `Probe${r.time ? ' · ' + r.time + ' Uhr' : ''}${r.place ? ', ' + r.place : ''}`, link: ['/backstage/probe', r.date] })),
      // Monatsanfang: Saison als Bild an die Band (Termine → Saison → Als Bild teilen)
      ...(saisonUpdateFaellig(heute, this.gelesen(SAISON_UPDATE_KEY))
        ? [{ icon: 'date_range', label: 'Saison-Update an die Band schicken (Termine → Saison → Als Bild teilen)', link: ['/backstage/termine/saison'] }]
        : []),
      // Dezember-Auftritte: Rückblick bis zum 14.12. schreiben, damit er im Jahresrückblick (/jahr/<Jahr>, ab 15.12.) steht
      ...rueckblickFrist(this.band.shows, this.band.history, heute).map((s) => ({
        icon: 'auto_stories',
        label: `Rückblick „${s.private ? (s.publicName ?? 'Private Feier') : s.venue}“ bis 14.12. schreiben – sonst fehlt er im Jahresrückblick`,
        link: ['/backstage', this.band.showId(s)],
      })),
      // Backup älter als 14 Tage (oder noch nie) – Backstage-Daten liegen sonst nur auf diesem Gerät
      ...this.backupFaellig(),
      // Anfragen ohne Antwort (seit 14 Tagen kein neuer Termin dort) – Kontakte unter Termine → Kontakte
      ...nachfragen(ladeKontakte(), this.band.shows, heute).map((n) => ({
        icon: 'call',
        label: `Nachfragen: ${n.name} (angefragt am ${datumText(n.angefragt)})`,
        link: ['/backstage/termine/kontakte'],
      })),
    ];
  });

  readonly werbung = computed<Werbung[]>(() => {
    this.stand();
    const heute = this.heute();
    return this.band.shows
      .filter((s) => s.confirmed && !s.private && werbeplanAktiv(s.date, heute, s.endDate))
      .flatMap((show) => {
        const id = this.band.showId(show);
        const jetzt = werbeplan(show.date, heute, show.endDate).find((x) => x.status === 'jetzt');
        if (!jetzt || erledigteSchritte(id).includes(jetzt.schritt.id)) return [];
        // Rückblick schon geschrieben → erledigt
        if (jetzt.schritt.id === 'rueckblick' && this.band.history.some((h) => h.date === show.date && !h.example)) return [];
        const tage = Math.round((Date.parse(heute) - Date.parse(jetzt.datum)) / 864e5);
        return [{ show, id, schritt: jetzt.schritt.id, titel: jetzt.schritt.titel, tage }];
      });
  });

  /** Zahl an der Glocke */
  readonly anzahl = computed(() => this.termine().length + this.werbung().length + (this.deploy() ? 1 : 0));

  haken(w: Werbung): void {
    setzeSchritt(w.id, w.schritt, true);
    this.neu();
  }

  /** fällige Karteikarten (persönlich, „Ich bin …“) – direkt in den Übe-Modus; dazu der nächste Auftritt in 30 Tagen */
  private uebenFaellig(heute: string): Termin[] {
    if (!ladeIch()) return [];
    statusMigrieren();
    const geuebt = heuteGeuebt(heute);
    const n = karten(ladeUeben(), new Map(), heute).filter((k) => k.dran && !geuebt.includes(k.key)).length;
    if (!n) return [];
    const show = [...this.band.shows].filter((x) => x.date > heute).sort((a, b) => a.date.localeCompare(b.date))[0];
    const tage = show ? Math.round((Date.parse(show.date) - Date.parse(heute)) / 864e5) : 99;
    const vorher = show && tage <= 30 ? ` · ${show.private ? (show.publicName ?? 'Private Feier') : show.venue} in ${tage === 1 ? 'einem Tag' : tage + ' Tagen'}` : '';
    return [{ icon: 'style', label: `${n} ${n === 1 ? 'Karteikarte' : 'Karteikarten'} fällig – Übe-Modus starten${vorher}`, link: ['/backstage/ueben'], query: { modus: 1 } }];
  }

  private backupFaellig(): Termin[] {
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
}
