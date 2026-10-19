import { Component, ElementRef, signal, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export interface Hardware {
  kategorie: string;
  modell: string | null;
  beschreibung: string;
  details: string[][];
}

// Detail-Dialog für ein Gerät der Technik-Seite (natives <dialog>: Fokus, Esc und Hintergrund-Sperre
// übernimmt der Browser). Inhalte aus dem Abschnitt „hardware“ in src/app/data/technik.json.
@Component({
  selector: 'app-hardware-dialog',
  imports: [MatIconModule],
  template: `
    <dialog #dialog (close)="current.set(null)" (click)="backdrop($event)" aria-labelledby="hw-title">
      @if (current(); as c) {
        <div class="hw-body">
          <button type="button" class="close" (click)="close()" aria-label="Schließen"><mat-icon>close</mat-icon></button>
          <p class="hw-kicker">{{ c.hw.kategorie }}</p>
          <h3 id="hw-title">{{ c.hw.modell ?? c.hw.kategorie }}</h3>
          @if (!c.hw.modell) {
            <p class="hw-open"><mat-icon>edit_note</mat-icon> Genaues Modell folgt</p>
          }
          <p class="hw-text">{{ c.hw.beschreibung }}</p>
          @if (c.hw.details.length) {
            <dl class="hw-details">
              @for (d of c.hw.details; track d[0]) {
                <div><dt>{{ d[0] }}</dt><dd>{{ d[1] }}</dd></div>
              }
            </dl>
          }
          @if (c.wo.length) {
            <p class="hw-where"><mat-icon>place</mat-icon> Im Bühnenplan: {{ c.wo.join(', ') }}</p>
          }
        </div>
      }
    </dialog>
  `,
  styles: `
    dialog {
      width: min(560px, calc(100vw - 32px)); max-height: calc(100vh - 64px); padding: 0; border-radius: 14px;
      border: 1px solid var(--bn-line); background: #1b1e22; color: var(--bn-ink);
    }
    dialog::backdrop { background: rgba(10, 11, 13, .72); backdrop-filter: blur(2px); }
    .hw-body { position: relative; padding: 26px 26px 22px; }
    .close {
      position: absolute; top: 12px; right: 12px; display: grid; place-items: center; width: 36px; height: 36px;
      border-radius: 50%; border: 1px solid var(--bn-line); background: transparent; color: var(--bn-ink); cursor: pointer;
    }
    .close:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .hw-kicker { margin: 0 0 6px; font-family: var(--bn-wide); font-size: .7rem; letter-spacing: .16em; text-transform: uppercase; color: var(--bn-sunset); }
    dialog h3 { margin: 0 40px 12px 0; font-family: var(--bn-display); font-weight: 400; font-size: 1.25rem; letter-spacing: .04em; }
    .hw-open { display: flex; align-items: center; gap: 6px; margin: 0 0 12px; font-size: .85rem; color: var(--bn-fog); font-style: italic; }
    .hw-open mat-icon, .hw-where mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--bn-sunset); }
    .hw-text { margin: 0 0 16px; line-height: 1.65; color: rgba(236, 233, 228, .88); }
    .hw-details { margin: 0; border-top: 1px solid var(--bn-line); }
    .hw-details div { display: grid; grid-template-columns: 9em 1fr; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--bn-line); }
    .hw-details dt { font-family: var(--bn-wide); font-size: .68rem; letter-spacing: .12em; text-transform: uppercase; color: var(--bn-fog); padding-top: 3px; }
    .hw-details dd { margin: 0; line-height: 1.5; font-size: .92rem; }
    .hw-where { display: flex; align-items: center; gap: 6px; margin: 14px 0 0; font-size: .82rem; color: var(--bn-fog); }
    @media (max-width: 520px) { .hw-details div { grid-template-columns: 1fr; gap: 2px; } }
  `,
})
export class HardwareDialog {
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  protected readonly current = signal<{ hw: Hardware; wo: string[] } | null>(null);

  show(hw: Hardware, wo: string[]): void {
    this.current.set({ hw, wo });
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  // Klick auf den abgedunkelten Hintergrund schließt den Dialog
  protected backdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.close();
  }
}
