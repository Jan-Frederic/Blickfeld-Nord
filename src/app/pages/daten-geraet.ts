import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SyncService } from '../data/sync.service';
import { cacheLeeren, mb } from '../data/aufraeumen';
import { offeneNoten, syncEinstellungen } from '../data/sync-ordner';
import { SpotifyArt, spotifyArt, spotifyBrowserRechte, spotifyGewaehltesGeraet, spotifyLage, spotifyProtokoll, spotifyProtokollLeeren, spotifyVerbunden } from '../data/spotify-remote';
import { DATEN_BACKUP, backupZeit, backupsSortiert } from '../data/backup-regeln';
import { GESICHERT_KEY } from './backstage-sync';
import { geraetId, geraetName, seitText, standardName } from '../data/geraete';

// Abgleich → Daten auf diesem Gerät, unten: was der Browser dieses Geräts sonst noch weiß – Speicherplatz (belegt,
// erlaubt, dauerhaft?), die lokale Kopie des Sync-Ordners, Spotify, App-Stand samt Seiten für unterwegs und das
// letzte Backup. Teure Teile (Sync-Kopie, Größe der Caches) werden erst beim Aufklappen gelesen.
interface CacheInfo { name: string; titel: string; dateien: number; bytes: number }
interface Kopie { ort: string; dateien: number; bytes: number; ordner: { name: string; dateien: number; bytes: number }[]; backup: string }

const ART_TEXT: Record<SpotifyArt, string> = { aus: 'aus', vorschau: 'eingebetteter Player', fern: 'Fernsteuerung der Spotify-App', browser: 'im Browser abspielen' };
const lesen = (k: string): unknown => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? 'null');
  } catch {
    return null;
  }
};
const datum = (t: number) => new Date(t).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

