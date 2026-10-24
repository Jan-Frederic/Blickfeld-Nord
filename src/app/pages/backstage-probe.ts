import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { songInfoText } from '../data/songinfo';
import data from '../data/repertoire.json';
import { BackstageSync } from './backstage-sync';
import { ProbeVorschlag } from './probe-vorschlag';

// Backstage → Probe planen (/backstage/probe/<datum>): welche Songs geübt werden, Notizen und offene Punkte.
// Gespeichert im Browser (bn-probe-<datum>) und wie Setlists über „An die Band schicken“ teilbar.
export const PROBE_PREFIX = 'bn-probe-';

interface ProbePlan {
  songs: { title: string; artist: string; done: boolean }[];
  notizen: string;
  punkte: { text: string; done: boolean }[];
}

const leer = (): ProbePlan => ({ songs: [], notizen: '', punkte: [] });

export function loadProbe(datum: string): ProbePlan {
  try {
    return { ...leer(), ...JSON.parse(localStorage.getItem(PROBE_PREFIX + datum) ?? '{}') };
  } catch {
    return leer();
  }
}

const norm = (s: string) => s.toLocaleLowerCase('de').normalize('NFD').replace(/\p{Diacritic}/gu, '');

@Component({
  selector: 'app-backstage-probe',
  imports: [DatePipe, RouterLink, MatIconModule, BackstageSync, ProbeVorschlag],
  template: `
    <section class="section">
      <a class="back" routerLink="/backstage/termine"><mat-icon>arrow_back</mat-icon> Alle Termine</a>
      @if (probe(); as p) {
        <p class="kicker">Probe</p>
        <h2>{{ p.date | date: 'EEEE, d. MMMM yyyy' : '' : 'de' }}</h2>
        <p class="lead">
          {{ p.time ? p.time + (p.endTime ? '–' + p.endTime : '') + ' Uhr' : 'Uhrzeit offen' }}@if (p.place) { · {{ p.place }}}
          @if (p.note) { <br />{{ p.note }} }
        </p>

        <h3><mat-icon>queue_music</mat-icon> Songs zum Üben</h3>
        @if (plan().songs.length) {
          <ul class="list">
            @for (s of plan().songs; track s.title + s.artist; let i = $index) {
              <li [class.done]="s.done">
                <label><input type="checkbox" [checked]="s.done" (change)="toggleSong(i)" /> <span class="t">{{ s.title }}</span> <span class="a">{{ s.artist }}</span></label>
                @if (info(s); as inf) { <span class="info">{{ inf }}</span> }
                <button type="button" class="icon" (click)="removeSong(i)" [attr.aria-label]="s.title + ' entfernen'"><mat-icon>close</mat-icon></button>
              </li>
            }
          </ul>
        } @else {
          <p class="empty">Noch keine Songs ausgewählt.</p>
        }
        <app-probe-vorschlag [drin]="plan().songs" (add)="addSong($event)" />
        <label class="search">
          <mat-icon>search</mat-icon>
          <input type="search" placeholder="Song aus dem Repertoire hinzufügen …" [value]="query()" (input)="query.set($any($event.target).value)" aria-label="Song suchen" />
        </label>
        @if (query().trim()) {
          <ul class="hits">
            @for (t of treffer(); track t.title + t.artist) {
              <li><button type="button" (click)="addSong(t)"><mat-icon>add</mat-icon> {{ t.title }} <span class="a">{{ t.artist }}</span></button></li>
            } @empty {
              <li class="empty">Kein Song gefunden.</li>
            }
          </ul>
        }

        <h3><mat-icon>notes</mat-icon> Notizen</h3>
        <textarea rows="4" [value]="plan().notizen" (input)="setNotizen($any($event.target).value)" placeholder="z. B. Übergänge im zweiten Set, neue Ansagen …" aria-label="Notizen zur Probe"></textarea>

        <h3><mat-icon>checklist</mat-icon> Offene Punkte</h3>
        <ul class="list">
          @for (pk of plan().punkte; track $index; let i = $index) {
            <li [class.done]="pk.done">
              <label><input type="checkbox" [checked]="pk.done" (change)="togglePunkt(i)" /> {{ pk.text }}</label>
              <button type="button" class="icon" (click)="removePunkt(i)" [attr.aria-label]="pk.text + ' entfernen'"><mat-icon>close</mat-icon></button>
            </li>
          }
        </ul>
        <form class="add" (submit)="addPunkt($event, punkt)">
          <input #punkt placeholder="Neuer Punkt, z. B. Kabel für Monitor 3 besorgen" aria-label="Neuer Punkt" maxlength="120" />
          <button type="submit"><mat-icon>add</mat-icon> Hinzufügen</button>
        </form>

        <p class="hint">Gespeichert auf diesem Gerät. Mit der Band teilen:</p>
        <app-backstage-sync [show]="datum()" />
      } @else {
        <h2>Probe nicht gefunden</h2>
        <p>Für diesen Tag ist keine Probe eingetragen. <a routerLink="/backstage/termine">Zu den Terminen</a></p>
      }
    </section>
  `,
  styles: `
    .back { display: inline-flex; align-items: center; gap: 6px; color: var(--bn-fog); text-decoration: none; font-size: .9rem; margin-bottom: 16px; }
    .back:hover { color: var(--bn-sunset); }
    h3 { display: flex; align-items: center; gap: 8px; margin: 32px 0 12px; font-family: var(--bn-wide); font-weight: 400; text-transform: uppercase; letter-spacing: .14em; font-size: .85rem; }
    h3 mat-icon { color: var(--bn-sunset); font-size: 20px; width: 20px; height: 20px; }
    .list { list-style: none; margin: 0 0 12px; padding: 0; display: grid; gap: 6px; }
    .list li { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 8px 12px; border: 1px solid var(--bn-line); border-radius: 10px; }
    .list label { display: flex; align-items: center; gap: 10px; flex: 1; cursor: pointer; }
    .list input { width: 18px; height: 18px; accent-color: var(--bn-sunset); }
    .done label { text-decoration: line-through; color: var(--bn-fog); }
    .a, .info { color: var(--bn-fog); font-size: .85rem; }
    .info { padding: 2px 8px; border-radius: 999px; border: 1px solid var(--bn-line); }
    .icon { display: grid; place-items: center; width: 32px; height: 32px; border: 0; border-radius: 50%; background: none; color: var(--bn-fog); cursor: pointer; }
    .icon:hover { color: var(--bn-sunset); }
    .search, .add { display: flex; gap: 8px; align-items: center; }
    .search { padding: 0 12px; border: 1px solid var(--bn-line); border-radius: 10px; }
    .search mat-icon { color: var(--bn-fog); }
    input:not([type=checkbox]), textarea {
      flex: 1; padding: 10px 12px; border: 1px solid var(--bn-line); border-radius: 10px; background: transparent; color: var(--bn-ink); font: inherit;
    }
    .search input { border: 0; padding-left: 0; }
    textarea { width: 100%; box-sizing: border-box; resize: vertical; }
    .hits { list-style: none; margin: 6px 0 0; padding: 0; max-height: 260px; overflow-y: auto; border: 1px solid var(--bn-line); border-radius: 10px; }
    .hits button { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; border: 0; background: none; color: var(--bn-ink); font: inherit; text-align: left; cursor: pointer; }
    .hits button:hover { background: rgba(236, 233, 228, .06); color: var(--bn-sunset); }
    .add button { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 999px; border: 1px solid var(--bn-line); background: none; color: var(--bn-ink); font: inherit; cursor: pointer; }
    .add button:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .empty { color: var(--bn-fog); font-size: .9rem; padding: 8px 12px; }
    .hint { margin: 32px 0 8px; font-size: .85rem; color: var(--bn-fog); }
  `,
})
export class BackstageProbe {
  /** Datum der Probe aus der URL (/backstage/probe/:datum) */
  readonly datum = input.required<string>();
  private readonly band = inject(BandService);
  protected readonly probe = computed(() => this.band.rehearsals.find((r) => r.date === this.datum()));
  protected readonly plan = signal<ProbePlan>(leer());
  protected readonly query = signal('');

