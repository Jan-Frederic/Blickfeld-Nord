import { MONATE, datumText } from '../data/datum';

import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Zurueck } from '../zurueck';
import { BandService, Show } from '../data/band.service';
import { KontaktBewertung } from './kontakt-bewertung';
import { Kontakt, veranstalterRangliste, adressbuchDa, ausAdressbuch, bewertungSchwach, bewertungText, angefragtSetzen, anfrageText, kontaktSpeichern, ladeKontakte, nachrichtLink, nachrichtSenden, ortKey } from '../data/kontakte';
import { saison } from '../data/saison';
import { monatGesperrt } from '../data/schonzeit';
import { DokuLink } from './doku-link';

// Backstage → Termine → Kontakte (/backstage/termine/kontakte): alle Ansprechpartner der Veranstalter auf einen Blick –
// Ort, letzter bzw. nächster Auftritt, WhatsApp, E-Mail, Anfrage (mit „angefragt am“, Nachfrage nach 14 Tagen unter
// Heute fällig). Neue Veranstalter ohne Auftritt lassen sich anlegen. Nur auf den Geräten und im OneDrive (bn-kontakte).
const datum = (d: string) => datumText(d);

interface Zeile {
  key: string;
  k: Kontakt;
  ort: string;
  stadt: string;
  zuletzt?: Show;
  naechster?: Show;
  auftritte: number;
}

