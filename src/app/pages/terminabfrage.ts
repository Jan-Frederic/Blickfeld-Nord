import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';

// Terminabfrage in der Band (Backstage → Termine): mögliche Tage wählen → fertiger Text für die WhatsApp-Gruppe.
// Die Antworten hier ankreuzen – daraus wird der Block für „abwesenheiten“ in band.service.ts (wie im Termin-Formular).
const EDIT_URL = 'https://github.com/Jan-Frederic/Blickfeld-Nord/edit/main/src/app/data/band.service.ts';
const q = (s: string) => `'${s.trim().replace(/\\/g, '\\\\').replace(/'/g, '’')}'`;
const tag = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

@Component({
  selector: 'app-terminabfrage',
  imports: [MatIconModule],
  template: `
    <details class="neu">
      <summary><mat-icon>how_to_vote</mat-icon> Terminabfrage in der Band</summary>
      <p class="hint">Mögliche Tage eintragen, Text in die WhatsApp-Gruppe schicken, Antworten unten ankreuzen.</p>
      <div class="add">
        <label>Tag<input type="date" #d /></label>
        <label class="grow">Anlass <small>(optional)</small><input [value]="anlass()" (input)="anlass.set($any($event.target).value)" placeholder="z. B. Anfrage Schützenfest" maxlength="80" /></label>
        <button type="button" (click)="hinzu(d.value); d.value = ''"><mat-icon>add</mat-icon> Tag hinzufügen</button>
      </div>

      @if (tage().length) {
        <table>
          <thead><tr><th>Tag</th>@for (m of leute; track m) { <th>{{ m }} kann nicht</th> }<th></th></tr></thead>
          <tbody>
            @for (t of tage(); track t) {
              <tr>
                <td>{{ tag(t) }}</td>
                @for (m of leute; track m) {
                  <td><input type="checkbox" [checked]="nein().has(t + '|' + m)" (change)="kreuz(t, m)" [attr.aria-label]="m + ' kann am ' + tag(t) + ' nicht'" /></td>
                }
                <td><button type="button" class="icon" (click)="weg(t)" [attr.aria-label]="tag(t) + ' entfernen'"><mat-icon>close</mat-icon></button></td>
              </tr>
            }
          </tbody>
        </table>
        <div class="actions">
          <a class="btn primary" [href]="whatsapp()" target="_blank" rel="noopener"><mat-icon>send</mat-icon> An die WhatsApp-Gruppe</a>
          <button type="button" class="btn" (click)="kopieren(text())"><mat-icon>content_copy</mat-icon> Text kopieren</button>
        </div>
        @if (block()) {
          <p class="hint">Abwesenheiten aus den Antworten – unter <code>readonly abwesenheiten: Abwesenheit[] = [</code> einfügen:</p>
          <pre class="code">{{ block() }}</pre>
          <div class="actions">
            <button type="button" class="btn" (click)="kopieren(block())"><mat-icon>content_copy</mat-icon> Block kopieren</button>
            <a class="btn" [href]="editUrl" target="_blank" rel="noopener"><mat-icon>edit</mat-icon> Datei auf GitHub öffnen</a>
          </div>
        }
        @if (meldung()) { <p class="ok" role="status">{{ meldung() }}</p> }
      }
    </details>
  `,
  styles: `
    .neu { margin-top: 24px; padding: 14px 18px; border: 1px solid var(--bn-line); border-radius: 12px; }
    summary { display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 600; }
    summary mat-icon { color: var(--bn-sunset); }
    .hint { margin: 12px 0 8px; font-size: .85rem; color: var(--bn-fog); }
    .add { display: flex; flex-wrap: wrap; gap: 10px; align-items: end; }
    label { display: grid; gap: 4px; font-size: .82rem; color: var(--bn-fog); }
    .grow { flex: 1 1 200px; }
    input:not([type=checkbox]) { padding: 8px 10px; border: 1px solid var(--bn-line); border-radius: 8px; background: #1b1e22; color: var(--bn-ink); font: inherit; color-scheme: dark; }
    input[type=checkbox] { width: 18px; height: 18px; accent-color: var(--bn-sunset); }
    table { width: 100%; margin-top: 14px; border-collapse: collapse; font-size: .9rem; }
    th { text-align: left; font-weight: 400; font-size: .75rem; color: var(--bn-fog); padding: 6px; }
    td { padding: 6px; border-top: 1px solid var(--bn-line); }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    button, .btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; font-size: .88rem; text-decoration: none; cursor: pointer; }
    button:hover, .btn:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .primary { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    .icon { padding: 4px; border: 0; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .code { margin: 0; padding: 12px; border-radius: 8px; background: #111316; overflow-x: auto; font-size: .8rem; }
    .ok { margin: 10px 0 0; color: #7fc29b; font-size: .85rem; }
  `,
})
export class Terminabfrage {
  protected readonly editUrl = EDIT_URL;
  protected readonly tag = tag;
  protected readonly leute = inject(BandService).members.map((m) => m.nickname ?? m.name.split(' ')[0]);
  protected readonly tage = signal<string[]>([]);
  protected readonly anlass = signal('');
  protected readonly nein = signal(new Set<string>());
  protected readonly meldung = signal('');

  protected readonly text = computed(() =>
    [
      `📅 Terminabfrage Blickfeld Nord${this.anlass().trim() ? ' – ' + this.anlass().trim() : ''}`,
      'Wer kann an welchem Tag NICHT? Bitte kurz mit ✅ / ❌ je Tag antworten:',
      '',
      ...this.tage().map((t, i) => `${i + 1}) ${tag(t)}`),
    ].join('\n'),
  );
  protected readonly whatsapp = computed(() => `https://wa.me/?text=${encodeURIComponent(this.text())}`);

  protected readonly block = computed(() =>
    this.tage()
      .flatMap((t) => this.leute.filter((m) => this.nein().has(t + '|' + m)).map((m) => `    { wer: ${q(m)}, von: ${q(t)}${this.anlass().trim() ? `, grund: ${q(this.anlass())}` : ''} },`))
      .join('\n'),
  );

  protected hinzu(d: string): void {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d) && !this.tage().includes(d)) this.tage.update((l) => [...l, d].sort());
  }
  protected weg(t: string): void {
    this.tage.update((l) => l.filter((x) => x !== t));
  }
  protected kreuz(t: string, m: string): void {
    this.nein.update((s) => {
      const n = new Set(s);
      const k = t + '|' + m;
      if (!n.delete(k)) n.add(k);
      return n;
    });
  }
  protected async kopieren(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.meldung.set('Kopiert ✓');
      setTimeout(() => this.meldung.set(''), 2000);
    } catch {
      window.prompt('Text kopieren:', text);
    }
  }
}
