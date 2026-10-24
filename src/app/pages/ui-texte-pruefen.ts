import { Component, computed, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import texte from '../data/ui-texte.json';

// Backstage → Übersetzungen, Abschnitt „Oberfläche“: Menüs, Buttons und Hinweise (tr(…) im Code, gesammelt von
// scripts/ui-texte.mjs). „Passt“ merkt sich der Browser (bn-ui-geprueft, mit „An die Band schicken“ teilbar);
// Korrekturen gehen als fertige Nachricht an Fred, der sie im Code einträgt.
type Sprache = 'en' | 'nl';
interface Text { datei: string; key: string; de: string; en: string; nl: string }
const KEY = 'bn-ui-geprueft';
const id = (t: Text, s: Sprache) => `${t.datei}|${t.key}|${s}|${t[s]}`;

function laden(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-ui-texte-pruefen',
  imports: [MatIconModule],
  template: `
    <section class="ui" aria-labelledby="ui-title">
      <h3 id="ui-title"><mat-icon>web</mat-icon> Oberfläche: Menüs, Buttons, Hinweise</h3>
      <p class="lead">
        <label>Sprache
          <select [value]="sprache()" (change)="sprache.set($any($event.target).value)">
            <option value="en">Englisch</option><option value="nl">Niederländisch</option>
          </select>
        </label>
        <span><strong>{{ geprueft() }}</strong> von {{ alle.length }} geprüft</span>
        <label class="nur"><input type="checkbox" [checked]="nurOffen()" (change)="nurOffen.set($any($event.target).checked)" /> nur offene</label>
      </p>
      @for (g of gruppen(); track g.datei) {
        <details>
          <summary>{{ g.datei }} <small>{{ g.offen }} offen</small></summary>
          <ul>
            @for (t of g.texte; track t.datei + t.key) {
              <li [class.ok]="status()[id(t)] === 'ok'">
                <span class="de">{{ t.de }}</span>
                @if (status()[id(t)] && status()[id(t)] !== 'ok') {
                  <input [value]="status()[id(t)]" (change)="setzen(t, $any($event.target).value)" [attr.aria-label]="'Korrektur für: ' + t.de" />
                } @else {
                  <span class="ue">{{ t[sprache()] }}</span>
                }
                <span class="tools">
                  <button type="button" (click)="setzen(t, status()[id(t)] === 'ok' ? '' : 'ok')" [attr.aria-pressed]="status()[id(t)] === 'ok'"><mat-icon>check</mat-icon> Passt</button>
                  <button type="button" (click)="setzen(t, t[sprache()])" aria-label="Korrigieren"><mat-icon>edit</mat-icon></button>
                </span>
              </li>
            }
          </ul>
        </details>
      }
      @if (korrekturen().length) {
        <p class="msg">{{ korrekturen().length }} Korrektur(en) –
          <button type="button" (click)="kopieren()"><mat-icon>content_copy</mat-icon> {{ kopiert() ? 'Kopiert!' : 'Als Nachricht kopieren' }}</button>
        </p>
      }
    </section>
  `,
  styles: `
    .ui { margin-top: 48px; }
    h3 { display: flex; align-items: center; gap: 8px; font-family: var(--bn-wide); font-weight: 400; text-transform: uppercase; letter-spacing: .14em; font-size: .9rem; }
    h3 mat-icon { color: var(--bn-sunset); }
    .lead { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; font-size: .9rem; }
    .lead strong { color: var(--bn-sunset); }
    select, input:not([type=checkbox]) { padding: 6px 10px; border-radius: 8px; border: 1px solid var(--bn-line); background: #1b1e22; color: var(--bn-ink); font: inherit; color-scheme: dark; }
    .nur { display: flex; align-items: center; gap: 6px; }
    details { border: 1px solid var(--bn-line); border-radius: 10px; padding: 10px 14px; margin-bottom: 8px; }
    summary { cursor: pointer; } summary small { color: var(--bn-fog); margin-left: 8px; }
    ul { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 6px; }
    li { display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; align-items: center; padding: 8px 0; border-top: 1px solid var(--bn-line); font-size: .9rem; }
    li.ok .ue { color: #7fc29b; }
    .de { color: var(--bn-fog); }
    .tools { display: flex; gap: 6px; }
    button { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; font-size: .8rem; cursor: pointer; }
    button[aria-pressed=true] { border-color: #7fc29b; color: #7fc29b; }
    mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .msg { display: flex; align-items: center; gap: 10px; }
    @media (max-width: 700px) { li { grid-template-columns: 1fr; } }
  `,
})
export class UiTextePruefen {
  protected readonly alle = texte as Text[];
  protected readonly sprache = signal<Sprache>('en');
  protected readonly nurOffen = signal(true);
  protected readonly kopiert = signal(false);
  /** je Text und Sprache: 'ok' (passt) oder die Korrektur */
  private readonly werte = signal<Record<string, string>>(laden());

  protected readonly status = computed(() => {
    const s = this.sprache();
    const w = this.werte();
    return Object.fromEntries(this.alle.map((t) => [`${t.datei}|${t.key}`, w[id(t, s)] ?? ''])) as Record<string, string>;
  });
  protected id(t: Text): string {
    return `${t.datei}|${t.key}`;
  }
  protected readonly geprueft = computed(() => Object.values(this.status()).filter((v) => v === 'ok').length);
  protected readonly gruppen = computed(() => {
    const map = new Map<string, Text[]>();
    for (const t of this.alle) map.set(t.datei, [...(map.get(t.datei) ?? []), t]);
    return [...map].map(([datei, liste]) => {
      const offen = liste.filter((t) => this.status()[this.id(t)] !== 'ok');
      return { datei, offen: offen.length, texte: this.nurOffen() ? offen : liste };
    }).filter((g) => g.texte.length);
  });
  protected readonly korrekturen = computed(() => {
    const w = this.werte();
    return (['en', 'nl'] as const).flatMap((s) => this.alle.filter((t) => w[id(t, s)] && w[id(t, s)] !== 'ok' && w[id(t, s)] !== t[s]).map((t) => ({ t, s, neu: w[id(t, s)] })));
  });

  protected setzen(t: Text, wert: string): void {
    const k = id(t, this.sprache());
    this.werte.update((w) => {
      const { [k]: _, ...rest } = w;
      return wert ? { ...rest, [k]: wert } : rest;
    });
    try {
      localStorage.setItem(KEY, JSON.stringify(this.werte()));
    } catch {
      // ohne Speicher bis zum Neuladen
    }
  }

  protected async kopieren(): Promise<void> {
    const text = ['Korrekturen an den Oberflächentexten der Website:', '', ...this.korrekturen().map(({ t, s, neu }) => `${t.datei} (${t.key}, ${s.toUpperCase()}):\n  Deutsch: ${t.de}\n  bisher: ${t[s]}\n  neu:    ${neu}`)].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      this.kopiert.set(true);
      setTimeout(() => this.kopiert.set(false), 2000);
    } catch {
      window.prompt('Nachricht kopieren:', text);
    }
  }
}