@Component({
  selector: 'app-daten-geraet',
  imports: [RouterLink, MatIconModule],
  template: `
    <div class="gruppe speicher-gruppe">
      <details [open]="offen().has('speicher')" (toggle)="auf('speicher', $event)">
        <summary>Speicherplatz <span class="zahl">{{ platz() ? mb(platz()!.belegt) + (platz()!.erlaubt ? ' von ' + mb(platz()!.erlaubt) : '') : '–' }}</span></summary>
        @if (platz(); as p) {
          <ul>
            <li><span class="text"><strong>Einträge</strong><small>Setlists, Einstellungen und alles oben Gelistete</small></span><span class="wert">{{ mb(eintraege()) }}</span></li>
            <li><span class="text"><strong>Noten</strong><small>PDFs und Akkordblätter</small></span><span class="wert">{{ mb(noten()) }}</span></li>
            <li><span class="text"><strong>Proben-Mitschnitte</strong></span><span class="wert">{{ mb(mitschnitte()) }}</span></li>
            <li><span class="text"><strong>Rest</strong><small>Sync-Kopie, Seiten für unterwegs, Browser-Verwaltung</small></span><span class="wert">{{ mb(rest()) }}</span></li>
          </ul>
          <p>{{ p.erlaubt ? 'Belegt ' + anteil(p) + ' des Platzes, den der Browser der App erlaubt.' : 'Wie viel Platz der Browser erlaubt, verrät er hier nicht.' }}
            @if (p.dauerhaft === true) { <strong>Dauerhaft gespeichert:</strong> Der Browser löscht die Daten nicht von sich aus. }
            @else if (p.dauerhaft === false) { <strong>Nicht dauerhaft:</strong> Bei Platzmangel darf der Browser die Daten löschen (Safari auch nach Wochen ohne Besuch). }
          </p>
          @if (p.dauerhaft === false) { <button type="button" (click)="dauerhaft()"><mat-icon>lock</mat-icon> Dauerhaft speichern</button> }
        } @else {
          <p>Dieser Browser verrät nicht, wie viel Platz belegt ist.</p>
        }
      </details>
    </div>

    @if (sync.bereit()) {
      <div class="gruppe kopie-gruppe">
        <details [open]="offen().has('kopie')" (toggle)="auf('kopie', $event)">
          <summary>Sync-Kopie <span class="zahl">{{ kopie() ? kopie()!.dateien + ' Dateien · ' + mb(kopie()!.bytes) : '' }}</span></summary>
          @if (kopie(); as k) {
            <p>{{ k.ort }}. Zuletzt abgeglichen: {{ sync.letzter() ? seit(sync.letzter()!.zeit) : 'noch nie' }}@if (sync.ausstehend()) { · {{ sync.ausstehend() }} {{ sync.ausstehend() === 1 ? 'Eintrag wartet' : 'Einträge warten' }} aufs Hochladen }@if (ohneSong()) { · {{ ohneSong() }} Noten-{{ ohneSong() === 1 ? 'Datei' : 'Dateien' }} ohne eindeutigen Song }.</p>
            <ul>
              @for (o of k.ordner; track o.name) {
                <li><span class="text"><strong>{{ o.name }}</strong><small>{{ o.dateien }} {{ o.dateien === 1 ? 'Datei' : 'Dateien' }}</small></span><span class="wert">{{ mb(o.bytes) }}</span></li>
              }
            </ul>
            @if (k.backup) { <p>Neuestes Backup im Sync-Ordner: {{ k.backup }}</p> }
          } @else if (kopieFehler()) {
            <p>{{ kopieFehler() }}</p>
          } @else {
            <p>Wird gelesen …</p>
          }
        </details>
      </div>
    }

    @if (spotify(); as s) {
      <div class="gruppe spotify-gruppe">
        <details [open]="offen().has('spotify')" (toggle)="auf('spotify', $event)">
          <summary>Spotify <span class="zahl">{{ s.verbunden ? 'verbunden' : 'nicht verbunden' }}</span></summary>
          <ul>
            <li><span class="text"><strong>Abspielen</strong><small>{{ s.art }}{{ s.art !== 'aus' && s.verbunden && !s.browserRechte ? ' · Abspielen im Browser braucht eine neue Anmeldung' : '' }}</small></span></li>
            @if (s.verbunden) { <li><span class="text"><strong>Anmeldung</strong><small>gespeichert, wird automatisch erneuert{{ s.geraet ? ' · Gerät gewählt' : '' }}</small></span></li> }
            <li><span class="text"><strong>Zuletzt abgespielt</strong><small>{{ s.ok ? seit(s.ok) : 'noch nie auf diesem Gerät' }}{{ s.premiumFehlt ? ' · Spotify meldete „nur mit Premium“' : '' }}</small></span></li>
            <li><span class="text"><strong>Diagnose-Protokoll</strong><small>{{ s.protokoll }} {{ s.protokoll === 1 ? 'Zeile' : 'Zeilen' }}</small></span>
              @if (s.protokoll) { <button type="button" (click)="protokollLeeren()"><mat-icon>delete</mat-icon> Leeren</button> }</li>
          </ul>
          <p>Ändern, verbinden und trennen: <a routerLink="/backstage/einstellungen">Einstellungen → Spotify</a>.</p>
        </details>
      </div>
    }

    @if (cachesDa) {
      <div class="gruppe app-gruppe">
        @if (loeschbar()) { <button type="button" class="icon weg" (click)="offlineLeeren($event)" aria-label="Seiten für unterwegs leeren"><mat-icon>delete_sweep</mat-icon></button> }
        <details [open]="offen().has('app')" (toggle)="auf('app', $event)">
          <summary>App und Seiten für unterwegs <span class="zahl">{{ appStand() ? 'App-Stand ' + appStand() : '' }}</span></summary>
          <p>Damit Backstage ohne Netz geht; lädt beim nächsten Besuch mit Netz neu. Nach neuen Versionen sucht die App von
            selbst – beim Öffnen und immer, wenn sie wieder in den Vordergrund kommt.</p>
          @if (cacheListe(); as l) {
            <ul>
              @for (c of l; track c.name) {
                <li><span class="text"><strong>{{ c.titel }}</strong><small>{{ c.dateien }} {{ c.dateien === 1 ? 'Datei' : 'Dateien' }}</small></span><span class="wert">{{ mb(c.bytes) }}</span></li>
              } @empty { <li><span class="text"><small>Noch nichts gespeichert.</small></span></li> }
            </ul>
          } @else { <p>Wird gelesen …</p> }
          <button type="button" [disabled]="suchtUpdate()" (click)="updateSuchen()"><mat-icon>refresh</mat-icon> Nach neuer Version suchen</button>
        </details>
      </div>
    }

    <div class="gruppe backup-gruppe">
      <details [open]="offen().has('backup')" (toggle)="auf('backup', $event)">
        <summary>Backup <span class="zahl" [class.alt]="backupAlt()">{{ backup() ? seit(backup()!) : 'noch keins' }}</span></summary>
        <p>{{ backup() ? 'Letztes Backup auf diesem Gerät: ' + datumText(backup()!) + '.' : 'Auf diesem Gerät wurde noch kein Backup erstellt.' }}
          @if (backupAlt()) { Am besten jetzt eins erstellen – vieles liegt nur in diesem Browser. }
          <a routerLink="/backstage/einstellungen">Einstellungen → Backup</a></p>
      </details>
    </div>
    <div class="diagnose">
      <button type="button" (click)="diagnoseKopieren()"><mat-icon>content_copy</mat-icon> Diagnose kopieren</button>
      <small>App-Stand, Gerät, Abgleich, Speicher und Spotify in einem Text – zum Weitergeben, wenn etwas hakt. Ohne
        E-Mail-Adresse und ohne Zugangsdaten.</small>
    </div>
    @if (meldung(); as m) { <p class="meldung" role="status">{{ m }}</p> }
  `,
})
export class DatenGeraet {
  /** Größen aus der Seite darüber (Einträge, Noten, Mitschnitte) */
  readonly eintraege = input(0);
  readonly noten = input(0);
  readonly mitschnitte = input(0);
  readonly loeschbar = input(false);
  readonly geaendert = output<void>();
  protected readonly sync = inject(SyncService);
  protected readonly mb = mb;
  protected readonly seit = (x: string | number) => seitText(typeof x === 'number' ? new Date(x).toISOString() : x);
  protected readonly datumText = datum;
  protected readonly offen = signal(new Set<string>());
  protected readonly meldung = signal('');

