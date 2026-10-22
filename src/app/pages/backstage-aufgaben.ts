import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BackstageNav } from './backstage-nav';
import { BandService } from '../data/band.service';
import { AUFGABEN, Aufgabe } from '../data/aufgaben';
import { UEBERSETZUNGEN } from '../data/uebersetzungen';
import technik from '../data/technik.json';

// Backstage → Aufgaben: Checkliste für die Website. Oben, was die Seite selbst aus den Daten erkennt (offene
// Termine, fehlende Bios, offene Technik-Angaben, ungeprüfte Übersetzungen) – das hakt sich von allein ab.
// Darunter die von Hand gepflegten Aufgaben aus src/app/data/aufgaben.ts; abhaken gilt dort nur für dieses Gerät,
// für alle per `erledigt: true` in der Datei.
const STORAGE_KEY = 'bn-aufgaben';
const EDIT_URL = 'https://github.com/Jan-Frederic/Blickfeld-Nord/edit/main/src/app/data/aufgaben.ts';

interface AutoAufgabe {
  text: string;
  /** Einzelheiten, z. B. welche Termine oder Geräte */
  details: string[];
  link: string;
  icon: string;
}

@Component({
  selector: 'app-backstage-aufgaben',
  imports: [RouterLink, MatIconModule, BackstageNav],
  template: `
    <section class="section">
      <app-backstage-nav />
      <p class="kicker">Backstage</p>
      <h2>Aufgaben</h2>
      <p class="lead">Was an der Website noch zu tun ist – {{ offen() }} offen.</p>

      <h3>Aus den Daten erkannt</h3>
      <p class="note">Diese Punkte verschwinden von selbst, sobald die Angaben eingetragen sind.</p>
      @if (auto().length) {
        <ul class="list">
          @for (a of auto(); track a.text) {
            <li class="item">
              <mat-icon class="state open" aria-hidden="true">{{ a.icon }}</mat-icon>
              <div class="body">
                <a class="title" [routerLink]="a.link">{{ a.text }}</a>
                @if (a.details.length) {
                  <ul class="details">
                    @for (d of a.details.slice(0, MAX_DETAILS); track d) { <li>{{ d }}</li> }
                    @if (a.details.length > MAX_DETAILS) { <li>… und {{ a.details.length - MAX_DETAILS }} weitere</li> }
                  </ul>
                }
              </div>
            </li>
          }
        </ul>
      } @else {
        <p class="empty"><mat-icon aria-hidden="true">task_alt</mat-icon> Alles eingetragen.</p>
      }

      @for (g of gruppen(); track g.bereich) {
        <h3>{{ g.bereich }}</h3>
        <ul class="list">
          @for (a of g.aufgaben; track a.id) {
            <li class="item" [class.done]="fertig(a)">
              <label class="check">
                <input type="checkbox" [checked]="fertig(a)" [disabled]="a.erledigt" (change)="toggle(a)" />
                <span class="title">{{ a.text }}</span>
              </label>
              <span class="tag" [class.kann]="a.art === 'kann'">{{ a.art === 'muss' ? 'Muss' : 'Kann' }}</span>
              @if (a.hinweis || a.link) {
                <p class="hint">
                  {{ a.hinweis }}
                  @if (a.link) { <a [routerLink]="a.link">Öffnen</a> }
                </p>
              }
            </li>
          }
        </ul>
      }

      <p class="foot">
        Abhaken gilt nur auf diesem Gerät. Für alle erledigt: bei der Aufgabe <code>erledigt: true</code> ergänzen
        oder die Zeile löschen, in <a [href]="editUrl" target="_blank" rel="noopener">src/app/data/aufgaben.ts</a>.
        Dort kommen auch neue Aufgaben dazu.
      </p>
    </section>
  `,
  styles: `
    h3 { margin: 32px 0 8px; font-family: var(--bn-wide); font-weight: 400; text-transform: uppercase; letter-spacing: .14em; font-size: .85rem; }
    .note, .foot { font-size: .85rem; color: var(--bn-fog); margin: 0 0 12px; line-height: 1.6; }
    .foot { margin-top: 32px; }
    .foot a, .hint a { color: var(--bn-sunset); }
    code { font-size: .85em; }
    .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    .item {
      display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; align-items: start;
      padding: 12px 16px; border: 1px solid var(--bn-line); border-radius: 10px;
    }
    .item:has(.state) { grid-template-columns: auto 1fr; }
    .state { font-size: 20px; width: 20px; height: 20px; color: #e0b25a; }
    .title { line-height: 1.5; color: var(--bn-ink); }
    a.title { text-decoration: underline; text-underline-offset: 3px; }
    a.title:hover { color: var(--bn-sunset); }
    .details { margin: 6px 0 0; padding-left: 18px; font-size: .85rem; line-height: 1.6; color: var(--bn-fog); }
    .check { display: flex; gap: 10px; align-items: flex-start; cursor: pointer; }
    .check input { width: 18px; height: 18px; margin: 3px 0 0; accent-color: var(--bn-sunset); flex: none; }
    .tag { font-size: .72rem; padding: 2px 8px; border-radius: 999px; border: 1px solid #e0b25a; color: #e0b25a; }
    .tag.kann { border-color: var(--bn-line); color: var(--bn-fog); }
    .hint { grid-column: 1 / -1; margin: 0 0 0 28px; font-size: .85rem; line-height: 1.6; color: var(--bn-fog); }
    .done .title { text-decoration: line-through; color: var(--bn-fog); }
    .empty { display: flex; gap: 8px; align-items: center; padding: 12px 16px; border: 1px dashed var(--bn-line); border-radius: 10px; color: #5fb88a; }
  `,
})
export class BackstageAufgaben {
  private readonly band = inject(BandService);
  private readonly datePipe = new DatePipe('de');
  protected readonly editUrl = EDIT_URL;
  // längere Listen (z. B. alle Proben) gekürzt anzeigen
  protected readonly MAX_DETAILS = 6;
  private readonly heute = new Date().toISOString().slice(0, 10);