@Component({
  selector: 'app-termine-kontakte',
  imports: [DokuLink, Zurueck, RouterLink, MatIconModule, KontaktBewertung],
  template: `
    <section class="section termine-kontakte">
      <app-zurueck ziel="/backstage/termine" text="Termine" />
      <p class="kicker">Backstage · Termine</p>
      <h2>Kontakte</h2>
      <app-doku-link thema="kontakte" />
      <p class="lead">Ansprechpartner der Veranstalter – nur auf euren Geräten und im OneDrive, nie auf der Website.</p>

      <div class="sortierung" role="group" aria-label="Reihenfolge">
        <button type="button" [class.an]="sortierung() === 'name'" [attr.aria-pressed]="sortierung() === 'name'" (click)="sortierung.set('name')">Alphabetisch</button>
        <button type="button" [class.an]="sortierung() === 'lohnt'" [attr.aria-pressed]="sortierung() === 'lohnt'" (click)="sortierung.set('lohnt')"><mat-icon>star</mat-icon> Wo lohnt es sich wieder?</button>
      </div>

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
              @if (z.auftritte) { <span>· {{ z.auftritte }}× gespielt</span> }
              @if (z.k.angefragt) { <span class="angefragt">· angefragt am {{ datumText(z.k.angefragt) }} <button type="button" class="link" (click)="beantwortet(z)">beantwortet</button></span> }
            </div>
            <details class="bewerten">
              <summary [class.schwach]="schwach(z.k)">{{ bewertungText(z.k) || 'Bewerten: Technik, Publikum, Bezahlung' }}</summary>
              <app-kontakt-bewertung [key]="z.key" (geaendert)="stand.update(n => n + 1)" />
            </details>
            <div class="knoepfe">
              @if (z.k.telefon) { <a class="btn" [href]="wa(z)" target="_blank" rel="noopener"><mat-icon>chat</mat-icon> WhatsApp</a> }
              @if (z.k.mail) { <a class="btn" [href]="'mailto:' + z.k.mail"><mat-icon>mail</mat-icon> E-Mail</a> }
              <button type="button" class="btn" (click)="zusage(z)" title="Anfrage erledigt – neuen Auftritt mit Location und Ort vorbelegt eintragen"><mat-icon>event_available</mat-icon> Zusage → Auftritt eintragen</button>
              <button type="button" class="btn" (click)="anfragen(z)"><mat-icon>send</mat-icon> {{ kopiert() === z.key ? 'Kopiert!' : 'Anfrage schreiben' }}</button>
              @if (z.zuletzt || z.naechster) { <a class="btn" [routerLink]="'/backstage/' + band.showId((z.naechster ?? z.zuletzt)!)"><mat-icon>event</mat-icon> Auftritt</a> }
              <button type="button" class="btn" (click)="mappe(z)" [disabled]="mappeLaeuft() === z.key" title="Kontakt, Bewertung, Auftritte mit Setlist und Vor-Ort-Angaben – nur für die Band"><mat-icon>picture_as_pdf</mat-icon> {{ mappeLaeuft() === z.key ? 'Wird erstellt …' : 'Mappe' }}</button>
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
          @if (adressbuch) {
            <button type="button" class="btn" (click)="adressbuchFuellen(n, t, m)"><mat-icon>contacts</mat-icon> Aus dem Adressbuch</button>
          }
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
  protected readonly stand = signal(0);
  protected readonly sortierung = signal<'name' | 'lohnt'>('name');
  protected readonly bewertungText = bewertungText;
  protected readonly schwach = bewertungSchwach;
  protected readonly adressbuch = adressbuchDa();
  protected async adressbuchFuellen(n: HTMLInputElement, t: HTMLInputElement, m: HTMLInputElement): Promise<void> {
    const a = await ausAdressbuch();
    if (!a) return;
    if (a.name) n.value = a.name;
    if (a.telefon) t.value = a.telefon;
    if (a.mail) m.value = a.mail;
  }
  protected readonly kopiert = signal('');
  protected readonly datumText = datum;

  protected readonly zeilen = computed<Zeile[]>(() => {
    this.stand();
    const alle = ladeKontakte();
    const rangliste = veranstalterRangliste(alle, this.band.shows, this.heute);
    const rang = new Map(rangliste.map((r) => [r.key, r.auftritte]));
    const platz = new Map(rangliste.map((r, i) => [r.key, i]));
    const lohnt = this.sortierung() === 'lohnt';
    return Object.entries(alle)
      .map(([key, k]) => {
        const shows = this.band.shows.filter((s) => ortKey(s) === key);
        const zuletzt = shows.filter((s) => (s.endDate ?? s.date) < this.heute).at(-1);
        const naechster = shows.find((s) => (s.endDate ?? s.date) >= this.heute);
        const bekannt = naechster ?? zuletzt;
        return { key, k, zuletzt, naechster, auftritte: rang.get(key) ?? 0, ort: k.ort || bekannt?.venue || key.split('|')[1], stadt: k.stadt || bekannt?.city || key.split('|')[0] };
      })
      .sort((a, b) => (lohnt ? platz.get(a.key)! - platz.get(b.key)! : 0) || a.ort.localeCompare(b.ort, 'de'));
  });

  protected wa(z: Zeile): string {
    return nachrichtLink({ telefon: z.k.telefon }, '', `Hallo${z.k.name ? ' ' + z.k.name : ''},`) ?? '';
  }

  /** freie Monate (ab übernächstem) für die Anfrage */
  private freieMonate(): string[] {
    return saison(this.band.shows, this.heute)
      .slice(2)
      .filter((m) => !m.shows.length && !monatGesperrt(m.monat, this.band.sperrzeiten, this.band.shows))
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

  private readonly router = inject(Router);
  /** Zusage: Anfrage erledigt, Termin-Formular mit Location und Ort vorbelegt öffnen */
  protected zusage(z: Zeile): void {
    angefragtSetzen(z.key, null);
    void this.router.navigate(['/backstage/termine'], { queryParams: { neu: 'auftritt', ort: z.ort, stadt: z.stadt } });
  }

  protected beantwortet(z: Zeile): void {
    angefragtSetzen(z.key, null);
    this.stand.update((n) => n + 1);
  }

  // Veranstalter-Mappe (data/veranstalter-pdf.ts): pdf-lib erst beim Klick laden
  protected readonly mappeLaeuft = signal('');
  protected async mappe(z: Zeile): Promise<void> {
    this.mappeLaeuft.set(z.key);
    try {
      const [{ veranstalterPdf }, { loadSetlist, isPause }, { FIELDS, VORORT_PREFIX, loadVorOrt }] = await Promise.all([
        import('../data/veranstalter-pdf'),
        import('../data/setlist-data'),
        import('./vorort'),
      ]);
      const auftritte = this.band.shows
        .filter((s) => ortKey(s) === z.key)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((s) => {
          const id = this.band.showId(s);
          const vo = loadVorOrt(VORORT_PREFIX + id);
          return {
            titel: `${datumText(s.date)}${s.time ? ' · ' + s.time + ' Uhr' : ''} – ${s.venue}${s.confirmed ? '' : ' (offen)'}`,
            setlist: loadSetlist(id).filter((e) => !isPause(e)).map((e) => `${(e as { title: string }).title}`),
            vorort: FIELDS.filter((f) => vo[f.key]?.trim()).map((f) => [f.label, vo[f.key]!.trim()] as [string, string]),
          };
        });
      const kontakt: [string, string][] = [
        ['Name', z.k.name ?? ''],
        ['Telefon', z.k.telefon ?? ''],
        ['E-Mail', z.k.mail ?? ''],
        ['Zuletzt angefragt', z.k.angefragt ? datumText(z.k.angefragt) : ''],
      ].filter(([, v]) => v) as [string, string][];
      const blob = await veranstalterPdf({ ort: z.ort, stadt: z.stadt, kontakt, bewertung: bewertungText(z.k), auftritte, stand: datumText(this.heute) });
      const url = URL.createObjectURL(new File([blob], `Mappe ${z.ort}.pdf`, { type: 'application/pdf' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `Mappe ${z.ort}.pdf` });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } finally {
      this.mappeLaeuft.set('');
    }
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
