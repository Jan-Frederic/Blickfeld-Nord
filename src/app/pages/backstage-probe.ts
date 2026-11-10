import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { auffrischenAnmelden } from '../data/neu-zeichnen';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Verlauf, Zurueck } from '../zurueck';
import { BandService } from '../data/band.service';
import { songInfoText } from '../data/songinfo';
import { LISTEN, listeInReihenfolge, songAbgleich } from '../data/playlisten';
import { ListenQuelle, listenQuellen, listenTreffer } from '../data/listen-quellen';
import { BackstageSync } from './backstage-sync';
import { SongMitschnitte } from './song-mitschnitte';
import { Stimmgeraet } from './stimmgeraet';
import { ProbeVorschlag } from './probe-vorschlag';
import { SetlistBuehne } from './setlist-buehne';
import { ProbePlan, generalprobe, generalprobeAblauf, loadProbe, minutenText, probeNachricht, probenDauer, speichereProbe } from '../data/probe-modus';
import { Kandidat, probeFuellen, probeZeiten } from '../data/probe-fuellen';
import { alleStatus, buehnenreife } from '../data/uebe-status';
import { kastenEinsBei, ladeKastenGeteilt } from '../data/ueben';
import { ProbeZusagen } from './probe-zusagen';
import { rufname, unsicherJeSong } from '../data/band-ich';
import { alleFortschritte, bandStand, probeStaende } from '../data/fortschritt';
import { notizenDerProbe } from '../data/probe-notiz';
import { spotifyLinks } from '../data/playlisten';
import { spotifyUrl } from '../data/song-steckbrief';
import { nachrichtSenden } from '../data/kontakte';
import { Entry, isPause, loadSetlist } from '../data/setlist-data';

// Backstage → Probe planen (/backstage/probe/<datum>): welche Songs geübt werden, Notizen und offene Punkte.
// Gespeichert im Browser (bn-probe-<datum>) und wie Setlists über „An die Band schicken“ teilbar.

const leer = (): ProbePlan => ({ songs: [], notizen: '', punkte: [] });

const norm = (s: string) => s.toLocaleLowerCase('de').normalize('NFD').replace(/\p{Diacritic}/gu, '');

