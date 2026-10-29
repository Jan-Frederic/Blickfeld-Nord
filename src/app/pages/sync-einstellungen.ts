import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ONEDRIVE, clientId, clientIdSetzen } from '../data/onedrive-config';
import { CloudEintrag, CloudOrt, cloudOrdnerAnlegen, cloudUnterordner, oneDriveAbmelden, oneDriveAnmelden, oneDriveEingerichtet, oneDriveKonto } from '../data/onedrive';
import { ordnerVerbindbar } from '../data/ordner';
import { SyncService } from '../data/sync.service';
import { SyncEinstellungen, cloudGewaehlt, cloudName, lokalerOrdnerHandle, lokalerOrdnerSetzen, syncEinstellungen, syncEinstellungenSetzen, syncZustandLoeschen } from '../data/sync-ordner';

// Backstage → Einstellungen → Synchronisation: Microsoft-Konto, OneDrive-Ordner (zum Durchklicken), lokaler Ordner
// (Ordner auf dem Computer oder Speicher der App), Richtung, Löschungen, automatisch. Wechselt einer der Ordner,
// beginnt der Abgleich neu (gleiche Dateien werden erkannt, nichts geht verloren).
@Component({
  selector: 'app-sync-einstellungen',
  imports: [MatIconModule],
  template: `
    <div class="box">
      <h3><mat-icon>sync</mat-icon> Synchronisation OneDrive ↔ lokal</h3>
      <p>Ein OneDrive-Ordner wird mit einem lokalen Ordner abgeglichen – in beide Richtungen, wie OneSync: Neues und
        Geändertes wird übertragen, bei Änderungen auf beiden Seiten bleibt die ältere Fassung als Konfliktkopie erhalten.</p>

      <h4>1. Microsoft-Konto</h4>
      @if (!festeId) {
        <label class="feld">App-ID (Client-ID) der App-Registrierung
          <input [value]="id()" placeholder="z. B. 1a2b3c4d-…" (change)="idSetzen($any($event.target).value)" spellcheck="false" />
        </label>
        <p class="klein">Einmalig bei Microsoft anlegen – Anleitung in PFLEGE.md unter „OneDrive einrichten“. Gilt für dieses Gerät.</p>
      }
      @if (eingerichtet()) {
        @if (konto(); as k) {
          <p class="ok"><mat-icon>verified_user</mat-icon> {{ k }} <button type="button" class="link" (click)="trennen()">abmelden</button></p>
        } @else {
          <button type="button" (click)="anmelden()" [disabled]="laeuft()"><mat-icon>login</mat-icon> Mit Microsoft anmelden</button>
        }
      }

      <h4>2. OneDrive-Ordner</h4>
      <p class="pfad"><mat-icon>cloud</mat-icon> {{ cloudName(e()) || 'noch keiner gewählt' }}</p>
      @if (konto()) {
        @if (blaettern(); as b) {
          <div class="browser">
            <p class="klein">OneDrive / {{ cloudName({ cloud: b.ort.pfad, wurzel: b.ort.wurzel }) }}</p>
            <div class="liste">
              @if (b.ort.pfad || b.ort.wurzel) { <button type="button" (click)="oeffnen(eltern(b.ort))"><mat-icon>arrow_upward</mat-icon> eine Ebene hoch</button> }
              @for (o of b.ordner; track o.name + (o.wurzel?.item ?? '')) {
                <button type="button" (click)="oeffnen(hinein(b.ort, o))"><mat-icon>{{ o.wurzel ? 'folder_shared' : 'folder' }}</mat-icon> {{ o.name }}@if (o.wurzel) { <small>geteilt</small> }</button>
              }
              @if (!b.ordner.length) { <span class="klein">keine Unterordner</span> }
            </div>
            <div class="knoepfe">
              <button type="button" class="primaer" [disabled]="!b.ort.pfad && !b.ort.wurzel" (click)="cloudWaehlen(b.ort)"><mat-icon>check</mat-icon> Diesen Ordner nehmen</button>
              <button type="button" (click)="neuerOrdner(b.ort)"><mat-icon>create_new_folder</mat-icon> Neuer Ordner</button>
              <button type="button" (click)="blaettern.set(null)">Abbrechen</button>
            </div>
          </div>
        } @else {
          <button type="button" (click)="oeffnen({ pfad: e().cloud, wurzel: e().wurzel })" [disabled]="laeuft()"><mat-icon>folder_open</mat-icon> OneDrive-Ordner wählen</button>
        }
      }

      <h4>3. Lokaler Ordner</h4>
      <label class="check"><input type="radio" name="lokal" [checked]="e().lokal === 'app'" (change)="lokalArt('app')" />
        Speicher dieser App – auf allen Geräten (auch iPhone und Android), offline verfügbar</label>
      <label class="check"><input type="radio" name="lokal" [checked]="e().lokal === 'ordner'" [disabled]="!verbindbar" (change)="lokalArt('ordner')" />
        Ordner auf diesem Computer{{ verbindbar ? '' : ' – nur mit Chrome oder Edge am Computer' }}</label>
      @if (e().lokal === 'ordner') {
        <p class="pfad"><mat-icon>folder</mat-icon> {{ ordnerName() || 'noch keiner gewählt' }}
          <button type="button" (click)="ordnerWaehlen()"><mat-icon>folder_open</mat-icon> {{ ordnerName() ? 'Anderen wählen' : 'Ordner wählen' }}</button></p>
      }

      <h4>4. Optionen</h4>
      <label class="feld">Richtung
        <select (change)="setzen({ richtung: $any($event.target).value })">
          <option value="beide" [selected]="e().richtung === 'beide'">in beide Richtungen</option>
          <option value="runter" [selected]="e().richtung === 'runter'">nur von OneDrive auf das Gerät</option>
          <option value="hoch" [selected]="e().richtung === 'hoch'">nur vom Gerät zu OneDrive</option>
        </select>
      </label>
      <label class="check"><input type="checkbox" [checked]="e().loeschen" (change)="setzen({ loeschen: $any($event.target).checked })" /> Löschungen übertragen (in OneDrive landen sie im Papierkorb)</label>
      <label class="check"><input type="checkbox" [checked]="e().auto" (change)="setzen({ auto: $any($event.target).checked })" /> Automatisch beim Öffnen des Backstage und alle 15 Minuten</label>
      <label class="check"><input type="checkbox" [checked]="e().notenAuto" (change)="setzen({ notenAuto: $any($event.target).checked })" /> Neue Noten (PDF, .pro) nach dem Abgleich gleich beim Song einlesen – Titel und Interpret werden erkannt, Unklares wartet im Abgleich auf eine Zuordnung</label>

      <div class="knoepfe ende">
        <button type="button" class="primaer" (click)="sync.jetzt()" [disabled]="!bereit() || sync.laeuft()"><mat-icon>sync</mat-icon> Jetzt synchronisieren</button>
        @if (sync.letzter(); as l) { <span class="klein" [class.fehler]="l.fehler">Zuletzt {{ zeit(l.zeit) }}: {{ l.text }}</span> }
      </div>
      @if (meldung(); as m) { <p class="meldung" role="status">{{ m }}</p> }
    </div>
  `,
  styles: `
    .box { padding: 20px 24px; border-radius: 12px; border: 1px solid var(--bn-line); }
    h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; font-family: var(--bn-wide); font-weight: 400; text-transform: uppercase; letter-spacing: .14em; font-size: .85rem; }
    h4 { margin: 20px 0 8px; font-size: .78rem; color: var(--bn-sunset); text-transform: uppercase; letter-spacing: .1em; font-weight: 500; }
    p { margin: 0 0 10px; max-width: 720px; font-size: .88rem; line-height: 1.55; color: var(--bn-fog); }
    .klein { font-size: .8rem; color: var(--bn-fog); }
    .fehler { color: #e07a5a; }
    .ok, .pfad { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; color: var(--bn-ink); overflow-wrap: anywhere; }
    .ok { color: #5fb88a; }
    .feld { display: grid; gap: 4px; max-width: 420px; margin-bottom: 8px; font-size: .72rem; color: var(--bn-fog); text-transform: uppercase; letter-spacing: .08em; }
    input:not([type]), select { padding: 8px 10px; border: 1px solid var(--bn-line); border-radius: 8px; background: #1b1e22; color: var(--bn-ink); font: inherit; font-size: .9rem; text-transform: none; letter-spacing: 0; color-scheme: dark; }
    .check { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; font-size: .88rem; }
    .check input { flex: none; margin-top: 3px; accent-color: var(--bn-sunset); }
    .browser { padding: 12px; border: 1px solid var(--bn-line); border-radius: 10px; }
    .liste { display: grid; gap: 4px; justify-items: start; max-height: 260px; overflow: auto; margin-bottom: 10px; }
    .knoepfe { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
    .ende { margin-top: 18px; }
    button { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; font-size: .86rem; cursor: pointer; text-align: left; }
    .liste button { border-radius: 8px; border-color: transparent; padding: 5px 8px; }
    button:hover:not(:disabled) { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    button:disabled { opacity: .4; cursor: default; }
    button.primaer { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    button.link { padding: 0 4px; border: 0; color: var(--bn-fog); text-decoration: underline; }
    mat-icon { flex: none; font-size: 18px; width: 18px; height: 18px; }
    .meldung { margin: 12px 0 0; color: #5fb88a; }
  `,
})
export class SyncEinstellungenSeite {
  protected readonly sync = inject(SyncService);
  protected readonly festeId = !!ONEDRIVE.clientId;
  protected readonly verbindbar = ordnerVerbindbar();
  protected readonly id = signal(clientId());
  protected readonly eingerichtet = signal(oneDriveEingerichtet());
  protected readonly konto = signal<string | null>(null);
  protected readonly e = signal(syncEinstellungen());
  protected readonly ordnerName = signal('');
  protected readonly blaettern = signal<{ ort: CloudOrt; ordner: CloudEintrag[] } | null>(null);
  protected readonly cloudName = cloudName;
  protected readonly laeuft = signal(false);
  protected readonly meldung = signal('');
  protected readonly bereit = () => this.eingerichtet() && cloudGewaehlt(this.e()) && !!this.konto() && (this.e().lokal === 'app' || !!this.ordnerName());

