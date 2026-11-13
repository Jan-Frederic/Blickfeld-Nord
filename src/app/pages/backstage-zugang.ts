import { Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { ONEDRIVE } from '../data/onedrive-config';
import { zugangMerken, zugangZiel } from '../data/zugang';
import { nachAnmeldung } from '../data/einrichtung';
import type { AccountInfo } from '@azure/msal-browser';

type OneDrive = typeof import('../data/onedrive');

// Backstage → Anmelden (Sichtsperre, data/zugang.ts): mit Microsoft anmelden; reingelassen wird, wer den Band-Ordner
// in OneDrive sehen darf. Wer nicht dazugehört, bekommt „Kein Zugang“ und kann ein anderes Konto wählen.
@Component({
  selector: 'app-backstage-zugang',
  imports: [RouterLink, MatIconModule],
  template: `
    <section class="section zugang">
      <p class="kicker">Backstage</p>
      <h2>Nur für die Band</h2>
      @switch (stand()) {
        @case ('nein') {
          <p class="lead fehler"><mat-icon>block</mat-icon> Kein Zugang mit {{ konto() || 'diesem Konto' }}.</p>
          <p>Das Backstage öffnet sich für alle, mit denen der Band-Ordner in OneDrive geteilt ist. Bist du in der Band, lass
            dir den Ordner freigeben – oder melde dich mit dem Konto an, mit dem er geteilt ist.</p>
          <button type="button" class="primaer" (click)="anderesKonto()" [disabled]="laeuft()"><mat-icon>switch_account</mat-icon> Mit anderem Konto anmelden</button>
        }
        @case ('unklar') {
          <p class="lead fehler"><mat-icon>cloud_off</mat-icon> OneDrive ist gerade nicht erreichbar.</p>
          <p>Bitte mit Netz noch einmal versuchen. Ein Gerät, das schon einmal drin war, öffnet das Backstage auch ohne Netz.</p>
          <button type="button" class="primaer" (click)="anmelden()" [disabled]="laeuft()"><mat-icon>refresh</mat-icon> Noch einmal</button>
        }
        @default {
          <p class="lead">Melde dich mit deinem Microsoft-Konto an – mit dem, mit dem der Band-Ordner in OneDrive geteilt ist.
            Danach bleibt dieses Gerät angemeldet, auch ohne Netz.</p>
          <button type="button" class="primaer" (click)="anmelden()" [disabled]="laeuft()"><mat-icon>login</mat-icon> {{ laeuft() ? schritt() : 'Mit Microsoft anmelden' }}</button>
        }
      }
      @if (fehler(); as f) {
        <p class="fehler" role="alert">{{ f }}</p>
        @if (ohnePopup()) {
          <p>Ohne Pop-up geht die ganze Seite kurz zu Microsoft und kommt nach der Anmeldung hierher zurück.</p>
          <button type="button" class="zweit" (click)="weiterleiten()" [disabled]="laeuft()"><mat-icon>open_in_browser</mat-icon> Ohne Pop-up anmelden</button>
        }
      }
      <p class="hinweis"><a routerLink="/">Zur Website</a></p>
    </section>
  `,
  styles: `
    .zugang { max-width: 640px; }
    p { line-height: 1.55; color: var(--bn-fog); }
    .lead { display: flex; align-items: center; gap: 8px; }
    .fehler { color: #e07a5a; }
    button { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 999px; border: 1px solid var(--bn-sunset); background: var(--bn-sunset); color: #2a1708; font: inherit; cursor: pointer; }
    button:disabled { opacity: .5; cursor: default; }
    button.zweit { background: none; color: var(--bn-sunset); }
    .hinweis { margin-top: 28px; font-size: .9rem; }
    a { color: var(--bn-sunset); }
  `,
})
export class BackstageZugang {
  /** Backstage-Seite, die eigentlich aufgerufen wurde (?ziel=…) */
  readonly ziel = input<string>();
  private readonly router = inject(Router);
  private readonly mitglieder = inject(BandService).members;
  protected readonly stand = signal<'start' | 'nein' | 'unklar'>('start');
  protected readonly laeuft = signal(false);
  protected readonly konto = signal('');
  protected readonly schritt = signal('Prüfe …');
  protected readonly fehler = signal('');
  protected readonly ohnePopup = signal(false);
  /** vorab geladen: dann öffnet das Antippen das Anmelde-Fenster sofort (Safari blockt es sonst) */
  private o: OneDrive | null = null;

  constructor() {
    if (!ONEDRIVE.bandOrdner) return;
    void import('../data/onedrive').then((o) => {
      this.o = o;
      o.oneDriveVorbereiten();
      // zurück von der Anmeldung per Weiterleitung: da weitermachen
      if (o.weiterleitungZurueck()) void this.ablauf(() => o.oneDriveNachWeiterleitung());
    });
  }

  protected anmelden(): Promise<void> {
    if (!ONEDRIVE.bandOrdner) {
      void this.router.navigateByUrl(zugangZiel(this.ziel()));
      return Promise.resolve();
    }
    // ohne await bis zum Fenster (zählt noch als Antippen)
    const o = this.o;
    return this.ablauf(o ? () => o.oneDriveAnmelden() : async () => (await import('../data/onedrive')).oneDriveAnmelden());
  }

  /** anmelden (Fenster bzw. Rückkehr von der Weiterleitung), dann prüfen, ob das Konto den Band-Ordner sieht */
  private async ablauf(anmelden: () => Promise<AccountInfo | null>): Promise<void> {
    const band = ONEDRIVE.bandOrdner!;
    this.laeuft.set(true);
    this.fehler.set('');
    this.ohnePopup.set(false);
    this.schritt.set('Anmelde-Fenster offen …');
    try {
      const k = await anmelden();
      if (!k) return this.stand.set('unklar');
      this.konto.set(k.username);
      // „Ich bin …“ gleich aus dem Konto (Name) – ohne die Anmeldung aufzuhalten
      void import('../data/ich-konto').then((m) => m.ichAusMicrosoft(this.mitglieder, k)).catch(() => undefined);
      this.schritt.set('Prüfe Band-Ordner …');
      const o = this.o ?? (await import('../data/onedrive'));
      const r = await o.ordnerSichtbar(band.drive, band.item);
      if (r === 'ja') {
        zugangMerken(band);
        // erste Anmeldung auf diesem Gerät: erst der Einrichtungsassistent, der dann zum Ziel führt
        void this.router.navigateByUrl(nachAnmeldung(zugangZiel(this.ziel())));
      } else this.stand.set(r);
    } catch (e) {
      const o = this.o ?? (await import('../data/onedrive'));
      this.stand.set('start');
      this.fehler.set(o.anmeldeFehler(e).message);
      this.ohnePopup.set(o.weiterleitungHilft(o.anmeldeFehler(e)));
    } finally {
      this.laeuft.set(false);
    }
  }

  protected async weiterleiten(): Promise<void> {
    this.laeuft.set(true);
    this.schritt.set('Weiter zu Microsoft …');
    try {
      await (this.o ?? (await import('../data/onedrive'))).oneDriveWeiterleiten();
    } catch (e) {
      this.fehler.set((e as Error).message || 'Weiterleitung nicht möglich');
      this.laeuft.set(false);
    }
  }

  // abmelden, dann selbst „Mit Microsoft anmelden“ antippen – ein Fenster direkt danach würde Safari blockieren
  protected async anderesKonto(): Promise<void> {
    await (this.o ?? (await import('../data/onedrive'))).oneDriveAbmelden().catch(() => undefined);
    this.stand.set('start');
    this.fehler.set('Abgemeldet – jetzt „Mit Microsoft anmelden“ antippen und das andere Konto wählen.');
    this.ohnePopup.set(false);
  }
}
