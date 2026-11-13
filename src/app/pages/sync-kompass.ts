import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SyncService } from '../data/sync.service';
import { kuerzlichAktiv, neuZeichnen, selbstAuffrischen } from '../data/neu-zeichnen';
import { anmeldeFehler, oneDriveWeiterleiten, weiterleitungHilft } from '../data/onedrive';
import { dauerhaftImBrowser } from '../data/speicher';

// Sync-Anzeige unten rechts im Backstage: ein Kompass (public/kompass-sync.svg, transparent), der nur erscheint,
// solange mit OneDrive abgeglichen wird – er blendet sich ein, dreht sich und blendet sich danach wieder aus.
// Antippen öffnet den Abgleich. Ohne Synchronisation oder offline gibt es ihn nicht.
// Hat ein Abgleich Daten anderer Geräte gebracht, baut er die offene Seite neu auf (sie liest ihren Stand nur beim
// Öffnen) – außer man tippt gerade, hat einen Dialog offen oder ist im Bühnen-/Probe-Modus: dann erscheint ein Knopf
// „Neue Daten der Band – anzeigen“.
// Verlangt Microsoft eine neue Anmeldung, ruht der automatische Abgleich (er darf kein Fenster öffnen): Dann steht
// oben „OneDrive: Anmeldung nötig“ mit „Neu anmelden“ – das öffnet sofort das Anmelde-Fenster (der Bühnen-Modus
// liegt darüber, dort stört er nicht).
@Component({
  selector: 'app-sync-kompass',
  imports: [RouterLink],
  template: `
    @if (sync.bereit() && sync.online()) {
      <a class="kompass" routerLink="/backstage/abgleich" [class.an]="sync.laeuft()" [attr.aria-hidden]="!sync.laeuft()"
        [attr.tabindex]="sync.laeuft() ? null : -1" [attr.aria-label]="text()" [title]="text()">
        <img src="kompass-sync.svg" alt="" width="56" height="56" />
      </a>
      <span class="sr" role="status">{{ sync.laeuft() ? text() : '' }}</span>
    }
    @if (sync.anmeldungNoetig() && sync.bereit() && sync.online() && !ausgeblendet()) {
      <div class="anmelden" role="status">
        <span>{{ fehler() || 'OneDrive: Anmeldung nötig – der automatische Abgleich ruht.' }}</span>
        <button type="button" (click)="neuAnmelden()" [disabled]="laeuft()">{{ laeuft() ? 'Anmelde-Fenster offen …' : 'Neu anmelden' }}</button>
        @if (ohnePopup()) { <button type="button" (click)="weiterleiten()">Ohne Pop-up</button> }
        <button type="button" class="zu" aria-label="Hinweis ausblenden" (click)="ausgeblendet.set(true)">×</button>
      </div>
    }
    @if (hinweis()) {
      <button type="button" class="neu" (click)="anzeigen()">Neue Daten der Band – anzeigen</button>
    }
  `,
  styles: `
    .kompass {
      position: fixed; right: max(14px, env(safe-area-inset-right)); bottom: max(14px, env(safe-area-inset-bottom)); z-index: 900;
      display: block; width: 56px; height: 56px; opacity: 0; visibility: hidden; pointer-events: none;
      transition: opacity .6s ease, visibility 0s linear .6s;
    }
    .kompass.an { opacity: 1; visibility: visible; pointer-events: auto; transition: opacity .6s ease, visibility 0s; }
    img { display: block; width: 100%; height: 100%; filter: drop-shadow(0 1px 3px rgba(0, 0, 0, .7)); animation: drehen 2.4s linear infinite; animation-play-state: paused; }
    .an img { animation-play-state: running; }
    @keyframes drehen { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { img { animation-duration: 8s; } }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    .anmelden {
      position: fixed; left: 50%; top: max(10px, env(safe-area-inset-top)); z-index: 950; transform: translateX(-50%);
      display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; width: max-content; max-width: calc(100vw - 32px);
      padding: 8px 10px 8px 16px; border-radius: 14px; background: #2a1d14; border: 1px solid var(--bn-sunset);
      color: var(--bn-ink); font-size: .86rem; box-shadow: 0 2px 12px rgba(0, 0, 0, .6);
    }
    .anmelden button { padding: 6px 12px; border: 0; border-radius: 999px; background: var(--bn-sunset); color: #2a1708; font: inherit; cursor: pointer; }
    .anmelden button.zu { padding: 4px 8px; background: none; color: var(--bn-fog); }
    .neu {
      position: fixed; left: 50%; bottom: max(14px, env(safe-area-inset-bottom)); z-index: 900; transform: translateX(-50%);
      padding: 9px 16px; border: 0; border-radius: 999px; background: var(--bn-sunset); color: #2a1708; font: inherit; font-size: .88rem;
      box-shadow: 0 2px 10px rgba(0, 0, 0, .5); cursor: pointer; max-width: calc(100vw - 32px);
    }
  `,
})
export class SyncKompass {
  protected readonly sync = inject(SyncService);
  protected readonly text = computed(() => {
    const s = this.sync.stand();
    return s?.gesamt ? `Wird mit OneDrive abgeglichen – ${s.fertig ?? 0} von ${s.gesamt}` : 'Wird mit OneDrive abgeglichen …';
  });

  protected readonly hinweis = signal(false);

  // Anmeldung abgelaufen: „Neu anmelden“ öffnet das Fenster sofort (kein await davor, sonst blockt Safari es)
  protected readonly ausgeblendet = signal(false);
  protected readonly laeuft = signal(false);
  protected readonly fehler = signal('');
  protected readonly ohnePopup = signal(false);
  protected neuAnmelden(): void {
    this.laeuft.set(true);
    this.fehler.set('');
    this.sync
      .neuAnmelden()
      .catch((e) => {
        const f = anmeldeFehler(e);
        this.fehler.set(f.message);
        this.ohnePopup.set(weiterleitungHilft(f));
      })
      .finally(() => this.laeuft.set(false));
  }
  protected weiterleiten(): void {
    oneDriveWeiterleiten().catch((e) => this.fehler.set((e as Error).message));
  }

  constructor() {
    this.sync.automatisch();
    // Daten dieses Geräts dauerhaft speichern lassen (still, höchstens alle 30 Tage – data/speicher.ts)
    void dauerhaftImBrowser();
    let erster = true;
    effect(() => {
      this.sync.neueDaten();
      if (erster) return void (erster = false);
      // Seiten, die selbst auffrischen (Songs, Setlist), übernehmen die Daten ohne Neuaufbau; sonst nur neu aufbauen,
      // wenn gerade niemand auf der Seite arbeitet – andernfalls der Knopf „Neue Daten … anzeigen“
      untracked(() => (selbstAuffrischen() ? undefined : this.ungestoert() ? this.anzeigen() : this.hinweis.set(true)));
    });
  }

  /** Neuaufbau stört nicht: seit einer Minute nichts getan, kein Eingabefeld im Fokus, kein Dialog, kein Bühnen- bzw. Probe-Modus */
  private ungestoert(): boolean {
    const a = document.activeElement as HTMLElement | null;
    const tippt = !!a && (a.matches('input, textarea, select') || a.isContentEditable);
    return !tippt && !kuerzlichAktiv() && !document.querySelector('dialog[open], app-setlist-buehne, app-daten-editor, .cdk-overlay-pane');
  }

  protected anzeigen(): void {
    this.hinweis.set(false);
    neuZeichnen();
  }
}
