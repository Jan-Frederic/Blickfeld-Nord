import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { ichSetzen, ladeIch, rufname } from '../data/band-ich';
import { geraetName, geraetNameSetzen, standardName } from '../data/geraete';
import { einrichtungMerken, geraetVorschlag } from '../data/einrichtung';
import { zugangZiel } from '../data/zugang';
import { ONEDRIVE } from '../data/onedrive-config';
import { SYNC_ORDNER_NAME, bandOrdnerOrt, oneDriveKonto, type CloudOrt } from '../data/onedrive';
import { SYNC_STANDARD, SyncEinstellungen, cloudGewaehlt, cloudName, syncEinstellungen, syncEinstellungenSetzen, syncZustandLoeschen } from '../data/sync-ordner';
import { SyncService } from '../data/sync.service';
import { SpotifyArt, spotifyAnmelden, spotifyArt, spotifyArtSetzen, spotifyVerbunden } from '../data/spotify-remote';
import { dauerhaftImBrowser } from '../data/speicher';
import { install, installable, iosHint } from '../pwa';

// Backstage → Einrichtung: einmal je Gerät nach der ersten Anmeldung (backstage-zugang.ts), später unter
// Einstellungen erneut aufrufbar. Schritte: Ich bin · Dieses Gerät · Synchronisation mit dem Band-Ordner
// „Blickfeld Nord Sync“ (Standards aus sync-ordner.ts) · Spotify (Standard: im Browser abspielen) · Fertig (geklärte
// Standards, App installieren). Jeder Schritt lässt sich überspringen; alles bleibt in den Einstellungen änderbar.
type Schritt = 'ich' | 'geraet' | 'sync' | 'spotify' | 'fertig';
const SCHRITTE: { id: Schritt; titel: string }[] = [
  { id: 'ich', titel: 'Ich bin' },
  { id: 'geraet', titel: 'Dieses Gerät' },
  { id: 'sync', titel: 'Synchronisation' },
  { id: 'spotify', titel: 'Spotify' },
  { id: 'fertig', titel: 'Fertig' },
];

/** Synchronisation mit dem Band-Ordner und den Standards (beide Richtungen, Speicher der App, automatisch …) */
export const syncMitBandOrdner = (ort: CloudOrt): SyncEinstellungen => ({ ...SYNC_STANDARD, cloud: ort.pfad, wurzel: ort.wurzel });

/** ist schon genau dieser Ordner eingestellt? */
export function gleicherOrdner(e: Pick<SyncEinstellungen, 'cloud' | 'wurzel'>, ort: CloudOrt): boolean {
  if (ort.wurzel) return !!e.wurzel && e.wurzel.drive === ort.wurzel.drive && e.wurzel.item === ort.wurzel.item && !e.cloud;
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
          <h3>Synchronisation mit „{{ ordnerName }}“</h3>
          <p>„{{ ordnerName }}“ ist der gemeinsame Ordner der Band in OneDrive. Darüber kommen Setlists, Noten, Übe-Stände und
            Einstellungen auf alle deine Geräte und zur Band.</p>
          @if (syncStand(); as s) {
            <p class="ok"><mat-icon>check_circle</mat-icon> {{ s }}</p>
          } @else if (anderer()) {
            <p>Eingestellt ist gerade: <strong>{{ anderer() }}</strong>. So lassen – oder auf „{{ ordnerName }}“ umstellen?</p>
          }
          <ul class="standards">
            <li>Speicher der App auf diesem Gerät ↔ „{{ ordnerName }}“, in beide Richtungen</li>
            <li>automatisch beim Öffnen und alle 15 Minuten</li>
            <li>Löschen wird mitsynchronisiert, neue Noten kommen gleich zum Song</li>
          </ul>
          @if (!syncStand()) {
            <button type="button" class="primaer" (click)="syncEinrichten()" [disabled]="laeuft()"><mat-icon>sync</mat-icon> {{ laeuft() ? 'Richte ein …' : anderer() ? 'Auf „' + ordnerName + '“ umstellen' : 'Mit „' + ordnerName + '“ abgleichen' }}</button>
          }
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
  protected readonly schritte = SCHRITTE.filter((s) => s.id !== 'sync' || !!ONEDRIVE.bandOrdner);
  protected readonly arten = SPOTIFY_ARTEN;
  protected readonly ordnerName = SYNC_ORDNER_NAME;
  protected readonly apple = typeof navigator !== 'undefined' && /iPhone|iPad/.test(navigator.userAgent);

  protected readonly schritt = signal<Schritt>('ich');
  protected readonly nummer = computed(() => this.schritte.findIndex((s) => s.id === this.schritt()));
  protected readonly laeuft = signal(false);
  protected readonly fehler = signal('');

  protected readonly ich = signal(ladeIch());
  protected readonly name = signal('');
  protected readonly syncStand = signal('');
  protected readonly anderer = signal('');
  protected readonly art = signal<SpotifyArt>(spotifyArt() === 'aus' ? 'browser' : spotifyArt());
  protected readonly spotifyOk = signal(spotifyVerbunden());
  protected readonly installierbar = installable;
  protected readonly iosHint = iosHint;

  constructor() {
    this.namePruefen();
    void this.syncPruefen();
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

  /** schon mit dem Band-Ordner eingerichtet? Sonst zeigen, was eingestellt ist */
  private async syncPruefen(): Promise<void> {
    const e = syncEinstellungen();
    if (!ONEDRIVE.bandOrdner || !cloudGewaehlt(e)) return;
    const b = ONEDRIVE.bandOrdner;
    if (e.wurzel?.drive === b.drive && e.wurzel.item === b.item) return this.syncStand.set(`Eingerichtet: „${SYNC_ORDNER_NAME}“`);
    // im eigenen OneDrive (Besitzer) steht der Band-Ordner als Pfad drin – dafür einmal nachsehen
    const ort = (await oneDriveKonto().catch(() => null)) ? await bandOrdnerOrt().catch(() => null) : null;
    if (ort && gleicherOrdner(e, ort.ort)) return this.syncStand.set(`Eingerichtet: „${SYNC_ORDNER_NAME}“ (in deinem OneDrive)`);
    this.anderer.set(cloudName(e));
  }

  protected async syncEinrichten(): Promise<void> {
    this.laeuft.set(true);
    this.fehler.set('');
    try {
      if (!(await oneDriveKonto())) throw new Error('Nicht bei Microsoft angemeldet – unter Einstellungen → Synchronisation anmelden.');
      const b = await bandOrdnerOrt();
      if (!b) return;
      const vorher = syncEinstellungen();
      const neu = syncMitBandOrdner(b.ort);
      syncEinstellungenSetzen(cloudGewaehlt(vorher) && gleicherOrdner(vorher, b.ort) ? { ...neu, ...vorher } : neu);
      if (!gleicherOrdner(vorher, b.ort)) await syncZustandLoeschen().catch(() => undefined);
      this.syncStand.set(`Eingerichtet: „${SYNC_ORDNER_NAME}“${b.eigen ? ' (liegt in deinem OneDrive – du darfst Daten löschen)' : ''} – der erste Abgleich läuft im Hintergrund.`);
      this.anderer.set('');
      void this.sync.jetzt();
    } catch (e) {
      this.fehler.set(`Einrichten nicht möglich: ${(e as Error).message || 'unbekannter Fehler'}`);
    } finally {
      this.laeuft.set(false);
    }
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
