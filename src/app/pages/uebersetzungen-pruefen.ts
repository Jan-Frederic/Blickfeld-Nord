import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BackstageNav } from './backstage-nav';
import { BackstageUebersetzungen } from './backstage-uebersetzungen';
import { UiTextePruefen } from './ui-texte-pruefen';
import { BandService } from '../data/band.service';
import { UEBERSETZUNGEN, Uebersetzung } from '../data/uebersetzungen';
import { Entscheidung, Pruefung, Sprache, patchSource } from '../data/uebersetzungen-patch';

// Übersetzungen gegenlesen ohne Code: Original und Übersetzung nebeneinander, korrigieren, „passt“ anklicken.
// Die Entscheidungen bleiben im Browser, bis sie übernommen werden: Entweder erzeugt die Seite die geänderte
// Datei src/app/data/uebersetzungen.ts für den GitHub-Editor (aktueller Stand wird von GitHub geladen und nur die
// geprüften Einträge werden ersetzt) – oder sie fasst alles als Nachricht zusammen (für Helfer ohne GitHub-Konto).
const RAW_URL = 'https://raw.githubusercontent.com/Jan-Frederic/Blickfeld-Nord/main/src/app/data/uebersetzungen.ts';
const EDIT_URL = 'https://github.com/Jan-Frederic/Blickfeld-Nord/edit/main/src/app/data/uebersetzungen.ts';
const STORAGE_KEY = 'bn-uebersetzung-pruefung';

function load(): Pruefung {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '');
    if (v?.en && v?.nl) return v;
  } catch {
    // leer oder privat
  }
  return { en: {}, nl: {} };
}

