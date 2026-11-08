import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { ladeIch, rufname } from '../data/band-ich';
import { Reife, Stufe, alleFortschritte, personFortschritt, prozent, reife } from '../data/fortschritt';
import { LISTEN, songAbgleich } from '../data/playlisten';
import { datumText } from '../data/datum';
import { ladeKastenGeteilt, uebeStatistik } from '../data/ueben';

// Backstage → Songs → Bühnenreife: Fortschritt je Musiker (sicher / sitzt / wackelt, was in den letzten 30 Tagen
// gefestigt wurde oder neu wackelt) und je Song die Bühnenreife über alle Musiker (data/fortschritt.ts). Quellen:
// „Wackelt noch“ (Songs-Dialog, Nachbereitung), „Sitzt“ / „Nochmal“ im Probe-Modus und die Karten im Übemodus – je Person.
type Filter = 'alle' | 'baustelle' | 'fast' | 'buehnenreif' | 'offen';
const AMPEL: Record<Reife['ampel'], string> = { buehnenreif: 'bühnenreif', fast: 'fast bühnenreif', baustelle: 'Baustelle', offen: 'ohne Angabe' };
const ZEICHEN: Record<Stufe, string> = { sicher: '✓✓', sitzt: '✓', wackelt: '↻' };

@Component({
  selector: 'app-songs-reife',
  imports: [MatIconModule],
  template: `
    <p class="info">Je Musiker: <b>↻ wackelt</b> („Wackelt noch“ an, im Probe-Modus „Nochmal“ oder im Übemodus „Wackelt noch“), <b>✓ sitzt</b>,
      <b>✓✓ sicher</b> (an zwei Tagen in Folge „sitzt“ – Probe, Übemodus oder Liste). Die Bühnenreife eines Songs ist der Schnitt über alle – ohne Angabe zählt neutral.
      @if (!ich()) { <span class="hinweis">Wähle unter Einstellungen „Ich bin …“, damit deine Angaben zählen.</span> }</p>

    <div class="personen">
      @for (p of personen(); track p.slug) {
        <div class="person" [class.ich]="p.slug === ich()">
          <h3>{{ p.name }}</h3>
          <p class="zahlen"><span class="sicher">✓✓ {{ p.sicher }}</span> <span class="sitzt">✓ {{ p.sitzt }}</span> <span class="wackelt">↻ {{ p.wackelt }}</span></p>
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
            @if (u.gelernt.length) { <p class="plus">Karteikasten, 30 Tage: {{ u.gelernt.length }} gelernt – {{ u.gelernt.join(', ') }}</p> }
            @if (u.zuletzt) { <p class="klein">zuletzt geübt {{ datumText(u.zuletzt) }}</p> }
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
              <span [class]="'p ' + (s.r.personen.get(m.slug) ?? 'leer')" [attr.title]="rufname(m) + ': ' + (s.r.personen.get(m.slug) ?? 'ohne Angabe')">{{ rufname(m) }} {{ zeichen(s.r.personen.get(m.slug)) }}</span>
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
  private readonly alle = alleFortschritte(this.mitglieder);

  /** Übe-Statistik je Person: Karten je Kasten, in 30 Tagen gelernt, zuletzt geübt */
  protected readonly uebe = computed(
    () => new Map(this.mitglieder.map((m) => {
      const st = uebeStatistik(ladeKastenGeteilt(m.slug), this.heute);
      return [m.slug, { ...st, karten: st.jeKasten.reduce((a, b) => a + b, 0) }];
    })),
  );
  protected readonly personen = computed(() => this.mitglieder.map((m) => personFortschritt(m, this.alle.get(m.slug) ?? {}, this.heute)));

  /** Songs im aktiven Repertoire (nicht nur Archiv/Wunschliste) und alle mit Angaben – schwächste zuerst */
  private readonly songs = computed(() => {
    const mitAngabe = new Set([...this.alle.values()].flatMap((f) => Object.keys(f)));
    return songAbgleich(LISTEN)
      .filter((s) => mitAngabe.has(s.key) || s.listen.some((l) => !['archiv', 'wunschliste'].includes(l)))
      .map((s) => ({ key: s.key, title: s.title, artist: s.artist, r: reife(s.key, this.mitglieder, this.alle) }))
      .sort((a, b) => (a.r.ampel === 'offen' ? 1 : 0) - (b.r.ampel === 'offen' ? 1 : 0) || a.r.wert - b.r.wert || a.title.localeCompare(b.title, 'de'));
  });
  protected readonly gefiltert = computed(() => (this.filter() === 'alle' ? this.songs() : this.songs().filter((s) => s.r.ampel === this.filter())));
  protected zahl(f: Filter): number {
    return f === 'alle' ? this.songs().length : this.songs().filter((s) => s.r.ampel === f).length;
  }
  protected zeichen(s: Stufe | undefined): string {
    return s ? ZEICHEN[s] : '–';
  }
}
