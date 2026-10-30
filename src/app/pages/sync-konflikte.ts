import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { SyncService } from '../data/sync.service';
import { eintragBeschreiben } from '../data/aufraeumen';
import { keyAusPfad, konfliktVon } from '../data/spiegel';

// Abgleich → Synchronisation → Konflikte: Haben zwei Geräte denselben Eintrag gleichzeitig geändert, gewinnt beim
// Abgleich die neuere Fassung, die ältere bleibt als Konfliktkopie liegen. Hier stehen beide nebeneinander:
// „Aktuelle behalten“ entfernt die Kopie, „Kopie übernehmen“ macht sie wieder zur gültigen Fassung (für alle).
interface Konflikt {
  pfad: string;
  original: string;
  datum: string;
  titel: string;
  aktuell: string;
  kopie: string;
  /** localStorage-Schlüssel (Daten/Einstellungen) bzw. undefined bei Noten und anderen Dateien */
  key?: string;
}

@Component({
  selector: 'app-sync-konflikte',
  imports: [MatIconModule],
  template: `
    @if (liste().length) {
      <div class="konflikte">
        <p class="kopf"><mat-icon>call_split</mat-icon> {{ liste().length }} {{ liste().length === 1 ? 'Konflikt' : 'Konflikte' }} – zwei Geräte haben dasselbe gleichzeitig geändert</p>
        <ul>
          @for (k of liste(); track k.pfad) {
            <li>
              <strong>{{ k.titel }}</strong>
              <span class="vergleich"><span>Aktuell: {{ k.aktuell }}</span><span>Kopie vom {{ k.datum }}: {{ k.kopie }}</span></span>
              <span class="knoepfe">
                <button type="button" (click)="behalten(k)" [disabled]="sync.laeuft()">Aktuelle behalten</button>
                <button type="button" (click)="uebernehmen(k)" [disabled]="sync.laeuft()">Kopie übernehmen</button>
              </span>
            </li>
          }
        </ul>
      </div>
    }
  `,
  styles: `
    .konflikte { margin: 12px 0; padding: 12px 14px; border: 1px solid #e8a46a; border-radius: 10px; }
    .kopf { display: flex; align-items: center; gap: 6px; margin: 0 0 8px; color: #e8a46a; font-size: .88rem; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    li { display: grid; gap: 4px; font-size: .88rem; }
    .vergleich { display: grid; gap: 2px; color: var(--bn-fog); font-size: .8rem; overflow-wrap: anywhere; }
    .knoepfe { display: flex; flex-wrap: wrap; gap: 6px; }
    button { padding: 5px 12px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; font-size: .82rem; cursor: pointer; }
    button:hover:not(:disabled) { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    button:disabled { opacity: .4; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `,
})
export class SyncKonflikte {
  /** von außen hochgezählt, wenn neu gelesen werden soll */
  readonly version = input(0);
  readonly geaendert = output<void>();
  protected readonly sync = inject(SyncService);
  private readonly band = inject(BandService);
  private readonly auftritte = new Map(this.band.shows.map((s) => [this.band.showId(s), s.venue]));
  protected readonly liste = signal<Konflikt[]>([]);
  protected readonly anzahl = computed(() => this.liste().length);

  constructor() {
    effect(() => {
      this.version();
      this.sync.letzter();
      untracked(() => void this.laden());
    });
  }

  private async laden(): Promise<void> {
    try {
      const o = await this.sync.lokal();
      if (!o) return this.liste.set([]);
      const dateien = await o.liste();
      const da = new Set(dateien.map((d) => d.pfad));
      const out: Konflikt[] = [];
      for (const d of dateien) {
        const k = konfliktVon(d.pfad);
        if (!k || !/^(Daten|Einstellungen|Noten|Markierungen)\//.test(d.pfad)) continue;
        const kopie = await (await o.lesen(d.pfad)).text();
        const key = keyAusPfad(k.original, this.sync.person()) ?? undefined;
        const aktuell = key ? localStorage.getItem(key) ?? '' : da.has(k.original) ? await (await o.lesen(k.original)).text() : '';
        const beschreiben = (roh: string) => (key ? eintragBeschreiben(key, roh, this.auftritte).details : `${roh.length} Zeichen`);
        out.push({
          pfad: d.pfad,
          original: k.original,
          datum: new Date(k.datum).toLocaleDateString('de-DE'),
          titel: key ? eintragBeschreiben(key, aktuell || kopie, this.auftritte).titel : k.original.split('/').at(-1)!.replace(/\.json$/, ''),
          aktuell: aktuell ? beschreiben(aktuell) : 'gelöscht',
          kopie: beschreiben(kopie),
          key,
        });
      }
      this.liste.set(out);
    } catch {
      this.liste.set([]);
    }
  }

  // Kopie entfernen – der Abgleich entfernt sie auch in OneDrive
  protected async behalten(k: Konflikt): Promise<void> {
    const o = await this.sync.lokal(true);
    await o?.loeschen(k.pfad);
    await this.fertig();
  }

  // Kopie zur gültigen Fassung machen: Eintrag setzen bzw. Datei ersetzen, Kopie entfernen
  protected async uebernehmen(k: Konflikt): Promise<void> {
    const o = await this.sync.lokal(true);
    if (!o) return;
    const kopie = await o.lesen(k.pfad);
    if (k.key) localStorage.setItem(k.key, await kopie.text());
    else await o.schreiben(k.original, kopie);
    await o.loeschen(k.pfad);
    await this.fertig();
  }

  private async fertig(): Promise<void> {
    await this.laden();
    this.geaendert.emit();
    void this.sync.jetzt();
  }
}
