import { Component, computed, effect, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

interface Group {
  title: string;
  items: string[];
}

// Standard-Packliste – eigene Punkte kommen unter „Eigene Punkte“ dazu
export const GROUPS: Group[] = [
  { title: 'PA', items: ['Lautsprecher (Tops)', 'Subwoofer', 'Mischpult', 'Gesangsmikrofone (3×)', 'Drum-Mikrofone', 'Monitorboxen'] },
  { title: 'Licht', items: ['Scheinwerfer (PAR)', 'Lichtstativ / Lichtbrücke', 'Lichtsteuerung', 'Nebelmaschine + Fluid'] },
  {
    title: 'Instrumente',
    items: ['Akustikgitarre', 'E-Bass', 'Bassverstärker', 'Schlagzeug (Kessel, Becken, Hardware)', 'Sticks', 'Plektren', 'Ersatzsaiten', 'Stimmgerät'],
  },
  { title: 'Kabel & Strom', items: ['XLR-Kabel', 'Klinkenkabel', 'Stromkabel', 'Mehrfachsteckdosen', 'Kabeltrommel', 'Gaffa-Tape'] },
  { title: 'Ständer', items: ['Mikrofonständer', 'Gitarrenständer', 'Bassständer', 'Notenständer'] },
  { title: 'Sonstiges', items: ['Setlist / Noten', 'Bühnenteppich', 'Banner 4 × 2 m', 'Befestigung fürs Banner (Kabelbinder, Seil)', 'Taschenlampe', 'QR-Code-Karte für die Theke'] },
];

// Pro Auftritt eine eigene Liste: bn-packliste-<Auftritts-ID>
export const PACKLISTE_PREFIX = 'bn-packliste-';

interface Stored {
  checked: string[];
  custom: string[];
}

// Speicherung nur im Browser dieses Geräts (localStorage) – geht beim Löschen der Browserdaten verloren
export function loadPackliste(key: string): Stored {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const data = JSON.parse(raw) as Partial<Stored>;
      return { checked: data.checked ?? [], custom: data.custom ?? [] };
    }
  } catch {
    // privater Modus o. Ä. – dann eben ohne Speicherung
  }
  return { checked: [], custom: [] };
}

