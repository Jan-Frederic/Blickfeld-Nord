import { Component, afterNextRender, computed, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SpotifyCheckliste } from './spotify-checkliste';
import { SpotifyArt, spotifyAbmelden, spotifyAnmelden, spotifyArt, spotifyArtSetzen, spotifyMitspielen, spotifyMitspielenSetzen, spotifyUebergang, spotifyUebergangSetzen, spotifyBrowserRechte, spotifyGesteuert, spotifyLage, spotifyMeldung, spotifyProtokoll, spotifyProtokollLeeren, spotifyVerbunden } from '../data/spotify-remote';

// Backstage → Einstellungen: Spotify im Übe- und Probe-Modus – aus (Standard), eingebetteter Player, Fernsteuerung
// der Spotify-App (data/spotify-remote.ts) oder im Browser abspielen (data/spotify-browser.ts). Gilt für dieses Gerät; die Spotify-Verbindung der Fernsteuerung lässt sich
// hier herstellen und trennen (danach geht es hierher zurück). „Diagnose“ zeigt das Protokoll der letzten Befehle und
// Antworten von Spotify (ohne Zugangsschlüssel) zum Kopieren – für die Fehlersuche.
/** Anleitung für die anderen in der Band – ohne Konten, ohne E-Mail-Adressen */
export const SPOTIFY_ANLEITUNG = `Spotify im Übe- und Probe-Modus einrichten (Blickfeld Nord):
1. Link öffnen (Backstage) – er führt direkt zu den Spotify-Einstellungen.
2. „Im Browser abspielen“ wählen (Computer und Android mit Chrome), sonst „Fernsteuerung der Spotify-App“.
3. „Spotify verbinden“ tippen und bei Spotify zustimmen – dafür braucht es Spotify Premium.
4. Die Checkliste darunter zeigt, was noch fehlt: „Jetzt prüfen“ tippen.
Steht bei „Konto freigeschaltet“ ein ✗: kurz Bescheid geben – das Spotify-Konto muss einmal in der Spotify-App der Band eingetragen werden.`;