@Component({
  selector: 'app-backstage-probe',
  imports: [Zurueck, DatePipe, RouterLink, MatIconModule, BackstageSync, ProbeVorschlag, SongMitschnitte, Stimmgeraet, SetlistBuehne, ProbeZusagen],
  template: `
    <section class="section">
      <app-zurueck ziel="/backstage/termine" text="Alle Termine" />
      @if (probe(); as p) {
        <p class="kicker">Probe</p>
        <h2>{{ p.date | date: 'EEEE, d. MMMM yyyy' : '' : 'de' }}</h2>
        <p class="lead">
          {{ p.time ? p.time + (p.endTime ? '–' + p.endTime : '') + ' Uhr' : 'Uhrzeit offen' }}@if (p.place) { · {{ p.place }}}
          @if (p.note) { <br />{{ p.note }} }
        </p>

        <!-- das Wichtigste zuerst: Probe-Modus starten (sobald Songs geplant sind) -->
        @if (plan().songs.length) {
          <div class="probe-start oben">
            <button type="button" class="primaer" (click)="modus.set(true)"><mat-icon>fit_screen</mat-icon> Probe-Modus starten</button>
            <span>{{ plan().songs.length }} {{ plan().songs.length === 1 ? 'Song' : 'Songs' }} · {{ stand() }}</span>
          </div>
        }

        <h3><mat-icon>groups</mat-icon> Wer kommt?</h3>
        <app-probe-zusagen [datum]="datum()" />

        <h3><mat-icon>queue_music</mat-icon> Songs zum Üben</h3>
        <!-- Hinzufügen zuerst: Suche (Songs, Setlists, Sammlungen, Spotify-Listen), Generalprobe, Vorschlag -->
        <label class="search">
          <mat-icon>search</mat-icon>
          <input type="search" placeholder="Song, Setlist, Sammlung oder Spotify-Liste hinzufügen …" [value]="query()" (input)="query.set($any($event.target).value)" aria-label="Song, Setlist, Sammlung oder Spotify-Liste hinzufügen" />
        </label>
        @if (query().trim()) {
          <ul class="hits">
            @for (l of listenHits(); track l.id) {
              <li><button type="button" class="liste-hit" (click)="listeHinzu(l)"><mat-icon>{{ l.icon }}</mat-icon> {{ l.name }} <span class="a">{{ l.art }} · {{ fehlendAus(l).length ? fehlendAus(l).length + ' von ' + l.songs.length + ' dazu' : 'alle schon drin' }}</span></button></li>
            }
            @for (t of treffer(); track t.title + t.artist) {
              <li><button type="button" (click)="addSong(t)"><mat-icon>add</mat-icon> {{ t.title }} <span class="a">{{ t.artist }}</span></button></li>
            } @empty {
              @if (!listenHits().length) { <li class="empty">Nichts gefunden.</li> }
            }
          </ul>
        }
        <!-- Probe füllen: nach der Probendauer mit den wichtigsten Songs (Baustellen der Setlist, Kasten 1, Wackelt noch) -->
        <button type="button" class="fuellen" (click)="fuellen()" [title]="'Füllt die Probe (' + minutenText(budget()) + ') mit Baustellen der nächsten Setlist, Songs aus Kasten 1 und was bei jemandem noch wackelt'"><mat-icon>auto_awesome</mat-icon> Probe füllen ({{ minutenText(budget()) }})</button>
        @if (hinzuMeldung(); as m) { <p class="teilen-meldung" role="status">{{ m }}</p> }
        <!-- Vorschläge und Generalprobe eingeklappt – die Liste bleibt im Blick -->
        <details class="vorschlaege">
          <summary><mat-icon>lightbulb</mat-icon> Vorschläge{{ naechsterAuftritt() ? ' und Generalprobe' : '' }}</summary>
          @if (naechsterAuftritt(); as a) {
            <button type="button" class="general" (click)="generalprobeUebernehmen()" [disabled]="!a.songs"><mat-icon>theater_comedy</mat-icon>
              {{ plan().generalprobe === a.id ? 'Generalprobe ' + a.name + ' – Setlist neu übernehmen' : 'Generalprobe: Setlist ' + a.name + ' übernehmen' }}{{ a.songs ? ' (' + a.songs + ' Songs)' : ' (noch keine Setlist auf diesem Gerät)' }}</button>
            @if (generalprobeVorab().length) {
              <p class="general-vorab">Vor dem Durchlauf einzeln, weil es noch wackelt:
                @for (v of generalprobeVorab(); track v.song.title + v.song.artist; let l = $last) { <b>{{ v.song.title }}</b>@if (v.wer.length) { ({{ v.wer.join(', ') }}) }{{ l ? '' : ', ' }} }</p>
            }
          }
          <app-probe-vorschlag [drin]="plan().songs" [datum]="datum()" (add)="addSong($event)" />
        </details>

        <!-- Abgleich mit der Spotify-Liste „Probe“: nur als Hinweis (übernehmen geht über die Suche: „Probe“) -->
        @if (spotifyDiff(); as d) {
          <p class="spotify-diff" [title]="d.titel">{{ d.text }}</p>
        }
        @if (plan().songs.length) {
          <div class="probe-teilen">
            <button type="button" (click)="planSchicken()"><mat-icon>{{ geschickt() ? 'check' : 'send' }}</mat-icon> Plan an die Band</button>
            <button type="button" (click)="fuerSpotify()" title="Track-Links kopieren – in Spotify am Computer in eine Playlist einfügen (Strg/Cmd+V)"><mat-icon>queue_music</mat-icon> Für Spotify kopieren</button>
            <button type="button" class="leeren" (click)="listeLeeren()"><mat-icon>delete_sweep</mat-icon> Liste leeren</button>
            @if (plan().geschickt) { <small>zuletzt geschickt am {{ plan().geschickt | date: 'd.M.' }}</small> }
          </div>
          @if (teilenMeldung(); as m) { <p class="teilen-meldung" role="status">{{ m }}</p> }
          <ul class="list">
            @for (s of plan().songs; track s.title + s.artist; let i = $index) {
              <li [class.done]="s.done">
                <label><input type="checkbox" [checked]="s.done" (change)="toggleSong(i)" /> <span class="t">{{ s.title }}</span> <span class="a">{{ s.artist }}</span></label>
                @if (info(s); as inf) { <span class="info">{{ inf }}</span> }
                @if (unsicher().get(s.title + '|' + s.artist); as wer) { <span class="info unsicher" title="Übe-Status Üben oder Wackelt noch">unsicher: {{ wer.join(', ') }}</span> }
                @if (bandStaende().get(s.title + '|' + s.artist) ?? s.stand; as st) { @if (st === 'nochmal') { <span class="info nochmal">↻ nochmal</span> } }
                @if (s.durchlaeufe || s.zeit) { <span class="info">{{ s.durchlaeufe ? s.durchlaeufe + '×' : '' }}{{ s.durchlaeufe && s.zeit ? ' · ' : '' }}{{ s.zeit ? minutenText(s.zeit) : '' }}</span> }
                @if (personNotizen().get(s.title + '|' + s.artist); as pn) { <span class="info">{{ pn.join(' · ') }}</span> }
                <input class="protokoll" maxlength="80" [value]="s.notiz ?? ''" placeholder="Notiz: z. B. Bridge sitzt" [attr.aria-label]="'Notiz zu ' + s.title" (change)="notizSetzen(i, $any($event.target).value)" />
                <button type="button" class="icon" [class.an]="aufnahme() === s.title + '|' + s.artist" (click)="aufnahme.set(aufnahme() === s.title + '|' + s.artist ? '' : s.title + '|' + s.artist)" [attr.aria-label]="'Mitschnitte von ' + s.title" title="Aufnehmen und nachhören"><mat-icon>mic</mat-icon></button>
                <button type="button" class="icon" (click)="removeSong(i)" [attr.aria-label]="s.title + ' entfernen'"><mat-icon>close</mat-icon></button>
                @if (aufnahme() === s.title + '|' + s.artist) { <app-song-mitschnitte class="voll" [songKey]="s.title + '|' + s.artist" [titel]="s.title" /> }
              </li>
            }
          </ul>
        } @else {
          <p class="empty">Noch keine Songs ausgewählt – oben suchen oder einen Vorschlag übernehmen.</p>
        }

        <h3><mat-icon>tune</mat-icon> Stimmen</h3>
        @if (stimmen()) { <app-stimmgeraet (schliessen)="stimmen.set(false)" /> } @else {
          <button type="button" class="knopf" (click)="stimmen.set(true)"><mat-icon>tune</mat-icon> Stimmgerät starten</button>
        }

        <h3><mat-icon>graphic_eq</mat-icon> Ganze Probe aufnehmen</h3>
        <app-song-mitschnitte [songKey]="'Probe|' + p.date" [titel]="'Probe ' + (p.date | date: 'dd.MM.yyyy')" />

        <h3><mat-icon>notes</mat-icon> Notizen</h3>
        <textarea rows="4" [value]="plan().notizen" (input)="setNotizen($any($event.target).value)" placeholder="z. B. Übergänge im zweiten Set, neue Ansagen …" aria-label="Notizen zur Probe"></textarea>

        <h3><mat-icon>checklist</mat-icon> Offene Punkte</h3>
        <ul class="list">
          @for (pk of plan().punkte; track $index; let i = $index) {
            <li [class.done]="pk.done">
              <label><input type="checkbox" [checked]="pk.done" (change)="togglePunkt(i)" /> {{ pk.text }}</label>
              <button type="button" class="icon" (click)="removePunkt(i)" [attr.aria-label]="pk.text + ' entfernen'"><mat-icon>close</mat-icon></button>
            </li>
          }
        </ul>
        <form class="add" (submit)="addPunkt($event, punkt)">
          <input #punkt placeholder="Neuer Punkt, z. B. Kabel für Monitor 3 besorgen" aria-label="Neuer Punkt" maxlength="120" />
          <button type="submit"><mat-icon>add</mat-icon> Hinzufügen</button>
        </form>

        @defer (when modus(); prefetch on idle) {
          @if (modus()) { <app-setlist-buehne [entries]="modusSongs()" [start]="ersterOffener()" [probe]="datum()" [generalprobe]="!!plan().generalprobe" [vorab]="vorabZahl()" (closed)="modusZu()" /> }
        }
        <p class="hint">Gespeichert auf diesem Gerät. Mit der Band teilen:</p>
        <app-backstage-sync [show]="datum()" />
      } @else {
        <h2>Probe nicht gefunden</h2>
        <p>Für diesen Tag ist keine Probe eingetragen. <a routerLink="/backstage/termine">Zu den Terminen</a></p>
      }
    </section>
  `,
  styles: `
    .back { display: inline-flex; align-items: center; gap: 6px; color: var(--bn-fog); text-decoration: none; font-size: .9rem; margin-bottom: 16px; }
    .back:hover { color: var(--bn-sunset); }
    h3 { display: flex; align-items: center; gap: 8px; margin: 32px 0 12px; font-family: var(--bn-wide); font-weight: 400; text-transform: uppercase; letter-spacing: .14em; font-size: .85rem; }
    h3 mat-icon { color: var(--bn-sunset); font-size: 20px; width: 20px; height: 20px; }
    .list { list-style: none; margin: 0 0 12px; padding: 0; display: grid; gap: 6px; }
    .list li { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 8px 12px; border: 1px solid var(--bn-line); border-radius: 10px; }
    .list label { display: flex; align-items: center; gap: 10px; flex: 1; cursor: pointer; }
    .list input { width: 18px; height: 18px; accent-color: var(--bn-sunset); }
    .done label { text-decoration: line-through; color: var(--bn-fog); }
    .a, .info { color: var(--bn-fog); font-size: .85rem; }
    .info { padding: 2px 8px; border-radius: 999px; border: 1px solid var(--bn-line); }
    .icon { display: grid; place-items: center; width: 32px; height: 32px; border: 0; border-radius: 50%; background: none; color: var(--bn-fog); cursor: pointer; }
    .icon:hover, .icon.an { color: var(--bn-sunset); }
    .voll { flex-basis: 100%; }
    .search, .add { display: flex; gap: 8px; align-items: center; }
    .add { flex-wrap: wrap; }
    .add input { min-width: min(100%, 220px); }
    .search { padding: 0 12px; border: 1px solid var(--bn-line); border-radius: 10px; }
    .search mat-icon { color: var(--bn-fog); }
    input:not([type=checkbox]), textarea {
      flex: 1; padding: 10px 12px; border: 1px solid var(--bn-line); border-radius: 10px; background: transparent; color: var(--bn-ink); font: inherit;
    }
    .search input { border: 0; padding-left: 0; }
    textarea { width: 100%; box-sizing: border-box; resize: vertical; }
    .hits { list-style: none; margin: 6px 0 0; padding: 0; max-height: 260px; overflow-y: auto; border: 1px solid var(--bn-line); border-radius: 10px; }
    .hits button { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; border: 0; background: none; color: var(--bn-ink); font: inherit; text-align: left; cursor: pointer; }
    .hits button:hover { background: rgba(236, 233, 228, .06); color: var(--bn-sunset); }
    .add button, .knopf { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; cursor: pointer; }
    .add button:hover, .knopf:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .empty { color: var(--bn-fog); font-size: .9rem; padding: 8px 12px; }
    .hint { margin: 32px 0 8px; font-size: .85rem; color: var(--bn-fog); }
    .probe-start { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin: 0 0 12px; color: var(--bn-fog); font-size: .85rem; }
    .primaer { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 999px; border: 1px solid var(--bn-sunset); background: var(--bn-sunset); color: #2a1708; font: inherit; cursor: pointer; }
    .info.nochmal, .info.unsicher { border-color: #e0b25a; color: #e0b25a; }
    .probe-teilen { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0 0 12px; }
    .probe-teilen button, .general { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; font-size: .85rem; cursor: pointer; }
    .general { margin: 4px 8px 12px 0; }
    .vorschlaege { margin: 12px 0; border: 1px solid var(--bn-line); border-radius: 10px; padding: 0 12px; }
    .vorschlaege[open] { padding-bottom: 4px; }
    .vorschlaege summary { display: flex; align-items: center; gap: 8px; padding: 10px 0; cursor: pointer; color: var(--bn-fog); font-size: .9rem; }
    .vorschlaege summary mat-icon { color: var(--bn-sunset); font-size: 18px; width: 18px; height: 18px; }
    .probe-start.oben { margin: 4px 0 8px; }
    .general:disabled { opacity: .5; cursor: default; }
    .probe-teilen small { color: var(--bn-fog); }
    .teilen-meldung { margin: 8px 0 12px; color: #5fb88a; font-size: .85rem; }
    .spotify-diff { margin: 4px 0 12px; color: #1db954; font-size: .85rem; }
    .probe-teilen .leeren:hover { border-color: #ff8a65; color: #ff8a65; }
    @media (max-width: 600px) { .list .protokoll { order: 5; flex-basis: 100%; } }
  `,
})
export class BackstageProbe {
  /** Datum der Probe aus der URL (/backstage/probe/:datum) */
  readonly datum = input.required<string>();
  private readonly band = inject(BandService);
  protected readonly probe = computed(() => this.band.rehearsals.find((r) => r.date === this.datum()));
  protected readonly plan = signal<ProbePlan>(leer());
  /** Song, dessen Mitschnitte gerade aufgeklappt sind (Titel|Interpret) */
  protected readonly aufnahme = signal('');
  protected readonly stimmen = signal(false);
  protected readonly query = signal('');
  protected readonly minutenText = minutenText;
  // Probe-Modus: die geplanten Songs im Vollbild (Bühnen-Modus mit Probe-Leiste), ab dem ersten noch nicht geprobten
  protected readonly modus = signal(false);
  // Generalprobe: die Setlist mit Pausen (Uhr je Set wie im Bühnen-Modus); sonst die geplanten Songs
  protected readonly modusSongs = computed<Entry[]>(() => {
    const g = this.plan().generalprobe;
    const setlist = g ? loadSetlist(g) : [];
    return setlist.length ? (generalprobeAblauf(setlist, this.plan().vorab) as Entry[]) : this.plan().songs.map((s) => ({ title: s.title, artist: s.artist }));
  });
  /** Generalprobe: Zahl der Songs vor dem Durchlauf (stehen vor der ersten Pause in modusSongs) */
  protected readonly vorabZahl = computed(() => {
    const m = this.modusSongs();
    const n = this.plan().generalprobe && this.plan().vorab?.length ? m.findIndex((e) => isPause(e)) : 0;
    return n > 0 && n === this.plan().vorab!.filter((k) => m.some((e) => !isPause(e) && e.title + '|' + e.artist === k)).length ? n : 0;
  });
  protected readonly ersterOffener = computed(() => {
    const offen = new Set(this.plan().songs.filter((s) => !s.done).map((s) => s.title + '|' + s.artist));
    return Math.max(0, this.modusSongs().findIndex((e) => !isPause(e) && offen.has(e.title + '|' + e.artist)));
  });
  /** Stand der Band je Song in dieser Probe (Sitzt/Nochmal der Personen im Probe-Modus) */
  protected readonly bandStaende = computed(() => {
    this.plan();
    const staende = probeStaende(this.datum(), this.band.members, alleFortschritte(this.band.members));
    return new Map([...staende].map(([k, v]) => [k, bandStand(v)]));
  });
  /** wer bei welchem Song noch unsicher ist (Übe-Status „Üben“ / „Wackelt noch“, je Person geteilt) */
  protected readonly unsicher = computed(() => (this.plan(), unsicherJeSong(this.band.members)));
  /** Notizen der Musiker aus dem Probe-Modus (je Person, data/probe-notiz.ts) */
  protected readonly personNotizen = computed(() => (this.plan(), notizenDerProbe(this.datum(), this.band.members)));
  // nächster Auftritt nach der Probe – für die Generalprobe
  protected readonly naechsterAuftritt = computed(() => {
    this.plan(); // nach neuen Daten (Abgleich) auch die Setlist neu zählen
    const s = this.band.shows.filter((x) => x.date >= this.datum()).sort((a, b) => a.date.localeCompare(b.date))[0];
    if (!s) return null;
    const id = this.band.showId(s);
    return { id, name: `${s.private ? (s.publicName ?? 'Private Feier') : s.venue} (${s.date.slice(8, 10)}.${s.date.slice(5, 7)}.)`, songs: loadSetlist(id).filter((e) => !isPause(e)).length };
  });
  /** Probendauer in Sekunden (ohne Uhrzeit: 2 Stunden) */
  protected readonly budget = computed(() => probenDauer(this.probe()) || 2 * 3600);
  /** Probe mit den wichtigsten Songs füllen, bis die Probendauer erreicht ist (data/probe-fuellen.ts) */
  protected fuellen(): void {
    const m = this.band.members;
    const status = alleStatus(m);
    const namen = new Map(m.map((x) => [x.slug, rufname(x)]));
    const kandidaten: Kandidat[] = [];
    const show = this.band.shows.filter((x) => x.date >= this.datum()).sort((a, b) => a.date.localeCompare(b.date))[0];
    const setlist = show ? (loadSetlist(this.band.showId(show)).filter((e) => !isPause(e)) as { title: string; artist: string }[]) : [];
    const name = show ? (show.private ? (show.publicName ?? 'Private Feier') : show.venue) : '';
    for (const s of setlist) {
      const r = buehnenreife(s.title + '|' + s.artist, m, status);
      if (r.ampel === 'baustelle' || r.ampel === 'offen') kandidaten.push({ ...s, grund: `Baustelle für ${name}`, prio: 0 });
    }
    const kaesten = new Map(m.map((x) => [x.slug, ladeKastenGeteilt(x.slug)]));
    for (const [k, wer] of kastenEinsBei(kaesten, namen)) kandidaten.push({ title: k.slice(0, k.lastIndexOf('|')), artist: k.slice(k.lastIndexOf('|') + 1), grund: `Kasten 1 bei ${wer.join(', ')}`, prio: 1 });
    for (const [k, wer] of unsicherJeSong(m)) kandidaten.push({ title: k.slice(0, k.lastIndexOf('|')), artist: k.slice(k.lastIndexOf('|') + 1), grund: `wackelt bei ${wer.join(', ')}`, prio: 2 });
    for (const s of setlist) if (buehnenreife(s.title + '|' + s.artist, m, status).ampel === 'fast') kandidaten.push({ ...s, grund: `festigen für ${name}`, prio: 3 });
    const r = probeFuellen(kandidaten, this.plan().songs, probeZeiten(), this.budget());
    this.save((p) => ({ ...p, songs: [...p.songs, ...r.songs.map((t) => ({ title: t.title, artist: t.artist, done: false }))] }));
    this.hinzuMeldung.set(
      r.songs.length
        ? `Probe gefüllt: ${r.songs.length} ${r.songs.length === 1 ? 'Song' : 'Songs'} dazu (${r.songs.map((x) => x.title).join(', ')}) – geplant ~${minutenText(r.gesamt)} von ${minutenText(this.budget())}.`
        : this.plan().songs.length ? `Nichts dazu – die Probe ist mit ~${minutenText(r.gesamt)} schon voll oder es gibt keine Baustellen.` : 'Nichts gefunden – keine Baustellen, Kasten-1-Songs oder wackelnden Songs.',
    );
  }
  protected generalprobeUebernehmen(): void {
    const a = this.naechsterAuftritt();
    if (!a) return;
    const setlist = loadSetlist(a.id).filter((e) => !isPause(e)) as { title: string; artist: string }[];
    this.save((p) => generalprobe(p, setlist, a.id, this.generalprobeVorab().map((v) => v.song)));
  }
  /** Generalprobe: Songs der Setlist, die noch nicht bühnenreif sind – schwächste zuerst, mit wem es noch wackelt */
  protected readonly generalprobeVorab = computed(() => {
    const a = this.naechsterAuftritt();
    if (!a) return [];
    const m = this.band.members;
    const status = alleStatus(m);
    return (loadSetlist(a.id).filter((e) => !isPause(e)) as { title: string; artist: string }[])
      .map((s) => ({ song: s, r: buehnenreife(s.title + '|' + s.artist, m, status) }))
      .filter((x) => x.r.ampel === 'baustelle')
      .sort((x, y) => x.r.wert - y.r.wert)
      .map((x) => ({ song: x.song, wer: x.r.wackeltBei }));
  });
  // Plan an die Band: Songs mit Tonart/Tempo und Spotify-Link (WhatsApp über das Teilen-Menü)
  protected readonly teilenMeldung = signal('');
  protected readonly geschickt = signal(false);
  protected async planSchicken(): Promise<void> {
    const p = this.probe();
    if (!p) return;
    const text = probeNachricht(p, this.plan(), (s) => this.info(s), (s) => spotifyUrl(s.title, s.artist));
    const r = await nachrichtSenden(undefined, 'Probe', text);
    if (r === 'abgebrochen') return;
    this.save((x) => ({ ...x, geschickt: new Date().toISOString().slice(0, 10) }));
    this.geschickt.set(true);
    this.teilenMeldung.set(r === 'kopiert' ? 'Plan kopiert – in die Band-Gruppe einfügen.' : 'Plan geteilt ✓');
  }
  protected async fuerSpotify(): Promise<void> {
    const { links, ohne } = spotifyLinks(this.plan().songs);
    this.teilenMeldung.set(
      (links.length ? `${links.length} Track-Links kopiert – in Spotify am Computer eine Playlist (z. B. „Probe ${this.datum().slice(8, 10)}.${this.datum().slice(5, 7)}.“) öffnen und mit Strg/Cmd+V einfügen.` : 'Für keinen Song ist ein Spotify-Link bekannt.') +
        (ohne.length ? ` Ohne Link: ${ohne.join(', ')}.` : ''),
    );
    if (!links.length) return;
    try {
      await navigator.clipboard.writeText(links.join('\n'));
    } catch {
      window.prompt('Links kopieren:', links.join('\n'));
    }
  }
  protected readonly stand = computed(() => {
    const songs = this.plan().songs;
    const geprobt = songs.filter((s) => s.done).length;
    return geprobt ? `${geprobt} von ${songs.length} geprobt` : `${songs.length} ${songs.length === 1 ? 'Song' : 'Songs'} – Sitzt/Nochmal, Durchläufe, Notizen und Zeit je Song`;
  });
  /** Probe-Modus kam über einen Link (Übersicht → Als Nächstes): Schließen führt dorthin zurück */
  private ausLink = false;
  private readonly verlauf = inject(Verlauf);
  protected modusZu(): void {
    this.modus.set(false);
    if (this.ausLink) {
      this.ausLink = false;
      if (this.verlauf.zurueck()) return;
    }
    this.plan.set(loadProbe(this.datum()));
  }