  // Speicherplatz (Storage API – fehlt in älteren Browsern)
  protected readonly platz = signal<{ belegt: number; erlaubt: number; dauerhaft?: boolean } | null>(null);
  protected readonly rest = computed(() => Math.max(0, (this.platz()?.belegt ?? 0) - this.eintraege() - this.noten() - this.mitschnitte()));
  protected anteil(p: { belegt: number; erlaubt: number }): string {
    const x = (p.belegt / p.erlaubt) * 100;
    return `${x < 1 ? '< 1' : Math.round(x)} %`;
  }
  private async platzLesen(): Promise<void> {
    try {
      const s = await navigator.storage?.estimate?.();
      if (!s) return;
      const dauerhaft = navigator.storage.persisted ? await navigator.storage.persisted() : undefined;
      this.platz.set({ belegt: s.usage ?? 0, erlaubt: s.quota ?? 0, dauerhaft });
    } catch {
      // ohne Schätzung bleibt es bei „–“
    }
  }
  protected async dauerhaft(): Promise<void> {
    const ok = await navigator.storage?.persist?.().catch(() => false);
    this.meldung.set(ok ? 'Dauerhaft gespeichert ✓' : 'Der Browser hat abgelehnt – als App installiert (Zum Startbildschirm) klappt es meist.');
    await this.platzLesen();
  }

