import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService, Show } from '../data/band.service';
import { Kontakt, angefragtSetzen, anfrageText, kontaktSpeichern, ladeKontakte, nachrichtLink, nachrichtSenden, ortKey } from '../data/kontakte';
import { saison } from '../data/saison';

// Backstage → Termine → Kontakte (/backstage/termine/kontakte): alle Ansprechpartner der Veranstalter auf einen Blick –
// Ort, letzter bzw. nächster Auftritt, WhatsApp, E-Mail, Anfrage (mit „angefragt am“, Nachfrage nach 14 Tagen unter
// Heute fällig). Neue Veranstalter ohne Auftritt lassen sich anlegen. Nur auf den Geräten und im OneDrive (bn-kontakte).
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const datum = (d: string) => d.split('-').reverse().join('.');

interface Zeile {
  key: string;
  k: Kontakt;
  ort: string;
  stadt: string;
  zuletzt?: Show;
  naechster?: Show;
}

@Component({
  selector: 'app-termine-kontakte',
  imports: [RouterLink, MatIconModule],
  template: `
    <section class="section termine-kontakte">
      <a class="back" routerLink="/backstage/termine"><mat-icon>arrow_back</mat-icon> Termine</a>
      <p class="kicker">Backstage · Termine</p>
      <h2>Kontakte</h2>
      <p class="lead">Ansprechpartner der Veranstalter – nur auf euren Geräten und im OneDrive, nie auf der Website.
        Anfragen werden mit Datum gemerkt; kommt nach 14 Tagen kein Termin zustande, erinnert „Heute fällig“ ans Nachfragen.</p>

      <ul class="kontakte">
        @for (z of zeilen(); track z.key) {
          <li>
            <div class="kopf">
              <strong>{{ z.ort }}</strong>@if (z.stadt) { <span class="a">, {{ z.stadt }}</span> }
              @if (z.k.name) { <span class="name">· {{ z.k.name }}</span> }
            </div>
            <div class="info">
              @if (z.naechster) { <span class="gut">nächster Auftritt {{ datumText(z.naechster.date) }}</span> }
              @else if (z.zuletzt) { <span>zuletzt {{ datumText(z.zuletzt.date) }}</span> } @else { <span>noch kein Auftritt</span> }
              @if (z.k.angefragt) { <span class="angefragt">· angefragt am {{ datumText(z.k.angefragt) }} <button type="button" class="link" (click)="beantwortet(z)">beantwortet</button></span> }
            </div>
            <div class="knoepfe">
              @if (z.k.telefon) { <a class="btn" [href]="wa(z)" target="_blank" rel="noopener"><mat-icon>chat</mat-icon> WhatsApp</a> }
              @if (z.k.mail) { <a class="btn" [href]="'mailto:' + z.k.mail"><mat-icon>mail</mat-icon> E-Mail</a> }
              <button type="button" class="btn" (click)="anfragen(z)"><mat-icon>send</mat-icon> {{ kopiert() === z.key ? 'Kopiert!' : 'Anfrage schreiben' }}</button>
              @if (z.zuletzt || z.naechster) { <a class="btn" [routerLink]="'/backstage/' + band.showId((z.naechster ?? z.zuletzt)!)"><mat-icon>event</mat-icon> Auftritt</a> }
              <button type="button" class="btn leise" (click)="loeschen(z)" [attr.aria-label]="'Kontakt ' + z.ort + ' löschen'"><mat-icon>delete</mat-icon></button>
            </div>
          </li>
        } @empty {
          <li class="leer">Noch keine Kontakte – beim Auftritt unter „Ansprechpartner“ eintragen oder hier neu anlegen.</li>
        }
      </ul>

      <details class="neu">
        <summary><mat-icon>person_add</mat-icon> Neuer Veranstalter</summary>
        <form (submit)="$event.preventDefault(); anlegen(o.value, st.value, n.value, t.value, m.value); o.value = ''; st.value = ''; n.value = ''; t.value = ''; m.value = ''">
          <label>Ort / Veranstaltung <input #o required placeholder="z. B. Café Nenna" /></label>
          <label>Stadt <input #st placeholder="z. B. Rhede" /></label>
          <label>Name <input #n placeholder="Ansprechpartner" /></label>
          <label>WhatsApp / Telefon <input #t type="tel" /></label>
          <label>E-Mail <input #m type="email" /></label>
          <button type="submit" class="btn"><mat-icon>add</mat-icon> Anlegen</button>
        </form>
      </details>
    </section>
  `,
  styles: `
    .termine-kontakte { max-width: 1000px; }
    .back { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 14px; color: var(--bn-fog); text-decoration: none; font-size: .9rem; }
  `,
})
export class TermineKontakte {
  protected readonly band = inject(BandService);
  private readonly heute = new Date().toISOString().slice(0, 10);
  private readonly stand = signal(0);
  protected readonly kopiert = signal('');
  protected readonly datumText = datum;

