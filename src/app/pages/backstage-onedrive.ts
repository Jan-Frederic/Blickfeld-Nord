import { Component, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Fund, sichten } from '../data/einlesen';
import { notenExportieren } from '../data/noten';
import { oneDriveAbmelden, oneDriveAnmelden, oneDriveDateien, oneDriveEingerichtet, oneDriveKonto, oneDriveLaden, oneDriveSpeichern } from '../data/onedrive';
import { backstageDatei, gesichert } from './backstage-sync';
import { FundeListe } from './funde-liste';
import { Fortschritt, Stand } from './fortschritt';

// Backstage → Abgleich → OneDrive: alle Daten aus einem OneDrive-Ordner einlesen – Backstage-Dateien (Setlists,
// Packlisten …), Notenpakete, PDFs und Akkordblätter (auch in Unterordnern, Zuordnung über den Dateinamen) – und den
// Stand dieses Geräts dort sichern. Anmeldung über die vorhandene Microsoft-Anmeldung im Browser (siehe data/onedrive.ts).
const ORDNER_KEY = 'bn-onedrive-ordner';

@Component({
  selector: 'app-backstage-onedrive',
  imports: [MatIconModule, FundeListe, Fortschritt],
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
          @if (funde(); as f) { <app-funde-liste [funde]="f" (geaendert)="geaendert.emit()" /> }
        } @else {
          <p>Setlists, Packlisten, Noten (PDF, .pro) und Sicherungen aus einem OneDrive-Ordner einlesen und den Stand dort
            sichern. Ist der Browser schon bei Microsoft angemeldet, geht es ohne Passwort.</p>
          <button type="button" class="primaer" (click)="verbinden()" [disabled]="laeuft()"><mat-icon>login</mat-icon> Mit OneDrive verbinden</button>
        }
      }
      @if (stand(); as s) { <app-fortschritt [stand]="s" /> }
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
    .check { display: inline-flex; align-items: center; gap: 8px; font-size: .88rem; }
    .check input { accent-color: var(--bn-sunset); }
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
  protected readonly stand = signal<Stand | null>(null);
  protected readonly meldung = signal<{ text: string; fehler?: boolean } | null>(null);
  protected readonly mitNoten = signal(false);
  protected readonly funde = signal<Fund[] | null>(null);

  constructor() {
    if (!this.eingerichtet) return;
    // schon einmal verbunden → Konto aus dem Speicher; sonst still über die Microsoft-Anmeldung im Browser versuchen
    oneDriveKonto()
      .then((k) => k ?? (lade(ORDNER_KEY) ? oneDriveAnmelden(true) : null))
      .then((k) => this.konto.set(k?.username ?? null))
      .catch(() => undefined);
  }

  protected ordnerSetzen(wert: string): void {
    this.ordner.set(wert.trim().replace(/^\/+|\/+$/g, ''));
    this.funde.set(null);
    speichere(ORDNER_KEY, this.ordner());
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
      this.stand.set(null);
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

  protected durchsuchen(): Promise<void> {
    return this.tun(async () => {
      this.meldung.set(null);
      this.funde.set(null);
      const melden = (s: Stand) => this.stand.set(s);
      const dateien = await oneDriveDateien(this.ordner(), (n, ordner) => melden({ text: `Durchsuchen: ${ordner} – ${n} ${n === 1 ? 'Datei' : 'Dateien'} gefunden` }));
      this.funde.set(await sichten(dateien.map((d) => ({ name: d.name, pfad: d.pfad, groesse: d.groesse, geaendert: d.geaendert, laden: () => oneDriveLaden(d) })), melden));
    });
  }

  protected sichern(): Promise<void> {
    return this.tun(async () => {
      const ziel = [this.ordner(), 'Backstage'].filter(Boolean).join('/');
      const b = backstageDatei();
      const gesamt = (b.anzahl ? 1 : 0) + (this.mitNoten() ? 1 : 0);
      this.stand.set({ text: `Hochladen: ${b.name}`, fertig: 0, gesamt });
      if (b.anzahl) await oneDriveSpeichern(ziel, b.name, new Blob([b.text], { type: 'application/json' }));
      let noten = '';
      if (this.mitNoten()) {
        this.stand.set({ text: 'Notenblätter werden zusammengestellt und hochgeladen …', fertig: b.anzahl ? 1 : 0, gesamt });
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
