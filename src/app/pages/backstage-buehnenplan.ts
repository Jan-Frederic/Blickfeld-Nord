import { Component, computed, signal, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Item, TechnikAufbau } from '../sections/technik-aufbau';
import { patchAufbau } from '../data/technik-patch';
import data from '../data/technik.json';

// Backstage → Bühnenplan: Geräte und Musiker im Plan verschieben (Maus, Finger, Pfeiltasten) und die geänderte
// technik.json für GitHub erzeugen – ohne Koordinaten von Hand. Gespeichert wird erst mit dem Commit auf GitHub.
const RAW_URL = 'https://raw.githubusercontent.com/Jan-Frederic/Blickfeld-Nord/main/src/app/data/technik.json';
const EDIT_URL = 'https://github.com/Jan-Frederic/Blickfeld-Nord/edit/main/src/app/data/technik.json';

@Component({
  selector: 'app-backstage-buehnenplan',
  imports: [MatIconModule, TechnikAufbau],
  template: `
    <section class="section">
      <p class="kicker">Backstage</p>
      <h2>Bühnenplan</h2>
      <p class="lead">
        Geräte und Musiker mit Maus oder Finger an ihren Platz ziehen. Feinjustierung: antippen, dann Pfeiltasten
        (5 cm, mit Umschalt 25 cm). Ein Kästchen ist 1 m.
      </p>

      <app-technik-aufbau [bearbeiten]="true" [nurPlan]="true" (geaendert)="items.set($event)" />

      <div class="apply">
        @if (geaendert().length) {
          <p><strong>{{ geaendert().length }}</strong> verschoben: {{ geaendert().join(', ') }}</p>
          <ol>
            <li><button type="button" (click)="erzeugen()"><mat-icon>content_copy</mat-icon> Datei für GitHub erzeugen</button></li>
            <li><a [href]="editUrl" target="_blank" rel="noopener"><mat-icon>open_in_new</mat-icon> technik.json auf GitHub öffnen</a>, mit Strg+A alles markieren, einfügen, „Commit changes“</li>
          </ol>
          <button type="button" class="reset" (click)="plan().reset(); meldung.set('')"><mat-icon>restart_alt</mat-icon> Alles zurücksetzen</button>
          @if (meldung(); as m) { <p class="meldung" role="status">{{ m }}</p> }
        } @else {
          <p>Noch nichts verschoben. Nach dem Commit erscheint der neue Plan auf der Technik-Seite, im Technik-Rider und im Bühnenplan-PDF.</p>
        }
      </div>
    </section>
  `,
  styles: `
    .apply { margin-top: 24px; padding: 16px 18px; border: 1px solid var(--bn-line); border-radius: 12px; font-size: .9rem; line-height: 1.6; }
    .apply p { margin: 0 0 8px; }
    .apply ol { margin: 0 0 12px; padding-left: 20px; display: grid; gap: 8px; }
    .apply button, .apply a { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; text-decoration: none; cursor: pointer; }
    .apply button:hover, .apply a:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .apply mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .meldung { margin: 10px 0 0 !important; color: #5fb88a; }
  `,
})
export class BackstageBuehnenplan {
  protected readonly editUrl = EDIT_URL;
  protected readonly plan = viewChild.required(TechnikAufbau);
  protected readonly items = signal<Item[]>(data.aufbau as Item[]);
  protected readonly meldung = signal('');

  // Namen der verschobenen Elemente
  protected readonly geaendert = computed(() => {
    const orig = new Map((data.aufbau as Item[]).map((i) => [i.id, i]));
    return this.items()
      .filter((i) => {
        const o = orig.get(i.id)!;
        return o.x !== i.x || o.y !== i.y;
      })
      .map((i) => i.label);
  });

  // aktuelle technik.json holen, nur den Abschnitt „aufbau“ ersetzen und in die Zwischenablage legen
  protected async erzeugen(): Promise<void> {
    try {
      const res = await fetch(`${RAW_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const text = patchAufbau(await res.text(), this.items());
      if (!text) throw new Error('aufbau fehlt');
      await navigator.clipboard.writeText(text);
      this.meldung.set('Kopiert ✓ – jetzt technik.json auf GitHub öffnen und den Inhalt ersetzen.');
    } catch {
      this.meldung.set(navigator.onLine ? 'Die Datei ließ sich nicht laden oder kopieren – bitte später noch einmal versuchen.' : 'Offline – dafür braucht es Internet.');
    }
  }
}