@Component({
  selector: 'app-packliste',
  imports: [MatIconModule],
  template: `
    <section class="packliste" aria-labelledby="packliste-title">
      <div class="head">
        <div>
          <p class="kicker">Für diesen Auftritt</p>
          <h3 id="packliste-title">Packliste</h3>
        </div>
        <div class="progress" [class.done]="done() === total()">
          <span>{{ done() }} / {{ total() }} eingepackt</span>
          <span class="bar"><span [style.width.%]="total() ? (done() / total()) * 100 : 0"></span></span>
        </div>
        <button type="button" class="reset" (click)="reset()" [disabled]="done() === 0">
          <mat-icon>restart_alt</mat-icon> Zurücksetzen
        </button>
      </div>

      <div class="groups">
        @for (g of groups(); track g.title) {
          <fieldset>
            <legend>{{ g.title }}</legend>
            @for (item of g.items; track item) {
              <div class="row">
                <label [class.checked]="isChecked(item)">
                  <input type="checkbox" [checked]="isChecked(item)" (change)="toggle(item)" />
                  <span>{{ item }}</span>
                </label>
                @if (g.custom) {
                  <button type="button" class="remove" (click)="remove(item, $event)" [attr.aria-label]="item + ' entfernen'">
                    <mat-icon>close</mat-icon>
                  </button>
                }
              </div>
            }
            @if (g.custom) {
              <form class="add" (submit)="add(input, $event)">
                <input #input type="text" placeholder="Eigenen Punkt hinzufügen …" maxlength="60" aria-label="Eigenen Punkt hinzufügen" />
                <button type="submit" aria-label="Hinzufügen"><mat-icon>add</mat-icon></button>
              </form>
            }
          </fieldset>
        }
      </div>
      <p class="hint">Die Häkchen werden pro Auftritt nur in diesem Browser auf diesem Gerät gespeichert.</p>
    </section>
  `,
  styles: `
    .packliste { margin-top: 48px; padding: 24px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    .head { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px 28px; margin-bottom: 20px; }
    .head .kicker { margin-bottom: 4px; }
    h3 { font-family: var(--bn-display); font-weight: 400; font-size: 1.3rem; text-transform: uppercase; letter-spacing: .08em; margin: 0; }
    .progress { display: flex; flex-direction: column; gap: 6px; min-width: 200px; font-size: .85rem; color: var(--bn-fog); }
    .progress.done { color: #7fc29b; }
    .bar { display: block; height: 6px; border-radius: 3px; background: var(--bn-line); overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--bn-sunset); transition: width .3s; }
    .progress.done .bar span { background: #7fc29b; }
    .reset {
      margin-left: auto; display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; cursor: pointer;
      border: 1px solid var(--bn-line); background: transparent; color: var(--bn-ink); font: inherit; font-size: .85rem;
    }
    .reset:hover:not(:disabled) { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .reset:disabled { opacity: .4; cursor: default; }
    .reset mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .groups { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
    fieldset { margin: 0; padding: 14px 16px 10px; border: 1px solid var(--bn-line); border-radius: 10px; min-width: 0; }
    legend { padding: 0 6px; font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .16em; font-size: .72rem; color: var(--bn-sunset); }
    .row { display: flex; align-items: center; }
    label { flex: 1; display: flex; align-items: center; gap: 10px; padding: 6px 0; cursor: pointer; line-height: 1.35; }
    label input { width: 18px; height: 18px; flex: none; accent-color: var(--bn-sunset); cursor: pointer; }
    label.checked span { color: var(--bn-fog); text-decoration: line-through; }
    .remove { margin-left: auto; display: grid; place-items: center; padding: 2px; border: 0; background: transparent; color: var(--bn-fog); cursor: pointer; }
    .remove:hover { color: var(--bn-sunset); }
    .remove mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .add { display: flex; gap: 6px; margin-top: 8px; }
    .add input {
      flex: 1; min-width: 0; padding: 7px 10px; border-radius: 8px; border: 1px solid var(--bn-line);
      background: transparent; color: var(--bn-ink); font: inherit; font-size: .88rem;
    }
    .add input:focus { outline: none; border-color: var(--bn-sunset); }
    .add button { display: grid; place-items: center; width: 34px; border-radius: 8px; border: 1px solid var(--bn-line); background: transparent; color: var(--bn-ink); cursor: pointer; }
    .add button:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .hint { margin: 16px 0 0; font-size: .8rem; color: var(--bn-fog); }
    @media (max-width: 520px) { .packliste { padding: 16px; } .reset { margin-left: 0; } }
  `,
})
export class Packliste {
  /** Auftritts-ID – jeder Auftritt hat seine eigenen Häkchen und eigenen Punkte */
  readonly show = input.required<string>();
  private readonly key = computed(() => PACKLISTE_PREFIX + this.show());
  private readonly state = signal<Stored>({ checked: [], custom: [] });

  constructor() {
    // beim Wechsel zu einem anderen Auftritt dessen gespeicherte Liste laden
    effect(() => this.state.set(loadPackliste(this.key())));
  }

  protected readonly groups = computed(() => [
    ...GROUPS.map((g) => ({ ...g, custom: false })),
    { title: 'Eigene Punkte', items: this.state().custom, custom: true },
  ]);
  private readonly allItems = computed(() => this.groups().flatMap((g) => g.items));
  protected readonly total = computed(() => this.allItems().length);
  protected readonly done = computed(() => this.allItems().filter((i) => this.state().checked.includes(i)).length);

  protected isChecked(item: string): boolean {
    return this.state().checked.includes(item);
  }

  protected toggle(item: string): void {
    this.update((s) => ({
      ...s,
      checked: s.checked.includes(item) ? s.checked.filter((i) => i !== item) : [...s.checked, item],
    }));
  }

  protected add(input: HTMLInputElement, event: Event): void {
    event.preventDefault();
    const text = input.value.trim();
    if (text && !this.allItems().includes(text)) {
      this.update((s) => ({ ...s, custom: [...s.custom, text] }));
    }
    input.value = '';
  }

  protected remove(item: string, event: Event): void {
    event.preventDefault();
    this.update((s) => ({ custom: s.custom.filter((i) => i !== item), checked: s.checked.filter((i) => i !== item) }));
  }

  protected reset(): void {
    this.update((s) => ({ ...s, checked: [] }));
  }

  private update(fn: (s: Stored) => Stored): void {
    this.state.update(fn);
    try {
      localStorage.setItem(this.key(), JSON.stringify(this.state()));
    } catch {
      // Speichern nicht möglich – die Liste funktioniert trotzdem bis zum Neuladen
    }
  }
}