  constructor() {
    this.kontoLaden();
    lokalerOrdnerHandle().then((h) => this.ordnerName.set(h?.name ?? ''));
  }

  private kontoLaden(): void {
    if (!oneDriveEingerichtet()) return;
    oneDriveKonto()
      .then((k) => this.konto.set(k?.username ?? null))
      .catch(() => undefined);
  }

  protected zeit(iso: string): string {
    return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
  }

  // eine Ebene hoch: im Pfad zurück, ganz oben in einem geteilten Ordner zurück zum eigenen OneDrive
  protected eltern(ort: CloudOrt): CloudOrt {
    return ort.pfad ? { pfad: ort.pfad.split('/').slice(0, -1).join('/'), wurzel: ort.wurzel } : { pfad: '' };
  }

  protected hinein(ort: CloudOrt, o: CloudEintrag): CloudOrt {
    return o.wurzel ? { pfad: '', wurzel: o.wurzel } : { pfad: ort.pfad ? `${ort.pfad}/${o.name}` : o.name, wurzel: ort.wurzel };
  }

  private async tun(arbeit: () => Promise<void>): Promise<void> {
    this.laeuft.set(true);
    try {
      await arbeit();
    } catch (err) {
      const t = (err as Error).message;
      this.meldung.set(t === 'nicht gefunden' ? 'Diesen Ordner gibt es nicht (mehr).' : `Fehler: ${t || 'unbekannt'}`);
    } finally {
      this.laeuft.set(false);
    }
  }

