import { Component, DestroyRef, inject, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Ton, tonVon, tonhoehe } from '../data/stimmung';

// Stimmgerät über das Mikrofon (im Bühnen-Modus und auf der Probenseite): großer Tonname, Nadel für die Abweichung
// in Cent, grün bei ±5 Cent. Ohne Rauschunterdrückung, damit der Ton unverfälscht ankommt; misst etwa zehnmal pro Sekunde.
@Component({
  selector: 'app-stimmgeraet',
  imports: [MatIconModule],
  template: `
    <div class="stimm" role="group" aria-label="Stimmgerät">
      <div class="kopf">
        <span>Stimmgerät · a′ = 440 Hz</span>
        <button type="button" class="zu" (click)="zu($event)" aria-label="Stimmgerät schließen"><mat-icon>close</mat-icon></button>
      </div>
      @if (fehler(); as f) {
        <p class="hinweis">{{ f }}</p>
      } @else if (ton(); as t) {
        <p class="ton" [class.ok]="abs(t.cent) <= 5" aria-live="polite">{{ t.name }}<small>{{ t.oktave }}</small></p>
        <div class="skala" aria-hidden="true"><span class="mitte"></span><span class="nadel" [style.left.%]="50 + t.cent"></span></div>
        <p class="cent">{{ t.cent > 0 ? '+' : '' }}{{ t.cent }} Cent · {{ hz() }} Hz</p>
      } @else {
        <p class="hinweis">{{ laeuft() ? 'Ton anspielen …' : 'Mikrofon wird gestartet …' }}</p>
      }
    </div>
  `,
  styles: `
    .stimm { padding: 16px 20px; border-radius: 14px; background: #111; color: #fff; text-align: center; }
    .kopf { display: flex; align-items: center; justify-content: space-between; color: #9aa0a6; font-size: .85rem; }
    .zu { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; border: 1px solid #333; background: none; color: #fff; cursor: pointer; }
    .ton { margin: 8px 0 4px; font: 700 clamp(4rem, 18vw, 7rem) / 1 Inter, sans-serif; color: #e8a46a; }
    .ton small { font-size: .3em; color: #9aa0a6; margin-left: .1em; }
    .ton.ok { color: #5fb88a; }
    .skala { position: relative; height: 14px; margin: 10px auto; max-width: 420px; border-radius: 7px; background: linear-gradient(90deg, #e07a5a, #333 40%, #5fb88a 50%, #333 60%, #e07a5a); }
    .mitte { position: absolute; left: 50%; top: -4px; bottom: -4px; width: 2px; background: #fff; }
    .nadel { position: absolute; top: -6px; width: 6px; height: 26px; margin-left: -3px; border-radius: 3px; background: #fff; transition: left .1s; }
    .cent, .hinweis { color: #9aa0a6; font-size: .95rem; }
  `,
})
export class Stimmgeraet {
  readonly schliessen = output<void>();
  protected readonly ton = signal<Ton | null>(null);
  protected readonly hz = signal('');
  protected readonly fehler = signal('');
  protected readonly laeuft = signal(false);
  protected readonly abs = Math.abs;
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
    analyse.fftSize = 4096;
    this.kontext.createMediaStreamSource(this.stream).connect(analyse);
    const puffer = new Float32Array(analyse.fftSize);
    this.laeuft.set(true);
    let ruhig = 0;
    this.timer = setInterval(() => {
      analyse.getFloatTimeDomainData(puffer);
      const f = tonhoehe(puffer, this.kontext!.sampleRate);
      if (f) {
        ruhig = 0;
        this.ton.set(tonVon(f));
        this.hz.set(f.toFixed(1));
      } else if (++ruhig > 15) this.ton.set(null);
    }, 100);
  }

  private stoppen(): void {
    clearInterval(this.timer);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.kontext?.close().catch(() => undefined);
  }

  protected zu(e: Event): void {
    e.stopPropagation();
    this.schliessen.emit();
  }
}