  protected readonly treffer = computed(() => {
    const q = norm(this.query().trim());
    const drin = new Set(this.plan().songs.map((s) => s.title + s.artist));
    return data.tracks.filter((t) => !drin.has(t.title + t.artist) && norm(`${t.title} ${t.artist}`).includes(q)).slice(0, 20);
  });

  constructor() {
    // beim Öffnen (und beim Wechsel zu einer anderen Probe) den gespeicherten Stand laden
    effect(() => this.plan.set(loadProbe(this.datum())));
  }

  protected info(s: { title: string; artist: string }): string {
    return songInfoText(s.title, s.artist);
  }

  private save(change: (p: ProbePlan) => ProbePlan): void {
    const next = change(this.plan());
    this.plan.set(next);
    try {
      localStorage.setItem(PROBE_PREFIX + this.datum(), JSON.stringify(next));
    } catch {
      // ohne Speicher (privater Modus) gilt die Planung nur bis zum Neuladen
    }
  }

  protected addSong(t: { title: string; artist: string }): void {
    this.save((p) => ({ ...p, songs: [...p.songs, { title: t.title, artist: t.artist, done: false }] }));
    this.query.set('');
  }
  protected toggleSong(i: number): void {
    this.save((p) => ({ ...p, songs: p.songs.map((s, j) => (j === i ? { ...s, done: !s.done } : s)) }));
  }
  protected removeSong(i: number): void {
    this.save((p) => ({ ...p, songs: p.songs.filter((_, j) => j !== i) }));
  }
  protected setNotizen(text: string): void {
    this.save((p) => ({ ...p, notizen: text }));
  }
  protected addPunkt(e: Event, field: HTMLInputElement): void {
    e.preventDefault();
    const text = field.value.trim();
    if (!text) return;
    this.save((p) => ({ ...p, punkte: [...p.punkte, { text, done: false }] }));
    field.value = '';
  }
  protected togglePunkt(i: number): void {
    this.save((p) => ({ ...p, punkte: p.punkte.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) }));
  }
  protected removePunkt(i: number): void {
    this.save((p) => ({ ...p, punkte: p.punkte.filter((_, j) => j !== i) }));
  }
}
