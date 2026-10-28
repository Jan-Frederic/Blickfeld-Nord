import { Component, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Entry, isPause } from '../data/setlist-data';
import { notenDatei, notenDateien, pdfName, pdfjsVorladen, songNoten } from '../data/noten';
import { fassungWaehlen, hatBevorzugte, ladeWahl, pdfId } from '../data/noten-wahl';
import { pdfOeffnen } from '../data/pdf';
import { Fortschritt, Stand } from './fortschritt';

// Setlist → „Auftritt vorbereiten“: für jeden Song der Setlist prüfen, ob auf diesem Gerät Noten in der Fassung
// liegen, die der Bühnen-Modus zeigen würde (eigene Wahl bzw. Vorliebe wie „Bass“), ob die PDF sich öffnen lässt
// und der Seitenbereich passt – und alles für unterwegs ohne Netz vorladen (pdf.js, Service Worker).
interface Ergebnis {
  titel: string;
  stufe: 'ok' | 'hinweis' | 'fehlt';
  text: string;
}

@Component({
  selector: 'app-auftritt-vorbereiten',
  imports: [MatIconModule, Fortschritt],
  template: `
    <div class="box">
      <button type="button" (click)="pruefen()" [disabled]="laeuft() || !songs().length"><mat-icon>task_alt</mat-icon> Auftritt vorbereiten</button>
      <span class="klein">prüft die Noten jedes Songs in deiner Fassung{{ vorliebe() ? ' („' + vorliebe() + '“)' : '' }} und lädt alles für unterwegs</span>
      @if (stand(); as s) { <app-fortschritt [stand]="s" /> }
      @if (ergebnis(); as e) {
        <p class="summe" role="status">{{ zusammenfassung() }}</p>
        <ul>
          @for (x of e; track $index) {
            <li [class]="x.stufe"><mat-icon>{{ symbol[x.stufe] }}</mat-icon>
              <span><b>{{ x.titel }}</b> <small>{{ x.text }}</small></span></li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .box { margin: 12px 0 0; }
    .klein { margin-left: 10px; font-size: .8rem; color: var(--bn-fog); }
    button { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; font-size: .88rem; cursor: pointer; }
    button:hover:not(:disabled) { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    button:disabled { opacity: .4; cursor: default; }
    mat-icon { flex: none; font-size: 18px; width: 18px; height: 18px; }
    .summe { margin: 12px 0 6px; font-size: .9rem; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; font-size: .88rem; }
    li { display: flex; align-items: flex-start; gap: 8px; overflow-wrap: anywhere; }
    li.ok mat-icon { color: #5fb88a; }
    li.hinweis mat-icon { color: #e8a46a; }
    li.fehlt mat-icon { color: #e07a5a; }
    small { color: var(--bn-fog); }
  `,
})
export class AuftrittVorbereiten {
  readonly entries = input.required<Entry[]>();
  protected readonly laeuft = signal(false);
  protected readonly stand = signal<Stand | null>(null);
  protected readonly ergebnis = signal<Ergebnis[] | null>(null);
  protected readonly zusammenfassung = signal('');
  protected readonly vorliebe = signal(this.vorliebeText());
  protected readonly symbol: Record<Ergebnis['stufe'], string> = { ok: 'check_circle', hinweis: 'info', fehlt: 'warning' };

  protected songs() {
    const gesehen = new Set<string>();
    return this.entries()
      .filter((e) => !isPause(e))
      .map((e) => e as { title: string; artist: string })
      .filter((s) => !gesehen.has(`${s.title}|${s.artist}`) && gesehen.add(`${s.title}|${s.artist}`));
  }

  private vorliebeText(): string {
    const w = ladeWahl();
    return w.art === 'akkorde' ? 'Akkorde' : (w.name ?? '');
  }

  protected async pruefen(): Promise<void> {
    this.laeuft.set(true);
    this.ergebnis.set(null);
    const w = ladeWahl();
    this.vorliebe.set(this.vorliebeText());
    const songs = this.songs();
    const out: Ergebnis[] = [];
    try {
      const vorhanden = new Set((await notenDateien()).map((d) => d.id));
      for (const [i, s] of songs.entries()) {
        const key = `${s.title}|${s.artist}`;
        this.stand.set({ text: `Prüfen: ${s.title}`, fertig: i, gesamt: songs.length });
        out.push(await this.song(s.title, key, vorhanden, w));
      }
      // für unterwegs: pdf.js laden (der Service Worker merkt es sich)
      this.stand.set({ text: 'Für unterwegs vorladen …' });
      pdfjsVorladen();
      const offline = !!navigator.serviceWorker?.controller;
      const ok = out.filter((x) => x.stufe === 'ok').length;
      const hinweis = out.filter((x) => x.stufe === 'hinweis').length;
      const fehlt = out.length - ok - hinweis;
      this.zusammenfassung.set(
        [`${ok + hinweis} von ${out.length} Songs mit Noten`, hinweis && `${hinweis} ${hinweis === 1 ? 'Hinweis' : 'Hinweise'}`, fehlt && `${fehlt} ohne Noten`].filter(Boolean).join(' · ') +
          (offline ? ' · auch ohne Netz bereit' : ' · für ohne Netz die Seite einmal mit Netz neu laden'),
      );
      this.ergebnis.set(out);
    } finally {
      this.stand.set(null);
      this.laeuft.set(false);
    }
  }

  private async song(titel: string, key: string, vorhanden: Set<string>, w: ReturnType<typeof ladeWahl>): Promise<Ergebnis> {
    const n = await songNoten(key);
    if (!n || (!n.pdfs?.length && !n.chordpro)) return { titel, stufe: 'fehlt', text: 'keine Noten auf diesem Gerät' };
    const id = fassungWaehlen(n, key, w);
    const fehltVorliebe = hatBevorzugte(n, w) === false;
    const hinweis = fehltVorliebe ? ` – keine Fassung „${w.art === 'akkorde' ? 'Akkorde' : w.name}“` : '';
    if (id === 'akkorde') return { titel, stufe: fehltVorliebe ? 'hinweis' : 'ok', text: `Akkorde${hinweis}` };
    const pdfs = n.pdfs ?? [];
    const i = pdfs.findIndex((p) => pdfId(p) === id);
    const p = pdfs[i];
    const name = `PDF „${pdfName(p, i, pdfs)}“`;
    if (!vorhanden.has(p.datei)) return { titel, stufe: 'fehlt', text: `${name}: Datei fehlt auf diesem Gerät` };
    try {
      const datei = await notenDatei(p.datei);
      const doc = await pdfOeffnen(datei!.daten);
      const seiten = doc.numPages;
      await doc.destroy();
      if ((p.von ?? 1) > seiten || (p.bis ?? 1) > seiten) return { titel, stufe: 'hinweis', text: `${name}: Seitenbereich passt nicht (die PDF hat ${seiten} Seiten)` };
      const bereich = p.von || p.bis ? `, S. ${p.von ?? 1}–${p.bis ?? seiten}` : `, ${seiten} ${seiten === 1 ? 'Seite' : 'Seiten'}`;
      return { titel, stufe: fehltVorliebe ? 'hinweis' : 'ok', text: name + bereich + hinweis };
    } catch (e) {
      return { titel, stufe: 'fehlt', text: `${name}: lässt sich nicht öffnen (${(e as Error).message || 'beschädigt?'})` };
    }
  }
}
