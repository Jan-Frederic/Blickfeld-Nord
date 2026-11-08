import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { ladeIch, rufname } from '../data/band-ich';
import { fortschrittEintragen, ladeFortschritt } from '../data/fortschritt';
import { ladeWackelt, wackeltSetzen } from '../data/wackelt';
import { KASTEN_TAGE, Karte, alsGeuebtMerken, kastenTeilen, bewerten, heuteGeuebt, jeKasten, karten, ladeTagesziel, ladeUeben, nochHeute, speichereUeben } from '../data/ueben';
import { Entry, isPause, loadSetlist } from '../data/setlist-data';
import { gespielteTonart, songInfo } from '../data/songinfo';
import { taktHinweis } from '../data/takt';
import { LISTEN, songAbgleich } from '../data/playlisten';
import { auffrischenAnmelden } from '../data/neu-zeichnen';
import { datumText } from '../data/datum';
import { SetlistBuehne } from './setlist-buehne';
import { SongMitschnitte } from './song-mitschnitte';
import { Verlauf } from '../zurueck';
import { ActivatedRoute, Router } from '@angular/router';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Backstage → Üben: persönlicher Übemodus (Logik: data/ueben.ts). Oben die fünf Kästen des Karteikastens, darunter die
// wackelnden Songs in Übe-Reihenfolge (heute dran, Songs des nächsten Auftritts zuerst). „Üben starten“ zeigt eine Karte
// nach der anderen: Titel – im Kopf durchspielen – aufdecken (Tonart, Capo, Tempo, Takt, Notiz, Noten) – „Sitzt“ oder
// „Wackelt noch“. Pfeile blättern durch die Karten. Tasten: ← → blättern, Leertaste deckt auf, 1 wackelt, 2 sitzt,
// Escape beendet. Übe-Modus: dieselben Karten in der Notenansicht, „Wackelt noch“ / „Sitzt“ oben rechts.
@Component({
  selector: 'app-backstage-ueben',
  imports: [RouterLink, MatIconModule, SetlistBuehne, SongMitschnitte],
  host: { '(keydown)': 'taste($event)' },
  template: `
    <section class="section ueben">
      <p class="kicker">Backstage</p>
      <h2>Üben</h2>
      @if (!ich()) {
        <p class="lead">Der Übemodus ist persönlich: Wähle unter <a routerLink="/backstage/einstellungen">Einstellungen</a> „Ich bin …“ –
          dann stehen hier deine wackelnden Songs als Karteikarten.</p>
      } @else {
        <p class="lead">{{ name() }}: deine Songs, die noch wackeln, als Karteikarten. „Sitzt“ schiebt eine Karte einen Kasten weiter
          (sie kommt seltener dran), „Wackelt noch“ zurück in Kasten 1. Sitzt sie im letzten Kasten, ist der Song gelernt.</p>
        <ol class="kaesten" aria-label="Karteikasten">
          @for (n of kastenZahlen(); track $index; let i = $index) {
            <li [class.leer]="!n"><span class="n">{{ n }}</span><span class="l">Kasten {{ i + 1 }}</span><small>{{ i ? 'alle ' + tage[i] + (tage[i] === 1 ? ' Tag' : ' Tage') : 'sofort' }}</small></li>
          }
        </ol>

        @if (karte(); as k) {
          <!-- Lernkarte -->
          <div class="karten-reihe">
          <button type="button" class="rund blaettern" (click)="blaettern(-1)" [disabled]="pos() === 0" aria-label="Vorige Karte"><mat-icon>chevron_left</mat-icon></button>
          <div class="karte" [class.offen]="offen()" role="group" [attr.aria-label]="'Karte ' + (pos() + 1) + ' von ' + schlange().length">
            <div class="karte-kopf">
              <span>Karte {{ pos() + 1 }} / {{ schlange().length }} · Kasten {{ k.kasten }}</span>
              <button type="button" class="rund" (click)="beenden()" aria-label="Üben beenden"><mat-icon>close</mat-icon></button>
            </div>
            <p class="titel">{{ k.title }}</p>
            <p class="interpret">{{ k.artist }}</p>
            @if (k.auftritt) { <p class="auftritt">im Set am {{ datum(k.auftritt) }}</p> }
            @if (!offen()) {
              <p class="tipp">Im Kopf durchspielen: Anfang, Strophe, Refrain, Schluss – dann aufdecken.</p>
              <button type="button" class="primaer gross" (click)="offen.set(true)"><mat-icon>visibility</mat-icon> Aufdecken</button>
            } @else {
              <ul class="rueckseite">
                @for (z of rueckseite(); track z.l) { <li><span>{{ z.l }}</span> <strong>{{ z.w }}</strong></li> }
                @if (!rueckseite().length) { <li class="leer">Noch keine Tonart, kein Tempo eingetragen.</li> }
              </ul>
              <button type="button" class="noten" (click)="noten.set(k)"><mat-icon>library_music</mat-icon> Noten ansehen</button>
              <!-- Proben-Mitschnitte des Songs: anhören, Stelle wiederholen, langsamer -->
              <details class="mitschnitte-auf">
                <summary><mat-icon>graphic_eq</mat-icon> Mitschnitte</summary>
                <app-song-mitschnitte [songKey]="k.key" [titel]="k.title" />
              </details>
              <div class="wertung">
                <button type="button" class="wackelt" (click)="werten(false)"><mat-icon>replay</mat-icon> Wackelt noch</button>
                <button type="button" class="sitzt" (click)="werten(true)"><mat-icon>check</mat-icon> Sitzt</button>
              </div>
            }
            <p class="tasten">Tasten: ← → blättern · Leertaste deckt auf · 1 wackelt · 2 sitzt</p>
          </div>
          <button type="button" class="rund blaettern" (click)="blaettern(1)" [disabled]="pos() + 1 >= schlange().length" aria-label="Nächste Karte"><mat-icon>chevron_right</mat-icon></button>
          </div>
        } @else {
          @if (ergebnis(); as e) {
            <p class="ergebnis" role="status"><mat-icon>task_alt</mat-icon> Fertig: {{ e.sitzt }} gesessen, {{ e.wackelt }}× wackelt noch{{ e.gelernt ? ', ' + e.gelernt + ' gelernt 🎉' : '' }}.</p>
          }
          <p class="tagesziel">Heute {{ geuebt().length }} von {{ ziel }} Karten geübt
            <a routerLink="/backstage/einstellungen">Tagesziel ändern</a></p>
          <div class="start">
            @if (rest()) {
              <button type="button" class="primaer gross" (click)="starten(false)" [disabled]="!tagesKarten().length"><mat-icon>play_arrow</mat-icon> Üben starten ({{ tagesKarten().length }} {{ tagesKarten().length === 1 ? 'Karte' : 'Karten' }})</button>
            } @else {
              <p class="geschafft"><mat-icon>task_alt</mat-icon> Tagesziel geschafft.</p>
            }
            <button type="button" (click)="uebeModus(false)" [disabled]="!(rest() ? tagesKarten() : alle()).length"><mat-icon>fit_screen</mat-icon> Übe-Modus (Noten)</button>
            @if (alle().length > tagesKarten().length) { <button type="button" (click)="starten(true)"><mat-icon>style</mat-icon> Alle {{ alle().length }} üben</button> }
          </div>
          <h3>Deine wackelnden Songs</h3>
          <ul class="liste">
            @for (k of alle(); track k.key) {
              <li [class.dran]="k.dran">
                <span class="kasten" [attr.aria-label]="'Kasten ' + k.kasten">{{ k.kasten }}</span>
                <span class="song"><span class="t">{{ k.title }}</span>&ngsp;<span class="a">{{ k.artist }}</span>
                  <small>{{ k.dran ? 'heute dran' : 'wieder am ' + datum(k.faellig) }}{{ k.auftritt ? ' · im Set am ' + datum(k.auftritt) : '' }}</small></span>
                <button type="button" class="rund" (click)="entfernen(k)" [attr.aria-label]="k.title + ' sitzt – aus der Übe-Liste nehmen'" title="sitzt – aus der Liste"><mat-icon>close</mat-icon></button>
              </li>
            } @empty {
              <li class="leer">Nichts wackelt – stark! Songs kommen über „Wackelt noch“ (Song-Dialog, Nachbereitung, Probe-Modus) oder hier dazu.</li>
            }
          </ul>
          <label class="suche">
            <mat-icon aria-hidden="true">search</mat-icon>
            <input type="search" placeholder="Song zur Übe-Liste hinzufügen …" aria-label="Song zur Übe-Liste hinzufügen" [value]="suche()" (input)="suche.set($any($event.target).value)" />
          </label>
          @if (treffer().length) {
            <ul class="treffer">
              @for (t of treffer(); track t.key) {
                <li><button type="button" (click)="hinzu(t.key)"><span class="t">{{ t.title }}</span>&ngsp;<span class="a">{{ t.artist }}</span><mat-icon>add</mat-icon></button></li>
              }
            </ul>
          }
        }
      }
    </section>
    @if (noten(); as n) {
      <!-- Noten der Karte im Bühnen-Modus; Schließen führt zurück zur Karte -->
      <app-setlist-buehne [entries]="[{ title: n.title, artist: n.artist }]" [notenAuf]="true" (closed)="noten.set(null)" />
    }
    @if (modus(); as m) {
      <!-- Übe-Modus: Notenansicht der fälligen Karten, oben rechts „Wackelt noch“ / „Sitzt“ – weiter zur nächsten Karte -->
      <app-setlist-buehne [entries]="m" [notenAuf]="true" [ueben]="true" (bewertet)="ausModus($event)" (closed)="modusZu()" />
    }
  `,
})
export class BackstageUeben {
  private readonly band = inject(BandService);
  private readonly heute = new Date().toLocaleDateString('sv-SE');
  protected readonly tage = KASTEN_TAGE;
  protected readonly ich = signal(ladeIch());
  protected readonly name = computed(() => {
    const m = this.band.members.find((x) => x.slug === this.ich());
    return m ? rufname(m) : '';
  });

