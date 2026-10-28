import { Component, OnDestroy, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { STANDARD_TASTEN, Tasten, halbseite, halbseiteSetzen, tasten, tastenName, tastenSetzen } from '../data/buehne-einstellungen';

// Backstage → Einstellungen → Bühnen-Modus: Halbseiten-Blättern und die Tasten fürs Fußpedal. Eine Taste kommt dazu,
// indem man „+ Taste“ antippt und dann aufs Pedal tritt (oder die Taste drückt).
@Component({
  selector: 'app-buehne-einstellungen',
  imports: [MatIconModule],
  template: `
    <div class="box">
      <h3><mat-icon>fit_screen</mat-icon> Bühnen-Modus</h3>
      <label class="check"><input type="checkbox" [checked]="halb()" (change)="halbSetzen($any($event.target).checked)" />
        Halbseiten-Blättern bei PDF-Noten – erst zeigt die obere Hälfte den Anfang der nächsten Seite, der nächste Tritt blättert ganz um</label>
      @for (r of richtungen; track r.feld) {
        <div class="tasten">
          <span class="was">{{ r.label }}</span>
          @for (k of t()[r.feld]; track k) {
            <span class="taste">{{ name(k) }} <button type="button" (click)="entfernen(r.feld, k)" [attr.aria-label]="name(k) + ' entfernen'"><mat-icon>close</mat-icon></button></span>
          }
          <button type="button" class="neu" [class.warten]="wartet() === r.feld" (click)="aufnehmen(r.feld)">
            {{ wartet() === r.feld ? 'Jetzt aufs Pedal treten …' : '+ Taste' }}</button>
        </div>
      }
      <button type="button" class="link" (click)="standard()">Standard wiederherstellen</button>
    </div>
  `,
  styles: `
    .box { margin-top: 20px; padding: 20px 24px; border-radius: 12px; border: 1px solid var(--bn-line); }
    h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-family: var(--bn-wide); font-weight: 400; text-transform: uppercase; letter-spacing: .14em; font-size: .85rem; }
    .check { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 14px; font-size: .88rem; }
    .check input { flex: none; margin-top: 3px; accent-color: var(--bn-sunset); }
    .tasten { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 10px; font-size: .88rem; }
    .was { width: 100%; font-size: .72rem; color: var(--bn-fog); text-transform: uppercase; letter-spacing: .08em; }
    .taste { display: inline-flex; align-items: center; gap: 2px; padding: 2px 4px 2px 10px; border: 1px solid var(--bn-line); border-radius: 999px; }
    .taste button { display: grid; place-items: center; padding: 2px; border: 0; background: none; color: var(--bn-fog); cursor: pointer; }
    mat-icon { font-size: 16px; width: 16px; height: 16px; }
    h3 mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .neu { padding: 4px 12px; border: 1px dashed var(--bn-line); border-radius: 999px; background: none; color: var(--bn-ink); font: inherit; font-size: .85rem; cursor: pointer; }
    .neu.warten { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .link { padding: 0; border: 0; background: none; color: var(--bn-fog); font: inherit; font-size: .82rem; text-decoration: underline; cursor: pointer; }
  `,
})
export class BuehneEinstellungen implements OnDestroy {
  protected readonly halb = signal(halbseite());
  protected readonly t = signal<Tasten>(tasten());
  protected readonly wartet = signal<keyof Tasten | null>(null);
  protected readonly name = tastenName;
  protected readonly richtungen: { feld: keyof Tasten; label: string }[] = [
    { feld: 'weiter', label: 'Weiter (nächste Seite / nächster Song)' },
    { feld: 'zurueck', label: 'Zurück' },
  ];
  private hoeren?: (e: KeyboardEvent) => void;

  protected halbSetzen(an: boolean): void {
    this.halb.set(an);
    halbseiteSetzen(an);
  }

  private setzen(t: Tasten): void {
    this.t.set(t);
    tastenSetzen(t);
  }

  protected entfernen(feld: keyof Tasten, k: string): void {
    this.setzen({ ...this.t(), [feld]: this.t()[feld].filter((x) => x !== k) });
  }

  // nächste gedrückte Taste aufnehmen (Escape bricht ab); eine Taste gehört immer nur zu einer Richtung
  protected aufnehmen(feld: keyof Tasten): void {
    this.aufhoeren();
    this.wartet.set(feld);
    this.hoeren = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.aufhoeren();
      if (e.key === 'Escape' || ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      const andere: keyof Tasten = feld === 'weiter' ? 'zurueck' : 'weiter';
      const t = this.t();
      this.setzen({ [feld]: [...new Set([...t[feld], e.key])], [andere]: t[andere].filter((x) => x !== e.key) } as unknown as Tasten);
    };
    addEventListener('keydown', this.hoeren, { capture: true });
  }

  private aufhoeren(): void {
    if (this.hoeren) removeEventListener('keydown', this.hoeren, { capture: true });
    this.hoeren = undefined;
    this.wartet.set(null);
  }

  protected standard(): void {
    this.aufhoeren();
    this.t.set(STANDARD_TASTEN);
    tastenSetzen(null);
  }

  ngOnDestroy(): void {
    this.aufhoeren();
  }
}
