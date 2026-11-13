import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { ichSetzen, ladeIch, rufname } from '../data/band-ich';
import { geraetName, geraetNameSetzen, standardName } from '../data/geraete';
import { einrichtungMerken, geraetVorschlag } from '../data/einrichtung';
import { zugangZiel } from '../data/zugang';
import { CloudEintrag, cloudUnterordner, oneDriveAnmelden, oneDriveEingerichtet, oneDriveKonto, oneDriveVorbereiten, type CloudOrt } from '../data/onedrive';
import { SYNC_STANDARD, SyncEinstellungen, cloudGewaehlt, cloudName, syncEinstellungen, syncEinstellungenSetzen, syncZustandLoeschen } from '../data/sync-ordner';
import { SyncService } from '../data/sync.service';
import { SpotifyArt, spotifyAnmelden, spotifyArt, spotifyArtSetzen, spotifyVerbunden } from '../data/spotify-remote';
import { dauerhaftImBrowser } from '../data/speicher';
import { install, installable, iosHint } from '../pwa';

// Backstage → Einrichtung: einmal je Gerät nach der ersten Anmeldung (backstage-zugang.ts), später unter
// Einstellungen erneut aufrufbar. Schritte: Ich bin · Dieses Gerät · Synchronisation (OneDrive-Ordner selbst wählen,
// Hinweis auf „Blickfeld Nord (geteilt)/Sync“; lokal der Speicher der App, Standards aus sync-ordner.ts) · Spotify
// (Standard: im Browser abspielen) · Fertig (geklärte Standards, App installieren). Jeder Schritt lässt sich
// überspringen; alles bleibt in den Einstellungen änderbar.
type Schritt = 'ich' | 'geraet' | 'sync' | 'spotify' | 'fertig';
const SCHRITTE: { id: Schritt; titel: string }[] = [
  { id: 'ich', titel: 'Ich bin' },
  { id: 'geraet', titel: 'Dieses Gerät' },
  { id: 'sync', titel: 'Synchronisation' },
  { id: 'spotify', titel: 'Spotify' },
  { id: 'fertig', titel: 'Fertig' },
];

/** Hinweis, welcher OneDrive-Ordner der der Band ist (so heißt er in der Auswahl; beim Besitzer ohne „(geteilt)“) */
export const BAND_ORDNER_HINWEIS = 'BlickfeldNord (geteilt)/Sync';

/**
 * Ist das (das Ende) der Pfad zum Ordner der Band? Es zählt nur der hintere Teil: „…/BlickfeldNord/Sync“ im eigenen
 * OneDrive (Besitzer, z. B. „Dokumente/Bands/BlickfeldNord/Sync“) bzw. „BlickfeldNord (geteilt)/Sync“ bei allen, mit
 * denen der Ordner geteilt ist. Groß-/Kleinschreibung und ein Leerzeichen in „Blickfeld Nord“ sind egal.
 */
export const istBandOrdner = (pfad: string) => /(^|\/)blickfeld ?nord( \(geteilt\))?\/sync$/i.test(pfad.trim());
/** liegt dieser Ordner auf dem Weg dorthin (BlickfeldNord selbst)? */
export const aufDemWeg = (pfad: string) => /(^|\/)blickfeld ?nord( \(geteilt\))?$/i.test(pfad.trim());

/** Synchronisation mit dem gewählten OneDrive-Ordner und den Standards (Speicher der App, beide Richtungen, automatisch …) */
export const syncMitOrdner = (ort: CloudOrt): SyncEinstellungen => ({ ...SYNC_STANDARD, cloud: ort.pfad, wurzel: ort.wurzel });

/** ist schon genau dieser Ordner eingestellt? */
export function gleicherOrdner(e: Pick<SyncEinstellungen, 'cloud' | 'wurzel'>, ort: CloudOrt): boolean {
  if (ort.wurzel) return !!e.wurzel && e.wurzel.drive === ort.wurzel.drive && e.wurzel.item === ort.wurzel.item && e.cloud === ort.pfad;
  return !e.wurzel && e.cloud === ort.pfad;
}

