import { Component, computed, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NOTEN_APP, notenDateien, notenExportieren, notenImportieren } from '../data/noten';
import { istAkkordblatt, istPdf, notenEinlesen, notenErgebnisText } from '../data/noten-import';
import { OneDriveDatei, oneDriveAbmelden, oneDriveAnmelden, oneDriveDateien, oneDriveEingerichtet, oneDriveKonto, oneDriveLaden, oneDriveSpeichern } from '../data/onedrive';
import { APP, backstageDatei, backstageImportieren, gesichert } from './backstage-sync';

// Backstage → Abgleich → OneDrive: alle Daten aus einem OneDrive-Ordner einlesen – Backstage-Dateien (Setlists,
// Packlisten …), Notenpakete, PDFs und Akkordblätter (auch in Unterordnern, Zuordnung über den Dateinamen) – und den
// Stand dieses Geräts dort sichern. Anmeldung über die vorhandene Microsoft-Anmeldung im Browser (siehe data/onedrive.ts).
const ORDNER_KEY = 'bn-onedrive-ordner';

interface Fund extends OneDriveDatei {
  art: 'backstage' | 'noten' | 'pdf' | 'akkordblatt';
  text?: string;
}

@Component({
  selector: 'app-backstage-onedrive',
  imports: [MatIconModule],
  template: `
    <div class="box">
      <h3><mat-icon>cloud</mat-icon> OneDrive</h3>
      @if (!eingerichtet) {
        <p>OneDrive ist noch nicht eingerichtet – dafür braucht es einmal eine App-Registrierung bei Microsoft
          (Anleitung in PFLEGE.md unter „OneDrive einrichten“).</p>
      } @else {
        @if (konto(); as k) {
          <p class="konto"><mat-icon>verified_user</mat-icon> Verbunden als {{ k }}
            <button type="button" class="link" (click)="abmelden()">trennen</button></p>
          <label class="ordner">Ordner im OneDrive
            <input [value]="ordner()" (change)="ordnerSetzen($any($event.target).value)" placeholder="z. B. Blickfeld Nord" />
          </label>
          <div class="knoepfe">
            <button type="button" (click)="durchsuchen()" [disabled]="laeuft()"><mat-icon>travel_explore</mat-icon> Ordner durchsuchen</button>
            <button type="button" (click)="sichern()" [disabled]="laeuft()"><mat-icon>cloud_upload</mat-icon> Stand dort sichern</button>
            <label class="check"><input type="checkbox" [checked]="mitNoten()" (change)="mitNoten.set($any($event.target).checked)" /> mit Notenblättern</label>
          </div>
          @if (funde(); as f) {
            <div class="funde">
              @if (!f.length) { <p>Im Ordner „{{ ordner() }}“ ist nichts, was sich einlesen ließe (Backstage-Dateien, Notenpakete, PDFs, .pro).</p> }
              @for (d of backstageFunde(); track d.id) {
                <label class="check"><input type="checkbox" [checked]="gewaehlt().has(d.id)" (change)="waehlen(d.id)" /> Backstage · {{ d.pfad }} <small>{{ datum(d.geaendert) }}</small></label>
              }
              @for (d of notenpakete(); track d.id) {
                <label class="check"><input type="checkbox" [checked]="gewaehlt().has(d.id)" (change)="waehlen(d.id)" /> Notenpaket · {{ d.pfad }} <small>{{ datum(d.geaendert) }}</small></label>
              }
              @if (notenFunde().length) {
                <label class="check"><input type="checkbox" [checked]="notenAn()" (change)="notenAn.set($any($event.target).checked)" /> {{ notenText() }}</label>
              }
              @if (f.length) {
                @if (backstageFunde().length) {
                  <label class="check"><input type="checkbox" [checked]="ersetzen()" (change)="ersetzen.set($any($event.target).checked)" /> Backstage-Daten ersetzen statt ergänzen</label>
                }
                <button type="button" class="primaer" (click)="einlesen()" [disabled]="laeuft() || !auswahlZahl()"><mat-icon>cloud_download</mat-icon> Einlesen</button>
              }
            </div>
          }
        } @else {
          <p>Setlists, Packlisten, Noten (PDF, .pro) und Sicherungen aus einem OneDrive-Ordner einlesen und den Stand dort
            sichern. Ist der Browser schon bei Microsoft angemeldet, geht es ohne Passwort.</p>
          <button type="button" class="primaer" (click)="verbinden()" [disabled]="laeuft()"><mat-icon>login</mat-icon> Mit OneDrive verbinden</button>
        }
      }
      @if (meldung(); as m) { <p class="meldung" [class.fehler]="m.fehler" role="status">{{ m.text }}</p> }
    </div>
  `,
  styles: `
    .box { margin-top: 20px; padding: 20px 24px; border-radius: 12px; border: 1px solid var(--bn-line); }
    h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; font-family: var(--bn-wide); font-weight: 400; text-transform: uppercase; letter-spacing: .14em; font-size: .85rem; }
    p { margin: 0 0 12px; max-width: 720px; font-size: .88rem; line-height: 1.55; color: var(--bn-fog); }
    .konto { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; color: #5fb88a; overflow-wrap: anywhere; }
    .ordner { display: grid; gap: 4px; max-width: 420px; margin-bottom: 12px; font-size: .72rem; color: var(--bn-fog); text-transform: uppercase; letter-spacing: .08em; }
    .ordner input { padding: 8px 10px; border: 1px solid var(--bn-line); border-radius: 8px; background: #1b1e22; color: var(--bn-ink); font: inherit; font-size: .9rem; text-transform: none; letter-spacing: 0; }
    .knoepfe { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
    .funde { display: grid; gap: 8px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--bn-line); justify-items: start; }
    .check { display: inline-flex; align-items: center; gap: 8px; font-size: .88rem; overflow-wrap: anywhere; }
    .check input { flex: none; accent-color: var(--bn-sunset); }
    small { color: var(--bn-fog); }
    button { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; font-size: .86rem; cursor: pointer; }
    button:hover:not(:disabled) { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    button:disabled { opacity: .4; cursor: default; }
    button.primaer { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    button.link { padding: 0 4px; border: 0; color: var(--bn-fog); text-decoration: underline; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .meldung { margin: 12px 0 0; color: #5fb88a; }
    .meldung.fehler { color: #e07a5a; }
  `,
})
export class BackstageOnedrive {
  readonly geaendert = output<void>();
  protected readonly eingerichtet = oneDriveEingerichtet();
  protected readonly konto = signal<string | null>(null);
  protected readonly ordner = signal(lade(ORDNER_KEY) || 'Blickfeld Nord');
  protected readonly laeuft = signal(false);
  protected readonly meldung = signal<{ text: string; fehler?: boolean } | null>(null);
  protected readonly mitNoten = signal(false);
  protected readonly ersetzen = signal(false);
  protected readonly funde = signal<Fund[] | null>(null);
  protected readonly gewaehlt = signal(new Set<string>());
  protected readonly notenAn = signal(true);

