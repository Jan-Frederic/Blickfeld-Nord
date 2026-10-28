import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Mitschnitt, mitschnittLoeschen, mitschnittName, mitschnittSpeichern, mitschnitte } from '../data/mitschnitte';

// Proben-Mitschnitte im Dialog „Song bearbeiten“: Aufnehmen mit dem Mikrofon des Geräts (ohne Rauschunterdrückung,
// damit die Band nicht „weggefiltert“ wird), nachhören, teilen, löschen. Bleibt nur auf diesem Gerät (data/mitschnitte.ts).
interface Eintrag extends Mitschnitt {
  url: string;
}

@Component({
  selector: 'app-song-mitschnitte',
  imports: [MatIconModule],
  template: `
    <section class="mitschnitte" aria-label="Proben-Mitschnitte">
      <div class="kopf">
        <span class="label">Mitschnitte</span>
        @if (aufnahme()) {
          <button type="button" class="rec an" (click)="stopp()"><mat-icon>stop</mat-icon> Stopp · {{ zeit(sekunden()) }}</button>
        } @else {
          <button type="button" class="rec" (click)="start()"><mat-icon>fiber_manual_record</mat-icon> Aufnehmen</button>
        }
      </div>
      @if (fehler(); as f) { <p class="fehler" role="alert">{{ f }}</p> }
      @for (m of liste(); track m.id) {
        <div class="eintrag">
          <span class="wann">{{ datum(m.datum) }} · {{ zeit(m.dauer) }}</span>
          <audio controls preload="none" [src]="m.url"></audio>
          <button type="button" class="klein" (click)="teilen(m)" aria-label="Mitschnitt teilen"><mat-icon>share</mat-icon></button>
          <button type="button" class="klein" (click)="loeschen(m)" aria-label="Mitschnitt löschen"><mat-icon>delete</mat-icon></button>
        </div>
      } @empty {
        @if (!aufnahme()) { <p class="leer">Noch keine Aufnahme – in der Probe auf „Aufnehmen“ tippen, bleibt nur auf diesem Gerät.</p> }
      }
    </section>
  `,
  styles: `
    .mitschnitte { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--bn-line); }
    .kopf { display: flex; align-items: center; gap: 10px; }
    .label { font-size: .72rem; color: var(--bn-fog); text-transform: uppercase; letter-spacing: .08em; margin-right: auto; }
    button { display: inline-flex; align-items: center; gap: 4px; min-height: 36px; padding: 0 12px; border: 1px solid var(--bn-line); border-radius: 999px; background: none; color: var(--bn-ink); font: inherit; font-size: .85rem; cursor: pointer; }
    button:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .rec mat-icon { color: #e57373; }
    .rec.an { border-color: #e57373; color: #e57373; font-variant-numeric: tabular-nums; }
    .klein { padding: 0 8px; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .eintrag { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin-top: 8px; }
    .wann { font-size: .8rem; color: var(--bn-fog); min-width: 9em; }
    audio { flex: 1; min-width: 200px; height: 36px; }
    .leer, .fehler { margin: 8px 0 0; font-size: .82rem; color: var(--bn-fog); }
    .fehler { color: #e0b25a; }
  `,
})
export class SongMitschnitte {
  /** „Titel|Interpret“ */
  readonly songKey = input.required<string>();
  readonly titel = input.required<string>();

  protected readonly liste = signal<Eintrag[]>([]);
  protected readonly aufnahme = signal(false);
  protected readonly sekunden = signal(0);
  protected readonly fehler = signal('');
  private recorder: MediaRecorder | undefined;
  private stream: MediaStream | undefined;
  private uhr: ReturnType<typeof setInterval> | undefined;

  constructor() {
    effect(() => {
      const k = this.songKey();
      untracked(() => void this.laden(k));
    });
    inject(DestroyRef).onDestroy(() => {
      // Dialog geschlossen während der Aufnahme: noch speichern, dann Mikrofon freigeben
      if (this.recorder?.state === 'recording') this.recorder.stop();
      else this.mikroAus();
      this.freigeben(this.liste());
    });
  }

  private async laden(k: string): Promise<void> {
    try {
      const neu = (await mitschnitte(k)).map((m) => ({ ...m, url: URL.createObjectURL(m.daten) }));
      this.freigeben(this.liste());
      this.liste.set(neu);
    } catch {
      this.liste.set([]);
    }
  }

  private freigeben(l: Eintrag[]): void {
    for (const m of l) URL.revokeObjectURL(m.url);
  }

  protected async start(): Promise<void> {
    this.fehler.set('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.fehler.set('Aufnehmen geht in diesem Browser nicht.');
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch {
      this.fehler.set('Kein Zugriff aufs Mikrofon – in den Einstellungen des Browsers erlauben.');
      return;
    }
    const typ = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => MediaRecorder.isTypeSupported?.(t));
    const rec = new MediaRecorder(this.stream, typ ? { mimeType: typ } : undefined);
    const teile: Blob[] = [];
    const key = this.songKey();
    const beginn = Date.now();
    rec.ondataavailable = (e) => e.data.size && teile.push(e.data);
    rec.onstop = async () => {
      this.mikroAus();
      const dauer = Math.round((Date.now() - beginn) / 1000);
      if (!teile.length) return;
      try {
        await mitschnittSpeichern(key, new Blob(teile, { type: rec.mimeType || teile[0].type }), dauer);
        if (this.songKey() === key) await this.laden(key);
      } catch {
        this.fehler.set('Die Aufnahme ließ sich nicht speichern (Speicher voll?).');
      }
    };
    rec.start(1000);
    this.recorder = rec;
    this.aufnahme.set(true);
    this.sekunden.set(0);
    this.uhr = setInterval(() => this.sekunden.set(Math.round((Date.now() - beginn) / 1000)), 500);
  }

  protected stopp(): void {
    this.recorder?.stop();
  }

  private mikroAus(): void {
    clearInterval(this.uhr);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
    this.recorder = undefined;
    this.aufnahme.set(false);
  }

  protected async teilen(m: Eintrag): Promise<void> {
    const datei = new File([m.daten], mitschnittName(m, this.titel()), { type: m.daten.type });
    if (navigator.canShare?.({ files: [datei] })) {
      navigator.share({ files: [datei], title: this.titel() }).catch(() => undefined);
      return;
    }
    const a = document.createElement('a');
    a.href = m.url;
    a.download = datei.name;
    a.click();
  }

  protected async loeschen(m: Eintrag): Promise<void> {
    if (!confirm(`Mitschnitt vom ${this.datum(m.datum)} löschen?`)) return;
    await mitschnittLoeschen(m.id);
    URL.revokeObjectURL(m.url);
    this.liste.update((l) => l.filter((x) => x.id !== m.id));
  }

  protected zeit(sek: number): string {
    return `${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, '0')}`;
  }
  protected datum(iso: string): string {
    return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
}