@Component({
  selector: 'app-uebersetzungen-pruefen',
  imports: [MatIconModule, BackstageNav, BackstageUebersetzungen, UiTextePruefen],
  template: `
    <section class="section">
      <app-backstage-nav />
      <p class="kicker">Backstage</p>
      <h2>Übersetzungen prüfen</h2>
      <p class="lead">
        Links steht der deutsche Text, rechts die Übersetzung. Bei Bedarf korrigieren und <strong>„Passt“</strong> anklicken.
        Alles bleibt in diesem Browser gespeichert, bis ihr es unten übernehmt.
      </p>

      <app-backstage-uebersetzungen />

      <div class="controls">
        <div class="seg" role="group" aria-label="Sprache">
          <button type="button" [class.on]="lang() === 'en'" (click)="lang.set('en')">Englisch</button>
          <button type="button" [class.on]="lang() === 'nl'" (click)="lang.set('nl')">Niederländisch</button>
        </div>
        <div class="seg" role="group" aria-label="Filter">
          <button type="button" [class.on]="nurOffen()" (click)="nurOffen.set(true)">Noch offen</button>
          <button type="button" [class.on]="!nurOffen()" (click)="nurOffen.set(false)">Alle</button>
        </div>
        <input type="search" placeholder="Suchen …" aria-label="Suchen" [value]="suche()" (input)="suche.set($any($event.target).value)" />
      </div>
      <p class="progress">{{ geprueftAnzahl() }} von {{ alle.length }} gegengelesen ({{ lang() === 'en' ? 'Englisch' : 'Niederländisch' }})</p>

      <ol class="list">
        @for (u of sichtbar(); track u.de) {
          @let d = entscheidung(u);
          <li [class.ok]="d.ok">
            <span class="where">{{ herkunft(u.de) }}</span>
            <div class="pair">
              <p class="de" lang="de">{{ u.de }}</p>
              <textarea [attr.lang]="lang()" [value]="d.text" [attr.aria-label]="'Übersetzung von: ' + u.de" rows="2" (input)="aendern(u, $any($event.target).value)"></textarea>
            </div>
            <div class="actions">
              <button type="button" class="pass" [class.on]="d.ok" (click)="passt(u, !d.ok)">
                <mat-icon>{{ d.ok ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon> Passt
              </button>
              @if (d.text !== u[lang()]) { <span class="changed">geändert</span> }
              @if (lokal(u)) { <button type="button" class="link" (click)="zuruecksetzen(u)">zurücksetzen</button> }
            </div>
          </li>
        } @empty {
          <li class="empty">Nichts mehr offen – alles gegengelesen.</li>
        }
      </ol>

      <div class="apply" [class.sticky]="offeneAenderungen() > 0">
        <p><strong>{{ offeneAenderungen() }}</strong> Entscheidung(en) noch nicht übernommen.</p>
        <div class="buttons">
          <button type="button" class="primary" [disabled]="!offeneAenderungen() || busy()" (click)="fuerGithub()">
            <mat-icon>code</mat-icon> Datei für GitHub erzeugen
          </button>
          <button type="button" [disabled]="!offeneAenderungen()" (click)="alsNachricht()"><mat-icon>share</mat-icon> Als Nachricht schicken</button>
          <button type="button" class="link" [disabled]="!offeneAenderungen()" (click)="leeren()">Liste leeren</button>
        </div>
        @if (meldung()) { <p class="msg" role="status">{{ meldung() }}</p> }
        @if (datei()) {
          <ol class="steps">
            <li>Die geänderte Datei ist kopiert.</li>
            <li><a [href]="editUrl" target="_blank" rel="noopener">Datei auf GitHub öffnen</a>, mit Strg+A alles markieren und einfügen.</li>
            <li>„Commit changes“ – nach ein paar Minuten sind die Hinweise auf der Seite weg. Danach hier „Liste leeren“.</li>
          </ol>
        }
      </div>
      <app-ui-texte-pruefen />
    </section>
  `,
  styles: `
    .controls { display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0 8px; }
    .seg { display: inline-flex; border: 1px solid var(--bn-line); border-radius: 999px; overflow: hidden; }
    .seg button { padding: 8px 14px; border: 0; background: none; color: var(--bn-ink); font: inherit; font-size: .88rem; cursor: pointer; }
    .seg button.on { background: var(--bn-sunset); color: #2a1708; }
    input[type=search] { flex: 1 1 180px; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--bn-line); background: #1b1e22; color: var(--bn-ink); font: inherit; }
    .progress { color: var(--bn-fog); font-size: .85rem; margin: 0 0 16px; }
    .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
    .list > li { padding: 14px; border-radius: 10px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    .list > li.ok { border-color: rgba(95, 184, 138, .5); }
    .where { font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; color: var(--bn-fog); }
    .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 6px; }
    .de { margin: 0; line-height: 1.5; }
    textarea { width: 100%; box-sizing: border-box; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--bn-line); background: #15171c; color: var(--bn-ink); font: inherit; line-height: 1.5; resize: vertical; field-sizing: content; }
    .actions { display: flex; align-items: center; gap: 12px; margin-top: 8px; font-size: .85rem; }
    .pass { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; cursor: pointer; }
    .pass.on { border-color: #5fb88a; color: #5fb88a; }
    .changed { color: #e0b25a; }
    .link { border: 0; background: none; color: var(--bn-fog); text-decoration: underline; font: inherit; cursor: pointer; }
    .apply { margin-top: 20px; padding: 14px 16px; border-radius: 12px; border: 1px solid var(--bn-line); background: #1b1e22; }
    .apply p { margin: 0 0 10px; }
    .buttons { display: flex; flex-wrap: wrap; gap: 8px; }
    .buttons button:not(.link) { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; cursor: pointer; }
    .buttons .primary { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    button:disabled { opacity: .45; cursor: default; }
    .msg { margin-top: 10px; color: var(--bn-fog); }
    .steps { margin: 10px 0 0; padding-left: 20px; line-height: 1.6; }
    .steps a { color: var(--bn-sunset); }
    .apply.sticky { position: sticky; bottom: 0; }
    @media (max-width: 700px) {
      .pair { grid-template-columns: 1fr; }
      h2 { font-size: 1.5rem; }
      .apply.sticky { position: static; }
    }
  `,
})
export class UebersetzungenPruefen {
  private readonly band = inject(BandService);
  protected readonly alle = UEBERSETZUNGEN;
  protected readonly editUrl = EDIT_URL;
  protected readonly lang = signal<Sprache>('en');
  protected readonly nurOffen = signal(true);
  protected readonly suche = signal('');
  protected readonly pruefung = signal<Pruefung>(load());
  protected readonly busy = signal(false);
  protected readonly meldung = signal('');
  protected readonly datei = signal(false);

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.pruefung()));
      } catch {
        // privat – dann nur für diese Sitzung
      }
    });
  }

  protected entscheidung(u: Uebersetzung): Entscheidung {
    return this.pruefung()[this.lang()][u.de] ?? { text: u[this.lang()], ok: !!u.geprueft?.[this.lang()] };
  }
  protected lokal(u: Uebersetzung): boolean {
    return !!this.pruefung()[this.lang()][u.de];
  }

  protected readonly sichtbar = computed(() => {
    const lang = this.lang();
    const s = this.suche().trim().toLowerCase();
    const p = this.pruefung()[lang];
    return this.alle.filter(
      (u) =>
        (!this.nurOffen() || !(p[u.de]?.ok ?? u.geprueft?.[lang])) &&
        (!s || u.de.toLowerCase().includes(s) || u[lang].toLowerCase().includes(s)),
    );
  });
  protected readonly geprueftAnzahl = computed(() => {
    const lang = this.lang();
    const p = this.pruefung()[lang];
    return this.alle.filter((u) => p[u.de]?.ok ?? u.geprueft?.[lang]).length;
  });
  protected readonly offeneAenderungen = computed(() => Object.keys(this.pruefung().en).length + Object.keys(this.pruefung().nl).length);

  private setze(u: Uebersetzung, patch: Partial<Entscheidung>): void {
    const lang = this.lang();
    this.pruefung.update((p) => ({ ...p, [lang]: { ...p[lang], [u.de]: { ...this.entscheidung(u), ...patch } } }));
  }
  protected aendern(u: Uebersetzung, text: string): void {
    this.setze(u, { text });
  }
  protected passt(u: Uebersetzung, ok: boolean): void {
    this.setze(u, { ok });
  }
  protected zuruecksetzen(u: Uebersetzung): void {
    const lang = this.lang();
    this.pruefung.update((p) => {
      const rest = { ...p[lang] };
      delete rest[u.de];
      return { ...p, [lang]: rest };
    });
  }
  protected leeren(): void {
    if (!confirm('Alle noch nicht übernommenen Entscheidungen verwerfen?')) return;
    this.pruefung.set({ en: {}, nl: {} });
    this.datei.set(false);
    this.meldung.set('');
  }

  /** woher der Text stammt – Orientierung beim Gegenlesen */
  protected herkunft(de: string): string {
    const b = this.band;
    const m = b.members.find((x) => [x.role, x.bio, x.tagline, x.photo?.alt, ...(x.story ?? [])].includes(de));
    if (m) return `Band · ${m.name}`;
    const h = b.history.find((x) => [x.title, ...x.text, ...(x.images ?? []).map((i) => i.alt)].includes(de));
    if (h) return `Historie · ${h.date}`;
    if (b.photos.some((x) => x.alt === de || x.caption === de)) return 'Galerie';
    if (b.friends.some((x) => x.description === de)) return 'Freunde';
    if (de === 'Private Feier' || b.shows.some((x) => x.publicName === de)) return 'Auftritte';
    return 'Technik';
  }

  protected async fuerGithub(): Promise<void> {
    this.busy.set(true);
    this.meldung.set('');
    try {
      const res = await fetch(`${RAW_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const { text, missing } = patchSource(await res.text(), this.pruefung());
      await navigator.clipboard.writeText(text);
      this.datei.set(true);
      if (missing.length) this.meldung.set(`${missing.length} Text(e) stehen nicht mehr in der Datei (deutsches Original geändert) und wurden übersprungen.`);
    } catch {
      this.meldung.set('GitHub ist gerade nicht erreichbar oder das Kopieren klappt nicht. Alternativ „Als Nachricht schicken“.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async alsNachricht(): Promise<void> {
    const p = this.pruefung();
    const zeilen: string[] = ['Übersetzungen gegengelesen (Blickfeld Nord):', ''];
    for (const lang of ['en', 'nl'] as const) {
      const eintraege = Object.entries(p[lang]);
      if (!eintraege.length) continue;
      zeilen.push(lang === 'en' ? '— Englisch —' : '— Niederländisch —');
      for (const [de, d] of eintraege) {
        const original = this.alle.find((u) => u.de === de)?.[lang];
        zeilen.push(`DE: ${de}`, d.text !== original ? `NEU: ${d.text}` : 'unverändert', d.ok ? '✓ passt' : '✗ noch nicht ok', '');
      }
    }
    const text = zeilen.join('\n');
    try {
      if (navigator.share) await navigator.share({ title: 'Übersetzungen', text });
      else {
        await navigator.clipboard.writeText(text);
        this.meldung.set('Text kopiert – z. B. per WhatsApp oder E-Mail an Fred schicken.');
      }
    } catch {
      // Teilen abgebrochen
    }
  }
}