  protected readonly backstageFunde = computed(() => (this.funde() ?? []).filter((d) => d.art === 'backstage'));
  protected readonly notenpakete = computed(() => (this.funde() ?? []).filter((d) => d.art === 'noten'));
  protected readonly notenFunde = computed(() => (this.funde() ?? []).filter((d) => d.art === 'pdf' || d.art === 'akkordblatt'));
  protected readonly notenText = computed(() => {
    const pdfs = this.notenFunde().filter((d) => d.art === 'pdf').length;
    const pro = this.notenFunde().length - pdfs;
    return [pdfs && `${pdfs} ${pdfs === 1 ? 'PDF' : 'PDFs'}`, pro && `${pro} ${pro === 1 ? 'Akkordblatt' : 'Akkordblätter'}`].filter(Boolean).join(' und ') + ' (Zuordnung über den Dateinamen)';
  });
  protected readonly auswahlZahl = computed(() => this.gewaehlt().size + (this.notenAn() ? this.notenFunde().length : 0));

  constructor() {
    if (!this.eingerichtet) return;
    // schon einmal verbunden → Konto aus dem Speicher; sonst still über die Microsoft-Anmeldung im Browser versuchen
    oneDriveKonto()
      .then((k) => k ?? (lade(ORDNER_KEY) ? oneDriveAnmelden(true) : null))
      .then((k) => this.konto.set(k?.username ?? null))
      .catch(() => undefined);
  }

  protected datum(iso: string): string {
    return iso ? new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  }

  protected ordnerSetzen(wert: string): void {
    this.ordner.set(wert.trim().replace(/^\/+|\/+$/g, ''));
    this.funde.set(null);
    speichere(ORDNER_KEY, this.ordner());
  }

  protected waehlen(id: string): void {
    this.gewaehlt.update((g) => {
      const neu = new Set(g);
      if (!neu.delete(id)) neu.add(id);
      return neu;
    });
  }

  private async tun(arbeit: () => Promise<void>): Promise<void> {
    this.laeuft.set(true);
    try {
      await arbeit();
    } catch (e) {
      const text = (e as Error).message;
      this.meldung.set({ text: text === 'nicht gefunden' ? `Den Ordner „${this.ordner()}“ gibt es in deinem OneDrive nicht.` : `OneDrive: ${text || 'unbekannter Fehler'}`, fehler: true });
    } finally {
      this.laeuft.set(false);
    }
  }