  private readonly wackelt = signal(ladeWackelt());
  private readonly stand = signal(ladeUeben());
  private readonly fortschritt = signal(this.ich() ? ladeFortschritt(this.ich()) : {});
  /** nächster Auftritt je Song (kommende Setlists auf diesem Gerät) */
  private readonly auftritte = (() => {
    const m = new Map<string, string>();
    for (const s of [...this.band.shows].filter((x) => (x.endDate ?? x.date) >= this.heute).sort((a, b) => a.date.localeCompare(b.date)))
      for (const e of loadSetlist(this.band.showId(s)) as Entry[]) if (!isPause(e) && !m.has(`${e.title}|${e.artist}`)) m.set(`${e.title}|${e.artist}`, s.date);
    return m;
  })();
  protected readonly alle = computed(() => karten(this.wackelt(), this.fortschritt(), this.stand(), this.auftritte, this.heute));
  protected readonly dran = computed(() => this.alle().filter((k) => k.dran));
  // Tagesziel je Person (Einstellungen): heute höchstens so viele Karten; „Alle üben“ geht darüber hinaus
  protected readonly ziel = ladeTagesziel();
  protected readonly geuebt = signal(heuteGeuebt(this.heute));
  protected readonly rest = computed(() => nochHeute(this.ziel, this.geuebt().length));
  protected readonly tagesKarten = computed(() => this.dran().filter((k) => !this.geuebt().includes(k.key)).slice(0, this.rest()));
  protected readonly kastenZahlen = computed(() => jeKasten(this.alle()));

