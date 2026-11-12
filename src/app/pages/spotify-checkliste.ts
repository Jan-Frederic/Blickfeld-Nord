import { Component, input, signal } from '@angular/core';
import { spotifyBrowser } from '../data/spotify-browser';
import { SpotifyArt, SpotifyFehler, spotifyGeraete } from '../data/spotify-remote';
import { SPOTIFY_OK_KEY, SPOTIFY_PREMIUM_FEHLT_KEY } from '../data/spotify-spieler';

// Einstellungen → Spotify: Checkliste zum Einrichten der Fernsteuerung bzw. des Browser-Players – was schon passt und
// was noch fehlt, damit jede Person es selbst sieht (statt nachzufragen). Verbunden, erster gespielter Song und
// „nur mit Premium“ kommen aus dem Speicher dieses Geräts; „Jetzt prüfen“ fragt Spotify, ob das Konto für die App
// freigeschaltet ist und ob ein Gerät bereit ist (Fernsteuerung: Spotify-App offen; Browser-Player: dieser Browser
// kann abspielen).
type Stand = 'ok' | 'fehlt' | 'offen';
interface Punkt {
  was: string;
  stand: Stand;
  text: string;
}
const lesen = (k: string): unknown => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? 'null');
  } catch {
    return null;
  }
};

@Component({
  selector: 'app-spotify-checkliste',
  template: `
    <div class="liste" aria-live="polite">
      <p class="titel">Einrichtung</p>
      <ul>
        @for (p of punkte(); track p.was) {
          <li [class]="p.stand"><span class="zeichen" aria-hidden="true">{{ p.stand === 'ok' ? '✓' : p.stand === 'fehlt' ? '✗' : '○' }}</span>
            <span><b>{{ p.was }}</b> – {{ p.text }}<span class="sr">{{ p.stand === 'ok' ? ' (erledigt)' : p.stand === 'fehlt' ? ' (fehlt)' : ' (noch offen)' }}</span></span></li>
        }
      </ul>
      <button type="button" (click)="pruefen()" [disabled]="!verbunden() || rechteFehlen() || prueft()">{{ prueft() ? 'Prüft …' : 'Jetzt prüfen' }}</button>
    </div>
  `,
  styles: `
    .liste { margin-top: 14px; padding: 12px 14px; border: 1px solid var(--bn-line); border-radius: 10px; font-size: .85rem; }
    .titel { margin: 0 0 6px; font-size: .72rem; color: var(--bn-fog); text-transform: uppercase; letter-spacing: .08em; }
    ul { margin: 0 0 10px; padding: 0; list-style: none; display: grid; gap: 6px; }
    li { display: flex; gap: 8px; line-height: 1.45; color: var(--bn-fog); }
    li b { color: var(--bn-ink); font-weight: 600; }
    .zeichen { flex: none; width: 1.2em; text-align: center; font-weight: 700; }
    .ok .zeichen { color: #5fb88a; }
    .fehlt .zeichen { color: #e0b25a; }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    button { padding: 6px 14px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; cursor: pointer; }
    button:disabled { opacity: .5; cursor: default; }
  `,
})
export class SpotifyCheckliste {
  readonly art = input.required<SpotifyArt>();
  readonly verbunden = input(false);
  readonly rechteFehlen = input(false);
  protected readonly prueft = signal(false);
  /** Ergebnis von „Jetzt prüfen“ */
  private readonly freigabe = signal<{ stand: Stand; text: string } | null>(null);
  private readonly geraet = signal<{ stand: Stand; text: string } | null>(null);
  private readonly premiumFehlt = signal(lesen(SPOTIFY_PREMIUM_FEHLT_KEY) === true);

