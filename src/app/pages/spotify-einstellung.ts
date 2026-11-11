import { Component, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SpotifyArt, spotifyAbmelden, spotifyAnmelden, spotifyArt, spotifyArtSetzen, spotifyVerbunden } from '../data/spotify-remote';

// Backstage → Einstellungen: Spotify im Übe- und Probe-Modus – aus (Standard), eingebetteter Player oder Fernsteuerung
// der Spotify-App (data/spotify-remote.ts). Gilt für dieses Gerät; die Spotify-Verbindung der Fernsteuerung lässt sich
// hier herstellen und trennen (danach geht es hierher zurück).
@Component({
  selector: 'app-spotify-einstellung',
  imports: [MatIconModule],
  template: `
    <div class="box">
      <h3><mat-icon>music_note</mat-icon> Spotify im Übe- und Probe-Modus</h3>
      <label>Songs anhören
        <select aria-label="Spotify im Übe- und Probe-Modus" (change)="waehlen($any($event.target).value)">
          <option value="aus" [selected]="art() === 'aus'">Aus – kein Spotify</option>
          <option value="vorschau" [selected]="art() === 'vorschau'">Eingebetteter Player</option>
          <option value="fern" [selected]="art() === 'fern'">Fernsteuerung der Spotify-App</option>
        </select>
      </label>
      @switch (art()) {
        @case ('aus') { <p class="hinweis">Im Übe- und Probe-Modus erscheint nichts von Spotify.</p> }
        @case ('vorschau') { <p class="hinweis">„♫ Auf Spotify anhören“ in der Titelanzeige lädt den Spotify-Player in die Seite. Am Computer spielt er ganze Songs (bei Spotify angemeldet), auf dem Handy nur die 30-Sekunden-Vorschau.</p> }
        @case ('fern') {
          <p class="hinweis">▶ spielt den angezeigten Song ganz – in der Spotify-App auf diesem Handy oder auf einem anderen Spotify-Gerät (Laptop, Lautsprecher). Braucht Spotify Premium; die Spotify-App muss offen sein.</p>
          @if (verbunden()) {
            <p class="hinweis ok"><mat-icon aria-hidden="true">check_circle</mat-icon> Mit Spotify verbunden. <button type="button" (click)="trennen()">Trennen</button></p>
          } @else {
            <button type="button" class="verbinden" (click)="verbinden()">♫ Spotify verbinden</button>
          }
        }
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
    .ok { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; color: #5fb88a; }
    button { padding: 6px 14px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; font-size: .85rem; cursor: pointer; }
    button.verbinden { margin-top: 10px; border-color: #1db954; color: #1db954; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `,
})
export class SpotifyEinstellung {
  protected readonly art = signal<SpotifyArt>(spotifyArt());
  protected readonly verbunden = signal(spotifyVerbunden());
  protected waehlen(a: SpotifyArt): void {
    spotifyArtSetzen(a);
    this.art.set(spotifyArt());
  }
  protected verbinden(): void {
    void spotifyAnmelden();
  }
  protected trennen(): void {
    spotifyAbmelden();
    this.verbunden.set(false);
  }
}
