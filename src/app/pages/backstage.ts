import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService, Show } from '../data/band.service';
import { SyncService } from '../data/sync.service';
import { ladeIch, zusagen, zusagenText } from '../data/band-ich';
import { STATUS, UebeStatus, alleStatus, buehnenreife, eigeneStatus, statusMigrieren, uebeWoche } from '../data/uebe-status';
import { heuteGeuebt, karten, ladeKastenGeteilt, ladeTagesziel, ladeUeben, nochHeute } from '../data/ueben';
import { ladeFortschritt } from '../data/fortschritt';
import { loadProbe, songKeyVon } from '../data/probe-modus';
import { isPause, loadSetlist, setLength, setTime, setsOf } from '../data/setlist-data';
import { datumText, tageZwischen } from '../data/datum';
import { datenStand } from '../data/neu-zeichnen';
import { alleSongNoten } from '../data/noten';
import { type OfflineStand, offlineStand } from '../data/offline';
import { baustellenAusProben, bereitschaftPunkte } from './bereitschaft';
import { ModusKarte } from './modus-karte';
import { DokuLink } from './doku-link';

// Backstage-Übersicht (die Startseite der App): drei Karten – Übe-Modus, Probe-Modus der nächsten Probe, Bühnen-Modus
// des nächsten Auftritts. Jede zeigt den Stand (Übe-Fortschritt, was für den Termin schon abgedeckt ist); kurz
// antippen startet den Modus, gedrückt halten öffnet die Seite zum Bearbeiten (pages/modus-karte.ts). Suche,
// Benachrichtigungen und alle Bereiche stehen in der Leiste oben.
interface Teil {
  klasse: string;
  n: number;
  zeichen: string;
  label: string;
}
export interface UebersichtKarte {
  art: string;
  icon: string;
  klasse: string;
  titel: string;
  unter: string;
  status?: { ok: boolean; text: string };
  fortschritt?: { wert: number; text: string };
  verteilung?: { label: string; teile: Teil[] };
  punkte: { ok: boolean; text: string }[];
  modus: (string | number)[];
  query?: Record<string, string | number>;
  bearbeiten: (string | number)[];
  modusText: string;
  bearbeitenText: string;
}

