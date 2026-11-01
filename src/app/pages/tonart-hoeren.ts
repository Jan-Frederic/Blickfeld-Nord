import { Component, DestroyRef, inject, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TonartTreffer, chromaAddieren, sicherheit, tonartAusChroma } from '../data/tonart-erkennung';

// Song-Dialog → „Tonart hören“: 15–20 Sekunden den Song (oder die Akkordfolge) spielen, das Mikrofon sammelt die
// Töne und schlägt die Tonart vor (Logik: data/tonart-erkennung.ts). Übernehmen setzt „Original“.
@Component({
  selector: 'app-tonart-hoeren',
  imports: [MatIconModule],
  template: `
    <div class="hoeren" role="group" aria-label="Tonart hören">
      @if (fehler(); as f) {
        <p>{{ f }}</p>
      } @else if (treffer(); as t) {
        <p class="vorschlag" aria-live="polite">
          <strong>{{ t[0].tonart }}</strong>
          <span class="a">{{ stufe() === 'sicher' ? 'ziemlich sicher' : stufe() === 'eher' ? 'oder ' + t[1].tonart : 'noch unsicher – weiterspielen' }} · {{ sekunden() }} s</span>
        </p>
        <button type="button" (click)="uebernehmen.emit(t[0].tonart); stoppen()" [disabled]="stufe() === 'unsicher'"><mat-icon>check</mat-icon> {{ t[0].tonart }} übernehmen</button>
        @if (stufe() === 'eher') { <button type="button" (click)="uebernehmen.emit(t[1].tonart); stoppen()">{{ t[1].tonart }} übernehmen</button> }
      } @else {
        <p>{{ laeuft() ? 'Song oder Akkordfolge spielen …' : 'Mikrofon wird gestartet …' }}</p>
      }
      <button type="button" class="zu" (click)="stoppen(); fertig.emit()" aria-label="Tonart hören beenden"><mat-icon>close</mat-icon></button>
    </div>
  `,
})
export class TonartHoeren {
  readonly uebernehmen = output<string>();
  readonly fertig = output<void>();
  protected readonly treffer = signal<TonartTreffer[] | null>(null);
  protected readonly stufe = signal<'sicher' | 'eher' | 'unsicher'>('unsicher');
  protected readonly sekunden = signal(0);
  protected readonly fehler = signal('');
  protected readonly laeuft = signal(false);
  private stream: MediaStream | undefined;
  private kontext: AudioContext | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    void this.starten();
    inject(DestroyRef).onDestroy(() => this.stoppen());
  }

  private async starten(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch {
      this.fehler.set('Kein Zugriff aufs Mikrofon – in den Einstellungen des Browsers erlauben.');
      return;
    }
    this.kontext = new AudioContext();
    const analyse = this.kontext.createAnalyser();
    analyse.fftSize = 8192;
    this.kontext.createMediaStreamSource(this.stream).connect(analyse);
    const spektrum = new Float32Array(analyse.frequencyBinCount);
    const chroma = Array(12).fill(0);
    this.laeuft.set(true);
    let n = 0;
    this.timer = setInterval(() => {
      analyse.getFloatFrequencyData(spektrum);
      chromaAddieren(chroma, spektrum, this.kontext!.sampleRate);
      if (++n % 5) return;
      this.sekunden.set(Math.round(n / 5));
      if (chroma.some((x) => x > 0)) {
        const t = tonartAusChroma(chroma);
        this.treffer.set(t);
        // erst nach ein paar Sekunden als „sicher“ werten
        this.stufe.set(n < 40 ? 'unsicher' : sicherheit(t));
      }
    }, 200);
  }

  stoppen(): void {
    clearInterval(this.timer);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.kontext?.close().catch(() => undefined);
    this.laeuft.set(false);
  }
}