  protected readonly treffer = computed(() => {
    const q = norm(this.query().trim());
    const drin = new Set(this.plan().songs.map((s) => s.title + s.artist));
    return this.alle.filter((t) => !drin.has(t.title + t.artist) && norm(`${t.title} ${t.artist}`).includes(q)).slice(0, 20);
  });
  // Songs aller Spotify-Listen; ganze Listen (Setlists, Sammlungen, Spotify-Listen) über dieselbe Suche
  private readonly alle = songAbgleich(LISTEN);
  private readonly listen = computed(() => (this.plan(), listenQuellen(this.band.shows, (x) => this.band.showId(x), this.alle)));
  protected readonly listenHits = computed(() => listenTreffer(this.listen(), this.query()));
  private readonly drinKeys = computed(() => new Set(this.plan().songs.map((s) => s.title + '|' + s.artist)));
  protected fehlendAus(l: ListenQuelle): { title: string; artist: string }[] {
    const drin = this.drinKeys();
    return l.songs.filter((x, i, a) => !drin.has(x.title + '|' + x.artist) && a.findIndex((y) => y.title === x.title && y.artist === x.artist) === i);
  }
  protected readonly hinzuMeldung = signal('');
  /** ganze Liste anhängen (nur, was noch fehlt, in ihrer Reihenfolge) */
  protected listeHinzu(l: ListenQuelle): void {
    const neu = this.fehlendAus(l);
    this.save((p) => ({ ...p, songs: [...p.songs, ...neu.map((t) => ({ title: t.title, artist: t.artist, done: false }))] }));
    this.query.set('');
    this.hinzuMeldung.set(`${l.art} „${l.name}“: ${neu.length} ${neu.length === 1 ? 'Song' : 'Songs'} dazu${l.songs.length > neu.length ? `, ${l.songs.length - neu.length} schon drin` : ''}.`);
  }
  /** Probe-Liste komplett leeren (Songs und Generalprobe; Notizen und offene Punkte bleiben) */
  protected listeLeeren(): void {
    if (!confirm(`Alle ${this.plan().songs.length} Songs aus dieser Probe entfernen?`)) return;
    this.save((p) => ({ ...p, songs: [], generalprobe: undefined }));
    this.hinzuMeldung.set('');
  }
  /** Unterschied zur Spotify-Liste „Probe“ – kurze Info in Spotify-Grün */
  protected readonly spotifyDiff = computed(() => {
    const spotify = listeInReihenfolge('probe', this.alle);
    if (!spotify.length) return null;
    const hier = this.drinKeys();
    const dort = new Set(spotify.map((s) => s.title + '|' + s.artist));
    const fehlen = spotify.filter((s) => !hier.has(s.title + '|' + s.artist)).map((s) => s.title);
    const nurHier = this.plan().songs.filter((s) => !dort.has(s.title + '|' + s.artist)).map((s) => s.title);
    const text = !fehlen.length && !nurHier.length
      ? 'Spotify-Liste „Probe“: identisch ✓'
      : `Spotify-Liste „Probe“: ${[fehlen.length ? `${fehlen.length} ${fehlen.length === 1 ? 'Song fehlt' : 'Songs fehlen'} hier` : '', nurHier.length ? `${nurHier.length} nur hier` : ''].filter(Boolean).join(', ')}`;
    const titel = [fehlen.length ? 'Fehlen hier: ' + fehlen.join(', ') : '', nurHier.length ? 'Nur hier: ' + nurHier.join(', ') : ''].filter(Boolean).join(' · ');
    return { text, titel };
  });