const SPOTIFY_ARTEN: { art: SpotifyArt; titel: string; text: string }[] = [
  { art: 'browser', titel: 'Im Browser abspielen (empfohlen)', text: 'Die App spielt selbst – nichts weiter nötig. Klappt am Computer und auf Android.' },
  { art: 'fern', titel: 'Spotify-App fernsteuern', text: 'Spielt in der Spotify-App auf diesem oder einem anderen Gerät.' },
  { art: 'vorschau', titel: 'Eingebetteter Player', text: 'Ohne Anmeldung, aber ohne Mitspielen beim Weiterblättern.' },
  { art: 'aus', titel: 'Kein Spotify', text: '' },
];

@Component({
  selector: 'app-backstage-einrichtung',
  imports: [RouterLink, MatIconModule],
  template: `
    <section class="section einrichtung">
      <p class="kicker">Backstage · Einrichtung</p>
      <h2>Willkommen im Backstage</h2>
      <ol class="fortschritt" aria-label="Schritte">
        @for (s of schritte; track s.id; let i = $index) {
          <li [class.an]="s.id === schritt()" [class.fertig]="i < nummer()" [attr.aria-current]="s.id === schritt() ? 'step' : null">{{ s.titel }}</li>
        }
      </ol>

      @switch (schritt()) {
        @case ('ich') {
          <h3>Wer bist du?</h3>
          <p>Damit zählen Zusagen zur Probe, dein Übe-Status und deine Notizen für dich.@if (ich()) { Erkannt über dein Microsoft-Konto – passt das?}</p>
          <label class="feld">Ich bin
            <select aria-label="Ich bin" (change)="ich.set($any($event.target).value)">
              <option value="" [selected]="!ich()">– wählen –</option>
              @for (m of mitglieder; track m.slug) { <option [value]="m.slug" [selected]="m.slug === ich()">{{ rufname(m) }}</option> }
            </select>
          </label>
        }
        @case ('geraet') {
          <h3>Wie heißt dieses Gerät?</h3>
          <p>Unter Abgleich → Geräte sieht die Band, welches Gerät wann zuletzt abgeglichen hat.</p>
          <label class="feld">Name dieses Geräts
            <input [value]="name()" maxlength="40" (input)="name.set($any($event.target).value)" />
          </label>
        }
        @case ('sync') {
          <h3>Synchronisation mit OneDrive</h3>
          <p>Über einen gemeinsamen Ordner in OneDrive kommen Setlists, Noten, Übe-Stände und Einstellungen auf alle deine
            Geräte und zur Band.</p>
          <!-- dynamischer Hinweis: grün, sobald der angezeigte bzw. gewählte Ordner auf „BlickfeldNord(geteilt)/Sync“ endet -->
          @if (treffer()) {
            <p class="tipp passt" role="status"><mat-icon>check_circle</mat-icon><span>{{ blaettern() ? 'Das ist der Ordner der Band – jetzt „Diesen Ordner nehmen“.' : 'Richtiger Ordner: der Ordner der Band.' }}</span></p>
          } @else {
            <p class="tipp" role="status"><mat-icon>info</mat-icon><span>Der Ordner der Band endet auf <strong>{{ hinweis }}</strong> – bei dem, der ihn geteilt hat,
              ohne „(geteilt)“ (z. B. „…/BlickfeldNord/Sync“).</span></p>
          }
          @if (gewaehlt(); as g) { <p class="ok"><mat-icon>check_circle</mat-icon><span>Abgleich mit „{{ g }}“{{ neuGewaehlt() ? ' – der erste Abgleich läuft im Hintergrund.' : '' }}</span></p> }
          @if (!konto()) {
            <button type="button" class="primaer" (click)="anmelden()" [disabled]="laeuft()"><mat-icon>login</mat-icon> Mit Microsoft anmelden</button>
          } @else if (blaettern(); as b) {
            <div class="auswahl">
              <p class="ort">OneDrive / {{ ortName(b.ort) }}</p>
              <div class="ordner">
                @if (b.ort.pfad || b.ort.wurzel) { <button type="button" (click)="oeffnen(eltern(b.ort))"><mat-icon>arrow_upward</mat-icon> eine Ebene hoch</button> }
                @for (o of b.ordner; track o.name + (o.wurzel?.item ?? '')) {
                  <button type="button" [class.weg]="richtung(b.ort, o)" (click)="oeffnen(hinein(b.ort, o))"><mat-icon>{{ o.wurzel ? 'folder_shared' : 'folder' }}</mat-icon> {{ o.name }}@if (o.wurzel) { <small>geteilt</small> }</button>
                }
                @if (!b.ordner.length) { <small>keine Unterordner</small> }
              </div>
              <button type="button" class="primaer" [disabled]="(!b.ort.pfad && !b.ort.wurzel) || laeuft()" (click)="waehlen(b.ort)"><mat-icon>check</mat-icon> Diesen Ordner nehmen</button>
              <button type="button" (click)="blaettern.set(null)">Abbrechen</button>
            </div>
          } @else {
            <button type="button" [class.primaer]="!gewaehlt()" (click)="oeffnen({ pfad: '' })" [disabled]="laeuft()"><mat-icon>folder_open</mat-icon> {{ gewaehlt() ? 'Anderen Ordner wählen' : 'OneDrive-Ordner wählen' }}</button>
          }
          <ul class="standards">
            <li>auf diesem Gerät im Speicher der App, in beide Richtungen</li>
            <li>automatisch beim Öffnen und alle 15 Minuten</li>
            <li>Löschen wird mitsynchronisiert, neue Noten kommen gleich zum Song</li>
          </ul>
        }
        @case ('spotify') {
          <h3>Songs anhören mit Spotify</h3>
          <p>Im Übe- und Probe-Modus läuft der Song mit. Braucht Spotify Premium; dein Konto muss für die App der Band freigeschaltet sein.</p>
          <div class="arten" role="radiogroup" aria-label="Spotify">
            @for (a of arten; track a.art) {
              <label class="art"><input type="radio" name="spotify" [checked]="art() === a.art" (change)="art.set(a.art)" />
                <span><strong>{{ a.titel }}</strong>@if (a.text) { <small>{{ a.text }}</small> }</span></label>
            }
          </div>
          @if (apple && art() === 'browser') { <p class="hinweis">Auf iPhone und iPad spielt Spotify oft nicht im Browser – klappt es nicht, „Spotify-App fernsteuern“ wählen.</p> }
          @if (art() === 'browser' || art() === 'fern') {
            @if (spotifyOk()) { <p class="ok"><mat-icon>check_circle</mat-icon> Mit Spotify verbunden.</p> }
            @else { <button type="button" class="primaer" (click)="spotifyVerbinden()"><mat-icon>link</mat-icon> Mit Spotify verbinden</button> }
          }
        }
        @case ('fertig') {
          <h3>Fertig eingerichtet</h3>
          <p>Diese Standards gelten – alles lässt sich unter Einstellungen ändern:</p>
          <ul class="standards">
            <li>Bühnen-Modus: Pfeiltasten links/rechts blättern, oben/unten wechseln die Ansicht; der Fortschrittsbalken ist nicht antippbar</li>
            <li>Spotify: Übergänge proben aus, „Spotify trennen“ nur in den Einstellungen</li>
            <li>Daten dieses Geräts werden dauerhaft gespeichert, soweit der Browser es erlaubt</li>
          </ul>
          @if (installierbar()) { <button type="button" (click)="installieren()"><mat-icon>install_mobile</mat-icon> Als App installieren</button> }
          @else if (iosHint()) { <p class="hinweis">Tipp: Über Teilen → „Zum Home-Bildschirm“ wird das Backstage zur App – mit Vollbild und ohne Browserleiste.</p> }
        }
      }
      @if (fehler(); as f) { <p class="fehler" role="alert">{{ f }}</p> }

      <div class="leiste">
        @if (nummer() > 0) { <button type="button" (click)="zurueck()">Zurück</button> }
        <button type="button" class="primaer" (click)="weiter()" [disabled]="laeuft()">{{ schritt() === 'fertig' ? 'Los geht’s' : 'Weiter' }}</button>
        @if (schritt() !== 'fertig') { <button type="button" class="link" (click)="ueberspringen()">Einrichtung überspringen</button> }
      </div>
      <p class="hinweis">Später jederzeit unter <a routerLink="/backstage/einstellungen">Einstellungen</a>.</p>
    </section>
  `,
})
export class BackstageEinrichtung implements OnInit {
  /** wohin danach (?ziel=…); Schritt nach der Rückkehr von Spotify (?schritt=spotify) */
  readonly ziel = input<string>();
  readonly start = input<string>(undefined, { alias: 'schritt' });
  private readonly router = inject(Router);
  private readonly sync = inject(SyncService);
  protected readonly mitglieder = inject(BandService).members;
  protected readonly rufname = rufname;
  protected readonly schritte = SCHRITTE.filter((s) => s.id !== 'sync' || oneDriveEingerichtet());
  protected readonly arten = SPOTIFY_ARTEN;
  protected readonly hinweis = BAND_ORDNER_HINWEIS;
  protected readonly apple = typeof navigator !== 'undefined' && /iPhone|iPad/.test(navigator.userAgent);

