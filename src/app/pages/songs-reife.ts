import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { ladeIch, rufname } from '../data/band-ich';
import { alleFortschritte, prozent } from '../data/fortschritt';
import { Reife, STATUS, alleStatus, buehnenreife, personUebersicht, statusInfo, uebeWoche } from '../data/uebe-status';
import { LISTEN, songAbgleich } from '../data/playlisten';
import { datumText } from '../data/datum';
import { ladeKastenGeteilt, uebeStatistik } from '../data/ueben';

// Backstage → Songs → Bühnenreife: je Musiker die Songs je Übe-Status (Nicht gelernt, Üben, Wackelt noch, Sitzt,
// Eingenordet; was in den letzten 30 Tagen gefestigt wurde oder neu wackelt) und je Song die Bühnenreife über alle
// Musiker (data/uebe-status.ts). Quellen: Song-Dialog, Probe-Modus, Übe-Modus (Karteikasten), Nachbereitung – je Person.
type Filter = 'alle' | 'baustelle' | 'fast' | 'buehnenreif' | 'offen';
const AMPEL: Record<Reife['ampel'], string> = { buehnenreif: 'bühnenreif', fast: 'fast bühnenreif', baustelle: 'Baustelle', offen: 'ohne Angabe' };

@Component({
  selector: 'app-songs-reife',
  imports: [MatIconModule],
  template: `
    <p class="info">Je Musiker ein Übe-Status: <b>○ Nicht gelernt</b> (0 %), <b>✎ Üben</b> (Kasten 1, 15 %), <b>↻ Wackelt noch</b> (Kasten 2–3, 40 %),
      <b>✓ Sitzt</b> (Kasten 4–5, 75 %), <b>✓✓ Eingenordet</b> (aus dem Karteikasten heraus, 100 %). Gesetzt im Song-Dialog, im Probe-Modus oder über den Übe-Modus.
      Die Bühnenreife eines Songs ist der Schnitt über alle; bühnenreif ist er, wenn er bei allen eingenordet ist.
      @if (!ich()) { <span class="hinweis">Wähle unter Einstellungen „Ich bin …“, damit deine Angaben zählen.</span> }</p>

    <div class="personen">
      @for (p of personen(); track p.slug) {
        <div class="person" [class.ich]="p.slug === ich()">
          <h3>{{ p.name }}</h3>
          <p class="zahlen">
            @for (st of statusMitAngabe; track st.id) { <span [class]="st.id" [title]="st.label">{{ st.zeichen }} {{ p.je[st.id] }}</span> }
          </p>
          @if (p.gefestigt.length) { <p class="plus">30 Tage: {{ p.gefestigt.length }} gefestigt – {{ p.gefestigt.join(', ') }}</p> }
          @if (p.neuWackelig.length) { <p class="minus">neu wackelig: {{ p.neuWackelig.join(', ') }}</p> }
          <p class="klein">{{ p.zuletzt ? 'zuletzt ' + datumText(p.zuletzt) : 'noch keine Angaben' }}</p>
          <!-- Übe-Statistik aus dem Karteikasten der Person (bn-kasten-<Person>, data/ueben.ts) -->
          @if (uebe().get(p.slug); as u) {
            @if (u.karten) {
              <div class="kasten" [attr.aria-label]="'Karteikasten: ' + u.jeKasten.join(', ') + ' Karten in Kasten 1 bis 5'">
                @for (n of u.jeKasten; track $index) { <span [class.leer]="!n" [title]="'Kasten ' + ($index + 1)">{{ n }}</span> }
              </div>
            }
            @if (u.gelernt.length) { <p class="plus">30 Tage: {{ u.gelernt.length }} eingenordet – {{ u.gelernt.join(', ') }}</p> }
            @if (u.zuletzt) { <p class="klein">zuletzt geübt {{ datumText(u.zuletzt) }}</p> }
          }
          <!-- Übe-Woche: Tage am Stück, Karten in 7 Tagen, diese Woche eingenordet -->
          @if (woche().get(p.slug); as w) {
            @if (w.karten || w.serie) {
              <p class="woche">@if (w.serie > 1) { <span class="serie">🔥 {{ w.serie }} Tage am Stück</span> · }{{ w.karten }} {{ w.karten === 1 ? 'Karte' : 'Karten' }} in 7 Tagen@if (w.eingenordet.length) { · eingenordet: {{ w.eingenordet.join(', ') }} }</p>
            }
          }
        </div>
      }
    </div>

    <div class="filter" role="group" aria-label="Songs nach Bühnenreife filtern">
      @for (f of filterListe; track f.id) {
        <button type="button" [attr.aria-pressed]="filter() === f.id" (click)="filter.set(f.id)">{{ f.label }} ({{ zahl(f.id) }})</button>
      }
    </div>
    <ul class="songs">
      @for (s of gefiltert(); track s.key) {
        <li [class]="s.r.ampel">
          <span class="titel">{{ s.title }} <small>{{ s.artist }}</small></span>
          <span class="wer">
            @for (m of mitglieder; track m.slug) {
              @let st = info(s.r.personen.get(m.slug) ?? 'nicht');
              <span [class]="'p ' + st.id" [attr.title]="rufname(m) + ': ' + st.label">{{ rufname(m) }} {{ st.zeichen }}</span>
            }
          </span>
          <span class="balken" role="img" [attr.aria-label]="'Bühnenreife ' + prozent(s.r.wert) + ', ' + ampel[s.r.ampel]"><i [style.width.%]="s.r.wert * 100"></i></span>
          <b class="wert">{{ s.r.ampel === 'offen' ? '–' : prozent(s.r.wert) }}</b>
        </li>
      } @empty { <li class="leer">Keine Songs in dieser Auswahl.</li> }
    </ul>
  `,
})
export class SongsReife {
  private readonly band = inject(BandService);
  protected readonly mitglieder = this.band.members;
  protected readonly rufname = rufname;
  protected readonly prozent = prozent;
  protected readonly datumText = datumText;
  protected readonly ampel = AMPEL;
  protected readonly ich = signal(ladeIch());
  protected readonly filter = signal<Filter>('alle');
  protected readonly filterListe: { id: Filter; label: string }[] = [
    { id: 'alle', label: 'Alle' },
    { id: 'baustelle', label: 'Baustellen' },
    { id: 'fast', label: 'Fast bühnenreif' },
    { id: 'buehnenreif', label: 'Bühnenreif' },
    { id: 'offen', label: 'Ohne Angabe' },
  ];
  private readonly heute = new Date().toISOString().slice(0, 10);
  private readonly verlauf = alleFortschritte(this.mitglieder);
  private readonly alle = alleStatus(this.mitglieder);
  protected readonly statusMitAngabe = STATUS.filter((s) => s.id !== 'nicht');
  protected readonly info = statusInfo;

