import { Component, ElementRef, afterNextRender, computed, input, output, signal, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

// Einen gespeicherten Eintrag (Abgleich → Daten auf diesem Gerät) ansehen und von Hand ändern: der Wert als
// eingerücktes JSON; gespeichert wird nur gültiges JSON. Für Notfälle – normal ändert man auf der Seite des Bereichs.
@Component({
  selector: 'app-daten-editor',
  imports: [MatIconModule],
  template: `
    <dialog #dialog (close)="zu.emit()" aria-labelledby="daten-editor-titel">
      <h3 id="daten-editor-titel">{{ titel() }}</h3>
      <p class="key">{{ schluessel() }}</p>
      <label><span class="sr">Inhalt</span>
        <textarea rows="16" spellcheck="false" [value]="text()" (input)="text.set($any($event.target).value)"></textarea>
      </label>
      @if (fehler(); as f) { <p class="fehler" role="alert">{{ f }}</p> }
      <footer>
        <button type="button" (click)="kopieren()"><mat-icon>content_copy</mat-icon> {{ kopiert() ? 'Kopiert ✓' : 'Kopieren' }}</button>
        <button type="button" (click)="schliessen()">Abbrechen</button>
        <button type="button" class="primaer" [disabled]="!!fehler() || text() === start" (click)="sichern()"><mat-icon>save</mat-icon> Speichern</button>
      </footer>
    </dialog>
  `,
  styles: `
    dialog { width: min(720px, calc(100vw - 24px)); box-sizing: border-box; padding: 18px 20px; border: 1px solid var(--bn-line); border-radius: 14px; background: #15171a; color: var(--bn-ink); }
    dialog::backdrop { background: rgba(0, 0, 0, .6); }
    h3 { margin: 0; font-size: 1.05rem; overflow-wrap: anywhere; }
    .key { margin: 2px 0 10px; color: var(--bn-fog); font: .78rem ui-monospace, monospace; overflow-wrap: anywhere; }
    textarea { width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid var(--bn-line); border-radius: 8px; background: #1b1e22; color: var(--bn-ink); font: .82rem/1.4 ui-monospace, monospace; }
    .fehler { margin: 6px 0 0; color: #e07a5a; font-size: .85rem; }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    footer { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin-top: 12px; }
    button { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; font-size: .86rem; cursor: pointer; }
    button:hover:not(:disabled) { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    button:disabled { opacity: .4; cursor: default; }
    button.primaer { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `,
})
export class DatenEditor {
  readonly schluessel = input.required<string>();
  readonly titel = input.required<string>();
  readonly gespeichert = output<void>();
  readonly zu = output<void>();
  protected readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  protected start = '';
  /** Wert war einfacher Text (kein JSON) – so auch wieder speichern */
  private roh = false;
  protected readonly text = signal('');
  protected readonly kopiert = signal(false);
  protected readonly fehler = computed(() => {
    try {
      JSON.parse(this.text());
      return '';
    } catch (e) {
      return `Kein gültiges JSON: ${(e as Error).message}`;
    }
  });

  constructor() {
    afterNextRender(() => {
      const roh = localStorage.getItem(this.schluessel()) ?? '';
      try {
        this.start = JSON.stringify(JSON.parse(roh), null, 2);
      } catch {
        this.roh = true;
        this.start = JSON.stringify(roh);
      }
      this.text.set(this.start);
      this.dialog().nativeElement.showModal();
    });
  }

  protected schliessen(): void {
    this.dialog().nativeElement.close();
  }

  protected sichern(): void {
    const wert = JSON.parse(this.text());
    localStorage.setItem(this.schluessel(), this.roh && typeof wert === 'string' ? wert : JSON.stringify(wert));
    this.gespeichert.emit();
    this.dialog().nativeElement.close();
  }

  protected async kopieren(): Promise<void> {
    await navigator.clipboard?.writeText(this.text()).catch(() => undefined);
    this.kopiert.set(true);
  }
}