  constructor() {
    // beim Öffnen (und beim Wechsel zu einer anderen Probe) den gespeicherten Stand laden
    effect(() => this.plan.set(loadProbe(this.datum())));
    // neue Daten der Band (Abgleich): Plan neu lesen, ohne die Seite neu aufzubauen (Suche und Scrollstand bleiben)
    inject(DestroyRef).onDestroy(auffrischenAnmelden(() => this.plan.set(loadProbe(this.datum()))));
    // aus der Backstage-Übersicht („Als Nächstes“ → Probe-Modus): ?modus=1 startet gleich den Probe-Modus
    const route = inject(ActivatedRoute);
    if (route.snapshot.queryParamMap.get('modus')) {
      const router = inject(Router);
      queueMicrotask(() => {
        this.plan.set(loadProbe(this.datum()));
        if (this.modusSongs().length) {
          this.modus.set(true);
          this.ausLink = true;
        }
        void router.navigate([], { relativeTo: route, queryParams: { modus: null }, queryParamsHandling: 'merge', replaceUrl: true });
      });
    }
  }

  protected info(s: { title: string; artist: string }): string {
    return songInfoText(s.title, s.artist);
  }

  private save(change: (p: ProbePlan) => ProbePlan): void {
    const next = change(this.plan());
    this.plan.set(next);
    speichereProbe(this.datum(), next);
  }