  protected verbinden(): Promise<void> {
    return this.tun(async () => {
      const k = await oneDriveAnmelden();
      this.konto.set(k?.username ?? null);
      speichere(ORDNER_KEY, this.ordner());
      this.meldung.set(k ? { text: 'Verbunden ✓' } : null);
    });
  }

  protected abmelden(): Promise<void> {
    return this.tun(async () => {
      await oneDriveAbmelden();
      this.konto.set(null);
      this.funde.set(null);
      this.meldung.set({ text: 'Getrennt – die Microsoft-Anmeldung im Browser bleibt bestehen.' });
    });
  }

  // Ordner durchsuchen: JSON-Dateien kurz laden, um Backstage-Dateien und Notenpakete zu erkennen
  protected durchsuchen(): Promise<void> {
    return this.tun(async () => {
      this.meldung.set({ text: `„${this.ordner()}“ wird durchsucht …` });
      const funde: Fund[] = [];
      for (const d of await oneDriveDateien(this.ordner())) {
        if (istPdf(d.name)) funde.push({ ...d, art: 'pdf' });
        else if (istAkkordblatt(d.name)) funde.push({ ...d, art: 'akkordblatt' });
        else if (d.name.toLowerCase().endsWith('.json') && d.groesse < 200e6) {
          const text = new TextDecoder().decode(await oneDriveLaden(d));
          const app = (() => {
            try {
              return (JSON.parse(text) as { app?: string }).app;
            } catch {
              return undefined;
            }
          })();
          if (app === APP) funde.push({ ...d, art: 'backstage', text });
          else if (app === NOTEN_APP) funde.push({ ...d, art: 'noten', text });
        }
      }
      funde.sort((a, b) => b.geaendert.localeCompare(a.geaendert));
      this.funde.set(funde);
      // vorausgewählt: die neueste Backstage-Datei und das neueste Notenpaket
      this.gewaehlt.set(new Set([funde.find((d) => d.art === 'backstage')?.id, funde.find((d) => d.art === 'noten')?.id].filter((x): x is string => !!x)));
      this.meldung.set({ text: `${funde.length} ${funde.length === 1 ? 'Datei' : 'Dateien'} gefunden.` });
    });
  }

  protected einlesen(): Promise<void> {
    return this.tun(async () => {
      const teile: string[] = [];
      // Backstage-Dateien: älteste zuerst, damit die neueste gewinnt
      const backstage = this.backstageFunde().filter((d) => this.gewaehlt().has(d.id)).reverse();
      if (backstage.length && this.ersetzen() && !confirm('Alle Backstage-Daten dieses Geräts durch die gewählten Dateien ersetzen?')) return;
      let eintraege = 0;
      backstage.forEach((d, i) => (eintraege += backstageImportieren(d.text!, this.ersetzen() && i === 0)));
      if (backstage.length) teile.push(`${eintraege} Backstage-Einträge`);
      for (const d of this.notenpakete().filter((x) => this.gewaehlt().has(x.id)).reverse()) {
        teile.push(`Noten für ${await notenImportieren(d.text!)} Songs`);
      }
      if (this.notenAn() && this.notenFunde().length) {
        this.meldung.set({ text: `${this.notenFunde().length} Noten-Dateien werden geladen …` });
        const r = await notenEinlesen(
          this.notenFunde().map((d) => ({ name: d.name, pfad: d.pfad, groesse: d.groesse, daten: () => oneDriveLaden(d) })),
          await notenDateien(),
        );
        teile.push(notenErgebnisText(r).text + (r.ohne.length ? ` – nicht zugeordnet: ${r.ohne.join(', ')}` : ''));
      }
      this.meldung.set({ text: `Eingelesen: ${teile.join(' · ')}` });
      this.geaendert.emit();
    });
  }

  protected sichern(): Promise<void> {
    return this.tun(async () => {
      const ziel = [this.ordner(), 'Backstage'].filter(Boolean).join('/');
      const b = backstageDatei();
      if (b.anzahl) await oneDriveSpeichern(ziel, b.name, new Blob([b.text], { type: 'application/json' }));
      let noten = '';
      if (this.mitNoten()) {
        const n = await notenExportieren();
        if (n) {
          await oneDriveSpeichern(ziel, n.name, n);
          noten = ' und die Notenblätter';
        }
      }
      if (!b.anzahl && !noten) {
        this.meldung.set({ text: 'Noch nichts gespeichert, was sich sichern ließe.', fehler: true });
        return;
      }
      gesichert();
      this.meldung.set({ text: `${b.anzahl} Backstage-Einträge${noten} in „${ziel}“ gesichert ✓` });
    });
  }
}

function lade(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function speichere(key: string, wert: string): void {
  try {
    localStorage.setItem(key, wert);
  } catch {
    // ohne Speicher gilt der Ordner bis zum Neuladen
  }
}
