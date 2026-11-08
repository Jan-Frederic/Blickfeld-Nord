import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { ichSetzen, ladeIch, rufname } from '../data/band-ich';
import { ladeWackelt } from '../data/wackelt';
import { ladeTagesziel, speichereTagesziel } from '../data/ueben';

// Backstage → Einstellungen: „Ich bin …“ – wer dieses Gerät benutzt. Gilt für Probe (Zusagen, Sitzt/Nochmal im
// Probe-Modus), „Wackelt noch“ und den Übemodus; dazu das Tagesziel des Übemodus (Karten je Tag). Beides wird mit den
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
      <p class="hinweis">Damit zählen Zusagen zur Probe, Sitzt/Nochmal im Probe-Modus, „Wackelt noch“ und der Übemodus für dich.</p>
      <label class="ziel">Karteikarten am Tag (Übemodus)
        <input type="number" min="1" max="100" inputmode="numeric" aria-label="Karteikarten am Tag" [value]="ziel()" (change)="zielSetzen($any($event.target).value)" />
      </label>
      <p class="hinweis">So viele Karten schlägt der Übemodus je Tag vor – gilt für dich auf allen deinen Geräten.@if (gespeichert()) { <span class="ok"> Gespeichert ✓</span> }</p>
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
    .hinweis { margin: 10px 0 0; max-width: 720px; font-size: .85rem; line-height: 1.5; color: var(--bn-fog); }
  `,
})
export class IchEinstellung {
  protected readonly mitglieder = inject(BandService).members;
  protected readonly rufname = rufname;
  protected readonly ich = signal(ladeIch());
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
    ichSetzen(slug, ladeWackelt());
    this.ich.set(slug);
  }
}