  protected readonly schritt = signal<Schritt>('ich');
  protected readonly nummer = computed(() => this.schritte.findIndex((s) => s.id === this.schritt()));
  protected readonly laeuft = signal(false);
  protected readonly fehler = signal('');

  protected readonly ich = signal(ladeIch());
  protected readonly name = signal('');
  /** eingestellter OneDrive-Ordner („Blickfeld Nord (geteilt)/Sync“), leer = noch keiner */
  protected readonly gewaehlt = signal(cloudGewaehlt(syncEinstellungen()) ? cloudName(syncEinstellungen()) : '');
  protected readonly neuGewaehlt = signal(false);
  protected readonly konto = signal(false);
  protected readonly blaettern = signal<{ ort: CloudOrt; ordner: CloudEintrag[] } | null>(null);
  protected readonly art = signal<SpotifyArt>(spotifyArt() === 'aus' ? 'browser' : spotifyArt());
  protected readonly spotifyOk = signal(spotifyVerbunden());
  protected readonly installierbar = installable;
  protected readonly iosHint = iosHint;

  constructor() {
    this.namePruefen();
    oneDriveVorbereiten();
    if (oneDriveEingerichtet()) oneDriveKonto().then((k) => this.konto.set(!!k), () => undefined);
  }

  ngOnInit(): void {
    // zurück von der Spotify-Anmeldung: dort weitermachen
    const s = this.start();
    if (s && this.schritte.some((x) => x.id === s)) this.schritt.set(s as Schritt);
  }