  protected readonly zeilen = computed<Zeile[]>(() => {
    this.stand();
    const alle = ladeKontakte();
    return Object.entries(alle)
      .map(([key, k]) => {
        const shows = this.band.shows.filter((s) => ortKey(s) === key);
        const zuletzt = shows.filter((s) => (s.endDate ?? s.date) < this.heute).at(-1);
        const naechster = shows.find((s) => (s.endDate ?? s.date) >= this.heute);
        const bekannt = naechster ?? zuletzt;
        return { key, k, zuletzt, naechster, ort: k.ort || bekannt?.venue || key.split('|')[1], stadt: k.stadt || bekannt?.city || key.split('|')[0] };
      })
      .sort((a, b) => a.ort.localeCompare(b.ort, 'de'));
  });

  protected wa(z: Zeile): string {
    return nachrichtLink({ telefon: z.k.telefon }, '', `Hallo${z.k.name ? ' ' + z.k.name : ''},`) ?? '';
  }

  /** freie Monate (ab übernächstem) für die Anfrage */
  private freieMonate(): string[] {
    return saison(this.band.shows, this.heute)
      .slice(2)
      .filter((m) => !m.shows.length)
      .map((m) => MONATE[Number(m.monat.slice(5, 7)) - 1])
      .slice(0, 4);
  }

  protected async anfragen(z: Zeile): Promise<void> {
    const text = z.zuletzt
      ? anfrageText(z.zuletzt, z.k, this.freieMonate())
      : [
          `Hallo${z.k.name ? ' ' + z.k.name : ''},`,
          '',
          `wir sind Blickfeld Nord – ein Power-Trio aus dem Münsterland mit Pop, Rock, Schlager und Party zum Mitsingen. Hättet ihr Lust auf Livemusik bei ${z.ort}?`,
          ...(this.freieMonate().length ? ['', `Noch frei sind wir zum Beispiel ${this.freieMonate().join(', ')}.`] : []),
          '',
          'Alles über uns, mit Technik und Hörproben: https://blickfeld-nord.de/booking/',
          '',
          'Viele Grüße',
          'Blickfeld Nord',
        ].join('\n');
    const weg = await nachrichtSenden(z.k, `Anfrage Blickfeld Nord – ${z.ort}`, text);
    if (weg === 'abgebrochen') return;
    angefragtSetzen(z.key, this.heute);
    if (weg === 'kopiert') {
      this.kopiert.set(z.key);
      setTimeout(() => this.kopiert.set(''), 2000);
    }
    this.stand.update((n) => n + 1);
  }

  protected beantwortet(z: Zeile): void {
    angefragtSetzen(z.key, null);
    this.stand.update((n) => n + 1);
  }

  protected loeschen(z: Zeile): void {
    if (!confirm(`Kontakt „${z.ort}“ löschen?`)) return;
    kontaktSpeichern(z.key, {});
    this.stand.update((n) => n + 1);
  }

  protected anlegen(ort: string, stadt: string, name: string, telefon: string, mail: string): void {
    if (!ort.trim()) return;
    const key = ortKey({ venue: ort.trim(), city: stadt.trim() || undefined });
    kontaktSpeichern(key, { ...(ladeKontakte()[key] ?? {}), ort: ort.trim(), stadt: stadt.trim(), name, telefon, mail });
    this.stand.update((n) => n + 1);
  }
}