const REIFE: { id: 'buehnenreif' | 'fast' | 'baustelle' | 'offen'; label: string; zeichen: string }[] = [
  { id: 'buehnenreif', label: 'bühnenreif', zeichen: '●' },
  { id: 'fast', label: 'fast bühnenreif', zeichen: '◐' },
  { id: 'baustelle', label: 'Baustelle', zeichen: '○' },
  { id: 'offen', label: 'ohne Angabe', zeichen: '·' },
];
const wann = (heute: string, datum: string) => {
  const t = tageZwischen(heute, datum);
  return t <= 0 ? 'heute' : t === 1 ? 'morgen' : `in ${t} Tagen`;
};
const tagText = (datum: string) => new Date(`${datum}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
const sitzt = (s: UebeStatus | undefined) => s === 'sitzt' || s === 'eingenordet';

@Component({
  selector: 'app-backstage',
  imports: [DokuLink, MatIconModule, ModusKarte],
  template: `
    <section class="section">
      <p class="kicker">Nur für die Band</p>
      <h2>Backstage</h2>
      <p class="lead">Üben, die nächste Probe und der nächste Auftritt auf einen Blick. Kurz antippen startet den Modus,
        gedrückt halten öffnet die Seite zum Bearbeiten.</p>
      <app-doku-link thema="uebersicht" />

      <div class="uebersicht-karten">
        @for (k of karten(); track k.art) {
          <app-modus-karte [class]="k.klasse" [modus]="k.modus" [query]="k.query" [bearbeiten]="k.bearbeiten"
            [modusText]="k.modusText" [bearbeitenText]="k.bearbeitenText">
            <span class="kopf">
              <mat-icon>{{ k.icon }}</mat-icon> <span class="art">{{ k.art }}</span>
              @if (k.status; as st) { <span class="status" [class.ok]="st.ok">{{ st.text }}</span> }
            </span>
            <strong class="titel">{{ k.titel }}</strong>
            @if (k.unter) { <span class="unter">{{ k.unter }}</span> }
            @if (k.fortschritt; as f) {
              <span class="fortschritt"><span class="balken"><i [style.width.%]="f.wert * 100"></i></span><small>{{ f.text }}</small></span>
            }
            @if (k.verteilung; as v) {
              <span class="verteilung" role="img" [attr.aria-label]="v.label">
                @for (t of v.teile; track t.klasse) { @if (t.n) { <i [class]="t.klasse" [style.flex-grow]="t.n"></i> } }
              </span>
              <span class="legende" aria-hidden="true">
                @for (t of v.teile; track t.klasse) { @if (t.n) { <span [class]="t.klasse" [title]="t.label">{{ t.zeichen }} {{ t.n }}</span> } }
              </span>
            }
            @if (k.punkte.length) {
              <span class="punkte">
                @for (p of k.punkte; track p.text) {
                  <span class="punkt" [class.ok]="p.ok"><mat-icon>{{ p.ok ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon> {{ p.text }}</span>
                }
              </span>
            }
            <span class="los"><mat-icon>play_arrow</mat-icon> {{ k.modusText }}</span>
          </app-modus-karte>
        }
      </div>
      <p class="halte-hinweis"><mat-icon>touch_app</mat-icon> Kurz antippen: Modus starten · gedrückt halten: bearbeiten</p>
    </section>
  `,
})
export class Backstage {
  private readonly router = inject(Router);
  private readonly band = inject(BandService);
  private readonly heute = new Date().toLocaleDateString('sv-SE');
  /** Noten und Offline-Speicher dieses Geräts (für „Bereit?“ des Auftritts) – kommen asynchron */
  private readonly noten = signal<Set<string> | undefined>(undefined);
  private readonly offline = signal<OfflineStand | undefined>(undefined);
  private readonly baustellen = baustellenAusProben(this.band.members);

  private readonly naechsterAuftritt = [...this.band.shows]
    .filter((s) => (s.endDate ?? s.date) >= this.heute)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))[0] as Show | undefined;
  private readonly naechsteProbe = [...this.band.rehearsals]
    .filter((r) => r.date >= this.heute)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))[0];

  protected readonly karten = computed<UebersichtKarte[]>(() => {
    datenStand(); // neue Daten vom Abgleich → neu rechnen
    statusMigrieren();
    const mitglieder = this.band.members;
    const alle = alleStatus(mitglieder);
    const reifeVerteilung = (keys: string[], was: string) => {
      const je = { buehnenreif: 0, fast: 0, baustelle: 0, offen: 0 };
      for (const k of keys) je[buehnenreife(k, mitglieder, alle).ampel]++;
      const teile = REIFE.map((r) => ({ klasse: r.id, n: je[r.id], zeichen: r.zeichen, label: r.label }));
      return { je, verteilung: { label: `Bühnenreife ${was}: ` + teile.filter((t) => t.n).map((t) => `${t.n} ${t.label}`).join(', '), teile } };
    };
    return [this.uebenKarte(), this.probeKarte(reifeVerteilung), this.auftrittKarte(reifeVerteilung)];
  });

  // ---- Üben: Fortschritt heute, Karteikasten nach Status, was für Probe und Auftritt schon sitzt ----
  private uebenKarte(): UebersichtKarte {
    const basis = { art: 'Üben', icon: 'style', klasse: 'karte-ueben', modus: ['/backstage/ueben'], query: { modus: 1 }, bearbeiten: ['/backstage/ueben'], modusText: 'Übe-Modus', bearbeitenText: 'Üben bearbeiten' };
    const ich = ladeIch();
    if (!ich) {
      return { ...basis, titel: 'Wer bist du?', unter: 'Unter Einstellungen „Ich bin …“ wählen – dann zählt dein Üben für die Band.', punkte: [], bearbeiten: ['/backstage/einstellungen'] };
    }
    const heute = this.heute;
    const k = karten(ladeUeben(), new Map(), heute);
    const geuebt = heuteGeuebt(heute);
    const dran = k.filter((x) => x.dran && !geuebt.includes(x.key)).length;
    const ziel = ladeTagesziel();
    const rest = nochHeute(ziel, geuebt.length);
    const woche = uebeWoche(ladeFortschritt(ich), ladeKastenGeteilt(ich), heute);
    const eigen = eigeneStatus();
    const je: Record<UebeStatus, number> = { nicht: 0, ueben: 0, wackelt: 0, sitzt: 0, eingenordet: 0 };
    for (const s of eigen.values()) je[s]++;
    const teile = STATUS.filter((s) => s.id !== 'nicht').map((s) => ({ klasse: s.id, n: je[s.id], zeichen: s.zeichen, label: s.label }));
    const punkte: { ok: boolean; text: string }[] = [];
    // was für die anstehenden Termine bei dir schon sitzt
    const abgedeckt = (keys: string[], wo: string) => {
      if (!keys.length) return;
      const n = keys.filter((x) => sitzt(eigen.get(x))).length;
      punkte.push({ ok: n === keys.length, text: `${wo}: ${n} von ${keys.length} Songs sitzen bei dir` });
    };
    if (this.naechsteProbe) abgedeckt(loadProbe(this.naechsteProbe.date).songs.map(songKeyVon), `Probe ${tagText(this.naechsteProbe.date)}`);
    if (this.naechsterAuftritt) abgedeckt(this.setlistKeys(this.naechsterAuftritt), this.naechsterAuftritt.venue);
    return {
      ...basis,
      titel: dran ? `${dran} ${dran === 1 ? 'Karte' : 'Karten'} heute dran` : k.length ? 'Heute nichts fällig' : 'Karteikasten leer',
      unter: `${k.length} ${k.length === 1 ? 'Song' : 'Songs'} im Karteikasten · ${woche.serie ? `${woche.serie} ${woche.serie === 1 ? 'Tag' : 'Tage'} am Stück` : 'heute noch nicht geübt'} · ${woche.karten} Karten in 7 Tagen`,
      status: rest ? { ok: false, text: `noch ${rest} bis zum Tagesziel` } : { ok: true, text: 'Tagesziel geschafft' },
      fortschritt: { wert: Math.min(1, ziel ? geuebt.length / ziel : 1), text: `heute ${geuebt.length} von ${ziel} geübt` },
      verteilung: teile.some((t) => t.n) ? { label: 'Deine Songs: ' + teile.filter((t) => t.n).map((t) => `${t.n} ${t.label}`).join(', '), teile } : undefined,
      punkte,
    };
  }

  // ---- Probe: Plan, Zusagen, Bühnenreife der geplanten Songs ----
  private probeKarte(reife: (keys: string[], was: string) => { je: Record<string, number>; verteilung: UebersichtKarte['verteilung'] }): UebersichtKarte {
    const p = this.naechsteProbe;
    if (!p) {
      return { art: 'Probe', icon: 'music_note', klasse: 'karte-probe', titel: 'Keine Probe eingetragen', unter: 'Proben stehen in band.service.ts – unter Termine sind alle.', punkte: [], modus: ['/backstage/termine'], bearbeiten: ['/backstage/termine'], modusText: 'Termine', bearbeitenText: 'Termine' };
    }
    const plan = loadProbe(p.date);
    const keys = plan.songs.map(songKeyVon);
    const z = zusagen(p.date, this.band.members);
    const offen = this.band.members.length - z.size;
    const absagen = [...z.values()].filter((x) => !x.kommt).length;
    const r = reife(keys, 'der geplanten Songs');
    const punkte = [
      { ok: keys.length > 0, text: keys.length ? `${keys.length} ${keys.length === 1 ? 'Song' : 'Songs'} geplant${plan.generalprobe ? ' (Generalprobe)' : ''}` : 'noch keine Songs geplant' },
      { ok: !!plan.geschickt, text: plan.geschickt ? `Plan an die Band geschickt (${datumText(plan.geschickt).slice(0, 6)})` : 'Plan noch nicht an die Band geschickt' },
      { ok: offen === 0 && absagen === 0, text: `Zusagen: ${zusagenText(z, this.band.members.length)}` },
      ...(keys.length ? [{ ok: !r.je['baustelle'], text: r.je['baustelle'] ? `${r.je['baustelle']} geplante ${r.je['baustelle'] === 1 ? 'Song ist' : 'Songs sind'} noch Baustelle` : 'keine Baustelle unter den geplanten Songs' }] : []),
    ];
    const ok = punkte.filter((x) => x.ok).length;
    return {
      art: 'Probe',
      icon: 'music_note',
      klasse: 'karte-probe',
      titel: `${tagText(p.date)}${p.time ? ' · ' + p.time + ' Uhr' : ''}`,
      unter: [wann(this.heute, p.date), p.place].filter(Boolean).join(' · '),
      status: { ok: ok === punkte.length, text: ok === punkte.length ? 'alles bereit' : `${ok} von ${punkte.length} bereit` },
      verteilung: keys.length ? r.verteilung : undefined,
      punkte,
      modus: ['/backstage/probe', p.date],
      query: { modus: 1 },
      bearbeiten: ['/backstage/probe', p.date],
      modusText: 'Probe-Modus',
      bearbeitenText: 'Probe bearbeiten',
    };
  }

  // ---- Auftritt: Setlist, Bühnenreife, „Bereit?“ ----
  private auftrittKarte(reife: (keys: string[], was: string) => { je: Record<string, number>; verteilung: UebersichtKarte['verteilung'] }): UebersichtKarte {
    const s = this.naechsterAuftritt;
    if (!s) {
      return { art: 'Auftritt', icon: 'celebration', klasse: 'karte-auftritt', titel: 'Kein Auftritt eingetragen', unter: 'Alle Termine stehen unter Termine.', punkte: [], modus: ['/backstage/termine'], bearbeiten: ['/backstage/termine'], modusText: 'Termine', bearbeitenText: 'Termine' };
    }
    const id = this.band.showId(s);
    const setlist = loadSetlist(id);
    const keys = this.setlistKeys(s);
    const dauer = setsOf(setlist).reduce((n, set) => n + setLength(set).seconds, 0);
    const bereit = bereitschaftPunkte(s, id, this.band.members, { noten: this.noten(), offline: this.offline(), baustellen: this.baustellen });
    const offenePunkte = bereit.filter((x) => !x.ok);
    const ok = bereit.length - offenePunkte.length;
    return {
      art: 'Auftritt',
      icon: s.private ? 'lock' : 'celebration',
      klasse: 'karte-auftritt',
      titel: s.venue + (s.city ? ', ' + s.city : ''),
      unter: [`${tagText(s.date)}${s.time ? ' · ' + s.time + ' Uhr' : ''}`, wann(this.heute, s.date), keys.length ? `${keys.length} Songs · ${setTime(dauer)}` : 'noch keine Setlist'].join(' · '),
      status: { ok: !offenePunkte.length, text: offenePunkte.length ? `${ok} von ${bereit.length} bereit` : 'alles bereit' },
      verteilung: keys.length ? reife(keys, 'der Setlist').verteilung : undefined,
      punkte: offenePunkte.length ? offenePunkte.slice(0, 3).map((x) => ({ ok: false, text: x.text })) : [{ ok: true, text: 'Bereit? – alles abgehakt' }],
      modus: ['/backstage', id, 'setlist'],
      query: { buehne: 1 },
      bearbeiten: ['/backstage', id],
      modusText: 'Bühnen-Modus',
      bearbeitenText: 'Auftritt bearbeiten',
    };
  }

  private setlistKeys(s: Show): string[] {
    return loadSetlist(this.band.showId(s))
      .filter((e) => !isPause(e))
      .map((e) => songKeyVon(e as { title: string; artist: string }));
  }

  constructor() {
    // Synchronisation mit OneDrive (falls eingerichtet und „automatisch“): beim Öffnen und alle 15 Minuten
    inject(SyncService).automatisch();
    if (typeof window !== 'undefined') {
      alleSongNoten()
        .then((n) => this.noten.set(new Set(Object.keys(n))))
        .catch(() => undefined);
      offlineStand().then((x) => this.offline.set(x));
    }
    // Direktaufruf einer Unterseite: GitHub Pages leitet /backstage/<id>[/<teil>] über die Fehlerseite
    // nach /backstage/?auftritt=<id>[&teil=<teil>] um – von hier geht es zur eigentlichen Unterseite weiter
    // (der Teil hinter „#“, z. B. eine geteilte Setlist, kommt mit).
    const query = inject(ActivatedRoute).snapshot.queryParamMap;
    const id = query.get('auftritt');
    const teil = query.get('teil');
    // weitere Parameter (z. B. ?name= einer Sammlung) kommen mit
    const rest = Object.fromEntries(query.keys.filter((k) => k !== 'auftritt' && k !== 'teil').map((k) => [k, query.get(k)]));
    if (id) this.router.navigate(['/backstage', id, ...(teil ? [teil] : [])], { replaceUrl: true, preserveFragment: true, queryParams: rest });
  }
}