  // Sync-Kopie: Dateien je Ordner der lokalen Seite (in der App oder im gewählten Ordner)
  protected readonly kopie = signal<Kopie | null>(null);
  protected readonly kopieFehler = signal('');
  protected readonly ohneSong = signal(offeneNoten().length);
  private async kopieLesen(): Promise<void> {
    try {
      const o = await this.sync.lokal();
      if (!o) {
        this.kopieFehler.set('Der Ordner auf diesem Gerät braucht erst wieder die Erlaubnis – „Jetzt synchronisieren“ antippen.');
        return;
      }
      const liste = await o.liste();
      const je = new Map<string, { name: string; dateien: number; bytes: number }>();
      for (const d of liste) {
        const name = d.pfad.includes('/') ? d.pfad.split('/')[0] : '(oberste Ebene)';
        const x = je.get(name) ?? { name, dateien: 0, bytes: 0 };
        x.dateien++;
        x.bytes += d.groesse;
        je.set(name, x);
      }
      const b = backupsSortiert(liste).find((x) => DATEN_BACKUP.test(x.pfad));
      this.kopie.set({
        ort: syncEinstellungen().lokal === 'app' ? 'Liegt im Speicher der App (Browser)' : 'Liegt im gewählten Ordner auf diesem Gerät',
        dateien: liste.length,
        bytes: liste.reduce((s, d) => s + d.groesse, 0),
        ordner: [...je.values()].sort((a, b) => b.bytes - a.bytes),
        backup: b ? datum(backupZeit(b)) : '',
      });
      this.ohneSong.set(offeneNoten().length);
    } catch (e) {
      this.kopieFehler.set(`Nicht lesbar: ${(e as Error).message}`);
    }
  }

  // Spotify: nur wenn eingerichtet oder verbunden
  private readonly spotifyStand = signal(0);
  protected readonly spotify = computed(() => {
    this.spotifyStand();
    const art = spotifyArt();
    const verbunden = spotifyVerbunden();
    if (art === 'aus' && !verbunden) return null;
    const ok = lesen('bn-spotify-ok');
    return {
      art: ART_TEXT[art],
      verbunden,
      browserRechte: spotifyBrowserRechte() || art !== 'browser',
      geraet: !!spotifyGewaehltesGeraet(),
      ok: typeof ok === 'string' ? ok : '',
      premiumFehlt: lesen('bn-spotify-premium-fehlt') === true,
      protokoll: spotifyProtokoll().length,
    };
  });
  protected protokollLeeren(): void {
    spotifyProtokollLeeren();
    this.spotifyStand.update((x) => x + 1);
    this.geaendert.emit();
  }

