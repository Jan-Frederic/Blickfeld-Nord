import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { ichQuelle, ichSetzen, ladeIch, rufname } from '../data/band-ich';
import { statusMigrieren } from '../data/uebe-status';
import { ladeTagesziel, speichereTagesziel } from '../data/ueben';

// Backstage → Einstellungen: „Ich bin …“ – wer dieses Gerät benutzt. Gilt für Probe (Zusagen, Status und Notizen im
// Probe-Modus), den Übe-Status je Song und den Übe-Modus; dazu das Tagesziel (Empfehlung, Karten je Tag). Beides wird mit den
// Einstellungen der Person gespiegelt (data/band-ich.ts, data/ueben.ts).
@Component({
  selector: 'app-ich-einstellung',
  imports: [MatIconModule],
  template: `
    <div class="box">
      <h3><mat-icon>person</mat-icon> Ich bin</h3>
      <label>Wer benutzt dieses Gerät?
        <select aria-label="Ich bin" (change)="waehlen($any($event.target).value)">
          <option value="" [selected]="!ich()">– wählen –</option>
          @for (m of mitglieder; track m.slug) { <option [value]="m.slug" [selected]="m.slug === ich()">{{ rufname(m) }}</option> }
        </select>
      </label>
      @if (quelle() === 'konto' && ich()) { <p class="hinweis konto"><mat-icon aria-hidden="true">verified_user</mat-icon> Automatisch erkannt über dein Microsoft-Konto.</p> }
      <p class="hinweis">Damit zählen Zusagen zur Probe, dein Übe-Status je Song (Song-Dialog, Probe-Modus, Übe-Modus) und deine Probe-Notizen für dich.
        Nach der Anmeldung mit Microsoft wird das automatisch über deinen Namen gesetzt; eine Wahl hier von Hand hat Vorrang.</p>
      <label class="ziel">Karteikarten am Tag (Empfehlung)
        <input type="number" min="1" max="100" inputmode="numeric" aria-label="Karteikarten am Tag" [value]="ziel()" (change)="zielSetzen($any($event.target).value)" />
      </label>
      <p class="hinweis">So viele Karten empfiehlt der Übe-Modus je Tag – mehr üben geht immer. Gilt für dich auf allen deinen Geräten.@if (gespeichert()) { <span class="ok"> Gespeichert ✓</span> }</p>
    </div>
  `,
  styles: `
    .box { margin-top: 20px; padding: 20px 24px; border-radius: 12px; border: 1px solid var(--bn-line); }
    h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-family: var(--bn-wide); font-weight: 400; text-transform: uppercase; letter-spacing: .14em; font-size: .85rem; }
    label { display: grid; gap: 4px; max-width: 320px; font-size: .8rem; color: var(--bn-fog); }
    select { padding: 8px 10px; border: 1px solid var(--bn-line); border-radius: 8px; background: #1b1e22; color: var(--bn-ink); font: inherit; font-size: .95rem; }
    .ziel { margin-top: 16px; }
    .ziel input { width: 6em; padding: 8px 10px; border: 1px solid var(--bn-line); border-radius: 8px; background: #1b1e22; color: var(--bn-ink); font: inherit; color-scheme: dark; }
    .ok { color: #5fb88a; }
    .konto { display: flex; align-items: center; gap: 6px; color: #5fb88a; }
    .konto mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .hinweis { margin: 10px 0 0; max-width: 720px; font-size: .85rem; line-height: 1.5; color: var(--bn-fog); }
  `,
})
export class IchEinstellung {
  protected readonly mitglieder = inject(BandService).members;
  protected readonly rufname = rufname;
  protected readonly ich = signal(ladeIch());
  protected readonly quelle = signal(ichQuelle());
  protected readonly ziel = signal(ladeTagesziel());
  protected readonly gespeichert = signal(false);
  protected zielSetzen(roh: string): void {
    const n = Math.round(Number(roh));
    if (!(n >= 1 && n <= 100)) return;
    speichereTagesziel(n);
    this.ziel.set(n);
    this.gespeichert.set(true);
  }
  protected waehlen(slug: string): void {
    ichSetzen(slug);
    this.ich.set(slug);
    this.quelle.set(ichQuelle());
    // Übe-Status dieser Person: einmalig aus dem alten Stand umstellen, dann „unsicher bei“ aus den Kästen
    statusMigrieren();
  }
}