@Component({
  selector: 'app-spotify-einstellung',
  imports: [MatIconModule, SpotifyCheckliste],
  template: `
    <div class="box" id="spotify">
      <h3><mat-icon>music_note</mat-icon> Spotify im Übe- und Probe-Modus</h3>
      <label>Songs anhören
        <select aria-label="Spotify im Übe- und Probe-Modus" (change)="waehlen($any($event.target).value)">
          <option value="aus" [selected]="art() === 'aus'">Aus – kein Spotify</option>
          <option value="vorschau" [selected]="art() === 'vorschau'">Eingebetteter Player</option>
          <option value="fern" [selected]="art() === 'fern'">Fernsteuerung der Spotify-App</option>
          <option value="browser" [selected]="art() === 'browser'">Im Browser abspielen</option>
        </select>
      </label>
      @switch (art()) {
        @case ('aus') { <p class="hinweis">Im Übe- und Probe-Modus erscheint nichts von Spotify.</p> }
        @case ('vorschau') { <p class="hinweis">„♫ Auf Spotify anhören“ in der Titelanzeige lädt den Spotify-Player in die Seite. Am Computer spielt er ganze Songs (bei Spotify angemeldet), auf dem Handy nur die 30-Sekunden-Vorschau.</p> }
        @case ('fern') { <p class="hinweis">▶ spielt den angezeigten Song ganz – in der Spotify-App auf diesem Handy oder auf einem anderen Spotify-Gerät (Laptop, Lautsprecher). Braucht Spotify Premium; die Spotify-App muss offen sein.</p> }
        @case ('browser') { <p class="hinweis">▶ spielt den Song hier im Browser – ohne Spotify-App, mit Premium. Am Computer und auf Android; klappt es nicht, „Fernsteuerung“ wählen.</p> }
      }
      @if (gesteuert()) {
        @if (verbunden() && !rechteFehlen()) {
          <p class="hinweis ok"><mat-icon aria-hidden="true">check_circle</mat-icon> Mit Spotify verbunden. <button type="button" (click)="trennen()">Trennen</button></p>
        } @else {
          <button type="button" class="verbinden" (click)="verbinden()">{{ rechteFehlen() ? '♫ Spotify neu verbinden – fürs Abspielen im Browser' : '♫ Spotify verbinden' }}</button>
          @if (meldung) { <p class="hinweis warn" role="status">{{ meldung }}</p> }
        }
        <!-- Verhalten der Steuerung im Übe- und Probe-Modus (je Gerät) -->
        <label class="check"><input type="checkbox" class="mitspielen" [checked]="mitspielen()" (change)="mitspielenSetzen($any($event.target).checked)" />
          Beim Weiterblättern mitspielen – läuft ein Song, startet beim nächsten gleich dessen Spotify-Track</label>
        <label class="check"><input type="checkbox" class="uebergang" [checked]="uebergang()" (change)="uebergangSetzen($any($event.target).checked)" />
          Übergänge proben – Knopf „⇢ Übergang“ in der Steuerung: die letzten 15 Sekunden, dann der nächste Song ab dem Einsatz</label>
        <app-spotify-checkliste [art]="art()" [verbunden]="verbunden()" [rechteFehlen]="rechteFehlen()" />
        <!-- Einladung an die anderen: kurze Anleitung mit Link hierher (Teilen-Menü, sonst Zwischenablage) -->
        <p class="knoepfe"><button type="button" class="teilen" (click)="teilen()">Anleitung teilen</button> <span role="status">{{ geteilt() }}</span></p>
        @if (teilText(); as t) { <textarea class="teil-text" readonly rows="7" aria-label="Anleitung zum Kopieren">{{ t }}</textarea> }
        <details class="diagnose" (toggle)="protokollLesen()">
          <summary>Diagnose</summary>
          <p class="hinweis">Was die Steuerung zuletzt an Spotify geschickt hat und was zurückkam – ohne Zugangsschlüssel. Tut sie nicht, was sie soll: Fehler im Übe- oder Probe-Modus nachstellen, dann hier kopieren und weitergeben.</p>
          <p class="knoepfe"><button type="button" (click)="kopieren()">Protokoll kopieren</button> <button type="button" (click)="leeren()">Leeren</button> <span role="status">{{ kopiert() }}</span></p>
          <pre tabindex="0" aria-label="Spotify-Protokoll">{{ protokoll() }}</pre>
        </details>
      }
      <p class="hinweis">Gilt für dieses Gerät und nur für Songs, die in einer Spotify-Liste stehen.</p>
    </div>
  `,
  styles: `
    .box { margin-top: 20px; padding: 20px 24px; border-radius: 12px; border: 1px solid var(--bn-line); }
    h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-family: var(--bn-wide); font-weight: 400; text-transform: uppercase; letter-spacing: .14em; font-size: .85rem; }
    label { display: grid; gap: 4px; max-width: 320px; font-size: .8rem; color: var(--bn-fog); }
    select { padding: 8px 10px; border: 1px solid var(--bn-line); border-radius: 8px; background: #1b1e22; color: var(--bn-ink); font: inherit; font-size: .95rem; }
    .hinweis { margin: 10px 0 0; max-width: 720px; font-size: .85rem; line-height: 1.5; color: var(--bn-fog); }
    .warn { color: #e0b25a; }
    .ok { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; color: #5fb88a; }
    button { padding: 6px 14px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; font-size: .85rem; cursor: pointer; }
    button.verbinden { margin-top: 10px; border-color: #1db954; color: #1db954; }
    .check { display: flex; align-items: flex-start; gap: 8px; max-width: 720px; margin-top: 12px; font-size: .85rem; line-height: 1.45; color: var(--bn-ink); }
    .check input { flex: none; margin-top: 3px; accent-color: #1db954; }
    .teil-text { width: 100%; max-width: 720px; margin-top: 6px; padding: 8px; border: 1px solid var(--bn-line); border-radius: 8px; background: #111316; color: var(--bn-ink); font: .8rem/1.5 inherit; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .diagnose { margin-top: 14px; font-size: .85rem; color: var(--bn-fog); }
    .diagnose summary { cursor: pointer; }
    .knoepfe { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 10px 0 0; }
    pre { max-height: 320px; margin: 10px 0 0; padding: 10px 12px; overflow: auto; border: 1px solid var(--bn-line); border-radius: 8px; background: #111316; color: var(--bn-ink); font: .72rem/1.5 ui-monospace, Menlo, Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
  `,
})
export class SpotifyEinstellung {
  protected readonly art = signal<SpotifyArt>(spotifyArt());
  protected readonly geteilt = signal('');
  protected readonly mitspielen = signal(spotifyMitspielen());
  protected readonly uebergang = signal(spotifyUebergang());
  protected mitspielenSetzen(an: boolean): void {
    spotifyMitspielenSetzen(an);
    this.mitspielen.set(an);
  }
  protected uebergangSetzen(an: boolean): void {
    spotifyUebergangSetzen(an);
    this.uebergang.set(an);
  }
  protected readonly teilText = signal('');
  /** Link aus „Anleitung teilen“: direkt hierher scrollen */
  private readonly hinScrollen = afterNextRender(() => {
    if (location.hash === '#spotify') document.getElementById('spotify')?.scrollIntoView({ block: 'start' });
  });
  protected readonly gesteuert = computed(() => spotifyGesteuert(this.art()));
  protected readonly verbunden = signal(spotifyVerbunden());
  /** Browser-Player gewählt, aber der Zugang (von der Fernsteuerung) hat das Recht zum Abspielen nicht */
  protected readonly rechteFehlen = computed(() => this.art() === 'browser' && this.verbunden() && !spotifyBrowserRechte());
  /** Ergebnis der letzten Anmeldung (nach der Rückkehr von Spotify), wenn sie nicht geklappt hat */
  protected readonly meldung = spotifyVerbunden() ? (spotifyMeldung(), '') : spotifyMeldung();
  protected waehlen(a: SpotifyArt): void {
    spotifyArtSetzen(a);
    this.art.set(spotifyArt());
  }
  protected verbinden(): void {
    void spotifyAnmelden();
  }
  /** Anleitung mit Link teilen: Teilen-Menü (Handy), sonst Zwischenablage, sonst Text zum Markieren */
  protected async teilen(): Promise<void> {
    const url = `${location.origin}/backstage/einstellungen/#spotify`;
    const text = `${SPOTIFY_ANLEITUNG}\n${url}`;
    this.teilText.set('');
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: 'Spotify einrichten – Blickfeld Nord', text });
        this.geteilt.set('Geteilt ✓');
        return;
      } catch (e) {
        // abgebrochen: nichts weiter tun
        if ((e as Error)?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      this.geteilt.set('Anleitung kopiert ✓ – z. B. in WhatsApp einfügen.');
    } catch {
      this.geteilt.set('Zum Kopieren markieren:');
      this.teilText.set(text);
    }
  }

  protected trennen(): void {
    spotifyAbmelden();
    this.verbunden.set(false);
  }

  // Diagnose: Kopfzeilen (Einstellungen dieses Geräts) und die letzten Befehle samt Antworten
  protected readonly protokoll = signal('');
  protected readonly kopiert = signal('');
  private text(): string {
    const zeilen = spotifyProtokoll();
    return [`Spotify-Protokoll · ${new Date().toLocaleString('de-DE')}`, ...spotifyLage(), '', ...(zeilen.length ? zeilen : ['(noch nichts aufgezeichnet – erst im Übe- oder Probe-Modus ▶ drücken)'])].join('\n');
  }
  protected protokollLesen(): void {
    this.protokoll.set(this.text());
    this.kopiert.set('');
  }
  protected async kopieren(): Promise<void> {
    this.protokollLesen();
    try {
      await navigator.clipboard.writeText(this.protokoll());
      this.kopiert.set('Kopiert ✓');
    } catch {
      this.kopiert.set('Kopieren ging nicht – Text unten markieren und kopieren.');
    }
  }
  protected leeren(): void {
    spotifyProtokollLeeren();
    this.protokollLesen();
  }
}
