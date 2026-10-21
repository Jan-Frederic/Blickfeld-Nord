import { Component, computed, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { I18n, tr } from '../i18n';

const TEXT = tr(
  {
    hint: 'Neue Termine erscheinen automatisch in eurem Kalender',
    subscribe: 'Kalender abonnieren',
    copyHint: 'Adresse zum Einfügen in Outlook oder andere Kalender-Apps',
    copied: 'Adresse kopiert ✓',
    google: 'Google Kalender',
    copy: 'Adresse kopieren',
    download: 'einmalig herunterladen',
    prompt: 'Kalender-Adresse kopieren:',
    outlook: 'Outlook zeigt abonnierte Termine nur bis ein Jahr im Voraus – spätere erscheinen automatisch, sobald sie näher rücken.',
  },
  {
    hint: 'New dates appear in your calendar automatically',
    subscribe: 'Subscribe to calendar',
    copyHint: 'Address to paste into Outlook or other calendar apps',
    copied: 'Address copied ✓',
    google: 'Google Calendar',
    copy: 'Copy address',
    download: 'download once',
    prompt: 'Copy calendar address:',
    outlook: 'Outlook only shows subscribed dates up to one year ahead – later ones appear automatically as they get closer.',
  },
  {
    hint: 'Nieuwe data verschijnen automatisch in je agenda',
    subscribe: 'Agenda abonneren',
    copyHint: 'Adres om in Outlook of andere agenda-apps te plakken',
    copied: 'Adres gekopieerd ✓',
    google: 'Google Agenda',
    copy: 'Adres kopiëren',
    download: 'eenmalig downloaden',
    prompt: 'Agenda-adres kopiëren:',
    outlook: 'Outlook toont geabonneerde data maar tot een jaar vooruit – latere verschijnen vanzelf zodra ze dichterbij komen.',
  },
);

// „Kalender abonnieren“ für eine beim Build erzeugte .ics-Datei (scripts/seo.mjs).
// Android kennt kein webcal:// – dort öffnet der Button direkt das Abo in Google Kalender.
// Das neue Outlook für Windows verstümmelt webcal://-Links – dafür gibt es „Adresse kopieren“ (https).
// Microsoft 365 übernimmt aus Abos nur Termine bis etwa ein Jahr im Voraus – darauf weist die letzte Zeile hin.
@Component({
  selector: 'app-abo-button',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <a mat-flat-button [href]="android ? google() : webcal()" [attr.target]="android ? '_blank' : null" rel="noopener"
       [title]="t().hint">
      <mat-icon>event_repeat</mat-icon> {{ t().subscribe }}
    </a>
    <span class="alt">
      @if (!android) { <a [href]="google()" target="_blank" rel="noopener">{{ t().google }}</a> · }
      <!-- für Outlook & Co.: „Aus dem Internet abonnieren“ braucht die https-Adresse -->
      <button type="button" (click)="copy()" [title]="t().copyHint">{{ copied() ? t().copied : t().copy }}</button> ·
      <button type="button" (click)="download.emit()">{{ t().download }}</button>
    </span>
    <span class="note">{{ t().outlook }}</span>
  `,
  styles: `
    :host { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
    .alt { font-size: .8rem; color: var(--bn-fog); }
    .note { max-width: 34em; font-size: .72rem; line-height: 1.4; color: var(--bn-fog); text-align: right; }
    .alt a, .alt button { color: inherit; font: inherit; padding: 0; border: 0; background: none; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
    .alt a:hover, .alt button:hover { color: var(--bn-sunset); }
    @media (max-width: 640px) { :host { align-items: flex-start; } .note { text-align: left; } }
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
  protected readonly t = inject(I18n).t(TEXT);
  protected readonly google = computed(() => `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(this.webcal())}`);

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.https());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
    } catch {
      window.prompt(this.t().prompt, this.https());
    }
  }
}