  /** Probenprotokoll je Song – erscheint im Song-Dialog unter „Zuletzt geprobt“ */
  protected notizSetzen(i: number, notiz: string): void {
    this.save((p) => ({ ...p, songs: p.songs.map((s, j) => (j === i ? { ...s, notiz: notiz.trim() || undefined } : s)) }));
  }

  protected addSong(t: { title: string; artist: string }): void {
    this.save((p) => ({ ...p, songs: [...p.songs, { title: t.title, artist: t.artist, done: false }] }));
    this.query.set('');
  }
  protected toggleSong(i: number): void {
    this.save((p) => ({ ...p, songs: p.songs.map((s, j) => (j === i ? { ...s, done: !s.done } : s)) }));
  }
  protected removeSong(i: number): void {
    this.save((p) => ({ ...p, songs: p.songs.filter((_, j) => j !== i) }));
  }
  protected setNotizen(text: string): void {
    this.save((p) => ({ ...p, notizen: text }));
  }
  protected addPunkt(e: Event, field: HTMLInputElement): void {
    e.preventDefault();
    const text = field.value.trim();
    if (!text) return;
    this.save((p) => ({ ...p, punkte: [...p.punkte, { text, done: false }] }));
    field.value = '';
  }
  protected togglePunkt(i: number): void {
    this.save((p) => ({ ...p, punkte: p.punkte.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) }));
  }
  protected removePunkt(i: number): void {
    this.save((p) => ({ ...p, punkte: p.punkte.filter((_, j) => j !== i) }));
  }
}