  // Sitzung: Reihe der Karten (wackelnde kommen hinten wieder dran), aktuelle Position, aufgedeckt?
  protected readonly schlange = signal<string[]>([]);
  protected readonly pos = signal(0);
  protected readonly offen = signal(false);
  protected readonly ergebnis = signal<{ sitzt: number; wackelt: number; gelernt: number } | null>(null);
  protected readonly noten = signal<Karte | null>(null);
  protected readonly karte = computed(() => {
    const key = this.schlange()[this.pos()];
    if (!key) return null;
    return this.alle().find((k) => k.key === key) ?? this.letzte;
  });
  /** gelernte Karte bleibt bis zum Weiterblättern sichtbar, auch wenn sie aus der Liste fällt */
  private letzte: Karte | null = null;
  protected readonly rueckseite = computed(() => {
    const k = this.karte();
    const i = k ? songInfo(k.title, k.artist) : undefined;
    if (!i) return [];
    return [
      { l: 'Tonart', w: gespielteTonart(i) ?? '' },
      { l: 'Capo', w: i.capo ? String(i.capo) : '' },
      { l: 'Tempo', w: i.bpm ? `${i.bpm} bpm` : '' },
      { l: 'Takt', w: taktHinweis(i.takt) ?? '' },
      { l: 'Notiz', w: i.notiz ?? '' },
    ].filter((z) => z.w);
  });

