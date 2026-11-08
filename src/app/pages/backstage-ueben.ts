import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { ladeIch, rufname } from '../data/band-ich';
import { KASTEN_TAGE, alsGeuebtMerken, heuteGeuebt, jeKasten, karten, ladeTagesziel, ladeUeben, nochHeute } from '../data/ueben';
import { STATUS, UebeStatus, eigeneStatus, karteBewerten, statusAusKasten, statusLabel, statusMigrieren, statusSetzen } from '../data/uebe-status';
import { Entry, isPause, loadSetlist } from '../data/setlist-data';
import { LISTEN, songAbgleich } from '../data/playlisten';
import { auffrischenAnmelden } from '../data/neu-zeichnen';
import { datumText } from '../data/datum';
import { SetlistBuehne } from './setlist-buehne';
import { Verlauf } from '../zurueck';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Backstage → Üben: persönlicher Karteikasten (Logik: data/ueben.ts, Status: data/uebe-status.ts). Oben die fünf Kästen
// (1 Üben, 2–3 Wackelt noch, 4–5 Sitzt), darunter ein Knopf „Übe-Modus“: die Karten in der Notenansicht, oben rechts
// „Wackelt noch“ / „Sitzt“ – „Sitzt“ schiebt die Karte einen Kasten weiter, im letzten ist der Song eingenordet und fällt
// heraus; „Wackelt noch“ zurück in Kasten 1. Heute fällige Karten kommen zuerst, das Tagesziel ist nur eine Empfehlung.
// Darunter alle Songs im Kasten mit ihrem Status (änderbar) und eine Suche, um Songs hinzuzufügen („Üben“, Kasten 1).
@Component({
  selector: 'app-backstage-ueben',
  imports: [RouterLink, MatIconModule, SetlistBuehne],
  template: `
    <section class="section ueben">
      <p class="kicker">Backstage</p>
      <h2>Üben</h2>
      @if (!ich()) {
        <p class="lead">Üben ist persönlich: Wähle unter <a routerLink="/backstage/einstellungen">Einstellungen</a> „Ich bin …“ –
          dann stehen hier deine Songs im Karteikasten.</p>
      } @else {
        <p class="lead">{{ name() }}: deine Songs im Karteikasten. Kasten 1 heißt <b>Üben</b>, 2 und 3 <b>Wackelt noch</b>, 4 und 5 <b>Sitzt</b>.
          „Sitzt“ schiebt eine Karte einen Kasten weiter (sie kommt seltener dran), „Wackelt noch“ zurück in Kasten 1.
          Sitzt sie im letzten Kasten, ist der Song <b>eingenordet</b> und fällt heraus.</p>
        <ol class="kaesten" aria-label="Karteikasten">
          @for (n of kastenZahlen(); track $index; let i = $index) {
            <li [class.leer]="!n"><span class="n">{{ n }}</span><span class="l">Kasten {{ i + 1 }}</span><span class="s">{{ label(i + 1) }}</span><small>{{ i ? 'alle ' + tage[i] + (tage[i] === 1 ? ' Tag' : ' Tage') : 'sofort' }}</small></li>
          }
        </ol>
        @if (eingenordet()) { <p class="eingenordet"><mat-icon>verified</mat-icon> {{ eingenordet() }} {{ eingenordet() === 1 ? 'Song' : 'Songs' }} eingenordet</p> }

        @if (ergebnis(); as e) {
          <p class="ergebnis" role="status"><mat-icon>task_alt</mat-icon> Fertig: {{ e.sitzt }} gesessen, {{ e.wackelt }}× wackelt noch{{ e.eingenordet ? ', ' + e.eingenordet + ' eingenordet 🎉' : '' }}.</p>
        }
        <button type="button" class="primaer gross" (click)="uebeModus(false)"><mat-icon>fit_screen</mat-icon> Übe-Modus</button>
        <p class="tagesziel">Empfehlung: {{ ziel }} Karten am Tag · heute {{ geuebt().length }} geübt{{ dran().length ? ' · ' + dran().length + ' fällig' : '' }}
          <a routerLink="/backstage/einstellungen">ändern</a></p>
        @if (leerHinweis()) { <p class="hinweis" role="status">Noch keine Karten – füge unten einen Song hinzu.</p> }

        <h3>Deine Songs im Karteikasten</h3>
        <ul class="liste">
          @for (k of alle(); track k.key) {
            <li [class.dran]="k.dran">
              <span class="kasten" [attr.aria-label]="'Kasten ' + k.kasten">{{ k.kasten }}</span>
              <span class="song"><span class="t">{{ k.title }}</span>&ngsp;<span class="a">{{ k.artist }}</span>
                <small>{{ k.dran ? 'heute dran' : 'wieder am ' + datum(k.faellig) }}{{ k.auftritt ? ' · im Set am ' + datum(k.auftritt) : '' }}</small></span>
              <select [class]="statusAusKasten(k.kasten)" [attr.aria-label]="'Status von ' + k.title" (change)="setzen(k.key, $any($event.target).value)">
                @for (s of status; track s.id) { <option [value]="s.id" [selected]="s.id === statusAusKasten(k.kasten)">{{ s.label }}</option> }
              </select>
            </li>
          } @empty {
            <li class="leer">Der Karteikasten ist leer. Songs kommen über den Status (Song-Dialog, Probe-Modus, Nachbereitung) oder hier dazu.</li>
          }
        </ul>
        <label class="suche">
          <mat-icon aria-hidden="true">search</mat-icon>
          <input type="search" placeholder="Song zum Üben hinzufügen …" aria-label="Song zum Üben hinzufügen" [value]="suche()" (input)="suche.set($any($event.target).value)" />
        </label>
        @if (treffer().length) {
          <ul class="treffer">
            @for (t of treffer(); track t.key) {
              <li><button type="button" (click)="hinzu(t.key)"><span class="t">{{ t.title }}</span>&ngsp;<span class="a">{{ t.artist }}{{ t.status !== 'nicht' ? ' · ' + statusLabel(t.status) : '' }}</span><mat-icon>add</mat-icon></button></li>
            }
          </ul>
        }
      }
    </section>
    @if (modus(); as m) {
      <!-- Übe-Modus: Notenansicht der Karten, oben rechts „Wackelt noch“ / „Sitzt“ – weiter zur nächsten Karte -->
      <app-setlist-buehne [entries]="m" [notenAuf]="true" [ueben]="true" (bewertet)="ausModus($event)" (closed)="modusZu()" />
    }
  `,
})
export class BackstageUeben {
  private readonly band = inject(BandService);
  private readonly heute = new Date().toLocaleDateString('sv-SE');
  protected readonly tage = KASTEN_TAGE;
  protected readonly status = STATUS;
  protected readonly statusAusKasten = statusAusKasten;
  protected readonly statusLabel = statusLabel;
  protected readonly ich = signal(ladeIch());
  protected readonly name = computed(() => {
    const m = this.band.members.find((x) => x.slug === this.ich());
    return m ? rufname(m) : '';
  });

