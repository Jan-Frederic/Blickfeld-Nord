import { Component, input, output, signal, effect } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { alleMarkierungen, markierungenSetzen, alleSongNoten, notenDateiLoeschen, notenDateien, songNotenSetzen } from '../data/noten';
import { DoppelGruppe, NotenCheck, notenCheck, zusammenfuehren } from '../data/noten-check';
import { mb } from '../data/aufraeumen';

// Backstage → Abgleich → Daten auf diesem Gerät → Noten-Check (Logik: data/noten-check.ts): Noten-Dateien ohne Song
// und doppelte Dateien. Doppelte lassen sich zusammenführen (nur auf diesem Gerät). Dateien in OneDrive löscht ihr dort
// selbst – deshalb gibt es hier kein „Löschen“.
@Component({
  selector: 'app-noten-check',
  imports: [MatIconModule],
  template: `
    @if (check(); as c) {
      @if (c.ohneSong.length || c.doppelt.length) {
        <details class="noten-check">
          <summary><mat-icon>rule</mat-icon> Noten-Check: {{ zusammenfassung(c) }}</summary>
          @if (c.doppelt.length) {
            <h5>Doppelt auf diesem Gerät</h5>
            <ul>
              @for (g of c.doppelt; track g.behalten.id) {
                <li>
                  <span>{{ g.behalten.name }} <small>{{ g.weitere.length + 1 }}× · je {{ mb(g.behalten.groesse) }}{{ g.songs.length ? ' · bei ' + songsText(g.songs) : ' · bei keinem Song' }}</small></span>
                  <button type="button" (click)="fuehren(g)" [disabled]="laeuft()"><mat-icon>merge</mat-icon> Zusammenführen</button>
                </li>
              }
            </ul>
          }
          @if (c.ohneSong.length) {
            <h5>Ohne Song</h5>
            <p>Diese Dateien gehören zu keinem Song – zuordnen unter Abgleich → „Synchronisierte Dateien einlesen“. Was weg soll, löscht ihr in OneDrive.</p>
            <ul>
              @for (d of c.ohneSong; track d.id) { <li><span>{{ d.name }} <small>{{ mb(d.groesse) }}</small></span></li> }
            </ul>
          }
          @if (meldung(); as m) { <p class="meldung" role="status">{{ m }}</p> }
        </details>
      }
    }
  `,
})
export class NotenCheckKarte {
  /** neu prüfen, wenn sich etwas ändert */
  readonly version = input(0);
  readonly geaendert = output<void>();
  protected readonly check = signal<NotenCheck | null>(null);
  protected readonly laeuft = signal(false);
  protected readonly meldung = signal('');
  protected readonly mb = mb;

  constructor() {
    effect(() => {
      this.version();
      void this.pruefen();
    });
  }

  private async pruefen(): Promise<void> {
    try {
      const [dateien, songs] = await Promise.all([notenDateien(), alleSongNoten()]);
      this.check.set(notenCheck(dateien, songs));
    } catch {
      this.check.set(null);
    }
  }

  protected zusammenfassung(c: NotenCheck): string {
    return [c.doppelt.length && `${c.doppelt.length} doppelt`, c.ohneSong.length && `${c.ohneSong.length} ohne Song`].filter(Boolean).join(' · ');
  }

  protected songsText(keys: string[]): string {
    const t = keys.map((k) => k.split('|')[0]);
    return t.slice(0, 3).join(', ') + (t.length > 3 ? ` und ${t.length - 3} weiteren` : '');
  }

  /** alle Songs auf die behaltene Kopie zeigen lassen, die übrigen Kopien von diesem Gerät nehmen (OneDrive bleibt) */
  protected async fuehren(g: DoppelGruppe): Promise<void> {
    if (!confirm(`„${g.behalten.name}“ zusammenführen? Alle Songs zeigen dann auf eine Kopie, die ${g.weitere.length === 1 ? 'zweite verschwindet' : `übrigen ${g.weitere.length} verschwinden`} von diesem Gerät. In OneDrive ändert sich nichts.`)) return;
    this.laeuft.set(true);
    try {
      const geaendert = zusammenfuehren(await alleSongNoten(), g);
      for (const [key, n] of Object.entries(geaendert)) await songNotenSetzen(key, n);
      // Markierungen der weiteren Kopien mitnehmen, wo die behaltene auf der Seite noch keine hat
      const mark = await alleMarkierungen();
      for (const d of g.weitere)
        for (const [k, striche] of Object.entries(mark)) {
          if (!k.startsWith(d.id + ':') || !striche.length) continue;
          const seite = Number(k.slice(d.id.length + 1));
          if (!mark[`${g.behalten.id}:${seite}`]?.length) {
            await markierungenSetzen(g.behalten.id, seite, striche);
            mark[`${g.behalten.id}:${seite}`] = striche;
          }
        }
      for (const d of g.weitere) await notenDateiLoeschen(d.id);
      this.meldung.set(`„${g.behalten.name}“ zusammengeführt ✓`);
      await this.pruefen();
      this.geaendert.emit();
    } catch (e) {
      this.meldung.set(`Zusammenführen fehlgeschlagen: ${(e as Error).message || 'unbekannter Fehler'}`);
    } finally {
      this.laeuft.set(false);
    }
  }
}
