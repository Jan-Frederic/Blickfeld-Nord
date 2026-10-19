import { Component, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// „Kalender abonnieren“ für eine beim Build erzeugte .ics-Datei (scripts/seo.mjs).
// Android kennt kein webcal:// – dort öffnet der Button direkt das Abo in Google Kalender.
// Das neue Outlook für Windows verstümmelt webcal://-Links – dafür gibt es „Adresse kopieren“ (https).
@Component({
  selector: 'app-abo-button',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <a mat-flat-button [href]="android ? google() : webcal()" [attr.target]="android ? '_blank' : null" rel="noopener"
       title="Neue Termine erscheinen automatisch in eurem Kalender">
      <mat-icon>event_repeat</mat-icon> Kalender abonnieren
    </a>
    <span class="alt">
      @if (!android) { <a [href]="google()" target="_blank" rel="noopener">Google Kalender</a> · }
      <!-- für Outlook & Co.: „Aus dem Internet abonnieren“ braucht die https-Adresse -->
      <button type="button" (click)="copy()" title="Adresse zum Einfügen in Outlook oder andere Kalender-Apps">{{ copied() ? 'Adresse kopiert ✓' : 'Adresse kopieren' }}</button> ·
      <button type="button" (click)="download.emit()">einmalig herunterladen</button>
    </span>
  `,
  styles: `
    :host { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
    .alt { font-size: .8rem; color: var(--bn-fog); }
    .alt a, .alt button { color: inherit; font: inherit; padding: 0; border: 0; background: none; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
    .alt a:hover, .alt button:hover { color: var(--bn-sunset); }
    @media (max-width: 640px) { :host { align-items: flex-start; } }
  `,
})
export class AboButton {
  /** Pfad der Kalenderdatei auf der Website, z. B. 'konzerte.ics' */
  readonly path = input.required<string>();
  /** „einmalig herunterladen“ */
  readonly download = output<void>();

  protected readonly android = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  protected readonly webcal = computed(() => `webcal://blickfeld-nord.de/${this.path()}`);
  protected readonly https = computed(() => `https://blickfeld-nord.de/${this.path()}`);
  protected readonly copied = signal(false);
  protected readonly google = computed(() => `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(this.webcal())}`);

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.https());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
    } catch {
      window.prompt('Kalender-Adresse kopieren:', this.https());
    }
  }
}