  // auf diesem Gerät abgehakt (ids)
  protected readonly lokal = signal<string[]>(this.laden());

  protected readonly auto = computed<AutoAufgabe[]>(() => {
    const out: AutoAufgabe[] = [];
    const datum = (d: string) => this.datePipe.transform(d, 'dd.MM.yyyy') ?? d;

    const offeneTermine = this.band.shows.filter((s) => !s.confirmed && (s.endDate ?? s.date) >= this.heute);
    if (offeneTermine.length)
      out.push({
        text: `${offeneTermine.length} ${offeneTermine.length === 1 ? 'Auftritt' : 'Auftritte'} noch nicht geklärt`,
        details: offeneTermine.map((s) => `${datum(s.date)} – ${s.venue}${s.city ? ', ' + s.city : ''}`),
        link: '/backstage/termine',
        icon: 'event_busy',
      });

    const proben = this.band.rehearsals.filter((r) => r.date >= this.heute && (!r.endTime || !r.place));
    if (proben.length)
      out.push({
        text: `${proben.length} ${proben.length === 1 ? 'Probe' : 'Proben'} ohne Endzeit oder Ort`,
        details: proben.map((r) => `${datum(r.date)}: ${[!r.endTime && 'Ende', !r.place && 'Ort'].filter(Boolean).join(' und ')} fehlt`),
        link: '/backstage/termine',
        icon: 'music_note',
      });

    // Auftritte, die in eine Abwesenheit fallen
    const konflikte = this.band.shows.flatMap((s) =>
      this.band.abwesenheiten
        .filter((a) => (s.endDate ?? s.date) >= this.heute && a.von <= (s.endDate ?? s.date) && s.date <= (a.bis ?? a.von))
        .map((a) => `${datum(s.date)} – ${s.venue}: ${a.wer} ist nicht da`),
    );
    if (konflikte.length)
      out.push({ text: `${konflikte.length} ${konflikte.length === 1 ? 'Auftritt fällt' : 'Auftritte fallen'} in eine Abwesenheit`, details: konflikte, link: '/backstage/termine', icon: 'event_busy' });

    // Werbung: öffentliche, geklärte Auftritte in den nächsten 4 Wochen
    const bald = new Date(Date.now() + 28 * 864e5).toISOString().slice(0, 10);
    for (const s of this.band.shows.filter((x) => x.confirmed && !x.private && x.date >= this.heute && x.date <= bald))
      out.push({
        text: `Werbung: Plakat und Story für ${s.venue} (${datum(s.date)}) teilen`,
        details: ['Erinnerung bis zum Auftritt – Plakat, Story und Instagram-Text auf der Seite des Auftritts'],
        link: `/backstage/${this.band.showId(s)}`,
        icon: 'campaign',
      });

    // Rückblick fehlt: geklärte Auftritte der letzten 12 Monate ohne Historie-Eintrag am selben Tag
    const vorEinemJahr = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
    const ohneRueckblick = this.band.shows.filter(
      (s) => s.confirmed && (s.endDate ?? s.date) < this.heute && s.date >= vorEinemJahr && !this.band.history.some((h) => h.date === s.date && !h.example),
    );
    if (ohneRueckblick.length)
      out.push({
        text: `Rückblick fehlt für ${ohneRueckblick.length} ${ohneRueckblick.length === 1 ? 'Auftritt' : 'Auftritte'}`,
        details: ohneRueckblick.map((s) => `${datum(s.date)} – ${s.private ? s.publicName ?? 'Private Feier' : s.venue}`),
        link: '/historie',
        icon: 'history_edu',
      });

    // Fotos ohne Fotografen-Angabe (Galerie und Historie)
    const ohneCredit = [...new Set([
      ...this.band.photos.filter((p) => !p.credit).map((p) => p.caption ?? p.alt),
      ...this.band.history.flatMap((h) => (h.images ?? []).filter((i) => !i.credit).map(() => `Historie: ${h.title}`)),
    ])];
    if (ohneCredit.length)
      out.push({ text: `${ohneCredit.length} ${ohneCredit.length === 1 ? 'Foto' : 'Fotos'} ohne Fotografen-Angabe`, details: ohneCredit, link: '/galerie', icon: 'photo_camera' });

    const ohneBio = this.band.members.filter((m) => !m.story?.length);
    if (ohneBio.length)
      out.push({
        text: `Ausführliche Bio fehlt: ${ohneBio.map((m) => m.nickname ?? m.name.split(' ')[0]).join(', ')}`,
        details: ['„story“ beim Bandmitglied in src/app/data/band.service.ts'],
        link: `/band/${ohneBio[0].slug}`,
        icon: 'person',
      });

    const hardware = technik.hardware as Record<string, { kategorie: string; modell: string | null }>;
    const technikOffen = [
      ...Object.entries(hardware).filter(([k, h]) => !k.startsWith('setup-') && !h.modell).map(([, h]) => `${h.kategorie}: Modell`),
      ...technik.kanaele.filter((k) => k.art !== 'DI' && !k.geraet).map((k) => `Kanal ${k.kanal} (${k.quelle}): Mikrofon`),
    ];
    if (technikOffen.length)
      out.push({ text: `${technikOffen.length} offene Technik-Angaben`, details: technikOffen, link: '/technik', icon: 'speaker' });

    for (const [lang, name] of [['en', 'englische'], ['nl', 'niederländische']] as const) {
      const n = UEBERSETZUNGEN.filter((u) => !u.geprueft?.[lang]).length;
      if (n) out.push({ text: `${n} ${name} ${n === 1 ? 'Übersetzung' : 'Übersetzungen'} noch nicht gegengelesen`, details: [], link: '/backstage/uebersetzungen', icon: 'translate' });
    }

    if (!this.band.instagramPosts.length)
      out.push({ text: 'Optional: Instagram-Beiträge für die Startseite eintragen', details: ['instagramPosts in src/app/data/band.service.ts'], link: '/', icon: 'photo_camera' });

    return out;
  });

  // von Hand gepflegte Aufgaben nach Bereich, offene zuerst
  protected readonly gruppen = computed(() => {
    const bereiche = [...new Set(AUFGABEN.map((a) => a.bereich))];
    return bereiche.map((bereich) => ({
      bereich,
      aufgaben: AUFGABEN.filter((a) => a.bereich === bereich).sort((a, b) => Number(this.fertig(a)) - Number(this.fertig(b)) || (a.art === b.art ? 0 : a.art === 'muss' ? -1 : 1)),
    }));
  });

  protected readonly offen = computed(() => this.auto().length + AUFGABEN.filter((a) => !this.fertig(a)).length);

  protected fertig(a: Aufgabe): boolean {
    return !!a.erledigt || this.lokal().includes(a.id);
  }

  protected toggle(a: Aufgabe): void {
    const next = this.lokal().includes(a.id) ? this.lokal().filter((id) => id !== a.id) : [...this.lokal(), a.id];
    this.lokal.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ohne Speicher (privater Modus) gilt das Häkchen nur bis zum Neuladen
    }
  }

  private laden(): string[] {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  }
}
