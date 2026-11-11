import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { ladeIch, rufname } from '../data/band-ich';
import { KASTEN_TAGE, alsGeuebtMerken, heuteGeuebt, jeKasten, karten, ladeKastenGeteilt, ladeTagesziel, ladeUeben, nochHeute } from '../data/ueben';
import { ladeFortschritt } from '../data/fortschritt';
import { STATUS, UebeStatus, alleStatus, eigeneStatus, gemeinsamDran, uebeWoche, statusAusKasten, statusInfo, statusLabel, statusMigrieren, statusSetzen, uebeSchnappschuss, uebeWertung } from '../data/uebe-status';
import { ListenQuelle, listenQuellen, listenTreffer } from '../data/listen-quellen';
import { Entry, isPause, loadSetlist } from '../data/setlist-data';
import { LISTEN, songAbgleich } from '../data/playlisten';
import { auffrischenAnmelden } from '../data/neu-zeichnen';
import { datumText } from '../data/datum';
import { erinnerungAktualisieren } from '../data/erinnerung';
import { sitzungLesen, sitzungMerken, sitzungVergessen } from '../data/modus-sitzung';
import { SetlistBuehne } from './setlist-buehne';
import { Verlauf } from '../zurueck';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Backstage → Üben: persönlicher Karteikasten (Logik: data/ueben.ts, Status: data/uebe-status.ts). Oben die fünf Kästen
// (1 Üben, 2–3 Wackelt noch, 4–5 Sitzt), darunter ein Knopf „Übe-Modus“: die Karten in der Notenansicht, oben rechts
// die fünf Übe-Status (uebeWertung) – derselbe Status noch einmal schiebt die Karte einen Kasten weiter („Wackelt
// noch“ 2 → 3, „Sitzt“ 4 → 5, im letzten Kasten des Status bleibt sie), eingenordet nur ausdrücklich; „Üben“ kommt in dieser Runde noch einmal dran. Heute fällige Karten zuerst, das
// Tagesziel ist nur eine Empfehlung.
// Über der Liste eine Suche: einzelne Songs oder ganze Setlists, Sammlungen und Spotify-Listen zum Üben dazunehmen (Songs
// ohne Status kommen auf „Üben“, Kasten 1). Darunter alle Songs im Kasten mit ihrem Status (änderbar).
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
        <p class="lead">{{ name() }}: deine Songs im Karteikasten – je Kasten ein Status, je höher der Kasten, desto seltener ist die Karte dran.</p>
        <!-- Karteikasten mit seinen fünf Kästen; Nicht gelernt und Eingenordet stehen daneben, gehören aber nicht dazu -->
        <div class="kartei-system">
          <div class="aussen nicht" [class.leer]="!nichtGelernt()"><span class="sym" aria-hidden="true">○</span><span class="n">{{ nichtGelernt() }}</span><span class="s">Nicht gelernt</span><small>nicht im Kasten</small></div>
          <div class="kartei">
            <p class="kartei-titel">Karteikasten</p>
            <ol class="kaesten" aria-label="Karteikasten">
              @for (n of kastenZahlen(); track $index; let i = $index) {
                <li [class]="statusAusKasten(i + 1)" [class.leer]="!n"><span class="sym" aria-hidden="true">{{ zeichen(i + 1) }}</span><span class="n">{{ n }}</span><span class="l">Kasten {{ i + 1 }}</span><span class="s">{{ label(i + 1) }}</span><small>{{ i ? 'alle ' + tage[i] + (tage[i] === 1 ? ' Tag' : ' Tage') : 'sofort' }}</small></li>
              }
            </ol>
          </div>
          <div class="aussen eingenordet" [class.leer]="!eingenordet()"><span class="sym" aria-hidden="true">✓✓</span><span class="n">{{ eingenordet() }}</span><span class="s">Eingenordet</span><small>raus aus dem Kasten</small></div>
        </div>
        <ul class="wege" aria-label="Was ein Status-Klick im Übe-Modus bewirkt">
          <li><span class="sym ueben" aria-hidden="true">✎</span><span><b>Üben</b> → Kasten 1, kommt in derselben Runde noch einmal</span></li>
          <li><span class="sym wackelt" aria-hidden="true">↻</span><span><b>Wackelt noch</b> → Kasten 2 · wackelt er schon in 2 → Kasten 3 · in 3 bleibt er in 3</span></li>
          <li><span class="sym sitzt" aria-hidden="true">✓</span><span><b>Sitzt</b> → Kasten 4 · sitzt er schon in 4 → Kasten 5 · in 5 bleibt er in 5</span></li>
          <li><span class="sym eingenordet" aria-hidden="true">✓✓</span><span><b>Eingenordet</b> → raus aus dem Karteikasten – nur mit diesem Klick</span></li>
          <li><span class="sym nicht" aria-hidden="true">○</span><span><b>Nicht gelernt</b> → raus aus dem Karteikasten, ohne Status</span></li>
        </ul>

        @if (ergebnis(); as e) {
          <p class="ergebnis" role="status"><mat-icon>task_alt</mat-icon> Fertig: {{ e }}</p>
        }
        <button type="button" class="primaer gross" (click)="uebeModus(false)"><mat-icon>fit_screen</mat-icon> Übe-Modus</button>
        <p class="tagesziel">Empfehlung: {{ ziel }} Karten am Tag · heute {{ geuebt().length }} geübt{{ dran().length ? ' · ' + dran().length + ' fällig' : '' }}
          <a routerLink="/backstage/einstellungen">ändern</a></p>
        @if (leerHinweis()) { <p class="hinweis" role="status">Noch keine Karten – füge oben Songs oder eine ganze Liste hinzu.</p> }

        <!-- Suche: einzelne Songs oder ganze Setlists, Sammlungen und Spotify-Listen zum Üben dazunehmen -->
        <label class="suche">
          <mat-icon aria-hidden="true">search</mat-icon>
          <input type="search" placeholder="Song, Setlist, Sammlung oder Spotify-Liste zum Üben hinzufügen …" aria-label="Song, Setlist, Sammlung oder Spotify-Liste zum Üben hinzufügen" [value]="suche()" (input)="suche.set($any($event.target).value)" />
        </label>
        @if (listenTreffer().length || treffer().length) {
          <ul class="treffer">
            @for (l of listenTreffer(); track l.id) {
              <li><button type="button" class="liste-treffer" (click)="listeHinzu(l)"><mat-icon aria-hidden="true">{{ l.icon }}</mat-icon><span class="t">{{ l.name }}</span>&ngsp;<span class="a">{{ l.art }} · {{ l.songs.length }} {{ l.songs.length === 1 ? 'Song' : 'Songs' }}</span><mat-icon>playlist_add</mat-icon></button></li>
            }
            @for (t of treffer(); track t.key) {
              <li><button type="button" (click)="hinzu(t.key)"><span class="t">{{ t.title }}</span>&ngsp;<span class="a">{{ t.artist }}{{ t.status !== 'nicht' ? ' · ' + statusLabel(t.status) : '' }}</span><mat-icon>add</mat-icon></button></li>
            }
          </ul>
        }
        @if (meldung(); as m) { <p class="meldung" role="status">{{ m }}</p> }
        <h3>Deine Songs im Karteikasten</h3>
        <ul class="liste">
          @for (k of alle(); track k.key) {
            <li [class.dran]="k.dran">
              <span class="kasten" [attr.aria-label]="'Kasten ' + k.kasten">{{ k.kasten }}</span>
              <!-- Klick auf den Song: Übe-Modus direkt an dieser Stelle -->
              <button type="button" class="song song-start" (click)="uebeModus(false, k.key)" [attr.aria-label]="k.title + ' im Übe-Modus öffnen'" title="Im Übe-Modus ab hier"><span class="t">{{ k.title }}</span>&ngsp;<span class="a">{{ k.artist }}</span>
                <small>{{ k.dran ? 'heute dran' : 'wieder am ' + datum(k.faellig) }}{{ k.auftritt ? ' · im Set am ' + datum(k.auftritt) : '' }}</small></button>
              <select [class]="statusAusKasten(k.kasten)" [attr.aria-label]="'Status von ' + k.title" (change)="setzen(k.key, $any($event.target).value)">
                @for (s of status; track s.id) { <option [value]="s.id" [selected]="s.id === statusAusKasten(k.kasten)">{{ s.label }}</option> }
              </select>
            </li>
          } @empty {
            <li class="leer">Der Karteikasten ist leer. Songs kommen über den Status (Song-Dialog, Probe-Modus, Nachbereitung) oder oben über die Suche dazu.</li>
          }
        </ul>

        <!-- Band-Übe-Board: wer übt wie viel, und woran mehrere gerade gemeinsam arbeiten -->
        <h3>Die Band übt</h3>
        <ul class="board">
          @for (p of bandWoche(); track p.slug) {
            <li [class.ich]="p.slug === ich()">
              <span class="name">{{ p.name }}</span>
              <span class="werte">@if (p.serie > 1) { <span class="serie">🔥 {{ p.serie }} Tage</span> · }{{ p.karten }} {{ p.karten === 1 ? 'Karte' : 'Karten' }} in 7 Tagen@if (p.eingenordet.length) { · ✓✓ {{ p.eingenordet.join(', ') }} }@if (!p.karten && !p.serie && !p.eingenordet.length) { · diese Woche noch nicht geübt }</span>
            </li>
          }
        </ul>
        @if (gemeinsam().length) {
          <p class="board-titel">Gerade gemeinsam dran – zusammen üben lohnt sich:</p>
          <ul class="liste gemeinsam">
            @for (g of gemeinsam(); track g.key) {
              <li>
                <span class="song"><span class="t">{{ g.title }}</span>&ngsp;<span class="a">{{ g.artist }}</span>
                  <small>@for (w of g.wer; track w.slug; let l = $last) { {{ w.name }}: {{ statusLabel(w.status) }}{{ l ? '' : ' · ' }} }</small></span>
                @if (!imKasten(g.key)) { <button type="button" (click)="hinzu(g.key)" [attr.aria-label]="g.title + ' auch üben'"><mat-icon>add</mat-icon> Ich auch</button> }
              </li>
            }
          </ul>
        }
      }
    </section>
    @if (modus(); as m) {
      <!-- Übe-Modus: Notenansicht der Karten, oben rechts „Wackelt noch“ / „Sitzt“ – weiter zur nächsten Karte -->
      <app-setlist-buehne [entries]="m" [start]="modusStart()" [notenAuf]="true" [ueben]="true" (bewertet)="ausModus($event)" (rueckgaengig)="letzteZuruecknehmen()" (closed)="modusZu()" />
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
  /** Songs aus den Spotify-Listen ohne eigenen Status */
  protected readonly nichtGelernt = computed(() => this.songs.filter((s) => (this.eigene().get(s.key) ?? 'nicht') === 'nicht').length);
  protected readonly ziel = ladeTagesziel();
  protected readonly geuebt = signal(heuteGeuebt(this.heute));
  /** heute fällig und noch nicht geübt */
  protected readonly dran = computed(() => this.alle().filter((k) => k.dran && !this.geuebt().includes(k.key)));
  protected readonly kastenZahlen = computed(() => jeKasten(this.alle()));
  protected readonly ergebnis = signal<string | null>(null);
  protected readonly meldung = signal('');
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

  /** Übe-Modus: neuer Status je bewerteter Karte (Anzahl je Status) */
  private zaehler: Partial<Record<UebeStatus, number>> = {};

  // Band-Übe-Board (zieht mit dem Abgleich nach): Übe-Woche je Musiker und Songs, an denen mehrere gerade arbeiten
  protected readonly bandWoche = computed(() => {
    this.stand();
    return this.band.members.map((m) => ({ slug: m.slug, name: rufname(m), ...uebeWoche(ladeFortschritt(m.slug), ladeKastenGeteilt(m.slug), this.heute) }));
  });
  protected readonly gemeinsam = computed(() => (this.stand(), gemeinsamDran(this.band.members, alleStatus(this.band.members)).slice(0, 8)));
  protected imKasten(key: string): boolean {
    return this.alle().some((k) => k.key === key);
  }

  // ganze Listen: Setlists der Auftritte (auf diesem Gerät), Sammlungen, Spotify-Listen
  private readonly listen = computed(() => (this.stand(), listenQuellen(this.band.shows, (x) => this.band.showId(x), this.songs)));
  protected readonly listenTreffer = computed(() => listenTreffer(this.listen(), this.suche()));
  private readonly verlauf = inject(Verlauf);

  constructor() {
    // Zahl fälliger Karten am App-Symbol und für die Übe-Erinnerung (data/erinnerung.ts) nach jeder Änderung
    effect(() => {
      this.alle();
      this.geuebt();
      void erinnerungAktualisieren(this.heute);
    });
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
    // Seite wurde neu geladen, während der Übe-Modus offen war (Handy hat sie im Hintergrund verworfen, Update):
    // wieder öffnen – bei der nächsten fälligen Karte, mit dem bisherigen Ergebnis (data/modus-sitzung.ts)
    const offen = !route.snapshot.queryParamMap.get('modus') && this.ich() ? sitzungLesen('ueben') : null;
    if (offen)
      queueMicrotask(() => {
        this.uebeModus(false);
        if (this.modus()) {
          this.zaehler = { ...(offen.zaehler as Partial<Record<UebeStatus, number>>) };
          sitzungMerken({ art: 'ueben', zaehler: this.zaehler });
        }
      });
    // Seite innerhalb der App verlassen: nichts wieder öffnen
    inject(DestroyRef).onDestroy(() => sitzungVergessen('ueben'));
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
  protected zeichen(kasten: number): string {
    return statusInfo(statusAusKasten(kasten)).zeichen;
  }

  // Übe-Modus: die Karten in der Notenansicht (Bühnen-Modus mit Noten), bewertet oben rechts. Immer möglich:
  // heute fällige zuerst, danach alle übrigen – das Tagesziel hält niemanden vom Üben ab.
  protected readonly modus = signal<Entry[] | null>(null);
  private modusVonLink = false;
  /** Übe-Modus ab dieser Karte (Klick auf einen Song in der Liste) */
  protected readonly modusStart = signal(0);
  protected uebeModus(vonLink: boolean, abKey?: string): void {
    const dran = this.dran();
    const alle = [...dran, ...this.alle().filter((x) => !dran.includes(x))];
    // ab einem bestimmten Song: er kommt zuerst, die Karten davor hängen hinten an – so endet der Modus nicht vorzeitig,
    // nur weil man weiter hinten eingestiegen ist
    const ab = Math.max(0, abKey ? alle.findIndex((x) => x.key === abKey) : 0);
    const k = [...alle.slice(ab), ...alle.slice(0, ab)];
    this.modusStart.set(0);
    if (!k.length) {
      this.leerHinweis.set(true);
      if (vonLink) this.verlauf.zurueck();
      return;
    }
    this.leerHinweis.set(false);
    this.zaehler = {};
    this.ergebnis.set(null);
    this.modusVonLink = vonLink;
    this.modus.set(k.map((x) => ({ title: x.title, artist: x.artist })));
    sitzungMerken({ art: 'ueben', zaehler: {} });
  }
  /** letzte Wertung im Übe-Modus: Stand davor und gezählter Status – für „Rückgängig“ */
  private letzte: { zurueck: () => void; neu: UebeStatus } | null = null;
  protected letzteZuruecknehmen(): void {
    const l = this.letzte;
    if (!l) return;
    this.letzte = null;
    l.zurueck();
    this.zaehler[l.neu] = Math.max(0, (this.zaehler[l.neu] ?? 1) - 1);
    sitzungMerken({ art: 'ueben', zaehler: this.zaehler });
    this.geuebt.set(heuteGeuebt(this.heute));
    this.stand.update((n) => n + 1);
  }
  protected ausModus(e: { title: string; artist: string; status: UebeStatus }): void {
    const key = `${e.title}|${e.artist}`;
    const zurueck = uebeSchnappschuss();
    const neu = uebeWertung(key, e.status, this.heute);
    this.letzte = { zurueck, neu };
    this.geuebt.set(alsGeuebtMerken(key, this.heute));
    this.zaehler[neu] = (this.zaehler[neu] ?? 0) + 1;
    sitzungMerken({ art: 'ueben', zaehler: this.zaehler });
    this.stand.update((n) => n + 1);
  }
  protected modusZu(): void {
    this.modus.set(null);
    sitzungVergessen('ueben');
    const z = this.zaehler;
    const teile = STATUS.filter((st) => z[st.id]).map((st) => `${z[st.id]}× ${st.label}${st.id === 'eingenordet' ? ' 🎉' : ''}`);
    this.ergebnis.set(teile.length ? teile.join(', ') + '.' : null);
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
    this.meldung.set('');
  }
  /** ganze Liste zum Üben: Songs ohne Status kommen auf „Üben“ (Kasten 1), die übrigen behalten ihren Status */
  protected listeHinzu(l: ListenQuelle): void {
    const eigene = this.eigene();
    const keys = [...new Set(l.songs.map((x) => `${x.title}|${x.artist}`))];
    const neu = keys.filter((k) => (eigene.get(k) ?? 'nicht') === 'nicht');
    for (const k of neu) statusSetzen(k, 'ueben', 'liste');
    const eingenordet = keys.filter((k) => eigene.get(k) === 'eingenordet').length;
    const schon = keys.length - neu.length - eingenordet;
    this.stand.update((n) => n + 1);
    this.suche.set('');
    this.leerHinweis.set(false);
    this.meldung.set(
      `${l.art} „${l.name}“: ${neu.length} ${neu.length === 1 ? 'Song' : 'Songs'} zum Üben dazu` +
        (schon ? `, ${schon} schon im Karteikasten` : '') +
        (eingenordet ? `, ${eingenordet} eingenordet` : '') +
        '.',
    );
  }
}
