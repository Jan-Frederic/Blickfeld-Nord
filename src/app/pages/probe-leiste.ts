import { Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { datumText } from '../data/datum';
import { BandService } from '../data/band.service';
import { probenPlaene } from '../data/song-stand';
import {
  ProbePlan,
  durchlauf,
  ergebnis,
  letzteNotiz,
  loadProbe,
  markieren,
  markierenPerson,
  minutenText,
  naechsteProbe,
  notizSetzen,
  probenDauer,
  songKeyVon,
  speichereProbe,
  uebertragen,
  zeitDazu,
  zeitJeSong,
} from '../data/probe-modus';
import { SongMitschnitte } from './song-mitschnitte';
import { ichSetzen, ladeIch, rufname } from '../data/band-ich';
import { alleFortschritte, bandStand, fortschrittEintragen, probeStaende } from '../data/fortschritt';
import { ladeWackelt, wackeltSetzen } from '../data/wackelt';
import { gespielteTonart, songInfo } from '../data/songinfo';
import { sprungHinweis } from '../data/tonart-uebergang';

type Song = { title: string; artist: string };

/** Sekunden bis zum Probenende: am Probentag nach der Uhr, sonst die Probendauer ab dem Start des Probe-Modus */
function restZeit(p: { date: string; time?: string; endTime?: string } | undefined, start: number, jetzt: number): number {
  if (!p?.time) return 0;
  const heute = new Date(jetzt).toLocaleDateString('sv-SE');
  if (heute === p.date) {
    const ende = new Date(`${p.date}T${p.endTime ?? p.time}:00`).getTime() + (p.endTime ? 0 : 3 * 3600_000);
    return Math.round((ende - jetzt) / 1000);
  }
  return probenDauer(p) - Math.round((jetzt - start) / 1000);
}

// Probe-Modus (im Bühnen-Modus mit [probe]): Leiste unter dem Song – Sitzt / Nochmal (für die Person am Gerät: zählt in
// ihrem Fortschritt und ihrer „Wackelt noch“-Liste; die Stände der anderen stehen daneben), Durchläufe, Notiz, Mitschnitt,
// Notiz der letzten Probe, Zeit am Song und wie viel Zeit für die restlichen Songs bleibt. Speichert sofort in den
// Probenplan. Klicks und Tasten hier blättern nicht (der Bühnen-Modus reagiert sonst auf Tippen und Pfeiltasten).
@Component({
  selector: 'app-probe-leiste',
  imports: [MatIconModule, SongMitschnitte],
  host: { '(pointerdown)': '$event.stopPropagation()', '(pointerup)': '$event.stopPropagation()', '(keydown)': 'taste($event)' },
  template: `
    <div class="probe-leiste" role="group" aria-label="Probe">
      <div class="knoepfe">
        <button type="button" class="sitzt" [class.an]="meinStand() === 'sitzt'" (click)="markiere('sitzt')" [attr.aria-pressed]="meinStand() === 'sitzt'"><mat-icon>check_circle</mat-icon> Sitzt</button>
        <button type="button" class="nochmal" [class.an]="meinStand() === 'nochmal'" (click)="markiere('nochmal')" [attr.aria-pressed]="meinStand() === 'nochmal'"><mat-icon>replay</mat-icon> Nochmal</button>
        <button type="button" (click)="lauf(1)" aria-label="Durchlauf zählen"><mat-icon>repeat</mat-icon> {{ eintrag()?.durchlaeufe ? eintrag()!.durchlaeufe + '× gespielt' : 'Durchlauf' }}</button>
        @if (eintrag()?.durchlaeufe) { <button type="button" class="klein" (click)="lauf(-1)" aria-label="Durchlauf zurücknehmen">−1</button> }
        @if (naechster()) {
          <button type="button" [class.an]="uebergang()" (click)="uebergang.set(!uebergang())" [attr.aria-pressed]="uebergang()" title="Übergang zum nächsten Song üben"><mat-icon>trending_flat</mat-icon> Übergang</button>
        }
        <button type="button" [class.an]="mitschnitt()" (click)="mitschnitt.set(!mitschnitt())" [attr.aria-pressed]="mitschnitt()" aria-label="Mitschnitt aufnehmen"><mat-icon>mic</mat-icon></button>
      </div>
      @if (!ich()) {
        <label class="ich">Ich bin
          <select (change)="ichWaehlen($any($event.target).value)" aria-label="Wer bist du? Sitzt/Nochmal zählt dann für dich">
            <option value="">– wählen, damit Sitzt/Nochmal für dich zählt –</option>
            @for (m of mitglieder; track m.slug) { <option [value]="m.slug">{{ rufname(m) }}</option> }
          </select>
        </label>
      } @else if (andere(); as a) { <p class="andere">{{ a }}</p> }
      @if (uebergang() && uebergangText(); as u) { <p class="uebergang" role="note">{{ u }}</p> }
      @if (vorher(); as v) { <p class="vorher">Letzte Probe ({{ datumText(v.tag) }}): {{ v.notiz }}</p> }
      <input class="notiz" maxlength="80" [value]="eintrag()?.notiz ?? ''" placeholder="Notiz fürs Protokoll, z. B. Bridge wackelt" aria-label="Notiz zu diesem Song" (change)="notiz($any($event.target).value)" />
      <p class="zeit">
        Dran seit {{ uhr(seit()) }}@if (eintrag()?.zeit) { · vorher schon {{ minutenText(eintrag()!.zeit!) }} }
        @if (proSong(); as z) { · für jeden offenen Song noch ~{{ minutenText(z) }} } @else if (rest() < 0 && dauer()) { · Probenzeit vorbei }
      </p>
      @if (mitschnitt()) { <app-song-mitschnitte [songKey]="key()" [titel]="song().title" /> }
    </div>
  `,
})
export class ProbeLeiste {
  readonly datum = input.required<string>();
  readonly song = input.required<Song>();
  /** Song danach (für „Übergang“) */
  readonly naechster = input<Song>();
  protected readonly uebergang = signal(false);
  /** Ende dieses Songs → Anfang des nächsten: Tonart (mit Überleitung bei einem Sprung) und Tempo */
  protected readonly uebergangText = computed(() => {
    const b = this.naechster();
    if (!b) return '';
    const ia = songInfo(this.song().title, this.song().artist);
    const ib = songInfo(b.title, b.artist);
    const ta = gespielteTonart(ia);
    const tb = gespielteTonart(ib);
    const tonart = ta && tb ? (sprungHinweis(ta, tb) ?? (ta === tb ? `beide in ${ta}` : `${ta} → ${tb}`)) : 'Tonart fehlt';
    const tempo = ia?.bpm && ib?.bpm ? `${ia.bpm} → ${ib.bpm} bpm${Math.abs(ia.bpm - ib.bpm) >= 25 ? ' (großer Tempowechsel – kurz absprechen, wer einzählt)' : ''}` : 'Tempo fehlt';
    return `Übergang zu „${b.title}“: ${tonart} · ${tempo}${ib?.capo ? ` · danach Capo ${ib.capo}` : ''}. Letzte Takte spielen, dann direkt einsteigen.`;
  });
  private readonly band = inject(BandService);
  protected readonly datumText = datumText;
  protected readonly minutenText = minutenText;
  protected readonly plan = signal<ProbePlan>({ songs: [], notizen: '', punkte: [] });
  protected readonly mitschnitt = signal(false);
  protected readonly key = computed(() => songKeyVon(this.song()));
  protected readonly eintrag = computed(() => this.plan().songs.find((s) => songKeyVon(s) === this.key()));
  protected readonly mitglieder = this.band.members;
  protected readonly rufname = rufname;
  /** Person am Gerät (Probe → „Ich bin …“) – ohne gilt Sitzt/Nochmal für die Band wie bisher */
  protected readonly ich = signal(ladeIch());
  /** Stände dieser Probe je Song und Person (aus den Fortschritten) */
  private readonly staende = computed(() => (this.plan(), probeStaende(this.datum(), this.mitglieder, alleFortschritte(this.mitglieder))));
  protected readonly meinStand = computed(() => {
    if (!this.ich()) return this.eintrag()?.stand;
    const s = this.staende().get(this.key())?.get(this.ich());
    return s === 'wackelt' ? 'nochmal' : s;
  });
  /** „Fred: sitzt · David: nochmal“ – die anderen in dieser Probe */
  protected readonly andere = computed(() =>
    this.mitglieder
      .filter((m) => m.slug !== this.ich())
      .map((m) => {
        const s = this.staende().get(this.key())?.get(m.slug);
        return s ? `${rufname(m)}: ${s === 'wackelt' ? 'nochmal' : 'sitzt'}` : '';
      })
      .filter(Boolean)
      .join(' · '),
  );
  private readonly plaene = probenPlaene();
  protected readonly vorher = computed(() => letzteNotiz(this.plaene, this.song(), this.datum()));
  private readonly probe = computed(() => this.band.rehearsals.find((r) => r.date === this.datum()));
  protected readonly dauer = computed(() => probenDauer(this.probe()));
  private readonly start = Date.now();
  private readonly jetzt = signal(Date.now());
  private songStart = Date.now();
  private aktuell: Song | undefined;
  protected readonly seit = computed(() => {
    this.song();
    return Math.max(0, Math.round((this.jetzt() - this.songStart) / 1000));
  });
  protected readonly rest = computed(() => restZeit(this.probe(), this.start, this.jetzt()));
  protected readonly proSong = computed(() => zeitJeSong(this.rest(), ergebnis(this.plan(), (s) => bandStand(this.staende().get(songKeyVon(s)))).offen.filter((s) => songKeyVon(s) !== this.key()).length + (this.eintrag()?.done ? 0 : 1)));

  constructor() {
    const t = setInterval(() => this.jetzt.set(Date.now()), 1000);
    effect(() => {
      const s = this.song();
      const d = this.datum();
      untracked(() => {
        this.zeitBuchen(d);
        this.aktuell = s;
        this.songStart = Date.now();
        this.mitschnitt.set(false);
        this.uebergang.set(false);
        this.plan.set(loadProbe(d));
      });
    });
    inject(DestroyRef).onDestroy(() => {
      clearInterval(t);
      this.zeitBuchen(this.datum());
    });
  }

  /** Zeit am bisherigen Song in den Plan schreiben */
  private zeitBuchen(datum: string): void {
    if (!this.aktuell) return;
    const sek = Math.round((Date.now() - this.songStart) / 1000);
    this.speichern(zeitDazu(loadProbe(datum), this.aktuell, sek), datum);
  }

  private speichern(plan: ProbePlan, datum = this.datum()): void {
    this.plan.set(plan);
    speichereProbe(datum, plan);
  }

  protected uhr(sek: number): string {
    return `${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, '0')}`;
  }
  protected markiere(stand: 'sitzt' | 'nochmal'): void {
    const ich = this.ich();
    if (!ich) {
      this.speichern(markieren(loadProbe(this.datum()), this.song(), stand));
      return;
    }
    // für mich: Fortschritt (Datum der Probe) und „Wackelt noch“-Liste; im Plan nur „geprobt“ und die Band-Notiz
    fortschrittEintragen(ich, this.key(), stand === 'sitzt' ? 'sitzt' : 'wackelt', 'probe', this.datum());
    wackeltSetzen(this.key(), stand === 'nochmal', undefined, 'probe');
    const band = bandStand(probeStaende(this.datum(), this.mitglieder, alleFortschritte(this.mitglieder)).get(this.key()));
    this.speichern(markierenPerson(loadProbe(this.datum()), this.song(), band));
  }
  protected ichWaehlen(slug: string): void {
    ichSetzen(slug, ladeWackelt());
    this.ich.set(ladeIch());
  }
  protected lauf(delta: number): void {
    this.speichern(durchlauf(loadProbe(this.datum()), this.song(), delta));
  }
  protected notiz(text: string): void {
    this.speichern(notizSetzen(loadProbe(this.datum()), this.song(), text));
  }
  /** Tippen in die Notiz soll nicht blättern oder bewerten */
  protected taste(e: KeyboardEvent): void {
    if ((e.target as HTMLElement).closest('input, textarea')) e.stopPropagation();
  }
}

// Ende des Probe-Modus: was sitzt, was nochmal dran muss, was nicht drankam – und beides mit einem Klick auf den Plan
// der nächsten Probe.
@Component({
  selector: 'app-probe-ende',
  imports: [MatIconModule],
  host: { '(pointerdown)': '$event.stopPropagation()', '(pointerup)': '$event.stopPropagation()' },
  template: `
    <div class="probe-ende">
      <h2>Probe geschafft</h2>
      @let e = erg();
      <p class="zeile sitzt"><mat-icon>check_circle</mat-icon> Sitzt ({{ e.sitzt.length }}): {{ titel(e.sitzt) || '–' }}</p>
      <p class="zeile nochmal"><mat-icon>replay</mat-icon> Nochmal ({{ e.nochmal.length }}): {{ titel(e.nochmal, true) || '–' }}</p>
      <p class="zeile offen"><mat-icon>schedule</mat-icon> Nicht drangekommen ({{ e.offen.length }}): {{ titel(e.offen) || '–' }}</p>
      @if (e.zeit) { <p class="zeile">Geprobt: {{ minutenText(e.zeit) }}</p> }
      @if (naechste(); as n) {
        @if (e.nochmal.length + e.offen.length) {
          <button type="button" (click)="mitnehmen()" [disabled]="!!meldung()"><mat-icon>event_repeat</mat-icon> {{ e.nochmal.length + e.offen.length }} {{ e.nochmal.length + e.offen.length === 1 ? 'Song' : 'Songs' }} auf die nächste Probe ({{ datumText(n.date) }})</button>
        }
      } @else { <p class="zeile">Noch keine weitere Probe eingetragen.</p> }
      @if (meldung(); as m) { <p class="zeile sitzt" role="status">{{ m }}</p> }
      <button type="button" class="zu" (click)="schliessen.emit()"><mat-icon>close</mat-icon> Probe-Modus beenden</button>
    </div>
  `,
})
export class ProbeEnde {
  readonly datum = input.required<string>();
  readonly schliessen = output<void>();
  private readonly band = inject(BandService);
  protected readonly datumText = datumText;
  protected readonly minutenText = minutenText;
  // einen Takt später neu lesen: die Leiste des letzten Songs bucht ihre Zeit beim Schließen
  private readonly tick = signal(0);
  private readonly mitglieder = this.band.members;
  /** wer bei welchem Song was gedrückt hat (aus den Fortschritten) */
  private readonly wer = computed(() => (this.tick(), probeStaende(this.datum(), this.mitglieder, alleFortschritte(this.mitglieder))));
  protected readonly erg = computed(() => (this.tick(), ergebnis(loadProbe(this.datum()), (s) => bandStand(this.wer().get(songKeyVon(s))))));
  constructor() {
    setTimeout(() => this.tick.set(1));
  }
  protected readonly naechste = computed(() => naechsteProbe(this.band.rehearsals, this.datum()));
  protected readonly meldung = signal('');

  protected titel(songs: Song[], nochmal = false): string {
    return songs
      .map((s) => {
        const bei = nochmal ? this.mitglieder.filter((m) => this.wer().get(songKeyVon(s))?.get(m.slug) === 'wackelt').map(rufname) : [];
        return bei.length ? `${s.title} (${bei.join(', ')})` : s.title;
      })
      .join(', ');
  }

  protected mitnehmen(): void {
    const n = this.naechste();
    if (!n) return;
    const e = this.erg();
    const { plan, neu } = uebertragen(loadProbe(n.date), [...e.nochmal, ...e.offen]);
    speichereProbe(n.date, plan);
    this.meldung.set(neu ? `${neu} ${neu === 1 ? 'Song steht' : 'Songs stehen'} jetzt auf dem Plan für den ${datumText(n.date)} ✓` : `Alles stand schon auf dem Plan für den ${datumText(n.date)} ✓`);
  }
}