  private namePruefen(): void {
    const m = this.mitglieder.find((x) => x.slug === this.ich());
    this.name.set(geraetName() || geraetVorschlag(m ? rufname(m) : '', standardName(navigator.userAgent)));
  }

  protected readonly ortName = (ort: CloudOrt) => cloudName({ cloud: ort.pfad, wurzel: ort.wurzel });
  /** Hinweis grün: beim Durchklicken der angezeigte Ordner, sonst der gewählte */
  protected readonly treffer = computed(() => {
    const b = this.blaettern();
    return istBandOrdner(b ? this.ortName(b.ort) : this.gewaehlt());
  });
  /** Ordner in der Liste, der zum Ordner der Band führt (BlickfeldNord bzw. darin Sync) – grün umrandet */
  protected richtung(ort: CloudOrt, o: CloudEintrag): boolean {
    const ziel = this.ortName(this.hinein(ort, o));
    return istBandOrdner(ziel) || aufDemWeg(ziel);
  }
  protected eltern(ort: CloudOrt): CloudOrt {
    return ort.pfad ? { pfad: ort.pfad.split('/').slice(0, -1).join('/'), wurzel: ort.wurzel } : { pfad: '' };
  }
  protected hinein(ort: CloudOrt, o: CloudEintrag): CloudOrt {
    return o.wurzel ? { pfad: '', wurzel: o.wurzel } : { pfad: ort.pfad ? `${ort.pfad}/${o.name}` : o.name, wurzel: ort.wurzel };
  }