  // App-Stand und Caches des Service Workers
  protected readonly cachesDa = typeof caches !== 'undefined';
  protected readonly appStand = signal('');
  protected readonly cacheListe = signal<CacheInfo[] | null>(null);
  protected readonly suchtUpdate = signal(false);
  private async appLesen(): Promise<void> {
    if (!this.cachesDa) return;
    const namen = await caches.keys().catch(() => [] as string[]);
    this.appStand.set(namen.filter((n) => /^bn-[0-9a-f]{6,}$/.test(n)).map((n) => n.slice(3, 11)).join(', '));
  }
  private async cachesMessen(): Promise<void> {
    const out: CacheInfo[] = [];
    for (const name of await caches.keys()) {
      const c = await caches.open(name);
      let bytes = 0;
      const keys = await c.keys();
      for (const r of keys) bytes += (await (await c.match(r))?.blob())?.size ?? 0;
      const titel = /^bn-[0-9a-f]+$/.test(name) ? `App-Stand ${name.slice(3, 11)}` : name.startsWith('noten-pdfjs-') ? 'PDF-Anzeige' : name === 'ueben-erinnerung' ? 'Übe-Erinnerung' : name;
      out.push({ name, titel, dateien: keys.length, bytes });
    }
    this.cacheListe.set(out);
  }
  protected async updateSuchen(): Promise<void> {
    this.suchtUpdate.set(true);
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (!reg) {
        this.meldung.set('Ohne Service Worker – die Seite lädt immer die neueste Version.');
        return;
      }
      await reg.update();
      this.meldung.set(reg.installing || reg.waiting ? 'Neue Version wird geladen – gleich erscheint „Neue Version verfügbar“, dann „Neu laden“ antippen.' : 'Die App ist auf dem neuesten Stand ✓');
    } catch {
      this.meldung.set('Nicht erreichbar – ohne Netz lässt sich nicht nach einer neuen Version suchen.');
    } finally {
      this.suchtUpdate.set(false);
    }
  }
  protected async offlineLeeren(e: Event): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Seiten für unterwegs leeren? Ohne Netz ist Backstage dann erst nach dem nächsten Besuch mit Netz wieder da.')) return;
    await cacheLeeren();
    this.cacheListe.set([]);
    this.appStand.set('');
    this.meldung.set('Seiten für unterwegs geleert ✓');
    void this.platzLesen();
    this.geaendert.emit();
  }

  // Backup: Zeitpunkt des letzten auf diesem Gerät, älter als 30 Tage = Hinweis
  protected readonly backup = signal(Number(lesen(GESICHERT_KEY)) || 0);
  protected readonly backupAlt = computed(() => !this.backup() || Date.now() - this.backup() > 30 * 864e5);

  constructor() {
    void this.platzLesen();
    void this.appLesen();
  }

  /** alles Wichtige dieses Geräts als Text (ohne Konto-Adresse, ohne Schlüssel) – in die Zwischenablage */
  protected async diagnoseKopieren(): Promise<void> {
    await Promise.all([this.platzLesen(), this.appLesen()]);
    const e = syncEinstellungen();
    const p = this.platz();
    const l = this.sync.letzter();
    const ja = (b: unknown) => (b ? 'ja' : 'nein');
    const installiert = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
    const zeilen = [
      `Blickfeld Nord – Diagnose (${datum(Date.now())})`,
      `App-Stand: ${this.appStand() || 'unbekannt'} · Service Worker: ${ja(navigator.serviceWorker?.controller)}`,
      `Gerät: ${geraetName() || standardName(navigator.userAgent)} (Kennung ${geraetId()}) · installiert: ${ja(installiert)} · online: ${ja(navigator.onLine)}`,
      `Browser: ${navigator.userAgent}`,
      `Speicher: ${p ? `${mb(p.belegt)}${p.erlaubt ? ' von ' + mb(p.erlaubt) : ''} · dauerhaft: ${p.dauerhaft === undefined ? 'unbekannt' : ja(p.dauerhaft)}` : 'unbekannt'}`,
      `Synchronisation: eingerichtet ${ja(this.sync.bereit())} · lokal ${e.lokal} · Richtung ${e.richtung} · automatisch ${ja(e.auto)} · Anmeldung nötig ${ja(this.sync.anmeldungNoetig())}`,
      `Letzter Abgleich: ${l ? `${datum(Date.parse(l.zeit))}: ${l.text}` : 'noch nie'}`,
      `Wartet aufs Hochladen: ${this.sync.ausstehend()} · Noten ohne eindeutigen Song: ${offeneNoten().length}`,
      `Unterbrochene Downloads: ${localStorage.getItem('bn-sync-unterbrochen') ?? 'keine'}`,
      `Geräte: ${this.sync.geraete().map((g) => `${g.name} (${g.id}, ${seitText(g.zeit)})`).join('; ') || 'keine'}${this.sync.geraeteUnlesbar().length ? ` · nicht lesbar: ${this.sync.geraeteUnlesbar().join(', ')}` : ''}`,
      ...spotifyLage().map((z) => `Spotify: ${z}`),
      ...(spotifyProtokoll().length ? ['Spotify-Protokoll (zuletzt):', ...spotifyProtokoll().slice(-20)] : []),
    ];
    const text = zeilen.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      this.meldung.set('Diagnose kopiert ✓ – zum Beispiel in eine Nachricht einfügen.');
    } catch {
      window.prompt('Diagnose (kopieren):', text);
    }
  }

  /** aufgeklappt: merken und Teures erst jetzt lesen */
  protected auf(id: string, e: Event): void {
    const an = (e.target as HTMLDetailsElement).open;
    this.offen.update((o) => {
      const neu = new Set(o);
      if (an) neu.add(id);
      else neu.delete(id);
      return neu;
    });
    if (!an) return;
    if (id === 'kopie' && !this.kopie()) void this.kopieLesen();
    if (id === 'app' && !this.cacheListe()) void this.cachesMessen().catch(() => this.cacheListe.set([]));
    if (id === 'speicher') void this.platzLesen();
  }
}