  protected idSetzen(wert: string): void {
    clientIdSetzen(wert);
    this.id.set(clientId());
    this.eingerichtet.set(oneDriveEingerichtet());
    this.konto.set(null);
    this.kontoLaden();
  }

  protected anmelden(): Promise<void> {
    return this.tun(async () => this.konto.set((await oneDriveAnmelden())?.username ?? null));
  }

  protected trennen(): Promise<void> {
    return this.tun(async () => {
      await oneDriveAbmelden();
      this.konto.set(null);
      this.blaettern.set(null);
    });
  }

  protected oeffnen(ort: CloudOrt): Promise<void> {
    return this.tun(async () => {
      try {
        this.blaettern.set({ ort, ordner: await cloudUnterordner(ort) });
      } catch (err) {
        // gewählter Ordner gibt es nicht mehr (oder ist nicht mehr geteilt) → oben anfangen
        if ((err as Error).message !== 'nicht gefunden' || (!ort.pfad && !ort.wurzel)) throw err;
        this.blaettern.set({ ort: { pfad: '' }, ordner: await cloudUnterordner({ pfad: '' }) });
      }
    });
  }

  protected neuerOrdner(eltern: CloudOrt): Promise<void> {
    const name = prompt('Name des neuen Ordners')?.trim().replace(/[\\/:*?"<>|]/g, '');
    if (!name) return Promise.resolve();
    return this.tun(async () => {
      await cloudOrdnerAnlegen(eltern, name);
      this.blaettern.set({ ort: this.hinein(eltern, { name }), ordner: [] });
    });
  }

  protected async cloudWaehlen(ort: CloudOrt): Promise<void> {
    this.blaettern.set(null);
    await this.ordnerGeaendert({ cloud: ort.pfad, wurzel: ort.wurzel });
  }

  protected async lokalArt(art: SyncEinstellungen['lokal']): Promise<void> {
    await this.ordnerGeaendert({ lokal: art });
  }

  protected ordnerWaehlen(): Promise<void> {
    return this.tun(async () => {
      try {
        const h = await (globalThis as unknown as { showDirectoryPicker: (o: object) => Promise<Parameters<typeof lokalerOrdnerSetzen>[0]> }).showDirectoryPicker({ id: 'blickfeld-nord-sync', mode: 'readwrite' });
        await lokalerOrdnerSetzen(h);
        this.ordnerName.set(h!.name);
        await this.ordnerGeaendert({});
      } catch (err) {
        if ((err as Error).name !== 'AbortError') throw err;
      }
    });
  }

  // anderer Ordner → Abgleich beginnt neu (gleiche Dateien werden am Ende erkannt, nichts geht verloren)
  private async ordnerGeaendert(teil: Partial<SyncEinstellungen>): Promise<void> {
    this.setzen(teil);
    await syncZustandLoeschen().catch(() => undefined);
    this.meldung.set('Gespeichert – der nächste Abgleich vergleicht beide Ordner neu.');
  }

  protected setzen(teil: Partial<SyncEinstellungen>): void {
    this.e.update((x) => ({ ...x, ...teil }));
    syncEinstellungenSetzen(this.e());
  }
}