  protected punkte(): Punkt[] {
    const browser = this.art() === 'browser';
    const ok = lesen(SPOTIFY_OK_KEY);
    const verbunden: Punkt = this.verbunden() && !this.rechteFehlen()
      ? { was: 'Verbunden', stand: 'ok', text: 'dieses Gerät ist mit deinem Spotify-Konto verbunden.' }
      : { was: 'Verbunden', stand: 'fehlt', text: this.rechteFehlen() ? 'fürs Abspielen im Browser oben „Spotify neu verbinden“ tippen.' : 'oben „Spotify verbinden“ tippen und bei Spotify zustimmen.' };
    const premium: Punkt = this.premiumFehlt()
      ? { was: 'Spotify Premium', stand: 'fehlt', text: 'Spotify meldet: geht nur mit Premium.' }
      : ok
        ? { was: 'Spotify Premium', stand: 'ok', text: 'vorhanden (ein Song lief schon).' }
        : { was: 'Spotify Premium', stand: 'offen', text: 'nötig – zeigt sich beim ersten Abspielen.' };
    const lief: Punkt = ok
      ? { was: 'Erster Song', stand: 'ok', text: `lief zuletzt am ${new Date(String(ok)).toLocaleDateString('de-DE')}.` }
      : { was: 'Erster Song', stand: 'offen', text: 'im Übe- oder Probe-Modus bei einem Song ▶ drücken.' };
    return [
      verbunden,
      { was: 'Konto freigeschaltet', ...(this.freigabe() ?? { stand: 'offen' as Stand, text: 'die Spotify-App der Band muss dein Konto kennen – „Jetzt prüfen“.' }) },
      { was: browser ? 'Dieser Browser spielt ab' : 'Spotify-Gerät bereit', ...(this.geraet() ?? { stand: 'offen' as Stand, text: browser ? 'Spotify spielt hier im Browser – „Jetzt prüfen“.' : 'die Spotify-App (Handy) oder open.spotify.com (Computer) muss offen sein – „Jetzt prüfen“.' }) },
      premium,
      lief,
    ];
  }

  protected async pruefen(): Promise<void> {
    this.prueft.set(true);
    try {
      try {
        const liste = await spotifyGeraete();
        this.freigabe.set({ stand: 'ok', text: 'Spotify kennt dein Konto.' });
        if (this.art() !== 'browser')
          this.geraet.set(liste.length ? { stand: 'ok', text: `gefunden: ${liste.map((g) => g.name).join(', ')}.` } : { stand: 'fehlt', text: 'keins gefunden – Spotify-App öffnen (am Computer: open.spotify.com), dann noch einmal prüfen.' });
      } catch (e) {
        const art = e instanceof SpotifyFehler ? e.art : 'netz';
        this.freigabe.set(
          art === 'freigabe'
            ? { stand: 'fehlt', text: 'noch nicht – wer die Spotify-App der Band verwaltet, muss dein Konto im Spotify-Developer-Dashboard unter „User Management“ eintragen.' }
            : art === 'premium'
              ? { stand: 'fehlt', text: 'Spotify meldet: geht nur mit Premium.' }
              : { stand: 'offen', text: 'Spotify antwortet gerade nicht – später noch einmal prüfen.' },
        );
        if (art === 'premium') this.premiumFehlt.set(true);
        return;
      }
      if (this.art() === 'browser') await this.browserPruefen();
    } finally {
      this.prueft.set(false);
    }
  }

  /** Browser-Player einmal anmelden: bereit → ✓; Fehler sagen, was fehlt (danach wieder lösen, er meldet sich nach 10 min ab) */
  private async browserPruefen(): Promise<void> {
    const b = spotifyBrowser();
    let fehler: SpotifyFehler | null = null;
    b.anbinden(() => undefined, (e) => (fehler = e));
    try {
      await Promise.race([b.verbinden(), new Promise((_, nein) => setTimeout(() => nein(new SpotifyFehler('geraet')), 12_000))]);
      this.geraet.set({ stand: 'ok', text: 'der Player im Browser ist bereit.' });
    } catch (e) {
      const art = (fehler ?? (e instanceof SpotifyFehler ? e : null))?.art;
      if (art === 'premium') this.premiumFehlt.set(true);
      this.geraet.set(
        art === 'browser'
          ? { stand: 'fehlt', text: 'dieser Browser kann Spotify nicht selbst abspielen – am Computer probieren oder „Fernsteuerung“ wählen.' }
          : art === 'premium'
            ? { stand: 'fehlt', text: 'Spotify meldet: geht nur mit Premium.' }
            : { stand: 'offen', text: 'Der Player meldet sich nicht – noch einmal prüfen.' },
      );
    } finally {
      b.loesen();
    }
  }
}