  /** zählt hoch nach jeder Änderung (Kasten, Status) – alles neu lesen */
  private readonly stand = signal(0);
  /** nächster Auftritt je Song (kommende Setlists auf diesem Gerät) */
  private readonly auftritte = (() => {
    const m = new Map<string, string>();
    for (const s of [...this.band.shows].filter((x) => (x.endDate ?? x.date) >= this.heute).sort((a, b) => a.date.localeCompare(b.date)))
      for (const e of loadSetlist(this.band.showId(s)) as Entry[]) if (!isPause(e) && !m.has(`${e.title}|${e.artist}`)) m.set(`${e.title}|${e.artist}`, s.date);
    return m;
  })();
  protected readonly alle = computed(() => (this.stand(), karten(ladeUeben(), this.auftritte, this.heute)));
  private readonly eigene = computed(() => (this.stand(), eigeneStatus()));
  protected readonly eingenordet = computed(() => [...this.eigene().values()].filter((s) => s === 'eingenordet').length);
  protected readonly ziel = ladeTagesziel();
  protected readonly geuebt = signal(heuteGeuebt(this.heute));
  /** heute fällig und noch nicht geübt */
  protected readonly dran = computed(() => this.alle().filter((k) => k.dran && !this.geuebt().includes(k.key)));
  protected readonly kastenZahlen = computed(() => jeKasten(this.alle()));
  protected readonly ergebnis = signal<{ sitzt: number; wackelt: number; eingenordet: number } | null>(null);
  protected readonly leerHinweis = signal(false);