  // Songs hinzufügen (alle Spotify-Listen)
  protected readonly suche = signal('');
  private readonly songs = songAbgleich(LISTEN);
  protected readonly treffer = computed(() => {
    const q = norm(this.suche().trim());
    if (q.length < 2) return [];
    const drin = new Set(this.alle().map((k) => k.key));
    return this.songs.filter((s) => !drin.has(s.key) && norm(`${s.title} ${s.artist}`).includes(q)).slice(0, 8);
  });

  private zaehler = { sitzt: 0, wackelt: 0, gelernt: 0 };

  private readonly verlauf = inject(Verlauf);

  constructor() {
    // beim Öffnen den aktuellen Kasten-Stand für die Band ablegen (auch noch nie bewertete Karten, Kasten 1)
    queueMicrotask(() => kastenTeilen(this.ich(), this.alle(), this.heute));
    // aus der Übersicht („Üben“ → Übe-Modus): ?modus=1 startet gleich die Notenansicht der fälligen Karten
    const route = inject(ActivatedRoute);
    if (route.snapshot.queryParamMap.get('modus')) {
      const router = inject(Router);
      queueMicrotask(() => {
        this.uebeModus(true);
        void router.navigate([], { relativeTo: route, queryParams: { modus: null }, queryParamsHandling: 'merge', replaceUrl: true });
      });
    }
    // neue Daten der Band (Abgleich): eigene Listen neu einlesen, ohne die Seite neu aufzubauen
    inject(DestroyRef).onDestroy(
      auffrischenAnmelden(() => {
        this.ich.set(ladeIch());
        this.wackelt.set(ladeWackelt());
        this.stand.set(ladeUeben());
        this.fortschritt.set(this.ich() ? ladeFortschritt(this.ich()) : {});
      }),
    );
  }

  protected datum(d: string): string {
    return datumText(d);
  }

  protected starten(alle: boolean): void {
    this.schlange.set((alle ? this.alle() : this.tagesKarten()).map((k) => k.key));
    this.pos.set(0);
    this.offen.set(false);
    this.ergebnis.set(null);
    this.zaehler = { sitzt: 0, wackelt: 0, gelernt: 0 };
  }
  protected beenden(): void {
    const z = this.zaehler;
    this.schlange.set([]);
    this.ergebnis.set(z.sitzt + z.wackelt ? { ...z } : null);
  }
  protected werten(sitzt: boolean): void {
    const k = this.karte();
    if (!k || !this.offen()) return;
    this.festhalten(k, sitzt);
    // wackelt: hinten noch einmal anstellen (Kasten 1 ist sofort wieder dran)
    if (!sitzt) this.schlange.update((s) => [...s, k.key]);
    this.offen.set(false);
    if (this.pos() + 1 >= this.schlange().length) this.beenden();
    else this.pos.update((p) => p + 1);
  }
  /** Bewertung speichern: Kasten, Fortschritt (Bühnenreife), Tagesziel; im letzten Kasten gelernt */
  private festhalten(k: Karte, sitzt: boolean): void {
    const r = bewerten(this.stand(), k.key, sitzt, this.heute);
    this.stand.set(r.stand);
    speichereUeben(r.stand);
    // zählt im Fortschritt (Quelle „ueben“) und damit in der Bühnenreife; heute geübt fürs Tagesziel
    fortschrittEintragen(this.ich(), k.key, sitzt ? 'sitzt' : 'wackelt', 'ueben', this.heute);
    this.fortschritt.set(ladeFortschritt(this.ich()));
    this.geuebt.set(alsGeuebtMerken(k.key, this.heute));
    if (sitzt) this.zaehler.sitzt++;
    else this.zaehler.wackelt++;
    if (r.gelernt) {
      // gelernt: aus „Wackelt noch“ (zählt im Fortschritt als „sitzt“)
      this.zaehler.gelernt++;
      this.letzte = k;
      this.wackelt.set(wackeltSetzen(k.key, false));
      this.fortschritt.set(ladeFortschritt(this.ich()));
    }
    // für die Band: Kästen (Übe-Statistik unter Bühnenreife, Probe-Vorschlag) und Gelerntes
    kastenTeilen(this.ich(), this.alle(), this.heute, { geuebt: true, gelernt: r.gelernt ? k.key : undefined });
  }
  /** Karten durchblättern, ohne zu bewerten */
  protected blaettern(r: -1 | 1): void {
    const p = this.pos() + r;
    if (p < 0 || p >= this.schlange().length) return;
    this.pos.set(p);
    this.offen.set(false);
  }