  /** anmelden – synchron aus dem Antippen (sonst blockt Safari das Fenster) */
  protected anmelden(): void {
    this.fehler.set('');
    this.laeuft.set(true);
    oneDriveAnmelden()
      .then((k) => this.konto.set(!!k))
      .catch((e) => this.fehler.set((e as Error).message))
      .finally(() => this.laeuft.set(false));
  }

  /** Ordner in OneDrive durchklicken (ganz oben auch die mit dir geteilten) */
  protected async oeffnen(ort: CloudOrt): Promise<void> {
    this.laeuft.set(true);
    this.fehler.set('');
    try {
      this.blaettern.set({ ort, ordner: await cloudUnterordner(ort) });
    } catch (e) {
      this.fehler.set(`OneDrive-Ordner nicht lesbar: ${(e as Error).message || 'unbekannter Fehler'}`);
    } finally {
      this.laeuft.set(false);
    }
  }

  /** gewählter Ordner + Standards (lokal: Speicher der App); anderer Ordner als bisher → Abgleich beginnt neu */
  protected async waehlen(ort: CloudOrt): Promise<void> {
    const vorher = syncEinstellungen();
    const gleich = cloudGewaehlt(vorher) && gleicherOrdner(vorher, ort);
    syncEinstellungenSetzen(gleich ? vorher : syncMitOrdner(ort));
    if (!gleich) await syncZustandLoeschen().catch(() => undefined);
    this.blaettern.set(null);
    this.gewaehlt.set(this.ortName(ort));
    this.neuGewaehlt.set(true);
    void this.sync.jetzt();
  }

  /** Spotify: gewählte Art merken, dann zur Anmeldung bei Spotify – zurück geht es in diesen Schritt */
  protected spotifyVerbinden(): void {
    spotifyArtSetzen(this.art());
    const ziel = this.ziel() ? `&ziel=${encodeURIComponent(this.ziel()!)}` : '';
    void spotifyAnmelden(`/backstage/einrichtung?schritt=spotify${ziel}`, this.art());
  }

  protected installieren(): void {
    void install();
  }

  /** Schritt abschließen (Eingaben übernehmen) und weiter */
  protected weiter(): void {
    this.fehler.set('');
    switch (this.schritt()) {
      case 'ich':
        if (this.ich() && this.ich() !== ladeIch()) ichSetzen(this.ich());
        this.namePruefen();
        break;
      case 'geraet':
        if (this.name().trim()) geraetNameSetzen(this.name().trim());
        break;
      case 'spotify':
        spotifyArtSetzen(this.art());
        break;
      case 'fertig':
        einrichtungMerken('fertig');
        void dauerhaftImBrowser();
        void this.router.navigateByUrl(zugangZiel(this.ziel()));
        return;
    }
    this.schritt.set(this.schritte[this.nummer() + 1].id);
  }

  protected zurueck(): void {
    this.schritt.set(this.schritte[Math.max(0, this.nummer() - 1)].id);
  }

  protected ueberspringen(): void {
    einrichtungMerken('uebersprungen');
    void this.router.navigateByUrl(zugangZiel(this.ziel()));
  }
}