  // Songs hinzufügen (alle Spotify-Listen)
  protected readonly suche = signal('');
  private readonly songs = songAbgleich(LISTEN);
  protected readonly treffer = computed(() => {
    const q = norm(this.suche().trim());
    if (q.length < 2) return [];
    const drin = new Set(this.alle().map((k) => k.key));
    return this.songs
      .filter((s) => !drin.has(s.key) && norm(`${s.title} ${s.artist}`).includes(q))
      .slice(0, 8)
      .map((s) => ({ ...s, status: this.eigene().get(s.key) ?? ('nicht' as UebeStatus) }));
  });

  private zaehler = { sitzt: 0, wackelt: 0, eingenordet: 0 };
  private readonly verlauf = inject(Verlauf);

  constructor() {
    // einmalig vom alten Stand („Wackelt noch“-Liste, Fortschritt) auf die fünf Status umstellen
    statusMigrieren();
    // aus der Übersicht („Üben“ → Übe-Modus): ?modus=1 startet gleich die Notenansicht
    const route = inject(ActivatedRoute);
    if (route.snapshot.queryParamMap.get('modus')) {
      const router = inject(Router);
      queueMicrotask(() => {
        this.uebeModus(true);
        void router.navigate([], { relativeTo: route, queryParams: { modus: null }, queryParamsHandling: 'merge', replaceUrl: true });
      });
    }
    // neue Daten der Band (Abgleich): eigenen Stand neu einlesen, ohne die Seite neu aufzubauen
    inject(DestroyRef).onDestroy(
      auffrischenAnmelden(() => {
        this.ich.set(ladeIch());
        statusMigrieren();
        this.stand.update((n) => n + 1);
      }),
    );
  }

  protected datum(d: string): string {
    return datumText(d);
  }
  protected label(kasten: number): string {
    return statusLabel(statusAusKasten(kasten));
  }

  // Übe-Modus: die Karten in der Notenansicht (Bühnen-Modus mit Noten), bewertet oben rechts. Immer möglich:
  // heute fällige zuerst, danach alle übrigen – das Tagesziel hält niemanden vom Üben ab.
  protected readonly modus = signal<Entry[] | null>(null);
  private modusVonLink = false;
  protected uebeModus(vonLink: boolean): void {
    const dran = this.dran();
    const k = [...dran, ...this.alle().filter((x) => !dran.includes(x))];
    if (!k.length) {
      this.leerHinweis.set(true);
      if (vonLink) this.verlauf.zurueck();
      return;
    }
    this.leerHinweis.set(false);
    this.zaehler = { sitzt: 0, wackelt: 0, eingenordet: 0 };
    this.ergebnis.set(null);
    this.modusVonLink = vonLink;
    this.modus.set(k.map((x) => ({ title: x.title, artist: x.artist })));
  }
  protected ausModus(e: { title: string; artist: string; sitzt: boolean }): void {
    const key = `${e.title}|${e.artist}`;
    const r = karteBewerten(key, e.sitzt, this.heute);
    this.geuebt.set(alsGeuebtMerken(key, this.heute));
    if (e.sitzt) this.zaehler.sitzt++;
    else this.zaehler.wackelt++;
    if (r.eingenordet) this.zaehler.eingenordet++;
    this.stand.update((n) => n + 1);
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
  protected setzen(key: string, status: UebeStatus): void {
    statusSetzen(key, status, 'liste');
    this.stand.update((n) => n + 1);
  }
  protected hinzu(key: string): void {
    statusSetzen(key, 'ueben', 'liste');
    this.stand.update((n) => n + 1);
    this.suche.set('');
    this.leerHinweis.set(false);
  }
}