  /** Übe-Statistik je Person: Karten je Kasten, in 30 Tagen eingenordet, zuletzt geübt */
  protected readonly uebe = computed(
    () => new Map(this.mitglieder.map((m) => {
      const st = uebeStatistik(ladeKastenGeteilt(m.slug), this.heute);
      return [m.slug, { ...st, karten: st.jeKasten.reduce((a, b) => a + b, 0) }];
    })),
  );
  /** Übe-Woche je Person (Verlauf + geteilter Karteikasten) */
  protected readonly woche = computed(() => new Map(this.mitglieder.map((m) => [m.slug, uebeWoche(this.verlauf.get(m.slug) ?? {}, ladeKastenGeteilt(m.slug), this.heute)])));
  protected readonly personen = computed(() => this.mitglieder.map((m) => personUebersicht(m, this.alle.get(m.slug) ?? new Map(), this.verlauf.get(m.slug) ?? {}, this.heute)));

  /** Songs im aktiven Repertoire (nicht nur Archiv/Wunschliste) und alle mit Angaben – schwächste zuerst */
  private readonly songs = computed(() => {
    const mitAngabe = new Set([...this.alle.values()].flatMap((st) => [...st.keys()]));
    return songAbgleich(LISTEN)
      .filter((s) => mitAngabe.has(s.key) || s.listen.some((l) => !['archiv', 'wunschliste'].includes(l)))
      .map((s) => ({ key: s.key, title: s.title, artist: s.artist, r: buehnenreife(s.key, this.mitglieder, this.alle) }))
      .sort((a, b) => (a.r.ampel === 'offen' ? 1 : 0) - (b.r.ampel === 'offen' ? 1 : 0) || a.r.wert - b.r.wert || a.title.localeCompare(b.title, 'de'));
  });
  protected readonly gefiltert = computed(() => (this.filter() === 'alle' ? this.songs() : this.songs().filter((s) => s.r.ampel === this.filter())));
  protected zahl(f: Filter): number {
    return f === 'alle' ? this.songs().length : this.songs().filter((s) => s.r.ampel === f).length;
  }
}
