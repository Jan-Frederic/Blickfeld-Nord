import { Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { datumText } from '../data/datum';
import { BandService } from '../data/band.service';
import { probenPlaene } from '../data/song-stand';
import { ProbePlan, ergebnis, letzteNotiz, loadProbe, markierenPerson, minutenText, naechsteProbe, notizSetzen, probenDauer, songKeyVon, speichereProbe, uebertragen, zeitDazu, zeitJeSong } from '../data/probe-modus';
import { SongMitschnitte } from './song-mitschnitte';
import { ladeIch, rufname } from '../data/band-ich';
import { alleFortschritte, bandStand, probeStaende } from '../data/fortschritt';
import { STATUS, UebeStatus, alleStatus, eigenerStatus, statusLabel, statusSetzen } from '../data/uebe-status';
import { ladeProbeNotizen, letzteNotizen, probeNotizSetzen } from '../data/probe-notiz';

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

// Probe-Modus (im Bühnen-Modus mit [probe]): Leiste unter dem Song – der eigene Übe-Status in fünf Stufen (Nicht gelernt,
// Üben, Wackelt noch, Sitzt, Eingenordet; für die Person am Gerät, zählt im Karteikasten und in der Bühnenreife), daneben
// der Status der anderen, die eigene Notiz (je Person, data/probe-notiz.ts), Mitschnitt, die Notizen der letzten Probe,
// Zeit am Song und wie viel Zeit für die restlichen Songs bleibt. Speichert sofort. Klicks und Tasten hier blättern
// nicht (der Bühnen-Modus reagiert sonst auf Tippen und Pfeiltasten).
@Component({
  selector: 'app-probe-leiste',
  imports: [MatIconModule, SongMitschnitte],
  host: { '(pointerdown)': '$event.stopPropagation()', '(pointerup)': '$event.stopPropagation()', '(keydown)': 'taste($event)' },
  template: `
    <div class="probe-leiste" role="group" aria-label="Probe">
      <div class="knoepfe">
        <div class="status-wahl" role="group" aria-label="Mein Übe-Status">
          @for (s of status; track s.id) {
            <button type="button" [class]="s.id" [class.an]="meinStatus() === s.id" [attr.aria-pressed]="meinStatus() === s.id" [disabled]="!ich()" (click)="setze(s.id)">{{ s.label }}</button>
          }
        </div>
        <button type="button" [class.an]="mitschnitt()" (click)="mitschnitt.set(!mitschnitt())" [attr.aria-pressed]="mitschnitt()" aria-label="Mitschnitt aufnehmen"><mat-icon>mic</mat-icon></button>
      </div>
      @if (!ich()) {
        <p class="andere">Unter Einstellungen „Ich bin …“ wählen, damit dein Übe-Status und deine Notizen zählen.</p>
      } @else if (andere(); as a) { <p class="andere">{{ a }}</p> }
      @if (vorher(); as v) { <p class="vorher">Letzte Probe ({{ datumText(v.tag) }}): {{ v.notiz }}</p> }
      @if (notizenAndere(); as n) { <p class="vorher">Heute: {{ n }}</p> }
      <input class="notiz" maxlength="80" [value]="meineNotiz()" [placeholder]="ich() ? 'Deine Notiz, z. B. Bridge wackelt' : 'Notiz fürs Protokoll'" aria-label="Meine Notiz zu diesem Song" (change)="notiz($any($event.target).value)" />
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
  protected readonly status = STATUS;
  private readonly band = inject(BandService);
  protected readonly datumText = datumText;
  protected readonly minutenText = minutenText;
  protected readonly plan = signal<ProbePlan>({ songs: [], notizen: '', punkte: [] });
  protected readonly mitschnitt = signal(false);
  protected readonly key = computed(() => songKeyVon(this.song()));
  protected readonly eintrag = computed(() => this.plan().songs.find((s) => songKeyVon(s) === this.key()));
  protected readonly mitglieder = this.band.members;
  protected readonly rufname = rufname;
  /** Person am Gerät (Einstellungen → „Ich bin …“) */
  protected readonly ich = signal(ladeIch());
  /** zählt hoch, wenn Status oder Notiz geändert wurden (neu lesen) */
  private readonly stand = signal(0);
  /** Stände dieser Probe je Song und Person (aus dem Verlauf) – für „nochmal“ im Plan und am Ende */
  private readonly staende = computed(() => (this.plan(), this.stand(), probeStaende(this.datum(), this.mitglieder, alleFortschritte(this.mitglieder))));
  protected readonly meinStatus = computed(() => (this.stand(), this.ich() ? eigenerStatus(this.key()) : null));
  /** „Fred: Sitzt · David: Üben“ – der aktuelle Übe-Status der anderen */
  protected readonly andere = computed(() => {
    this.stand();
    this.plan();
    const alle = alleStatus(this.mitglieder);
    return this.mitglieder
      .filter((m) => m.slug !== this.ich())
      .map((m) => `${rufname(m)}: ${statusLabel(alle.get(m.slug)?.get(this.key()) ?? 'nicht')}`)
      .join(' · ');
  });
  private readonly plaene = probenPlaene();
  /** Notizen der letzten Probe: Protokoll im Plan und die Notizen aller Musiker */
  protected readonly vorher = computed(() => {
    const plan = letzteNotiz(this.plaene, this.song(), this.datum());
    return letzteNotizen(this.mitglieder, new Map(plan ? [[this.key(), plan]] : []), this.datum()).get(this.key());
  });
  /** eigene Notiz in dieser Probe (ohne „Ich bin …“: das Protokoll im Plan) */
  protected readonly meineNotiz = computed(() => (this.stand(), this.ich() ? (ladeProbeNotizen(this.ich())[this.datum()]?.[this.key()] ?? '') : (this.eintrag()?.notiz ?? '')));
  /** Notizen der anderen in dieser Probe */
  protected readonly notizenAndere = computed(() => {
    this.stand();
    this.plan();
    return this.mitglieder
      .filter((m) => m.slug !== this.ich())
      .flatMap((m) => {
        const n = ladeProbeNotizen(m.slug)[this.datum()]?.[this.key()];
        return n ? [`${rufname(m)}: ${n}`] : [];
      })
      .join(' · ');
  });
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
  /** eigenen Übe-Status setzen (Datum der Probe); im Plan „geprobt“ und „nochmal“, solange er bei jemandem nicht sitzt */
  protected setze(status: UebeStatus): void {
    if (!this.ich()) return;
    statusSetzen(this.key(), status, 'probe', this.datum());
    this.stand.update((n) => n + 1);
    const band = bandStand(probeStaende(this.datum(), this.mitglieder, alleFortschritte(this.mitglieder)).get(this.key()));
    this.speichern(markierenPerson(loadProbe(this.datum()), this.song(), band));
  }
  protected notiz(text: string): void {
    if (this.ich()) {
      probeNotizSetzen(this.ich(), this.datum(), this.key(), text);
      this.stand.update((n) => n + 1);
    } else this.speichern(notizSetzen(loadProbe(this.datum()), this.song(), text));
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
  /** wer bei welchem Song welchen Status gesetzt hat (aus dem Verlauf) */
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
        const bei = nochmal
          ? this.mitglieder
              .filter((m) => {
                const st = this.wer().get(songKeyVon(s))?.get(m.slug);
                return st && st !== 'sitzt' && st !== 'eingenordet';
              })
              .map((m) => `${rufname(m)}: ${statusLabel(this.wer().get(songKeyVon(s))!.get(m.slug)!)}`)
          : [];
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