  // Übe-Modus: dieselben Karten in der Notenansicht (Bühnen-Modus mit Noten), bewertet oben rechts
  protected readonly modus = signal<Entry[] | null>(null);
  private modusVonLink = false;
  protected uebeModus(vonLink: boolean): void {
    const k = this.rest() ? this.tagesKarten() : this.alle();
    if (!k.length) return;
    this.zaehler = { sitzt: 0, wackelt: 0, gelernt: 0 };
    this.ergebnis.set(null);
    this.modusVonLink = vonLink;
    this.modus.set(k.map((x) => ({ title: x.title, artist: x.artist })));
  }
  protected ausModus(e: { title: string; artist: string; sitzt: boolean }): void {
    const key = `${e.title}|${e.artist}`;
    const k = this.alle().find((x) => x.key === key) ?? { key, title: e.title, artist: e.artist, kasten: 1, faellig: this.heute, dran: true };
    this.festhalten(k, e.sitzt);
  }
  protected modusZu(): void {
    this.modus.set(null);
    const z = this.zaehler;
    this.ergebnis.set(z.sitzt + z.wackelt ? { ...z } : null);
    // aus der Übersicht gestartet: zurück dorthin
    if (this.modusVonLink) {
      this.modusVonLink = false;
      this.verlauf.zurueck();
    }
  }
  protected entfernen(k: Karte): void {
    if (!confirm(`„${k.title}“ sitzt? Dann kommt er aus deiner Übe-Liste.`)) return;
    const { [k.key]: _, ...rest } = this.stand();
    this.stand.set(rest);
    speichereUeben(rest);
    this.wackelt.set(wackeltSetzen(k.key, false));
    this.fortschritt.set(ladeFortschritt(this.ich()));
    kastenTeilen(this.ich(), this.alle(), this.heute);
  }
  protected hinzu(key: string): void {
    this.wackelt.set(wackeltSetzen(key, true));
    this.fortschritt.set(ladeFortschritt(this.ich()));
    kastenTeilen(this.ich(), this.alle(), this.heute);
    this.suche.set('');
  }

  protected taste(e: KeyboardEvent): void {
    if (!this.karte() || this.noten() || this.modus() || (e.target as HTMLElement).closest('input, select, textarea')) return;
    if ((e.key === ' ' || e.key === 'Enter') && !this.offen() && !(e.target as HTMLElement).closest('button')) this.offen.set(true);
    else if (e.key === 'ArrowLeft') this.blaettern(-1);
    else if (e.key === 'ArrowRight') this.blaettern(1);
    else if (e.key === '1' && this.offen()) this.werten(false);
    else if (e.key === '2' && this.offen()) this.werten(true);
    else if (e.key === 'Escape') this.beenden();
    else return;
    e.preventDefault();
  }
}
